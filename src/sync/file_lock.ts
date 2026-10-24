import fs from 'node:fs';
import path from 'node:path';

export interface LockMetadata {
  pid: number;
  owner: string;
  acquiredAt: number;
  targetFile: string;
}

export interface LockOptions {
  owner?: string;
  timeoutMs?: number;        // Max time to wait for lock (default: 5000ms)
  staleAfterMs?: number;     // Lock considered stale after (default: 15000ms)
  retryIntervalMs?: number;  // Interval between retries (default: 100ms)
}

/**
 * FileLock provides non-blocking and advisory file locking to prevent
 * concurrent agent race conditions when writing skills, tools, or vault files.
 */
export class FileLock {
  private lockPath: string;
  private targetPath: string;
  private owner: string;
  private fd: number | null = null;

  constructor(targetPath: string, owner = 'skillmcpsync-sync-manager') {
    this.targetPath = path.resolve(targetPath);
    this.lockPath = `${this.targetPath}.lock`;
    this.owner = owner;
  }

  /**
   * Try to acquire the lock immediately without blocking.
   * Returns true if acquired, false if held by another agent.
   */
  tryAcquire(): boolean {
    this.cleanStaleLock();

    try {
      // 'wx' flag ensures atomic creation; fails with EEXIST if already locked
      const fd = fs.openSync(this.lockPath, 'wx');
      const meta: LockMetadata = {
        pid: process.pid,
        owner: this.owner,
        acquiredAt: Date.now(),
        targetFile: this.targetPath,
      };
      fs.writeSync(fd, JSON.stringify(meta, null, 2), 0, 'utf8');
      this.fd = fd;
      return true;
    } catch (err: any) {
      if (err.code === 'EEXIST') {
        return false;
      }
      throw err;
    }
  }

  /**
   * Acquire lock with a timeout and retry intervals.
   */
  async acquire(options: LockOptions = {}): Promise<void> {
    const timeoutMs = options.timeoutMs ?? 5000;
    const retryIntervalMs = options.retryIntervalMs ?? 100;
    const startTime = Date.now();

    while (true) {
      if (this.tryAcquire()) {
        return;
      }

      if (Date.now() - startTime > timeoutMs) {
        let holderInfo = 'unknown agent';
        try {
          const raw = fs.readFileSync(this.lockPath, 'utf8');
          const data = JSON.parse(raw);
          holderInfo = `${data.owner} (PID ${data.pid})`;
        } catch {
          // ignore
        }
        throw new Error(
          `[FileLock Timeout] Could not acquire lock for '${this.targetPath}' after ${timeoutMs}ms. Currently locked by: ${holderInfo}`
        );
      }

      await new Promise((resolve) => setTimeout(resolve, retryIntervalMs));
    }
  }

  /**
   * Release the held lock.
   */
  release(): void {
    if (this.fd !== null) {
      try {
        fs.closeSync(this.fd);
      } catch {
        // ignore
      }
      this.fd = null;
    }

    try {
      if (fs.existsSync(this.lockPath)) {
        fs.unlinkSync(this.lockPath);
      }
    } catch {
      // ignore
    }
  }

  /**
   * Check if a held lock is stale (process died or expired).
   */
  private cleanStaleLock(staleAfterMs = 15000): void {
    if (!fs.existsSync(this.lockPath)) return;

    try {
      const raw = fs.readFileSync(this.lockPath, 'utf8');
      const meta: LockMetadata = JSON.parse(raw);

      // 1. Check if PID is alive
      let isAlive = false;
      try {
        // Sending signal 0 checks for process existence without killing it
        process.kill(meta.pid, 0);
        isAlive = true;
      } catch {
        isAlive = false;
      }

      // 2. Check if time has exceeded stale threshold
      const isExpired = Date.now() - meta.acquiredAt > staleAfterMs;

      if (!isAlive || isExpired) {
        fs.unlinkSync(this.lockPath);
      }
    } catch {
      // Invalid lock file, clean it up
      try {
        fs.unlinkSync(this.lockPath);
      } catch {
        // ignore
      }
    }
  }

  /**
   * Helper to execute an async critical section wrapped in a file lock.
   */
  static async withLock<T>(
    filePath: string,
    action: () => Promise<T> | T,
    options: LockOptions = {}
  ): Promise<T> {
    const lock = new FileLock(filePath, options.owner);
    await lock.acquire(options);
    try {
      return await action();
    } finally {
      lock.release();
    }
  }
}

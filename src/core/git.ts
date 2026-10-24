import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export interface GitStatusResult {
  isClean: boolean;
  modified: string[];
  untracked: string[];
  ahead: number;
  behind: number;
  branch: string;
  remote: string | null;
}

export class GitManager {
  static runGit(args: string[], cwd?: string): { stdout: string; stderr: string; status: number } {
    try {
      const res = spawnSync('git', args, {
        cwd,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return {
        stdout: res.stdout || '',
        stderr: res.stderr || '',
        status: res.status ?? 0,
      };
    } catch (err: any) {
      return {
        stdout: '',
        stderr: err.message || String(err),
        status: 1,
      };
    }
  }

  static isGitInstalled(): boolean {
    const res = this.runGit(['--version']);
    return res.status === 0;
  }

  static isGitRepo(dir: string): boolean {
    if (!fs.existsSync(dir)) return false;
    const gitDir = path.join(dir, '.git');
    if (fs.existsSync(gitDir)) return true;
    const res = this.runGit(['rev-parse', '--is-inside-work-tree'], dir);
    return res.status === 0 && res.stdout.trim() === 'true';
  }

  static init(dir: string, defaultBranch = 'main'): boolean {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const res = this.runGit(['init', '-b', defaultBranch], dir);
    return res.status === 0;
  }

  static clone(repoUrl: string, targetDir: string, branch?: string): { success: boolean; error?: string } {
    const args = ['clone'];
    if (branch) {
      args.push('-b', branch);
    }
    args.push(repoUrl, targetDir);

    const res = this.runGit(args);
    if (res.status !== 0) {
      return { success: false, error: res.stderr || res.stdout };
    }
    return { success: true };
  }

  static add(dir: string, files: string[] = ['.']): boolean {
    const res = this.runGit(['add', ...files], dir);
    return res.status === 0;
  }

  static commit(dir: string, message: string): { success: boolean; error?: string } {
    const res = this.runGit(['commit', '-m', message], dir);
    if (res.status !== 0) {
      return { success: false, error: res.stderr || res.stdout };
    }
    return { success: true };
  }

  static pull(dir: string, remote = 'origin', branch?: string): { success: boolean; error?: string } {
    const args = ['pull', '--rebase', remote];
    if (branch) {
      args.push(branch);
    }
    const res = this.runGit(args, dir);
    if (res.status !== 0) {
      return { success: false, error: res.stderr || res.stdout };
    }
    return { success: true };
  }

  static push(dir: string, remote = 'origin', branch?: string): { success: boolean; error?: string } {
    const args = ['push', remote];
    if (branch) {
      args.push(branch);
    } else {
      args.push('HEAD');
    }
    const res = this.runGit(args, dir);
    if (res.status !== 0) {
      return { success: false, error: res.stderr || res.stdout };
    }
    return { success: true };
  }

  static getBranch(dir: string): string {
    const res = this.runGit(['rev-parse', '--abbrev-ref', 'HEAD'], dir);
    return res.status === 0 ? res.stdout.trim() : 'main';
  }

  static getRemote(dir: string, remoteName = 'origin'): string | null {
    const res = this.runGit(['remote', 'get-url', remoteName], dir);
    return res.status === 0 ? res.stdout.trim() : null;
  }

  static setRemote(dir: string, url: string, remoteName = 'origin'): boolean {
    const current = this.getRemote(dir, remoteName);
    if (current) {
      const res = this.runGit(['remote', 'set-url', remoteName, url], dir);
      return res.status === 0;
    } else {
      const res = this.runGit(['remote', 'add', remoteName, url], dir);
      return res.status === 0;
    }
  }

  static status(dir: string): GitStatusResult {
    if (!this.isGitRepo(dir)) {
      return {
        isClean: true,
        modified: [],
        untracked: [],
        ahead: 0,
        behind: 0,
        branch: 'none',
        remote: null,
      };
    }

    const branch = this.getBranch(dir);
    const remote = this.getRemote(dir);

    // Porcelin status
    const statusRes = this.runGit(['status', '--porcelain'], dir);
    const lines = statusRes.stdout.split('\n').filter((l) => l.trim().length > 0);

    const modified: string[] = [];
    const untracked: string[] = [];

    for (const line of lines) {
      const code = line.slice(0, 2);
      const file = line.slice(3).trim();
      if (code === '??') {
        untracked.push(file);
      } else {
        modified.push(file);
      }
    }

    let ahead = 0;
    let behind = 0;

    if (remote) {
      const countRes = this.runGit(['rev-list', '--left-right', '--count', `${branch}...origin/${branch}`], dir);
      if (countRes.status === 0) {
        const parts = countRes.stdout.trim().split(/\s+/);
        if (parts.length === 2) {
          ahead = parseInt(parts[0], 10) || 0;
          behind = parseInt(parts[1], 10) || 0;
        }
      }
    }

    return {
      isClean: modified.length === 0 && untracked.length === 0,
      modified,
      untracked,
      ahead,
      behind,
      branch,
      remote,
    };
  }
}

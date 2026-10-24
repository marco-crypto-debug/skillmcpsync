import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { FileLock } from '../src/sync/file_lock.js';
import { SyncManager, sync_all_resources } from '../src/sync/sync_manager.js';
import { VaultManager } from '../src/core/vault.js';

test('FileLock: non-blocking acquisition and concurrency guard', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lock-test-'));
  const targetFile = path.join(tmpDir, 'shared-config.json');
  fs.writeFileSync(targetFile, '{}', 'utf8');

  const lockA = new FileLock(targetFile, 'agent-A');
  const lockB = new FileLock(targetFile, 'agent-B');

  // Agent A acquires
  assert.equal(lockA.tryAcquire(), true);

  // Agent B tries non-blocking acquire (must fail)
  assert.equal(lockB.tryAcquire(), false);

  // Agent A releases
  lockA.release();

  // Agent B can now acquire
  assert.equal(lockB.tryAcquire(), true);
  lockB.release();

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('SyncManager: dedup and namespacing collisions by server origin', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-test-'));
  const vault = new VaultManager(tmpDir);
  vault.ensureStructure();

  const manager = new SyncManager(tmpDir);

  const mockTools = [
    {
      name: 'fetch_data',
      originServer: 'serverA',
      namespacedName: 'serverA:fetch_data',
      transport: 'http' as const,
      enabled: true,
      updatedAt: 1000,
    },
    {
      name: 'fetch_data',
      originServer: 'serverB',
      namespacedName: 'serverB:fetch_data',
      transport: 'sse' as const,
      enabled: true,
      updatedAt: 2000,
    },
  ];

  const mockSkills = [
    {
      name: 'code_review',
      originServer: 'serverA',
      namespacedName: 'serverA:code_review',
      content: 'Review checklist v1',
      version: 1,
      updatedAt: 1000,
    },
    {
      name: 'code_review',
      originServer: 'serverB',
      namespacedName: 'serverB:code_review',
      content: 'Review checklist v2',
      version: 2,
      updatedAt: 2000,
    },
  ];

  const result = manager.reconcileAndDedup(mockTools, mockSkills, true);

  // Tools should be namespaced by server origin
  assert.equal(result.reconciledTools.length, 2);
  assert.equal(result.reconciledTools[0].namespacedName, 'serverA:fetch_data');
  assert.equal(result.reconciledTools[1].namespacedName, 'serverB:fetch_data');

  // Skills should be namespaced by server origin
  assert.equal(result.reconciledSkills.length, 2);
  assert.equal(result.conflictCount, 2);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('sync_all_resources: end-to-end reconciliation', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-sync-'));
  const vault = new VaultManager(tmpDir);
  vault.ensureStructure();

  const res = await sync_all_resources({
    vaultPath: tmpDir,
    dryRun: false,
    namespaceDuplicates: true,
  });

  assert.equal(res.success, true);
  assert.equal(typeof res.durationMs, 'number');
  assert.equal(typeof res.toolsAggregated, 'number');
  assert.equal(typeof res.skillsSynced, 'number');

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

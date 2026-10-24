import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AccessControl,
  SharedMemoryPool,
  Blackboard,
  AgentMemorySession,
} from '../src/core/memory.js';

test('Multi-Agent Shared Memory: Access Control Layer', () => {
  const acl = AccessControl.createDefaultTeamACL();

  // Researcher permissions
  assert.equal(acl.canWrite('researcher', 'research'), true);
  assert.equal(acl.canRead('researcher', 'research'), true);
  assert.equal(acl.canWrite('researcher', 'code'), false);
  assert.equal(acl.canRead('researcher', 'code'), true);

  // Coder permissions
  assert.equal(acl.canWrite('coder', 'code'), true);
  assert.equal(acl.canRead('coder', 'code'), true);
  assert.equal(acl.canWrite('coder', 'research'), false);
  assert.equal(acl.canRead('coder', 'research'), true);

  // Reviewer permissions
  assert.equal(acl.canWrite('reviewer', 'review'), true);
  assert.equal(acl.canRead('reviewer', 'research'), true);
  assert.equal(acl.canRead('reviewer', 'code'), true);
  assert.equal(acl.canWrite('reviewer', 'code'), false);
});

test('Multi-Agent Shared Memory: Private Scratchpad Isolation', () => {
  const acl = AccessControl.createDefaultTeamACL();
  const pool = new SharedMemoryPool(acl);

  const researcher = new AgentMemorySession('researcher', 'Researcher', pool);
  const coder = new AgentMemorySession('coder', 'Coder', pool);

  researcher.think('Need to investigate temperature conversion algorithms.');
  researcher.think('Formula: C = (F - 32) * 5/9.');

  assert.equal(researcher.getScratchpad().length, 2);
  assert.equal(coder.getScratchpad().length, 0);

  // Scratchpad thoughts are private and do NOT appear in the shared memory pool
  assert.equal(Object.keys(pool.getAllEntries()).length, 0);
});

test('Multi-Agent Shared Memory: ACL Enforcement on Writes', () => {
  const acl = AccessControl.createDefaultTeamACL();
  const pool = new SharedMemoryPool(acl);

  const researcher = new AgentMemorySession('researcher', 'Researcher', pool);
  const coder = new AgentMemorySession('coder', 'Coder', pool);

  // Researcher writes to research namespace (allowed)
  const entry = researcher.writeShared(
    'research',
    'conversion_specs',
    'Formulas for C to F and K conversion'
  );
  assert.equal(entry.namespace, 'research');
  assert.equal(entry.version, 1);

  // Researcher attempts to write to code namespace (blocked)
  assert.throws(() => {
    researcher.writeShared('code', 'impl', 'def convert(): pass');
  }, /does not have write permission/);

  // Coder writes to code namespace (allowed)
  const codeEntry = coder.writeShared('code', 'temperature_py', 'function convert() { ... }');
  assert.equal(codeEntry.namespace, 'code');
});

test('Multi-Agent Shared Memory: Conflict Resolution - Last Write Wins', () => {
  const acl = new AccessControl();
  acl.grant('agent_a', 'shared', 'read_write');
  acl.grant('agent_b', 'shared', 'read_write');

  const pool = new SharedMemoryPool(acl, 'last_write_wins');

  const v1 = pool.write('agent_a', 'shared', 'progress', 'Task is 50% complete');
  assert.equal(v1.version, 1);

  const v2 = pool.write('agent_b', 'shared', 'progress', 'Task is 75% complete');
  assert.equal(v2.version, 2);

  const res = pool.read('agent_a', 'shared', 'progress');
  assert.equal(res[0].value, 'Task is 75% complete');
  assert.equal(res[0].author, 'agent_b');
  const conflicts = pool.getConflicts();
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].resolution, 'overwritten');
});

test('Multi-Agent Shared Memory: Conflict Resolution - Version Check (Optimistic Locking)', () => {
  const acl = new AccessControl();
  acl.grant('agent_a', 'shared', 'read_write');
  acl.grant('agent_b', 'shared', 'read_write');

  const pool = new SharedMemoryPool(acl, 'version_check');

  const v1 = pool.write('agent_a', 'shared', 'status', 'Draft v1');
  assert.equal(v1.version, 1);

  // Agent B updates with expectedVersion=1 (succeeds, creates v2)
  const v2 = pool.write('agent_b', 'shared', 'status', 'Revised by B', {
    expectedVersion: 1,
  });
  assert.equal(v2.version, 2);

  // Agent A tries to update with stale expectedVersion=1 (fails)
  assert.throws(() => {
    pool.write('agent_a', 'shared', 'status', 'Revised by A', {
      expectedVersion: 1,
    });
  }, /Version conflict/);

  const conflicts = pool.getConflicts();
  assert.equal(conflicts.length, 2);
  assert.equal(conflicts[0].resolution, 'overwritten');
  assert.equal(conflicts[1].resolution, 'rejected');
});

test('Multi-Agent Shared Memory: Blackboard Aggregation & Assembled Solution', () => {
  const acl = AccessControl.createDefaultTeamACL();
  const pool = new SharedMemoryPool(acl);
  const blackboard = new Blackboard(pool);

  pool.write('researcher', 'research', 'requirements', 'Convert between C, F, K');
  pool.write('coder', 'code', 'impl', 'def c_to_f(c): return c * 9/5 + 32');
  pool.write('reviewer', 'review', 'feedback', 'All tests pass and edge cases covered.');

  const summary = blackboard.getSummary();
  assert.match(summary, /=== Namespace: code\/ ===/);
  assert.match(summary, /=== Namespace: research\/ ===/);
  assert.match(summary, /=== Namespace: review\/ ===/);

  const assembled = blackboard.assembleSolution();
  assert.match(assembled, /Multi-Agent Assembled Solution/);
  assert.match(assembled, /Section: RESEARCH/);
  assert.match(assembled, /Section: CODE/);
  assert.match(assembled, /Section: REVIEW/);

  // Post assembled solution back to shared memory (the dotted green line in the diagram)
  const posted = blackboard.postAssembledSolution('reviewer');
  assert.equal(posted.namespace, 'shared');
  assert.equal(posted.key, 'blackboard_solution');
  assert.equal(posted.metadata?.assembledFromBlackboard, true);
});

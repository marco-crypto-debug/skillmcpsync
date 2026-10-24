import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ProjectMemoryManager } from '../src/core/project_memory.js';

test('ProjectMemoryManager: initializes AGENT_MEMORY.md and injects agent rules', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proj-mem-'));
  const mgr = new ProjectMemoryManager(tmpDir);

  const memFile = mgr.initProject('TestProject', true);
  assert.equal(fs.existsSync(memFile), true);

  const content = fs.readFileSync(memFile, 'utf8');
  assert.match(content, /Project Agent Memory: TestProject/);
  assert.match(content, /1\. Episodic Action Timeline/);
  assert.match(content, /2\. Semantic Memory/);
  assert.match(content, /3\. Procedural Rules/);
  assert.match(content, /4\. Reflective Notes/);

  // Check rule injections into all coding agents
  assert.equal(fs.existsSync(path.join(tmpDir, 'CLAUDE.md')), true);
  assert.equal(fs.existsSync(path.join(tmpDir, '.cursorrules')), true);
  assert.equal(fs.existsSync(path.join(tmpDir, '.cursor/rules/agent-memory.mdc')), true);
  assert.equal(fs.existsSync(path.join(tmpDir, '.windsurfrules')), true);
  assert.equal(fs.existsSync(path.join(tmpDir, '.opencode/rules/agent_memory.md')), true);

  // Check rule content
  const claudeMd = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf8');
  assert.match(claudeMd, /AGENT MEMORY MANDATORY INSTRUCTION/);
  assert.match(claudeMd, /read `AGENT_MEMORY\.md`/);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('ProjectMemoryManager: records actions to episodic timeline', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proj-mem-log-'));
  const mgr = new ProjectMemoryManager(tmpDir);
  mgr.initProject('LogProject');

  mgr.recordAction({
    timestamp: '2026-10-25T01:30:00Z',
    agent: 'claude-code',
    summary: 'Refactored authentication middleware',
    filesTouched: ['src/auth.ts', 'src/server.ts'],
    keyDecisions: 'Switched to JWT bearer tokens',
  });

  const content = mgr.readMemory();
  assert.match(content, /@claude-code/);
  assert.match(content, /Refactored authentication middleware/);
  assert.match(content, /src\/auth\.ts/);
  assert.match(content, /Switched to JWT bearer tokens/);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

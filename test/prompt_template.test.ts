import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  generateNewProjectPromptTemplate,
  exportNewProjectPromptTemplate,
} from '../src/core/prompt_template.js';

test('PromptTemplate: generates template with required git commit and test-first verification rules', () => {
  const template = generateNewProjectPromptTemplate({
    projectName: 'DemoApp',
    language: 'zh-Hant',
  });

  // 1. Must include project name
  assert.match(template, /DemoApp/);

  // 2. Must mandate git commit on every change
  assert.match(template, /git commit/i);
  assert.match(template, /每次改動|每次修改/);

  // 3. Must mandate writing/updating tests before changes & 100% pass before delivery
  assert.match(template, /測試/);
  assert.match(template, /改動前|修改前/);
  assert.match(template, /交付/);
  assert.match(template, /通過/);

  // 4. Must mandate reading AGENT_MEMORY.md before tasks
  assert.match(template, /AGENT_MEMORY\.md/);
});

test('PromptTemplate: generates English template properly', () => {
  const template = generateNewProjectPromptTemplate({
    projectName: 'CryptoSync',
    language: 'en',
  });

  assert.match(template, /CryptoSync/);
  assert.match(template, /git commit/i);
  assert.match(template, /test/i);
  assert.match(template, /before delivery|deliver/i);
  assert.match(template, /AGENT_MEMORY\.md/);
});

test('PromptTemplate: exports MASTER_PROMPT.md file to target project directory', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-tmpl-'));
  const exportedPath = exportNewProjectPromptTemplate(tmpDir, {
    projectName: 'ExportDemo',
    filename: 'MASTER_PROMPT.md',
    language: 'zh-Hant',
  });

  assert.equal(fs.existsSync(exportedPath), true);
  const content = fs.readFileSync(exportedPath, 'utf8');
  assert.match(content, /ExportDemo/);
  assert.match(content, /git commit/i);
  assert.match(content, /測試/);
  assert.match(content, /AGENT_MEMORY\.md/);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

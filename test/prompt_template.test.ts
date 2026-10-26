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

  // 5. Must include product design, demo evaluation, technical proposal .txt, AI repeated tests, human verification
  assert.match(template, /產品設計|产品设计/);
  assert.match(template, /demo|原型/i);
  assert.match(template, /\.txt/);
  assert.match(template, /技術方案|技术方案/);
  assert.match(template, /重複測試|重复测试/);
  assert.match(template, /人工驗證|人工验证/);
  // 6. Must include Git tools and version rollback instructions for checking back versions
  assert.match(template, /Git 工具|git tools/i);
  assert.match(template, /回溯|回退|check back/i);
  assert.match(template, /git log/i);
  assert.match(template, /git diff/i);
});

test('PromptTemplate: generates English template with full lifecycle', () => {
  const template = generateNewProjectPromptTemplate({
    projectName: 'CryptoSync',
    language: 'en',
  });

  assert.match(template, /CryptoSync/);
  assert.match(template, /git commit/i);
  assert.match(template, /test/i);
  assert.match(template, /before delivery|deliver/i);
  assert.match(template, /AGENT_MEMORY\.md/);
  assert.match(template, /product design/i);
  assert.match(template, /demo/i);
  assert.match(template, /\.txt/i);
  assert.match(template, /technical proposal/i);
  assert.match(template, /repeatedly/i);
  assert.match(template, /human verification/i);

  // Git tools & check back version assertions
  assert.match(template, /git tools/i);
  assert.match(template, /check back version/i);
  assert.match(template, /git log/i);
  assert.match(template, /git diff/i);
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

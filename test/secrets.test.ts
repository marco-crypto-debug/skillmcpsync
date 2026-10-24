import test from 'node:test';
import assert from 'node:assert/strict';
import { SecretManager } from '../src/core/secrets.js';

test('SecretManager - placeholder replacement and tokenization', async (t) => {
  await t.test('detects and tokenizes sensitive variables', () => {
    const sm = new SecretManager();
    const raw = {
      command: 'npx',
      env: {
        GITHUB_TOKEN: 'ghp_123456789012345678901234567890',
        API_KEY: 'sk-abcdef1234567890abcdef1234567890',
        NORMAL_SETTING: 'hello-world',
      },
    };

    const { tokenized, extractedSecrets } = sm.tokenizeObject(raw, 'github');

    assert.equal(tokenized.env.GITHUB_TOKEN, '${GITHUB_TOKEN}');
    assert.equal(tokenized.env.API_KEY, '${GITHUB_API_KEY}');
    assert.equal(tokenized.env.NORMAL_SETTING, 'hello-world');
    assert.equal(
      extractedSecrets.GITHUB_TOKEN,
      'ghp_123456789012345678901234567890'
    );
  });

  await t.test('resolves placeholders from environment', () => {
    process.env.TEST_SYNC_KEY = 'super-secret-123';
    const sm = new SecretManager();

    const resolved = sm.resolveObject({
      key: '${TEST_SYNC_KEY}',
      nested: {
        item: 'prefix-${TEST_SYNC_KEY}',
      },
    });

    assert.equal(resolved.key, 'super-secret-123');
    assert.equal(resolved.nested.item, 'prefix-super-secret-123');

    delete process.env.TEST_SYNC_KEY;
  });

  await t.test('finds all placeholders', () => {
    const sm = new SecretManager();
    const data = {
      a: '${VAR_ONE}',
      b: ['text', '${VAR_TWO}'],
      c: {
        d: '${VAR_ONE}_again',
      },
    };

    const placeholders = sm.findPlaceholders(data);
    assert.deepEqual(placeholders, ['VAR_ONE', 'VAR_TWO']);
  });
});

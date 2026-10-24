import test from 'node:test';
import assert from 'node:assert/strict';
import { parseJsonSafe, stripJsonComments } from '../src/utils/json.js';

test('JSON utilities - comment stripping and safe parsing', async (t) => {
  await t.test('strips single and multi-line comments', () => {
    const jsonc = `
    {
      // This is a comment
      "name": "opencode", /* inline comment */
      "mcp": {
        "context7": {
          "enabled": true,
        }, // trailing comma test
      },
    }
    `;

    const parsed = parseJsonSafe(jsonc);
    assert.equal(parsed.name, 'opencode');
    assert.equal(parsed.mcp.context7.enabled, true);
  });

  await t.test('preserves URLs and slashes inside strings', () => {
    const jsonc = `
    {
      "url": "https://opencode.ai/api/v2",
      "regex": "path//to//file"
    }
    `;

    const parsed = parseJsonSafe(jsonc);
    assert.equal(parsed.url, 'https://opencode.ai/api/v2');
    assert.equal(parsed.regex, 'path//to//file');
  });
});

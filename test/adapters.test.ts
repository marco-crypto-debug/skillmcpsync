import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { OpenCodeAdapter } from '../src/adapters/opencode.js';
import { ClaudeDesktopAdapter } from '../src/adapters/claude_desktop.js';
import { CursorAdapter } from '../src/adapters/cursor.js';
import { CanonicalMcpServer } from '../src/core/types.js';

test('Adapters - Translation and merging', async (t) => {
  const tmpDir = path.join(os.tmpdir(), `skillmcpsync-test-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  await t.test('OpenCodeAdapter reads and writes MCP servers safely preserving other keys', () => {
    const fakeConfigPath = path.join(tmpDir, 'opencode.json');
    fs.writeFileSync(
      fakeConfigPath,
      JSON.stringify(
        {
          $schema: 'https://opencode.ai/config.json',
          model: 'anthropic/claude-3-5-sonnet',
          theme: 'dark',
          mcp: {
            existing: {
              type: 'local',
              command: ['npx', 'existing-pkg'],
              enabled: true,
            },
          },
        },
        null,
        2
      )
    );

    const adapter = new OpenCodeAdapter();
    // Override getConfigPath for test isolation
    (adapter as any).getConfigPath = () => fakeConfigPath;

    const read = adapter.readMcpServers();
    assert.ok(read.existing);
    assert.equal(read.existing.command, 'npx');
    assert.deepEqual(read.existing.args, ['existing-pkg']);

    const newServers: Record<string, CanonicalMcpServer> = {
      context7: {
        name: 'context7',
        type: 'stdio',
        command: 'npx',
        args: ['-y', '@upstash/context7-mcp@latest'],
        enabled: true,
      },
    };

    adapter.writeMcpServers(newServers, { backup: false, merge: true });

    const updatedRaw = JSON.parse(fs.readFileSync(fakeConfigPath, 'utf8'));
    // Ensure custom non-MCP fields are preserved!
    assert.equal(updatedRaw.model, 'anthropic/claude-3-5-sonnet');
    assert.equal(updatedRaw.theme, 'dark');
    // Ensure both existing and new MCP servers are present
    assert.ok(updatedRaw.mcp.existing);
    assert.ok(updatedRaw.mcp.context7);
    assert.deepEqual(updatedRaw.mcp.context7.command, [
      'npx',
      '-y',
      '@upstash/context7-mcp@latest',
    ]);
  });

  await t.test('ClaudeDesktopAdapter writes mcpServers', () => {
    const fakeDesktopConfig = path.join(tmpDir, 'claude_desktop_config.json');
    const adapter = new ClaudeDesktopAdapter();
    (adapter as any).getConfigPath = () => fakeDesktopConfig;

    const servers: Record<string, CanonicalMcpServer> = {
      github: {
        name: 'github',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-github'],
        env: { GITHUB_TOKEN: 'token123' },
        enabled: true,
      },
    };

    adapter.writeMcpServers(servers, { backup: false });
    const content = JSON.parse(fs.readFileSync(fakeDesktopConfig, 'utf8'));
    assert.ok(content.mcpServers.github);
    assert.equal(content.mcpServers.github.command, 'npx');
    assert.deepEqual(content.mcpServers.github.args, [
      '-y',
      '@modelcontextprotocol/server-github',
    ]);
  });

  // Clean up
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

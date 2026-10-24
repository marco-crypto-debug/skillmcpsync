import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { AgentAdapter, WriteOptions } from './base.js';
import { CanonicalMcpServer, CanonicalRule, AgentStatus } from '../core/types.js';
import { parseJsonSafe, stringifyJson } from '../utils/json.js';
import { createBackup } from '../utils/backup.js';

export class CursorAdapter extends AgentAdapter {
  readonly id = 'cursor';
  readonly name = 'Cursor';

  private getCursorDir(): string {
    return path.join(os.homedir(), '.cursor');
  }

  getConfigPath(): string {
    return path.join(this.getCursorDir(), 'mcp.json');
  }

  getRulesPath(): string {
    return path.join(this.getCursorDir(), 'rules');
  }

  isInstalled(): boolean {
    const cursorDir = this.getCursorDir();
    const configPath = this.getConfigPath();
    // Also check Applications on macOS
    const appExists =
      process.platform === 'darwin' &&
      (fs.existsSync('/Applications/Cursor.app') ||
        fs.existsSync(path.join(os.homedir(), 'Applications/Cursor.app')));
    return fs.existsSync(cursorDir) || fs.existsSync(configPath) || appExists;
  }

  getStatus(): AgentStatus {
    const installed = this.isInstalled();
    const configPath = this.getConfigPath();
    const rulesPath = this.getRulesPath();
    let mcpCount = 0;
    let ruleCount = 0;

    if (installed && fs.existsSync(configPath)) {
      try {
        const servers = this.readMcpServers();
        mcpCount = Object.keys(servers).length;
      } catch {
        // ignore
      }
    }

    if (installed && fs.existsSync(rulesPath)) {
      try {
        const entries = fs.readdirSync(rulesPath);
        ruleCount = entries.filter((e: string) => e.endsWith('.mdc') || e.endsWith('.md')).length;
      } catch {
        // ignore
      }
    }

    return {
      id: this.id,
      name: this.name,
      installed,
      configPath,
      rulesPath,
      mcpCount,
      skillCount: 0,
      ruleCount,
    };
  }

  readMcpServers(): Record<string, CanonicalMcpServer> {
    const configPath = this.getConfigPath();
    if (!fs.existsSync(configPath)) return {};

    const raw = fs.readFileSync(configPath, 'utf8');
    const config = parseJsonSafe<Record<string, any>>(raw, {});
    const mcpServers = config.mcpServers || {};

    const result: Record<string, CanonicalMcpServer> = {};

    for (const [name, s] of Object.entries(mcpServers)) {
      if (typeof s !== 'object' || s === null) continue;
      const srv = s as Record<string, any>;

      result[name] = {
        name,
        type: 'stdio',
        command: srv.command,
        args: Array.isArray(srv.args) ? srv.args : [],
        env: srv.env,
        enabled: true,
      };
    }

    return result;
  }

  writeMcpServers(
    servers: Record<string, CanonicalMcpServer>,
    options: WriteOptions = { backup: true, merge: true }
  ): void {
    const configPath = this.getConfigPath();
    const parentDir = path.dirname(configPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    let existingConfig: Record<string, any> = {};
    if (fs.existsSync(configPath)) {
      if (options.backup) {
        createBackup(configPath);
      }
      const raw = fs.readFileSync(configPath, 'utf8');
      existingConfig = parseJsonSafe<Record<string, any>>(raw, {});
    }

    const mcpServers: Record<string, any> = options.merge
      ? { ...(existingConfig.mcpServers || {}) }
      : {};

    for (const [name, s] of Object.entries(servers)) {
      if (s.enabled === false) continue;
      mcpServers[name] = {
        command: s.command || 'npx',
        args: s.args || [],
        ...(s.env && Object.keys(s.env).length > 0 ? { env: s.env } : {}),
      };
    }

    existingConfig.mcpServers = mcpServers;
    fs.writeFileSync(configPath, stringifyJson(existingConfig), 'utf8');
  }

  readRules(): CanonicalRule[] {
    const rulesPath = this.getRulesPath();
    if (!fs.existsSync(rulesPath)) return [];

    const entries = fs.readdirSync(rulesPath);
    const rules: CanonicalRule[] = [];

    for (const entry of entries) {
      if (entry.endsWith('.mdc') || entry.endsWith('.md')) {
        const fullPath = path.join(rulesPath, entry);
        const content = fs.readFileSync(fullPath, 'utf8');
        rules.push({
          name: entry.replace(/\.(mdc|md)$/, ''),
          content,
        });
      }
    }

    return rules;
  }

  writeRules(rules: CanonicalRule[], options: WriteOptions = {}): void {
    const rulesPath = this.getRulesPath();
    if (!fs.existsSync(rulesPath)) {
      fs.mkdirSync(rulesPath, { recursive: true });
    }

    for (const rule of rules) {
      const fullPath = path.join(rulesPath, `${rule.name}.mdc`);
      if (options.backup && fs.existsSync(fullPath)) {
        createBackup(fullPath);
      }
      fs.writeFileSync(fullPath, rule.content, 'utf8');
    }
  }
}

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { AgentAdapter, WriteOptions } from './base.js';
import { CanonicalMcpServer, CanonicalRule, AgentStatus } from '../core/types.js';
import { parseJsonSafe, stringifyJson } from '../utils/json.js';
import { createBackup } from '../utils/backup.js';

export class WindsurfAdapter extends AgentAdapter {
  readonly id = 'windsurf';
  readonly name = 'Windsurf';

  private getWindsurfDir(): string {
    return path.join(os.homedir(), '.codeium', 'windsurf');
  }

  getConfigPath(): string {
    return path.join(this.getWindsurfDir(), 'mcp_config.json');
  }

  getRulesPath(): string {
    return path.join(this.getWindsurfDir(), 'memories', 'global_rules.md');
  }

  isInstalled(): boolean {
    const dir = this.getWindsurfDir();
    const configPath = this.getConfigPath();
    const appExists =
      process.platform === 'darwin' &&
      (fs.existsSync('/Applications/Windsurf.app') ||
        fs.existsSync(path.join(os.homedir(), 'Applications/Windsurf.app')));
    return fs.existsSync(dir) || fs.existsSync(configPath) || appExists;
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
      ruleCount = 1;
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

    const content = fs.readFileSync(rulesPath, 'utf8');
    return [
      {
        name: 'windsurf-global-rules',
        content,
      },
    ];
  }

  writeRules(rules: CanonicalRule[], options: WriteOptions = {}): void {
    const rulesPath = this.getRulesPath();
    const parentDir = path.dirname(rulesPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    if (options.backup && fs.existsSync(rulesPath)) {
      createBackup(rulesPath);
    }

    const combined = rules.map((r) => `# ${r.name}\n\n${r.content}`).join('\n\n---\n\n');
    fs.writeFileSync(rulesPath, combined, 'utf8');
  }
}

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { AgentAdapter, WriteOptions } from './base.js';
import { CanonicalMcpServer, AgentStatus } from '../core/types.js';
import { parseJsonSafe, stringifyJson } from '../utils/json.js';
import { createBackup } from '../utils/backup.js';

export class ClaudeDesktopAdapter extends AgentAdapter {
  readonly id = 'claude_desktop';
  readonly name = 'Claude Desktop';

  getConfigPath(): string {
    const platform = process.platform;
    const homedir = os.homedir();

    if (platform === 'darwin') {
      return path.join(
        homedir,
        'Library',
        'Application Support',
        'Claude',
        'claude_desktop_config.json'
      );
    } else if (platform === 'win32') {
      const appData = process.env.APPDATA || path.join(homedir, 'AppData', 'Roaming');
      return path.join(appData, 'Claude', 'claude_desktop_config.json');
    } else {
      // Linux
      const configHome = process.env.XDG_CONFIG_HOME || path.join(homedir, '.config');
      return path.join(configHome, 'Claude', 'claude_desktop_config.json');
    }
  }

  isInstalled(): boolean {
    const configPath = this.getConfigPath();
    const configDir = path.dirname(configPath);
    return fs.existsSync(configPath) || fs.existsSync(configDir);
  }

  getStatus(): AgentStatus {
    const installed = this.isInstalled();
    const configPath = this.getConfigPath();
    let mcpCount = 0;

    if (installed && fs.existsSync(configPath)) {
      try {
        const servers = this.readMcpServers();
        mcpCount = Object.keys(servers).length;
      } catch {
        // ignore
      }
    }

    return {
      id: this.id,
      name: this.name,
      installed,
      configPath,
      mcpCount,
      skillCount: 0,
      ruleCount: 0,
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
      // Claude Desktop primarily supports stdio command + args
      if (s.enabled === false) continue;
      if (!s.command && s.url) {
        // skip remote URL if unsupported or store in mcpServers if custom
        continue;
      }

      mcpServers[name] = {
        command: s.command || 'npx',
        args: s.args || [],
        ...(s.env && Object.keys(s.env).length > 0 ? { env: s.env } : {}),
      };
    }

    existingConfig.mcpServers = mcpServers;
    fs.writeFileSync(configPath, stringifyJson(existingConfig), 'utf8');
  }
}

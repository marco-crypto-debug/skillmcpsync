import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { AgentAdapter, WriteOptions } from './base.js';
import { CanonicalMcpServer, CanonicalSkill, AgentStatus } from '../core/types.js';
import { parseJsonSafe, stringifyJson } from '../utils/json.js';
import { createBackup } from '../utils/backup.js';

export class ClaudeCodeAdapter extends AgentAdapter {
  readonly id = 'claude_code';
  readonly name = 'Claude Code CLI';

  private getClaudeDir(): string {
    return path.join(os.homedir(), '.claude');
  }

  getConfigPath(): string {
    const claudeDir = this.getClaudeDir();
    const mcpJson = path.join(claudeDir, 'mcp.json');
    if (fs.existsSync(mcpJson)) return mcpJson;

    const rootClaudeJson = path.join(os.homedir(), '.claude.json');
    if (fs.existsSync(rootClaudeJson)) return rootClaudeJson;

    return mcpJson;
  }

  getSkillsPath(): string {
    return path.join(this.getClaudeDir(), 'skills');
  }

  isInstalled(): boolean {
    const claudeDir = this.getClaudeDir();
    const rootJson = path.join(os.homedir(), '.claude.json');
    return fs.existsSync(claudeDir) || fs.existsSync(rootJson);
  }

  getStatus(): AgentStatus {
    const installed = this.isInstalled();
    const configPath = this.getConfigPath();
    const skillsPath = this.getSkillsPath();
    let mcpCount = 0;
    let skillCount = 0;

    if (installed && fs.existsSync(configPath)) {
      try {
        const servers = this.readMcpServers();
        mcpCount = Object.keys(servers).length;
      } catch {
        // ignore
      }
    }

    if (installed && fs.existsSync(skillsPath)) {
      try {
        const entries = fs.readdirSync(skillsPath, { withFileTypes: true });
        skillCount = entries.filter((e: fs.Dirent) => e.isDirectory()).length;
      } catch {
        // ignore
      }
    }

    return {
      id: this.id,
      name: this.name,
      installed,
      configPath,
      skillsPath,
      mcpCount,
      skillCount,
      ruleCount: 0,
    };
  }

  readMcpServers(): Record<string, CanonicalMcpServer> {
    const configPath = this.getConfigPath();
    if (!fs.existsSync(configPath)) return {};

    const raw = fs.readFileSync(configPath, 'utf8');
    const config = parseJsonSafe<Record<string, any>>(raw, {});
    const mcpServers = config.mcpServers || config.mcp_servers || {};

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

    const key = existingConfig.mcp_servers ? 'mcp_servers' : 'mcpServers';
    const mcpServers: Record<string, any> = options.merge
      ? { ...(existingConfig[key] || {}) }
      : {};

    for (const [name, s] of Object.entries(servers)) {
      if (s.enabled === false) continue;
      mcpServers[name] = {
        command: s.command || 'npx',
        args: s.args || [],
        ...(s.env && Object.keys(s.env).length > 0 ? { env: s.env } : {}),
      };
    }

    existingConfig[key] = mcpServers;
    fs.writeFileSync(configPath, stringifyJson(existingConfig), 'utf8');
  }

  readSkills(): CanonicalSkill[] {
    const skillsPath = this.getSkillsPath();
    if (!fs.existsSync(skillsPath)) return [];

    const entries = fs.readdirSync(skillsPath, { withFileTypes: true });
    const skills: CanonicalSkill[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillName = entry.name;
        const skillDir = path.join(skillsPath, skillName);
        const skillMd = path.join(skillDir, 'SKILL.md');

        let content = '';
        if (fs.existsSync(skillMd)) {
          content = fs.readFileSync(skillMd, 'utf8');
        }

        skills.push({
          name: skillName,
          content,
        });
      }
    }

    return skills;
  }

  writeSkills(skills: CanonicalSkill[], options: WriteOptions = {}): void {
    const skillsPath = this.getSkillsPath();
    if (!fs.existsSync(skillsPath)) {
      fs.mkdirSync(skillsPath, { recursive: true });
    }

    for (const skill of skills) {
      const skillDir = path.join(skillsPath, skill.name);
      if (!fs.existsSync(skillDir)) {
        fs.mkdirSync(skillDir, { recursive: true });
      }

      const skillMd = path.join(skillDir, 'SKILL.md');
      if (options.backup && fs.existsSync(skillMd)) {
        createBackup(skillMd);
      }
      fs.writeFileSync(skillMd, skill.content || '', 'utf8');
    }
  }
}

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { AgentAdapter, WriteOptions } from './base.js';
import { CanonicalMcpServer, CanonicalSkill, AgentStatus } from '../core/types.js';
import { parseJsonSafe, stringifyJson } from '../utils/json.js';
import { createBackup } from '../utils/backup.js';

export class OpenCodeAdapter extends AgentAdapter {
  readonly id = 'opencode';
  readonly name = 'OpenCode';

  private getConfigDir(): string {
    const xdg = process.env.XDG_CONFIG_HOME;
    if (xdg) {
      return path.join(xdg, 'opencode');
    }
    return path.join(os.homedir(), '.config', 'opencode');
  }

  getConfigPath(): string {
    const dir = this.getConfigDir();
    const jsonc = path.join(dir, 'opencode.jsonc');
    if (fs.existsSync(jsonc)) return jsonc;
    return path.join(dir, 'opencode.json');
  }

  getSkillsPath(): string {
    return path.join(this.getConfigDir(), 'skills');
  }

  isInstalled(): boolean {
    const configPath = this.getConfigPath();
    const dir = this.getConfigDir();
    return fs.existsSync(configPath) || fs.existsSync(dir);
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
    const mcpBlock = config.mcp || {};

    const result: Record<string, CanonicalMcpServer> = {};

    for (const [name, s] of Object.entries(mcpBlock)) {
      if (typeof s !== 'object' || s === null) continue;
      const srv = s as Record<string, any>;

      let command: string | undefined;
      let args: string[] | undefined;

      if (Array.isArray(srv.command) && srv.command.length > 0) {
        command = srv.command[0];
        args = srv.command.slice(1);
      } else if (typeof srv.command === 'string') {
        const parts = srv.command.split(/\s+/);
        command = parts[0];
        args = parts.slice(1);
      }

      const isRemote = srv.type === 'remote' || Boolean(srv.url);

      result[name] = {
        name,
        type: isRemote ? 'remote' : 'stdio',
        command,
        args,
        url: srv.url,
        env: srv.env,
        headers: srv.headers,
        enabled: srv.enabled !== false,
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
    } else {
      existingConfig = {
        $schema: 'https://opencode.ai/config.json',
      };
    }

    const mcpBlock: Record<string, any> = options.merge
      ? { ...(existingConfig.mcp || {}) }
      : {};

    for (const [name, s] of Object.entries(servers)) {
      if (s.type === 'remote' || (s.url && !s.command)) {
        mcpBlock[name] = {
          type: 'remote',
          url: s.url,
          ...(s.headers ? { headers: s.headers } : {}),
          enabled: s.enabled !== false,
        };
      } else {
        const cmdArray: string[] = [];
        if (s.command) cmdArray.push(s.command);
        if (s.args) cmdArray.push(...s.args);

        mcpBlock[name] = {
          type: 'local',
          command: cmdArray,
          ...(s.env && Object.keys(s.env).length > 0 ? { env: s.env } : {}),
          enabled: s.enabled !== false,
        };
      }
    }

    existingConfig.mcp = mcpBlock;
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
        } else {
          const sub = fs.readdirSync(skillDir);
          const md = sub.find((f: string) => f.endsWith('.md'));
          if (md) {
            content = fs.readFileSync(path.join(skillDir, md), 'utf8');
          }
        }

        // Subfiles
        const files: Record<string, string> = {};
        const collectFiles = (curDir: string, relPrefix = '') => {
          const items = fs.readdirSync(curDir, { withFileTypes: true });
          for (const item of items) {
            const relPath = relPrefix ? `${relPrefix}/${item.name}` : item.name;
            const fullPath = path.join(curDir, item.name);
            if (item.isDirectory()) {
              collectFiles(fullPath, relPath);
            } else if (item.isFile() && relPath !== 'SKILL.md') {
              try {
                files[relPath] = fs.readFileSync(fullPath, 'utf8');
              } catch {
                // ignore
              }
            }
          }
        };
        collectFiles(skillDir);

        skills.push({
          name: skillName,
          content,
          files: Object.keys(files).length > 0 ? files : undefined,
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

      if (skill.files) {
        for (const [relPath, content] of Object.entries(skill.files)) {
          const fullPath = path.join(skillDir, relPath);
          const parent = path.dirname(fullPath);
          if (!fs.existsSync(parent)) {
            fs.mkdirSync(parent, { recursive: true });
          }
          fs.writeFileSync(fullPath, content, 'utf8');
        }
      }
    }
  }
}

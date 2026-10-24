import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { AgentAdapter, WriteOptions } from './base.js';
import { CanonicalMcpServer, CanonicalSkill, AgentStatus } from '../core/types.js';
import { parseJsonSafe, stringifyJson } from '../utils/json.js';
import { createBackup } from '../utils/backup.js';

/**
 * Adapter for Antigravity (Google / Gemini coding agent).
 * Manages MCP servers via ~/.gemini/config/mcp_config.json
 * and skills via ~/.gemini/antigravity/skills/ and ~/.agents/skills/.
 */
export class AntigravityAdapter extends AgentAdapter {
  readonly id = 'antigravity';
  readonly name = 'Antigravity (Gemini)';

  private getGeminiDir(): string {
    return path.join(os.homedir(), '.gemini');
  }

  getConfigPath(): string {
    return path.join(this.getGeminiDir(), 'config', 'mcp_config.json');
  }

  getSkillsPath(): string {
    return path.join(this.getGeminiDir(), 'antigravity', 'skills');
  }

  getSharedSkillsPath(): string {
    return path.join(os.homedir(), '.agents', 'skills');
  }

  isInstalled(): boolean {
    const geminiDir = this.getGeminiDir();
    const configPath = this.getConfigPath();
    const skillsPath = this.getSkillsPath();
    return fs.existsSync(geminiDir) || fs.existsSync(configPath) || fs.existsSync(skillsPath);
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

    if (installed) {
      try {
        const skills = this.readSkills();
        skillCount = skills.length;
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
    const result: Record<string, CanonicalMcpServer> = {};

    if (fs.existsSync(configPath)) {
      try {
        const raw = fs.readFileSync(configPath, 'utf8');
        const config = parseJsonSafe<Record<string, any>>(raw, {});
        const mcpServers = config.mcpServers || {};

        for (const [name, s] of Object.entries(mcpServers)) {
          if (typeof s !== 'object' || s === null) continue;
          const srv = s as Record<string, any>;

          result[name] = {
            name,
            type: srv.url ? 'remote' : 'stdio',
            command: srv.command,
            args: Array.isArray(srv.args) ? srv.args : [],
            url: srv.url,
            env: srv.env,
            headers: srv.headers,
            enabled: srv.enabled !== false,
          };
        }
      } catch {
        // ignore
      }
    }

    // Also check ~/.gemini/antigravity/mcp/ directories
    const mcpDir = path.join(this.getGeminiDir(), 'antigravity', 'mcp');
    if (fs.existsSync(mcpDir)) {
      try {
        const entries = fs.readdirSync(mcpDir, { withFileTypes: true });
        for (const e of entries) {
          if (e.isDirectory() && !result[e.name]) {
            result[e.name] = {
              name: e.name,
              type: 'stdio',
              command: 'npx',
              args: ['-y', `${e.name}-mcp`],
              enabled: true,
              description: `MCP Server discovered in ${path.join(mcpDir, e.name)}`,
            };
          }
        }
      } catch {
        // ignore
      }
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

      if (s.type === 'remote' || (s.url && !s.command)) {
        mcpServers[name] = {
          url: s.url,
          ...(s.headers ? { headers: s.headers } : {}),
        };
      } else {
        mcpServers[name] = {
          command: s.command || 'npx',
          args: s.args || [],
          ...(s.env && Object.keys(s.env).length > 0 ? { env: s.env } : {}),
        };
      }
    }

    existingConfig.mcpServers = mcpServers;
    fs.writeFileSync(configPath, stringifyJson(existingConfig), 'utf8');
  }

  readSkills(): CanonicalSkill[] {
    const skills: CanonicalSkill[] = [];
    const seen = new Set<string>();

    const checkDirs = [
      this.getSkillsPath(),
      this.getSharedSkillsPath(),
      path.join(this.getGeminiDir(), 'skills'),
    ];

    for (const dir of checkDirs) {
      if (!fs.existsSync(dir)) continue;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if ((entry.isDirectory() || entry.isSymbolicLink()) && !seen.has(entry.name)) {
            const skillName = entry.name;
            const skillDir = path.join(dir, skillName);
            const skillMd = path.join(skillDir, 'SKILL.md');

            let content = '';
            if (fs.existsSync(skillMd)) {
              content = fs.readFileSync(skillMd, 'utf8');
            } else if (fs.existsSync(skillDir)) {
              try {
                const sub = fs.readdirSync(skillDir);
                const md = sub.find((f: string) => f.endsWith('.md'));
                if (md) {
                  content = fs.readFileSync(path.join(skillDir, md), 'utf8');
                }
              } catch {
                // ignore
              }
            }

            seen.add(skillName);
            skills.push({
              name: skillName,
              content,
            });
          }
        }
      } catch {
        // ignore
      }
    }

    return skills;
  }

  writeSkills(skills: CanonicalSkill[], options: WriteOptions = {}): void {
    const targets = [this.getSkillsPath(), this.getSharedSkillsPath()];

    for (const targetDir of targets) {
      if (!fs.existsSync(targetDir)) {
        try {
          fs.mkdirSync(targetDir, { recursive: true });
        } catch {
          continue;
        }
      }

      for (const skill of skills) {
        const skillDir = path.join(targetDir, skill.name);
        if (!fs.existsSync(skillDir)) {
          fs.mkdirSync(skillDir, { recursive: true });
        }

        const skillMd = path.join(skillDir, 'SKILL.md');
        if (options.backup && fs.existsSync(skillMd)) {
          createBackup(skillMd);
        }
        fs.writeFileSync(skillMd, skill.content || `# ${skill.name}\n`, 'utf8');

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
}

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  CanonicalMcpServer,
  CanonicalSkill,
  CanonicalRule,
  VaultManifest,
  SharedMemoryData,
  BlackboardState,
  Permission,
} from './types.js';
import { parseJsonSafe, stringifyJson } from '../utils/json.js';
import { SecretManager } from './secrets.js';
import { GitManager } from './git.js';

export interface VaultData {
  manifest: VaultManifest;
  servers: Record<string, CanonicalMcpServer>;
  skills: CanonicalSkill[];
  rules: CanonicalRule[];
  memory?: SharedMemoryData;
  blackboard?: BlackboardState;
}

export class VaultManager {
  private vaultPath: string;

  constructor(vaultPath: string) {
    this.vaultPath = vaultPath;
  }

  getPath(): string {
    return this.vaultPath;
  }

  ensureStructure(): void {
    if (!fs.existsSync(this.vaultPath)) {
      fs.mkdirSync(this.vaultPath, { recursive: true });
    }

    const dirs = ['skills', 'rules', 'memory'];
    for (const d of dirs) {
      const full = path.join(this.vaultPath, d);
      if (!fs.existsSync(full)) {
        fs.mkdirSync(full, { recursive: true });
      }
    }

    // .gitignore in vault
    const gitignorePath = path.join(this.vaultPath, '.gitignore');
    if (!fs.existsSync(gitignorePath)) {
      const gitignoreContent = [
        '# Local secrets and caches',
        '.env',
        '*.local',
        '.DS_Store',
        'Thumbs.db',
        '*.bak',
        '',
      ].join('\n');
      fs.writeFileSync(gitignorePath, gitignoreContent, 'utf8');
    }

    // Default README
    const readmePath = path.join(this.vaultPath, 'README.md');
    if (!fs.existsSync(readmePath)) {
      const readmeContent = [
        '# Agent Synchronization Vault',
        '',
        'This repository is managed by `skillmcpsync`.',
        'It contains canonical MCP server configurations, skills, and agent rules.',
        '',
        '## Structure',
        '- `mcp-servers.json`: Canonical Model Context Protocol server definitions',
        '- `skills/`: Custom agent skills and workflows',
        '- `rules/`: Global coding standards and agent prompts',
        '- `env.template`: Required environment variable keys',
        '',
      ].join('\n');
      fs.writeFileSync(readmePath, readmeContent, 'utf8');
    }

    // Default manifest
    const manifestPath = path.join(this.vaultPath, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      const manifest: VaultManifest = {
        version: '1.0.0',
        updatedAt: new Date().toISOString(),
        updatedBy: os.userInfo().username,
      };
      fs.writeFileSync(manifestPath, stringifyJson(manifest), 'utf8');
    }

    // Default mcp-servers.json
    const serversPath = path.join(this.vaultPath, 'mcp-servers.json');
    if (!fs.existsSync(serversPath)) {
      fs.writeFileSync(serversPath, stringifyJson({}), 'utf8');
    }

    // Default memory/shared-memory.json
    const memoryPath = path.join(this.vaultPath, 'memory', 'shared-memory.json');
    if (!fs.existsSync(memoryPath)) {
      const defaultMemory: SharedMemoryData = {
        version: '1.0.0',
        updatedAt: new Date().toISOString(),
        entries: {},
        history: [],
        conflicts: [],
      };
      fs.writeFileSync(memoryPath, stringifyJson(defaultMemory), 'utf8');
    }

    // Default memory/acl.json
    const aclPath = path.join(this.vaultPath, 'memory', 'acl.json');
    if (!fs.existsSync(aclPath)) {
      const defaultAcl: Record<string, Record<string, Permission>> = {
        researcher: { research: 'read_write', code: 'read', review: 'read', shared: 'read_write' },
        coder: { code: 'read_write', research: 'read', review: 'read', shared: 'read_write' },
        reviewer: { review: 'read_write', research: 'read', code: 'read', shared: 'read_write' },
      };
      fs.writeFileSync(aclPath, stringifyJson(defaultAcl), 'utf8');
    }
  }

  readManifest(): VaultManifest {
    const p = path.join(this.vaultPath, 'manifest.json');
    if (!fs.existsSync(p)) {
      return {
        version: '1.0.0',
        updatedAt: new Date().toISOString(),
      };
    }
    const raw = fs.readFileSync(p, 'utf8');
    return parseJsonSafe<VaultManifest>(raw, {
      version: '1.0.0',
      updatedAt: new Date().toISOString(),
    });
  }

  writeManifest(manifest: VaultManifest): void {
    const p = path.join(this.vaultPath, 'manifest.json');
    fs.writeFileSync(p, stringifyJson(manifest), 'utf8');
  }

  readMcpServers(): Record<string, CanonicalMcpServer> {
    const p = path.join(this.vaultPath, 'mcp-servers.json');
    if (!fs.existsSync(p)) return {};
    const raw = fs.readFileSync(p, 'utf8');
    return parseJsonSafe<Record<string, CanonicalMcpServer>>(raw, {});
  }

  writeMcpServers(servers: Record<string, CanonicalMcpServer>): void {
    const p = path.join(this.vaultPath, 'mcp-servers.json');
    fs.writeFileSync(p, stringifyJson(servers), 'utf8');

    // Also mirror to mcps/ folder for clean user visibility
    const mcpsDir = path.join(this.vaultPath, 'mcps');
    if (!fs.existsSync(mcpsDir)) {
      try {
        fs.mkdirSync(mcpsDir, { recursive: true });
      } catch {
        // ignore
      }
    }
    try {
      fs.writeFileSync(path.join(mcpsDir, 'mcp-servers.json'), stringifyJson(servers), 'utf8');
    } catch {
      // ignore
    }
  }

  readSkills(): CanonicalSkill[] {
    const skillsDir = path.join(this.vaultPath, 'skills');
    if (!fs.existsSync(skillsDir)) return [];

    const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
    const skills: CanonicalSkill[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillName = entry.name;
        const skillFolder = path.join(skillsDir, skillName);
        const skillMdPath = path.join(skillFolder, 'SKILL.md');
        let content = '';

        if (fs.existsSync(skillMdPath)) {
          content = fs.readFileSync(skillMdPath, 'utf8');
        } else {
          // If no SKILL.md, look for any .md file
          const subFiles = fs.readdirSync(skillFolder);
          const mdFile = subFiles.find((f: string) => f.endsWith('.md'));
          if (mdFile) {
            content = fs.readFileSync(path.join(skillFolder, mdFile), 'utf8');
          }
        }

        // Read all helper files inside skill directory
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
                // Ignore binary read error if any
              }
            }
          }
        };
        collectFiles(skillFolder);

        skills.push({
          name: skillName,
          content,
          files: Object.keys(files).length > 0 ? files : undefined,
        });
      }
    }

    return skills;
  }

  writeSkills(skills: CanonicalSkill[]): void {
    const skillsDir = path.join(this.vaultPath, 'skills');
    if (!fs.existsSync(skillsDir)) {
      fs.mkdirSync(skillsDir, { recursive: true });
    }

    for (const skill of skills) {
      const skillFolder = path.join(skillsDir, skill.name);
      if (!fs.existsSync(skillFolder)) {
        fs.mkdirSync(skillFolder, { recursive: true });
      }

      const skillMd = path.join(skillFolder, 'SKILL.md');
      fs.writeFileSync(skillMd, skill.content || '', 'utf8');

      if (skill.files) {
        for (const [relPath, content] of Object.entries(skill.files)) {
          const fullPath = path.join(skillFolder, relPath);
          const parent = path.dirname(fullPath);
          if (!fs.existsSync(parent)) {
            fs.mkdirSync(parent, { recursive: true });
          }
          fs.writeFileSync(fullPath, content, 'utf8');
        }
      }
    }
  }

  readRules(): CanonicalRule[] {
    const rulesDir = path.join(this.vaultPath, 'rules');
    if (!fs.existsSync(rulesDir)) return [];

    const entries = fs.readdirSync(rulesDir, { withFileTypes: true });
    const rules: CanonicalRule[] = [];

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        const ruleName = entry.name.replace(/\.md$/, '');
        const content = fs.readFileSync(path.join(rulesDir, entry.name), 'utf8');
        rules.push({
          name: ruleName,
          content,
        });
      }
    }

    return rules;
  }

  writeRules(rules: CanonicalRule[]): void {
    const rulesDir = path.join(this.vaultPath, 'rules');
    if (!fs.existsSync(rulesDir)) {
      fs.mkdirSync(rulesDir, { recursive: true });
    }

    for (const rule of rules) {
      const filePath = path.join(rulesDir, `${rule.name}.md`);
      fs.writeFileSync(filePath, rule.content, 'utf8');
    }
  }

  updateEnvTemplate(secretManager: SecretManager): string[] {
    const servers = this.readMcpServers();
    const skills = this.readSkills();
    const rules = this.readRules();

    const placeholders = secretManager.findPlaceholders({
      servers,
      skills,
      rules,
    });

    const envTemplatePath = path.join(this.vaultPath, 'env.template');
    const lines = [
      '# Required environment variables for synced MCP servers & skills',
      '# Copy this file to ~/.config/skillmcpsync/.env and populate your secrets.',
      '',
    ];

    for (const v of placeholders) {
      lines.push(`${v}=`);
    }

    fs.writeFileSync(envTemplatePath, lines.join('\n') + '\n', 'utf8');
    return placeholders;
  }

  readSharedMemory(): SharedMemoryData {
    const p = path.join(this.vaultPath, 'memory', 'shared-memory.json');
    if (!fs.existsSync(p)) {
      return {
        version: '1.0.0',
        updatedAt: new Date().toISOString(),
        entries: {},
        history: [],
        conflicts: [],
      };
    }
    const raw = fs.readFileSync(p, 'utf8');
    return parseJsonSafe<SharedMemoryData>(raw, {
      version: '1.0.0',
      updatedAt: new Date().toISOString(),
      entries: {},
      history: [],
      conflicts: [],
    });
  }

  writeSharedMemory(data: SharedMemoryData): void {
    const memDir = path.join(this.vaultPath, 'memory');
    if (!fs.existsSync(memDir)) {
      fs.mkdirSync(memDir, { recursive: true });
    }
    const p = path.join(memDir, 'shared-memory.json');
    fs.writeFileSync(p, stringifyJson(data), 'utf8');
  }

  readAccessControl(): Record<string, Record<string, Permission>> {
    const p = path.join(this.vaultPath, 'memory', 'acl.json');
    if (!fs.existsSync(p)) return {};
    const raw = fs.readFileSync(p, 'utf8');
    return parseJsonSafe<Record<string, Record<string, Permission>>>(raw, {});
  }

  writeAccessControl(acl: Record<string, Record<string, Permission>>): void {
    const memDir = path.join(this.vaultPath, 'memory');
    if (!fs.existsSync(memDir)) {
      fs.mkdirSync(memDir, { recursive: true });
    }
    const p = path.join(memDir, 'acl.json');
    fs.writeFileSync(p, stringifyJson(acl), 'utf8');
  }

  readBlackboard(): BlackboardState {
    const p = path.join(this.vaultPath, 'memory', 'blackboard.json');
    if (!fs.existsSync(p)) {
      return {
        version: '1.0.0',
        updatedAt: new Date().toISOString(),
        namespaceSummaries: {},
      };
    }
    const raw = fs.readFileSync(p, 'utf8');
    return parseJsonSafe<BlackboardState>(raw, {
      version: '1.0.0',
      updatedAt: new Date().toISOString(),
      namespaceSummaries: {},
    });
  }

  writeBlackboard(state: BlackboardState): void {
    const memDir = path.join(this.vaultPath, 'memory');
    if (!fs.existsSync(memDir)) {
      fs.mkdirSync(memDir, { recursive: true });
    }
    const p = path.join(memDir, 'blackboard.json');
    fs.writeFileSync(p, stringifyJson(state), 'utf8');
  }

  writeMemoryMarkdown(markdownContent: string, filename = 'MEMORY.md'): string {
    const targetPath = path.join(this.vaultPath, filename);
    fs.writeFileSync(targetPath, markdownContent, 'utf8');
    return targetPath;
  }

  readMemoryMarkdown(filename = 'MEMORY.md'): string | null {
    const targetPath = path.join(this.vaultPath, filename);
    if (!fs.existsSync(targetPath)) return null;
    return fs.readFileSync(targetPath, 'utf8');
  }

  readAll(): VaultData {
    return {
      manifest: this.readManifest(),
      servers: this.readMcpServers(),
      skills: this.readSkills(),
      rules: this.readRules(),
      memory: this.readSharedMemory(),
      blackboard: this.readBlackboard(),
    };
  }
}

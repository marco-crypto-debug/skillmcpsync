import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from '../core/config.js';
import { VaultManager } from '../core/vault.js';
import { logger } from '../utils/logger.js';
import pc from 'picocolors';

export function skillListCommand(options: { vault?: string }): void {
  const config = loadConfig();
  const vaultPath = options.vault || config.vaultPath;
  const vault = new VaultManager(vaultPath);

  const skills = vault.readSkills();
  logger.header(`Skills in Vault (${skills.length})`);

  if (skills.length === 0) {
    logger.info('No skills defined in vault.');
    return;
  }

  for (const skill of skills) {
    const fileCount = skill.files ? Object.keys(skill.files).length : 0;
    const fileDesc = fileCount > 0 ? pc.dim(` (${fileCount} subfiles)`) : '';
    console.log(`• ${pc.bold(skill.name)}${fileDesc}`);
    if (skill.description) {
      console.log(`  ${pc.dim(skill.description)}`);
    }
  }
  logger.divider();
}

export function skillAddCommand(skillSourcePath: string, options: { vault?: string; name?: string }): void {
  const config = loadConfig();
  const vaultPath = options.vault || config.vaultPath;
  const vault = new VaultManager(vaultPath);

  const resolved = path.resolve(skillSourcePath);
  if (!fs.existsSync(resolved)) {
    logger.error(`Source path does not exist: ${resolved}`);
    process.exit(1);
  }

  const stat = fs.statSync(resolved);
  let skillName = options.name;

  if (stat.isDirectory()) {
    const finalName = options.name || path.basename(resolved);
    const skillMd = path.join(resolved, 'SKILL.md');
    let content = '';
    if (fs.existsSync(skillMd)) {
      content = fs.readFileSync(skillMd, 'utf8');
    } else {
      const files = fs.readdirSync(resolved);
      const md = files.find((f: string) => f.endsWith('.md'));
      if (md) {
        content = fs.readFileSync(path.join(resolved, md), 'utf8');
      }
    }

    const subfiles: Record<string, string> = {};
    const collectFiles = (curDir: string, relPrefix = '') => {
      const items = fs.readdirSync(curDir, { withFileTypes: true });
      for (const item of items) {
        const relPath = relPrefix ? `${relPrefix}/${item.name}` : item.name;
        const fullPath = path.join(curDir, item.name);
        if (item.isDirectory()) {
          collectFiles(fullPath, relPath);
        } else if (item.isFile() && relPath !== 'SKILL.md') {
          try {
            subfiles[relPath] = fs.readFileSync(fullPath, 'utf8');
          } catch {
            // ignore
          }
        }
      }
    };
    collectFiles(resolved);

    const skills = vault.readSkills();
    const existingIdx = skills.findIndex((s) => s.name === finalName);
    const newSkill = {
      name: finalName,
      content,
      files: Object.keys(subfiles).length > 0 ? subfiles : undefined,
    };

    if (existingIdx !== -1) {
      skills[existingIdx] = newSkill;
    } else {
      skills.push(newSkill);
    }

    vault.writeSkills(skills);
    logger.success(`Skill '${pc.bold(finalName)}' imported into vault.`);
  } else {
    // Single markdown file
    const finalName = options.name || path.basename(resolved, path.extname(resolved));
    const content = fs.readFileSync(resolved, 'utf8');
    const skills = vault.readSkills();
    const existingIdx = skills.findIndex((s) => s.name === finalName);
    const newSkill = { name: finalName, content };

    if (existingIdx !== -1) {
      skills[existingIdx] = newSkill;
    } else {
      skills.push(newSkill);
    }

    vault.writeSkills(skills);
    logger.success(`Skill '${pc.bold(finalName)}' imported into vault.`);
  }

  console.log(pc.dim('Run `skillmcpsync apply` or `skillmcpsync sync` to distribute.'));
}

export function skillRemoveCommand(skillName: string, options: { vault?: string }): void {
  const config = loadConfig();
  const vaultPath = options.vault || config.vaultPath;
  const vaultDir = path.join(vaultPath, 'skills', skillName);

  if (!fs.existsSync(vaultDir)) {
    logger.warn(`Skill '${skillName}' not found in vault.`);
    return;
  }

  fs.rmSync(vaultDir, { recursive: true, force: true });
  logger.success(`Removed skill '${pc.bold(skillName)}' from vault.`);
}

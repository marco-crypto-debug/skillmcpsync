import fs from 'node:fs';
import os from 'node:os';
import { loadConfig } from '../core/config.js';
import { VaultManager } from '../core/vault.js';
import { SecretManager } from '../core/secrets.js';
import { AdapterRegistry } from '../adapters/registry.js';
import { CanonicalMcpServer, CanonicalSkill, CanonicalRule } from '../core/types.js';
import { logger } from '../utils/logger.js';
import pc from 'picocolors';

export interface ExportOptions {
  agents?: string[];
  vault?: string;
  skipSecrets?: boolean;
}

export async function exportCommand(options: ExportOptions): Promise<void> {
  logger.header('Exporting to Vault');

  const config = loadConfig();
  const vaultPath = options.vault || config.vaultPath;
  const vault = new VaultManager(vaultPath);
  vault.ensureStructure();

  const secretManager = new SecretManager(config.envFile);
  const targetAdapters = AdapterRegistry.resolve(options.agents);

  if (targetAdapters.length === 0) {
    logger.warn('No active agents found to export from.');
    return;
  }

  const existingServers = vault.readMcpServers();
  const existingSkills = vault.readSkills();
  const existingRules = vault.readRules();

  const mergedServers: Record<string, CanonicalMcpServer> = { ...existingServers };
  const skillMap = new Map<string, CanonicalSkill>(existingSkills.map((s) => [s.name, s]));
  const ruleMap = new Map<string, CanonicalRule>(existingRules.map((r) => [r.name, r]));

  const allExtractedSecrets: Record<string, string> = {};
  let totalServersExported = 0;
  let totalSkillsExported = 0;
  let totalRulesExported = 0;

  for (const adapter of targetAdapters) {
    if (!adapter.isInstalled()) continue;

    logger.info(`Reading from ${pc.bold(adapter.name)}...`);

    // 1. Read MCP Servers
    try {
      const servers = adapter.readMcpServers();
      const sCount = Object.keys(servers).length;
      if (sCount > 0) {
        logger.dim(`  Found ${sCount} MCP server(s)`);
        for (const [name, server] of Object.entries(servers)) {
          if (options.skipSecrets) {
            mergedServers[name] = server;
          } else {
            const { tokenized, extractedSecrets } = secretManager.tokenizeObject(server, name);
            mergedServers[name] = tokenized;
            Object.assign(allExtractedSecrets, extractedSecrets);
          }
          totalServersExported++;
        }
      }
    } catch (err: any) {
      logger.warn(`  Failed to read MCP servers from ${adapter.name}: ${err.message}`);
    }

    // 2. Read Skills
    if (adapter.readSkills) {
      try {
        const skills = adapter.readSkills();
        if (skills.length > 0) {
          logger.dim(`  Found ${skills.length} skill(s)`);
          for (const skill of skills) {
            skillMap.set(skill.name, skill);
            totalSkillsExported++;
          }
        }
      } catch (err: any) {
        logger.warn(`  Failed to read skills from ${adapter.name}: ${err.message}`);
      }
    }

    // 3. Read Rules
    if (adapter.readRules) {
      try {
        const rules = adapter.readRules();
        if (rules.length > 0) {
          logger.dim(`  Found ${rules.length} rule(s)`);
          for (const rule of rules) {
            ruleMap.set(rule.name, rule);
            totalRulesExported++;
          }
        }
      } catch (err: any) {
        logger.warn(`  Failed to read rules from ${adapter.name}: ${err.message}`);
      }
    }
  }

  // Write into vault
  vault.writeMcpServers(mergedServers);
  vault.writeSkills(Array.from(skillMap.values()));
  vault.writeRules(Array.from(ruleMap.values()));

  // Update manifest
  const manifest = vault.readManifest();
  manifest.updatedAt = new Date().toISOString();
  manifest.updatedBy = `${os.userInfo().username}@${os.hostname()}`;
  vault.writeManifest(manifest);

  // Update env.template in vault
  const placeholders = vault.updateEnvTemplate(secretManager);

  // If secrets were extracted, write them to local ~/.config/skillmcpsync/.env
  if (Object.keys(allExtractedSecrets).length > 0) {
    logger.info(`Extracted ${Object.keys(allExtractedSecrets).length} secret(s) to local .env`);
    let envContent = '';
    if (fs.existsSync(config.envFile)) {
      envContent = fs.readFileSync(config.envFile, 'utf8');
    }
    for (const [key, val] of Object.entries(allExtractedSecrets)) {
      if (!envContent.includes(`${key}=`)) {
        envContent += `${key}="${val}"\n`;
      }
    }
    fs.writeFileSync(config.envFile, envContent, 'utf8');
    logger.success(`Saved local secrets to: ${pc.dim(config.envFile)}`);
  }

  logger.divider();
  logger.success('Export completed successfully:');
  console.log(`  • MCP Servers in Vault : ${pc.bold(String(Object.keys(mergedServers).length))}`);
  console.log(`  • Skills in Vault      : ${pc.bold(String(skillMap.size))}`);
  console.log(`  • Rules in Vault       : ${pc.bold(String(ruleMap.size))}`);
  console.log(`  • Env Placeholders     : ${pc.bold(String(placeholders.length))}`);
  logger.divider();
}

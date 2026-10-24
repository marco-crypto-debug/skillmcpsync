import { loadConfig } from '../core/config.js';
import { VaultManager } from '../core/vault.js';
import { SecretManager } from '../core/secrets.js';
import { AdapterRegistry } from '../adapters/registry.js';
import { CanonicalMcpServer } from '../core/types.js';
import { logger } from '../utils/logger.js';
import pc from 'picocolors';

export interface ApplyOptions {
  agents?: string[];
  vault?: string;
  noBackup?: boolean;
  dryRun?: boolean;
}

export async function applyCommand(options: ApplyOptions): Promise<void> {
  logger.header('Applying Vault to Local Agents');

  const config = loadConfig();
  const vaultPath = options.vault || config.vaultPath;
  const vault = new VaultManager(vaultPath);

  const rawServers = vault.readMcpServers();
  const skills = vault.readSkills();
  const rules = vault.readRules();

  const serverCount = Object.keys(rawServers).length;
  if (serverCount === 0 && skills.length === 0 && rules.length === 0) {
    logger.warn('Vault is currently empty. Run `skillmcpsync export` first.');
    return;
  }

  const secretManager = new SecretManager(config.envFile);

  // Check required placeholders and warn about missing ones
  const placeholders = secretManager.findPlaceholders({
    rawServers,
    skills,
    rules,
  });
  const missingVars = secretManager.getMissingEnvVars(placeholders);

  if (missingVars.length > 0) {
    logger.warn('The following environment variables are required but missing:');
    for (const v of missingVars) {
      console.log(`  ${pc.yellow('⚠')} ${pc.bold(v)} (add to ${pc.dim(config.envFile)} or export in shell)`);
    }
  }

  // Resolve placeholders for MCP servers
  const resolvedServers: Record<string, CanonicalMcpServer> = {};
  for (const [name, server] of Object.entries(rawServers)) {
    resolvedServers[name] = secretManager.resolveObject(server);
  }

  const targetAdapters = AdapterRegistry.resolve(options.agents);
  const writeOpts = {
    backup: options.noBackup ? false : config.autoBackup,
    merge: true,
  };

  for (const adapter of targetAdapters) {
    if (!adapter.isInstalled()) {
      logger.dim(`Skipping ${adapter.name} (not detected)`);
      continue;
    }

    logger.info(`Applying to ${pc.bold(adapter.name)}...`);

    if (options.dryRun) {
      logger.dim(`  [DRY-RUN] Would write ${serverCount} MCP server(s)`);
      if (adapter.writeSkills && skills.length > 0) {
        logger.dim(`  [DRY-RUN] Would write ${skills.length} skill(s)`);
      }
      if (adapter.writeRules && rules.length > 0) {
        logger.dim(`  [DRY-RUN] Would write ${rules.length} rule(s)`);
      }
      continue;
    }

    // 1. Write MCP Servers
    try {
      adapter.writeMcpServers(resolvedServers, writeOpts);
      logger.success(`  Configured ${serverCount} MCP server(s)`);
    } catch (err: any) {
      logger.error(`  Failed to write MCP servers to ${adapter.name}: ${err.message}`);
    }

    // 2. Write Skills
    if (adapter.writeSkills && skills.length > 0) {
      try {
        adapter.writeSkills(skills, writeOpts);
        logger.success(`  Configured ${skills.length} skill(s)`);
      } catch (err: any) {
        logger.error(`  Failed to write skills to ${adapter.name}: ${err.message}`);
      }
    }

    // 3. Write Rules
    if (adapter.writeRules && rules.length > 0) {
      try {
        adapter.writeRules(rules, writeOpts);
        logger.success(`  Configured ${rules.length} rule(s)`);
      } catch (err: any) {
        logger.error(`  Failed to write rules to ${adapter.name}: ${err.message}`);
      }
    }
  }

  logger.divider();
  if (options.dryRun) {
    logger.info('Dry run finished. No files were modified.');
  } else {
    logger.success('Vault configuration applied successfully to all active agents.');
  }
}

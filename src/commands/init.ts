import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, saveConfig, getDefaultConfig } from '../core/config.js';
import { GitManager } from '../core/git.js';
import { VaultManager } from '../core/vault.js';
import { AdapterRegistry } from '../adapters/registry.js';
import { logger } from '../utils/logger.js';
import pc from 'picocolors';

export interface InitOptions {
  repo?: string;
  vault?: string;
  branch?: string;
  local?: boolean;
}

export async function initCommand(options: InitOptions): Promise<void> {
  logger.header('Initializing skillmcpsync');

  if (!GitManager.isGitInstalled()) {
    logger.error('Git is not installed or not available in PATH. Please install Git first.');
    process.exit(1);
  }

  const config = loadConfig();
  if (options.vault) {
    config.vaultPath = path.resolve(options.vault);
  }
  if (options.branch) {
    config.branch = options.branch;
  }
  if (options.repo) {
    config.repoUrl = options.repo;
  }

  const vaultPath = config.vaultPath;
  logger.info(`Vault directory: ${pc.bold(vaultPath)}`);

  // Check if vault exists
  if (options.repo && !options.local) {
    if (fs.existsSync(vaultPath) && fs.readdirSync(vaultPath).length > 0) {
      if (GitManager.isGitRepo(vaultPath)) {
        logger.info(`Existing git repository detected at ${vaultPath}.`);
        GitManager.setRemote(vaultPath, options.repo);
        logger.success(`Set remote origin to: ${options.repo}`);
      } else {
        logger.warn(
          `Directory ${vaultPath} exists and is not empty. Backing up before cloning...`
        );
        const backupVault = `${vaultPath}.bak-${Date.now()}`;
        fs.renameSync(vaultPath, backupVault);
        logger.info(`Moved old directory to ${backupVault}`);

        logger.info(`Cloning repository from ${options.repo}...`);
        const cloneRes = GitManager.clone(options.repo, vaultPath, config.branch);
        if (!cloneRes.success) {
          logger.error(`Failed to clone repository: ${cloneRes.error}`);
          process.exit(1);
        }
        logger.success('Repository cloned successfully.');
      }
    } else {
      logger.info(`Cloning repository from ${options.repo}...`);
      const cloneRes = GitManager.clone(options.repo, vaultPath, config.branch);
      if (!cloneRes.success) {
        logger.error(`Failed to clone repository: ${cloneRes.error}`);
        process.exit(1);
      }
      logger.success('Repository cloned successfully.');
    }
  } else {
    // Local vault setup
    if (!fs.existsSync(vaultPath)) {
      fs.mkdirSync(vaultPath, { recursive: true });
    }

    if (!GitManager.isGitRepo(vaultPath)) {
      logger.info('Initializing local Git repository for the vault...');
      GitManager.init(vaultPath, config.branch);
      logger.success(`Initialized Git repository on branch '${config.branch}'.`);
    } else {
      logger.info('Vault is already a Git repository.');
    }
  }

  // Ensure vault structure
  const vault = new VaultManager(vaultPath);
  vault.ensureStructure();

  // Initial commit if brand new repo
  const gitStatus = GitManager.status(vaultPath);
  if (!gitStatus.isClean) {
    GitManager.add(vaultPath);
    GitManager.commit(vaultPath, 'Initial vault structure created by skillmcpsync');
    logger.success('Created initial vault commit.');
  }

  saveConfig(config);
  logger.success('Configuration saved.');

  // Scan installed agents
  logger.divider();
  logger.info('Detecting installed coding agents on this machine:');
  const allAdapters = AdapterRegistry.getAll();
  for (const adapter of allAdapters) {
    const isInstalled = adapter.isInstalled();
    const statusIcon = isInstalled ? pc.green('✔ Installed') : pc.dim('✖ Not detected');
    console.log(`  ${pc.bold(adapter.name.padEnd(20))} ${statusIcon}  ${pc.dim(adapter.getConfigPath())}`);
  }

  logger.divider();
  logger.info('Next steps:');
  console.log(`  1. Export local agent configurations into vault:`);
  console.log(`     ${pc.cyan('skillmcpsync export')}`);
  console.log(`  2. Review vault status:`);
  console.log(`     ${pc.cyan('skillmcpsync status')}`);
  console.log(`  3. Sync across machines:`);
  console.log(`     ${pc.cyan('skillmcpsync sync')}`);
  logger.divider();
}

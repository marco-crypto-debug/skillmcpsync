import os from 'node:os';
import { loadConfig } from '../core/config.js';
import { VaultManager } from '../core/vault.js';
import { GitManager } from '../core/git.js';
import { AccessControl, SharedMemoryPool, Blackboard } from '../core/memory.js';
import { ConflictStrategy } from '../core/types.js';
import { exportCommand } from './export.js';
import { applyCommand } from './apply.js';
import { logger } from '../utils/logger.js';
import pc from 'picocolors';

export interface SyncOptions {
  message?: string;
  vault?: string;
  agents?: string[];
  noPush?: boolean;
  noPull?: boolean;
  conflictStrategy?: ConflictStrategy;
}

export async function syncCommand(options: SyncOptions): Promise<void> {
  logger.header('Synchronizing MCP Servers, Skills & Multi-Agent Shared Memory');

  const config = loadConfig();
  const vaultPath = options.vault || config.vaultPath;
  const vault = new VaultManager(vaultPath);
  vault.ensureStructure();

  const isGit = GitManager.isGitRepo(vaultPath);
  const remote = isGit ? GitManager.getRemote(vaultPath) : null;

  const totalSteps = 5;

  // Step 1: Pull remote changes
  if (isGit && remote && !options.noPull) {
    logger.step(1, totalSteps, `Pulling latest changes from remote (${remote})...`);
    const branch = GitManager.getBranch(vaultPath);
    const pullRes = GitManager.pull(vaultPath, 'origin', branch);
    if (!pullRes.success) {
      logger.warn(`Could not pull from remote: ${pullRes.error}`);
      logger.info('Continuing with local synchronization...');
    } else {
      logger.success('Pulled latest changes.');
    }
  } else {
    logger.step(1, totalSteps, 'Skipping pull (no remote configured or --no-pull).');
  }

  // Step 2: Export local agent configurations into vault
  logger.step(2, totalSteps, 'Exporting local agent configurations into vault...');
  await exportCommand({
    agents: options.agents,
    vault: vaultPath,
  });

  // Step 3: Synchronize Multi-Agent Shared Memory Pool & Blackboard
  logger.step(3, totalSteps, 'Synchronizing Multi-Agent Shared Memory & Blackboard...');
  try {
    const rawAcl = vault.readAccessControl();
    const acl = Object.keys(rawAcl).length > 0
      ? new AccessControl(rawAcl)
      : AccessControl.createDefaultTeamACL();

    const memData = vault.readSharedMemory();
    const strategy = options.conflictStrategy || 'last_write_wins';
    const pool = new SharedMemoryPool(acl, strategy, memData);
    const blackboard = new Blackboard(pool);

    const entries = pool.getAllEntries();
    const entryCount = Object.keys(entries).length;
    const conflicts = pool.getConflicts();

    if (conflicts.length > 0) {
      logger.info(`  Detected and tracked ${conflicts.length} conflict event(s) across agents.`);
    }

    // Assemble current state onto blackboard
    const blackboardState = blackboard.getState();
    vault.writeBlackboard(blackboardState);
    vault.writeSharedMemory(pool.exportData());
    vault.writeAccessControl(acl.getAllPermissions());

    logger.success(
      `  Shared memory synchronized: ${entryCount} entry(s) across ${pool.listNamespaces().length} namespace(s).`
    );
  } catch (err: any) {
    logger.warn(`  Shared memory sync warning: ${err.message}`);
  }

  // Step 4: Apply unified vault back to all local agents
  logger.step(4, totalSteps, 'Applying unified vault configuration to local agents...');
  await applyCommand({
    agents: options.agents,
    vault: vaultPath,
  });

  // Step 5: Commit and push changes if Git is initialized
  logger.step(5, totalSteps, 'Checking for vault changes to commit and push...');
  if (isGit) {
    const gitStatus = GitManager.status(vaultPath);

    if (!gitStatus.isClean) {
      GitManager.add(vaultPath);
      const commitMsg =
        options.message ||
        `Sync (MCP, skills & shared memory) from ${os.hostname()} at ${new Date().toISOString()}`;
      const commitRes = GitManager.commit(vaultPath, commitMsg);
      if (commitRes.success) {
        logger.success(`Committed changes: "${commitMsg}"`);
      }
    } else {
      logger.dim('No changes to commit.');
    }

    if (remote && !options.noPush) {
      const currentStatus = GitManager.status(vaultPath);
      if (currentStatus.ahead > 0) {
        logger.info(`Pushing ${currentStatus.ahead} commit(s) to remote...`);
        const pushRes = GitManager.push(vaultPath, 'origin', currentStatus.branch);
        if (pushRes.success) {
          logger.success('Pushed changes to remote.');
        } else {
          logger.error(`Failed to push changes: ${pushRes.error}`);
        }
      } else {
        logger.dim('Remote is up to date.');
      }
    }
  }

  logger.divider();
  logger.success('All tools, skills, MCP servers, and multi-agent shared memory are synchronized!');
  logger.divider();
}

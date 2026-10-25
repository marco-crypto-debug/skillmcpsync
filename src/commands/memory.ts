import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from '../core/config.js';
import { VaultManager } from '../core/vault.js';
import {
  AccessControl,
  SharedMemoryPool,
  Blackboard,
  AgentMemorySession,
} from '../core/memory.js';
import { Permission, ConflictStrategy } from '../core/types.js';
import { ProjectMemoryManager, FOCUSIN_AGENT_DIRECTIVE, getProjectAgentDirective } from '../core/project_memory.js';
import { logger } from '../utils/logger.js';
import pc from 'picocolors';

export interface MemoryListOptions {
  vault?: string;
  namespace?: string;
}

export interface MemoryReadOptions {
  vault?: string;
  agent?: string;
}

export interface MemoryWriteOptions {
  vault?: string;
  agent?: string;
  strategy?: ConflictStrategy;
  version?: string;
}

export interface MemoryScratchpadOptions {
  vault?: string;
  think?: string;
  clear?: boolean;
}

export interface MemoryAclOptions {
  vault?: string;
  grant?: boolean;
  agent?: string;
  namespace?: string;
  perm?: Permission;
}

function getMemoryContext(vaultPathOpt?: string) {
  const config = loadConfig();
  const vaultPath = vaultPathOpt || config.vaultPath;
  const vault = new VaultManager(vaultPath);
  vault.ensureStructure();

  const rawAcl = vault.readAccessControl();
  const acl = Object.keys(rawAcl).length > 0
    ? new AccessControl(rawAcl)
    : AccessControl.createDefaultTeamACL();

  const memData = vault.readSharedMemory();
  const pool = new SharedMemoryPool(acl, 'last_write_wins', memData);
  const blackboard = new Blackboard(pool);

  return { vault, acl, pool, blackboard };
}

export function memoryListCommand(options: MemoryListOptions): void {
  const { pool } = getMemoryContext(options.vault);
  const allEntries = pool.getAllEntries();
  const namespaces = pool.listNamespaces();

  logger.header(`Multi-Agent Shared Memory (${Object.keys(allEntries).length} entries)`);

  if (namespaces.length === 0) {
    logger.info('Shared memory pool is currently empty.');
    console.log(pc.dim('Use `skillmcpsync memory write <namespace> <key> <value>` to post findings.'));
    return;
  }

  const targetNamespaces = options.namespace
    ? namespaces.filter((n) => n === options.namespace)
    : namespaces;

  for (const ns of targetNamespaces) {
    const entries = Object.values(allEntries).filter((e) => e.namespace === ns);
    console.log(`\n${pc.bold(pc.cyan(`[namespace: ${ns}/]`))} (${entries.length} entries)`);

    for (const e of entries) {
      const authorBadge = pc.magenta(`@${e.author}`);
      const verBadge = pc.yellow(`v${e.version}`);
      const dateStr = pc.dim(new Date(e.timestamp).toLocaleTimeString());
      console.log(`  • ${pc.bold(e.key)} ${verBadge} by ${authorBadge} (${dateStr})`);

      const preview = e.value.length > 90 ? `${e.value.slice(0, 87)}...` : e.value;
      console.log(`    ${pc.dim(preview.replace(/\n/g, ' '))}`);
    }
  }

  logger.divider();
}

export function memoryReadCommand(
  namespace: string,
  key: string | undefined,
  options: MemoryReadOptions
): void {
  const { pool } = getMemoryContext(options.vault);
  const agentId = options.agent || 'reviewer'; // Defaults to reviewer who has broad read access

  try {
    const entries = pool.read(agentId, namespace, key);
    if (entries.length === 0) {
      logger.warn(`No entries found for ${namespace}${key ? `/${key}` : ''}`);
      return;
    }

    logger.header(`Shared Memory: ${namespace}${key ? `/${key}` : ''}`);
    for (const entry of entries) {
      console.log(
        `${pc.bold(entry.namespace + '/' + entry.key)} ` +
        `[v${entry.version} by ${pc.magenta('@' + entry.author)} at ${new Date(entry.timestamp).toISOString()}]`
      );
      console.log(pc.dim('------------------------------------------------------------'));
      console.log(entry.value);
      console.log(pc.dim('------------------------------------------------------------\n'));
    }
  } catch (err: any) {
    logger.error(err.message);
  }
}

export function memoryWriteCommand(
  namespace: string,
  key: string,
  value: string,
  options: MemoryWriteOptions
): void {
  const { vault, pool, blackboard } = getMemoryContext(options.vault);
  const agentId = options.agent || 'coder';
  const expectedVersion = options.version ? parseInt(options.version, 10) : undefined;
  const strategy = options.strategy || 'last_write_wins';

  try {
    const entry = pool.write(agentId, namespace, key, value, {
      expectedVersion,
      strategy,
    });

    // Persist to vault
    vault.writeSharedMemory(pool.exportData());
    vault.writeBlackboard(blackboard.getState());

    logger.success(
      `Wrote [${pc.bold(namespace + '/' + key)}] v${entry.version} by ${pc.magenta('@' + agentId)}`
    );
  } catch (err: any) {
    logger.error(`Write failed: ${err.message}`);
  }
}

export function memoryScratchpadCommand(
  agentId: string,
  options: MemoryScratchpadOptions
): void {
  const { vault, pool } = getMemoryContext(options.vault);
  const memData = vault.readSharedMemory();
  const scratchpads = memData.scratchpads || {};
  const currentNotes = scratchpads[agentId] || [];
  const session = new AgentMemorySession(agentId, agentId, pool, currentNotes);

  if (options.clear) {
    session.clearScratchpad();
    scratchpads[agentId] = [];
    memData.scratchpads = scratchpads;
    vault.writeSharedMemory(memData);
    logger.success(`Cleared private scratchpad for agent '${agentId}'.`);
    return;
  }

  if (options.think) {
    session.think(options.think);
    scratchpads[agentId] = session.getScratchpad();
    memData.scratchpads = scratchpads;
    vault.writeSharedMemory(memData);
    logger.success(`Added private thought to agent '${agentId}' scratchpad.`);
    return;
  }

  logger.header(`Private Scratchpad: ${agentId}`);
  const notes = session.getScratchpad();
  if (notes.length === 0) {
    logger.info(`Scratchpad is empty for agent '${agentId}'.`);
    console.log(pc.dim(`Add a thought with: skillmcpsync memory scratchpad ${agentId} --think "your thought"`));
    return;
  }

  for (let i = 0; i < notes.length; i++) {
    console.log(`  ${pc.cyan(`[${i + 1}]`)} ${notes[i]}`);
  }
  logger.divider();
  console.log(pc.dim('Note: Scratchpad contents are private to this agent and not visible in shared memory.'));
}

export function memoryBlackboardCommand(options: { vault?: string; agent?: string }): void {
  const { blackboard } = getMemoryContext(options.vault);
  logger.header('Unified Multi-Agent Blackboard');
  console.log(blackboard.getSummary(options.agent));
  logger.divider();
}

export function memoryAssembleCommand(options: {
  vault?: string;
  agent?: string;
  targetNamespace?: string;
  targetKey?: string;
}): void {
  const { vault, pool, blackboard } = getMemoryContext(options.vault);
  const agentId = options.agent || 'reviewer';
  const targetNs = options.targetNamespace || 'shared';
  const targetKey = options.targetKey || 'blackboard_solution';

  try {
    const entry = blackboard.postAssembledSolution(agentId, targetNs, targetKey);
    vault.writeSharedMemory(pool.exportData());
    vault.writeBlackboard(blackboard.getState());

    logger.success(
      `Assembled multi-agent solution and posted back to shared memory as [${pc.bold(
        targetNs + '/' + targetKey
      )}] (v${entry.version})`
    );
  } catch (err: any) {
    logger.error(`Assemble failed: ${err.message}`);
  }
}

export function memoryConflictsCommand(options: { vault?: string }): void {
  const { pool } = getMemoryContext(options.vault);
  const conflicts = pool.getConflicts();

  logger.header(`Conflict Resolution Events (${conflicts.length})`);
  if (conflicts.length === 0) {
    logger.info('No conflicts detected in memory pool.');
    return;
  }

  for (const c of conflicts) {
    const statusColor = c.resolution === 'rejected' ? pc.red : pc.green;
    console.log(
      `• [${pc.bold(c.namespace + '/' + c.key)}] ${statusColor(c.resolution.toUpperCase())} ` +
      `via strategy ${pc.cyan(c.strategy)}`
    );
    console.log(
      `  Incoming: @${c.incomingAuthor} (v${c.incomingVersion || '?'}) vs Existing: @${c.existingAuthor} (v${c.existingVersion})`
    );
    if (c.details) {
      console.log(`  ${pc.dim(c.details)}`);
    }
  }
  logger.divider();
}

export function memoryHistoryCommand(options: { vault?: string }): void {
  const { pool } = getMemoryContext(options.vault);
  const history = pool.getHistory();

  logger.header(`Shared Memory Audit Log (${history.length} operations)`);
  if (history.length === 0) {
    logger.info('No operations in history.');
    return;
  }

  for (const item of history.slice(-20)) {
    const date = new Date(item.timestamp).toLocaleTimeString();
    console.log(
      `  [${pc.dim(date)}] ${pc.bold(item.action.toUpperCase())} ${pc.cyan(item.key)} ` +
      `v${item.version || 1} by ${pc.magenta('@' + item.agent)}${item.detail ? ` (${pc.dim(item.detail)})` : ''}`
    );
  }
  logger.divider();
}

export function memoryAclCommand(options: MemoryAclOptions): void {
  const { vault, acl } = getMemoryContext(options.vault);

  if (options.grant && options.agent && options.namespace && options.perm) {
    acl.grant(options.agent, options.namespace, options.perm);
    vault.writeAccessControl(acl.getAllPermissions());
    logger.success(
      `Granted ${pc.bold(options.perm)} to ${pc.magenta('@' + options.agent)} on namespace '${pc.cyan(
        options.namespace
      )}'`
    );
    return;
  }

  logger.header('Access Control Layer Permissions');
  console.log(acl.describe());
  logger.divider();
}

export function memoryExportMarkdownCommand(
  outputPath?: string,
  options: { vault?: string } = {}
): void {
  const { vault, pool, blackboard } = getMemoryContext(options.vault);
  const memData = vault.readSharedMemory();
  const servers = vault.readMcpServers();
  const skills = vault.readSkills();

  const report = blackboard.generateMarkdownReport({
    scratchpads: memData.scratchpads,
    mcpServers: Object.keys(servers),
    skills: skills.map((s) => s.name),
  });

  const target = outputPath || path.join(vault.getPath(), 'MEMORY.md');
  const dir = path.dirname(path.resolve(target));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(target, report, 'utf8');

  logger.success(`Exported complete memory to Markdown file: ${pc.bold(pc.cyan(target))}`);
  console.log(pc.dim(`Includes ${Object.keys(pool.getAllEntries()).length} shared entries, blackboard state & agent scratchpads.`));
}

export function memoryProjectInitCommand(
  targetDir?: string,
  options: { name?: string; noRules?: boolean } = {}
): void {
  const dir = targetDir || process.cwd();
  const mgr = new ProjectMemoryManager(dir);
  const filePath = mgr.initProject(options.name, !options.noRules);

  logger.success(`Initialized Project Memory in: ${pc.bold(pc.cyan(filePath))}`);
  console.log(pc.dim('Injected mandatory reading rules into .cursorrules, CLAUDE.md, .windsurfrules, and .opencode/rules/'));
  console.log(pc.green('All agents will now read AGENT_MEMORY.md before starting work!'));
}

export function memoryProjectLogCommand(
  summary: string,
  targetDir?: string,
  options: { agent?: string; files?: string; decisions?: string } = {}
): void {
  const dir = targetDir || process.cwd();
  const mgr = new ProjectMemoryManager(dir);
  const agent = options.agent || 'agent';
  const files = options.files ? options.files.split(',').map((s) => s.trim()) : undefined;

  mgr.recordAction({
    timestamp: new Date().toISOString(),
    agent,
    summary,
    filesTouched: files,
    keyDecisions: options.decisions,
  });

  logger.success(`Logged action by @${pc.magenta(agent)} into: ${pc.bold(pc.cyan(mgr.getMemoryFilePath()))}`);
}

export function memoryProjectReadCommand(targetDir?: string): void {
  const dir = targetDir || process.cwd();
  const mgr = new ProjectMemoryManager(dir);
  const content = mgr.readMemory();

  logger.header(`Project Memory: ${pc.cyan(mgr.getMemoryFilePath())}`);
  console.log(content);
  logger.divider();
}

export function memoryDirectiveCommand(options: {
  inject?: boolean;
  project?: string;
  vault?: string;
}): void {
  const targetDir = options.project || process.cwd();
  const projectName = path.basename(path.resolve(targetDir));
  const directive = getProjectAgentDirective(projectName);

  logger.header(`${projectName} 專案 Agent 開工核心準則 (${projectName} Directive)`);
  console.log(pc.cyan(directive));
  logger.divider();

  const { vault, pool, blackboard } = getMemoryContext(options.vault);

  // Write to shared memory pool under research/project_directive
  try {
    pool.write('system', 'research', `${projectName.toLowerCase()}_directive`, directive);
    vault.writeSharedMemory(pool.exportData());
    vault.writeBlackboard(blackboard.getState());
    logger.success(`Saved ${projectName} directive into Shared Memory pool: [research/${projectName.toLowerCase()}_directive]`);
  } catch {
    // ignore
  }

  if (options.inject) {
    const mgr = new ProjectMemoryManager(targetDir);
    const res = mgr.injectProjectDirective(projectName);
    logger.success(`Injected ${projectName} Directive into ${res.injected.length} rule files in: ${pc.bold(pc.cyan(targetDir))}`);
    console.log(pc.dim(`Files updated: ${res.injected.join(', ')}`));
  }
}

export function memoryPromptFocusinCommand(options: {
  inject?: boolean;
  project?: string;
  vault?: string;
}): void {
  memoryDirectiveCommand(options);
}

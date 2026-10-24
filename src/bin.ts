#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { exportCommand } from './commands/export.js';
import { applyCommand } from './commands/apply.js';
import { syncCommand } from './commands/sync.js';
import { statusCommand } from './commands/status.js';
import { diffCommand } from './commands/diff.js';
import { mcpListCommand, mcpAddCommand, mcpRemoveCommand } from './commands/mcp.js';
import { skillListCommand, skillAddCommand, skillRemoveCommand } from './commands/skill.js';
import {
  memoryListCommand,
  memoryReadCommand,
  memoryWriteCommand,
  memoryScratchpadCommand,
  memoryBlackboardCommand,
  memoryAssembleCommand,
  memoryConflictsCommand,
  memoryHistoryCommand,
  memoryAclCommand,
  memoryExportMarkdownCommand,
  memoryProjectInitCommand,
  memoryProjectLogCommand,
  memoryProjectReadCommand,
  memoryPromptFocusinCommand,
} from './commands/memory.js';
import { sync_all_resources } from './sync/sync_manager.js';
import { SyncDaemon } from './sync/daemon.js';
import { logger } from './utils/logger.js';
import pc from 'picocolors';

const program = new Command();

program
  .name('skillmcpsync')
  .description('Multi-machine, multi-agent synchronization for MCP servers, skills, and tools via Git')
  .version('1.0.0');

// init
program
  .command('init')
  .description('Initialize synchronization vault and detect local agents')
  .option('-r, --repo <url>', 'Git remote repository URL')
  .option('-v, --vault <path>', 'Custom local vault directory path')
  .option('-b, --branch <branch>', 'Git branch name (default: main)')
  .option('--local', 'Use local-only Git repository without remote')
  .action(async (opts) => {
    await initCommand(opts);
  });

// export
program
  .command('export')
  .description('Export local tools, skills, and MCP servers into the canonical vault')
  .option('-a, --agents <agents>', 'Comma-separated list of agents (e.g. opencode,cursor)')
  .option('-v, --vault <path>', 'Custom local vault directory path')
  .option('--skip-secrets', 'Do not tokenize secret keys into ${VARIABLES}')
  .action(async (opts) => {
    const agents = opts.agents ? opts.agents.split(',').map((s: string) => s.trim()) : undefined;
    await exportCommand({ ...opts, agents });
  });

// apply
program
  .command('apply')
  .description('Apply canonical vault configuration to local coding agents')
  .option('-a, --agents <agents>', 'Comma-separated list of agents to update')
  .option('-v, --vault <path>', 'Custom local vault directory path')
  .option('--no-backup', 'Disable automatic creation of .bak backups')
  .option('--dry-run', 'Preview changes without modifying agent config files')
  .action(async (opts) => {
    const agents = opts.agents ? opts.agents.split(',').map((s: string) => s.trim()) : undefined;
    await applyCommand({ ...opts, agents });
  });

// sync
program
  .command('sync')
  .description('Full sync: pull remote -> export local -> sync shared memory -> apply unified -> push changes')
  .option('-m, --message <msg>', 'Custom git commit message')
  .option('-a, --agents <agents>', 'Comma-separated list of agents to sync')
  .option('-v, --vault <path>', 'Custom local vault directory path')
  .option('-s, --strategy <strategy>', 'Conflict resolution strategy for shared memory (last_write_wins, version_check, priority, merge)')
  .option('--no-push', 'Do not push commits to remote Git server')
  .option('--no-pull', 'Do not pull commits from remote Git server')
  .action(async (opts) => {
    const agents = opts.agents ? opts.agents.split(',').map((s: string) => s.trim()) : undefined;
    await syncCommand({ ...opts, agents, conflictStrategy: opts.strategy });
  });

// status
program
  .command('status')
  .description('Show status dashboard of vault, git repository, local agents, and drift')
  .option('-v, --vault <path>', 'Custom local vault directory path')
  .action(async (opts) => {
    await statusCommand(opts);
  });

// diff
program
  .command('diff')
  .description('Show detailed differences between vault and local agent configs')
  .option('-a, --agent <agent>', 'Filter diff by specific agent')
  .option('-v, --vault <path>', 'Custom local vault directory path')
  .action(async (opts) => {
    await diffCommand(opts);
  });

// mcp subcommands
const mcpCmd = program.command('mcp').description('Manage MCP servers in vault');

mcpCmd
  .command('list')
  .description('List all MCP servers defined in vault')
  .option('-v, --vault <path>', 'Custom local vault directory path')
  .action((opts) => {
    mcpListCommand(opts);
  });

mcpCmd
  .command('add <name>')
  .description('Add or update an MCP server in the vault')
  .option('-c, --command <cmd>', 'Command executable (e.g. npx)')
  .option('--args <args>', 'Arguments string (e.g. "-y @modelcontextprotocol/server-github")')
  .option('-u, --url <url>', 'Remote SSE/HTTP MCP server URL')
  .option('-d, --description <desc>', 'Server description')
  .option('-e, --env <pair...>', 'Environment variables (e.g. -e API_KEY=${MY_KEY})')
  .option('-v, --vault <path>', 'Custom local vault directory path')
  .action((name, opts) => {
    mcpAddCommand(name, opts);
  });

mcpCmd
  .command('remove <name>')
  .description('Remove an MCP server from the vault')
  .option('-v, --vault <path>', 'Custom local vault directory path')
  .action((name, opts) => {
    mcpRemoveCommand(name, opts);
  });

// skill subcommands
const skillCmd = program.command('skill').description('Manage skills in vault');

skillCmd
  .command('list')
  .description('List all skills defined in vault')
  .option('-v, --vault <path>', 'Custom local vault directory path')
  .action((opts) => {
    skillListCommand(opts);
  });

skillCmd
  .command('add <path>')
  .description('Import an existing skill folder or markdown file into the vault')
  .option('-n, --name <name>', 'Custom skill name')
  .option('-v, --vault <path>', 'Custom local vault directory path')
  .action((path, opts) => {
    skillAddCommand(path, opts);
  });

skillCmd
  .command('remove <name>')
  .description('Remove a skill from the vault')
  .option('-v, --vault <path>', 'Custom local vault directory path')
  .action((name, opts) => {
    skillRemoveCommand(name, opts);
  });

// memory subcommands (Multi-Agent Shared Memory, Scratchpads & Blackboard)
const memoryCmd = program.command('memory').description('Manage multi-agent shared memory, scratchpads & blackboard');

memoryCmd
  .command('list [namespace]')
  .description('List shared memory entries grouped by namespace')
  .option('-v, --vault <path>', 'Custom local vault directory path')
  .action((namespace, opts) => {
    memoryListCommand({ ...opts, namespace });
  });

memoryCmd
  .command('read <namespace> [key]')
  .description('Read entry or entries from a namespace')
  .option('-a, --agent <agent>', 'Agent identity for ACL checks (default: reviewer)')
  .option('-v, --vault <path>', 'Custom local vault directory path')
  .action((namespace, key, opts) => {
    memoryReadCommand(namespace, key, opts);
  });

memoryCmd
  .command('write <namespace> <key> <value>')
  .description('Write an entry to shared memory')
  .option('-a, --agent <agent>', 'Author agent identity (default: coder)')
  .option('-s, --strategy <strategy>', 'Conflict strategy: last_write_wins, version_check, priority, merge')
  .option('--version <expectedVersion>', 'Expected version for optimistic locking')
  .option('-v, --vault <path>', 'Custom local vault directory path')
  .action((namespace, key, value, opts) => {
    memoryWriteCommand(namespace, key, value, opts);
  });

memoryCmd
  .command('scratchpad <agent>')
  .description('View or update an agent\'s private scratchpad')
  .option('-t, --think <thought>', 'Record private reasoning note to scratchpad')
  .option('--clear', 'Clear agent scratchpad')
  .option('-v, --vault <path>', 'Custom local vault directory path')
  .action((agent, opts) => {
    memoryScratchpadCommand(agent, opts);
  });

memoryCmd
  .command('blackboard')
  .description('View the aggregated blackboard summarizing all agent contributions')
  .option('-a, --agent <agent>', 'Filter view to agent\'s permissions')
  .option('-v, --vault <path>', 'Custom local vault directory path')
  .action((opts) => {
    memoryBlackboardCommand(opts);
  });

memoryCmd
  .command('assemble')
  .description('Assemble partial agent contributions into a unified solution document')
  .option('-a, --agent <agent>', 'Author agent identity (default: reviewer)')
  .option('-v, --vault <path>', 'Custom local vault directory path')
  .action((opts) => {
    memoryAssembleCommand(opts);
  });

memoryCmd
  .command('conflicts')
  .description('List write conflicts and resolution history')
  .option('-v, --vault <path>', 'Custom local vault directory path')
  .action((opts) => {
    memoryConflictsCommand(opts);
  });

memoryCmd
  .command('history')
  .description('View shared memory operation audit trail')
  .option('-v, --vault <path>', 'Custom local vault directory path')
  .action((opts) => {
    memoryHistoryCommand(opts);
  });

memoryCmd
  .command('acl')
  .description('View or modify access control layer permissions')
  .option('--grant', 'Grant a permission')
  .option('-a, --agent <agent>', 'Agent identity to grant permission to')
  .option('-n, --namespace <namespace>', 'Namespace to grant permission on')
  .option('-p, --perm <permission>', 'Permission level: read, write, read_write, none')
  .option('-v, --vault <path>', 'Custom local vault directory path')
  .action((opts) => {
    memoryAclCommand(opts);
  });

memoryCmd
  .command('export-md [outputPath]')
  .description('Export complete multi-agent memory and blackboard to a Markdown (.md) file')
  .option('-v, --vault <path>', 'Custom local vault directory path')
  .action((outputPath, opts) => {
    memoryExportMarkdownCommand(outputPath, opts);
  });

// project memory subcommands (in-project AGENT_MEMORY.md with OpenMemory cognitive sectors)
const projectMemCmd = memoryCmd
  .command('project')
  .description('Manage in-project AGENT_MEMORY.md and inject mandatory agent rules');

projectMemCmd
  .command('init [path]')
  .description('Initialize AGENT_MEMORY.md in a project folder and inject agent rules')
  .option('-n, --name <name>', 'Project name')
  .option('--no-rules', 'Do not inject rules into .cursorrules, CLAUDE.md, etc.')
  .action((targetPath, opts) => {
    memoryProjectInitCommand(targetPath, opts);
  });

projectMemCmd
  .command('log <summary> [path]')
  .description('Log what an agent just completed into the project AGENT_MEMORY.md')
  .option('-a, --agent <name>', 'Agent name (e.g. claude, opencode, cursor)')
  .option('-f, --files <files>', 'Comma-separated files touched')
  .option('-d, --decisions <decisions>', 'Key decisions or architectural choices')
  .action((summary, targetPath, opts) => {
    memoryProjectLogCommand(summary, targetPath, opts);
  });

projectMemCmd
  .command('read [path]')
  .description('Display the project AGENT_MEMORY.md file')
  .action((targetPath) => {
    memoryProjectReadCommand(targetPath);
  });

// prompt (FocusIn directive & guidelines)
memoryCmd
  .command('focusin')
  .description('Display FocusIn agent directive, save to shared memory, or inject into project')
  .option('-i, --inject', 'Inject directive into CLAUDE.md, .cursorrules, .windsurfrules, etc.')
  .option('-p, --project <path>', 'Target project directory (default: current directory)')
  .option('-v, --vault <path>', 'Custom local vault directory path')
  .action((opts) => {
    memoryPromptFocusinCommand(opts);
  });

// reconcile (auto-sync tool across remote/local servers with file-lock safety)
program
  .command('reconcile')
  .description('Auto-sync engine: aggregate, dedup, namespace, and reconcile tools, skills & memory')
  .option('-v, --vault <path>', 'Custom local vault directory path')
  .option('--no-namespace', 'Do not namespace colliding tools (latest timestamp wins)')
  .option('--dry-run', 'Preview changes without modifying vault or agent configs')
  .action(async (opts) => {
    logger.header('Auto-Sync Engine (Reconcile All Resources)');
    const res = await sync_all_resources({
      vaultPath: opts.vault,
      namespaceDuplicates: opts.namespace !== false,
      dryRun: opts.dryRun,
    });
    if (res.success) {
      logger.success(`Reconciliation complete in ${res.durationMs}ms:`);
      console.log(`  • MCP Servers:   ${pc.bold(res.mcpServersDiscovered.toString())}`);
      console.log(`  • Tools Synced:  ${pc.bold(res.toolsAggregated.toString())}`);
      console.log(`  • Skills Synced: ${pc.bold(res.skillsSynced.toString())}`);
      console.log(`  • Memory Synced: ${pc.bold(res.memoryEntriesSynced.toString())}`);
      if (res.conflictsResolved > 0) {
        console.log(`  • Conflicts:     ${pc.yellow(res.conflictsResolved.toString())} resolved/namespaced`);
      }
    } else {
      logger.error('Reconciliation encountered errors:');
      for (const e of res.errors) console.log(`  - ${pc.red(e)}`);
    }
  });

// daemon (background service for macOS UI & live node synchronization)
program
  .command('daemon')
  .description('Start background sync daemon for macOS desktop UI & remote sync')
  .option('-p, --port <port>', 'Daemon port (default: 4949)')
  .option('-v, --vault <path>', 'Custom local vault directory path')
  .action(async (opts) => {
    const port = opts.port ? parseInt(opts.port, 10) : 4949;
    const daemon = new SyncDaemon({ port, vaultPath: opts.vault });
    await daemon.start();
    logger.header(`Sync Daemon running on http://127.0.0.1:${port}`);
    console.log(pc.dim('Connected to macOS desktop management UI. Press Ctrl+C to stop.'));
    // Keep alive
    process.on('SIGINT', async () => {
      await daemon.stop();
      process.exit(0);
    });
  });

program.parse(process.argv);

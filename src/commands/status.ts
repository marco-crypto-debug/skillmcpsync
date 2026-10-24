import { loadConfig } from '../core/config.js';
import { VaultManager } from '../core/vault.js';
import { GitManager } from '../core/git.js';
import { SecretManager } from '../core/secrets.js';
import { AdapterRegistry } from '../adapters/registry.js';
import { logger } from '../utils/logger.js';
import pc from 'picocolors';

export interface StatusOptions {
  vault?: string;
}

export async function statusCommand(options: StatusOptions): Promise<void> {
  const config = loadConfig();
  const vaultPath = options.vault || config.vaultPath;
  const vault = new VaultManager(vaultPath);

  logger.header('skillmcpsync Status Dashboard');

  // 1. Vault & Git Status
  console.log(pc.bold('Vault Location: ') + pc.cyan(vaultPath));

  const isGit = GitManager.isGitRepo(vaultPath);
  if (isGit) {
    const gitStatus = GitManager.status(vaultPath);
    const remote = gitStatus.remote || 'None (local only)';
    console.log(pc.bold('Git Branch:     ') + pc.yellow(gitStatus.branch));
    console.log(pc.bold('Git Remote:     ') + pc.dim(remote));

    let stateStr = gitStatus.isClean ? pc.green('Clean') : pc.yellow('Modified changes present');
    if (gitStatus.ahead > 0) stateStr += pc.cyan(` (${gitStatus.ahead} ahead)`);
    if (gitStatus.behind > 0) stateStr += pc.magenta(` (${gitStatus.behind} behind)`);
    console.log(pc.bold('Repo State:     ') + stateStr);
  } else {
    console.log(pc.bold('Git Status:     ') + pc.yellow('Not a git repository (run `skillmcpsync init`)'));
  }

  logger.divider();

  // 2. Vault Content Inventory
  const servers = vault.readMcpServers();
  const skills = vault.readSkills();
  const rules = vault.readRules();

  console.log(pc.bold('Vault Inventory:'));
  console.log(`  • MCP Servers (${Object.keys(servers).length}):`);
  if (Object.keys(servers).length === 0) {
    console.log(pc.dim('    (None)'));
  } else {
    for (const [name, s] of Object.entries(servers)) {
      const typeStr = s.type === 'remote' ? pc.magenta('[remote]') : pc.blue('[stdio]');
      const statusStr = s.enabled !== false ? pc.green('enabled') : pc.dim('disabled');
      const desc = s.description ? pc.dim(` - ${s.description}`) : '';
      console.log(`    - ${pc.bold(name)} ${typeStr} (${statusStr})${desc}`);
    }
  }

  console.log(`  • Skills (${skills.length}):`);
  if (skills.length === 0) {
    console.log(pc.dim('    (None)'));
  } else {
    for (const s of skills) {
      console.log(`    - ${pc.bold(s.name)}`);
    }
  }

  console.log(`  • Rules (${rules.length}):`);
  if (rules.length === 0) {
    console.log(pc.dim('    (None)'));
  } else {
    for (const r of rules) {
      console.log(`    - ${pc.bold(r.name)}`);
    }
  }

  // 2b. Multi-Agent Shared Memory & Blackboard
  const memData = vault.readSharedMemory();
  const memoryEntries = Object.values(memData.entries || {});
  const namespaces = Array.from(new Set(memoryEntries.map((e) => e.namespace))).sort();
  console.log(`  • Multi-Agent Shared Memory (${memoryEntries.length} entries in ${namespaces.length} namespaces):`);
  if (memoryEntries.length === 0) {
    console.log(pc.dim('    (Empty pool - run `skillmcpsync memory write <ns> <key> <val>`)'));
  } else {
    for (const ns of namespaces) {
      const nsEntries = memoryEntries.filter((e) => e.namespace === ns);
      console.log(`    - [${pc.cyan(ns + '/')}] ${nsEntries.length} item(s)`);
    }
  }

  const conflicts = memData.conflicts || [];
  if (conflicts.length > 0) {
    console.log(`  • Conflict Events Logged: ${pc.yellow(conflicts.length.toString())}`);
  }

  const blackboard = vault.readBlackboard();
  if (blackboard.assembledSolution) {
    console.log(`  • Blackboard: ${pc.green('Assembled solution present')}`);
  }

  logger.divider();

  // 3. Local Agents & Drift
  console.log(pc.bold('Local Coding Agents:'));
  const allAdapters = AdapterRegistry.getAll();
  const vaultServerNames = new Set(Object.keys(servers));

  for (const adapter of allAdapters) {
    const status = adapter.getStatus();
    const installedBadge = status.installed ? pc.green('✔ Installed') : pc.dim('✖ Not detected');
    console.log(`\n  ${pc.bold(pc.cyan(adapter.name))} [${installedBadge}]`);
    console.log(`    Config: ${pc.dim(status.configPath)}`);

    if (status.installed) {
      console.log(`    Synced: ${status.mcpCount} MCP server(s), ${status.skillCount} skill(s)`);

      // Check drift
      try {
        const localServers = adapter.readMcpServers();
        const localServerNames = new Set(Object.keys(localServers));

        const missingInAgent = Array.from(vaultServerNames).filter((n) => !localServerNames.has(n));
        const missingInVault = Array.from(localServerNames).filter((n) => !vaultServerNames.has(n));

        if (missingInAgent.length > 0) {
          console.log(
            `    ${pc.yellow('Drift:')} Missing ${missingInAgent.length} server(s) from vault: ${pc.yellow(
              missingInAgent.join(', ')
            )}`
          );
        }
        if (missingInVault.length > 0) {
          console.log(
            `    ${pc.blue('Local only:')} ${missingInVault.length} server(s) not in vault: ${pc.blue(
              missingInVault.join(', ')
            )}`
          );
        }
        if (missingInAgent.length === 0 && missingInVault.length === 0) {
          console.log(`    ${pc.green('Status: In sync with vault')}`);
        }
      } catch {
        // ignore
      }
    }
  }

  logger.divider();

  // 4. Required Secrets Status
  const secretManager = new SecretManager(config.envFile);
  const placeholders = secretManager.findPlaceholders({ servers, skills, rules });

  console.log(pc.bold('Environment Variables:'));
  if (placeholders.length === 0) {
    console.log(pc.dim('  No variable placeholders found in vault.'));
  } else {
    for (const p of placeholders) {
      const isSet = secretManager.getEnv(p) !== undefined;
      const statusBadge = isSet ? pc.green('✔ Set') : pc.red('✖ Missing');
      console.log(`  • ${p.padEnd(30)} ${statusBadge}`);
    }
  }

  logger.divider();
}

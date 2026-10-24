import { loadConfig } from '../core/config.js';
import { VaultManager } from '../core/vault.js';
import { AdapterRegistry } from '../adapters/registry.js';
import { logger } from '../utils/logger.js';
import pc from 'picocolors';

export interface DiffOptions {
  agent?: string;
  vault?: string;
}

export async function diffCommand(options: DiffOptions): Promise<void> {
  const config = loadConfig();
  const vaultPath = options.vault || config.vaultPath;
  const vault = new VaultManager(vaultPath);

  logger.header('Configuration Diff');

  const vaultServers = vault.readMcpServers();
  const targetAdapters = AdapterRegistry.resolve(options.agent ? [options.agent] : undefined);

  for (const adapter of targetAdapters) {
    if (!adapter.isInstalled()) continue;

    console.log(pc.bold(`\nDifferences for ${pc.cyan(adapter.name)}:`));
    let hasDiff = false;

    try {
      const agentServers = adapter.readMcpServers();
      const allNames = Array.from(
        new Set([...Object.keys(vaultServers), ...Object.keys(agentServers)])
      ).sort();

      for (const name of allNames) {
        const vServer = vaultServers[name];
        const aServer = agentServers[name];

        if (vServer && !aServer) {
          console.log(pc.green(`  + [Vault Only] ${name}`));
          console.log(pc.dim(`      command: ${vServer.command} ${(vServer.args || []).join(' ')}`));
          hasDiff = true;
        } else if (!vServer && aServer) {
          console.log(pc.red(`  - [Local Only] ${name}`));
          console.log(pc.dim(`      command: ${aServer.command} ${(aServer.args || []).join(' ')}`));
          hasDiff = true;
        } else if (vServer && aServer) {
          // Compare fields
          const vCmd = `${vServer.command || ''} ${(vServer.args || []).join(' ')}`.trim();
          const aCmd = `${aServer.command || ''} ${(aServer.args || []).join(' ')}`.trim();

          if (vCmd !== aCmd) {
            console.log(pc.yellow(`  ~ [Modified] ${name}`));
            console.log(pc.green(`      vault: ${vCmd}`));
            console.log(pc.red(`      local: ${aCmd}`));
            hasDiff = true;
          }
        }
      }
    } catch (err: any) {
      console.log(pc.red(`  Could not read config for ${adapter.name}: ${err.message}`));
    }

    if (!hasDiff) {
      console.log(pc.green('  ✔ Up to date with vault.'));
    }
  }

  logger.divider();
}

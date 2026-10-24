import { loadConfig } from '../core/config.js';
import { VaultManager } from '../core/vault.js';
import { CanonicalMcpServer } from '../core/types.js';
import { logger } from '../utils/logger.js';
import pc from 'picocolors';

export interface McpAddOptions {
  command?: string;
  args?: string;
  url?: string;
  type?: 'stdio' | 'remote';
  description?: string;
  env?: string[];
  vault?: string;
}

export function mcpListCommand(options: { vault?: string }): void {
  const config = loadConfig();
  const vaultPath = options.vault || config.vaultPath;
  const vault = new VaultManager(vaultPath);

  const servers = vault.readMcpServers();
  const count = Object.keys(servers).length;

  logger.header(`MCP Servers in Vault (${count})`);
  if (count === 0) {
    logger.info('No MCP servers defined in vault.');
    return;
  }

  for (const [name, s] of Object.entries(servers)) {
    const typeBadge = s.type === 'remote' ? pc.magenta('[remote]') : pc.blue('[stdio]');
    const statusBadge = s.enabled !== false ? pc.green('enabled') : pc.dim('disabled');
    console.log(`\n• ${pc.bold(name)} ${typeBadge} (${statusBadge})`);
    if (s.command) {
      console.log(`  command : ${pc.cyan(s.command)} ${(s.args || []).join(' ')}`);
    }
    if (s.url) {
      console.log(`  url     : ${pc.cyan(s.url)}`);
    }
    if (s.description) {
      console.log(`  desc    : ${pc.dim(s.description)}`);
    }
    if (s.env && Object.keys(s.env).length > 0) {
      console.log(`  env     : ${JSON.stringify(s.env)}`);
    }
  }
  logger.divider();
}

export function mcpAddCommand(name: string, options: McpAddOptions): void {
  const config = loadConfig();
  const vaultPath = options.vault || config.vaultPath;
  const vault = new VaultManager(vaultPath);

  const servers = vault.readMcpServers();

  let argsList: string[] = [];
  if (options.args) {
    argsList = options.args.split(/\s+/).filter(Boolean);
  }

  const envObj: Record<string, string> = {};
  if (options.env) {
    for (const item of options.env) {
      const idx = item.indexOf('=');
      if (idx !== -1) {
        envObj[item.slice(0, idx).trim()] = item.slice(idx + 1).trim();
      }
    }
  }

  const server: CanonicalMcpServer = {
    name,
    type: options.url ? 'remote' : options.type || 'stdio',
    command: options.command,
    args: argsList.length > 0 ? argsList : undefined,
    url: options.url,
    description: options.description,
    env: Object.keys(envObj).length > 0 ? envObj : undefined,
    enabled: true,
  };

  servers[name] = server;
  vault.writeMcpServers(servers);

  logger.success(`Added MCP server '${pc.bold(name)}' to vault.`);
  console.log(pc.dim('Run `skillmcpsync apply` or `skillmcpsync sync` to distribute.'));
}

export function mcpRemoveCommand(name: string, options: { vault?: string }): void {
  const config = loadConfig();
  const vaultPath = options.vault || config.vaultPath;
  const vault = new VaultManager(vaultPath);

  const servers = vault.readMcpServers();
  if (!servers[name]) {
    logger.warn(`Server '${name}' not found in vault.`);
    return;
  }

  delete servers[name];
  vault.writeMcpServers(servers);
  logger.success(`Removed MCP server '${pc.bold(name)}' from vault.`);
}

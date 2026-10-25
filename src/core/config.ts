import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ToolConfig } from './types.js';
import { parseJsonSafe, stringifyJson } from '../utils/json.js';

export function getConfigDir(): string {
  const xdgConfig = process.env.XDG_CONFIG_HOME;
  if (xdgConfig) {
    return path.join(xdgConfig, 'skillmcpsync');
  }
  return path.join(os.homedir(), '.config', 'skillmcpsync');
}

export function getConfigPath(): string {
  return path.join(getConfigDir(), 'config.json');
}

export function getDefaultVaultPath(): string {
  return path.join(os.homedir(), 'AgentHub');
}

export function getDefaultEnvPath(): string {
  return path.join(getConfigDir(), '.env');
}

export function getDefaultConfig(): ToolConfig {
  return {
    vaultPath: getDefaultVaultPath(),
    branch: 'main',
    enabledAgents: ['opencode', 'claude_desktop', 'claude_code', 'cursor', 'windsurf'],
    autoBackup: true,
    envFile: getDefaultEnvPath(),
  };
}

export function ensureConfigDirs(): void {
  const dir = getConfigDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function loadConfig(): ToolConfig {
  ensureConfigDirs();
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) {
    const defaults = getDefaultConfig();
    saveConfig(defaults);
    return defaults;
  }

  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = parseJsonSafe<Partial<ToolConfig>>(raw, {});
    return {
      ...getDefaultConfig(),
      ...parsed,
    };
  } catch {
    return getDefaultConfig();
  }
}

export function saveConfig(config: ToolConfig): void {
  ensureConfigDirs();
  const configPath = getConfigPath();
  fs.writeFileSync(configPath, stringifyJson(config), 'utf8');
}

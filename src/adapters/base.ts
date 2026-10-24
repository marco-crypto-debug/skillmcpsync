import { CanonicalMcpServer, CanonicalSkill, CanonicalRule, AgentStatus } from '../core/types.js';

export interface WriteOptions {
  backup?: boolean;
  merge?: boolean; // if true, merges with existing instead of replacing
}

export abstract class AgentAdapter {
  abstract readonly id: string;
  abstract readonly name: string;

  abstract isInstalled(): boolean;
  abstract getConfigPath(): string;
  abstract getStatus(): AgentStatus;

  abstract readMcpServers(): Record<string, CanonicalMcpServer>;
  abstract writeMcpServers(
    servers: Record<string, CanonicalMcpServer>,
    options?: WriteOptions
  ): void;

  readSkills?(): CanonicalSkill[];
  writeSkills?(skills: CanonicalSkill[], options?: WriteOptions): void;

  readRules?(): CanonicalRule[];
  writeRules?(rules: CanonicalRule[], options?: WriteOptions): void;
}

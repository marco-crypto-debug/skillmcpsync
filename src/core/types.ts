export type McpServerType = 'stdio' | 'sse' | 'http' | 'local' | 'remote';

export interface CanonicalMcpServer {
  name: string;
  type?: McpServerType;
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  headers?: Record<string, string>;
  enabled?: boolean;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface CanonicalSkill {
  name: string;
  description?: string;
  content: string; // SKILL.md body
  files?: Record<string, string>; // Subfiles (relative path -> text content)
}

export interface CanonicalRule {
  name: string;
  description?: string;
  content: string;
}

export interface VaultManifest {
  version: string;
  updatedAt: string;
  updatedBy?: string;
  mcpServers?: Record<string, { enabled?: boolean; description?: string }>;
  skills?: Record<string, { description?: string }>;
  rules?: Record<string, { description?: string }>;
}

export interface ToolConfig {
  repoUrl?: string;
  vaultPath: string;
  branch: string;
  enabledAgents: string[];
  autoBackup: boolean;
  envFile: string;
}

export interface AgentStatus {
  id: string;
  name: string;
  installed: boolean;
  configPath: string;
  skillsPath?: string;
  rulesPath?: string;
  mcpCount: number;
  skillCount: number;
  ruleCount: number;
}

export type Permission = 'read' | 'write' | 'read_write' | 'none';

export interface MemoryEntry {
  namespace: string;       // Logical partition, e.g. "research", "code", "review"
  key: string;             // Identifier within namespace
  value: string;           // Stored content / artifact / partial solution
  author: string;          // Agent identifier who wrote this entry
  version: number;         // Increments on each update
  timestamp: number;       // Epoch milliseconds of creation / update
  metadata?: Record<string, unknown>;
}

export type ConflictStrategy = 'last_write_wins' | 'version_check' | 'priority' | 'merge';

export interface ConflictRecord {
  namespace: string;
  key: string;
  incomingAuthor: string;
  existingAuthor: string;
  incomingVersion?: number;
  existingVersion: number;
  strategy: ConflictStrategy;
  resolution: 'overwritten' | 'rejected' | 'merged';
  timestamp: number;
  details?: string;
}

export interface AuditLogEntry {
  action: 'write' | 'delete' | 'conflict_resolved' | 'assembled';
  agent: string;
  key: string;
  version?: number;
  timestamp: number;
  detail?: string;
}

export interface SharedMemoryData {
  version: string;
  updatedAt: string;
  entries: Record<string, MemoryEntry>; // Key format: `${namespace}/${key}`
  history: AuditLogEntry[];
  conflicts: ConflictRecord[];
  scratchpads?: Record<string, string[]>; // agentId -> private scratchpad notes
}

export interface BlackboardState {
  version: string;
  updatedAt: string;
  assembledSolution?: string;
  namespaceSummaries: Record<string, number>;
  lastUpdatedBy?: string;
}

export type MemorySector = 'episodic' | 'semantic' | 'procedural' | 'reflective';

export interface ProjectActionRecord {
  timestamp: string;
  agent: string;
  summary: string;
  filesTouched?: string[];
  keyDecisions?: string;
}

export interface ProjectMemoryConfig {
  projectPath: string;
  projectName?: string;
  memoryFilename?: string; // defaults to 'AGENT_MEMORY.md'
  injectRules?: boolean;
}



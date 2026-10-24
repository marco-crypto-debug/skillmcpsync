import { CanonicalMcpServer, CanonicalSkill, MemoryEntry, ConflictStrategy } from '../core/types.js';

export type ServerTransport = 'stdio' | 'sse' | 'http';

export interface RemoteNodeConfig {
  id: string;                      // Unique identifier, e.g. "cloud-vps-1", "dev-server"
  name: string;
  endpointUrl: string;             // HTTP/SSE base URL or daemon URL
  apiKey?: string;
  enabled: boolean;
  lastSeen?: number;
  status: 'healthy' | 'unreachable' | 'degraded' | 'unknown';
  latencyMs?: number;
}

export interface DiscoveredToolSchema {
  name: string;
  originServer: string;            // e.g. "github-mcp", "serverA"
  namespacedName: string;          // e.g. "serverA:read_issue"
  description?: string;
  inputSchema?: Record<string, unknown>;
  transport: ServerTransport;
  enabled: boolean;
  version?: string;
  updatedAt: number;
}

export interface DiscoveredSkill {
  name: string;
  originServer: string;            // e.g. "local", "serverA"
  namespacedName: string;          // e.g. "serverA:review_pr"
  description?: string;
  content: string;
  files?: Record<string, string>;
  version: number;
  updatedAt: number;
}

export interface SyncAllResourcesOptions {
  vaultPath?: string;
  remoteNodes?: RemoteNodeConfig[];
  conflictStrategy?: ConflictStrategy;
  namespaceDuplicates?: boolean;   // default: true
  dryRun?: boolean;
  broadcastToRemote?: boolean;
}

export interface SyncResult {
  timestamp: number;
  durationMs: number;
  success: boolean;
  mcpServersDiscovered: number;
  toolsAggregated: number;
  skillsSynced: number;
  memoryEntriesSynced: number;
  conflictsResolved: number;
  nodesUpdated: string[];
  errors: string[];
  memoryMarkdownPath?: string;
  memoryMarkdownContent?: string;
  details: {
    tools: DiscoveredToolSchema[];
    skills: DiscoveredSkill[];
    namespacedAliases: Record<string, string>; // original -> namespaced
  };
}

import path from 'node:path';
import { loadConfig } from '../core/config.js';
import { VaultManager } from '../core/vault.js';
import { AccessControl, SharedMemoryPool, Blackboard } from '../core/memory.js';
import { AdapterRegistry } from '../adapters/registry.js';
import { CanonicalMcpServer, CanonicalSkill } from '../core/types.js';
import { DiscoveryEngine } from './discovery.js';
import { FileLock } from './file_lock.js';
import {
  DiscoveredToolSchema,
  DiscoveredSkill,
  RemoteNodeConfig,
  SyncAllResourcesOptions,
  SyncResult,
} from './types.js';

/**
 * SyncManager orchestrates cross-server, cross-agent reconciliation of
 * MCP servers, tools, skills, and shared memory with concurrency safety.
 */
export class SyncManager {
  private vaultPath: string;
  private vault: VaultManager;
  private discovery: DiscoveryEngine;

  constructor(vaultPath?: string) {
    const config = loadConfig();
    this.vaultPath = vaultPath || config.vaultPath;
    this.vault = new VaultManager(this.vaultPath);
    this.vault.ensureStructure();
    this.discovery = new DiscoveryEngine(this.vault);
  }

  getVault(): VaultManager {
    return this.vault;
  }

  getDiscovery(): DiscoveryEngine {
    return this.discovery;
  }

  /**
   * Introspect all resources across the vault, local coding agents, and remote nodes.
   */
  async introspectAll(remoteNodes: RemoteNodeConfig[] = []): Promise<{
    servers: Record<string, CanonicalMcpServer>;
    tools: DiscoveredToolSchema[];
    skills: DiscoveredSkill[];
    remoteHealth: Record<string, boolean>;
  }> {
    const servers = this.vault.readMcpServers();

    // Auto-discover MCP servers from all locally installed coding agents
    const activeAdapters = AdapterRegistry.getAll().filter((a) => a.isInstalled());
    for (const adapter of activeAdapters) {
      try {
        const agentServers = adapter.readMcpServers();
        for (const [name, s] of Object.entries(agentServers)) {
          if (!servers[name]) {
            servers[name] = s;
          }
        }
      } catch {
        // ignore read failure
      }
    }

    const tools = this.discovery.introspectTools('local', servers);
    const skills = this.discovery.introspectSkills('local');
    const remoteHealth: Record<string, boolean> = {};

    // Introspect active remote nodes if supplied
    for (const node of remoteNodes) {
      if (!node.enabled) continue;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(`${node.endpointUrl}/api/introspect`, {
          headers: node.apiKey ? { Authorization: `Bearer ${node.apiKey}` } : {},
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          remoteHealth[node.id] = true;
          const remoteData = (await res.json()) as {
            tools?: DiscoveredToolSchema[];
            skills?: DiscoveredSkill[];
            servers?: Record<string, CanonicalMcpServer>;
          };

          if (remoteData.tools) {
            for (const t of remoteData.tools) {
              tools.push({
                ...t,
                originServer: node.id,
                namespacedName: `${node.id}:${t.name}`,
              });
            }
          }

          if (remoteData.skills) {
            for (const s of remoteData.skills) {
              skills.push({
                ...s,
                originServer: node.id,
                namespacedName: `${node.id}:${s.name}`,
              });
            }
          }
        } else {
          remoteHealth[node.id] = false;
        }
      } catch {
        remoteHealth[node.id] = false;
      }
    }

    return { servers, tools, skills, remoteHealth };
  }

  /**
   * Reconcile and deduplicate tools and skills, namespacing colliding entries
   * and resolving version / timestamp conflicts.
   */
  reconcileAndDedup(
    tools: DiscoveredToolSchema[],
    skills: DiscoveredSkill[],
    namespaceDuplicates = true
  ): {
    reconciledTools: DiscoveredToolSchema[];
    reconciledSkills: CanonicalSkill[];
    namespacedAliases: Record<string, string>;
    conflictCount: number;
  } {
    const namespacedAliases: Record<string, string> = {};
    let conflictCount = 0;

    // 1. Deduplicate & Namespace Tools
    const toolBuckets: Record<string, DiscoveredToolSchema[]> = {};
    for (const tool of tools) {
      if (!toolBuckets[tool.name]) {
        toolBuckets[tool.name] = [];
      }
      toolBuckets[tool.name].push(tool);
    }

    const reconciledTools: DiscoveredToolSchema[] = [];
    for (const [name, list] of Object.entries(toolBuckets)) {
      if (list.length === 1) {
        reconciledTools.push(list[0]);
      } else {
        conflictCount += list.length - 1;
        if (namespaceDuplicates) {
          // Namespace duplicate tools by server origin
          for (const item of list) {
            const alias = `${item.originServer}:${item.name}`;
            namespacedAliases[`${item.originServer}/${item.name}`] = alias;
            reconciledTools.push({
              ...item,
              namespacedName: alias,
            });
          }
        } else {
          // Latest timestamp wins
          list.sort((a, b) => b.updatedAt - a.updatedAt);
          reconciledTools.push(list[0]);
        }
      }
    }

    // 2. Deduplicate & Namespace Skills
    const skillBuckets: Record<string, DiscoveredSkill[]> = {};
    for (const skill of skills) {
      if (!skillBuckets[skill.name]) {
        skillBuckets[skill.name] = [];
      }
      skillBuckets[skill.name].push(skill);
    }

    const reconciledSkills: CanonicalSkill[] = [];
    for (const [name, list] of Object.entries(skillBuckets)) {
      if (list.length === 1) {
        reconciledSkills.push({
          name: list[0].name,
          description: list[0].description,
          content: list[0].content,
          files: list[0].files,
        });
      } else {
        conflictCount += list.length - 1;
        if (namespaceDuplicates) {
          for (const s of list) {
            const namespacedSkillName = `${s.originServer}_${s.name}`;
            namespacedAliases[`${s.originServer}/${s.name}`] = namespacedSkillName;
            reconciledSkills.push({
              name: namespacedSkillName,
              description: `[From ${s.originServer}] ${s.description || ''}`,
              content: s.content,
              files: s.files,
            });
          }
        } else {
          // Higher version wins, fallback to latest timestamp
          list.sort((a, b) => {
            if (b.version !== a.version) return b.version - a.version;
            return b.updatedAt - a.updatedAt;
          });
          const winner = list[0];
          reconciledSkills.push({
            name: winner.name,
            description: winner.description,
            content: winner.content,
            files: winner.files,
          });
        }
      }
    }

    return { reconciledTools, reconciledSkills, namespacedAliases, conflictCount };
  }

  /**
   * Broadcast newly added skills and tools to remote server nodes.
   */
  async broadcastToNodes(
    nodes: RemoteNodeConfig[],
    skills: CanonicalSkill[],
    servers: Record<string, CanonicalMcpServer>
  ): Promise<string[]> {
    const updatedNodes: string[] = [];

    for (const node of nodes) {
      if (!node.enabled) continue;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(`${node.endpointUrl}/api/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(node.apiKey ? { Authorization: `Bearer ${node.apiKey}` } : {}),
          },
          body: JSON.stringify({ skills, servers }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          updatedNodes.push(node.id);
        }
      } catch {
        // Node unreachable or timeout
      }
    }

    return updatedNodes;
  }

  /**
   * Complete automated sync cycle for MCP servers, tools, skills, and memory.
   * Uses non-blocking advisory file locking to prevent race conditions with concurrent agents.
   */
  async syncAllResources(options: SyncAllResourcesOptions = {}): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const remoteNodes = options.remoteNodes || [];
    const namespaceDuplicates = options.namespaceDuplicates ?? true;

    // Critical section file path for local synchronization
    const lockTarget = path.join(this.vaultPath, 'mcp-servers.json');

    // Safe execution guarded by FileLock
    return await FileLock.withLock(
      lockTarget,
      async () => {
        // 1. Discovery & Introspection
        const { servers, tools, skills } = await this.introspectAll(remoteNodes);

        // 2. Reconciliation & Deduplication
        const { reconciledTools, reconciledSkills, namespacedAliases, conflictCount } =
          this.reconcileAndDedup(tools, skills, namespaceDuplicates);

        if (!options.dryRun) {
          // 3. Write Reconciled MCP Servers & Skills to Local Vault
          this.vault.writeMcpServers(servers);
          this.vault.writeSkills(reconciledSkills);

          // 4. Propagate to ALL Local Installed Coding Agents
          const activeAdapters = AdapterRegistry.getAll().filter((a) => a.isInstalled());
          for (const adapter of activeAdapters) {
            try {
              if (adapter.writeSkills && reconciledSkills.length > 0) {
                adapter.writeSkills(reconciledSkills, { merge: true });
              }
              adapter.writeMcpServers(servers, { merge: true });
            } catch (err: any) {
              errors.push(`Adapter '${adapter.name}' write error: ${err.message}`);
            }
          }
        }

        // 5. Broadcast to Remote Nodes if configured
        let nodesUpdated: string[] = [];
        if (options.broadcastToRemote && remoteNodes.length > 0 && !options.dryRun) {
          nodesUpdated = await this.broadcastToNodes(remoteNodes, reconciledSkills, servers);
        }

        // 6. Synchronize Shared Memory Pool & Save MEMORY.md Report
        let memoryCount = 0;
        let memoryMarkdownPath: string | undefined;
        let memoryMarkdownContent: string | undefined;

        try {
          const rawAcl = this.vault.readAccessControl();
          const acl = Object.keys(rawAcl).length > 0
            ? new AccessControl(rawAcl)
            : AccessControl.createDefaultTeamACL();

          const memData = this.vault.readSharedMemory();
          const pool = new SharedMemoryPool(acl, options.conflictStrategy || 'last_write_wins', memData);
          const blackboard = new Blackboard(pool);

          memoryCount = Object.keys(pool.getAllEntries()).length;

          // Generate Markdown Document (.md)
          const mdReport = blackboard.generateMarkdownReport({
            scratchpads: memData.scratchpads,
            mcpServers: Object.keys(servers),
            skills: reconciledSkills.map((s) => s.name),
          });
          memoryMarkdownContent = mdReport;

          if (!options.dryRun) {
            memoryMarkdownPath = this.vault.writeMemoryMarkdown(mdReport, 'MEMORY.md');
            this.vault.writeSharedMemory(pool.exportData());
            this.vault.writeBlackboard(blackboard.getState());
          }
        } catch (err: any) {
          errors.push(`Memory sync warning: ${err.message}`);
        }

        const durationMs = Date.now() - startTime;

        return {
          timestamp: Date.now(),
          durationMs,
          success: errors.length === 0,
          mcpServersDiscovered: Object.keys(servers).length,
          toolsAggregated: reconciledTools.length,
          skillsSynced: reconciledSkills.length,
          memoryEntriesSynced: memoryCount,
          conflictsResolved: conflictCount,
          nodesUpdated,
          errors,
          memoryMarkdownPath,
          memoryMarkdownContent,
          details: {
            tools: reconciledTools,
            skills: skills,
            namespacedAliases,
          },
        };
      },
      { owner: 'sync_all_resources', timeoutMs: 6000 }
    );
  }
}

/**
 * Standalone entry point to synchronize all tools, skills, MCP servers,
 * and memory across all nodes with file-locking safety.
 */
export async function sync_all_resources(
  options?: SyncAllResourcesOptions
): Promise<SyncResult> {
  const manager = new SyncManager(options?.vaultPath);
  return await manager.syncAllResources(options);
}

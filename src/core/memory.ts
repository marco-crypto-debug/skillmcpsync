import {
  Permission,
  MemoryEntry,
  ConflictStrategy,
  ConflictRecord,
  AuditLogEntry,
  SharedMemoryData,
  BlackboardState,
} from './types.js';

/**
 * Access Control Layer
 * Manages per-agent, per-namespace permissions to enforce read and write boundaries.
 */
export class AccessControl {
  // agentId -> (namespace -> Permission)
  private permissions: Record<string, Record<string, Permission>> = {};

  constructor(initialPermissions?: Record<string, Record<string, Permission>>) {
    if (initialPermissions) {
      this.permissions = JSON.parse(JSON.stringify(initialPermissions));
    }
  }

  /**
   * Grant an agent a specific permission on a namespace.
   */
  grant(agentId: string, namespace: string, permission: Permission): void {
    if (!this.permissions[agentId]) {
      this.permissions[agentId] = {};
    }
    this.permissions[agentId][namespace] = permission;
  }

  /**
   * Revoke an agent's permission on a namespace.
   */
  revoke(agentId: string, namespace: string): void {
    if (this.permissions[agentId]) {
      delete this.permissions[agentId][namespace];
      if (Object.keys(this.permissions[agentId]).length === 0) {
        delete this.permissions[agentId];
      }
    }
  }

  /**
   * Check if an agent has permission to read from a namespace.
   */
  canRead(agentId: string, namespace: string): boolean {
    const perm = this.permissions[agentId]?.[namespace];
    // If agent has wildcard '*' permission or explicit namespace permission
    if (perm === 'read' || perm === 'read_write') {
      return true;
    }
    const wildcardPerm = this.permissions[agentId]?.['*'];
    return wildcardPerm === 'read' || wildcardPerm === 'read_write';
  }

  /**
   * Check if an agent has permission to write to a namespace.
   */
  canWrite(agentId: string, namespace: string): boolean {
    const perm = this.permissions[agentId]?.[namespace];
    if (perm === 'write' || perm === 'read_write') {
      return true;
    }
    const wildcardPerm = this.permissions[agentId]?.['*'];
    return wildcardPerm === 'write' || wildcardPerm === 'read_write';
  }

  /**
   * Get all permissions granted to an agent.
   */
  getPermissions(agentId: string): Record<string, Permission> {
    return { ...(this.permissions[agentId] || {}) };
  }

  /**
   * Get complete permission mapping.
   */
  getAllPermissions(): Record<string, Record<string, Permission>> {
    return JSON.parse(JSON.stringify(this.permissions));
  }

  /**
   * Return a human-readable summary of permissions.
   */
  describe(): string {
    const lines: string[] = [];
    const agentIds = Object.keys(this.permissions).sort();
    if (agentIds.length === 0) {
      return '(no explicit permissions configured - default open read/write)';
    }

    for (const agentId of agentIds) {
      const nsMap = this.permissions[agentId];
      const parts = Object.entries(nsMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([ns, perm]) => `${ns} -> ${perm}`);
      lines.push(`  ${agentId}: ${parts.join(', ')}`);
    }
    return lines.join('\n');
  }

  /**
   * Default team configuration matching the standard multi-agent architecture:
   * - Agent A (Researcher): Read/Write research, Read code & review & shared
   * - Agent B (Coder): Read/Write code, Read research & review & shared
   * - Agent C (Reviewer): Read/Write review, Read research & code & shared
   */
  static createDefaultTeamACL(): AccessControl {
    const acl = new AccessControl();

    // Researcher
    acl.grant('researcher', 'research', 'read_write');
    acl.grant('researcher', 'code', 'read');
    acl.grant('researcher', 'review', 'read');
    acl.grant('researcher', 'shared', 'read_write');

    // Coder
    acl.grant('coder', 'code', 'read_write');
    acl.grant('coder', 'research', 'read');
    acl.grant('coder', 'review', 'read');
    acl.grant('coder', 'shared', 'read_write');

    // Reviewer
    acl.grant('reviewer', 'review', 'read_write');
    acl.grant('reviewer', 'research', 'read');
    acl.grant('reviewer', 'code', 'read');
    acl.grant('reviewer', 'shared', 'read_write');

    return acl;
  }
}

export interface SharedMemoryWriteOptions {
  expectedVersion?: number;
  strategy?: ConflictStrategy;
  metadata?: Record<string, unknown>;
}

/**
 * Shared Memory Pool
 * Centralized, thread-safe memory store with namespaces, access control, and conflict resolution.
 */
export class SharedMemoryPool {
  private acl: AccessControl;
  private defaultStrategy: ConflictStrategy;
  private store: Map<string, MemoryEntry> = new Map();
  private history: AuditLogEntry[] = [];
  private conflicts: ConflictRecord[] = [];
  private agentPriorities: Map<string, number> = new Map([
    ['reviewer', 30],
    ['coder', 20],
    ['researcher', 10],
  ]);

  constructor(
    acl?: AccessControl,
    defaultStrategy: ConflictStrategy = 'last_write_wins',
    initialData?: SharedMemoryData
  ) {
    this.acl = acl || new AccessControl();
    this.defaultStrategy = defaultStrategy;

    if (initialData) {
      this.importData(initialData);
    }
  }

  getACL(): AccessControl {
    return this.acl;
  }

  setAgentPriority(agentId: string, priority: number): void {
    this.agentPriorities.set(agentId, priority);
  }

  getAgentPriority(agentId: string): number {
    return this.agentPriorities.get(agentId) ?? 10;
  }

  /**
   * Write an entry to shared memory.
   * Enforces ACL write permission and applies the chosen conflict resolution strategy.
   */
  write(
    agentId: string,
    namespace: string,
    key: string,
    value: string,
    options: SharedMemoryWriteOptions = {}
  ): MemoryEntry {
    if (!this.acl.canWrite(agentId, namespace)) {
      throw new Error(
        `[AccessControl] Agent '${agentId}' does not have write permission for namespace '${namespace}'`
      );
    }

    const fullKey = `${namespace}/${key}`;
    const existing = this.store.get(fullKey);
    const strategy = options.strategy || this.defaultStrategy;
    const now = Date.now();

    // Conflict detection: exists and wrote by different agent or stale version
    if (existing) {
      if (strategy === 'version_check') {
        if (
          options.expectedVersion !== undefined &&
          existing.version !== options.expectedVersion
        ) {
          const conflict: ConflictRecord = {
            namespace,
            key,
            incomingAuthor: agentId,
            existingAuthor: existing.author,
            incomingVersion: options.expectedVersion,
            existingVersion: existing.version,
            strategy: 'version_check',
            resolution: 'rejected',
            timestamp: now,
            details: `Version conflict on '${fullKey}': expected v${options.expectedVersion}, found v${existing.version}`,
          };
          this.conflicts.push(conflict);
          this.history.push({
            action: 'conflict_resolved',
            agent: agentId,
            key: fullKey,
            version: existing.version,
            timestamp: now,
            detail: conflict.details,
          });
          throw new Error(conflict.details);
        }
      } else if (strategy === 'priority') {
        const incomingPriority = this.getAgentPriority(agentId);
        const existingPriority = this.getAgentPriority(existing.author);

        if (incomingPriority < existingPriority) {
          const conflict: ConflictRecord = {
            namespace,
            key,
            incomingAuthor: agentId,
            existingAuthor: existing.author,
            existingVersion: existing.version,
            strategy: 'priority',
            resolution: 'rejected',
            timestamp: now,
            details: `Priority conflict: Agent '${agentId}' (p=${incomingPriority}) cannot overwrite '${existing.author}' (p=${existingPriority})`,
          };
          this.conflicts.push(conflict);
          throw new Error(conflict.details);
        }
      } else if (strategy === 'merge') {
        // Concatenate / combine partial updates
        const mergedValue = `${existing.value}\n\n--- [Update v${existing.version + 1} by ${agentId}] ---\n${value}`;
        const newVersion = existing.version + 1;
        const entry: MemoryEntry = {
          namespace,
          key,
          value: mergedValue,
          author: `${existing.author}+${agentId}`,
          version: newVersion,
          timestamp: now,
          metadata: { ...existing.metadata, ...options.metadata, merged: true },
        };
        this.store.set(fullKey, entry);

        this.conflicts.push({
          namespace,
          key,
          incomingAuthor: agentId,
          existingAuthor: existing.author,
          incomingVersion: newVersion,
          existingVersion: existing.version,
          strategy: 'merge',
          resolution: 'merged',
          timestamp: now,
        });

        this.history.push({
          action: 'write',
          agent: agentId,
          key: fullKey,
          version: newVersion,
          timestamp: now,
          detail: 'Merged with existing entry',
        });
        return entry;
      }
    }

    const newVersion = existing ? existing.version + 1 : 1;
    const entry: MemoryEntry = {
      namespace,
      key,
      value,
      author: agentId,
      version: newVersion,
      timestamp: now,
      metadata: options.metadata,
    };

    if (existing && existing.author !== agentId) {
      this.conflicts.push({
        namespace,
        key,
        incomingAuthor: agentId,
        existingAuthor: existing.author,
        incomingVersion: newVersion,
        existingVersion: existing.version,
        strategy: strategy,
        resolution: 'overwritten',
        timestamp: now,
      });
    }

    this.store.set(fullKey, entry);
    this.history.push({
      action: 'write',
      agent: agentId,
      key: fullKey,
      version: newVersion,
      timestamp: now,
    });

    return entry;
  }

  /**
   * Read entries from a namespace.
   * If key is given, returns that specific entry (or empty list if not found).
   * If key is omitted, returns all entries in that namespace.
   */
  read(agentId: string, namespace: string, key?: string): MemoryEntry[] {
    if (!this.acl.canRead(agentId, namespace)) {
      throw new Error(
        `[AccessControl] Agent '${agentId}' does not have read permission for namespace '${namespace}'`
      );
    }

    if (key) {
      const fullKey = `${namespace}/${key}`;
      const entry = this.store.get(fullKey);
      return entry ? [{ ...entry }] : [];
    }

    const results: MemoryEntry[] = [];
    for (const entry of this.store.values()) {
      if (entry.namespace === namespace) {
        results.push({ ...entry });
      }
    }
    return results;
  }

  /**
   * Read all entries across all namespaces that this agent is authorized to view.
   */
  readAllAccessible(agentId: string, namespaces?: string[]): MemoryEntry[] {
    const results: MemoryEntry[] = [];
    for (const entry of this.store.values()) {
      if (namespaces && !namespaces.includes(entry.namespace)) {
        continue;
      }
      if (this.acl.canRead(agentId, entry.namespace)) {
        results.push({ ...entry });
      }
    }
    return results;
  }

  /**
   * Delete an entry from shared memory.
   */
  delete(agentId: string, namespace: string, key: string): boolean {
    if (!this.acl.canWrite(agentId, namespace)) {
      throw new Error(
        `[AccessControl] Agent '${agentId}' does not have write/delete permission for namespace '${namespace}'`
      );
    }

    const fullKey = `${namespace}/${key}`;
    const existed = this.store.delete(fullKey);
    if (existed) {
      this.history.push({
        action: 'delete',
        agent: agentId,
        key: fullKey,
        timestamp: Date.now(),
      });
    }
    return existed;
  }

  /**
   * List all namespaces that currently contain at least one entry.
   */
  listNamespaces(): string[] {
    const nsSet = new Set<string>();
    for (const entry of this.store.values()) {
      nsSet.add(entry.namespace);
    }
    return Array.from(nsSet).sort();
  }

  /**
   * Get all entries currently in the store.
   */
  getAllEntries(): Record<string, MemoryEntry> {
    const res: Record<string, MemoryEntry> = {};
    for (const [k, v] of this.store.entries()) {
      res[k] = { ...v };
    }
    return res;
  }

  /**
   * Get conflict records.
   */
  getConflicts(): ConflictRecord[] {
    return [...this.conflicts];
  }

  /**
   * Get audit log history.
   */
  getHistory(): AuditLogEntry[] {
    return [...this.history];
  }

  /**
   * Summary overview of shared memory contents.
   */
  getSummary(): string {
    if (this.store.size === 0) {
      return '(Shared memory pool is empty)';
    }

    const namespaces = this.listNamespaces();
    const lines: string[] = [`Shared Memory Pool (${this.store.size} entries):`];

    for (const ns of namespaces) {
      const nsEntries = Array.from(this.store.values()).filter((e) => e.namespace === ns);
      lines.push(`\n=== Namespace: ${ns}/ (${nsEntries.length} entries) ===`);
      for (const entry of nsEntries) {
        const preview = entry.value.length > 80 ? `${entry.value.slice(0, 77)}...` : entry.value;
        lines.push(`  • [${entry.key}] v${entry.version} by ${entry.author}: ${preview}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Export the pool state for serialization to disk / vault.
   */
  exportData(): SharedMemoryData {
    return {
      version: '1.0.0',
      updatedAt: new Date().toISOString(),
      entries: this.getAllEntries(),
      history: this.getHistory(),
      conflicts: this.getConflicts(),
    };
  }

  /**
   * Import data into the pool.
   */
  importData(data: SharedMemoryData): void {
    if (data.entries) {
      for (const [k, v] of Object.entries(data.entries)) {
        this.store.set(k, v);
      }
    }
    if (data.history) {
      this.history = [...data.history];
    }
    if (data.conflicts) {
      this.conflicts = [...data.conflicts];
    }
  }
}

/**
 * Blackboard
 * Aggregates shared memory into a unified read-only synthesis view.
 * Partial solutions from various agents are assembled here into a coherent whole.
 */
export class Blackboard {
  private memoryPool: SharedMemoryPool;

  constructor(memoryPool: SharedMemoryPool) {
    this.memoryPool = memoryPool;
  }

  /**
   * Build a text summary of everything visible to a given agent.
   */
  getSummary(agentId?: string): string {
    const entries = agentId
      ? this.memoryPool.readAllAccessible(agentId)
      : Object.values(this.memoryPool.getAllEntries());

    if (entries.length === 0) {
      return 'The blackboard is empty. No partial solutions posted yet.';
    }

    const sections: Record<string, string[]> = {};
    for (const entry of entries) {
      if (!sections[entry.namespace]) {
        sections[entry.namespace] = [];
      }
      const preview = entry.value.length > 150 ? `${entry.value.slice(0, 147)}...` : entry.value;
      sections[entry.namespace].push(
        `  • [${entry.key}] (v${entry.version}, by ${entry.author}):\n    ${preview}`
      );
    }

    const lines: string[] = ['Current Blackboard State:', ''];
    for (const ns of Object.keys(sections).sort()) {
      lines.push(`=== Namespace: ${ns}/ ===`);
      lines.push(...sections[ns]);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Assemble partial solutions across namespaces into a coherent deliverable document.
   */
  assembleSolution(targetNamespaces: string[] = ['research', 'code', 'review']): string {
    const all = this.memoryPool.getAllEntries();
    const parts: string[] = [];

    parts.push('# Multi-Agent Assembled Solution');
    parts.push(`Generated: ${new Date().toISOString()}\n`);

    for (const ns of targetNamespaces) {
      const entries = Object.values(all).filter((e) => e.namespace === ns);
      if (entries.length === 0) continue;

      parts.push(`## Section: ${ns.toUpperCase()}`);
      for (const e of entries) {
        parts.push(`### [${e.key}] (Author: ${e.author}, v${e.version})`);
        parts.push(e.value);
        parts.push('');
      }
    }

    return parts.join('\n');
  }

  /**
   * Post the assembled result back to the Shared Memory Pool (merged results back).
   * As shown by the dotted green line in the multi-agent architecture diagram.
   */
  postAssembledSolution(
    authorAgentId: string,
    targetNamespace = 'shared',
    targetKey = 'blackboard_solution'
  ): MemoryEntry {
    const solution = this.assembleSolution();
    return this.memoryPool.write(authorAgentId, targetNamespace, targetKey, solution, {
      metadata: { assembledFromBlackboard: true },
    });
  }

  getState(): BlackboardState {
    const entries = this.memoryPool.getAllEntries();
    const summaries: Record<string, number> = {};
    for (const e of Object.values(entries)) {
      summaries[e.namespace] = (summaries[e.namespace] || 0) + 1;
    }

    return {
      version: '1.0.0',
      updatedAt: new Date().toISOString(),
      namespaceSummaries: summaries,
      assembledSolution: this.assembleSolution(),
    };
  }

  /**
   * Generate a comprehensive, exportable Markdown document (.md) representing
   * the full multi-agent shared memory, blackboard state, and private scratchpads.
   */
  generateMarkdownReport(options?: {
    scratchpads?: Record<string, string[]>;
    mcpServers?: string[];
    skills?: string[];
  }): string {
    const all = this.memoryPool.getAllEntries();
    const namespaces = this.memoryPool.listNamespaces();
    const parts: string[] = [];

    parts.push('# 🧠 Multi-Agent Shared Memory & Blackboard Report');
    parts.push(`> **Generated At**: \`${new Date().toISOString()}\``);
    parts.push('> **Synchronized Across Agents**: OpenCode, Claude Desktop, Claude Code, Cursor, Windsurf\n');

    // 1. Blackboard Assembled Solution
    parts.push('---');
    parts.push('## 📋 Blackboard State (Unified Multi-Agent Solution)');
    const solution = this.assembleSolution();
    parts.push(solution || '*(No partial solutions assembled yet)*');
    parts.push('');

    // 2. Namespaces Breakdown
    parts.push('---');
    parts.push('## 🗂 Namespaced Shared Memory Pool\n');

    if (namespaces.length === 0) {
      parts.push('*(Shared memory pool is currently empty)*\n');
    } else {
      for (const ns of namespaces) {
        const entries = Object.values(all).filter((e) => e.namespace === ns);
        parts.push(`### 📁 Namespace: \`${ns}/\` (${entries.length} entries)`);
        for (const e of entries) {
          parts.push(`#### 🔹 \`${e.key}\` (v${e.version} by \`@${e.author}\` at ${new Date(e.timestamp).toISOString()})`);
          parts.push('```markdown');
          parts.push(e.value);
          parts.push('```\n');
        }
      }
    }

    // 3. Private Scratchpads (if provided)
    if (options?.scratchpads && Object.keys(options.scratchpads).length > 0) {
      parts.push('---');
      parts.push('## 🔒 Agent Private Scratchpads (Local Reasoning)');
      parts.push('*Notes recorded during agent reasoning cycles:*\n');
      for (const [agentId, notes] of Object.entries(options.scratchpads)) {
        parts.push(`### 👤 Agent: \`@${agentId}\``);
        if (notes.length === 0) {
          parts.push('*(No private scratchpad notes recorded)*');
        } else {
          for (let i = 0; i < notes.length; i++) {
            parts.push(`${i + 1}. ${notes[i]}`);
          }
        }
        parts.push('');
      }
    }

    // 4. MCP Servers & Skills Inventory (if provided)
    if (options?.mcpServers?.length || options?.skills?.length) {
      parts.push('---');
      parts.push('## ⚡ Synchronized MCP Servers & Skills');
      if (options.mcpServers?.length) {
        parts.push('### 🔌 Active MCP Servers:');
        for (const s of options.mcpServers) parts.push(`- **${s}**`);
        parts.push('');
      }
      if (options.skills?.length) {
        parts.push('### 🛠 Active Skills:');
        for (const sk of options.skills) parts.push(`- **${sk}**`);
        parts.push('');
      }
    }

    return parts.join('\n');
  }
}

/**
 * Agent Memory Session
 * Connects an agent (Researcher, Coder, Reviewer, or custom agent) to:
 * 1. A private scratchpad (drafts, notes, local reasoning, WIP diffs - isolated from others).
 * 2. Shared Memory Pool (through access control layer).
 * 3. Blackboard (aggregated views of collective progress).
 */
export class AgentMemorySession {
  readonly agentId: string;
  readonly role: string;
  private memoryPool: SharedMemoryPool;
  private scratchpad: string[] = []; // Private notes, invisible to other agents

  constructor(agentId: string, role: string, memoryPool: SharedMemoryPool, initialScratchpad?: string[]) {
    this.agentId = agentId;
    this.role = role;
    this.memoryPool = memoryPool;
    if (initialScratchpad) {
      this.scratchpad = [...initialScratchpad];
    }
  }

  /**
   * Record a private note or local reasoning step to the agent's private scratchpad.
   * Other agents cannot see or read this.
   */
  think(thought: string): void {
    this.scratchpad.push(thought);
  }

  /**
   * Get the private scratchpad notes.
   */
  getScratchpad(): string[] {
    return [...this.scratchpad];
  }

  /**
   * Clear the private scratchpad.
   */
  clearScratchpad(): void {
    this.scratchpad = [];
  }

  /**
   * Read from shared memory with ACL check.
   */
  readShared(namespace: string, key?: string): MemoryEntry[] {
    return this.memoryPool.read(this.agentId, namespace, key);
  }

  /**
   * Write an entry to shared memory with ACL check and conflict handling.
   */
  writeShared(
    namespace: string,
    key: string,
    value: string,
    options?: SharedMemoryWriteOptions
  ): MemoryEntry {
    return this.memoryPool.write(this.agentId, namespace, key, value, options);
  }

  /**
   * Read all entries across namespaces that this agent is authorized to view.
   */
  readAllAccessible(namespaces?: string[]): MemoryEntry[] {
    return this.memoryPool.readAllAccessible(this.agentId, namespaces);
  }

  /**
   * View the collective Blackboard state.
   */
  getBlackboardView(): string {
    const blackboard = new Blackboard(this.memoryPool);
    return blackboard.getSummary(this.agentId);
  }
}

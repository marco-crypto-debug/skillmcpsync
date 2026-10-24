import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { CanonicalMcpServer, CanonicalSkill } from '../core/types.js';
import { VaultManager } from '../core/vault.js';
import { AdapterRegistry } from '../adapters/registry.js';
import {
  DiscoveredToolSchema,
  DiscoveredSkill,
  RemoteNodeConfig,
  ServerTransport,
} from './types.js';

export interface ServerHealthCheck {
  serverName: string;
  transport: ServerTransport;
  healthy: boolean;
  latencyMs?: number;
  message?: string;
}

export class DiscoveryEngine {
  private vault: VaultManager;

  constructor(vault: VaultManager) {
    this.vault = vault;
  }

  /**
   * Discover and introspect all local MCP servers and their transport configurations.
   */
  discoverMcpServers(): Record<string, CanonicalMcpServer & { transport: ServerTransport }> {
    const servers = this.vault.readMcpServers();
    const result: Record<string, CanonicalMcpServer & { transport: ServerTransport }> = {};

    for (const [name, server] of Object.entries(servers)) {
      let transport: ServerTransport = 'stdio';
      if (server.url) {
        transport = server.url.startsWith('http') && server.url.includes('/sse') ? 'sse' : 'http';
      } else if (server.type === 'sse' || server.type === 'remote') {
        transport = 'sse';
      }

      result[name] = {
        ...server,
        transport,
      };
    }

    return result;
  }

  /**
   * Health-check an MCP server endpoint.
   */
  async checkServerHealth(name: string, server: CanonicalMcpServer): Promise<ServerHealthCheck> {
    const start = Date.now();

    if (server.url) {
      // Remote HTTP / SSE server
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(server.url, {
          method: 'GET',
          signal: controller.signal,
          headers: { Accept: 'text/event-stream, application/json, text/plain' },
        }).catch(() => null);
        clearTimeout(timeoutId);

        const latency = Date.now() - start;
        const healthy = res !== null && (res.ok || res.status < 500);

        return {
          serverName: name,
          transport: server.url.includes('/sse') ? 'sse' : 'http',
          healthy,
          latencyMs: latency,
          message: healthy ? `HTTP ${res?.status} in ${latency}ms` : 'Endpoint unreachable',
        };
      } catch (err: any) {
        return {
          serverName: name,
          transport: 'http',
          healthy: false,
          latencyMs: Date.now() - start,
          message: err.message,
        };
      }
    }

    // Local stdio server
    if (server.command) {
      try {
        // Test if command executable is found in system PATH
        const checkCmd = process.platform === 'win32' ? `where ${server.command}` : `which ${server.command}`;
        execSync(checkCmd, { stdio: 'ignore' });
        return {
          serverName: name,
          transport: 'stdio',
          healthy: true,
          latencyMs: Date.now() - start,
          message: `Executable '${server.command}' found in PATH`,
        };
      } catch {
        // Fallback: check if command points to an existing file
        if (fs.existsSync(server.command)) {
          return {
            serverName: name,
            transport: 'stdio',
            healthy: true,
            latencyMs: Date.now() - start,
            message: `Binary verified at '${server.command}'`,
          };
        }
        return {
          serverName: name,
          transport: 'stdio',
          healthy: false,
          latencyMs: Date.now() - start,
          message: `Executable '${server.command}' not found in PATH`,
        };
      }
    }

    return {
      serverName: name,
      transport: 'stdio',
      healthy: false,
      message: 'No executable command or URL configured',
    };
  }

  /**
   * Introspect tools across registered servers.
   */
  introspectTools(serverOrigin = 'local'): DiscoveredToolSchema[] {
    const servers = this.discoverMcpServers();
    const tools: DiscoveredToolSchema[] = [];

    for (const [serverName, server] of Object.entries(servers)) {
      // Common built-in tools or tools described in server metadata
      const declaredTools = (server.metadata?.tools as Array<{ name: string; description?: string; inputSchema?: any }>) || [];

      if (declaredTools.length > 0) {
        for (const t of declaredTools) {
          tools.push({
            name: t.name,
            originServer: serverOrigin,
            namespacedName: `${serverOrigin}:${serverName}:${t.name}`,
            description: t.description || `Tool provided by ${serverName}`,
            inputSchema: t.inputSchema,
            transport: server.transport,
            enabled: server.enabled !== false,
            updatedAt: Date.now(),
          });
        }
      } else {
        // Synthesize tool representation for the server
        tools.push({
          name: serverName,
          originServer: serverOrigin,
          namespacedName: `${serverOrigin}:${serverName}`,
          description: server.description || `MCP Server endpoint (${server.transport})`,
          transport: server.transport,
          enabled: server.enabled !== false,
          updatedAt: Date.now(),
        });
      }
    }

    return tools;
  }

  /**
   * Introspect skills across vault and local installed coding agents.
   */
  introspectSkills(serverOrigin = 'local'): DiscoveredSkill[] {
    const skills = this.vault.readSkills();
    const result: DiscoveredSkill[] = [];

    for (const s of skills) {
      result.push({
        name: s.name,
        originServer: serverOrigin,
        namespacedName: `${serverOrigin}:${s.name}`,
        description: s.description,
        content: s.content,
        files: s.files,
        version: 1,
        updatedAt: Date.now(),
      });
    }

    // Also inspect installed agent adapters for any local skills not yet in vault
    const adapters = AdapterRegistry.getAll();
    for (const adapter of adapters) {
      if (adapter.isInstalled() && adapter.readSkills) {
        try {
          const agentSkills = adapter.readSkills();
          for (const s of agentSkills) {
            if (!result.some((existing) => existing.name === s.name)) {
              result.push({
                name: s.name,
                originServer: adapter.id,
                namespacedName: `${adapter.id}:${s.name}`,
                description: s.description,
                content: s.content,
                files: s.files,
                version: 1,
                updatedAt: Date.now(),
              });
            }
          }
        } catch {
          // ignore read failure
        }
      }
    }

    return result;
  }
}

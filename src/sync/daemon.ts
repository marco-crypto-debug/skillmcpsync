import http from 'node:http';
import { loadConfig } from '../core/config.js';
import { VaultManager } from '../core/vault.js';
import { SyncManager, sync_all_resources } from './sync_manager.js';
import { DiscoveryEngine } from './discovery.js';
import { AccessControl, SharedMemoryPool, Blackboard, AgentMemorySession } from '../core/memory.js';
import { logger } from '../utils/logger.js';

export interface DaemonOptions {
  port?: number;
  host?: string;
  vaultPath?: string;
}

export class SyncDaemon {
  private server: http.Server | null = null;
  private port: number;
  private host: string;
  private vaultPath: string;

  constructor(options: DaemonOptions = {}) {
    this.port = options.port || 4949;
    this.host = options.host || '127.0.0.1';
    const config = loadConfig();
    this.vaultPath = options.vaultPath || config.vaultPath;
  }

  start(): Promise<number> {
    return new Promise((resolve, reject) => {
      const syncManager = new SyncManager(this.vaultPath);
      const vault = syncManager.getVault();
      const discovery = syncManager.getDiscovery();

      this.server = http.createServer(async (req, res) => {
        // Enable CORS for macOS desktop webview / UI
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        const url = new URL(req.url || '/', `http://${this.host}:${this.port}`);
        const pathname = url.pathname;

        try {
          if (pathname === '/api/status' && req.method === 'GET') {
            const rawServers = vault.readMcpServers();
            const skills = vault.readSkills();
            const memData = vault.readSharedMemory();
            const blackboard = vault.readBlackboard();

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                status: 'online',
                vaultPath: this.vaultPath,
                serversCount: Object.keys(rawServers).length,
                skillsCount: skills.length,
                memoryEntriesCount: Object.keys(memData.entries || {}).length,
                blackboardState: blackboard,
              })
            );
            return;
          }

          if (pathname === '/api/sync' && req.method === 'POST') {
            const result = await sync_all_resources({ vaultPath: this.vaultPath });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
            return;
          }

          if (pathname === '/api/servers' && req.method === 'GET') {
            const servers = discovery.discoverMcpServers();
            const healthResults: any[] = [];
            for (const [name, server] of Object.entries(servers)) {
              const health = await discovery.checkServerHealth(name, server);
              healthResults.push({
                ...server,
                health,
              });
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(healthResults));
            return;
          }

          if (pathname === '/api/tools' && req.method === 'GET') {
            const tools = discovery.introspectTools('local');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(tools));
            return;
          }

          if (pathname === '/api/skills' && req.method === 'GET') {
            const skills = discovery.introspectSkills('local');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(skills));
            return;
          }

          if (pathname === '/api/memory' && req.method === 'GET') {
            const memData = vault.readSharedMemory();
            const blackboard = vault.readBlackboard();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ memory: memData, blackboard }));
            return;
          }

          if (pathname === '/api/memory' && req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => (body += chunk));
            req.on('end', () => {
              const data = JSON.parse(body);
              const acl = new AccessControl(vault.readAccessControl());
              const pool = new SharedMemoryPool(acl, 'last_write_wins', vault.readSharedMemory());
              const entry = pool.write(
                data.agent || 'coder',
                data.namespace || 'shared',
                data.key,
                data.value,
                { strategy: data.strategy }
              );
              vault.writeSharedMemory(pool.exportData());
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, entry }));
            });
            return;
          }

          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Endpoint not found' }));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });

      this.server.listen(this.port, this.host, () => {
        resolve(this.port);
      });

      this.server.on('error', (err) => reject(err));
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }
}

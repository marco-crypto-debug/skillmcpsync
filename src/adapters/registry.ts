import { AgentAdapter } from './base.js';
import { OpenCodeAdapter } from './opencode.js';
import { AntigravityAdapter } from './antigravity.js';
import { ClaudeDesktopAdapter } from './claude_desktop.js';
import { ClaudeCodeAdapter } from './claude_code.js';
import { CursorAdapter } from './cursor.js';
import { WindsurfAdapter } from './windsurf.js';

export class AdapterRegistry {
  private static adapters: AgentAdapter[] = [
    new OpenCodeAdapter(),
    new AntigravityAdapter(),
    new ClaudeDesktopAdapter(),
    new ClaudeCodeAdapter(),
    new CursorAdapter(),
    new WindsurfAdapter(),
  ];

  static getAll(): AgentAdapter[] {
    return this.adapters;
  }

  static getById(id: string): AgentAdapter | undefined {
    return this.adapters.find((a) => a.id.toLowerCase() === id.toLowerCase());
  }

  static getInstalled(): AgentAdapter[] {
    return this.adapters.filter((a) => a.isInstalled());
  }

  static resolve(requestedIds?: string[]): AgentAdapter[] {
    if (!requestedIds || requestedIds.length === 0 || requestedIds.includes('all')) {
      // By default, return all installed agents, or all if none installed
      const installed = this.getInstalled();
      return installed.length > 0 ? installed : this.adapters;
    }

    const result: AgentAdapter[] = [];
    for (const id of requestedIds) {
      const adapter = this.getById(id.trim());
      if (adapter) {
        result.push(adapter);
      }
    }
    return result;
  }
}

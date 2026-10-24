import fs from 'node:fs';
import path from 'node:path';

export interface SecretReplacement {
  originalValue: string;
  varName: string;
}

export class SecretManager {
  private localEnv: Record<string, string> = {};

  constructor(envFilePath?: string) {
    if (envFilePath && fs.existsSync(envFilePath)) {
      this.loadEnvFile(envFilePath);
    }
  }

  loadEnvFile(filePath: string): void {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          // Remove wrapping quotes if present
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.slice(1, -1);
          }
          this.localEnv[key] = val;
        }
      }
    } catch {
      // Ignore reading error
    }
  }

  /**
   * Resolves an environment variable key:
   * Checks process.env first, then local .env file
   */
  getEnv(varName: string): string | undefined {
    return process.env[varName] || this.localEnv[varName];
  }

  /**
   * Replaces all ${VAR_NAME} placeholders in a string with actual values
   */
  resolveString(text: string): string {
    return text.replace(/\$\{([A-Za-z0-9_]+)\}/g, (match, varName) => {
      const val = this.getEnv(varName);
      return val !== undefined ? val : match;
    });
  }

  /**
   * Resolves all ${VAR_NAME} placeholders in an object recursively
   */
  resolveObject<T>(obj: T): T {
    if (typeof obj === 'string') {
      return this.resolveString(obj) as unknown as T;
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => this.resolveObject(item)) as unknown as T;
    }
    if (obj !== null && typeof obj === 'object') {
      const result: Record<string, any> = {};
      for (const [k, v] of Object.entries(obj)) {
        result[k] = this.resolveObject(v);
      }
      return result as T;
    }
    return obj;
  }

  /**
   * Tokenizes an object before saving into the vault:
   * If a value is a known secret key or matches sensitive patterns,
   * it suggests or converts it to ${VAR_NAME}.
   */
  tokenizeObject<T>(
    obj: T,
    serverName?: string
  ): { tokenized: T; extractedSecrets: Record<string, string> } {
    const extractedSecrets: Record<string, string> = {};

    const walk = (val: any, keyPath: string): any => {
      if (typeof val === 'string') {
        // If it's already a placeholder, leave it
        if (/^\$\{([A-Za-z0-9_]+)\}$/.test(val)) {
          return val;
        }

        // Check if the key name indicates a secret
        const upperKey = keyPath.toUpperCase();
        const isSecretKey =
          upperKey.includes('TOKEN') ||
          upperKey.includes('SECRET') ||
          upperKey.includes('KEY') ||
          upperKey.includes('PASSWORD') ||
          upperKey.includes('AUTH');

        // Check if value looks like a secret token (e.g. sk-..., ghp_..., etc.)
        const isSecretVal =
          /^(sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{20,})/.test(
            val
          );

        if ((isSecretKey || isSecretVal) && val.length > 5) {
          // Construct variable name: e.g. GITHUB_TOKEN or SERVER_NAME_API_KEY
          let varName = keyPath
            .toUpperCase()
            .replace(/[^A-Z0-9_]/g, '_');

          if (serverName && !varName.startsWith(serverName.toUpperCase())) {
            varName = `${serverName.toUpperCase().replace(/[^A-Z0-9_]/g, '_')}_${varName}`;
          }

          extractedSecrets[varName] = val;
          return `\${${varName}}`;
        }

        return val;
      }

      if (Array.isArray(val)) {
        return val.map((item, idx) => walk(item, `${keyPath}_${idx}`));
      }

      if (val !== null && typeof val === 'object') {
        const res: Record<string, any> = {};
        for (const [k, v] of Object.entries(val)) {
          res[k] = walk(v, k);
        }
        return res;
      }

      return val;
    };

    const tokenized = walk(obj, '');
    return { tokenized, extractedSecrets };
  }

  /**
   * Finds all ${VAR_NAME} placeholders used in a text or data structure
   */
  findPlaceholders(data: any): string[] {
    const found = new Set<string>();

    const scan = (val: any) => {
      if (typeof val === 'string') {
        const matches = val.matchAll(/\$\{([A-Za-z0-9_]+)\}/g);
        for (const match of matches) {
          found.add(match[1]);
        }
      } else if (Array.isArray(val)) {
        for (const item of val) scan(item);
      } else if (val !== null && typeof val === 'object') {
        for (const v of Object.values(val)) scan(v);
      }
    };

    scan(data);
    return Array.from(found).sort();
  }

  /**
   * Checks which required variables are currently missing in the environment
   */
  getMissingEnvVars(requiredVars: string[]): string[] {
    return requiredVars.filter((v) => !this.getEnv(v));
  }
}

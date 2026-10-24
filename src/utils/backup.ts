import fs from 'node:fs';
import path from 'node:path';
import { logger } from './logger.js';

export function createBackup(filePath: string): string | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${filePath}.${timestamp}.bak`;
    fs.copyFileSync(filePath, backupPath);
    return backupPath;
  } catch (err: any) {
    logger.warn(`Could not create backup for ${filePath}: ${err.message}`);
    return null;
  }
}

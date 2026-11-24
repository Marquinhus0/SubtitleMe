import { realpathSync } from 'node:fs';
import path, { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function normalizeFilePath(filePath: string, platform: NodeJS.Platform): string {
  if (platform === 'win32') {
    // Handle `fileURLToPath('file:///C:/...')` when invoked on a POSIX host with platform='win32'
    const cleaned = /^\/[a-zA-Z]:[\\/]/.test(filePath) ? filePath.slice(1) : filePath;
    const resolved = path.win32.resolve(cleaned);
    let canonical = resolved;
    if (process.platform === 'win32') {
      try {
        canonical = realpathSync(resolved);
      } catch {
        // Allow synthetic/non-existent paths in unit tests to fall back cleanly
      }
    }
    return canonical.toLowerCase();
  }

  const resolved = resolve(filePath);
  let canonical = resolved;
  try {
    canonical = realpathSync(resolved);
  } catch {
    // Allow synthetic/non-existent paths in unit tests to fall back cleanly to path.resolve()
  }
  return canonical;
}

/**
 * Safely determines whether an ESM module is being executed directly as the Node.js entrypoint.
 *
 * Uses `fileURLToPath()` so percent-encoded characters in `import.meta.url` (spaces `%20`,
 * accented Latin characters, and arbitrary Unicode paths) match `process.argv[1]` reliably
 * across Windows, Linux, and macOS without false positives on module imports.
 */
export function isDirectExecution(
  moduleUrl: string,
  argvEntry: string | undefined,
  platform: NodeJS.Platform = process.platform,
): boolean {
  if (typeof argvEntry !== 'string' || argvEntry.trim().length === 0) {
    return false;
  }

  try {
    const modulePath = fileURLToPath(moduleUrl);
    return normalizeFilePath(modulePath, platform) === normalizeFilePath(argvEntry, platform);
  } catch {
    return false;
  }
}

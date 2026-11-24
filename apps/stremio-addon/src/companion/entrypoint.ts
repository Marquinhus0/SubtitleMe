import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function normalizeFilePath(filePath: string, platform: NodeJS.Platform): string {
  const resolved = resolve(filePath);
  let canonical = resolved;
  try {
    canonical = realpathSync(resolved);
  } catch {
    // Allow synthetic/non-existent paths in unit tests to fall back cleanly to path.resolve()
  }
  return platform === 'win32' ? canonical.toLowerCase() : canonical;
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

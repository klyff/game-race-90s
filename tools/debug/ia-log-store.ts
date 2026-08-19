/**
 * Debug-IA log store with a 10 MB cap. When drivers + session logs exceed the
 * limit, every log file is deleted so long sessions cannot fill the disk.
 */
import { mkdirSync, readdirSync, statSync, unlinkSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

export const IA_LOG_MAX_BYTES = 10 * 1024 * 1024;

export function iaLogDirs(root: string): {
  readonly root: string;
  readonly drivers: string;
  readonly logs: string;
} {
  return {
    root,
    drivers: join(root, 'drivers'),
    logs: join(root, 'logs'),
  };
}

function directoryByteSize(dir: string): number {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      total += directoryByteSize(path);
      continue;
    }
    if (entry.isFile()) {
      total += statSync(path).size;
    }
  }
  return total;
}

function emptyDirectory(dir: string): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      emptyDirectory(path);
      continue;
    }
    unlinkSync(path);
  }
}

export function iaLogByteSize(root: string): number {
  const dirs = iaLogDirs(root);
  mkdirSync(dirs.drivers, { recursive: true });
  mkdirSync(dirs.logs, { recursive: true });
  return directoryByteSize(dirs.drivers) + directoryByteSize(dirs.logs);
}

/**
 * Delete every driver log and session log under `root`. Returns true when a
 * purge ran.
 */
export function purgeIaLogs(root: string, reason = 'size cap'): boolean {
  const dirs = iaLogDirs(root);
  mkdirSync(dirs.drivers, { recursive: true });
  mkdirSync(dirs.logs, { recursive: true });

  const hadFiles =
    readdirSync(dirs.drivers).length > 0 || readdirSync(dirs.logs).length > 0;

  emptyDirectory(dirs.drivers);
  emptyDirectory(dirs.logs);

  const note = `${new Date().toISOString()} purged all debug-ia logs (${reason})\n`;
  appendFileSync(join(dirs.logs, 'collector.log'), note, 'utf8');

  return hadFiles;
}

/**
 * Wipe logs when the store is at or above `maxBytes` (default 10 MB).
 */
export function pruneIaLogsIfNeeded(
  root: string,
  maxBytes: number = IA_LOG_MAX_BYTES,
): { readonly purged: boolean; readonly bytes: number } {
  const size = iaLogByteSize(root);
  if (size < maxBytes) {
    return { purged: false, bytes: size };
  }
  const mb = (size / (1024 * 1024)).toFixed(1);
  purgeIaLogs(root, `total ${mb}MB >= ${(maxBytes / (1024 * 1024)).toFixed(0)}MB`);
  return { purged: true, bytes: size };
}

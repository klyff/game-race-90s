import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  IA_LOG_MAX_BYTES,
  iaLogByteSize,
  pruneIaLogsIfNeeded,
  purgeIaLogs,
} from '../../tools/debug/ia-log-store.ts';

describe('ia-log-store', () => {
  let root = '';

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'ia-log-'));
    mkdirSync(join(root, 'drivers'), { recursive: true });
    mkdirSync(join(root, 'logs'), { recursive: true });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('purges all driver and session logs once the store reaches 10 MB', () => {
    const chunk = 'x'.repeat(512 * 1024);
    writeFileSync(join(root, 'drivers', 'KLYFF__car-1-run-1.log'), chunk.repeat(21), 'utf8');
    expect(iaLogByteSize(root)).toBeGreaterThanOrEqual(IA_LOG_MAX_BYTES);

    const result = pruneIaLogsIfNeeded(root);
    expect(result.purged).toBe(true);
    expect(iaLogByteSize(root)).toBeLessThan(1024);
  });

  it('keeps logs while the store stays under the cap', () => {
    writeFileSync(join(root, 'drivers', 'small.log'), 'hello\n', 'utf8');
    const result = pruneIaLogsIfNeeded(root);
    expect(result.purged).toBe(false);
    expect(iaLogByteSize(root)).toBeGreaterThan(0);
  });

  it('purgeIaLogs clears every file and leaves a collector note', () => {
    writeFileSync(join(root, 'drivers', 'one.log'), 'line\n', 'utf8');
    writeFileSync(join(root, 'logs', 'collector.log'), 'old\n', 'utf8');
    purgeIaLogs(root, 'test');
    expect(iaLogByteSize(root)).toBeGreaterThan(0);
    expect(iaLogByteSize(root)).toBeLessThan(256);
  });
});

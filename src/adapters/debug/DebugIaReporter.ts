/**
 * Debug-IA file sink: one log line per driver every 3 s, POSTed to a local
 * collector so a 3-minute session does not depend on the agent polling CDP.
 */

export const DEBUG_IA_LOG_INTERVAL_SECONDS = 3;
export const DEBUG_IA_LOG_URL = 'http://127.0.0.1:8765/log';

export function debugIaLogFileName(profile: string, carId: string): string {
  const name = profile.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  const car = carId.trim().replace(/[^A-Za-z0-9_-]+/g, '_');
  return `${name}__${car}-run-1.log`;
}

export interface DebugIaLogLine {
  readonly file: string;
  readonly line: string;
}

export async function postDebugIaLogs(entries: readonly DebugIaLogLine[]): Promise<void> {
  if (entries.length === 0 || typeof fetch === 'undefined') {
    return;
  }
  try {
    await fetch(DEBUG_IA_LOG_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries }),
    });
  } catch {
    /* Collector down — window.__DEBUG_IA still holds the snapshot. */
  }
}

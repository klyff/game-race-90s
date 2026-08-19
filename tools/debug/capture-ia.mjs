/**
 * Three 5-minute NPC observation runs: headless logs + Playwright screenshots.
 *
 *   node tools/debug/capture-ia.mjs
 *
 * Writes ~/tmp/run-dd-mm-yyyy__h-mm/{sim-1,sim-2,sim-3}/
 * Screenshots: t=2s after GO, then every 30s through 300s (11 PNGs).
 *
 * Needs a development Vite build (window.game) and Playwright's headless shell
 * (see tools/verify/README.md). Agent sessions cannot npm run dev.
 */
import { mkdirSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');

const SIMS = [
  { id: 'sim-1', track: 'thunder-basin', seed: '1' },
  { id: 'sim-2', track: 'thunder-basin-2', seed: '2' },
  { id: 'sim-3', track: 'bogmire-deep-1', seed: '3' },
];

function stampFolder() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const name = `run-${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}__${pad(now.getHours())}-${pad(now.getMinutes())}`;
  return join(homedir(), 'tmp', name);
}

function findChrome() {
  if (process.env.CHROME_BIN && existsSync(process.env.CHROME_BIN)) {
    return process.env.CHROME_BIN;
  }
  const cache = join(homedir(), 'Library/Caches/ms-playwright');
  if (!existsSync(cache)) {
    return '';
  }
  const preferred = ['chromium_headless_shell-1234', 'chromium_headless_shell-1228', 'chromium_headless_shell-1208'];
  for (const rev of preferred) {
    const bin = join(cache, rev, 'chrome-headless-shell-mac-arm64/chrome-headless-shell');
    if (existsSync(bin)) {
      return bin;
    }
  }
  for (const dir of readdirSync(cache)) {
    if (!dir.startsWith('chromium_headless_shell-')) {
      continue;
    }
    const bin = join(cache, dir, 'chrome-headless-shell-mac-arm64/chrome-headless-shell');
    if (existsSync(bin)) {
      return bin;
    }
  }
  return '';
}

function run(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: 'inherit' });
    child.on('exit', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${cmd} ${args.join(' ')} exited ${code}`));
      }
    });
  });
}

const outRoot = process.env.IA_CAPTURE_OUT ?? stampFolder();
mkdirSync(outRoot, { recursive: true });
writeFileSync(
  join(outRoot, 'README.md'),
  [
    '# NPC observation run',
    '',
    `- out: ${outRoot}`,
    `- tracks: ${SIMS.map(s => s.track).join(', ')}`,
    '- grid: 14 NPCs (debug-IA lottery, not career 5)',
    '- camera: DEBUG_IA 90% map, HUD/overlay/tile off',
    '- screenshots: t=2s after GO, then every 30s to 300s',
    '- headless: 60 Hz decisions.jsonl + 3s driver logs',
    '',
  ].join('\n'),
);

if (process.env.SKIP_BUILD !== '1') {
  await run('npx', ['vite', 'build', '--mode', 'development'], root);
}

await Promise.all(
  SIMS.map(sim => {
    const simDir = join(outRoot, sim.id);
    mkdirSync(join(simDir, 'screenshots'), { recursive: true });
    mkdirSync(join(simDir, 'drivers'), { recursive: true });
    return run(
      'node',
      [
        '--experimental-strip-types',
        'tools/debug/run-ia.ts',
        '--seconds',
        '300',
        '--track',
        sim.track,
        '--seed',
        sim.seed,
        '--out',
        simDir,
      ],
      root,
    );
  }),
);

const chrome = findChrome();
if (!chrome) {
  for (const sim of SIMS) {
    writeFileSync(
      join(outRoot, sim.id, 'screenshots', 'SKIPPED.txt'),
      'CHROME_BIN missing\n',
    );
  }
} else {
  await Promise.all(
    SIMS.map(sim => {
      const simDir = join(outRoot, sim.id);
      const url = `file://${root}/dist/index.html?debugia=1&track=${sim.track}&seed=${sim.seed}`;
      return run(
        'node',
        ['tools/debug/capture-ia-shots.mjs', url, join(simDir, 'screenshots'), chrome],
        root,
      );
    }),
  );
}

console.log(`wrote ${outRoot}`);

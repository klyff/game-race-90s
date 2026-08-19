/**
 * Periodic screenshots of a live debug-IA race over file://.
 * First shot 2s after GO (countdown 3s + 2s), then every 30s until 300s race time.
 */
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';

const require = createRequire(import.meta.url);
function loadPlaywright() {
  try {
    return require('playwright');
  } catch {
    const npx = join(homedir(), '.npm/_npx/e41f203b7505f1fb/node_modules/playwright');
    if (!existsSync(npx)) {
      throw new Error('playwright not found — PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install playwright --no-save');
    }
    return require(npx);
  }
}
const { chromium } = loadPlaywright();

const [url, outDir, chrome] = process.argv.slice(2);
if (!url || !outDir) {
  console.error('usage: node capture-ia-shots.mjs <file-url> <outDir> [chromeBin]');
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: chrome || process.env.CHROME_BIN,
  args: [
    '--allow-file-access-from-files',
    '--autoplay-policy=no-user-gesture-required',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
  ],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.addInitScript(() => {
  Object.defineProperty(document, 'hidden', { get: () => false });
  Object.defineProperty(document, 'visibilityState', { get: () => 'visible' });
});
const errors = [];
page.on('console', m => {
  if (m.type() === 'error') {
    errors.push(m.text());
  }
});
page.on('pageerror', e => errors.push(`PAGEERROR: ${e.message}`));

await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

const started = Date.now();
let ready = false;
while (Date.now() - started < 45000) {
  const info = await page.evaluate(() => {
    const game = window.game;
    if (!game?.scene) {
      return { ready: false, kind: typeof game, scenes: '', elapsed: -1 };
    }
    const scenes = game.scene.getScenes(true).map(s => s.scene.key).join(',');
    const race = game.scene.getScene('race');
    game.loop?.wake?.();
    return {
      ready: Boolean(race?.field),
      kind: game.constructor?.name ?? typeof game,
      scenes,
      elapsed: race?.field?.race?.elapsedSeconds ?? -1,
    };
  });
  console.log(`wait ${info.kind} scenes=${info.scenes} elapsed=${info.elapsed}`);
  if (info.ready) {
    ready = true;
    break;
  }
  await page.waitForTimeout(500);
}

if (!ready) {
  await page.screenshot({ path: join(outDir, 'FAILED-boot.png') });
  console.log('errors:', errors.slice(0, 12));
  await browser.close();
  process.exit(1);
}

const times = [2, 32, 62, 92, 122, 152, 182, 212, 242, 272, 300];
for (const t of times) {
  const waitStart = Date.now();
  while (true) {
    const elapsed = await page.evaluate(() => {
      const race = window.game?.scene?.getScene('race');
      window.game?.loop?.wake?.();
      return race?.field?.race?.elapsedSeconds ?? -1;
    });
    if (elapsed >= t) {
      break;
    }
    if (Date.now() - waitStart > 20000 && elapsed < 0.05) {
      await page.screenshot({ path: join(outDir, `STUCK-t-${String(t).padStart(3, '0')}.png`) });
      console.log(`stuck at elapsed=${elapsed} waiting for t=${t}`);
      console.log('errors:', errors.slice(0, 12));
      await browser.close();
      process.exit(1);
    }
    await page.waitForTimeout(400);
  }
  const name = `t-${String(t).padStart(3, '0')}.png`;
  await page.screenshot({ path: join(outDir, name) });
  console.log(`shot ${name}`);
}

console.log('errors:', errors.length ? errors.slice(0, 8) : 'none');
await browser.close();

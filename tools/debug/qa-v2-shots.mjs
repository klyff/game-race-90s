/**
 * QA-Load / QA-UI screenshots over file:// (Splash → comic → character → garage → 5-car grid).
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
    return require(join(homedir(), '.npm/_npx/e41f203b7505f1fb/node_modules/playwright'));
  }
}
const { chromium } = loadPlaywright();

const url = process.argv[2];
const outDir = process.argv[3];
const chrome = process.argv[4] || process.env.CHROME_BIN;
if (!url || !outDir || !chrome) {
  console.error('usage: node qa-v2-shots.mjs <file-url> <outDir> <chromeBin>');
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: chrome,
  args: ['--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required'],
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

await page.goto(url);

async function sceneKey() {
  return page.evaluate(() => {
    const game = window.game;
    if (!game?.scene) {
      return '';
    }
    const scenes = game.scene.getScenes(true);
    return scenes.map(s => s.scene.key).join(',');
  });
}

async function waitForScene(needle, ms = 20000) {
  const started = Date.now();
  while (Date.now() - started < ms) {
    const keys = await sceneKey();
    if (keys.split(',').includes(needle)) {
      return keys;
    }
    await page.waitForTimeout(200);
  }
  throw new Error(`timed out waiting for ${needle} (have ${await sceneKey()})`);
}

await waitForScene('splash', 25000);
await page.waitForTimeout(400);
await page.screenshot({ path: join(outDir, 'qa-splash.png') });

await page.keyboard.press('Space');
await waitForScene('origin-comic', 8000);
await page.waitForTimeout(300);
await page.screenshot({ path: join(outDir, 'qa-origin.png') });

for (let i = 0; i < 4; i += 1) {
  await page.keyboard.press('Space');
  await page.waitForTimeout(250);
}
await waitForScene('character-select', 8000);
await page.waitForTimeout(300);
await page.screenshot({ path: join(outDir, 'qa-character.png') });

await page.keyboard.press('Enter');
await waitForScene('garage', 8000);
await page.waitForTimeout(400);
await page.screenshot({ path: join(outDir, 'qa-garage.png') });

await page.evaluate(() => {
  const game = window.game;
  const garage = game.scene.getScene('garage');
  const payload = garage?.sys?.settings?.data;
  game.scene.stop('garage');
  game.scene.start('race', {
    manifest: payload?.manifest,
    linesByTrack: payload?.linesByTrack,
    carId: 'car-1',
    trackId: 'thunder-basin',
  });
});
await waitForScene('race', 12000);
await page.waitForTimeout(900);
await page.screenshot({ path: join(outDir, 'qa-grid-5.png') });

await page.goto(`${url.split('?')[0]}?debugia=1&track=thunder-basin&seed=1`);
await waitForScene('race', 25000);
await page.waitForTimeout(900);
await page.screenshot({ path: join(outDir, 'qa-debugia.png') });

console.log('scenes done. errors:', errors.length ? errors.slice(0, 10) : 'none');
await browser.close();

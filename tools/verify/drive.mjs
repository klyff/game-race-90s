import { chromium } from 'playwright';

/**
 * Screenshot the game AFTER driving it through the splash and onto the track.
 *
 *   node tools/verify/drive.mjs <url> <outputPng> [throttleMs]
 *
 * `screenshot.mjs` can hold exactly one key, which was enough while the game booted
 * straight into the race. It no longer does: reaching the road needs SPACE on the splash
 * FIRST and then the throttle, and a capture with no SPACE sits on the title screen
 * forever — which looks nothing like a bug and is very easy to misread as one.
 */
const [url, out, throttleMs = '2600'] = process.argv.slice(2);

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN,
  args: ['--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

await page.goto(url);
await page.waitForTimeout(2200);            // boot + splash art load
await page.keyboard.press('Space');          // leave the splash, entering RaceScene
await page.waitForTimeout(3400);             // sit out the 3 s countdown
await page.keyboard.down('ArrowUp');
await page.waitForTimeout(Number(throttleMs));
await page.screenshot({ path: out });
await page.keyboard.up('ArrowUp');

const scene = await page.evaluate(() => {
  const g = window.game;
  return g?.scene?.scenes?.filter(s => s.scene.isActive()).map(s => s.scene.key) ?? 'no handle';
});
console.log('active scenes:', scene);
console.log('errors:', errors.length ? errors.slice(0, 6) : 'none');
await browser.close();

import { chromium } from 'playwright';

const [url, out, waitMs = '4000', holdKey = '', holdMs = '0'] = process.argv.slice(2);

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN,
  args: ['--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

await page.goto(url);
await page.waitForTimeout(Number(waitMs));

if (holdKey) {
  await page.keyboard.down(holdKey);
  await page.waitForTimeout(Number(holdMs));
}
await page.screenshot({ path: out });
if (holdKey) await page.keyboard.up(holdKey);

console.log('errors:', errors.length ? errors.slice(0, 6) : 'none');
await browser.close();

import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN, args: ['--allow-file-access-from-files','--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errs = [];
page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(process.argv[2]);
await page.waitForTimeout(5000);
const info = await page.evaluate(() => {
  const g = window.game;
  const scene = g && g.scene ? g.scene.getScene('race') : null; if (!scene) return { gameType: typeof g, keys: g ? Object.keys(g).slice(0,25) : null };
  const cam = scene.cameras.main;
  const sprites = scene.children.list
    .filter(o => o.type === 'Sprite')
    .map(s => ({ tex: s.texture.key, x: Math.round(s.x), y: Math.round(s.y), vis: s.visible, alpha: s.alpha, depth: s.depth, frame: s.frame.name }));
  return {
    racers: scene.field ? scene.field.racers.length : 'no field',
    views: scene.views ? scene.views.length : 'no views',
    sprites,
    cam: { sx: Math.round(cam.scrollX), sy: Math.round(cam.scrollY), zoom: cam.zoom, w: cam.width, h: cam.height },
    worldView: { x: Math.round(cam.worldView.x), y: Math.round(cam.worldView.y), w: Math.round(cam.worldView.width), h: Math.round(cam.worldView.height) },
  };
});
console.log(JSON.stringify(info, null, 1));
console.log('errors:', errs.length ? errs.slice(0,5) : 'none');
await browser.close();

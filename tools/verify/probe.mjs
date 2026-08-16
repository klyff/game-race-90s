import { chromium } from 'playwright';

/**
 * Debug-only state dump out of the running game. NEVER use this to accept a rendering
 * change — read the screenshot for that (WORKLOG decision 25). This answers "where did
 * that object actually go", nothing more.
 *
 *   node tools/verify/probe.mjs <url> [sceneKey] [waitMs]
 *
 * The scene key defaults to `race`. It is an argument because the game now opens on
 * `splash`, and a probe hardcoded to one scene reports "no scene" for every other one,
 * which reads exactly like a boot failure.
 */
const [url, sceneKey = 'race', waitMs = '5000'] = process.argv.slice(2);

const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN, args: ['--allow-file-access-from-files','--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errs = [];
page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(url);
await page.waitForTimeout(Number(waitMs));
const info = await page.evaluate(key => {
  const g = window.game;
  const scene = g && g.scene ? g.scene.getScene(key) : null;
  if (!scene) return { gameType: typeof g, keys: g ? Object.keys(g).slice(0,25) : null };
  if (!scene.scene.isActive()) {
    return { key, active: false, running: g.scene.scenes.filter(s => s.scene.isActive()).map(s => s.scene.key) };
  }
  const cam = scene.cameras.main;
  // Every visible game object, so an element that is present but off-viewport shows up
  // as a coordinate outside the camera rather than as a mystery.
  const objects = scene.children.list.map(o => ({
    type: o.type,
    tex: o.texture ? o.texture.key : undefined,
    text: typeof o.text === 'string' ? o.text.slice(0, 40) : undefined,
    x: Math.round(o.x), y: Math.round(o.y),
    w: Math.round(o.displayWidth ?? o.width ?? 0), h: Math.round(o.displayHeight ?? o.height ?? 0),
    vis: o.visible, alpha: o.alpha, depth: o.depth,
    frame: o.frame ? o.frame.name : undefined,
  }));
  return {
    key,
    active: true,
    scale: { w: scene.scale.width, h: scene.scale.height },
    racers: scene.field ? scene.field.racers.length : undefined,
    views: scene.views ? scene.views.length : undefined,
    objects,
    cam: { sx: Math.round(cam.scrollX), sy: Math.round(cam.scrollY), zoom: cam.zoom, w: cam.width, h: cam.height },
    worldView: { x: Math.round(cam.worldView.x), y: Math.round(cam.worldView.y), w: Math.round(cam.worldView.width), h: Math.round(cam.worldView.height) },
  };
}, sceneKey);
console.log(JSON.stringify(info, null, 1));
console.log('errors:', errs.length ? errs.slice(0,5) : 'none');
await browser.close();

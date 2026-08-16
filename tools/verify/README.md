# Verification helpers — seeing the game with your own eyes

An agent session in this repo **cannot run `npm run dev`** (`listen EPERM` on any port) and **cannot
reach `localhost`** through the enforced proxy (502). The only way an agent verifies rendering is:

1. `npm run build` — or `npx vite build --mode development` when you need the `window.game` handle,
   which the production build deliberately strips.
2. Load the build over `file://` in a headless browser and **read the resulting image**.

Reading the image is not optional. A HUD once sat off-viewport for two whole tasks while reporting
`visible: true` with the correct text, because verification read object state instead of pixels
(WORKLOG decision 25).

## Setup

`playwright` is intentionally **not** a project dependency — it is a 150 MB verification tool, not
part of the game. Install it without touching `package.json`:

```bash
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install playwright --no-save
export CHROME_BIN=~/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell
```

**The system Chrome at `/Applications/Google Chrome.app` does not work here**: it aborts with
`Failed to bind() ... SingletonSocket: Operation not permitted`, the same sandbox restriction that
kills the dev server. Use Playwright's cached headless shell, and check the revision number in
`~/Library/Caches/ms-playwright/` — it must match the `playwright` version installed, or Playwright
looks for a revision that was never downloaded.

## screenshot.mjs

```bash
node tools/verify/screenshot.mjs <url> <outputPng> [waitMs] [holdKey] [holdMs]

# the grid, during the countdown
node tools/verify/screenshot.mjs "file://$PWD/dist/index.html" /tmp/grid.png 2200

# mid-race, with the throttle held down for 2.5 s
node tools/verify/screenshot.mjs "file://$PWD/dist/index.html" /tmp/racing.png 3200 ArrowUp 2500
```

**Two flags are load-bearing** and both are already in the script: `--allow-file-access-from-files`,
without which the ES module is blocked by CORS on `file://` and the game silently never boots (the
canvas stays black and `window.game` resolves to the `<div id="game">` element, which is a very
confusing way to learn this); and `--autoplay-policy=no-user-gesture-required`, so audio code paths
actually run instead of being skipped.

**Timing matters when reading the result.** The race opens with a 3 s countdown and the NPCs drive
off the moment it ends, so a screenshot at 5 s with no key held shows an empty grid and one abandoned
player car — which looks exactly like "the other cars are not rendering". Shoot before 3 s to see the
grid, and hold `ArrowUp` to see the pack.

## probe.mjs

For debugging only, never for verification: dumps sprite positions, visibility, depth and the
camera's `worldView` out of the running game.

```bash
npx vite build --mode development   # required: production strips window.game
node tools/verify/probe.mjs "file://$PWD/dist/index.html"
```

Use it to answer "where did that object actually go", then go back to reading the screenshot to
decide whether it looks right.

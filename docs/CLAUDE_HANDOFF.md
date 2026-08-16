# Handoff — Claude team, 2026-08-16 ~05:00

The Cursor session shipped a playable wallet, a per-planet look, and a 90s
finish ceremony. **Your job is the real planet maps and the missing art.**
Do not redo the wallet, the coast, or the ceremony unless they are broken.

Remote: `https://github.com/klyff/game-race-90s`  
Branch: `main`  
Play: `npm run dev` → http://localhost:5173 (or 5174)

---

## What is already in

- **Campaign:** 10 planets × 3 tracks, unlocks (top-3 clears a track; 1st on a
  planet's last track opens the next planet).
- **Wallet:** podium 1st / 50% / 25%, grows per planet and track. Weapon hits
  pay a bounty. Persisted in `localStorage` key `rockn90s.wallet`.
- **Finish:** a car that completed its laps coasts (`src/domain/race/Coast.ts`).
  After the player finishes, the field holds until everyone is nearly stopped
  (or 5.5 s). Then `ResultsScene` slams **WINNER IS {name}**, lists 2nd/3rd
  with prize + score, then ENTER next race / ESC menu.
- **Per-planet look (T-036, first cut):**
  - Palettes in `src/data/tracks/planetThemes.ts`
  - `TrackRenderer` paints wall/shoulder/tarmac/kerb from the theme and tiles
    a ground texture behind the road (2:1 squash so a flat tile sits on the
    dimetric plane).
  - Generated 256² stand-in tiles in `public/assets/ground/<slug>.png`
    (`npm run gen:ground`).
  - Planet-select shows `public/assets/ui/planets/<slug>.jpeg` when present.
    Only **Thunder Basin** has a real illustration today.

---

## What you must do — planet maps and art

The track is **not an image**. `TrackRenderer` draws the road from the spline.
A new circuit is control points + a theme, never a painted overhead map.
Read `docs/art-briefs/planets.md` before touching art.

### Images — where they live

| Path | What it is | Use |
| --- | --- | --- |
| `public/assets/ui/planets/thunder-basin.jpeg` | Prompt A illustration, compressed (~1280 wide). The only finished select art. | Loaded as `planet-thunder-basin`. |
| `public/assets/ui/planets/<slug>.jpeg` | **MISSING for planets 2–10.** | Drop Prompt A 16:9 JPEG here. Boot already loads `planet-<slug>`. Never `import`. |
| `public/assets/ground/<slug>.png` | Stand-in seamless tiles (128², generated). | Replace with real Prompt B 1024² **flat top-down** tiles. Same filename. |
| `docs/art-briefs/references/contact-sheet-illustrations.png` | All 10 planets, labelled grid. **Reference only.** | Do not load in Phaser. Crop/upscale only as a last resort. |
| `docs/art-briefs/references/contact-sheet-tiles-and-props.png` | Per planet: A illustration, B tile, C iso props. **Reference only.** | Same. Column C is the prop brief (2:1 dimetric). |
| `public/assets/ui/splash.jpeg` | Title art. Logo is painted in. | Do not draw a second title. |
| `public/assets/cars/*.png` | 32-frame 64×64 strips. | Leave alone. |
| `public/assets/weapons/{missile,oil,mine}.png` | 4×8 contact sheets, 221×221 frames. | Already wired. |

Planet slugs (must match filenames):

`thunder-basin` `chrome-verge` `bogmire-deep` `cryo-hollow` `ferro-rust`
`vulkanis` `neon-kasbah` `ash-reach` `voidport` `verdant-fault`

### How to wire a real tile or illustration

1. Put the file at the path in the table. Same slug, same key.
2. Ground tiles must be **flat top-down, no iso, no shadows**. The renderer
   projects. A pre-tilted tile gets projected twice and looks stretched.
3. After dropping tiles, pull a tighter palette into `planetThemes.ts` so the
   procedural road matches the new art.
4. Optional next: place Prompt C props around the circuit (rocks, barriers,
   towers) as sprites at `projection.toScreen`, depth `projection.depthOf`.
   Do not bake them into the road graphics.

### Track geometry (if a planet's layout is wrong)

- Authoring: `src/data/tracks/thunder-basin.track.ts` (planet 1 track 1).
- Generated: `src/data/tracks/generated-tracks.ts` via `npm run gen:tracks`.
- Terrain knobs: `src/data/tracks/planets.ts` (`straightBias`,
  `cornerTightness`, `surfaceGrip`, `halfWidth`).
- Lines: `npm run gen:lines` → `public/assets/lines/<trackId>.json`.
- Preview: `npm run gen:track` and **read the PNG**. Do not trust object state.

---

## Constraints (paid for already — do not rediscover)

- Assets under `public/`, loaded by key. Vite inlines `import`ed images.
- `Date.now` / `Math.random` forbidden in domain. Pass time and seeds in.
- HUD is its own scene at zoom 1. `setScrollFactor(0)` does not survive camera zoom.
- Agent sessions cannot `npm run dev` (`listen EPERM`). Ask the owner.
- Headless Chrome cannot hit localhost. Screenshot via `tools/verify/README.md`
  over `file://` after `npm run build`.
- Projection is **2:1 dimetric** (`ISO_X=1`, `ISO_Y=0.5`), 26.57°, not 30°.

## Verify before you call it done

```
npm test && npm run typecheck && npm run build
```

Then play one race on Thunder Basin and one on a later planet. Confirm the
ground colour changes, the ceremony says **WINNER IS**, and BANK rises.

## Do not

- Do not rewrite the wallet, save schema, or cookie budget.
- Do not put cash into the `SaveSlots` cookie.
- Do not treat the contact sheets as loadable game textures.
- Do not commit `.env` or Vercel tokens.

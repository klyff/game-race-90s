# Art briefs — the ten planets (T-034)

Prompts for an image AI, plus the constraints that make the output actually usable in this game.
Written to be re-run: if a planet comes back wrong, change one line here rather than reinventing
the whole prompt.

## What the engine can and cannot use

**The track is not an image and cannot be replaced by one.** `TrackRenderer` derives the road, its
edge lines and the run-off from the spline every frame — that is what lets a new circuit be authored
from control points alone. So do not commission "a racing track seen from above": it cannot be
driven on.

Two things ARE usable:

| Deliverable | Size | Used for |
| --- | --- | --- |
| **A. Area-select art** | 1920 × 1080 (16:9) | One full illustration per planet on the area-select screen. Pure presentation, drop-in, no engine work. |
| **B. Seamless ground tile** | 512 × 512, tileable | The off-road surface for that planet, tiled by `TrackRenderer`. This is what makes a race *feel* like a different world. |

## The projection constraint — the part that is easy to get wrong

This game is a **true 2:1 dimetric ("isometric") projection**, derived from `ISO_X = 1`,
`ISO_Y = 0.5` in `src/domain/constants.ts`:

- every horizontal line rises or falls **exactly 1 pixel for every 2 pixels across** — that is
  **26.57°** from horizontal, NOT the 30° of a true isometric cube;
- it is **orthographic**: no perspective, no vanishing point, no lens distortion. Objects the same
  size are the same size on screen wherever they sit;
- the camera looks down from a fixed angle and **never rotates**.

A generated image at 30°, or with any perspective convergence, will visibly disagree with the cars
driving over it. State the angle explicitly in the prompt and reject output that ignores it.

## Style anchor

The existing splash art (`src/assets/spash.jpeg`) is the reference: illustrated pixel art with hard
edges and a hot, saturated palette — 90s arcade poster energy, dramatic rim lighting, smoke and
fire, deep shadow. Cars are 64 × 64 sprites at `pixelsPerUnit = 8.14`, so ground detail finer than
about 4 px reads as noise once the camera is at its 1.5–2.0× zoom.

---

## Prompt A — area-select illustration (one per planet)

Replace `{PLANET}` with a block from the table below.

```
16-bit SNES-era illustrated pixel art, 90s arcade racing game planet-select
screen. {PLANET}

Composition: a wide establishing shot of the landscape, dramatic and hostile,
built to sit behind menu text. Keep the centre-left third relatively calm and
uncluttered so UI can be laid over it; put the spectacle on the right and along
the horizon. A racing circuit is visible far in the distance as a thin ribbon,
suggested only, never the subject.

Style: hard-edged pixel art, chunky visible pixels, limited palette of roughly
32 colours, dithered gradients rather than smooth ones, strong rim lighting,
heavy atmosphere, high contrast between lit surfaces and deep shadow. Painterly
but unmistakably pixel art. Cinematic, oppressive, exciting.

Aspect ratio 16:9, 1920x1080.

Do not include: any text, any logo, any lettering, any UI, any HUD, any cars,
any vehicles, any people or creatures in the foreground, any watermark, any
frame or border, any modern photorealistic rendering, any 3D render look, any
smooth anti-aliased vector art.
```

## Prompt B — seamless ground tile (one per planet)

```
Seamless tileable texture of {SURFACE}, drawn as 16-bit SNES-era pixel art.

Projection: true 2:1 dimetric isometric — every horizontal line rises or falls
exactly 1 pixel for every 2 across, 26.57 degrees from horizontal.
Orthographic: no perspective, no vanishing point, no camera tilt.

Flat, even, directionless lighting with NO cast shadows and no baked highlights,
so the tile repeats without visible seams or a false sun direction. Detail scale
coarse: nothing finer than about 4 pixels, since this is viewed at a distance
behind moving sprites. Limited palette of roughly 16 colours, dithered.

Must tile seamlessly on all four edges. 512x512.

Do not include: any text, any cars, any track, any road, any road markings, any
barriers, any objects that imply a fixed position, any vignette, any shadows,
any lighting direction, any border.
```

---

## The ten planets

`{PLANET}` is the scene description for Prompt A. `{SURFACE}` is the off-road ground for Prompt B —
this is the terrain *beside* the road, which is what the player slides onto when they get it wrong.

| # | Name | `{PLANET}` | `{SURFACE}` |
| --- | --- | --- | --- |
| 1 | **Thunder Basin** | A red desert basin of towering eroded mesas under a violet storm sky, forked lightning striking the rock, dust devils crossing the flats, distant refinery lights | cracked red-brown desert hardpan with loose gravel and dry channels |
| 2 | **Chrome Verge** | A vast chrome refinery world of pipes, flare stacks and catwalks under a sodium-orange smog sky, jets of burning gas, everything slick and reflective | oil-stained steel grating and poured concrete with rust bleed |
| 3 | **Bogmire Deep** | A drowned swamp of black water and dead trees under a sickly green fog, bioluminescent fungus glowing on the roots, vapour lying flat on the surface | wet black peat and matted reeds with glowing green algae |
| 4 | **Cryo Hollow** | A blue ice canyon lit by a low pale sun, wind-carved walls, frozen waterfalls, aurora across a near-black sky, snow streaming off the ridges | packed snow over blue glacier ice with wind ripples and cracks |
| 5 | **Ferro Rust** | An endless scrapyard of oxidised hulls and crushed machinery under a brown sky, rust dunes, cranes silhouetted on the horizon | rust-orange iron filings and scrap grit with flaking metal plate |
| 6 | **Vulkanis** | A black basalt volcano field with rivers of orange lava, ash falling like snow, the sky a deep red glow, glowing cracks spidering through the rock | black volcanic basalt with glowing lava cracks and grey ash drift |
| 7 | **Neon Kasbah** | A desert night city of clay towers strung with magenta and cyan neon, market awnings, sand blowing across the light, a huge moon low behind the skyline | wind-rippled pale sand with scattered tile shards and neon spill |
| 8 | **Ash Reach** | Grey volcanic ash plains under a colourless overcast sky, the skeletons of dead machines half buried, everything muted and desolate, a single shaft of light | fine grey volcanic ash with pumice stones and buried debris |
| 9 | **Voidport** | An orbital platform of hexagonal deck plating above the swirling violet clouds of a gas giant, stars overhead, docking lights receding into the dark | dark hexagonal deck plating with worn safety chevrons and rivets |
| 10 | **Verdant Fault** | Jungle-swallowed ruins split by a tectonic fault, gold light through the canopy, vines over broken stone arches, waterfalls falling into the crack | mossy stone flagging cracked by roots, wet leaf litter, deep green |

## When the images come back

1. **Check the angle before anything else.** Overlay a 2:1 slope on the image; if the ground planes
   read at 30° or converge toward a vanishing point, regenerate rather than accepting it — every car
   on top of it will look wrong for the whole race.
2. Tiles: verify seamlessness by tiling 3×3 and looking for a repeating hotspot or a seam line.
3. Put them in `public/assets/ui/planets/<slug>.jpeg` and `public/assets/ground/<slug>.png` — served
   from `public/`, never imported, or Vite inlines them into the bundle.
4. Pull the palette out of each finished image into the track's `theme` (road, shoulder, wall and
   line colours) so the procedural road agrees with the commissioned art instead of fighting it.

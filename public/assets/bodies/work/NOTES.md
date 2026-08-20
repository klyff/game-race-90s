# Body matte lab — `public/assets/bodies/work`

Probe set from git `9df15b5` (black studio, before the ImageMagick pass):
`klyff-profile`, `emma-profile`, `hex-profile`, `razor-profile`, `vince-profile`.

Magenta composites for eyeballing: `_compare-magenta/`.

The live files under `bodies/*.png` were **not** overwritten.

## Options

| # | Method | Result |
|---|--------|--------|
| 0 | `belt app run infsh/birefnet` (skill `/background-removal`) | **Blocked.** `belt login` required. Did not run. |
| 1 | `rembg -m u2netp` | Works, weaker edges. Emma and people survive. Tiny model. |
| 2 | `rembg -m u2net` | **Best default.** Black tank / leather / denim stay. Emma jacket intact. Soft foot-shadow fringe on Razor/Vince. |
| 3 | `rembg -m isnet-general-use` | Close to u2net. Hex almost fills the canvas (leftover fringe). |
| 4 | `rembg -m isnet-anime` | **Fail on this art.** Hex nearly gone. Emma reduced to a scrap of fur. |
| 5 | `rembg -m birefnet-general-lite` | Local cousin of the skill's BiRefNet. Klyff / Emma / Hex look clean. Keep this as plan B. |
| 6 | Python shell-mask (`05-python-shell-mask/shell_mask.py`) | Floodfill from the border **plus** an eroded core so the wand cannot walk into the tank. Hard alpha, trim + 10px. Same family as the magick pass — safer than raw `-transparent black`, still a color wand. |

## What worked

- **Neural cutout (rembg), not color.** Black clothes are the same colour as the studio. A wand from the corner will always risk eating the jacket. u2net / birefnet-lite treat the figure as a person and leave the leather.
- Emma (white Pomeranian, black jacket): u2net, isnet-general, birefnet-lite all keep the dog. isnet-anime does not.
- Klyff black tank: rembg keeps it. Python shell-mask also keeps it (core protect).

## What failed

- ImageMagick / naive `-transparent black` / border floodfill **without** a neural mask — that was the ruined pass on the real files.
- `isnet-anime` on black outfits.
- `belt` BiRefNet until someone runs `belt login`.

## Next (when you say go)

1. Batch the roster with `rembg p -m u2net` (or `birefnet-general-lite`) from the **git originals**, write only into `work/`.
2. Optional second pass: hard-threshold alpha + `trim` + 10px. No second wand.
3. Only then copy winners over `bodies/*.png`.

CLI used:

```
export PATH="$HOME/Library/Python/3.11/bin:$PATH"
rembg p -m u2net work/_src work/02-rembg-u2net
```

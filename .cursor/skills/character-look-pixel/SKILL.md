---
name: character-look-pixel
description: >-
  Builds a 16/24-bit pixel-art full-body person from an optional face plus
  bio. Use when the user says character-look-pixel, corpo pixel, look pixel,
  or wants a SNES/arcade full-body character from a face or prompt.
---

# Character look pixel

Same contract as **character-look**:

Temos o rosto e a descrição/bio, e esperamos uma pessoa/corpo inteiro com rosto e cabelos etc como o rosto de entrada, se nao passarmos o rosto como imagem, voce cria com o que tiver de informação no prompt, se nao, crie algo.

Then draw it as **16/24-bit pixel art**. If the `pixel-art` skill is attached, read its `references/patterns.md` before generating. Hard rules are also in [PIXEL.md](PIXEL.md).

Uses Cursor **GenerateImage** when that tool exists in the session. No external image APIs.

## Cloud

This skill lives in the **repo** at `.cursor/skills/character-look-pixel/` so Cloud Agents pick it up. Cursor Cloud does **not** read `~/.cursor/skills/` or `~/.claude/skills/` from the laptop.

- If this session has **GenerateImage**, use it. Do not spend image tokens knocking out the background.
- If this session has **no GenerateImage** (some Cloud VMs), stop and say so. Do not call an external image API, do not fake a sprite.
- After gen, knock out the studio with **rembg** (person-aware). Never a color wand / ImageMagick floodfill / `-transparent black` — black clothes sit on the same threshold as a black studio.

## Inputs (any mix)

| Have | Do |
|------|----|
| Face image | Lock identity. `reference_image_paths`. Translate the face into chunky pixels — do not photoreal-paste it. |
| Bio / prompt | Clothes, build, era from the text. |
| Neither | Invent a coherent pixel person. Do not ask. Create something. |

## Workflow

```
- [ ] Face? Lock shape, eyes, hair, skin, marks. Plan how each reads at pixel scale (suggest, do not render pores).
- [ ] Bio? Lock clothes and silhouette.
- [ ] Fill gaps. Invent.
- [ ] Write the ANCHOR (same fields as character-look).
- [ ] GenerateImage with the pixel lock below (skip if the tool is missing).
- [ ] Local rembg matte + trim (never spend image tokens to knock out the bg).
- [ ] Reject if photoreal, mushy AA, or the face/hair drifted.
```

## GenerateImage

- Aspect `3:4`.
- Filename: `{slug}-look-pixel.png`.
- Attach the face when one exists (identity only — the output must still be pixel art).

Prompt suffix (always):

```
16/24-bit SNES-era illustrated pixel art, 90s arcade.
Chunky visible pixels, hard edges, no anti-aliasing, no photoreal, no 3D render, no watermark.
Hue-shifted shading (cool shadows, warm lights), selective outlines, one ordered dither style only.
Full-body standing, 3/4, head to shoes, readable silhouette.
Same person as the attached face / the anchor: {lock list}.
Clothes: {bio clothes}.
Transparent background, no studio fill, no black backdrop. No extra people. No text. No UI.
```

If you cannot identify the figure at 1x in your head, simplify the clothes and hair before generating.

After GenerateImage the studio is often opaque black. Knock it out with a **neural** cutout, not a colour threshold. Black tank / leather / denim match studio black; a border floodfill will eat the clothes.

```
export PATH="$HOME/Library/Python/3.11/bin:$PATH"
# install once if missing: python3 -m pip install 'rembg[cpu,cli]'
rembg i -m u2net in.png out.png
magick out.png -trim +repage -bordercolor none -border 10 PNG32:out.png
```

Plan B model: `birefnet-general-lite`. Do **not** use `isnet-anime` on this art. Do **not** use ImageMagick `-fuzz` floodfill / `-transparent black` as the matte. Lab notes: `public/assets/bodies/work/NOTES.md`.

Do not call GenerateImage again just to remove the background.

## Output

One full-body **PNG32 ARGB** still (fully transparent behind the figure). Then the lock list and save path.

Do not mix pixel scales. Do not pillow-shade. Do not outline-AA to the background. Do not ship an opaque black or dark studio.

## Extra

- Pixel rules: [PIXEL.md](PIXEL.md)
- Input examples: follow character-look `examples.md` (pixel output instead of paint)

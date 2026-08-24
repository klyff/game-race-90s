# Missile strip

Live playable missile uses the **same 32-frame CCW clock as the cars**.

- **32 frames** · **+11.25°** · **counter-clockwise**
- **Index 0 = 0° = 6h** (nose toward the bottom of the screen)
- Generate **only 0–16**; frames 17–31 are a yaw-axis flip of 15–1
- Game cell: **28×28** (`missile_strip_28.png`, one horizontal row)
- Exhaust: **4 frames** (`missile_exhaust.png`, 16×16), cycled on the tail
- HUD still: **frame 07** → `public/assets/ui/hud/hud-missile.png`

Do not ask GenerateImage for frames 17–31. Do not use the old 8×4 / 221px / CW sheet for the live missile. `npm run gen:weapons` never overwrites this strip.

Identity: silver dart, red nose and fins, arcade pixel art. Medium block from isometric-car-spinner `prompt_template.md` is mandatory on every GenerateImage call.

# car-1 — Marauder

This folder is the only identity source. Do not open game code. Do not project 3D parts. Draw the hero at each clock pose.

## Lock

- **Id:** `car-1`
- **Name:** Marauder
- **Archetype:** Balanced muscle — Thunder Basin titular
- **Silhouette:** Wide, low 2-door coupe. Long hood, short deck, fat rear wing on two struts.
- **Body:** Saturated electric blue metal (`#0570ff`–`#0aa0ff`). Darker blue in shadow (`#023880`).
- **Stripes:** Two lighter cyan-blue racing stripes, hood center through the roof, stopping before the spoiler.
- **Glass:** Pale cyan canopy, almost white at the highlight (`#a8e2f5`).
- **Weapons:** Two twin-barrel cannons bolted on the hood, left and right of the stripes. Dark grey barrels, **orange** dots on top. Same count and place in every frame that shows the hood.
- **Lights:** Twin warm-yellow headlights on the nose. Small orange marker lights on the front and rear fenders. Rear: red/orange tails under the wing.
- **Wheels:** Four fat racing slicks, black multi-spoke centers, thin silver lip.
- **Outline:** Dark, chunky 16-bit edge. No soft glow except the headlight bloom already on the hero.

## Do not change

- Color family (this car is **blue**, not the procedural red).
- Dual hood cannons.
- Dual roof/hood stripes.
- Big rear wing.
- Four wheels.
- Coupe proportions (do not turn it into a truck, bike, or tank).

## Refs in this pack

| File | Role |
| --- | --- |
| `hero.png` | **Modelo.** 3/4 front-right HQ. Copy this look. |
| `identity-sheet.png` | Old 32-wide sheet. Use only to count parts (wing, guns, wheels). **Do not copy its poses** — several frames lie about front vs rear. |

No separate front / side / rear stills exist. Invent those views from the hero + the clock, not from the old sheet.

## Outputs

Write into `./out/` (same folder as this file):

- `00.png` … `31.png` (128×128)
- `hq-right.png` (512×512, same pose family as frame 0)
- `hq-left.png` (512×512, same pose family as frame 8)

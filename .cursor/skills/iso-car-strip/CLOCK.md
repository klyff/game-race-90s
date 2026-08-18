# Clock — 32 poses

The hero may face left or right. **Ignore that.** Frame 0 is always nose **down-right**. Draw the yaw. Do not rotate the hero.

Minute hand on a clock painted on the track. **12 is the top of the screen.** The car's **nose** points at the minute mark.

- 60 min = 360°. One frame = **11.25° = 1.875 min**.
- Frame `k` minute = `(22.5 + k × 1.875) mod 60`.
- Frame 0 starts at **22.5 min (4:30)** = nose **down-right** = world +X.
- Walk is **clockwise on screen** (increasing heading). Never walk the other way.

Yaw is `k × 11.25` degrees. Do not skip, swap, or mirror rows.

## Size — fixed world, not fill-the-cell

The car's world size never changes (~4.0 long, 1.9 wide, 1.2 tall). The 128 cell is drawn at **2×** fleet ppu (16.287). Pin **(64, 70)**.

Do **not** scale the car to fill the cell. Empty space past 4px is correct.

| Kind | Frames | About |
| --- | ---: | --- |
| 3/4 | 0, 8, 16, 24 | ~90×60 px |
| full front / rear | 4, 20 | ~50×58 px — more empty left/right |
| profile | 12, 28 | ~90×38 px — wide and low, more empty above |

Same car as frame 0. Only the yaw changes.

## Anchors (draw these first)

| Frame | Minute | Face | Nose on screen | What you see |
| ---: | ---: | --- | --- | --- |
| 0 | 22.5 | 4:30 | down-right | 3/4 **front** right — grille, headlights, hood guns |
| 4 | 30.0 | 6:00 | down | coming at camera — full front |
| 8 | 37.5 | 7:30 | down-left | 3/4 **front** left — grille, headlights, hood guns |
| 12 | 45.0 | 9:00 | left | left profile — nose left, spoiler right |
| 16 | 52.5 | 10:30 | up-left | 3/4 **rear** left — spoiler, exhaust; nose away |
| 20 | 0.0 | 12:00 | up | going away — full rear |
| 24 | 7.5 | 1:30 | up-right | 3/4 **rear** right — spoiler, exhaust |
| 28 | 15.0 | 3:00 | right | right profile — nose right, spoiler left |

Frame 0 and frame 16 are **opposites**. If they show the same end of the car, the strip is wrong.

## Full table

| Frame | Minute | Face | Yaw° | Nose | Sees |
| ---: | ---: | --- | ---: | --- | --- |
| 0 | 22.5 | 4:30 | 0.00 | down-right | 3/4 front right |
| 1 | 24.375 | 4:53 | 11.25 | down-right | 3/4 front right, a little more frontal |
| 2 | 26.25 | 5:15 | 22.50 | down-right | front-right, almost coming at you |
| 3 | 28.125 | 5:38 | 33.75 | down | front, slight right |
| 4 | 30.0 | 6:00 | 45.00 | down | full front |
| 5 | 31.875 | 6:23 | 56.25 | down | front, slight left |
| 6 | 33.75 | 6:45 | 67.50 | down-left | front-left, almost coming at you |
| 7 | 35.625 | 7:08 | 78.75 | down-left | 3/4 front left, a little more frontal |
| 8 | 37.5 | 7:30 | 90.00 | down-left | 3/4 front left |
| 9 | 39.375 | 7:53 | 101.25 | down-left | 3/4 front left, more side |
| 10 | 41.25 | 8:15 | 112.50 | left | front-left profile |
| 11 | 43.125 | 8:38 | 123.75 | left | left profile, slight front |
| 12 | 45.0 | 9:00 | 135.00 | left | left profile |
| 13 | 46.875 | 9:23 | 146.25 | left | left profile, slight rear |
| 14 | 48.75 | 9:45 | 157.50 | up-left | rear-left profile |
| 15 | 50.625 | 10:08 | 168.75 | up-left | 3/4 rear left, more side |
| 16 | 52.5 | 10:30 | 180.00 | up-left | 3/4 rear left |
| 17 | 54.375 | 10:53 | 191.25 | up-left | 3/4 rear left, more rear |
| 18 | 56.25 | 11:15 | 202.50 | up | rear-left, almost going away |
| 19 | 58.125 | 11:38 | 213.75 | up | rear, slight left |
| 20 | 0.0 | 12:00 | 225.00 | up | full rear |
| 21 | 1.875 | 12:23 | 236.25 | up | rear, slight right |
| 22 | 3.75 | 12:45 | 247.50 | up-right | rear-right, almost going away |
| 23 | 5.625 | 1:08 | 258.75 | up-right | 3/4 rear right, more rear |
| 24 | 7.5 | 1:30 | 270.00 | up-right | 3/4 rear right |
| 25 | 9.375 | 1:53 | 281.25 | up-right | 3/4 rear right, more side |
| 26 | 11.25 | 2:15 | 292.50 | right | rear-right profile |
| 27 | 13.125 | 2:38 | 303.75 | right | right profile, slight rear |
| 28 | 15.0 | 3:00 | 315.00 | right | right profile |
| 29 | 16.875 | 3:23 | 326.25 | right | right profile, slight front |
| 30 | 18.75 | 3:45 | 337.50 | down-right | front-right profile |
| 31 | 20.625 | 4:08 | 348.75 | down-right | 3/4 front right, more side |

## Lights and parts by yaw

- **Headlights (yellow)** and **hood guns**: visible on frames 28–8 (the front half).
- **Taillights (red/orange)** and **spoiler / exhaust**: visible on frames 12–24 (the rear half).
- **Both** can show on the four profiles (10–14 and 26–30) — guns toward the nose, spoiler toward the tail.
- Never put the spoiler on the grille end. Never put the guns on the tail.

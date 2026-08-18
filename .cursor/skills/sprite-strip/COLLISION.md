# Collision — one square, midpoint

The sprite cell can be large. Hits use a **car attribute**, not painted fill, not a per-yaw map.

## One box for every yaw

No loop over poses. One size covers the whole clock.

Source rectangle comes from the authored **world solids** (`groundExtents` in `tools/spritegen`), not from the PNG:

- `collisionAlong` — half-length along heading
- `collisionAcross` — half-width across heading

Then the squares:

| Field | Meaning |
| --- | --- |
| `collisionSquareMin` | Largest square **inside** the car = `min(along, across)` |
| `collisionSquareMax` | Smallest square that **contains** the car = `max(along, across)` |
| `collisionSquare` | **The hit box** = `(min + max) / 2` |

All four sides of the live box sit in the middle between min and max. Car-to-car uses that square (`along = across = collisionSquare`). Walls and weapons still use `collisionRadius`.

Marauder example: along 1.98, across 1.09 → min 1.09, max 1.98, **square 1.535**.

## Where it lives

- Types: `src/domain/vehicle/VehicleStats.ts`, `CollisionMap.ts` (`collisionSquares`, `collisionBoxFromStats`)
- Numbers: `public/assets/cars/cars.json` (folded at parse if missing)
- Generate: `npm run gen:collision-maps` → `tools/spritegen/write-collision-maps.ts`
- Fleet solids share a box: marauder → car-1/2/5, air-blade → turbo cars, etc. (`FLEET_MODEL_ID` in `tools/spritegen/collision-map.ts`)

Domain must not import `tools/`. Do not invent a per-pose map.

## After a new strip

Images first. Then rewrite the stats:

```bash
npm run gen:collision-maps
```

`--install` also refreshes that car's box from the same solids. It does not measure the PNG.

# Reference frames (the 32 pose-reference photos)

Drop your 32 source photos of the base car in here, named:

```
frame_0.png
frame_1.png
...
frame_31.png
```

**Do not use this folder for generation.** The live pose clock lives only at
`/Users/klyff/.cursor/skills/isometric-car-spinner/assets/reference_frames`.

Those photos are a DeLorean **angle gabarito** (camera, yaw, scale, axis).
They are not a body or livery to reskin. New specs inherit the pose clock,
not the DeLorean silhouette.

## Required convention (must match exactly, or every downstream step breaks)

- **`frame_0.png` = 0° = the car pointing to 6 o'clock** — i.e. facing the
  bottom of the frame / toward the camera, in the fixed isometric view.
- Index increases in **counter-clockwise** yaw steps of exactly **11.25°**
  (360° / 32 frames): `frame_1` = 11.25°, `frame_2` = 22.5°, ... `frame_31`
  = 348.75°. One more 11.25° step from `frame_31` returns to `frame_0`.
- Same camera height/tilt, same canvas size, same rotation axis (image
  center) across all 32 — these are real photos of a physical turntable
  spin, not renders, so keep the shoot itself consistent; the skill can
  tolerate photo-to-photo noise but not a systematic axis/scale drift.

## What happens if this folder is empty or incomplete

`SKILL.md` and `MISSION.md` both check for all 32 files here before doing
anything else. If any are missing, the skill stops and asks you to supply
them — it does not substitute placeholders or guess.

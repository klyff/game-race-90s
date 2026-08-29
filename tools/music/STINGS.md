# Screen stings

Recorded one-shots under `public/assets/audio/music/stings/`.

## Files

| File | Length | When it plays |
|---|---|---|
| `guitar-solo.mp3` | ~3s | Splash — Space to enter the game (before origin comic) |
| `rock-scream.mp3` | ~2s | Character select confirm · save-slot pick · world-pass open |

## World pass

On world-pass enter the scream plays **over** a random rock bed from
`music/beds/*.mp3` (`attachMenuAudio` + `playWorldPassFanfare`).

## Runtime

- Stings are HTMLAudio bridge one-shots — they are **not** killed by
  `stopAllScreenAudio`, so they can finish across scene changes.
- Mute (`M` / AUDIO OFF) silences beds and stings.
- Results screen has no sting (bed only); leave goes straight to pass or garage.

## Specs

- MP3, stereo, 44.1 kHz
- Original / royalty-free — no copyrighted riffs or licensed vocals
- Peak below 0 dB; game volume ~60–70%

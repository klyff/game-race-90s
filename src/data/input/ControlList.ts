/**
 * Authoritative command list for the Help screen and any overlay that
 * reprints the pad. Keep this in sync with KeyboardDriver and MenuController.
 */

export interface ControlRow {
  readonly keys: string;
  readonly action: string;
}

export const RACE_DRIVE_CONTROLS: readonly ControlRow[] = [
  { keys: 'UP', action: 'THROTTLE' },
  { keys: 'DOWN', action: 'BRAKE  ·  HOLD TO REVERSE' },
  { keys: 'LEFT / RIGHT', action: 'STEER' },
  { keys: 'SPACE', action: 'BRAKE' },
  { keys: 'LEFT SHIFT', action: 'TURBO' },
];

export const RACE_WEAPON_CONTROLS: readonly ControlRow[] = [
  { keys: 'C', action: 'FIRE MISSILE' },
  { keys: 'X', action: 'DROP LANDMINE' },
  { keys: 'Z', action: 'DROP OIL' },
];

export const AUDIO_CONTROLS: readonly ControlRow[] = [
  { keys: 'M', action: 'MUTE ALL  ·  SFX + MUSIC' },
  { keys: 'N', action: 'MUSIC ON / OFF  ·  RACE' },
  { keys: 'PAUSE ← →', action: 'AUDIO  ·  MUSIC  ·  NARRATION' },
];

export const RACE_SYSTEM_CONTROLS: readonly ControlRow[] = [
  { keys: 'ESC', action: 'PAUSE' },
  { keys: '[ / ]', action: 'ZOOM IN  ·  ZOOM OUT' },
  { keys: '0', action: 'RESET CAMERA' },
  { keys: 'H', action: 'CONTROLS' },
];

export const WATCH_CONTROLS: readonly ControlRow[] = [
  { keys: 'F', action: 'CAMERA  ·  CHASE / BROADCAST' },
  { keys: 'LEFT / RIGHT', action: 'NEXT PLACE  ·  BACK TO LEADER' },
  { keys: ', / .', action: 'PREVIOUS TRACK  ·  NEXT TRACK' },
  { keys: '[ / ] / 0', action: 'ZOOM IN  ·  ZOOM OUT  ·  RESET' },
  { keys: 'L', action: 'BACK TO THE LEADER' },
];

export const MENU_CONTROLS: readonly ControlRow[] = [
  { keys: 'UP / DOWN', action: 'MOVE CURSOR' },
  { keys: 'LEFT / RIGHT', action: 'CHANGE VALUE  ·  CYCLE CARS' },
  { keys: 'ENTER / SPACE', action: 'SELECT' },
  { keys: 'ESC', action: 'BACK' },
  { keys: 'TAB', action: 'NEXT GARAGE BUTTON' },
  { keys: 'H', action: 'CONTROLS' },
  { keys: 'M', action: 'MUTE ALL' },
  { keys: 'P', action: 'WATCH  ·  15 BOTS (SPLASH)' },
];

function controlBlock(title: string, rows: readonly ControlRow[]): string {
  const lines = rows.map(row => `${row.keys.padEnd(16)}  ${row.action}`);
  return `${title}\n${lines.join('\n')}`;
}

/** Two-column pad card so Help fits a 16:9 safe zone. */
export function formatHelpColumns(): readonly [string, string] {
  return [
    [
      controlBlock('DRIVE', RACE_DRIVE_CONTROLS),
      controlBlock('WEAPONS', RACE_WEAPON_CONTROLS),
      controlBlock('AUDIO', AUDIO_CONTROLS),
    ].join('\n\n'),
    [
      controlBlock('RACE', RACE_SYSTEM_CONTROLS),
      controlBlock('WATCH', WATCH_CONTROLS),
      controlBlock('MENUS', MENU_CONTROLS),
    ].join('\n\n'),
  ];
}

/** Full pad card for the garage Controls menu and the pause Help overlay. */
export function formatHelpBody(): string {
  return formatHelpColumns().join('\n\n');
}

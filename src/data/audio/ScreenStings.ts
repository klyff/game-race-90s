/**
 * One-shot recorded stings for results / world-pass transitions.
 * Replaces the old Web Audio sawtooth “guitar” and radio square-wave jingle.
 */

export const SCREEN_STING_DIRECTORY = 'assets/audio/music/stings';

export interface ScreenSting {
  readonly id: string;
  readonly file: string;
  readonly title: string;
  readonly durationSeconds: number;
}

export const GUITAR_SOLO_STING: ScreenSting = {
  id: 'guitar-solo',
  file: 'guitar-solo.mp3',
  title: 'Guitar Solo',
  durationSeconds: 3,
};

export const ROCK_SCREAM_STING: ScreenSting = {
  id: 'rock-scream',
  file: 'rock-scream.mp3',
  title: 'Rock Scream',
  durationSeconds: 2,
};

export const SCREEN_STINGS: readonly ScreenSting[] = [GUITAR_SOLO_STING, ROCK_SCREAM_STING];

export function screenStingUrl(sting: ScreenSting): string {
  return `${SCREEN_STING_DIRECTORY}/${sting.file}`;
}

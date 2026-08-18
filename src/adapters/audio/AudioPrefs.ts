/**
 * Session-wide mute. Splash, results, pause and race all read the same flag
 * so M on the title still holds when the race starts.
 */
let muted = false;

export function isAudioMuted(): boolean {
  return muted;
}

export function setAudioMuted(next: boolean): void {
  muted = next;
}

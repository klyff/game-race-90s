import { describe, expect, it } from 'vitest';
import { ORIGIN_PANELS } from '../../src/data/cards/OriginComic.ts';
import { isAuthoredTrackId } from '../../src/data/tracks/planets.ts';
import { findTrack } from '../../src/data/tracks/registry.ts';
import { DEBUG_IA_CAMERA_MAP_FRACTION } from '../../src/domain/race/DebugIaField.ts';
import { CAMERA_PLAYER_MAP_FRACTION } from '../../src/domain/camera/CameraPreset.ts';
import { RADIO_JINGLE_DURATION_SECONDS } from '../../src/adapters/audio/RadioJingle.ts';

describe('V2 origin, camera, radio, bogmire', () => {
  it('has four comic panels', () => {
    expect(ORIGIN_PANELS).toHaveLength(4);
    expect(ORIGIN_PANELS[0]?.city).toBe('TOKYO');
  });

  it('pulls the debug-IA camera out to the whole circuit', () => {
    expect(DEBUG_IA_CAMERA_MAP_FRACTION).toBe(1);
  });

  it('sits the player camera a little farther than debug-IA', () => {
    expect(CAMERA_PLAYER_MAP_FRACTION).toBeGreaterThan(DEBUG_IA_CAMERA_MAP_FRACTION);
  });

  it('keeps the radio sting under 3 seconds', () => {
    expect(RADIO_JINGLE_DURATION_SECONDS).toBeGreaterThan(1);
    expect(RADIO_JINGLE_DURATION_SECONDS).toBeLessThan(3);
  });

  it('authors Bogmire I with a teaching lip and a void 45°', () => {
    expect(isAuthoredTrackId('bogmire-deep-1')).toBe(true);
    const track = findTrack('bogmire-deep-1');
    expect(track.rampZones?.map(zone => zone.inclineDegrees)).toEqual([15, 45]);
  });
});

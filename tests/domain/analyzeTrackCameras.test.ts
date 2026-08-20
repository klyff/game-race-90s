import { describe, expect, it } from 'vitest';
import { analyzeTrackCameras, countTriggers } from '../../src/domain/camera/analyzeTrackCameras.ts';
import { CAMERA_TRIGGER_KIND } from '../../src/domain/camera/CameraPreset.ts';
import { thunderBasin } from '../../src/data/tracks/thunder-basin.track.ts';
import { thunderBasinTwo } from '../../src/data/tracks/thunder-basin-2.track.ts';

describe('analyzeTrackCameras', () => {
  const preset = analyzeTrackCameras(thunderBasin);

  it('tags Thunder Basin with a long speed/straight, a hairpin, and three ramps', () => {
    expect(preset.trackId).toBe('thunder-basin');
    expect(
      countTriggers(preset, CAMERA_TRIGGER_KIND.SPEED) +
        countTriggers(preset, CAMERA_TRIGGER_KIND.STRAIGHT),
    ).toBeGreaterThanOrEqual(1);
    expect(countTriggers(preset, CAMERA_TRIGGER_KIND.CURVE)).toBeGreaterThanOrEqual(1);
    expect(countTriggers(preset, CAMERA_TRIGGER_KIND.RAMP)).toBe(3);
  });

  it('keeps the long bottom straight as a speed run', () => {
    const speed = preset.triggers.find(trigger => trigger.kind === CAMERA_TRIGGER_KIND.SPEED);
    expect(speed).toBeDefined();
    expect(speed!.targetZoom).toBeLessThan(1.1);
  });

  it('zooms in on the west hairpin', () => {
    const curves = preset.triggers.filter(trigger => trigger.kind === CAMERA_TRIGGER_KIND.CURVE);
    expect(curves.some(trigger => trigger.targetZoom >= 2.2)).toBe(true);
  });

  it('tags Basin II with two ramp triggers matching the authored lips', () => {
    const two = analyzeTrackCameras(thunderBasinTwo);
    expect(countTriggers(two, CAMERA_TRIGGER_KIND.RAMP)).toBe(2);
    const ramps = two.triggers.filter(t => t.kind === CAMERA_TRIGGER_KIND.RAMP);
    expect(ramps.map(r => r.startDistance)).toEqual([420, 1520]);
  });
});

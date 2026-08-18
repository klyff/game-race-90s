import { describe, expect, it } from 'vitest';
import { AccidentWatch } from '../../src/domain/camera/AccidentWatch.ts';
import { CAMERA_ACCIDENT_HOLD_SECONDS } from '../../src/domain/camera/CameraPreset.ts';

describe('AccidentWatch', () => {
  it('holds the first car of a 2-car hit above the threshold', () => {
    const watch = new AccidentWatch();
    watch.note(
      [{ carIdA: 'a', carIdB: 'b', impactSpeed: 12, position: { x: 0, y: 0 } }],
      6,
      0.016,
    );
    expect(watch.targetCarId()).toBe('a');
    watch.note([], 6, CAMERA_ACCIDENT_HOLD_SECONDS - 0.1);
    expect(watch.targetCarId()).toBe('a');
    watch.note([], 6, 0.2);
    expect(watch.targetCarId()).toBeNull();
  });

  it('ignores glancing contacts', () => {
    const watch = new AccidentWatch();
    watch.note(
      [{ carIdA: 'a', carIdB: 'b', impactSpeed: 2, position: { x: 0, y: 0 } }],
      6,
      0.016,
    );
    expect(watch.targetCarId()).toBeNull();
  });

  it('jumps to the densest cluster', () => {
    const watch = new AccidentWatch();
    const id = watch.jumpToCluster([
      { carId: 'alone', position: { x: 400, y: 400 } },
      { carId: 'p1', position: { x: 0, y: 0 } },
      { carId: 'p2', position: { x: 8, y: 0 } },
      { carId: 'p3', position: { x: 4, y: 6 } },
    ]);
    expect(['p1', 'p2', 'p3']).toContain(id);
  });
});

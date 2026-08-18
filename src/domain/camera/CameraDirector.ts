import {
  CAMERA_HOME_ZOOM,
  CAMERA_MANUAL_HOLD_SECONDS,
  CAMERA_MAX_ZOOM_IN,
  distanceInSpan,
  type CameraPreset,
  type CameraTrigger,
} from './CameraPreset.ts';

export const CAMERA_OVERRIDE = {
  NONE: 'none',
  MANUAL: 'manual',
  TRIGGER: 'trigger',
} as const;

export type CameraOverride = (typeof CAMERA_OVERRIDE)[keyof typeof CAMERA_OVERRIDE];

export interface CameraDirectorSample {
  readonly zoom: number;
  readonly override: CameraOverride;
}

/**
 * Priority stack: manual `[` `]` (10s) > track trigger (3s) > live policy.
 * Tecla 0 cancels the manual window and lets triggers resume.
 */
export class CameraDirector {
  private override: CameraOverride = CAMERA_OVERRIDE.NONE;
  private overrideZoom = CAMERA_HOME_ZOOM;
  private remaining = 0;
  private lastDistance = 0;
  private lastTrigger: CameraTrigger | null = null;

  zoomIn(maxZoomIn: number = CAMERA_MAX_ZOOM_IN): void {
    this.override = CAMERA_OVERRIDE.MANUAL;
    this.overrideZoom = maxZoomIn;
    this.remaining = CAMERA_MANUAL_HOLD_SECONDS;
  }

  zoomOut(maxZoomOut: number): void {
    this.override = CAMERA_OVERRIDE.MANUAL;
    this.overrideZoom = Math.max(0.05, maxZoomOut);
    this.remaining = CAMERA_MANUAL_HOLD_SECONDS;
  }

  resetToDefault(): void {
    this.override = CAMERA_OVERRIDE.NONE;
    this.remaining = 0;
    this.lastTrigger = null;
  }

  sample(
    deltaSeconds: number,
    liveZoom: number,
    distance: number,
    preset: CameraPreset,
    lapLength: number,
  ): CameraDirectorSample {
    const dt = Number.isFinite(deltaSeconds) && deltaSeconds > 0 ? deltaSeconds : 0;
    if (this.override === CAMERA_OVERRIDE.MANUAL) {
      this.remaining = Math.max(0, this.remaining - dt);
      if (this.remaining > 0) {
        this.lastDistance = distance;
        return { zoom: this.overrideZoom, override: CAMERA_OVERRIDE.MANUAL };
      }
      this.override = CAMERA_OVERRIDE.NONE;
    }

    const entered = this.enteredTrigger(distance, preset.triggers, lapLength);
    if (entered !== null) {
      this.override = CAMERA_OVERRIDE.TRIGGER;
      this.overrideZoom = entered.targetZoom;
      this.remaining = entered.holdSeconds;
      this.lastTrigger = entered;
    }

    if (this.override === CAMERA_OVERRIDE.TRIGGER) {
      this.remaining = Math.max(0, this.remaining - dt);
      if (this.remaining > 0) {
        this.lastDistance = distance;
        return { zoom: this.overrideZoom, override: CAMERA_OVERRIDE.TRIGGER };
      }
      this.override = CAMERA_OVERRIDE.NONE;
      this.lastTrigger = null;
    }

    this.lastDistance = distance;
    return { zoom: liveZoom, override: CAMERA_OVERRIDE.NONE };
  }

  private enteredTrigger(
    distance: number,
    triggers: readonly CameraTrigger[],
    lapLength: number,
  ): CameraTrigger | null {
    for (const trigger of triggers) {
      const nowIn = distanceInSpan(
        distance,
        trigger.startDistance,
        trigger.endDistance,
        lapLength,
      );
      const wasIn = distanceInSpan(
        this.lastDistance,
        trigger.startDistance,
        trigger.endDistance,
        lapLength,
      );
      if (nowIn && !wasIn && trigger !== this.lastTrigger) {
        return trigger;
      }
    }
    return null;
  }
}

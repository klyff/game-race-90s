/** One authored or generated seat on the shoulder. */
export interface TrapSlot {
  readonly distance: number;
  /** Signed offset from the centreline, positive left of travel. */
  readonly lateral: number;
}

export const TRAP_KIND = {
  CRATE: 'crate',
  GASOLINE: 'gasoline',
} as const;
export type TrapKind = (typeof TRAP_KIND)[keyof typeof TRAP_KIND];

/** Candidate pool for one circuit. Spawn counts are decided at race load. */
export interface TrackTrapCatalog {
  readonly trackId: string;
  readonly worldIndex: number;
  readonly crates: readonly TrapSlot[];
  readonly drums: readonly TrapSlot[];
}

/** One trap that actually sits on the asphalt this race. */
export interface PickedRaceTrap {
  readonly kind: TrapKind;
  readonly distance: number;
  readonly lateral: number;
  /** 1–3 pieces at the same seat. */
  readonly stackHeight: number;
}

export interface TrackDebris {
  readonly id: number;
  readonly kind: 'wood' | 'metal';
  readonly position: { readonly x: number; readonly y: number };
  readonly radius: number;
  readonly lifeRemaining: number;
}

export interface TrapSmashCue {
  readonly kind: TrapKind;
  readonly position: { readonly x: number; readonly y: number };
}

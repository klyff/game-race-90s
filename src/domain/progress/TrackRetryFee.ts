/**
 * Same-track retry tax after repeated losses. Pure: no storage, no Phaser.
 *
 * Owner rule: once a racer has upgraded off the starter, three off-podium
 * finishes on one circuit start charging 10% of the bank to run that circuit
 * again. A broke bank falls through to 10% of respect. Empty bank and empty
 * respect is Game Over. The starter car never pays and never increments losses.
 */

import { isStarterCar } from './GarageCatalog.ts';
import { formatCash } from './Wallet.ts';

/** Off-podium finishes before the next start on that track costs money. */
export const RETRY_LOSS_THRESHOLD = 3;

/** Fraction of the current bank (or respect, if the bank is empty) taken as the fee. */
export const RETRY_FEE_FRACTION = 0.1;

/** Podium is 1st–3rd. Anything worse is a defeat for this tax. */
export const PODIUM_LAST_PLACE = 3;

export const RETRY_FEE_KIND = {
  NONE: 'none',
  CASH: 'cash',
  POINTS: 'points',
  GAME_OVER: 'game-over',
} as const;

export type RetryFeeKind = (typeof RETRY_FEE_KIND)[keyof typeof RETRY_FEE_KIND];

export interface RetryLevy {
  readonly kind: RetryFeeKind;
  readonly amount: number;
}

export function isUpgradedRacer(carId: string): boolean {
  return carId !== '' && !isStarterCar(carId);
}

export function isTrackDefeat(position: number): boolean {
  return Number.isFinite(position) && position > PODIUM_LAST_PLACE;
}

export function trackLossCount(losses: Readonly<Record<string, number>>, trackId: string): number {
  const raw = losses[trackId];
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) {
    return 0;
  }
  return Math.floor(raw);
}

/**
 * After a finish: count a loss only for an upgraded car off the podium.
 * A podium finish clears that track's streak so the tax does not linger.
 */
export function nextTrackLosses(
  losses: Readonly<Record<string, number>>,
  trackId: string,
  position: number,
  carId: string,
): Readonly<Record<string, number>> {
  if (!isUpgradedRacer(carId) || trackId === '') {
    return losses;
  }
  if (!isTrackDefeat(position)) {
    if (!(trackId in losses)) {
      return losses;
    }
    const cleared = { ...losses };
    delete cleared[trackId];
    return cleared;
  }
  return { ...losses, [trackId]: trackLossCount(losses, trackId) + 1 };
}

export function retryFeeApplies(losses: number, carId: string): boolean {
  return isUpgradedRacer(carId) && losses >= RETRY_LOSS_THRESHOLD;
}

/** 10% of a pile, at least 1 while anything remains, so the drain reaches zero. */
export function retryFeeAmount(pile: number): number {
  if (!Number.isFinite(pile) || pile <= 0) {
    return 0;
  }
  return Math.max(1, Math.round(pile * RETRY_FEE_FRACTION));
}

export function retryLevy(losses: number, cash: number, points: number, carId: string): RetryLevy {
  if (!retryFeeApplies(losses, carId)) {
    return { kind: RETRY_FEE_KIND.NONE, amount: 0 };
  }
  const bank = Number.isFinite(cash) ? Math.max(0, Math.round(cash)) : 0;
  const respect = Number.isFinite(points) ? Math.max(0, Math.round(points)) : 0;
  if (bank > 0) {
    return { kind: RETRY_FEE_KIND.CASH, amount: retryFeeAmount(bank) };
  }
  if (respect > 0) {
    return { kind: RETRY_FEE_KIND.POINTS, amount: retryFeeAmount(respect) };
  }
  return { kind: RETRY_FEE_KIND.GAME_OVER, amount: 0 };
}

/** Glance line for menus. Null when the tax is not in play. */
export function retryWarningLine(losses: number, cash: number, points: number, carId: string): string | null {
  if (!isUpgradedRacer(carId) || losses <= 0) {
    return null;
  }
  if (losses < RETRY_LOSS_THRESHOLD) {
    const left = RETRY_LOSS_THRESHOLD - losses;
    return `LOSS ${losses}/${RETRY_LOSS_THRESHOLD}  ·  ${left} FREE ${left === 1 ? 'RETRY' : 'RETRIES'} LEFT`;
  }
  const levy = retryLevy(losses, cash, points, carId);
  if (levy.kind === RETRY_FEE_KIND.POINTS) {
    return `!  ${losses} LOSSES  ·  BANK $0  ·  FEE 10% RESPECT  ·  ${levy.amount} PTS`;
  }
  if (levy.kind === RETRY_FEE_KIND.GAME_OVER) {
    return `!  ${losses} LOSSES  ·  BANK $0  ·  0 PTS  ·  GAME OVER`;
  }
  return `!  ${losses} LOSSES  ·  RETRY FEE 10%  ·  ${formatCash(levy.amount)}`;
}

/** Row suffix on the track list. Empty when no fee is due. */
export function retryFeeMark(losses: number, cash: number, points: number, carId: string): string {
  const levy = retryLevy(losses, cash, points, carId);
  if (levy.kind === RETRY_FEE_KIND.CASH) {
    return `  FEE ${formatCash(levy.amount)}`;
  }
  if (levy.kind === RETRY_FEE_KIND.POINTS) {
    return `  FEE ${levy.amount} PTS`;
  }
  if (levy.kind === RETRY_FEE_KIND.GAME_OVER) {
    return '  GAME OVER';
  }
  return '';
}

/** Compact results-board rows. Empty when the starter is racing or the streak is 0. */
export function retryPayoutLines(
  losses: number,
  cash: number,
  points: number,
  carId: string,
): readonly string[] {
  if (!isUpgradedRacer(carId) || losses <= 0) {
    return [];
  }
  const row = (label: string, value: string): string => `${label.padEnd(8)}${value.padStart(10)}`;
  if (losses < RETRY_LOSS_THRESHOLD) {
    return [row('LOSS', `${losses}/${RETRY_LOSS_THRESHOLD}`), row('FREE', `${RETRY_LOSS_THRESHOLD - losses} LEFT`)];
  }
  const levy = retryLevy(losses, cash, points, carId);
  if (levy.kind === RETRY_FEE_KIND.POINTS) {
    return [row('LOSS', String(losses)), row('NEXT', `FEE ${levy.amount} PTS`)];
  }
  if (levy.kind === RETRY_FEE_KIND.GAME_OVER) {
    return [row('LOSS', String(losses)), row('NEXT', 'GAME OVER')];
  }
  return [row('LOSS', String(losses)), row('NEXT', `FEE ${formatCash(levy.amount)}`)];
}

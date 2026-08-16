/**
 * Championship points. Same curve as the purse, in tens and hundreds.
 */

import { HIT_BOUNTY_PLANET_GROWTH, PODIUM_HALVING, type WeaponHits } from './Wallet.ts';

/** 1st-place points on planet 1, track 1. */
export const BASE_FIRST_POINTS = 100;

export const PLANET_POINTS_GROWTH = 0.5;
export const TRACK_POINTS_GROWTH = 0.25;

export const MISSILE_HIT_POINTS = 10;
export const MINE_HIT_POINTS = 8;
export const OIL_HIT_POINTS = 4;

/** Garage cash-in: every this many points become one purse chip. */
export const POINTS_PER_CASH_IN = 400;
export const CASH_IN_PAYOUT = 50_000;

function safeIndex(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value < 1) {
    return fallback;
  }
  return Math.floor(value);
}

function roundPoints(value: number): number {
  return Math.max(0, Math.round(value));
}

export function firstPlacePoints(planetIndex: number, trackN: number): number {
  const planet = safeIndex(planetIndex, 1);
  const track = safeIndex(trackN, 1);
  const planetScale = 1 + (planet - 1) * PLANET_POINTS_GROWTH;
  const trackScale = 1 + (track - 1) * TRACK_POINTS_GROWTH;
  return roundPoints(BASE_FIRST_POINTS * planetScale * trackScale);
}

export function podiumPoints(position: number, planetIndex: number, trackN: number): number {
  const first = firstPlacePoints(planetIndex, trackN);
  if (position === 1) {
    return first;
  }
  if (position === 2) {
    return roundPoints(first * PODIUM_HALVING);
  }
  if (position === 3) {
    return roundPoints(first * PODIUM_HALVING * PODIUM_HALVING);
  }
  return 0;
}

function hitScale(planetIndex: number): number {
  return 1 + (safeIndex(planetIndex, 1) - 1) * HIT_BOUNTY_PLANET_GROWTH;
}

export function weaponHitPoints(hits: WeaponHits, planetIndex: number): number {
  const missiles = Number.isFinite(hits.missiles) ? Math.max(0, hits.missiles) : 0;
  const oil = Number.isFinite(hits.oil) ? Math.max(0, hits.oil) : 0;
  const mines = Number.isFinite(hits.mines) ? Math.max(0, hits.mines) : 0;
  const scale = hitScale(planetIndex);
  return roundPoints(
    missiles * MISSILE_HIT_POINTS * scale +
      mines * MINE_HIT_POINTS * scale +
      oil * OIL_HIT_POINTS * scale,
  );
}

export function cashInBatches(points: number): number {
  const safe = Number.isFinite(points) ? Math.max(0, Math.floor(points)) : 0;
  return Math.floor(safe / POINTS_PER_CASH_IN);
}

export function cashInValue(points: number): { readonly batches: number; readonly cash: number; readonly remaining: number } {
  const batches = cashInBatches(points);
  const spent = batches * POINTS_PER_CASH_IN;
  const safe = Number.isFinite(points) ? Math.max(0, Math.floor(points)) : 0;
  return {
    batches,
    cash: batches * CASH_IN_PAYOUT,
    remaining: safe - spent,
  };
}

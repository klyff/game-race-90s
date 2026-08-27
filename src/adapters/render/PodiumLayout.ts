/**
 * Results podium. 1st stays centered; 2nd/3rd hug in without crossing
 * the winner box. Feet sit a fixed gap above the bottom boards — that
 * plaque band is the standing plane on every pub.
 */

export const PODIUM_BODY_GAP = 32;

/** Air between soles and the top edge of the ranking / payout plaques. */
export const PODIUM_FOOT_GAP = 15;

/** Every podium body is a step larger than the fit box. */
export const PODIUM_BODY_SCALE = 1.15;

/** 1st stands a step closer to the title. */
export const WINNER_FOOT_LIFT = 15;

/** Air between the crown and the name. */
export const PODIUM_NAME_GAP = 8;

export interface PodiumBodyXs {
  readonly first: number;
  readonly second: number;
  readonly third: number;
}

export function podiumBodyXs(input: {
  readonly screenW: number;
  readonly firstW: number;
  readonly secondW: number;
  readonly thirdW: number;
  readonly gap?: number;
}): PodiumBodyXs {
  const screenW = Number.isFinite(input.screenW) && input.screenW > 0 ? input.screenW : 1;
  const firstW = Math.max(0, input.firstW);
  const gap = Math.max(0, input.gap ?? PODIUM_BODY_GAP);
  const first = screenW / 2;
  return {
    first,
    second: first - firstW / 2 - gap - Math.max(0, input.secondW) / 2,
    third: first + firstW / 2 + gap + Math.max(0, input.thirdW) / 2,
  };
}

export function podiumFootY(boardTop: number, gap = PODIUM_FOOT_GAP): number {
  return boardTop - gap;
}

export function winnerFootY(boardTop: number): number {
  return podiumFootY(boardTop) - WINNER_FOOT_LIFT;
}

export function podiumNameY(footY: number, bodyH: number, gap = PODIUM_NAME_GAP): number {
  return footY - Math.max(0, bodyH) - gap;
}

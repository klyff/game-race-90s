import {
  BANTER_EXTRA_IDS,
  NARRATOR_CATEGORY,
  banterLines,
  linesInCategory,
  pickNarratorVoice,
  type NarratorLine,
  type NarratorVoice,
  type PlannedClip,
} from '../../data/audio/NarratorBank.ts';

/**
 * How many colour-commentary lines a typical 3-lap race gets.
 *
 * Par laps here are ~45–70 s, so 8 hits leaves ~12–20 s between shouts
 * once race-start and the two final-lap calls have taken their slots.
 */
const BANTER_COUNT_MIN = 7;
const BANTER_COUNT_MAX = 10;
const BANTER_MIN_GAP_SECONDS = 10;
const BANTER_START_PAD_SECONDS = 8;
const BANTER_END_PAD_SECONDS = 6;

/** Event pools: how many distinct lines this race will actually use. */
const DAMAGE_POOL_MIN = 2;
const WEAPONS_POOL_MIN = 2;
const BOOST_POOL_MIN = 2;
const BEHIND_POOL_MIN = 1;

export interface ScheduledBanter {
  readonly atSeconds: number;
  readonly clip: PlannedClip;
}

export interface NarratorPlan {
  readonly raceStart: PlannedClip;
  readonly boostPool: readonly PlannedClip[];
  readonly damagePool: readonly PlannedClip[];
  readonly weaponsPool: readonly PlannedClip[];
  readonly behindPool: readonly PlannedClip[];
  readonly banter: readonly ScheduledBanter[];
  readonly finalLapStart: PlannedClip;
  readonly finalLapMid: PlannedClip;
  readonly newLeader: PlannedClip;
  readonly wrongWay: PlannedClip;
  readonly victory: PlannedClip;
  readonly second: PlannedClip;
  readonly last: PlannedClip;
}

export interface PlanNarratorOptions {
  readonly lapCount: number;
  /** One-lap par, seconds. Used to spread banter and to sit the final-lap holes. */
  readonly parSeconds: number;
  readonly random?: () => number;
}

/**
 * Rolls every line this race will speak, and when, before the lights go out.
 *
 * Scheduled cues (start, banter, final lap, finish) are fixed here so the
 * race can preload those files. Event pools (damage, weapons, behind, boost)
 * are shuffled index lists: the director pops the next one when the world
 * actually does the thing.
 */
export function planNarratorRace(options: PlanNarratorOptions): NarratorPlan {
  const random = options.random ?? Math.random;
  const par = Number.isFinite(options.parSeconds) && options.parSeconds > 0 ? options.parSeconds : 50;
  const laps = Number.isFinite(options.lapCount) && options.lapCount > 0 ? options.lapCount : 3;
  const raceSeconds = par * laps;

  const raceStart = pickClip(linesInCategory(NARRATOR_CATEGORY.RACE_START), random);
  const finalPair = pickTwoDistinct(linesInCategory(NARRATOR_CATEGORY.FINAL_LAP), random);
  const victory = pickClip(linesInCategory(NARRATOR_CATEGORY.VICTORY), random);
  const second = pickClip(linesInCategory(NARRATOR_CATEGORY.SECOND), random);
  const last = pickClip(linesInCategory(NARRATOR_CATEGORY.LAST), random);

  const wrongWayLine = linesInCategory(NARRATOR_CATEGORY.BANTER).find(line => line.id === 'wrong-way');
  const newLeaderLine = linesInCategory(NARRATOR_CATEGORY.BANTER).find(line => line.id === 'boom-new-leader');

  return {
    raceStart,
    boostPool: buildEventPool(linesInCategory(NARRATOR_CATEGORY.BOOST), BOOST_POOL_MIN, random),
    damagePool: buildEventPool(linesInCategory(NARRATOR_CATEGORY.DAMAGE), DAMAGE_POOL_MIN, random),
    weaponsPool: buildEventPool(linesInCategory(NARRATOR_CATEGORY.WEAPONS), WEAPONS_POOL_MIN, random),
    behindPool: buildEventPool(linesInCategory(NARRATOR_CATEGORY.BEHIND), BEHIND_POOL_MIN, random),
    banter: scheduleBanter(banterLines(), raceSeconds, par, laps, random),
    finalLapStart: finalPair[0]!,
    finalLapMid: finalPair[1]!,
    newLeader: clipFor(newLeaderLine, random),
    wrongWay: clipFor(wrongWayLine, random),
    victory,
    second,
    last,
  };
}

/** Every distinct clip the race should preload. */
export function clipsInPlan(plan: NarratorPlan): readonly PlannedClip[] {
  const all: PlannedClip[] = [
    plan.raceStart,
    ...plan.boostPool,
    ...plan.damagePool,
    ...plan.weaponsPool,
    ...plan.behindPool,
    ...plan.banter.map(cue => cue.clip),
    plan.finalLapStart,
    plan.finalLapMid,
    plan.newLeader,
    plan.wrongWay,
    plan.victory,
    plan.second,
    plan.last,
  ];
  const seen = new Set<string>();
  const unique: PlannedClip[] = [];
  for (const clip of all) {
    const key = `${clip.voice}-${clip.lineId}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(clip);
  }
  return unique;
}

function pickClip(lines: readonly NarratorLine[], random: () => number): PlannedClip {
  const line = lines[Math.floor(random() * lines.length)] ?? lines[0];
  return { lineId: line!.id, voice: pickNarratorVoice(random) };
}

function clipFor(line: NarratorLine | undefined, random: () => number): PlannedClip {
  return {
    lineId: line?.id ?? 'boooom',
    voice: pickNarratorVoice(random),
  };
}

function pickTwoDistinct(lines: readonly NarratorLine[], random: () => number): [PlannedClip, PlannedClip] {
  const first = pickClip(lines, random);
  const others = lines.filter(line => line.id !== first.lineId);
  const second = others.length > 0 ? pickClip(others, random) : { ...first, voice: otherVoice(first.voice) };
  return [first, second];
}

function otherVoice(voice: NarratorVoice): NarratorVoice {
  return voice === 'echo' ? 'verse' : 'echo';
}

/**
 * Shuffle the category, then keep a random prefix so this race does not
 * burn every take. Each clip still gets its own voice roll.
 */
function buildEventPool(
  lines: readonly NarratorLine[],
  minimum: number,
  random: () => number,
): readonly PlannedClip[] {
  const shuffled = shuffle(lines.slice(), random);
  const count = clampInt(minimum + Math.floor(random() * (shuffled.length - minimum + 1)), 1, shuffled.length);
  return shuffled.slice(0, count).map(line => ({
    lineId: line.id,
    voice: pickNarratorVoice(random),
  }));
}

function scheduleBanter(
  lines: readonly NarratorLine[],
  raceSeconds: number,
  parSeconds: number,
  laps: number,
  random: () => number,
): readonly ScheduledBanter[] {
  const windowStart = BANTER_START_PAD_SECONDS;
  const windowEnd = Math.max(windowStart + BANTER_MIN_GAP_SECONDS, raceSeconds - BANTER_END_PAD_SECONDS);
  const count = clampInt(
    BANTER_COUNT_MIN + Math.floor(random() * (BANTER_COUNT_MAX - BANTER_COUNT_MIN + 1)),
    1,
    16,
  );

  const blocked = finalLapHoles(parSeconds, laps);
  const times: number[] = [];
  let guard = 0;
  while (times.length < count && guard < 80) {
    guard += 1;
    const at = windowStart + random() * (windowEnd - windowStart);
    if (times.some(existing => Math.abs(existing - at) < BANTER_MIN_GAP_SECONDS)) {
      continue;
    }
    if (blocked.some(hole => at >= hole.start && at <= hole.end)) {
      continue;
    }
    times.push(at);
  }
  times.sort((a, b) => a - b);

  const weighted = weightedBag(lines, random);
  let previousId: string | undefined;
  return times.map(atSeconds => {
    const line = nextWeighted(weighted, previousId, random);
    previousId = line.id;
    return { atSeconds, clip: { lineId: line.id, voice: pickNarratorVoice(random) } };
  });
}

/** Keep the two final-lap shouts from talking over scheduled banter. */
function finalLapHoles(parSeconds: number, laps: number): readonly { start: number; end: number }[] {
  const finalStart = Math.max(0, (laps - 1) * parSeconds);
  const finalMid = finalStart + parSeconds * 0.5;
  return [
    { start: finalStart - 2, end: finalStart + 6 },
    { start: finalMid - 2, end: finalMid + 6 },
  ];
}

function weightedBag(lines: readonly NarratorLine[], random: () => number): NarratorLine[] {
  const bag: NarratorLine[] = [];
  for (const line of lines) {
    const copies = line.id === BANTER_EXTRA_IDS[0] ? 1 : Math.max(1, line.weight);
    for (let i = 0; i < copies; i += 1) {
      bag.push(line);
    }
  }
  return shuffle(bag, random);
}

function nextWeighted(bag: readonly NarratorLine[], previousId: string | undefined, random: () => number): NarratorLine {
  const choices = previousId === undefined ? bag : bag.filter(line => line.id !== previousId);
  const pool = choices.length > 0 ? choices : bag;
  return pool[Math.floor(random() * pool.length)] ?? bag[0]!;
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const current = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = current;
  }
  return copy;
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(value)));
}

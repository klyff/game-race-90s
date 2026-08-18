/**
 * Arcade narrator lines, two voices, and the folders the clips live in.
 *
 * Echo and Verse both record every line. A race plan picks a voice per cue
 * so the same phrase does not always arrive in the same throat.
 *
 * `lab/` is where `npm run gen:voice-lab` writes. Keepers are copied to
 * `stash/` and that is what the race loads. The player looks in stash first
 * and falls back to lab so a fresh generate can be heard before the copy.
 */

export const NARRATOR_VOICES = ['echo', 'verse'] as const;
export type NarratorVoice = (typeof NARRATOR_VOICES)[number];

export const NARRATOR_STASH_DIRECTORY = 'assets/audio/narrator/stash';
export const NARRATOR_LAB_DIRECTORY = 'assets/audio/narrator/lab';

export const NARRATOR_CATEGORY = {
  RACE_START: 'race-start',
  DAMAGE: 'damage',
  BOOST: 'boost',
  BANTER: 'banter',
  BEHIND: 'behind',
  WEAPONS: 'weapons',
  FINAL_LAP: 'final-lap',
  VICTORY: 'victory',
  SECOND: 'second',
  LAST: 'last',
} as const;
export type NarratorCategory = (typeof NARRATOR_CATEGORY)[keyof typeof NARRATOR_CATEGORY];

export interface NarratorLine {
  readonly id: string;
  readonly text: string;
  /** Orthography the TTS model reads — punctuation is performance, not grammar. */
  readonly speak: string;
  readonly category: NarratorCategory;
  /** Banter weight. Higher = scheduled more often. Default 1. */
  readonly weight: number;
}

export interface NarratorClip {
  readonly lineId: string;
  readonly voice: NarratorVoice;
  readonly file: string;
  readonly text: string;
  readonly category: NarratorCategory;
}

export interface PlannedClip {
  readonly lineId: string;
  readonly voice: NarratorVoice;
}

export const NARRATOR_LINES: readonly NarratorLine[] = [
  // Race start — over GO, as the field leaves the grid.
  {
    id: 'engines-hot',
    text: "ENGINES HOT... LET'S ROCK!",
    speak: "ENGINES HOT—LET'S ROCKKK!",
    category: NARRATOR_CATEGORY.RACE_START,
    weight: 1,
  },
  {
    id: 'crank-it-up-live',
    text: 'CRANK IT UP!!!!  RACE IS LIVE!!!!',
    speak: "CRANK'T UP—RACE IS LIIIVE!!!",
    category: NARRATOR_CATEGORY.RACE_START,
    weight: 1,
  },
  {
    id: 'burn-rubber',
    text: 'BURN RUBBER, …BURN RUBBER….  BRING THE NOISE!',
    speak: 'BURN RUBBERR—BURN RUBBERR—BRING THE NOIISE!',
    category: NARRATOR_CATEGORY.RACE_START,
    weight: 1,
  },
  {
    id: 'no-brakes',
    text: 'NO BRAKES! NO MERCY! GO GO GO!',
    speak: 'NO BRAKES—NO MERCY—GO GO GOOO!',
    category: NARRATOR_CATEGORY.RACE_START,
    weight: 1,
  },
  {
    id: 'turn-it-up',
    text: 'TURN IT UP... AND TEAR IT UP!',
    speak: 'TURN IT UP—AND TEAR IT UPPP!',
    category: NARRATOR_CATEGORY.RACE_START,
    weight: 1,
  },
  {
    id: 'get-on-fire',
    text: 'GET ON FIREEEEEEE!',
    speak: 'GET ON FIREEEEEE!',
    category: NARRATOR_CATEGORY.RACE_START,
    weight: 1,
  },

  // Damage — crash, shunt, oil, a hard wall.
  {
    id: 'ready-to-explode',
    text: "THAT RIDE'S READY TO EXPLODE!",
    speak: "THAT RIDE'S READY TO EXPLOOODE!",
    category: NARRATOR_CATEGORY.DAMAGE,
    weight: 1,
  },
  {
    id: 'one-more-hit',
    text: "ONE MORE HIT... AND IT'S TOAST!",
    speak: "ONE MORE HIT—AND IT'S TOAAAST!",
    category: NARRATOR_CATEGORY.DAMAGE,
    weight: 1,
  },
  {
    id: 'owww-hurt',
    text: "OWWW! THAT'S GONNA HURT!",
    speak: "OWWW—THAT'S GONNA HURRRT!",
    category: NARRATOR_CATEGORY.DAMAGE,
    weight: 1,
  },
  {
    id: 'ouch-oh-man',
    text: 'OUCH!…. OH MAAAN!',
    speak: 'OUCH—OH MAAAAN!',
    category: NARRATOR_CATEGORY.DAMAGE,
    weight: 1,
  },

  // Boost / turbo.
  {
    id: 'boost-engaged',
    text: 'BOOST ENGAGED... HANG ON!',
    speak: 'BOOST ENGAGED—HANG ONNN!',
    category: NARRATOR_CATEGORY.BOOST,
    weight: 1,
  },
  {
    id: 'turbo-lit',
    text: "TURBO'S LIT! HERE WE GO!",
    speak: "TURBO'S LITT—HERE WE GOOO!",
    category: NARRATOR_CATEGORY.BOOST,
    weight: 1,
  },
  {
    id: 'juiced-up',
    text: 'JUICED UP AND READY!',
    speak: 'JUICED UP AND READYYY!',
    category: NARRATOR_CATEGORY.BOOST,
    weight: 1,
  },
  {
    id: 'powers-up',
    text: "POWER'S UP! LET'S MOVE!",
    speak: "POWER'S UP—LET'S MOVE!",
    category: NARRATOR_CATEGORY.BOOST,
    weight: 1,
  },

  // Banter — scheduled across the three laps. A few catchphrases repeat.
  {
    id: 'lok-thant-enzo',
    text: 'LOK Thant ENZO!',
    speak: 'LOK THANT ENNNZO!',
    category: NARRATOR_CATEGORY.BANTER,
    weight: 3,
  },
  {
    id: 'holy-chimbeler',
    text: 'HOLY CHIMBELER!!!',
    speak: 'HOLY CHIMBELERRR!!!',
    category: NARRATOR_CATEGORY.BANTER,
    weight: 3,
  },
  {
    id: 'chimbeeler',
    text: 'CHIMBEELEERRR=!!!!!!',
    speak: 'CHIMBEELEERRR!!!',
    category: NARRATOR_CATEGORY.BANTER,
    weight: 3,
  },
  {
    id: 'what-just-happened',
    text: 'WHAT JUST HAPPENED?!',
    speak: 'WHAT JUST HAPPENNND?!',
    category: NARRATOR_CATEGORY.BANTER,
    weight: 1,
  },
  {
    id: 'that-was-insane',
    text: 'THAT WAS INSANE!',
    speak: 'THAT WAS INSAAANE!',
    category: NARRATOR_CATEGORY.BANTER,
    weight: 1,
  },
  {
    id: 'call-a-mechanic',
    text: 'SOMEBODY CALL A MECHANIC!',
    speak: "SOMEBODY CALL A MECHANIC!",
    category: NARRATOR_CATEGORY.BANTER,
    weight: 1,
  },
  {
    id: 'leave-a-mark',
    text: "THAT'S GONNA LEAVE A MARK!",
    speak: "THAT'S GONNA LEAVE A MARRK!",
    category: NARRATOR_CATEGORY.BANTER,
    weight: 1,
  },
  {
    id: 'ouchhhh',
    text: 'Ouuchhhh?',
    speak: 'OUUUCHHHH?',
    category: NARRATOR_CATEGORY.BANTER,
    weight: 1,
  },
  {
    id: 'wrong-way',
    text: 'WROOONG WAY!',
    speak: "WROOONG WAY—TURN'ROUND!!!",
    category: NARRATOR_CATEGORY.BANTER,
    weight: 1,
  },
  {
    id: 'boooom',
    text: 'BOOOOOM!',
    speak: 'BOOOOOOM!',
    category: NARRATOR_CATEGORY.BANTER,
    weight: 1,
  },
  {
    id: 'boom-new-leader',
    text: 'BOOM! NEW LEADER!',
    speak: 'BOOM—NEW LEADERRR!',
    category: NARRATOR_CATEGORY.BANTER,
    weight: 1,
  },
  {
    id: 'this-guy-crazy',
    text: 'THIS GUY ARE CRADY, Dude!',
    speak: "THIS GUY'S CRAZY, DUDE!",
    category: NARRATOR_CATEGORY.BANTER,
    weight: 1,
  },
  {
    id: 'gone-way-out',
    text: 'GONE! WAY OUT FRONT!',
    speak: 'GONE—WAY OUT FRONTT!',
    category: NARRATOR_CATEGORY.BANTER,
    weight: 1,
  },

  // Player stuck behind 3rd.
  {
    id: 'lost-the-map',
    text: 'SOMEBODY LOST THE RACE MAP!',
    speak: 'SOMEBODY LOST THE RACE MAPP!',
    category: NARRATOR_CATEGORY.BEHIND,
    weight: 1,
  },
  {
    id: 'hello-up-here',
    text: 'HELLOOO? THE RACE IS UP HERE!',
    speak: 'HELLOOO—THE RACE IS UP HEEERE!',
    category: NARRATOR_CATEGORY.BEHIND,
    weight: 1,
  },

  // Weapons / explosions.
  {
    id: 'boom-direct-hit',
    text: 'BOOOOM! DIRECT HIT!',
    speak: 'BOOOM—DIRECT HITTT!!!',
    category: NARRATOR_CATEGORY.WEAPONS,
    weight: 1,
  },
  {
    id: 'nailed-it',
    text: 'NAILED IT! THAT ONE HURT!',
    speak: 'NAILED ITT—THAT ONE HURRRT!',
    category: NARRATOR_CATEGORY.WEAPONS,
    weight: 1,
  },
  {
    id: 'here-comes-heat',
    text: 'HERE COMES THE HEAT!',
    speak: 'HERE COMES THE HEAATT!',
    category: NARRATOR_CATEGORY.WEAPONS,
    weight: 1,
  },
  {
    id: 'brings-the-fire',
    text: 'BRINGS THE FIIIRE!',
    speak: 'BRINGS THE FIIIIRE!',
    category: NARRATOR_CATEGORY.WEAPONS,
    weight: 1,
  },
  {
    id: 'total-wipeout',
    text: 'TOTAL WIPEOUT!',
    speak: 'TOTAL WIPEOUUT!',
    category: NARRATOR_CATEGORY.WEAPONS,
    weight: 1,
  },

  // Final lap — one at the bell, one at half distance.
  {
    id: 'final-lap-count',
    text: 'FIIINAL LAP! MAKE IT COUNT!',
    speak: 'FIIINAL LAP—MAKE IT COUNTTT!',
    category: NARRATOR_CATEGORY.FINAL_LAP,
    weight: 1,
  },
  {
    id: 'last-lap-everything',
    text: "LAST LAP! EVERYTHING YOU'VE GOT!",
    speak: "LAST LAP—EVERYTHING YOU'VE GOTTT!",
    category: NARRATOR_CATEGORY.FINAL_LAP,
    weight: 1,
  },
  {
    id: 'final-lap-no-holding',
    text: 'FINAL LAP! NO HOLDING BACK!',
    speak: 'FINAL LAP—NO HOLDING BACKKK!',
    category: NARRATOR_CATEGORY.FINAL_LAP,
    weight: 1,
  },

  // Finish — one of these three buckets, matching the player's place.
  {
    id: 'burns-across',
    text: 'BURNS ACROSS THE LINE!',
    speak: 'BURNS ACROSS THE LINNNE!',
    category: NARRATOR_CATEGORY.VICTORY,
    weight: 1,
  },
  {
    id: 'takes-the-crown',
    text: 'TAKES THE CROWN! WHAT A RUN!',
    speak: 'TAKES THE CROWN—WHAT A RUNNN!',
    category: NARRATOR_CATEGORY.VICTORY,
    weight: 1,
  },
  {
    id: 'thats-how-you-win',
    text: "THAT'S HOW YOU WIN A RACE!",
    speak: "THAT'S HOW YOU WIN A RACEEE!",
    category: NARRATOR_CATEGORY.VICTORY,
    weight: 1,
  },
  {
    id: 'second-hell-of-a-ride',
    text: 'SECOND PLACE! STILL A HELL OF A RIDE!',
    speak: 'SECOND PLACE—STILL A HELL OF A RIDEE!',
    category: NARRATOR_CATEGORY.SECOND,
    weight: 1,
  },
  {
    id: 'second-so-close',
    text: 'SECOND! SO CLOSE TO GLORY!',
    speak: 'SECOND—SO CLOSE TO GLORYYY!',
    category: NARRATOR_CATEGORY.SECOND,
    weight: 1,
  },
  {
    id: 'last-place-next-time',
    text: 'LAST PLACE... BETTER TURN IT UP NEXT TIME!',
    speak: 'LAST PLACE—BETTER TURN IT UP NEXT TIIIME!',
    category: NARRATOR_CATEGORY.LAST,
    weight: 1,
  },
  {
    id: 'dead-last',
    text: 'DEAD LAST! THAT ROAD WAS BRUTAL!',
    speak: 'DEAD LAST—THAT ROAD WAS BRUTALLL!',
    category: NARRATOR_CATEGORY.LAST,
    weight: 1,
  },
];

const LINES_BY_ID = new Map(NARRATOR_LINES.map(line => [line.id, line]));

export function narratorLine(id: string): NarratorLine | undefined {
  return LINES_BY_ID.get(id);
}

export function linesInCategory(category: NarratorCategory): readonly NarratorLine[] {
  return NARRATOR_LINES.filter(line => line.category === category);
}

export function narratorClipFile(voice: NarratorVoice, lineId: string): string {
  return `${voice}-${lineId}.mp3`;
}

export function resolveNarratorClip(planned: PlannedClip): NarratorClip | undefined {
  const line = narratorLine(planned.lineId);
  if (line === undefined) {
    return undefined;
  }
  return {
    lineId: line.id,
    voice: planned.voice,
    file: narratorClipFile(planned.voice, line.id),
    text: line.text,
    category: line.category,
  };
}

export function narratorClipUrl(clip: NarratorClip, directory: string = NARRATOR_STASH_DIRECTORY): string {
  return `${directory}/${clip.file}`;
}

export function narratorClipKey(planned: PlannedClip): string {
  return `${planned.voice}-${planned.lineId}`;
}

/** Banter also reuses the damage toast line — same recording, two triggers. */
export const BANTER_EXTRA_IDS = ['one-more-hit'] as const;

export function banterLines(): readonly NarratorLine[] {
  const extras = BANTER_EXTRA_IDS.map(id => narratorLine(id)).filter(
    (line): line is NarratorLine => line !== undefined,
  );
  return [...linesInCategory(NARRATOR_CATEGORY.BANTER), ...extras];
}

export function pickNarratorVoice(random: () => number = Math.random): NarratorVoice {
  return NARRATOR_VOICES[Math.floor(random() * NARRATOR_VOICES.length)] ?? 'echo';
}

export function pickLineId(
  lines: readonly NarratorLine[],
  random: () => number = Math.random,
): string | undefined {
  if (lines.length === 0) {
    return undefined;
  }
  return lines[Math.floor(random() * lines.length)]?.id;
}

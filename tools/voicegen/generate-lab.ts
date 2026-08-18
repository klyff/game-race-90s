/**
 * Lab pass for the arcade narrator. Writes MP3s to
 * `public/assets/audio/narrator/lab/` and copies keepers to `stash/`.
 *
 * Needs OPENAI_API_KEY. Uses gpt-4o-mini-tts so `instructions` actually land.
 * Skip a file that already exists unless `--force` is passed.
 */
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  NARRATOR_CATEGORY,
  NARRATOR_LINES,
  NARRATOR_VOICES,
  narratorClipFile,
  type NarratorCategory,
  type NarratorLine,
} from '../../src/data/audio/NarratorBank.ts';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const LAB_DIRECTORY = join(REPO_ROOT, 'public', 'assets', 'audio', 'narrator', 'lab');
const STASH_DIRECTORY = join(REPO_ROOT, 'public', 'assets', 'audio', 'narrator', 'stash');

const MODEL = 'gpt-4o-mini-tts';
const SPEED = 2;
const FORCE = process.argv.includes('--force');

const BASE_INSTRUCTIONS = [
  'Keep the energy EXTREMELY high — almost out of control.',
  'This is a wild, fanatical 1990s arcade racing announcer performing at full intensity.',
  'Speak at very high speed, around 2x normal pace.',
  'DO NOT pronounce every syllable perfectly.',
  'Clip, swallow and smash some unstressed syllables together naturally, like an excited hard-rock frontman shouting between songs.',
  'Use a gritty, raspy, chest-driven hard-rock voice.',
  'Almost shout the phrases.',
  'The performance should sit somewhere between speaking, yelling and rock-stage vocal delivery — but do not actually sing a melody.',
  'Never calm down.',
  'Never use a polished announcer voice. Never sound corporate. Never sound like a documentary. Never sound like a movie trailer.',
  'Read the spelling and punctuation as performance marks: apostrophes swallow syllables, em-dashes slam into the climax, extra letters stretch the last vowel.',
].join(' ');

const CATEGORY_INSTRUCTIONS: Record<NarratorCategory, string> = {
  [NARRATOR_CATEGORY.RACE_START]:
    'Very energetic. Fast. Confident. Rock-and-roll attitude. This is the race-start announcement: the entire event is about to explode into action. The cars are already leaving the grid.',
  [NARRATOR_CATEGORY.DAMAGE]:
    'Sound excited because something dangerous just happened. Build tension quickly and finish aggressively.',
  [NARRATOR_CATEGORY.BOOST]:
    'The delivery should immediately accelerate. Make it sound like the car suddenly gained ridiculous power.',
  [NARRATOR_CATEGORY.BANTER]:
    'Do not stretch every sentence. Use stretch only when it makes the announcement more exciting. This is a random shout in the middle of the race.',
  [NARRATOR_CATEGORY.BEHIND]:
    'Mock the player for sitting outside the podium, arcade-fun, not mean. Still loud.',
  [NARRATOR_CATEGORY.WEAPONS]:
    'This should be one of the most aggressive deliveries. React immediately and explosively. Sound genuinely thrilled by the impact.',
  [NARRATOR_CATEGORY.FINAL_LAP]:
    'Very important announcement. Make it urgent. Noise. Scream. The player must feel that everything depends on the next few seconds. Increase intensity dramatically.',
  [NARRATOR_CATEGORY.VICTORY]:
    'Sound victorious and explosive. Give the phrase a big finish.',
  [NARRATOR_CATEGORY.SECOND]:
    'Still energetic, but slightly disappointed. They almost had it.',
  [NARRATOR_CATEGORY.LAST]:
    'Mock the result in a fun arcade way. Dead last, still a show.',
};

async function synthesize(voice: (typeof NARRATOR_VOICES)[number], line: NarratorLine): Promise<Buffer> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is missing');
  }

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      voice,
      input: line.speak,
      instructions: `${BASE_INSTRUCTIONS} ${CATEGORY_INSTRUCTIONS[line.category]}`,
      speed: SPEED,
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`${voice} ${line.id}: ${response.status} ${detail.slice(0, 400)}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

function writeListenPage(): void {
  const rows = NARRATOR_LINES.map(line => {
    const players = NARRATOR_VOICES.map(voice => {
      const fileName = narratorClipFile(voice, line.id);
      const ready = existsSync(join(LAB_DIRECTORY, fileName));
      if (!ready) {
        return `<label>${voice}</label><p class="missing">ainda não gravado</p>`;
      }
      return `<label>${voice}</label><audio controls src="${fileName}"></audio>`;
    }).join('\n');
    return `<section><h2>${line.category} — ${line.text}</h2>\n${players}\n</section>`;
  }).join('\n');

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Narrator lab</title>
    <style>
      :root { color-scheme: dark; font-family: "Courier New", monospace; background: #12080c; color: #f4d7a8; }
      body { max-width: 720px; margin: 2rem auto; padding: 0 1rem; }
      h1 { color: #ff4d2e; letter-spacing: 0.08em; }
      p { color: #c9a36a; }
      section { border: 2px solid #6b2a1f; padding: 1rem; margin: 1rem 0; background: #1b0d11; }
      h2 { margin: 0 0 0.75rem; color: #ffe27a; font-size: 1rem; }
      label { display: block; margin: 0.6rem 0 0.2rem; text-transform: uppercase; font-size: 0.8rem; }
      audio { width: 100%; }
      .missing { color: #8a5a4a; font-size: 0.85rem; margin: 0.2rem 0 0.6rem; }
    </style>
  </head>
  <body>
    <h1>NARRATOR LAB</h1>
    <p>Echo + Verse. Speed 2. Category instructions ride on top of the rock-shout base.</p>
    ${rows}
  </body>
</html>
`;
  writeFileSync(join(LAB_DIRECTORY, 'listen.html'), html);
}

async function main(): Promise<void> {
  mkdirSync(LAB_DIRECTORY, { recursive: true });
  mkdirSync(STASH_DIRECTORY, { recursive: true });
  writeListenPage();

  let wrote = 0;
  let skipped = 0;
  for (const voice of NARRATOR_VOICES) {
    for (const line of NARRATOR_LINES) {
      const fileName = narratorClipFile(voice, line.id);
      const labPath = join(LAB_DIRECTORY, fileName);
      const stashPath = join(STASH_DIRECTORY, fileName);
      if (!FORCE && existsSync(labPath) && existsSync(stashPath)) {
        skipped += 1;
        continue;
      }
      process.stdout.write(`Generating ${fileName}...\n`);
      const audio = await synthesize(voice, line);
      writeFileSync(labPath, audio);
      copyFileSync(labPath, stashPath);
      wrote += 1;
    }
  }

  writeListenPage();
  process.stdout.write(
    `Wrote ${wrote} clips, skipped ${skipped} existing. Lab: ${LAB_DIRECTORY}\n`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});

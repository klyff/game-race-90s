/**
 * Top-down 500×500 maps of every circuit: light-gray road, NPC guide line,
 * and the pursuit points the AI aims at for heading and distance.
 *
 *   node --experimental-strip-types tools/trackgen/circuit-maps.ts
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DRIVER_CARDS } from '../../src/data/cards/DriverCards.ts';
import { JOKER_PILOTS, REGULAR_PILOTS } from '../../src/data/pilots/PilotRoster.ts';
import { PLANETS, planetForTrackId, TRACKS_PER_PLANET } from '../../src/data/tracks/planets.ts';
import { TRACKS } from '../../src/data/tracks/registry.ts';
import { buildLineCandidates, offsetAt } from '../../src/domain/race/RacingLine.ts';
import type { RacingLine } from '../../src/domain/race/RacingLine.ts';
import { TrackSpline } from '../../src/domain/track/TrackSpline.ts';
import type { TrackDefinition } from '../../src/domain/track/TrackDefinition.ts';
import type { Vec2 } from '../../src/domain/math/Vec2.ts';
import { PACE_DRIVER_DEFAULTS } from '../../src/domain/vehicle/PaceDriver.ts';
import { rivalAgentFor } from '../../src/domain/vehicle/RivalAgent.ts';
import { writePng } from '../spritegen/raster/png.ts';
import type { Bitmap } from '../spritegen/raster/png.ts';

const SIZE = 500;
const PADDING = 28;
const ROAD_SAMPLES = 2400;
const LINE_SAMPLES = 1600;
const PURSUIT_COUNT = 22;
const TYPICAL_RACE_SPEED = 55;
const COLLISION_RADIUS = 1.7;

const COLOR_BACKGROUND: readonly [number, number, number] = [22, 24, 28];
const COLOR_ROAD: readonly [number, number, number] = [196, 198, 204];
const COLOR_GUIDE: readonly [number, number, number] = [56, 122, 196];
const COLOR_PURSUIT_LINE: readonly [number, number, number] = [214, 168, 52];
const COLOR_PURSUIT: readonly [number, number, number] = [236, 196, 64];
const COLOR_START: readonly [number, number, number] = [246, 246, 250];

interface Viewport {
  readonly scale: number;
  readonly offsetX: number;
  readonly offsetY: number;
}

function createViewport(spline: TrackSpline, margin: number): Viewport {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < ROAD_SAMPLES; i += 1) {
    const point = spline.positionAt((i / ROAD_SAMPLES) * spline.totalLength);
    minX = Math.min(minX, point.x - margin);
    maxX = Math.max(maxX, point.x + margin);
    minY = Math.min(minY, point.y - margin);
    maxY = Math.max(maxY, point.y + margin);
  }
  const inner = SIZE - PADDING * 2;
  const scale = Math.min(inner / (maxX - minX), inner / (maxY - minY));
  const usedW = (maxX - minX) * scale;
  const usedH = (maxY - minY) * scale;
  return {
    scale,
    offsetX: (SIZE - usedW) / 2 - minX * scale,
    offsetY: (SIZE + usedH) / 2 + minY * scale,
  };
}

function toPixel(view: Viewport, point: Vec2): { x: number; y: number } {
  return {
    x: point.x * view.scale + view.offsetX,
    y: view.offsetY - point.y * view.scale,
  };
}

function createBitmap(): Bitmap {
  const pixels = new Uint8Array(SIZE * SIZE * 4);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = COLOR_BACKGROUND[0];
    pixels[i + 1] = COLOR_BACKGROUND[1];
    pixels[i + 2] = COLOR_BACKGROUND[2];
    pixels[i + 3] = 255;
  }
  return { width: SIZE, height: SIZE, pixels };
}

function plot(bitmap: Bitmap, x: number, y: number, color: readonly [number, number, number]): void {
  const px = Math.round(x);
  const py = Math.round(y);
  if (px < 0 || py < 0 || px >= bitmap.width || py >= bitmap.height) return;
  const index = (py * bitmap.width + px) * 4;
  bitmap.pixels[index] = color[0];
  bitmap.pixels[index + 1] = color[1];
  bitmap.pixels[index + 2] = color[2];
  bitmap.pixels[index + 3] = 255;
}

function fillDisc(
  bitmap: Bitmap,
  centre: { x: number; y: number },
  radius: number,
  color: readonly [number, number, number],
): void {
  const limit = Math.ceil(radius);
  for (let dy = -limit; dy <= limit; dy += 1) {
    for (let dx = -limit; dx <= limit; dx += 1) {
      if (dx * dx + dy * dy > radius * radius) continue;
      plot(bitmap, centre.x + dx, centre.y + dy, color);
    }
  }
}

function drawSegment(
  bitmap: Bitmap,
  from: { x: number; y: number },
  to: { x: number; y: number },
  color: readonly [number, number, number],
  thickness: number,
): void {
  const steps = Math.ceil(Math.hypot(to.x - from.x, to.y - from.y)) + 1;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    fillDisc(
      bitmap,
      { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t },
      thickness,
      color,
    );
  }
}

function linePoint(spline: TrackSpline, line: RacingLine, distance: number): Vec2 {
  const frame = spline.frameAt(distance);
  const lateral = offsetAt(line, distance, spline);
  return {
    x: frame.position.x + frame.normal.x * lateral,
    y: frame.position.y + frame.normal.y * lateral,
  };
}

function renderCircuit(track: TrackDefinition): Bitmap {
  const spline = new TrackSpline(track.controlPoints);
  const candidates = buildLineCandidates(track, spline, COLLISION_RADIUS);
  const classic = candidates.find((candidate) => candidate.name === 'classic') ?? candidates[0]!;
  const line: RacingLine = {
    trackId: track.id,
    carId: 'npc-guide',
    candidateName: classic.name,
    offsets: classic.offsets,
    lapSeconds: 0,
    wallContacts: 0,
  };

  const view = createViewport(spline, track.halfWidth);
  const bitmap = createBitmap();
  const roadRadius = Math.max(1.6, track.halfWidth * view.scale);

  for (let i = 0; i < ROAD_SAMPLES; i += 1) {
    const point = spline.positionAt((i / ROAD_SAMPLES) * spline.totalLength);
    fillDisc(bitmap, toPixel(view, point), roadRadius, COLOR_ROAD);
  }

  for (let i = 0; i < LINE_SAMPLES; i += 1) {
    const distance = (i / LINE_SAMPLES) * spline.totalLength;
    fillDisc(bitmap, toPixel(view, linePoint(spline, line, distance)), 1.35, COLOR_GUIDE);
  }

  const lookAhead =
    PACE_DRIVER_DEFAULTS.lookAheadBase + PACE_DRIVER_DEFAULTS.lookAheadScaleFactor * TYPICAL_RACE_SPEED;
  for (let i = 0; i < PURSUIT_COUNT; i += 1) {
    const distance = (i / PURSUIT_COUNT) * spline.totalLength;
    const from = linePoint(spline, line, distance);
    const to = linePoint(spline, line, spline.wrap(distance + lookAhead));
    drawSegment(bitmap, toPixel(view, from), toPixel(view, to), COLOR_PURSUIT_LINE, 0.9);
    fillDisc(bitmap, toPixel(view, to), 3.2, COLOR_PURSUIT);
  }

  const start = spline.frameAt(track.startLineDistance);
  const inner = {
    x: start.position.x - start.normal.x * track.halfWidth,
    y: start.position.y - start.normal.y * track.halfWidth,
  };
  const outer = {
    x: start.position.x + start.normal.x * track.halfWidth,
    y: start.position.y + start.normal.y * track.halfWidth,
  };
  drawSegment(bitmap, toPixel(view, inner), toPixel(view, outer), COLOR_START, 1.6);

  return bitmap;
}

function driverRole(name: string): string {
  if ((REGULAR_PILOTS as readonly string[]).includes(name)) return 'regular';
  if ((JOKER_PILOTS as readonly string[]).includes(name)) return 'joker';
  return 'creator';
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3);
}

function writeDriverPersonality(outDir: string): void {
  const names = DRIVER_CARDS.map((card) => card.name);
  const lines: string[] = [
    '# Driver Personality',
    '',
    'Cada piloto ganha um cérebro determinístico a partir do **nome** (`rivalAgentFor(name)` → `traitsFor(name)`).',
    'Mesmo nome = mesmos valores. O agente não sabe quem é o jogador: disputa o pelotão inteiro.',
    '',
    'Dois motivos por baixo de cada decisão (não são traits):',
    '',
    '1. I have to win.',
    '2. I cannot let anyone else win.',
    '',
    '## Variáveis',
    '',
    '### Traits (1–10)',
    '',
    '| variável | o que faz |',
    '|---|---|',
    '| `daring` | Ousadia. Freia tarde, commita na curva, vai no gap. |',
    '| `precision` | Precisão. Usa o traçado conhecido como marcas de entrada/saída. |',
    '| `attack` | Ir pra cima. Fecha o carro da frente. |',
    '| `block` | Segurar posição. Cobre o carro de trás. |',
    '| `composure` | Sangue-frio. Mantém o plano quando o pelotão aperta. |',
    '| `ambition` | Eu tenho que vencer. |',
    '| `contest` | Não deixar ninguém vencer — o pelotão, não o player. |',
    '',
    '### Agent (derivado do mesmo seed)',
    '',
    '| variável | o que faz |',
    '|---|---|',
    '| `pathKind` | Como o piloto “pensa” o caminho: `astar`, `astar-euclidean`, `late-apex`, `early-apex`, `wide-line`, `centreline`. |',
    '| `riskRegister` | 0–255. Quanto aceita andar extra por uma curva mais rápida. |',
    '| `laneRegister` | Offset lateral extra, world units (−7…+7). Evita dois NPCs no mesmo pixel. |',
    '| `aggression` | 0.38–0.93. Empurra o limite de curva, freia mais tarde, segura mais o throttle no fechamento. |',
    '',
    'Look-ahead de pursuit (PaceDriver): `lookAheadBase=12`, `lookAheadScaleFactor=0.45`.',
    'Distância de mira ≈ `12 + 0.45 × velocidade`. Os mapas usam 55 u/s → ~37 units à frente.',
    '',
    '## Pilotos',
    '',
  ];

  for (const name of names) {
    const agent = rivalAgentFor(name);
    const { traits } = agent;
    lines.push(`### ${name}`);
    lines.push('');
    lines.push(`papel: \`${driverRole(name)}\``);
    lines.push('');
    lines.push('| variável | valor |');
    lines.push('|---|---|');
    lines.push(`| daring | ${traits.daring} |`);
    lines.push(`| precision | ${traits.precision} |`);
    lines.push(`| attack | ${traits.attack} |`);
    lines.push(`| block | ${traits.block} |`);
    lines.push(`| composure | ${traits.composure} |`);
    lines.push(`| ambition | ${traits.ambition} |`);
    lines.push(`| contest | ${traits.contest} |`);
    lines.push(`| pathKind | ${agent.pathKind} |`);
    lines.push(`| riskRegister | ${agent.riskRegister} |`);
    lines.push(`| laneRegister | ${formatNumber(agent.laneRegister)} |`);
    lines.push(`| aggression | ${formatNumber(agent.aggression)} |`);
    lines.push('');
  }

  writeFileSync(join(outDir, 'DRIVER_PERSONALITY.md'), `${lines.join('\n')}\n`, 'utf8');
}

function writeCircuitIndex(outDir: string, files: readonly { planet: string; track: TrackDefinition; file: string }[]): void {
  const lines: string[] = [
    '# Circuitos',
    '',
    'Cada PNG é 500×500, vista de cima.',
    '',
    '- **cinza claro** — traçado da pista (superfície, `halfWidth`)',
    '- **azul** — linha guia dos NPCs (candidato `classic`)',
    '- **amarelo** — pontos de pursuit: de onde o NPC está até o ponto que ele mira (~37 units à frente a 55 u/s)',
    '- **branco** — start/finish',
    '',
  ];

  for (const planet of PLANETS) {
    lines.push(`## ${planet.displayName}`);
    lines.push('');
    for (let n = 1; n <= TRACKS_PER_PLANET; n += 1) {
      const entry = files.find((row) => {
        const owner = planetForTrackId(row.track.id);
        if (owner?.id !== planet.id) return false;
        if (planet.index === 1 && n === 1) return row.track.id === 'thunder-basin';
        return row.track.id === `${planet.id}-${n}`;
      });
      if (entry === undefined) continue;
      lines.push(`### ${entry.track.displayName}`);
      lines.push('');
      lines.push(`![${entry.track.displayName}](circuits/${entry.file})`);
      lines.push('');
    }
  }

  writeFileSync(join(dirname(outDir), 'CIRCUITS.md'), `${lines.join('\n')}\n`, 'utf8');
}

function main(): void {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const outDir = join(root, 'docs', 'circuits');
  mkdirSync(outDir, { recursive: true });

  const files: { planet: string; track: TrackDefinition; file: string }[] = [];
  for (const track of TRACKS) {
    const planet = planetForTrackId(track.id);
    const file = `${track.id}.png`;
    writePng(join(outDir, file), renderCircuit(track));
    files.push({ planet: planet?.displayName ?? 'unknown', track, file });
    console.log(`  ${track.displayName} -> docs/circuits/${file}`);
  }

  writeDriverPersonality(join(root, 'docs'));
  writeCircuitIndex(outDir, files);
  console.log(`  ${files.length} circuitos + docs/DRIVER_PERSONALITY.md + docs/CIRCUITS.md`);
}

main();

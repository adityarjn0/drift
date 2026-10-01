import type {Settings} from './settings';

export const PRINT_WIDTH = 720;
export const PRINT_HEIGHT = 960;
const MARGIN = 44;
const BOTTOM_EDGE = 882;

/** A point in the print's logical coordinate system. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** One continuous stroke and its stable ink and weight. */
interface FlowLine {
  readonly points: readonly Point[];
  readonly ink: number;
  readonly weight: number;
}

/** Resolution-independent content shared by preview and export. */
export interface Artwork {
  readonly settings: Settings;
  readonly lines: readonly FlowLine[];
  readonly grain: readonly Point[];
}

function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    // Xorshift32 keeps the composition independent of Math.random and scale.
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function isInside(point: Point): boolean {
  return (
    point.x >= MARGIN &&
    point.x <= PRINT_WIDTH - MARGIN &&
    point.y >= MARGIN &&
    point.y <= BOTTOM_EDGE
  );
}

/** Builds spaced, flowing strokes deterministically from the chosen settings. */
export function generateArtwork(settings: Settings): Artwork {
  const random = createRandom(settings.seed);
  const phase = random() * Math.PI * 2;
  const center = {x: (random() - 0.5) * 0.65, y: (random() - 0.5) * 0.65};
  const turbulence = settings.flow / 100;
  const spacing = 13 - ((settings.density - 20) / 80) * 8.8;
  const columns = Math.ceil(PRINT_WIDTH / spacing);
  const rows = Math.ceil(PRINT_HEIGHT / spacing);
  const occupied = new Uint8Array(columns * rows);

  function cell(point: Point): number {
    return (
      Math.floor(point.y / spacing) * columns + Math.floor(point.x / spacing)
    );
  }

  function angleAt(point: Point): number {
    const x = (point.x / PRINT_WIDTH) * 2 - 1;
    const y = (point.y / PRINT_HEIGHT) * 2 - 1;
    switch (settings.pattern) {
      case 'orbit':
        return (
          Math.atan2(y - center.y, x - center.x) +
          Math.PI / 2 +
          Math.sin(x * 3 + y * 4 + phase) * turbulence * 0.85
        );
      case 'contour':
        return (
          -0.12 +
          Math.sin(y * (5 + turbulence * 6) + phase) * 0.7 +
          Math.sin(x * 2.5 + y * 2 + phase) * 0.45
        );
      case 'flow':
        return (
          -0.2 +
          Math.sin(x * (1.8 + turbulence * 2.5) + phase) * 1.25 +
          Math.cos(y * (1.5 + turbulence * 2.2) - phase) * 0.95 +
          Math.sin((x + y) * (2 + turbulence * 4) + phase) * turbulence * 0.5
        );
      default:
        throw new Error('The print uses an unsupported pattern.');
    }
  }

  function trace(start: Point, direction: number): Point[] {
    const points: Point[] = [];
    let current = start;
    for (let step = 0; step < 260; step++) {
      const angle = angleAt(current);
      const next = {
        x: current.x + Math.cos(angle) * 2.2 * direction,
        y: current.y + Math.sin(angle) * 2.2 * direction,
      };
      if (!isInside(next) || occupied[cell(next)] !== 0) {
        break;
      }
      if (step > 40 && Math.hypot(next.x - start.x, next.y - start.y) < 3) {
        break;
      }
      points.push(next);
      current = next;
    }
    return points;
  }

  const starts: {point: Point; order: number}[] = [];
  const startSpacing = spacing * 1.15;
  for (let y = MARGIN; y <= BOTTOM_EDGE; y += startSpacing) {
    for (let x = MARGIN; x <= PRINT_WIDTH - MARGIN; x += startSpacing) {
      const point = {
        x: x + (random() - 0.5) * startSpacing,
        y: y + (random() - 0.5) * startSpacing,
      };
      if (isInside(point)) {
        starts.push({point, order: random()});
      }
    }
  }
  starts.sort((first, second) => first.order - second.order);

  const lines: FlowLine[] = [];
  for (const {point} of starts) {
    if (occupied[cell(point)] !== 0) {
      continue;
    }
    const backward = trace(point, -1);
    const forward = trace(point, 1);
    const points = [...backward.reverse(), point, ...forward];
    if (points.length < 8) {
      continue;
    }
    for (const point of points) {
      occupied[cell(point)] = 1;
    }
    const color = random();
    lines.push({
      points,
      ink: color < 0.42 ? 0 : color < 0.68 ? 1 : color < 0.85 ? 2 : 3,
      weight: 0.85 + random() * 0.85,
    });
  }

  const grain = Array.from({length: 12000}, () => ({
    x: random() * PRINT_WIDTH,
    y: random() * PRINT_HEIGHT,
  }));
  return {settings: {...settings}, lines, grain};
}

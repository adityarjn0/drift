/** User-controlled parameters that completely describe a print. */
export interface Settings {
  readonly seed: number;
  readonly palette: PaletteId;
  readonly pattern: Pattern;
  readonly flow: number;
  readonly density: number;
}

export type PaletteId = 'saffron' | 'after-hours' | 'tidal' | 'bloom';
export type Pattern = 'flow' | 'orbit' | 'contour';

/** Paper and ink colors, shared by preview swatches and the canvas. */
export interface Palette {
  readonly name: string;
  readonly paper: string;
  readonly inks: readonly [string, string, string, string];
  readonly caption: string;
  readonly grain: string;
}

export const PALETTES: Readonly<Record<PaletteId, Palette>> = {
  saffron: {
    name: 'Saffron',
    paper: '#f6eddc',
    inks: ['#a74c2d', '#cb7943', '#d8aa65', '#344e4c'],
    caption: '#705446',
    grain: '#685044',
  },
  'after-hours': {
    name: 'After hours',
    paper: '#202c36',
    inks: ['#e1c399', '#b87554', '#718b92', '#efe0c0'],
    caption: '#dccab1',
    grain: '#f6eddc',
  },
  tidal: {
    name: 'Tidal',
    paper: '#eaf0e8',
    inks: ['#305851', '#6d9186', '#b69754', '#183e4b'],
    caption: '#3f6259',
    grain: '#31564f',
  },
  bloom: {
    name: 'Bloom',
    paper: '#f3e7e4',
    inks: ['#8a4e64', '#c17980', '#cda26c', '#515c76'],
    caption: '#795160',
    grain: '#734958',
  },
};

export const DEFAULT_SETTINGS: Settings = {
  seed: 4219,
  palette: 'saffron',
  pattern: 'flow',
  flow: 54,
  density: 64,
};

/** Curated compositions that work as immediately useful starting points. */
export const PRESETS: readonly {name: string; settings: Settings}[] = [
  {name: 'Warm currents', settings: DEFAULT_SETTINGS},
  {
    name: 'Night swimming',
    settings: {
      seed: 8201,
      palette: 'after-hours',
      pattern: 'orbit',
      flow: 38,
      density: 76,
    },
  },
  {
    name: 'Low tide',
    settings: {
      seed: 1738,
      palette: 'tidal',
      pattern: 'contour',
      flow: 68,
      density: 58,
    },
  },
];

/** Returns a valid whole-number seed, or undefined for an invalid edit. */
export function parseSeed(value: string): number | undefined {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return undefined;
  }
  const seed = Number(trimmed);
  if (!Number.isSafeInteger(seed) || seed < 1 || seed > 999999) {
    return undefined;
  }
  return seed;
}

function readNumber(
  params: URLSearchParams,
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const value = params.get(name);
  if (value === null || value.trim() === '') {
    return fallback;
  }
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.min(maximum, Math.max(minimum, Math.round(number)));
}

/** Restores a composition from untrusted URL input using bounded defaults. */
export function readSettings(params: URLSearchParams): Settings {
  const palette = params.get('palette');
  const pattern = params.get('pattern');
  return {
    seed: parseSeed(params.get('seed') ?? '') ?? DEFAULT_SETTINGS.seed,
    palette:
      palette === 'saffron' ||
      palette === 'after-hours' ||
      palette === 'tidal' ||
      palette === 'bloom'
        ? palette
        : DEFAULT_SETTINGS.palette,
    pattern:
      pattern === 'flow' || pattern === 'orbit' || pattern === 'contour'
        ? pattern
        : DEFAULT_SETTINGS.pattern,
    flow: readNumber(params, 'flow', DEFAULT_SETTINGS.flow, 0, 100),
    density: readNumber(params, 'density', DEFAULT_SETTINGS.density, 20, 100),
  };
}

/** Serializes all parameters so a link or browser history can restore a print. */
export function writeSettings(settings: Settings): URLSearchParams {
  return new URLSearchParams({
    seed: String(settings.seed),
    palette: settings.palette,
    pattern: settings.pattern,
    flow: String(settings.flow),
    density: String(settings.density),
  });
}

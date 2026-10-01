import {describe, expect, it} from 'vitest';

import {generateArtwork} from '../src/geometry';
import {
  DEFAULT_SETTINGS,
  parseSeed,
  readSettings,
  writeSettings,
} from '../src/settings';

describe('composition settings', () => {
  it.each(['', '0', '-1', '1.5', '1e3', 'hello', '1000000'])(
    'rejects invalid seed %j',
    (value) => {
      expect(parseSeed(value)).toBeUndefined();
    },
  );

  it('accepts seed boundaries and leading zeroes', () => {
    expect(parseSeed('1')).toBe(1);
    expect(parseSeed('999999')).toBe(999999);
    expect(parseSeed(' 004219 ')).toBe(4219);
  });

  it('recovers safely from malformed URL settings', () => {
    const settings = readSettings(
      new URLSearchParams(
        'seed=NaN&palette=invalid&pattern=invalid&flow=Infinity&density=oops',
      ),
    );
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('bounds URL values without discarding other valid settings', () => {
    const settings = readSettings(
      new URLSearchParams(
        'seed=93&palette=tidal&pattern=orbit&flow=-40&density=200',
      ),
    );
    expect(settings).toEqual({
      seed: 93,
      palette: 'tidal',
      pattern: 'orbit',
      flow: 0,
      density: 100,
    });
  });

  it('round trips a complete composition through URL state', () => {
    const settings = {
      seed: 838,
      palette: 'bloom',
      pattern: 'contour',
      flow: 79,
      density: 43,
    } as const;
    expect(readSettings(writeSettings(settings))).toEqual(settings);
  });
});

describe('generative artwork', () => {
  it('reproduces identical geometry from the same settings', () => {
    const first = generateArtwork(DEFAULT_SETTINGS);
    const second = generateArtwork({...DEFAULT_SETTINGS});
    expect(first.lines.length).toBeGreaterThan(80);
    expect(second).toEqual(first);
  });

  it('changes geometry when the composition seed changes', () => {
    const first = generateArtwork(DEFAULT_SETTINGS);
    const second = generateArtwork({...DEFAULT_SETTINGS, seed: 138});
    expect(second.lines).not.toEqual(first.lines);
  });

  it('produces finite geometry within the print margins', () => {
    for (const pattern of ['flow', 'orbit', 'contour'] as const) {
      const artwork = generateArtwork({...DEFAULT_SETTINGS, pattern});
      expect(artwork.lines.length).toBeGreaterThan(50);
      for (const line of artwork.lines) {
        expect(line.points.length).toBeGreaterThanOrEqual(8);
        for (const point of line.points) {
          expect(Number.isFinite(point.x)).toBe(true);
          expect(Number.isFinite(point.y)).toBe(true);
          expect(point.x).toBeGreaterThanOrEqual(44);
          expect(point.x).toBeLessThanOrEqual(676);
          expect(point.y).toBeGreaterThanOrEqual(44);
          expect(point.y).toBeLessThanOrEqual(882);
        }
      }
    }
  });

  it('adds more drawn lines at higher density', () => {
    const sparse = generateArtwork({...DEFAULT_SETTINGS, density: 20});
    const dense = generateArtwork({...DEFAULT_SETTINGS, density: 100});
    expect(dense.lines.length).toBeGreaterThan(sparse.lines.length * 1.4);
  });

  it('changes the current when a different pattern is selected', () => {
    const first = generateArtwork(DEFAULT_SETTINGS);
    const second = generateArtwork({...DEFAULT_SETTINGS, pattern: 'orbit'});
    expect(second.lines).not.toEqual(first.lines);
  });
});

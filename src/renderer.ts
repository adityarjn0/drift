import {PRINT_HEIGHT, PRINT_WIDTH} from './geometry';
import {PALETTES} from './settings';

import type {Artwork} from './geometry';

/** Paints the exact same logical artwork at preview or export resolution. */
export function paintArtwork(
  canvas: HTMLCanvasElement,
  artwork: Artwork,
  width: number,
  height: number,
): void {
  canvas.width = Math.round(width);
  canvas.height = Math.round(height);
  const context = canvas.getContext('2d');
  if (context === null) {
    throw new Error('This browser could not open the drawing canvas.');
  }
  context.setTransform(
    canvas.width / PRINT_WIDTH,
    0,
    0,
    canvas.height / PRINT_HEIGHT,
    0,
    0,
  );
  const palette = PALETTES[artwork.settings.palette];
  context.fillStyle = palette.paper;
  context.fillRect(0, 0, PRINT_WIDTH, PRINT_HEIGHT);

  context.lineCap = 'round';
  context.lineJoin = 'round';
  for (const line of artwork.lines) {
    const first = line.points[0];
    if (first === undefined) {
      continue;
    }
    context.beginPath();
    context.moveTo(first.x, first.y);
    for (const point of line.points.slice(1)) {
      context.lineTo(point.x, point.y);
    }
    context.strokeStyle = palette.inks[line.ink] ?? palette.inks[0];
    context.lineWidth = line.weight;
    context.stroke();
  }

  context.fillStyle = palette.grain;
  context.globalAlpha = 0.08;
  for (const point of artwork.grain) {
    context.fillRect(point.x, point.y, 0.7, 0.7);
  }
  context.globalAlpha = 1;
  context.fillStyle = palette.caption;
  context.font = '9px ui-monospace, Menlo, monospace';
  context.fillText('D R I F T  /  F I E L D  S T U D Y', 44, 924);
  context.textAlign = 'right';
  const seed = String(artwork.settings.seed).padStart(6, '0');
  context.fillText(
    `${seed}  /  ${artwork.settings.pattern.toUpperCase()}`,
    PRINT_WIDTH - 44,
    924,
  );
}

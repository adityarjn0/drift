import {generateArtwork} from './geometry';
import {paintArtwork} from './renderer';
import {
  PALETTES,
  parseSeed,
  PRESETS,
  readSettings,
  writeSettings,
} from './settings';
import './style.css';

import type {PaletteId, Pattern, Settings} from './settings';

function requireElement<T extends HTMLElement>(
  id: string,
  elementType: new () => T,
): T {
  const element = document.getElementById(id);
  if (!(element instanceof elementType)) {
    throw new Error(`The studio element "${id}" is missing.`);
  }
  return element;
}

const canvas = requireElement('artwork', HTMLCanvasElement);
const mount = requireElement('print-mount', HTMLDivElement);
const seedInput = requireElement('seed', HTMLInputElement);
const seedError = requireElement('seed-error', HTMLParagraphElement);
const exportError = requireElement('export-error', HTMLParagraphElement);
const flowInput = requireElement('flow', HTMLInputElement);
const densityInput = requireElement('density', HTMLInputElement);
const flowValue = requireElement('flow-value', HTMLOutputElement);
const densityValue = requireElement('density-value', HTMLOutputElement);
const status = requireElement('render-status', HTMLParagraphElement);
const title = requireElement('print-title', HTMLParagraphElement);
const saveButton = requireElement('save-print', HTMLButtonElement);
const paletteButtons = new Map<PaletteId, HTMLButtonElement>();
const patternButtons = new Map<Pattern, HTMLButtonElement>();
const presetButtons: {settings: Settings; button: HTMLButtonElement}[] = [];

let settings = readSettings(new URLSearchParams(window.location.search));
let artwork = generateArtwork(settings);
let pendingRender: number | undefined;

function updateUrl(replace = false): void {
  const url = new URL(window.location.href);
  url.search = writeSettings(settings).toString();
  if (replace) {
    window.history.replaceState(null, '', url);
  } else {
    window.history.pushState(null, '', url);
  }
}

function syncControls(): void {
  seedInput.value = String(settings.seed);
  seedInput.removeAttribute('aria-invalid');
  seedError.hidden = true;
  flowInput.value = String(settings.flow);
  densityInput.value = String(settings.density);
  flowValue.value = String(settings.flow);
  densityValue.value = String(settings.density);
  flowInput.style.setProperty('--range-progress', `${settings.flow}%`);
  densityInput.style.setProperty(
    '--range-progress',
    `${((settings.density - 20) / 80) * 100}%`,
  );
  for (const [id, button] of paletteButtons) {
    button.setAttribute('aria-pressed', String(id === settings.palette));
  }
  for (const [id, button] of patternButtons) {
    button.setAttribute('aria-pressed', String(id === settings.pattern));
  }
  for (const preset of presetButtons) {
    preset.button.setAttribute(
      'aria-pressed',
      String(
        writeSettings(preset.settings).toString() ===
          writeSettings(settings).toString(),
      ),
    );
  }
  const patternName =
    settings.pattern.charAt(0).toUpperCase() + settings.pattern.slice(1);
  title.replaceChildren(`${patternName} study `);
  const seedLabel = document.createElement('span');
  seedLabel.textContent = `№ ${String(settings.seed).padStart(6, '0')}`;
  title.append(seedLabel);
  canvas.setAttribute(
    'aria-label',
    `${PALETTES[settings.palette].name} ${settings.pattern} print, seed ${settings.seed}, ` +
      `flow ${settings.flow}, line density ${settings.density}`,
  );
}

function paintPreview(): void {
  const width = canvas.getBoundingClientRect().width;
  if (width === 0) {
    return;
  }
  const resolution = Math.min(window.devicePixelRatio || 1, 2);
  paintArtwork(
    canvas,
    artwork,
    width * resolution,
    (width * resolution * 4) / 3,
  );
}

function errorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    throw new Error('The drawing or image API threw a non-Error value.');
  }
  return error.message;
}

function showDrawingError(error: unknown): void {
  exportError.textContent = errorMessage(error);
  exportError.hidden = false;
  status.textContent = 'Could not draw';
  status.removeAttribute('data-busy');
}

function renderLatest(): boolean {
  if (pendingRender !== undefined) {
    window.cancelAnimationFrame(pendingRender);
    pendingRender = undefined;
  }
  try {
    artwork = generateArtwork(settings);
    paintPreview();
    status.textContent = 'Ready';
    status.removeAttribute('data-busy');
    exportError.hidden = true;
    return true;
  } catch (error) {
    showDrawingError(error);
    return false;
  }
}

function resizePreview(): void {
  if (pendingRender !== undefined) {
    renderLatest();
    return;
  }
  try {
    paintPreview();
    status.textContent = 'Ready';
    status.removeAttribute('data-busy');
    exportError.hidden = true;
  } catch (error) {
    showDrawingError(error);
  }
}

function changeSettings(next: Settings): void {
  const changed =
    writeSettings(next).toString() !== writeSettings(settings).toString();
  settings = next;
  syncControls();
  if (!changed) {
    return;
  }
  updateUrl();
  exportError.hidden = true;
  status.textContent = 'Drawing…';
  status.dataset.busy = 'true';
  if (pendingRender !== undefined) {
    window.cancelAnimationFrame(pendingRender);
  }
  pendingRender = window.requestAnimationFrame(renderLatest);
}

function applySeed(): void {
  const seed = parseSeed(seedInput.value);
  if (seed === undefined) {
    seedInput.setAttribute('aria-invalid', 'true');
    seedError.textContent = 'Choose a whole number from 1 to 999999.';
    seedError.hidden = false;
    return;
  }
  changeSettings({...settings, seed});
}

function newComposition(): void {
  const values = new Uint32Array(1);
  window.crypto.getRandomValues(values);
  let seed = ((values[0] ?? 0) % 999999) + 1;
  if (seed === settings.seed) {
    seed = (seed % 999999) + 1;
  }
  changeSettings({...settings, seed});
}

const paletteOptions = requireElement('palette-options', HTMLDivElement);
for (const id of ['saffron', 'after-hours', 'tidal', 'bloom'] as const) {
  const palette = PALETTES[id];
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'palette-button';
  button.setAttribute('aria-label', `${palette.name} palette`);
  const swatches = document.createElement('span');
  swatches.className = 'palette-swatches';
  swatches.setAttribute('aria-hidden', 'true');
  for (const ink of palette.inks) {
    const swatch = document.createElement('span');
    swatch.style.backgroundColor = ink;
    swatches.append(swatch);
  }
  const label = document.createElement('span');
  label.textContent = palette.name;
  button.append(swatches, label);
  button.addEventListener('click', () => {
    changeSettings({...settings, palette: id});
  });
  paletteButtons.set(id, button);
  paletteOptions.append(button);
}

const patternOptions = requireElement('pattern-options', HTMLDivElement);
for (const pattern of ['flow', 'orbit', 'contour'] as const) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = pattern.charAt(0).toUpperCase() + pattern.slice(1);
  button.setAttribute('aria-label', `${button.textContent} pattern`);
  button.addEventListener('click', () => {
    changeSettings({...settings, pattern});
  });
  patternButtons.set(pattern, button);
  patternOptions.append(button);
}

const presetOptions = requireElement('preset-options', HTMLDivElement);
for (const preset of PRESETS) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'preset-button';
  button.setAttribute('aria-label', `Start with ${preset.name}`);
  const thumbnail = document.createElement('canvas');
  thumbnail.setAttribute('aria-hidden', 'true');
  let preview: HTMLElement = thumbnail;
  try {
    paintArtwork(thumbnail, generateArtwork(preset.settings), 180, 240);
  } catch (error) {
    const fallback = document.createElement('span');
    fallback.className = 'preset-fallback';
    fallback.textContent = 'No preview';
    fallback.title = errorMessage(error);
    preview = fallback;
  }
  const label = document.createElement('span');
  label.className = 'preset-label';
  const name = document.createElement('span');
  name.className = 'preset-name';
  name.textContent = preset.name;
  const detail = document.createElement('span');
  detail.className = 'preset-detail';
  detail.textContent = `${PALETTES[preset.settings.palette].name} / ${preset.settings.pattern}`;
  label.append(name, detail);
  button.append(preview, label);
  button.addEventListener('click', () => {
    changeSettings(preset.settings);
  });
  presetButtons.push({settings: preset.settings, button});
  presetOptions.append(button);
}

requireElement('seed-form', HTMLFormElement).addEventListener(
  'submit',
  (event) => {
    event.preventDefault();
    applySeed();
  },
);
seedInput.addEventListener('change', applySeed);
flowInput.addEventListener('input', () => {
  changeSettings({...settings, flow: Number(flowInput.value)});
});
densityInput.addEventListener('input', () => {
  changeSettings({...settings, density: Number(densityInput.value)});
});
requireElement('new-composition', HTMLButtonElement).addEventListener(
  'click',
  newComposition,
);

document.addEventListener('keydown', (event) => {
  const target = event.target;
  if (
    (event.code !== 'KeyR' && event.key.toLowerCase() !== 'r') ||
    !event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.repeat ||
    (target instanceof HTMLInputElement && target.type !== 'range') ||
    (target instanceof HTMLElement && target.isContentEditable)
  ) {
    return;
  }
  event.preventDefault();
  newComposition();
});

async function savePrint(): Promise<void> {
  saveButton.disabled = true;
  exportError.hidden = true;
  saveButton.querySelector('span')?.replaceChildren('Preparing…');
  try {
    // Flush a pending edit so the download always matches the latest controls.
    if (!renderLatest()) {
      return;
    }
    const exportCanvas = document.createElement('canvas');
    const current = artwork;
    paintArtwork(exportCanvas, current, 2400, 3200);
    const blob = await new Promise<Blob>((resolve, reject) => {
      exportCanvas.toBlob((result) => {
        if (result === null) {
          reject(new Error('The image could not be saved. Please try again.'));
        } else {
          resolve(result);
        }
      }, 'image/png');
    });
    const url = URL.createObjectURL(blob);
    const download = document.createElement('a');
    download.href = url;
    download.download =
      `drift-${current.settings.palette}-` +
      `${String(current.settings.seed).padStart(6, '0')}.png`;
    download.click();
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  } catch (error) {
    exportError.textContent = errorMessage(error);
    exportError.hidden = false;
  } finally {
    saveButton.disabled = false;
    saveButton.querySelector('span')?.replaceChildren('Save print');
  }
}

saveButton.addEventListener('click', () => {
  void savePrint();
});

window.addEventListener('popstate', () => {
  settings = readSettings(new URLSearchParams(window.location.search));
  syncControls();
  renderLatest();
});

new ResizeObserver(resizePreview).observe(mount);
updateUrl(true);
syncControls();
renderLatest();

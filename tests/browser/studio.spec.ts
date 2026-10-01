import AxeBuilder from '@axe-core/playwright';
import {expect, test} from '@playwright/test';
import {mkdir, readFile} from 'node:fs/promises';

import type {Page} from '@playwright/test';

async function canvasImage(page: Page): Promise<string> {
  await expect(page.getByRole('status', {name: 'Print status'})).toContainText(
    'Ready',
  );
  return page.locator('#artwork').evaluate(async (element) => {
    if (!(element instanceof HTMLCanvasElement)) {
      throw new Error('The print canvas is missing.');
    }
    const pixels = new TextEncoder().encode(element.toDataURL());
    const digest = await crypto.subtle.digest('SHA-256', pixels);
    return Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('');
  });
}

test('palette changes recolor the same reproducible composition', async ({
  page,
}) => {
  await page.goto('/');
  const initial = await canvasImage(page);
  await page.getByRole('button', {name: 'Tidal palette', exact: true}).click();
  const tidal = await canvasImage(page);
  expect(tidal).not.toBe(initial);
  await page
    .getByRole('button', {name: 'Saffron palette', exact: true})
    .click();
  expect(await canvasImage(page)).toBe(initial);
});

test('seed edits survive reload and reproduce the print', async ({page}) => {
  await page.goto('/');
  await page.getByLabel('Composition seed').fill('331');
  await page.getByLabel('Composition seed').press('Enter');
  const edited = await canvasImage(page);
  await expect(page).toHaveURL(/seed=331/);
  await page.reload();
  await expect(page.getByLabel('Composition seed')).toHaveValue('331');
  expect(await canvasImage(page)).toBe(edited);
});

test('invalid seed edits preserve the artwork and give useful feedback', async ({
  page,
}) => {
  await page.goto('/');
  const initial = await canvasImage(page);
  await page.getByLabel('Composition seed').fill('1000000');
  await page.getByLabel('Composition seed').press('Enter');
  await expect(page.getByRole('alert')).toContainText('1 to 999999');
  expect(await canvasImage(page)).toBe(initial);
  await page.getByLabel('Composition seed').fill('42');
  await page.getByLabel('Composition seed').press('Enter');
  await expect(page.getByRole('alert')).toBeHidden();
  expect(await canvasImage(page)).not.toBe(initial);
});

test('keyboard controls update the actual artwork', async ({page}) => {
  await page.goto('/');
  const initial = await canvasImage(page);
  await page.getByLabel('Flow', {exact: true}).focus();
  await page.getByLabel('Flow', {exact: true}).press('End');
  await expect(page.getByLabel('Flow', {exact: true})).toHaveValue('100');
  expect(await canvasImage(page)).not.toBe(initial);
  await page.getByRole('button', {name: 'Orbit pattern', exact: true}).click();
  await expect(page).toHaveURL(/pattern=orbit/);
});

test('browser back restores the previous composition', async ({page}) => {
  await page.goto('/');
  const initial = await canvasImage(page);
  await page.getByRole('button', {name: 'Bloom palette', exact: true}).click();
  expect(await canvasImage(page)).not.toBe(initial);
  await page.goBack();
  await expect(
    page.getByRole('button', {name: 'Saffron palette', exact: true}),
  ).toHaveAttribute('aria-pressed', 'true');
  expect(await canvasImage(page)).toBe(initial);
});

test('malformed links open a usable studio', async ({page}) => {
  await page.goto('/?seed=no&palette=oops&density=Infinity&flow=NaN');
  await expect(page.getByLabel('Composition seed')).toHaveValue('4219');
  await expect(page.getByLabel('Line density', {exact: true})).toHaveValue(
    '64',
  );
  await expect(page.getByLabel('Flow', {exact: true})).toHaveValue('54');
  await canvasImage(page);
});

test('export downloads a real high-resolution PNG of the current print', async ({
  page,
}) => {
  await page.goto('/');
  await canvasImage(page);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', {name: 'Save print', exact: true}).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('drift-saffron-004219.png');
  await mkdir('artifacts', {recursive: true});
  await download.saveAs('artifacts/drift-saffron-004219.png');
  const file = await readFile('artifacts/drift-saffron-004219.png');
  expect(file.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(file.readUInt32BE(16)).toBe(2400);
  expect(file.readUInt32BE(20)).toBe(3200);
  expect(file.length).toBeGreaterThan(50000);
});

test('desktop studio is accessible and fits its viewport', async ({page}) => {
  await page.goto('/');
  await canvasImage(page);
  const accessibility = await new AxeBuilder({page})
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await mkdir('artifacts', {recursive: true});
  await page.screenshot({path: 'artifacts/studio-desktop.png', fullPage: true});
});

test('mobile studio fits narrow screens with working controls', async ({
  page,
}) => {
  await page.setViewportSize({width: 320, height: 900});
  await page.goto('/');
  await canvasImage(page);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  await page
    .getByRole('button', {name: 'After hours palette', exact: true})
    .click();
  await expect(page).toHaveURL(/palette=after-hours/);
  await canvasImage(page);
  const accessibility = await new AxeBuilder({page})
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await page.setViewportSize({width: 390, height: 844});
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  await mkdir('artifacts', {recursive: true});
  await page.screenshot({path: 'artifacts/studio-mobile.png', fullPage: true});
});

test('enlarged text stays within a narrow viewport and its controls', async ({
  page,
}) => {
  await page.setViewportSize({width: 320, height: 900});
  await page.goto('/');
  await canvasImage(page);
  await page.addStyleTag({content: ':root { font-size: 200%; }'});
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  const overflowingButtons = await page
    .locator('button')
    .evaluateAll(
      (buttons) =>
        buttons.filter((button) => button.scrollWidth > button.clientWidth + 2)
          .length,
    );
  expect(overflowingButtons).toBe(0);
});

test('a canvas initialization failure leaves controls usable with feedback', async ({
  page,
}) => {
  await page.addInitScript(() => {
    // Fault injection is confined to this test's isolated browser page.
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await page.goto('/');
  await expect(page.locator('#export-error')).toContainText('drawing canvas');
  await expect(page.getByRole('status', {name: 'Print status'})).toContainText(
    'Could not draw',
  );
  await page
    .getByRole('button', {name: 'New composition', exact: true})
    .click();
  await expect(page.getByLabel('Composition seed')).not.toHaveValue('4219');
});

test('a failed resize reports the error and recovers on the next repaint', async ({
  page,
}) => {
  await page.goto('/');
  await canvasImage(page);
  const originalContext = await page.evaluateHandle(() =>
    Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'getContext'),
  );
  await page.evaluate(() => {
    // Fault injection is confined to this test's isolated browser page.
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await page.setViewportSize({width: 390, height: 844});
  await expect(page.locator('#export-error')).toContainText('drawing canvas');
  await expect(page.getByRole('status', {name: 'Print status'})).toContainText(
    'Could not draw',
  );
  await page.evaluate((original) => {
    if (original === undefined) {
      throw new Error('The browser did not expose its canvas context method.');
    }
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', original);
  }, originalContext);
  await page.setViewportSize({width: 1440, height: 1000});
  await canvasImage(page);
  await expect(page.locator('#export-error')).toBeHidden();
});

test('the composition shortcut needs Alt and does not interrupt seed editing', async ({
  page,
}) => {
  await page.goto('/');
  await canvasImage(page);
  await page.getByRole('button', {name: 'Save print', exact: true}).press('r');
  await expect(page.getByLabel('Composition seed')).toHaveValue('4219');
  await page
    .getByRole('button', {name: 'Save print', exact: true})
    .press('Alt+r');
  await expect(page.getByLabel('Composition seed')).not.toHaveValue('4219');
  const changedUrl = page.url();
  await page.getByLabel('Composition seed').fill('42');
  await page.getByLabel('Composition seed').press('Alt+r');
  expect(page.url()).toBe(changedUrl);
});

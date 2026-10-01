# Drift

A small generative print studio. Choose a palette and a pattern, shape the flow,
and save a print of your own. All drawing and export happen in your browser.

## Run locally

```sh
npm install
npm run dev
```

Open the address printed by Vite, normally `http://127.0.0.1:5173`.
Use Node.js 22.12 or later.

## Make a print

- Choose **Saffron**, **After hours**, **Tidal**, or **Bloom**.
- Try **Flow**, **Orbit**, or **Contour** and adjust flow and line density.
- Enter a seed from **1 to 999999** and press Enter, or choose **New composition**.
  Press **Alt+R** (**Option+R** on Mac) when you are not editing the seed to
  generate another composition.
- Use a curated starting point to explore a different direction.
- Choose **Save print** to download a **2400 × 3200 PNG**.

The address contains every setting. Copy it to keep a composition, reload to
reproduce it, or use browser Back to undo a setting change. At 300 pixels per
inch, the export is suitable for an 8 × 10⅔ inch print.

The finished app has no runtime dependencies, remote fonts, or external assets.
There is no backend or account. The development and preview servers are local.

## Validate

```sh
npm run format
npm run format:check
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run test:browser
npm run build
```

Unit tests exercise deterministic geometry and input validation. Browser tests
exercise controls, URL state, keyboard operation, narrow screens, accessibility,
and a real PNG download. Browser tests save sample artwork and desktop and mobile
screenshots into `artifacts/`.

The canvas failure tests deliberately replace `getContext` in isolated
Playwright pages. This narrowly scoped test exception to the rule against
modifying browser prototypes lets the tests exercise real initialization and
resize failures. Application code does not modify browser prototypes.

## Production preview

```sh
npm run build
npm run preview
```

The `dist/` directory contains the static production app.

## GitHub Pages

The public studio is hosted at <https://adityarjn0.github.io/drift/>.
The source lives on `main` in <https://github.com/adityarjn0/drift>.
GitHub Pages publishes the static files from the root of `gh-pages`.

To publish an update, run the validation commands above, build the app, and
commit the contents of `dist/` plus an empty `.nojekyll` file to `gh-pages`.
Push that branch to GitHub and wait for the Pages deployment to finish.
Pushing source changes to `main` alone does not publish an update.

Vite uses relative asset paths so the build works under the `/drift/` path.

## Source

- `src/settings.ts`: palettes, curated compositions, and URL validation.
- `src/geometry.ts`: seeded, resolution-independent flow-line geometry.
- `src/renderer.ts`: paper, ink, texture, and print captions.
- `src/main.ts`: studio controls, browser history, preview, and PNG export.
- `src/style.css`: responsive studio design and keyboard focus styles.

Source follows the [Google TypeScript style guide](https://google.github.io/styleguide/tsguide.html),
with Prettier and ESLint enforcing the checked-in conventions.

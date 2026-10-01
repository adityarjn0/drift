# Drift print studio

The user asked for autonomous creative work and a finished result. This empty
workspace will become a local, single-screen generative print studio.

The experience opens directly on a finished artwork. A compact control column
offers four palettes, three flow patterns, flow and density sliders, an editable
composition seed, and a button for a new composition. The main canvas dominates
the screen. Three curated starting points offer immediate visual variety.

The visual direction is a printmaker's desk: ink-colored text, restrained rust
accents, warm paper, a serif wordmark, and a generous matte around the artwork.
Native fonts and procedural art make the finished app independent of external
assets or services.

Use TypeScript, Canvas 2D, and Vite, with no runtime framework or backend.
Separate configuration validation, deterministic geometry, canvas painting, and
interface orchestration. Compute geometry in logical 720 × 960 coordinates;
scale the same geometry for both preview and a 2400 × 3200 PNG export.

Seeds are whole numbers from 1 to 999999. Reject invalid edits without replacing
the current artwork. Accept only recognized palettes and patterns; clamp any
settings restored from a URL to their supported ranges. Put settings in the URL
so reload and browser history can reproduce a composition. Density is 20–100;
flow is 0–100. Provide useful error and busy feedback for rendering and export.

All controls must be keyboard accessible, with visible focus, labeled sliders,
and a live status message. Support 320px-wide phones, desktop layouts, and
reduced motion. The canvas has a textual description. Use the Google TypeScript
style guide and the project's formatter and linter without unrelated changes.

Verify deterministic geometry, validation, density and pattern changes in unit
tests. Verify palette and seed changes, invalid seeds, URL reload, keyboard
interaction, mobile layout, and real PNG export in a browser. Run formatting,
formatter check, lint, type check, tests, and production build. Inspect the
finished interface and save a screenshot and sample print for the user.

No publication, external account changes, or Git initialization is needed.

# Unmark

Remove watermarks from photographs with OpenRouter image models — entirely in the browser.
Drop in a batch, add reference shots so faces stay recognisable, tweak the prompt, compare
before/after with a draggable divider, and download the results.

Nothing is uploaded anywhere except to OpenRouter's image API, and your library (originals,
results, references, settings) is stored in this browser's IndexedDB / localStorage, so a
reload — or a different day — picks up exactly where you left off.

## Features

- **Batch queue** — drop, choose or paste many images at once; two generations run at a time,
  each job can be re-run, cancelled or removed on its own.
- **Reference faces** — up to 8 reference images (model dependent) are sent alongside each
  source image so identity and detail are preserved rather than re-invented.
- **Editable prompt** — a careful default prompt plus four presets (general photo, portrait,
  product, document) and full text control over what the model is asked to do.
- **Overlap comparison** — the before/after view is a single image with a draggable divider
  (mouse, touch or arrow keys), not a side-by-side pair. Open it from any finished card or
  by clicking the thumbnail.
- **Resolution & aspect ratio** — pick a resolution tier and either a fixed ratio or *Auto*,
  which snaps to the supported ratio closest to your upload.
- **Download** — per image, in the format you chose (PNG, JPEG or WebP), named
  `<original>-unmark.<ext>`.
- **Persistent** — jobs, images, references and settings survive a reload.
- **Client-side only** — no backend, no build-time secrets; it deploys as static files.
- **Mobile** — single-column layout, sticky action bar and a full-screen settings sheet.
- **Demo mode** — a sample batch with ready-made results, so you can try the whole flow
  (queue, comparison, download) before pasting a key.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
```

Then open the app, click **Connect OpenRouter** and paste an API key from
<https://openrouter.ai/keys>. The key is checked against `GET /api/v1/key` and kept in
`localStorage` on your machine only.

```bash
npm run build    # type-check + production bundle into dist/
npm run preview  # serve the built bundle
```

Deploy `dist/` to any static host (GitHub Pages, Netlify, Vercel, S3, …). No server code.

## Testing

```bash
npm test         # builds, then runs the browser tests against dist/
```

`tests/compare-slider.test.mjs` drives the comparison slider in a real Chromium page: mouse drag
on desktop, *real touch events* on an emulated 390×844 phone (straight and diagonal swipes, plus a
grab of the handle itself), and the keyboard controls. It loads the demo batch first, so the test
needs no API key and makes no network calls to OpenRouter.

Playwright's browser binaries are not downloaded: the suite launches an installed Chrome/Chromium
(`CHROMIUM_PATH`, otherwise `/usr/bin/chromium`, `chromium-browser` or `google-chrome`). If none is
found the suite is skipped rather than failed.

## Demo mode

No key yet? Click **Try a demo batch** in the empty state (or **Try the demo** in the connect
dialog). Two bundled sample photographs — a coastline and a studio portrait — load with finished
results already attached, so you can drag the comparison slider, inspect the metadata and
download a result without spending a credit or sending an image anywhere.

The demo photos are static files in `public/demo/` and are flagged with a `DEMO` chip; re-running
them is disabled. **Exit demo** removes the sample jobs and their stored blobs and leaves your own
images, references and settings untouched.

## How a job runs

1. The original is decoded in a canvas and downscaled when needed so the request stays under
   ~3.2 MB; references are prepared the same way.
2. The chosen model's capabilities are read live from `GET /api/v1/images/models` (with a
   built-in fallback catalog) so unsupported `resolution` / `aspect_ratio` values are never sent.
3. `POST /api/v1/images` with the prompt, the source image and any references as
   `input_references`. *Auto* aspect is resolved to the closest supported ratio first.
4. The returned base64 image is stored in IndexedDB and rendered next to the original for
   comparison.

Generation happens on OpenRouter's side, so failed or cancelled generations are not charged;
the app reports both the error and the cost when a job finishes.

## Privacy

- The API key lives in `localStorage`; images and results live in IndexedDB.
- Nothing is sent to any server other than `openrouter.ai`.
- Removing a card, clearing finished jobs or removing a reference deletes its stored blobs too.
- **Clear local data** in the connect dialog wipes every job, reference, blob and saved setting
  from this browser (it asks for a second tap first).
- There is no analytics, no tracking and no third-party script.

## Project layout

```
src/
  App.tsx                    shell, drag/paste handling, mobile action bar
  components/
    Header.tsx               wordmark, key status, settings toggle
    Dropzone.tsx             full panel and compact "add more" strip
    Queue.tsx                toolbar, empty state, card grid
    JobCard.tsx              per-image card, status chip, actions
    CompareDialog.tsx        overlap slider comparison
    SettingsPanel.tsx        prompt, model, resolution, ratio, format, references
    KeyDialog.tsx            OpenRouter key connect / verify / remove
    ui/                      button, dialog, card & form primitives (Tailwind + Radix)
  lib/
    store.ts                 zustand store, queue pump, persistence
    openrouter.ts            model discovery, capabilities, image generation
    image.ts                 decode, thumbnails, request-size preparation
    ratio.ts                 aspect-ratio maths ("auto" = closest ratio)
    db.ts                    IndexedDB blob storage
    demo.ts                  bundled sample scenes for demo mode
    brand.ts                 logo glyph + generated favicon (single source of truth)
    download.ts, presets.ts, utils.ts
public/
  demo/                      sample before/after photos used by demo mode
tests/
  compare-slider.test.mjs    browser tests: mouse, touch and keyboard on the slider
  support.mjs                static server, Chromium launch, demo/compare helpers
```

## Notes & limits

- Uploads are capped at 24 MB per file; JPG, PNG, WebP and AVIF are accepted.
- Some models return a fixed native size and ignore `resolution`; others take no aspect ratio.
  The settings panel always reflects what the selected model actually supports.
- Reference support varies: 5–20 images depending on the model, and some models accept none.
- Very long edge cases (odd formats, 1-bit PNGs, animated files) are rejected with a message
  instead of failing silently.
- The favicon is generated at runtime from the same path data as the header logo
  (`src/lib/brand.ts`), so there is no binary icon in the repo to keep in sync.

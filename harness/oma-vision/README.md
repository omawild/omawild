# oma-vision harness

- `gate.test.mjs` — Node tests for gate helpers (`node --test harness/oma-vision/gate.test.mjs`)
- `index.html` — FOUC CSS lock smoke markup (serve the repo root over HTTP to open)

## Admin wiring (Task 7)

1. On an **unpublished** review theme, push:
   - `sections/oma-vision.liquid`
   - `assets/oma-vision.css`
   - `assets/oma-vision.js`
   - `assets/oma-vision-badge.svg`
2. In Admin → Online Store → Pages → Add page **Vision**, handle `vision`.
3. Create template **vision** (page) and add section **OMA Vision**.
4. Preview checklist: boarding → name unlock → Base Camp `DELUSIONAL` → help mailto; chrome store vs minimal; no Figtree/Archivo.
5. Do **not** publish via CLI; do **not** push `omawild-v2`.

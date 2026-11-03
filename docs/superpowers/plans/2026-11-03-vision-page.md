# Vision Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/pages/vision` as a gated expedition story page (name boarding → vision → Base Camp with `DELUSIONAL`) using NHD and one `oma-vision` section.

**Architecture:** One section (`oma-vision`) owns markup, schema, and gates. Pure gate helpers live in `assets/oma-vision.js` and are covered by Node tests; Liquid always renders boarding + vision + investor HTML, with CSS/`data-*` attributes locking regions until JS unlocks them (bypassed in theme `design_mode`). Minimal chrome is a section setting that toggles a `body` class + CSS hide of header/footer groups—no `theme.liquid` edit unless that fails.

**Tech Stack:** Shopify Liquid OS 2.0, theme CSS variables (NHD), vanilla JS (`crypto.subtle` + `sessionStorage`), Node built-in test runner for gate helpers, `shopify theme check`.

**Spec:** `docs/superpowers/specs/2026-11-02-vision-page-design.md`

## Global Constraints

- New files only under `sections/oma-vision*`, `assets/oma-vision*`, harness under `harness/oma-vision/` if needed — no RoarTheme vendor edits.
- Fonts: `var(--font-heading-family)` / `var(--font-body-family)` only; display headings use NHD **900** (map redesign Figtree 800 → 900); never 500/800.
- Palette defaults: Electric `#FF3F00`, Wonderland `#FCD0FD`, Salmon `#FFE4E7`, Sand `#F7F5F1`, Midnight `#00180C`, Sunbrella `#FBB925`, hover Electric Deep `#D63200` only.
- Base Camp digest: SHA-256 of `DELUSIONAL` = `c583bde67aa71c3ae2ef8d37d3f3f65879a70994284e4b4fa5747ff209ac3c59` (never plaintext equality check).
- `sessionStorage` keys: `ow-vision2-boarded`, `ow-vision-guest`, `ow-vision2-inner`.
- No `noindex`; no Figtree/Archivo links; leave `page.invest.json` alone.
- `templates/*.json` is in `.shopifyignore` — do **not** change ignore without asking; create/assign the vision template in the theme editor (or one `--only` push after asking).
- Never push `omawild-v2`/`main`, never `--live` / `--allow-live`; `theme check` must be 0 before any push.
- Commits only when the user asks during execution (plan steps still list suggested messages).

## Review Focus

- First paint before JS: vision must stay locked (no unlocked FOUC) — Task 2 harness asserts `data-boarded` absent / vision not displayed.
- `design_mode`: both gates open without session keys — Task 1 + Task 2.
- Wrong Base Camp code shows the exact error string; `delusional` (any case) unlocks — Task 1.
- Help mailto includes guest name, email, and selected help labels — Task 4.
- Minimal chrome hides store header/footer groups and shows sticky logo — Task 6.

---

## File map

| File | Responsibility |
|---|---|
| `assets/oma-vision.js` | Gate helpers + section init (boarding, Base Camp, strip, help form, chrome class) |
| `assets/oma-vision.css` | Band layout, gates, placeholders, minimal-chrome rules |
| `assets/oma-vision-badge.svg` | Expedition badge from redesign zip |
| `sections/oma-vision.liquid` | Markup, critical lock attributes, schema + blocks, asset tags |
| `harness/oma-vision/index.html` + `harness/oma-vision/gate.test.mjs` | Static FOUC/CSS check + Node tests for pure helpers |
| Theme admin | Page handle `vision` + template `vision` placing `oma-vision` |

Block types (schema): `story_note`, `ors_card`, `chapter`, `milestone`, `help_option`, `road`, `filter_item`, `number_row` (use `type` setting `done` \| `need` for column). Band chrome copy = section settings.

---

### Task 1: Gate helpers (testable JS core)

**Files:**
- Create: `assets/oma-vision.js` (pure exports + later IIFE init)
- Create: `harness/oma-vision/gate.test.mjs`

**Interfaces:**
- Consumes: none
- Produces:
  - `normalizeCode(raw: string): string` — trim + uppercase
  - `sha256Hex(text: string): Promise<string>`
  - `BASE_CAMP_DIGEST: string` — `c583bde67aa71c3ae2ef8d37d3f3f65879a70994284e4b4fa5747ff209ac3c59`
  - `isBaseCampCode(raw: string): Promise<boolean>`
  - `STORAGE = { boarded: 'ow-vision2-boarded', guest: 'ow-vision-guest', inner: 'ow-vision2-inner' }`
  - `readGateState(storage, { designMode: boolean }): { boarded: boolean, guest: string, inner: boolean }` — if `designMode`, both gates true and guest may be `''`
  - `buildHelpMailto({ to, subjectPrefix, name, email, picks, note }): string` — `mailto:` URL

- [ ] **Step 1: Write failing Node tests** in `harness/oma-vision/gate.test.mjs`

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCode, isBaseCampCode, BASE_CAMP_DIGEST,
  readGateState, STORAGE, buildHelpMailto
} from '../../assets/oma-vision.js';

test('normalizeCode trims and uppercases', () => {
  assert.equal(normalizeCode('  delusional '), 'DELUSIONAL');
});

test('DELUSIONAL matches BASE_CAMP_DIGEST', async () => {
  assert.equal(BASE_CAMP_DIGEST, 'c583bde67aa71c3ae2ef8d37d3f3f65879a70994284e4b4fa5747ff209ac3c59');
  assert.equal(await isBaseCampCode('delusional'), true);
  assert.equal(await isBaseCampCode('WRONG'), false);
});

test('readGateState respects session and designMode', () => {
  const mem = {
    getItem: (k) => mem[k] ?? null,
    setItem: (k, v) => { mem[k] = String(v); }
  };
  assert.deepEqual(readGateState(mem, { designMode: false }), { boarded: false, guest: '', inner: false });
  mem.setItem(STORAGE.boarded, '1');
  mem.setItem(STORAGE.guest, 'Jenny');
  assert.equal(readGateState(mem, { designMode: false }).guest, 'Jenny');
  assert.equal(readGateState(mem, { designMode: true }).boarded, true);
  assert.equal(readGateState(mem, { designMode: true }).inner, true);
});

test('buildHelpMailto encodes name picks and email', () => {
  const url = buildHelpMailto({
    to: 'hello@omawild.com',
    subjectPrefix: 'Expedition',
    name: 'Jenny',
    email: 'j@x.com',
    picks: ['Funding', 'Distribution'],
    note: 'Hi'
  });
  assert.match(url, /^mailto:hello@omawild\.com\?/);
  assert.match(url, /Jenny/);
  assert.match(url, /Funding/);
});
```

- [ ] **Step 2: Run tests — expect FAIL** (module missing)

Run: `node --test harness/oma-vision/gate.test.mjs`  
Expected: FAIL resolving `../../assets/oma-vision.js` or missing exports

- [ ] **Step 3: Implement exports in `assets/oma-vision.js`**

Use `crypto.subtle` in browser; in Node use `import { webcrypto } from 'node:crypto'` or `globalThis.crypto`. Structure so Node can `import` the pure helpers (ESM: add `"type"` via `.js` with named exports at top, init behind `typeof document !== 'undefined'`). Do not store plaintext `DELUSIONAL` in an `===` check.

- [ ] **Step 4: Run tests — expect PASS**

Run: `node --test harness/oma-vision/gate.test.mjs`  
Expected: PASS (all four)

- [ ] **Step 5: Commit** (when user asks)

```bash
git add assets/oma-vision.js harness/oma-vision/gate.test.mjs
git commit -m "$(cat <<'EOF'
Add oma-vision gate helpers and Node tests.

EOF
)"
```

---

### Task 2: Section shell — boarding + locked vision FOUC

**Files:**
- Create: `sections/oma-vision.liquid`
- Create: `assets/oma-vision.css`
- Create: `assets/oma-vision-badge.svg` (copy from redesign zip `assets/badge-expedition.svg`)
- Create: `harness/oma-vision/index.html`
- Modify: `assets/oma-vision.js` — `initOmaVision(root)` binding DOM

**Interfaces:**
- Consumes: Task 1 helpers + `STORAGE`
- Produces: root element API —
  - `.oma-vision` root with `data-boarded="false|true"`, `data-inner="false|true"`, `data-chrome="store|minimal"`
  - `#oma-vision-boarding`, `#oma-vision-main`, `#oma-vision-basecamp`, `#oma-vision-investor`
  - CSS: `[data-boarded="false"] #oma-vision-main { display: none }`, `[data-inner="false"] #oma-vision-investor { display: none }`, inverse for basecamp lock panel
  - Liquid sets `data-boarded` / `data-inner` to `true` when `request.design_mode`, else `false` (JS upgrades from sessionStorage)

- [ ] **Step 1: Write harness assertions** in `harness/oma-vision/index.html` (load CSS + minimal DOM mirroring root attributes default `false`)

Script at bottom:

```js
const root = document.querySelector('.oma-vision');
const main = document.querySelector('#oma-vision-main');
console.assert(root.getAttribute('data-boarded') === 'false');
console.assert(getComputedStyle(main).display === 'none');
```

- [ ] **Step 2: Open harness in a headless check**

Run: `node -e "/* optional */"` or open via Playwright/browser_evaluate — minimum: confirm CSS file contains the `[data-boarded="false"] #oma-vision-main` rule:

Run: `rg -n 'data-boarded="false"].*#oma-vision-main|#oma-vision-main' assets/oma-vision.css`  
Expected: lock rule present (after Step 3)

- [ ] **Step 3: Implement liquid shell + CSS + badge + boarding form**

Boarding defaults from spec: headline “Pack your bags. We’re going on a mission.”; Passenger + Board now; error “Tell us who’s boarding.”  
`initOmaVision`: on submit, validate name, set storage, set `data-boarded`, `scrollTo(0,0)`, sync guest into `[data-guest-pill]`.  
Wire `stylesheet_tag` + deferred script. Schema: boarding strings, `chrome` select `store`|`minimal` default `store`.

- [ ] **Step 4: `shopify theme check` on new section**

Run: `shopify theme check`  
Expected: 0 offenses (or only pre-existing; new files clean)

- [ ] **Step 5: Commit** (when user asks)

---

### Task 3: Public vision bands (hero → nature fund)

**Files:**
- Modify: `sections/oma-vision.liquid` — bands 1–8 from spec §5.2 (include milestones / goals)
- Modify: `assets/oma-vision.css` — band layouts (1440 container, Electric borders, stubby shadows)

**Interfaces:**
- Consumes: boarded main region `#oma-vision-main`
- Produces: blocks `story_note`, `ors_card`, `chapter`, `milestone` with image_pickers; section settings for hero/mission/sourcing/pantry/goals/partner/model copy; empty images → Salmon placeholder panel

- [ ] **Step 1: Port band markup + schema defaults** from `/tmp/omawild-redesign/Vision Page.dc.html` (or re-extract from zip) — NHD tokens, no Google fonts

Include goals/milestones band (redesign §06). Preset blocks in schema `presets` so a fresh section instance has ORS ×4, chapters ×3, story notes ×7, milestones × enough from redesign.

- [ ] **Step 2: Story strip prev/next in `initOmaVision`** — horizontal scroll on `[data-vision-notes]`, buttons `[data-vision-notes-prev]` / `next`

- [ ] **Step 3: Theme check**

Run: `shopify theme check`  
Expected: 0 offenses on touched files

- [ ] **Step 4: Commit** (when user asks)

---

### Task 4: Help form (“where you come in”)

**Files:**
- Modify: `sections/oma-vision.liquid` — help form markup + `help_option` blocks
- Modify: `assets/oma-vision.js` — toggle picks, validate, `buildHelpMailto`, success state

**Interfaces:**
- Consumes: `buildHelpMailto`, guest from `STORAGE.guest`
- Produces: errors “Pick at least one.” / “Add an email so we can reply.”; success copy “You're on the crew list.”; default `mailto` to `hello@omawild.com`

- [ ] **Step 1: Extend `gate.test.mjs`** with assertion that empty picks are the caller’s job (mailto builder still works) — keep builder pure

- [ ] **Step 2: Implement form UI + JS** matching redesign multi-select rows (Distribution, OEM, Funding, Partnerships, PR & stages defaults)

- [ ] **Step 3: Manual or harness: submitting with name Jenny + Funding opens mailto containing those strings** (document in harness README one-liner)

- [ ] **Step 4: Commit** (when user asks)

---

### Task 5: Base Camp + investor bands

**Files:**
- Modify: `sections/oma-vision.liquid` — lock panel + roads / filter / numbers
- Modify: `assets/oma-vision.js` — `submitInner` via `isBaseCampCode`
- Modify: `assets/oma-vision.css` — inner lock/unlock visibility

**Interfaces:**
- Consumes: `isBaseCampCode`, `STORAGE.inner`
- Produces: locked panel visible when `data-inner="false"`; investor `#oma-vision-investor` when `true`; error “Not a base camp code. Ask us for one.”; invest mailto setting default `invest@omawild.com`; number_row defaults `[kg]`, `[#]`, `[NT$]`, `[units]`, `[months]` per redesign

- [ ] **Step 1: Add Node test** already covers digest — add DOM-free test that `WRONG` is false (done in Task 1). Add comment in liquid schema warning: placeholders only, not confidential.

- [ ] **Step 2: Implement lock UI + investor blocks** (`road`, `filter_item`, `number_row`) with redesign default copy

- [ ] **Step 3: Verify design_mode liquid sets `data-inner="true"`** so investor bands show in editor without code

- [ ] **Step 4: Theme check + Node tests**

Run: `node --test harness/oma-vision/gate.test.mjs && shopify theme check`  
Expected: PASS / 0 offenses

- [ ] **Step 5: Commit** (when user asks)

---

### Task 6: Minimal chrome setting

**Files:**
- Modify: `assets/oma-vision.js` — if `data-chrome="minimal"`, `document.body.classList.add('oma-vision-minimal')` on init; remove on section unload if possible
- Modify: `assets/oma-vision.css` — hide `.shopify-section-group-header-group` and footer group under `body.oma-vision-minimal`; show `.oma-vision__sticky-logo`
- Modify: `sections/oma-vision.liquid` — sticky logo bar markup (hidden unless minimal)

**Interfaces:**
- Consumes: section setting `chrome`
- Produces: no `layout/theme.liquid` edit. If hide selectors fail on the live theme DOM, **stop and ask** before editing layout.

- [ ] **Step 1: Implement class toggle + CSS + sticky logo**

- [ ] **Step 2: Document verification** — in theme preview, set Chrome → Minimal, confirm header/footer gone and logo bar present; switch back to Store

- [ ] **Step 3: Commit** (when user asks)

---

### Task 7: Admin wiring + end-to-end verification

**Files:**
- None in git for `templates/*.json` unless user approves an ignore exception
- Optional: short note in `docs/superpowers/specs/2026-11-02-vision-page-design.md` status → Implemented (only if user wants doc update)

**Interfaces:**
- Consumes: completed section on an unpublished theme

- [ ] **Step 1: In Shopify admin (human or instructed):** create Page “Vision”, handle `vision`; create template `vision` (page); add section **OMA Vision** / `oma-vision`

- [ ] **Step 2: Push section/assets only to unpublished theme**

```bash
# Read SHOP_STORE / SHOP_THEME from .env — never assume
shopify theme list --store "$SHOP_STORE"   # confirm target is NOT [live]
shopify theme push --store "$SHOP_STORE" --theme "$SHOP_THEME" --only sections/oma-vision.liquid --only assets/oma-vision.css --only assets/oma-vision.js --only assets/oma-vision-badge.svg
```

- [ ] **Step 3: Manual checklist**

  - Boarding blocks vision; name unlocks; pill shows guest  
  - Reload keeps boarded  
  - Base Camp locked; `DELUSIONAL` unlocks; wrong code errors  
  - Help mailto works  
  - No Figtree/Archivo in network  
  - `theme check` 0  
  - Chrome store vs minimal  

- [ ] **Step 4: Stop** — do not publish; hand preview URL to user

---

## Self-review notes

- Spec §5.1–5.3, §6 chrome/code/images, design_mode + visual lock → Tasks 1–6.  
- Template ignore constraint → Task 7 admin path.  
- Goals band included in Task 3.  
- Review Focus items mapped to Tasks 1, 2, 4, 6.

# owv2 Product Detail — Design Spec (Phase 1)

**Date:** 2026-09-20
**Branch:** `omawild-v2`
**Status:** Approved for planning
**Scope:** Phase 1 — core buy experience. Phase 2 (origin story, brew guide,
pairings, Limited Reserve polish) is a separate later spec.

---

## 1. Purpose

Redesign the coffee product detail page (PDP) for the v2 storefront around one
idea taken from the source mockup: **"the label is the product page."** The
spec table (varietal, elevation, producer, processing, roast, freshness) is the
page's spine, set as real typography rather than hidden in an accordion, and
every interactive element serves a single decision path:

> **grind → size → subscribe or one-time.**

Phase 1 ships the parts of that page that carry the transaction and the brand
look: the label hero, the gallery, the restyled buy panel, and the "what this
bag funds" (1% for the Planet) block. It does **not** ship the below-the-fold
storytelling ("The Drink" origin, "How to brew it", pairings) — those are
Phase 2.

## 2. Context (what already exists)

- The current coffee PDP is `templates/product.product-coffee.json`, assembled
  entirely from **vendor** `main-product` blocks plus the native **Shopify
  Subscriptions** app block (`shopify://apps/subscriptions/...`). There is no
  v2 product template yet.
- Coffee data is already modelled as `custom.*` metafields:
  `region`, `farmer_producer`, `varietal_all_listed`, `taste_notes`,
  `elevation_masl`, `crop_year`. The redesign extends this set; it does not
  invent a new pattern.
- The theme ships Shopify-standard, reusable transaction plumbing we will lean
  on rather than rebuild:
  - `<product-form>` (`assets/product-form.js`) — AJAX add-to-cart
  - `product-info.js` + `pubsub.js` — variant selection → price/availability
    events
  - snippets `buy-buttons.liquid`, `product-variant-picker.liquid`,
    `product-variant-options.liquid`
  - the Subscriptions app block — selling plans
  - `<cart-drawer>` / `cart.js` — the cart that opens on add
  - `component-product-sticky-cart.css` + sticky element — mobile sticky bar
  - `product-thumbnails.js` — gallery thumbnails
- v2 work uses an `owv2-*` section/asset family (hero, story, marquee,
  subscribe, etc.) assembled via JSON templates. This PDP follows that naming.

## 3. Architecture (Approach C — hybrid)

Shopify sections stack full-width by default, but the PDP fold is a coupled
**two-column** layout (gallery left; label + buy + funds right) that must align
and share sticky behavior. Therefore:

- **One section owns the coupled fold:** `owv2-product-main.liquid` contains the
  whole above-the-fold region so the two columns share a single CSS grid and
  sticky context.
- **Below-fold storytelling stays modular** (Phase 2): separate small owv2
  sections composed in the template JSON. This mirrors the vendor `main-product`
  pattern (one section for the fold) plus owv2 modularity below.

**Presentation is ours; the transaction is theirs.** The buy panel is a
*restyle* of vendor mechanics, not a reimplementation. Grind/Size pills and the
Subscribe/One-time toggle are styled `<input>`s inside the vendor
`<product-form>`; when one changes, `product-info.js` already resolves the
variant and broadcasts it on `pubsub`, and our code merely subscribes.

## 4. Files (Phase 1)

All net-new, per CLAUDE.md rule 3 (prefer new files; no vendor edits).

| File | Purpose |
|---|---|
| `sections/owv2-product-main.liquid` | Two-column fold: label hero + gallery + buy panel + "what this bag funds". Owns layout grid + sticky. Has a `{% schema %}` with settings + a `preset`. |
| `snippets/owv2-product-label.liquid` | Hero: grade eyebrow, title, tagline, tasting-note tags. |
| `snippets/owv2-product-gallery.liquid` | Large bag shot + square thumbnail row (reuses `product-thumbnails.js`). |
| `snippets/owv2-product-buy.liquid` | Grind/size pills + Subscribe/One-time toggle + price, wrapped in the vendor `<product-form>`, embedding the vendor variant-picker + Subscriptions app block. |
| `assets/owv2-product.css` | All styling. Loaded by the section via `stylesheet_tag`. |
| `assets/owv2-product.js` | Thin controller: subscribes to `pubsub` variant events → updates price display, sticky bar, active pill styling. No cart logic of its own. |

Snippets are split out (rather than one big section file) so each unit has one
clear purpose and can be reasoned about and harness-tested independently.

**Not created by code:** the template JSON — see §8.

## 5. Layout

**Desktop (≥750px):** CSS grid, two columns.
- Left: gallery (large bag shot + thumbnail row).
- Right: a `position: sticky` rail containing label hero → buy panel →
  "what this bag funds", so the buy decision follows the scroll past the tall
  gallery.

**Mobile (≤749px):** single column, **label-first order** to match the mockup:
eyebrow → title → tagline → tasting tags → gallery → buy panel → funds. A
**sticky bottom bar** (reusing `component-product-sticky-cart.css` + the vendor
sticky element) carries price + CTA, so there is no duplicate inline button.

Single `~749px` breakpoint, mobile-first, matching theme convention.

## 6. Data model (metafields)

Phase 1 is light because most content is Shopify-native (title, description,
images, variants, price, selling plans).

**New metafields:**
- `custom.grade_eyebrow` — `single_line_text_field`. The eyebrow line, e.g.
  "GRADE / SPECIALTY · SINGLE ORIGIN".
- `custom.tagline` — `single_line_text_field` (or multiline). The one-liner
  under the title (distinct from `product.description`).

**Reused metafields:**
- `custom.taste_notes` — the tasting-tag row. Target type is
  `list.single_line_text_field`. **Fallback:** if the live definition is plain
  text, split on commas at render time. (Confirm the type during
  implementation.)
- `custom.region` — optional link target for the funds block.

**Variants & pricing (native, no metafield):**
- **Grind** (Whole bean / Ground for filter / Ground for espresso) and **Size**
  (200 g / 450 g) are the product's two **variant options**. *Assumption to
  confirm on the test product:* the coffee is set up with these two options so
  the vendor variant-picker + cart path work unchanged. Flag if a product
  models them differently.
- Price and compare-at come from Shopify; the compare-at strike renders only
  when `compare_at_price > price`.
- Subscribe/One-time is a **selling plan** via the Subscriptions app block.

**"What this bag funds"** copy is **section settings** (the 1% blurb, the
"For the Planet" mark, an optional "how region works" link) — no new metafield.

## 7. Data flow & graceful degradation

**Buy interaction (no new cart logic):**
```
click grind/size pill
  → vendor product-info.js resolves the variant
  → broadcasts on pubsub
  → owv2-product.js listens and updates:
      (a) our price display
      (b) the mobile sticky bar
      (c) active pill styling
```
We subscribe to variant events; we never compute variants ourselves. Add-to-cart
posts through the vendor `<product-form>` and opens the existing `<cart-drawer>`.

**Every dynamic bit is guarded:**
- Empty metafield → that element does not render (no empty labels/tags).
- No tasting notes → the tag row is omitted.
- No `compare_at_price` above price → no strike-through.
- **No selling plan** → the panel degrades to one-time-only. (This is also the
  Phase 2 "Limited Reserve" micro-lot behavior, obtained for free here.)

## 8. Deploy path & the template JSON

`templates/*.json` are **tracked in git but excluded from `theme push`** via
`.shopifyignore`; the theme editor owns them on the store. Consequence: a new
section is invisible until placed once in the editor.

**Sequence:**
1. Code (`sections/`, `snippets/`, `assets/`) is pushed to the **unpublished
   review theme**: `shopify theme check` clean → `shopify theme push --store
   $SHOP_STORE --theme $SHOP_THEME`. Never `main`, never `--live`,
   never `--environment staging`.
2. **User** creates a product template in the theme editor (e.g.
   `product.omawild-v2`), adds the `owv2-product-main` section, and assigns a
   test product. This write syncs back to git as a `shopify[bot]` commit.
3. **Claude** then authors/refines the full template JSON in git off that
   baseline (block order, section settings), at the user's request.
4. Because that JSON is `.shopifyignore`'d, getting Claude's version onto the
   store requires a **one-time, explicit, single-file push of just that
   template** (overriding the ignore for that one file). This is a deploy-safety
   action (CLAUDE.md rule 5) and **will be confirmed with the user at the
   moment** it happens. For Phase 1 the JSON is essentially one section, so the
   risk is minimal.

## 9. Styling rules (from CLAUDE.md)

- Build our own section, so vendor `section-main-product.css` never loads; we
  pull only the specific vendor component CSS we reuse (e.g.
  `component-product-sticky-cart.css`). No cascade fight.
- Typography reads `var(--font-heading-family)` / `var(--font-body-family)`
  (NHD) only. Never `settings.type_body_font`; never weight 500 (NHD ships
  400/600/700/900). Headings 600, body 400.
- Reuse existing owv2 palette tokens; any PDP-specific shades (the orange "The
  Drink" block foreshadowed for Phase 2, cream cards) are scoped
  `--owv2-product-*` custom properties at the section root, not globals.

## 10. Testing / verification

`shopify theme dev` 404s in this repo (templates withheld from the scratch
theme), so front-end proof is a static harness, per CLAUDE.md.

1. `shopify theme check` → **0 offenses** before any push (baseline; anything
   above is a regression).
2. **Static harness** (scratchpad): loads the real `assets/owv2-product.css` +
   `owv2-product.js` against markup mirroring the section output; asserts layout
   with `getComputedStyle` / `getBoundingClientRect`; simulates a `pubsub`
   variant event and asserts the price + sticky bar update.
3. **Review-theme click-through:** variant select → add → cart drawer; subscribe
   vs one-time; mobile sticky bar; compare-at strike.

## 11. Out of scope (Phase 2)

- "The Drink" origin block (region/producer/elevation/forest/sourcing/harvest),
  likely a metaobject or expanded `custom.*` fields.
- "How to brew it" method cards — needs a **repeatable metaobject** for
  per-method ratios (coffee/water/temp/time), with the 3-in-a-row →
  horizontal-snap-swipe behavior for 4+ methods.
- "Pairs well with" — reuse `product-recommendations`.
- Limited Reserve / no-subscription micro-lot presentation polish (the buy
  panel already degrades correctly; this is the surrounding scarcity styling).

## 12. Open items to confirm during implementation

- Exact live type of `custom.taste_notes` (list vs plain text).
- The test product is set up with Grind + Size as its two variant options.
- Which existing owv2 palette tokens to reuse vs. define new PDP-scoped ones.

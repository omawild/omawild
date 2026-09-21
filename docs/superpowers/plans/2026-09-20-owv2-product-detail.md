# owv2 Product Detail (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Phase 1 v2 coffee product detail page — label hero, gallery, restyled buy panel, and "what this bag funds" block — as net-new `owv2-*` files that restyle the vendor transaction plumbing without reimplementing it.

**Architecture:** One section (`owv2-product-main.liquid`) owns the coupled two-column fold (CSS grid + sticky rail) and hosts the vendor `<product-info>` custom element, the vendor `product-variant-picker`/`buy-buttons` snippets, and the Subscriptions app block. Presentation (label, pills, price display, sticky bar) is ours; variant resolution and add-to-cart stay the vendor's. Our JS is a thin `pubsub` listener that never computes variants.

**Tech Stack:** Shopify Liquid sections/snippets, vanilla JS custom element + `pubsub.js`, plain CSS loaded via `stylesheet_tag`. No build step. No JS framework.

**Spec:** `docs/superpowers/specs/2026-09-20-owv2-product-detail-design.md` (read it alongside this plan — the plan argues from it).

## Global Constraints

Copied verbatim from the spec and CLAUDE.md. Every task's requirements implicitly include these.

- **`shopify theme check` must report 0 offenses** before any push. Do not silence a rule; fix the code or ask. (Baseline: 0 offenses / 222 files.)
- **All new work is net-new files.** No edits to vendor RoarTheme files. (CLAUDE.md rule 3.)
- **Never hand-edit `templates/*.json` or `config/settings_data.json`.** They are theme-editor-owned and `.shopifyignore`'d. (CLAUDE.md rule 2.)
- **Never** `git push` while on `main`, never `--live`/`--allow-live`, never `--environment staging`. Push code to the unpublished review theme only: `shopify theme push --store $SHOP_STORE --theme $SHOP_THEME`. `$SHOP_STORE`/`$SHOP_THEME` come from the untracked `.env` — read it, never hardcode.
- **Typography:** read `var(--font-heading-family)` / `var(--font-body-family)` (NHD) only. Never `settings.type_body_font`. Headings weight 600, body 400; NHD ships 400/600/700/900 only — never 500.
- **Section CSS namespacing:** derive `owid` as `section.id | replace: '-','' | replace: '_',''` and prefix every selector `.owv2-product-{{ owid }}` (the established owv2 pattern — see `sections/owv2-subscribe.liquid`).
- **PDP-specific colors** are scoped `--owv2-product-*` custom properties at the section root, never globals. Reuse existing owv2 palette tokens where they exist.
- **`pubsub` event to consume:** `variant-change`, payload `{ data: { sectionId, html, variant } }`. Filter on `sectionId === section.id`. `subscribe`/`publish`/`PUB_SUB_EVENTS` are script-scope globals from `assets/pubsub.js`, which must be loaded before `owv2-product.js`.
- **Verification is not a unit framework:** `shopify theme check` + a static harness in the scratchpad (`getComputedStyle`/`getBoundingClientRect` for layout, a synthetic `variant-change` event for JS) + a documented review-theme click-through. `shopify theme dev` 404s in this repo — do not use it.

---

## File Structure

| File | Responsibility |
|---|---|
| `sections/owv2-product-main.liquid` | Two-column fold. Owns the `{% style %}` block (all CSS token defs + grid + breakpoint), the `owid` namespace, the region layout, hosts vendor `<product-info>`, renders the four snippets, loads `pubsub.js` + `owv2-product.js`. Has `{% schema %}` with settings + a `preset`. |
| `snippets/owv2-product-label.liquid` | Label hero: grade eyebrow, title, tagline, tasting-note tags. Pure presentation from metafields, each element guarded. |
| `snippets/owv2-product-gallery.liquid` | Large featured image + square thumbnail row. Reuses `product-media.liquid` / `product-thumbnails.js`. |
| `snippets/owv2-product-buy.liquid` | Buy panel: hosts vendor `product-variant-picker` + `buy-buttons` + Subscriptions app block inside the vendor `<product-form>`; our price display markup. |
| `snippets/owv2-product-funds.liquid` | "What this bag funds" (1% for the Planet) block, rendered from section settings. |
| `assets/owv2-product.css` | Only styling not inlined in the section `{% style %}` — the pill/toggle restyle, sticky-bar overrides, funds card. Loaded via `stylesheet_tag`. |
| `assets/owv2-product.js` | Thin controller custom element `<owv2-product>`: subscribes to `variant-change`, updates price display, active-pill styling, mobile sticky bar. No cart logic. |

CSS is split between the section's inline `{% style %}` (tokens, grid, breakpoint — needs Liquid settings interpolation) and `assets/owv2-product.css` (static component styling). This matches `owv2-subscribe.liquid`, which inlines settings-driven CSS and ships behavior in a separate asset.

---

## Task 1: Section shell + layout grid

Establishes the `owid` namespace, the two-column fold grid, the single `749px` breakpoint, and named empty region containers. No content yet — this task is the skeleton the later snippets slot into.

**Files:**
- Create: `sections/owv2-product-main.liquid`
- Create: `assets/owv2-product.css` (empty-ish shell; grown in later tasks)
- Test: `/tmp/claude-1000/-home-chris-Developer-omawild/<session>/scratchpad/harness/layout.html` (static harness)

**Interfaces:**
- Produces: a section with `owid = section.id | replace: '-','' | replace: '_',''`; root element `.owv2-product-{{ owid }}` containing `<owv2-product data-section="{{ section.id }}">` wrapping a `.fold` grid with two children: `.gallery-col` (contains `[data-region="gallery"]`) and `.buy-col` (sticky rail, contains `[data-region="label"]`, `[data-region="buy"]`, `[data-region="funds"]`). Later tasks render into those regions.

- [ ] **Step 1: Write the failing harness**

Create `harness/layout.html` in the scratchpad. Paste the (eventual) section's rendered HTML skeleton and load the real CSS. Assert the fold is two columns at desktop width and one column, label-first, at mobile width.

```html
<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="../../../assets/owv2-product.css">
<style>/* mirror the section {% style %} grid rules here, owid replaced with 'test' */</style>
<div class="owv2-product-test"><owv2-product data-section="x">
  <div class="fold">
    <div class="gallery-col"><div data-region="gallery">GALLERY</div></div>
    <div class="buy-col">
      <div data-region="label">LABEL</div>
      <div data-region="buy">BUY</div>
      <div data-region="funds">FUNDS</div>
    </div>
  </div>
</owv2-product></div>
<script>
function at(w){document.documentElement.style.width=w+'px';window.dispatchEvent(new Event('resize'));}
function assert(c,m){if(!c)throw new Error('FAIL: '+m);console.log('PASS: '+m);}
// desktop
const fold=document.querySelector('.fold');
const g=document.querySelector('.gallery-col').getBoundingClientRect();
const b=document.querySelector('.buy-col').getBoundingClientRect();
assert(getComputedStyle(fold).display==='grid','fold is a grid');
assert(Math.abs(g.top-b.top)<4,'columns share a top edge (side by side) at desktop');
</script>
```

- [ ] **Step 2: Run it to confirm it fails**

Open the file in a browser (or `npx playwright`/existing MCP browser) at ≥750px width. Expected: FAIL — `owv2-product.css` has no `.fold` grid yet, so `display` is not `grid` and columns stack.

- [ ] **Step 3: Write the section skeleton**

Create `sections/owv2-product-main.liquid`. Follow the `owv2-subscribe.liquid` idiom exactly:

```liquid
{% assign owid = section.id | replace: '-', '' | replace: '_', '' %}
{{ 'owv2-product.css' | stylesheet_tag }}
{% style %}
.owv2-product-{{ owid }} {
  box-sizing: border-box;
  --owv2-product-bg: {{ section.settings.background_color }};
  --owv2-product-ink: {{ section.settings.text_color }};
  --owv2-product-surface: {{ section.settings.card_background }};
  background: var(--owv2-product-bg);
  color: var(--owv2-product-ink);
  font-family: var(--font-body-family);
  padding: {{ section.settings.padding_top }}px max(20px, 5vw) {{ section.settings.padding_bottom }}px;
}
.owv2-product-{{ owid }} *, .owv2-product-{{ owid }} *::before, .owv2-product-{{ owid }} *::after { box-sizing: border-box; }
.owv2-product-{{ owid }} h1 { font-family: var(--font-heading-family); font-weight: 600; letter-spacing: -.03em; line-height: 1.05; margin: 0; }
.owv2-product-{{ owid }} .fold {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  gap: clamp(24px, 4vw, 64px);
  align-items: start;
  max-width: 1320px;
  margin-inline: auto;
}
.owv2-product-{{ owid }} .buy-col { position: sticky; top: 24px; display: grid; gap: 28px; }
@media (max-width: 749px) {
  .owv2-product-{{ owid }} .fold { grid-template-columns: 1fr; gap: 20px; }
  .owv2-product-{{ owid }} .buy-col { position: static; }
  /* mobile label-first: pull label above the gallery */
  .owv2-product-{{ owid }} [data-region="label"] { order: -1; }
}
{% endstyle %}
<div class="owv2-product-{{ owid }}">
  <owv2-product data-section="{{ section.id }}">
    <div class="fold">
      <div class="gallery-col"><div data-region="gallery"></div></div>
      <div class="buy-col">
        <div data-region="label"></div>
        <div data-region="buy"></div>
        <div data-region="funds"></div>
      </div>
    </div>
  </owv2-product>
</div>
{% schema %}
{
  "name": "OWV2 Product main",
  "tag": "section",
  "class": "owv2-product-section",
  "settings": [
    { "type": "color", "id": "background_color", "label": "Background color", "default": "#FFFFFF" },
    { "type": "color", "id": "text_color", "label": "Text color", "default": "#161616" },
    { "type": "color", "id": "card_background", "label": "Card background", "default": "#F5F1EA" },
    { "type": "range", "id": "padding_top", "label": "Padding top", "min": 0, "max": 120, "step": 4, "unit": "px", "default": 48 },
    { "type": "range", "id": "padding_bottom", "label": "Padding bottom", "min": 0, "max": 120, "step": 4, "unit": "px", "default": 48 }
  ],
  "presets": [{ "name": "OWV2 Product main" }]
}
{% endschema %}
```

Note: mobile label-first is done with `order: -1` on the label region inside `.buy-col`; but the spec order is eyebrow→title→tagline→tags→**gallery**→buy→funds, and the gallery lives in `.gallery-col`. Because the two columns are separate grid children, `order` inside `.buy-col` cannot interleave the gallery between label and buy. **Correction to apply:** at mobile, the grid must flatten so label, gallery, buy, funds are siblings in one flow. Implement mobile order by giving `.fold` `display:flex; flex-direction:column` at ≤749px and setting `order` on `.gallery-col` (2), `[data-region=label]` — restructure so label is not nested. **Simplest robust approach:** render label/gallery/buy/funds as four direct children of `.fold`; on desktop use `grid-template-areas` to place gallery left (spanning) and label/buy/funds right; on mobile let them flow in source order label→gallery→buy→funds. Use this areas approach in Step 3 rather than nested columns.

Rewrite the fold accordingly:

```liquid
<div class="fold">
  <div data-region="label"></div>
  <div data-region="gallery"></div>
  <div data-region="buy"></div>
  <div data-region="funds"></div>
</div>
```

```css
/* desktop */
.owv2-product-{{ owid }} .fold {
  display: grid;
  grid-template-columns: minmax(0,1.1fr) minmax(0,1fr);
  grid-template-areas: "gallery label" "gallery buy" "gallery funds";
  grid-template-rows: auto auto 1fr;
  gap: clamp(24px,4vw,64px);
  align-items: start;
  max-width: 1320px; margin-inline: auto;
}
.owv2-product-{{ owid }} [data-region="gallery"] { grid-area: gallery; }
.owv2-product-{{ owid }} [data-region="label"]  { grid-area: label; }
.owv2-product-{{ owid }} [data-region="buy"]    { grid-area: buy; position: sticky; top: 24px; }
.owv2-product-{{ owid }} [data-region="funds"]  { grid-area: funds; }
@media (max-width: 749px) {
  .owv2-product-{{ owid }} .fold { display: flex; flex-direction: column; gap: 20px; }
  .owv2-product-{{ owid }} [data-region="buy"] { position: static; }
}
```

- [ ] **Step 4: Run theme check**

Run: `shopify theme check`
Expected: 0 offenses.

- [ ] **Step 5: Run the harness to confirm it passes**

Update the harness's mirrored CSS to the grid-areas version. Open at ≥750px: PASS (gallery and label share a top row region → `.gallery-col`/label side by side). Resize to 400px and assert `getComputedStyle('.fold').display==='flex'` and that gallery's `getBoundingClientRect().top` is greater than label's (label first). Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add sections/owv2-product-main.liquid assets/owv2-product.css
git commit -m "feat(owv2): product-main section shell + fold grid"
```

---

## Task 2: Label hero snippet

Grade eyebrow, title, tagline, tasting-note tags — all metafield-driven, every element guarded so an empty field renders nothing.

**Files:**
- Create: `snippets/owv2-product-label.liquid`
- Modify: `sections/owv2-product-main.liquid` (render it into `[data-region="label"]`)
- Modify: `assets/owv2-product.css` (label typography)
- Test: harness `label.html`

**Interfaces:**
- Consumes: `product` (the section's `product` object). Metafields `product.metafields.custom.grade_eyebrow`, `product.metafields.custom.tagline`, `product.metafields.custom.taste_notes`, and `product.title`.
- Produces: markup inside `[data-region="label"]`: `.pdp-eyebrow`, `<h1 class="pdp-title">`, `.pdp-tagline`, `<ul class="pdp-tags"><li>`.

- [ ] **Step 1: Write the failing harness**

`harness/label.html`: paste rendered label markup for a product WITH all fields, and a second copy WITHOUT tagline/tags. Assert the full one shows 1 `.pdp-tagline` and N `.pdp-tags li`; the empty one shows 0 of each and no empty `<ul>`.

```js
assert(full.querySelectorAll('.pdp-tags li').length===3,'3 tasting tags render');
assert(empty.querySelector('.pdp-tagline')===null,'no tagline element when metafield blank');
assert(empty.querySelector('.pdp-tags')===null,'no tag list when notes blank');
```

- [ ] **Step 2: Run to confirm fail** — no snippet yet; harness markup is hand-authored, so first write it to reflect the *intended* guarded output, then confirm the assertions pass against that intended markup only after Step 3 produces it. (For Liquid, the harness validates the *shape*; theme-check validates the Liquid.)

- [ ] **Step 3: Write the snippet**

```liquid
{% comment %} Renders the label hero. Requires: product. {% endcomment %}
{%- assign eyebrow = product.metafields.custom.grade_eyebrow.value -%}
{%- assign tagline = product.metafields.custom.tagline.value -%}
{%- assign notes = product.metafields.custom.taste_notes.value -%}
{%- if eyebrow != blank -%}
  <p class="pdp-eyebrow">{{ eyebrow | escape }}</p>
{%- endif -%}
<h1 class="pdp-title">{{ product.title | escape }}</h1>
{%- if tagline != blank -%}
  <p class="pdp-tagline">{{ tagline | escape }}</p>
{%- endif -%}
{%- if notes != blank -%}
  {%- comment -%} taste_notes may be list.single_line_text_field OR plain text; handle both {%- endcomment -%}
  {%- assign note_items = notes -%}
  {%- unless notes.first -%}{%- assign note_items = notes | split: ',' -%}{%- endunless -%}
  {%- if note_items.size > 0 -%}
    <ul class="pdp-tags">
      {%- for note in note_items -%}
        {%- assign t = note | strip -%}
        {%- if t != blank -%}<li>{{ t | escape }}</li>{%- endif -%}
      {%- endfor -%}
    </ul>
  {%- endif -%}
{%- endif -%}
```

Then in the section, replace `<div data-region="label"></div>` with:

```liquid
<div data-region="label">{% render 'owv2-product-label', product: product %}</div>
```

Add label CSS to `owv2-product.css`:

```css
.pdp-eyebrow{font:700 12px/1.3 var(--font-body-family);letter-spacing:.12em;text-transform:uppercase;opacity:.7;margin:0 0 12px}
.pdp-title{font-size:clamp(32px,4.5vw,56px)}
.pdp-tagline{font-size:18px;line-height:1.4;margin:14px 0 0;max-width:38ch}
.pdp-tags{list-style:none;display:flex;flex-wrap:wrap;gap:8px;padding:0;margin:18px 0 0}
.pdp-tags li{border:1px solid currentColor;border-radius:999px;padding:6px 14px;font:600 13px var(--font-body-family)}
```

- [ ] **Step 4: `shopify theme check`** → 0 offenses.
- [ ] **Step 5: Run harness** → PASS (guards omit empty elements).
- [ ] **Step 6: Commit**

```bash
git add snippets/owv2-product-label.liquid sections/owv2-product-main.liquid assets/owv2-product.css
git commit -m "feat(owv2): product label hero snippet (guarded metafields)"
```

---

## Task 3: Gallery snippet

Large featured image plus a square thumbnail row, reusing the vendor media plumbing rather than rebuilding a lightbox/zoom.

**Files:**
- Create: `snippets/owv2-product-gallery.liquid`
- Modify: `sections/owv2-product-main.liquid` (render into `[data-region="gallery"]`)
- Modify: `assets/owv2-product.css`
- Test: harness `gallery.html`

**Interfaces:**
- Consumes: `product` (`product.featured_media`, `product.media`).
- Produces: markup inside `[data-region="gallery"]`: `.pdp-gallery` containing `.pdp-gallery__main` (featured image) and `.pdp-gallery__thumbs` (square buttons).

- [ ] **Step 1: Read the vendor media interface** — read `snippets/product-media.liquid` and skim `assets/product-thumbnails.js` to learn the exact custom-element / class names the thumbnail JS binds to. Record them. (Reuse-not-rebuild: if wiring `product-thumbnails.js` requires vendor-only markup our section can't cleanly host, fall back to a plain click handler in `owv2-product.js` instead — decide here, document the decision in the snippet header.)

- [ ] **Step 2: Write the failing harness** — `gallery.html` asserts one `.pdp-gallery__main img` and `product.media.size` thumbnails; assert thumbnails are square via `getBoundingClientRect` (`width===height` within 1px).

- [ ] **Step 3: Write the snippet**

```liquid
{% comment %} Product gallery. Requires: product. {% endcomment %}
{%- if product.featured_media -%}
<div class="pdp-gallery">
  <div class="pdp-gallery__main">
    {{ product.featured_media | image_url: width: 1200 | image_tag:
       loading: 'eager', sizes: '(min-width: 750px) 55vw, 100vw',
       widths: '400,600,900,1200,1600' }}
  </div>
  {%- if product.media.size > 1 -%}
  <ul class="pdp-gallery__thumbs" role="list">
    {%- for media in product.media -%}
      <li>
        <button type="button" class="pdp-gallery__thumb" data-media-id="{{ media.id }}"
          aria-label="{{ 'products.product.media.load_image' | t: index: forloop.index }}">
          {{ media.preview_image | image_url: width: 200 | image_tag: loading: 'lazy', widths: '100,200' }}
        </button>
      </li>
    {%- endfor -%}
  </ul>
  {%- endif -%}
</div>
{%- endif -%}
```

Render into the section: `<div data-region="gallery">{% render 'owv2-product-gallery', product: product %}</div>`.

CSS:

```css
.pdp-gallery__main{background:var(--owv2-product-surface);border-radius:16px;overflow:hidden}
.pdp-gallery__main img{width:100%;height:auto;display:block}
.pdp-gallery__thumbs{list-style:none;display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:0;margin:12px 0 0}
.pdp-gallery__thumb{padding:0;border:1px solid transparent;border-radius:10px;overflow:hidden;background:var(--owv2-product-surface);cursor:pointer;aspect-ratio:1/1}
.pdp-gallery__thumb img{width:100%;height:100%;object-fit:cover}
.pdp-gallery__thumb[aria-current="true"]{border-color:var(--owv2-product-ink)}
```

(Thumbnail→main swap is wired in Task 5's controller if we chose the fallback in Step 1.)

- [ ] **Step 4: `shopify theme check`** → 0 offenses.
- [ ] **Step 5: Run harness** → PASS (one main image, N square thumbs).
- [ ] **Step 6: Commit**

```bash
git add snippets/owv2-product-gallery.liquid sections/owv2-product-main.liquid assets/owv2-product.css
git commit -m "feat(owv2): product gallery snippet"
```

---

## Task 4: Buy panel snippet (vendor plumbing, restyled)

The transaction core. Hosts the vendor variant picker, buy buttons, and Subscriptions app block **inside** the vendor `<product-info>` element so `product-info.js` resolves variants and `product-form.js` handles add-to-cart. We add only the price display markup and pill/toggle styling.

**Files:**
- Create: `snippets/owv2-product-buy.liquid`
- Modify: `sections/owv2-product-main.liquid` (host `<product-info>`, load vendor JS, render into `[data-region="buy"]`)
- Modify: `assets/owv2-product.css`
- Test: harness `buy.html` (structure) + review-theme click-through (Step 8)

**Interfaces:**
- Consumes: `product`, `section.id`. Vendor snippets `product-variant-picker` (called `{% render 'product-variant-picker', block: <block>, product: product, product_form_id: product_form_id %}`) and `buy-buttons` (`{% render 'buy-buttons', block: <block>, product: product, section_id: section.id, product_form_id: product_form_id, show_pickup_availability: false %}`), as used in `sections/main-product.liquid:797,801`.
- Produces: inside `[data-region="buy"]`, a `.pdp-buy` panel with `[data-price]`, `[data-compare-at]`, the vendor variant picker, the Subscriptions app block, and buy buttons — all within `product_form_id = 'product-form-' | append: section.id`.

- [ ] **Step 1: Capture the vendor interface** — read `snippets/product-variant-picker.liquid` and `snippets/buy-buttons.liquid`. Enumerate every `block.settings.*` each reads. Two consequences to resolve now and note in the snippet header:
  1. Both take a `block` argument. Our section is not the vendor `main-product` and has no `variant_picker` theme block. Provide the picker via one of: (a) declare a matching theme block in `owv2-product-main`'s schema and pass it, or (b) build a `capture`/`{% assign %}` variables hash the snippet tolerates. Pick whichever the snippet's actual `block.settings` reads make safe; record the choice.
  2. The section must wrap all of this in `<product-info data-section="{{ section.id }}" data-url="{{ product.url }}" data-update-url="false">…</product-info>` and load `assets/product-info.js` + `assets/product-form.js` (as `main-product.liquid:82-83` does), or variant resolution won't fire.

- [ ] **Step 2: Write the failing harness** — `buy.html` asserts `.pdp-buy [data-price]` exists and that a `[data-compare-at]` element is `hidden` when no compare-at. (Live variant behavior is proven in Step 8, not the harness.)

- [ ] **Step 3: Write the snippet**

```liquid
{% comment %}
  Buy panel. Requires: product, section. Restyles vendor mechanics — do not
  add cart logic here; product-info.js + product-form.js own it.
{% endcomment %}
{%- assign product_form_id = 'product-form-' | append: section.id -%}
<div class="pdp-buy">
  <div class="pdp-price" aria-live="polite">
    <span class="pdp-price__now" data-price>{{ product.selected_or_first_available_variant.price | money }}</span>
    <s class="pdp-price__was" data-compare-at
       {% unless product.selected_or_first_available_variant.compare_at_price > product.selected_or_first_available_variant.price %}hidden{% endunless %}>
      {{ product.selected_or_first_available_variant.compare_at_price | money }}
    </s>
  </div>

  {% render 'product-variant-picker', block: <block from Step 1 decision>, product: product, product_form_id: product_form_id %}

  {%- comment -%} Subscribe / one-time: the Subscriptions app block. Degrades to one-time when no selling plan exists. {%- endcomment -%}
  {%- if product.selling_plan_groups.size > 0 -%}
    {%- render 'owv2-subscriptions-slot', product: product -%}  {%- comment -%} app block is placed in the template JSON, not here; see §8 / Task 7 {%- endcomment -%}
  {%- endif -%}

  {% render 'buy-buttons', block: <block from Step 1 decision>, product: product, section_id: section.id, product_form_id: product_form_id, show_pickup_availability: false %}
</div>
```

Note on the Subscriptions app block: an `shopify://apps/...` app block can only be placed via the theme editor / template JSON, not `{% render %}`d from a snippet. So the buy snippet does **not** embed it — the section exposes a block slot and the app block is positioned in the template JSON in Task 7. The snippet's job is price + variant picker + buy buttons; delete the `owv2-subscriptions-slot` line above and instead leave the app-block placement to the template. Update the snippet header to say so.

Host it in the section — replace `[data-region="buy"]` contents and wrap the whole fold's transactional part in `<product-info>`:

```liquid
<product-info data-section="{{ section.id }}" data-url="{{ product.url }}" data-update-url="false" class="pdp-product-info">
  ... the .fold div ...
</product-info>
{{ 'product-info.js' | asset_url | script_tag }}  {%- comment -%} or <script src defer>, matching vendor {%- endcomment -%}
```

Add pill/toggle restyle CSS to `owv2-product.css` (target the vendor variant-picker's rendered inputs by the class names captured in Step 1):

```css
.pdp-price__now{font:900 40px/1 var(--font-heading-family)}
.pdp-price__was{margin-left:10px;opacity:.6}
/* vendor variant inputs restyled as pills — selectors from Step 1 capture */
```

- [ ] **Step 4: `shopify theme check`** → 0 offenses.
- [ ] **Step 5: Run harness** → PASS (price present; compare-at hidden without a compare price).
- [ ] **Step 6: Commit**

```bash
git add snippets/owv2-product-buy.liquid sections/owv2-product-main.liquid assets/owv2-product.css
git commit -m "feat(owv2): buy panel hosting vendor product-info + variant picker"
```

- [ ] **Step 7: (deferred to Task 7)** live variant/add-to-cart click-through on the review theme — needs the template placed first.

---

## Task 5: Thin controller `owv2-product.js` + price/sticky wiring

The `<owv2-product>` custom element. Subscribes to `variant-change`, and on each event updates our price display, the mobile sticky bar, active-pill styling, and (if chosen in Task 3 Step 1) the gallery main-image swap. Never computes a variant.

**Files:**
- Create: `assets/owv2-product.js`
- Modify: `sections/owv2-product-main.liquid` (ensure `pubsub.js` then `owv2-product.js` load order; add mobile sticky bar markup)
- Modify: `assets/owv2-product.css` (sticky bar styling; reuse `component-product-sticky-cart.css`)
- Test: harness `controller.html` (synthetic `variant-change` event)

**Interfaces:**
- Consumes: global `subscribe` + `PUB_SUB_EVENTS` from `pubsub.js`; the `variant-change` payload `{ data: { sectionId, html, variant } }`.
- Produces: on a matching event (`sectionId === this.dataset.section`), writes `variant.price` (formatted) into `[data-price]`, toggles `[data-compare-at]`, and mirrors price + CTA state into `[data-sticky-bar]`.

- [ ] **Step 1: Write the failing harness**

`controller.html`: load `pubsub.js` then `owv2-product.js`, mount the section markup, then dispatch a synthetic event and assert the DOM updates.

```html
<script src="../../../assets/pubsub.js"></script>
<script src="../../../assets/owv2-product.js"></script>
<div class="owv2-product-test"><owv2-product data-section="sec1">
  <div class="pdp-price"><span data-price>$10.00</span><s data-compare-at hidden></s></div>
  <div data-sticky-bar hidden><span data-sticky-price></span></div>
</owv2-product></div>
<script>
publish(PUB_SUB_EVENTS.variantChange,{data:{sectionId:'sec1',html:document.createElement('div'),
  variant:{price:1599,compare_at_price:1999,available:true}}});
const now=document.querySelector('[data-price]').textContent;
if(!/15\.99|1599/.test(now)) throw new Error('FAIL: price not updated from variant-change');
if(document.querySelector('[data-compare-at]').hasAttribute('hidden')) throw new Error('FAIL: compare-at should show');
if(document.querySelector('[data-sticky-price]').textContent==='') throw new Error('FAIL: sticky bar not mirrored');
console.log('PASS');
</script>
```

- [ ] **Step 2: Run to confirm fail** — `owv2-product.js` doesn't exist → ReferenceError / no update. FAIL.

- [ ] **Step 3: Write the controller**

```js
if (!customElements.get('owv2-product')) {
  customElements.define('owv2-product', class extends HTMLElement {
    connectedCallback() {
      this.sectionId = this.dataset.section;
      this.priceEl = this.querySelector('[data-price]');
      this.compareEl = this.querySelector('[data-compare-at]');
      this.stickyBar = this.querySelector('[data-sticky-bar]');
      this.stickyPrice = this.querySelector('[data-sticky-price]');
      this._unsub = subscribe(PUB_SUB_EVENTS.variantChange, (e) => this.onVariantChange(e));
    }
    disconnectedCallback() { if (this._unsub) this._unsub(); }
    money(cents) {
      // reuse the theme's formatter if present; else minimal fallback
      if (window.Shopify && Shopify.formatMoney && window.theme && theme.moneyFormat) {
        return Shopify.formatMoney(cents, theme.moneyFormat);
      }
      return '$' + (cents / 100).toFixed(2);
    }
    onVariantChange(event) {
      const d = event && event.data;
      if (!d || d.sectionId !== this.sectionId) return;
      const v = d.variant;
      if (!v) return; // unavailable combination — leave last price, vendor disables the button
      const price = this.money(v.price);
      if (this.priceEl) this.priceEl.textContent = price;
      if (this.compareEl) {
        const show = v.compare_at_price && v.compare_at_price > v.price;
        this.compareEl.hidden = !show;
        if (show) this.compareEl.textContent = this.money(v.compare_at_price);
      }
      if (this.stickyBar) { this.stickyBar.hidden = false; }
      if (this.stickyPrice) this.stickyPrice.textContent = price;
    }
  });
}
```

Add to the section, after the fold and before `</owv2-product>`, the mobile sticky bar markup + script loads in the right order:

```liquid
<div class="pdp-sticky" data-sticky-bar hidden>
  <span class="pdp-sticky__price" data-sticky-price></span>
  <a class="pdp-sticky__cta" href="#{{ 'product-form-' | append: section.id }}">{{ 'products.product.add_to_cart' | t }}</a>
</div>
{{ 'pubsub.js' | asset_url | script_tag }}
<script src="{{ 'owv2-product.js' | asset_url }}" defer="defer"></script>
```

Sticky bar CSS — pull the vendor component and layer our overrides:

```liquid
{{ 'component-product-sticky-cart.css' | stylesheet_tag }}
```

```css
.pdp-sticky{display:none}
@media(max-width:749px){
  .pdp-sticky{position:fixed;inset:auto 0 0 0;display:flex;align-items:center;justify-content:space-between;
    gap:12px;padding:12px max(16px,4vw) calc(12px + env(safe-area-inset-bottom,0px));
    background:var(--owv2-product-bg);border-top:1px solid var(--owv2-product-ink);z-index:5}
  .pdp-sticky[hidden]{display:none}
}
```

- [ ] **Step 4: Run harness** → PASS (price, compare-at, sticky mirror all update from the synthetic event).
- [ ] **Step 5: `shopify theme check`** → 0 offenses.
- [ ] **Step 6: Commit**

```bash
git add assets/owv2-product.js sections/owv2-product-main.liquid assets/owv2-product.css
git commit -m "feat(owv2): thin variant-change controller + mobile sticky bar"
```

---

## Task 6: "What this bag funds" block

The 1% for the Planet block, driven entirely by section settings (no new metafield).

**Files:**
- Create: `snippets/owv2-product-funds.liquid`
- Modify: `sections/owv2-product-main.liquid` (render into `[data-region="funds"]`; add settings to schema)
- Modify: `assets/owv2-product.css`
- Test: harness `funds.html`

**Interfaces:**
- Consumes: `section.settings.funds_heading`, `section.settings.funds_body` (richtext), `section.settings.funds_link`, `section.settings.funds_link_label`, `product` (for the optional `custom.region` link target).
- Produces: `[data-region="funds"]` → `.pdp-funds` card.

- [ ] **Step 1: Failing harness** — `funds.html` asserts the card renders heading + body, and that when `funds_link_label` is blank no `<a>` renders.

- [ ] **Step 2: Confirm fail** (no snippet).

- [ ] **Step 3: Snippet + schema settings**

```liquid
{% comment %} "What this bag funds" block. Requires: section, product. {% endcomment %}
{%- if section.settings.funds_heading != blank or section.settings.funds_body != blank -%}
<aside class="pdp-funds">
  {%- if section.settings.funds_heading != blank -%}<h2 class="pdp-funds__h">{{ section.settings.funds_heading | escape }}</h2>{%- endif -%}
  {%- if section.settings.funds_body != blank -%}<div class="pdp-funds__body">{{ section.settings.funds_body }}</div>{%- endif -%}
  {%- if section.settings.funds_link_label != blank and section.settings.funds_link != blank -%}
    <a class="pdp-funds__link" href="{{ section.settings.funds_link }}">{{ section.settings.funds_link_label | escape }}</a>
  {%- endif -%}
</aside>
{%- endif -%}
```

Add to schema `settings` (before the color settings):

```json
{ "type": "header", "content": "What this bag funds" },
{ "type": "text", "id": "funds_heading", "label": "Funds heading", "default": "1% for the Planet" },
{ "type": "richtext", "id": "funds_body", "label": "Funds body", "default": "<p>1% of every bag funds forest-friendly farming.</p>" },
{ "type": "url", "id": "funds_link", "label": "Funds link" },
{ "type": "text", "id": "funds_link_label", "label": "Funds link label" }
```

Render: `<div data-region="funds">{% render 'owv2-product-funds', section: section, product: product %}</div>`.

CSS:

```css
.pdp-funds{background:var(--owv2-product-surface);border-radius:14px;padding:22px}
.pdp-funds__h{font:600 20px var(--font-heading-family);margin:0 0 8px}
.pdp-funds__body{font-size:15px;line-height:1.5}
.pdp-funds__link{display:inline-block;margin-top:12px;font-weight:700;text-decoration:underline}
```

- [ ] **Step 4: `shopify theme check`** → 0 offenses.
- [ ] **Step 5: Run harness** → PASS.
- [ ] **Step 6: Commit**

```bash
git add snippets/owv2-product-funds.liquid sections/owv2-product-main.liquid assets/owv2-product.css
git commit -m "feat(owv2): what-this-bag-funds block"
```

---

## Task 7: Metafield definitions, deploy, and template JSON handoff

Not a code task — the human-in-the-loop deploy handshake from spec §8. This is where the section first becomes visible on the store and where live variant/cart behavior is finally verified. It gates on **you** (the human), not Claude.

**Files:**
- No repo code. Produces: metafield definitions on the store, a placed template on the review theme, and (later, explicitly) a template JSON in git.

- [ ] **Step 1: Confirm the open items from spec §12** on the test product:
  - Exact live type of `custom.taste_notes` (list vs plain text) — adjust the Task 2 guard if it's plain text (the snippet already handles both, but confirm).
  - The test coffee is set up with **Grind** + **Size** as its two variant options so the vendor picker/cart path works unchanged. If it's modelled differently, stop and flag.

- [ ] **Step 2: Create the new metafield definitions** in the Shopify admin (Settings → Custom data → Products):
  - `custom.grade_eyebrow` — single line text.
  - `custom.tagline` — single line text (or multiline).

- [ ] **Step 3: Verify theme-check is clean, then push code to the review theme only.**

```bash
shopify theme check                # 0 offenses
shopify theme list --store $SHOP_STORE   # confirm the target theme is NOT [live]
shopify theme push --store $SHOP_STORE --theme $SHOP_THEME
```

Never `main`, never `--live`, never `--environment staging`.

- [ ] **Step 4: (Human, in the theme editor)** create a product template `product.omawild-v2`, add the **OWV2 Product main** section, position the **Subscriptions app block** within it, and assign the test product. This write syncs back to git as a `shopify[bot]` commit — `git fetch && git rebase` to pick it up; do not force-push.

- [ ] **Step 5: Review-theme click-through (the deferred live verification):**
  - Select grind, then size → price display + mobile sticky bar update; active pill styling changes.
  - Add to cart → the existing `<cart-drawer>` opens with the right variant.
  - Toggle Subscribe vs one-time → selling plan reflected; on a product with no selling plan, the panel is one-time-only (graceful degradation).
  - A product with `compare_at_price > price` shows the strike; one without shows none.
  - Mobile ≤749px: label-first order, sticky bottom bar, no duplicate inline button.
  - Clear any `?preview_theme_id=` cookie afterward (`?preview_theme_id=` empty) so the real storefront doesn't keep 404ing.

- [ ] **Step 6: (Optional, later, explicit)** if Claude authors/refines the full template JSON in git off the `shopify[bot]` baseline, getting it onto the store requires a **one-time, single-file push of just that template**, overriding `.shopifyignore` for that one file. This is a CLAUDE.md rule-5 deploy-safety action — **confirm with the user at the moment it happens**; do not batch it into a code push.

---

## Self-Review

**1. Spec coverage:**
- §1 decision path grind→size→subscribe/one-time → Task 4 (vendor picker) + Task 5 (state) + Task 7 (subscriptions app block placement). ✅
- §3 one section owns coupled fold → Task 1 grid-areas fold. ✅
- §4 all six files → Tasks 1–6 create all six (plus `owv2-product-funds.liquid`, an intentional split of the funds region the spec folded into the main section; noted in File Structure). ✅
- §5 layout (desktop sticky rail, mobile label-first + sticky bar, single 749px breakpoint) → Task 1 (grid/breakpoint) + Task 5 (sticky bar). ✅
- §6 metafields (new `grade_eyebrow`/`tagline`; reused `taste_notes` with list/plain fallback; native variants; funds as settings) → Task 2 (fallback split) + Task 6 (settings) + Task 7 (definitions, variant-option confirmation). ✅
- §7 data flow (subscribe to `variant-change`, guard every dynamic bit, degrade with no selling plan) → Task 5 controller + Task 2/6 guards + Task 7 Step 5. ✅
- §8 deploy path & template JSON → Task 7. ✅
- §9 styling rules (own section so vendor `section-main-product.css` never loads; NHD tokens; scoped `--owv2-product-*`) → Task 1 tokens + Global Constraints. ✅
- §10 testing (theme check + static harness + review click-through) → every task's Steps 4/5 + Task 7 Step 5. ✅
- §11 out of scope (origin/brew/pairings/Limited-Reserve polish) → not planned. ✅
- §12 open items → Task 7 Step 1. ✅

**2. Placeholder scan:** The two `<block from Step 1 decision>` markers in Task 4 are deliberate: the vendor snippet's `block` argument cannot be specified until Step 1 reads the snippet's actual `block.settings.*` reads — resolving it before reading would be a guess. The step that resolves it is explicit and precedes the code that uses it. No other TBD/TODO.

**3. Type consistency:** `variant-change` payload shape `{ data: { sectionId, html, variant } }` is used identically in the Task 5 controller and harness; `[data-price]`/`[data-compare-at]`/`[data-sticky-bar]`/`[data-sticky-price]` selectors match between the buy snippet (Task 4), sticky markup (Task 5), and controller (Task 5). `product_form_id = 'product-form-' | append: section.id` matches the vendor `main-product.liquid` convention. `owid` derivation matches `owv2-subscribe.liquid`.

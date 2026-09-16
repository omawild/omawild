# Homepage v2 Redesign — Design Spec

**Date:** 2026-09-15
**Branch:** `omawild-v2` (cut from `main`; never merged/pushed to `main` as part of this work)
**Status:** Draft for review

---

## 1. Goal

Rebuild the omawild.com homepage to the new "Drink for Planet Earth" direction
(orange / pale-pink / cream palette, bold NHD display type) as a **parallel v2**,
without touching the live v1 homepage. Design source: the user's Claude Design
canvas (desktop) plus six 390px mobile screens (`~/Pictures/Screenshots`), and the
announcement-bar option set (`~/Downloads/announcementbar1-2.jpeg`).

**Core requirement:** every section is **fully wired to the theme editor** — every
heading, body copy, image, colour, link, and repeatable item is a schema `setting`
or `block`, so the client can edit all content without code. The **one exception**
is the subscription builder ("the subscription spot"): its interactive configurator
and pricing are **UI-only** this pass (not wired to selling plans / a subscription
app). Its static copy is still editable.

---

## 2. Constraints (from `CLAUDE.md` — non-negotiable)

- **Never push `main`** and never `--live` / `--allow-live` / `--environment
  staging`. All v2 work lives on `omawild-v2`. The user owns the v2 theme + its
  preview/GitHub connection.
- **Never hand-edit `templates/*.json` or `config/settings_data.json`.** They are
  `.shopifyignore`d and theme-editor-owned. New sections are **placed and ordered
  by the user in the v2 theme's editor**, not by editing `index.json`. This spec
  provides the exact placement order (§7).
- **Prefer new files over vendor edits** (rule 3). All new work is `owv2-*` files;
  no RoarTheme file is modified.
- **`shopify theme check` must report 0 offenses** before any push (rule 1).
- **Typography:** read `var(--font-heading-family)` / `var(--font-body-family)`
  (NHD, self-hosted). Never `settings.type_*_font`. Big display headings are NHD
  Black (900); NHD ships 400/600/700/900 only — never request 500.

## 3. Conventions (follow the existing `od-*` pattern)

- Each section is a **self-contained `.liquid` file**: scoped inline `{% style %}`
  keyed by a per-instance id suffix (`{% assign owid = section.id | replace:'-','' %}`
  → `.owv2-hero__x-{{ owid }}`). No shared `owv2-*.css` asset pipeline; styling
  travels with the section, exactly like `od-hero-expedition`.
- **Responsive lives inside the section** via media queries in that `{% style %}`
  block. Mobile is not a separate build.
- **Namespace:** `owv2-` for all new sections/assets, distinct from live `od-*` /
  `ow-*`. Add `sections/owv2-*` and `assets/owv2-*` to the `CLAUDE.md` ownership map
  as "ours" (the only edit to a non-theme file; called out here per rule 5).
- Colours default to the v2 palette but are **exposed as settings** so nothing is
  hard-coded and no global token is touched (v1 cannot be affected):
  - Orange `#F5450D` · Pale pink `#FBDCDC` · Cream/oat `#F1ECE2` · White `#FFFFFF`
  - (Exact hexes are defaults; the editor can change them per section.)
- Carousels on mobile use CSS `scroll-snap` (no JS). The regen accordion uses native
  `<details>/<summary>` (no JS). **JS is used only** for `owv2-subscribe` (the
  configurator's client-side selection + price display).

---

## 4. Section inventory

| # | Section on page | Implementation | New file? | Wiring |
|---|---|---|---|---|
| 1 | Announcement / countdown bar | **Reuse** vendor `announcement-bar.liquid` | no | Config-only (see §5.1) |
| 2 | Header (adds "Our Story") | **Reuse** vendor `header.liquid` | no | Menu + settings |
| 3 | Split hero | `sections/owv2-hero.liquid` | **yes** | Full schema |
| 4 | Trust marquee | `sections/owv2-marquee.liquid` | **yes** | Full schema |
| 5 | Value grid (4, orange) | `sections/owv2-value-grid.liquid` | **yes** | Full schema |
| 6 | Products (3 cards) | **Reuse** `od-featured-products.liquid` | no | Config + product data |
| 7 | Subscription builder | `sections/owv2-subscribe.liquid` + `assets/owv2-subscribe.js` | **yes** | **UI-only** (copy editable) |
| 8 | Regen education | `sections/owv2-regen.liquid` | **yes** | Full schema |
| 9 | Founder story | `sections/owv2-story.liquid` | **yes** | Full schema |
| 10 | "Drink like you give a damn" banner | `sections/owv2-banner.liquid` | **yes** | Full schema |
| 11 | Values (3 cards) | `sections/owv2-values.liquid` | **yes** | Full schema |
| 12 | Partner CTA band | `sections/owv2-partner.liquid` | **yes** | Full schema |
| 13 | Newsletter (+ sticker) | `sections/owv2-newsletter.liquid` | **yes** | Full schema + `{% form 'customer' %}` |
| 14 | Footer | **Reuse** vendor `footer.liquid` / footer-group | no | Blocks + linklists |

**New section files: 10. New JS assets: 1** (`owv2-subscribe.js`).

---

## 5. Section-by-section spec

Each new section lists: **desktop layout**, **mobile layout**, and the **schema**
(settings + blocks) that make every field editable.

### 5.1 Announcement / countdown bar — reuse (config only)

The vendor `announcement-bar.liquid` already exposes every option the client
screenshotted; the "Timer" panel is its **`countdown` block**. No code.

- Set `colors_background` → orange `#F5450D`, `colors_text` → white.
- Add a `countdown` block: `date` = launch datetime, `text` = "ONLINE ORDER OPENS
  IN", desktop shows full units; mobile copy shortens automatically.
- Layout/behaviour options available as shown: `layout` (desktop carousel),
  `mobile_layout` (marquee/carousel), `autorotate`, `autorotate_speed`, `speed`,
  `show_navigation`, marquee `direction`, `gradient_background`, `colors_highlight`,
  `padding_top/bottom`, `custom_css`.

### 5.2 Header — reuse (config only)

- Add **"Our Story"** to the header menu (Online Store → Navigation, on the v2
  theme's linked menu — content edit, not code).
- Set header colours to pink/orange via existing header settings. Mobile hamburger
  drawer + region selector are already native to `header.liquid`.

### 5.3 `owv2-hero` — split hero

**Desktop:** two-column `1fr 1fr` (model on `od-hero-expedition`). Left = pink block:
circular "WELCOME TO THE EXPEDITION" stamp, H1 "Drink for Planet Earth", body,
two CTAs (primary filled + secondary outline), then a feature row
("Single origin ✷ Specialty coffee ✷ Roasted monthly"). Right = full-bleed photo
with a corner sticker badge ("COFFEE FOR THE PLANET") and a bottom overlaid caption
card with an inline link ("See how it works ↓").

**Mobile:** single column — pink block (stamp → H1 → body → **two full-width stacked
CTAs** → feature row) **then** the photo with its overlaid caption card below.

**Schema — settings:**
- `background_color` (color, default pink), `text_color` (color, default orange)
- `stamp_image` (image_picker; fallback = existing expedition SVG)
- `heading` (inline_richtext, default "Drink for Planet Earth")
- `body` (richtext)
- `cta_primary_label` (text) + `cta_primary_link` (url)
- `cta_secondary_label` (text) + `cta_secondary_link` (url)
- `hero_image` (image_picker)
- `image_badge_text` (text, default "COFFEE FOR THE PLANET")
- `caption_text` (richtext) + `caption_link_label` (text) + `caption_link` (url)
- `heading_size` / `body_size` (range), `content_padding`, `content_gap` (range)

**Schema — blocks:** `feature` (repeatable) → `{ text }` for each "Single origin",
"Specialty coffee", "Roasted monthly" item. Separator glyph (✷) is a section setting.

### 5.4 `owv2-marquee` — trust strip

**Desktop & mobile:** full-width orange bar, infinite horizontal scroll of badge
phrases separated by ✷. Direction + speed configurable. `prefers-reduced-motion`
→ static, wrapped list (matches the "navbar stutter under reduced motion" care
already in the repo).

**Schema — settings:** `background_color`, `text_color`, `speed` (range),
`direction` (select left/right), `separator` (text, default "✷"),
`padding_top/bottom`.
**Schema — blocks:** `item` (repeatable) → `{ text }` (e.g. "100% RECYCLABLE
PACKAGING").

### 5.5 `owv2-value-grid` — four cards on orange

**Desktop:** orange section, optional heading, **4 white cards** in a row, each with
a bold heading + body.
**Mobile:** horizontal **swipe carousel** (`scroll-snap`, ~85% card width so the next
card peeks) with a "← SWIPE →" hint.

**Schema — settings:** `background_color` (orange), `card_background` (white),
`card_heading_color`, `card_body_color`, optional `heading`, `mobile_hint_text`
(default "← SWIPE →"), `padding_top/bottom`.
**Schema — blocks:** `card` (repeatable) → `{ heading (text), body (richtext) }`.

### 5.6 Products — reuse `od-featured-products` (config + product data)

Already product-driven and editable. Map the redesign to existing fields:
- Section `heading` = "Drink for Planet Earth", `subheading` = the intro paragraph,
  `descriptor_color` = orange.
- Each **Product Card** block: `product_item` = Wild Bloom / Forest Trail / Limited
  Reserve; `collection_tag` = taste label ("FRUITY & FLORAL", "NUTTY ESPRESSO",
  "RARE FUNK"); `collection_title` = display name; action = Add to Cart.
- Editable content that lives on the **product record** (admin, not the section):
  description, price, variants (the "Whole Bean / 200 g" dropdown), and the
  "GRADE 1" badge.

**Verification task (implementation):** confirm the `od-featured-products` card
renders (a) a variant selector dropdown and (b) the "GRADE 1" badge as the mock
shows. If either is missing, extend `od-featured-products` **minimally** (it is a
`us`-owned `od-*` file, editable) rather than forking a new section — keep commerce
logic in the proven section. Record any such change as its own commit.

### 5.7 `owv2-subscribe` — subscription builder (**UI-only this pass**)

**Desktop:** pink section. Left: "SUBSCRIBE & SAVE 10%" pill, headline, body, three
numbered steps — 01 Pick your roast, 02 Select quantity, 03 Set frequency (pill
selectors). Right: sticky summary card ("YOUR SUBSCRIPTION", product · size ·
cadence, discounted price with struck-through original, "Save $X every delivery",
"Start subscription" button, shipping note).
**Mobile:** steps stack; summary card drops **below** the steps.

**Scope — UI only:** selectors update the summary text and a **client-side displayed
price** in `owv2-subscribe.js`; there is **no** binding to selling plans, cart, or a
subscription app in this pass. "Start subscription" links to the existing
subscription flow (a section `url` setting). No real discount is applied.

**Editable (still fully wired for copy):** `badge_text`, `heading`, `body`,
step labels (`step1_label`/`step2_label`/`step3_label`), `summary_title`,
`shipping_note`, `cta_label`, `cta_link`, `discount_percent` (number, drives the
displayed math), colours, padding.
**Roast/size/frequency options** are `blocks`:
- `roast` block → `{ label }` (e.g. Wild Bloom) + optional `price` (number, for the
  UI display only) + `image`.
- `size` block → `{ label }` (200 g / 400 g) + optional `price_modifier`.
- `frequency` block → `{ label }` (Every 2 weeks / month / 2 months).
This keeps every visible option editable while leaving commerce wiring for a later
phase (§9, out of scope §10).

### 5.8 `owv2-regen` — regen education

**Desktop:** cream section, eyebrow ("NO APP. NO AI. NO PROBLEM."), H2, isometric
illustration left, numbered **accordion** right (6 items, first open), CTA button,
caption.
**Mobile:** illustration on top, accordion below (item 01 open), CTA.

Accordion = native `<details>/<summary>` (no JS, keyboard-accessible).

**Schema — settings:** `background_color`, `eyebrow` (text), `heading`
(inline_richtext), `illustration` (image_picker), `caption` (text),
`cta_label` (text) + `cta_link` (url), colours, padding.
**Schema — blocks:** `point` (repeatable, up to ~8) → `{ title (text), body
(richtext) }`. Numbering (01–06) is auto from `forloop.index`.

### 5.9 `owv2-story` — founder story

**Desktop:** pink section, eyebrow ("HOW WE GOT HERE"), H2, subcopy, then a row of
image cards (orange border) with captions.
**Mobile:** eyebrow + H2 + subcopy, then a **swipe photo gallery** (`scroll-snap`)
with caption cards and a final **"N more photographs" teaser** tile.

**Schema — settings:** `background_color`, `eyebrow`, `heading` (inline_richtext),
`subcopy` (richtext), `teaser_text` (text, default "11 more photographs."),
`teaser_link` (url), colours, padding.
**Schema — blocks:** `photo` (repeatable) → `{ image (image_picker), caption
(text), link (url) }`.

### 5.10 `owv2-banner` — "Drink like you give a damn"

**Desktop & mobile:** full-bleed background photo with a centered white headline;
darkening overlay for legibility.

**Schema — settings:** `image` (image_picker), `heading` (inline_richtext),
`text_color` (default white), `overlay_opacity` (range), `link` (url, optional),
`min_height` desktop/mobile (range), padding.

### 5.11 `owv2-values` — three value cards

**Desktop:** cream section, centered heading ("There are many reasons to give a
damn…") + intro paragraph, then **3 cards** (icon, heading, body, optional CTA).
**Mobile:** cards stack.

**Schema — settings:** `background_color`, `heading` (inline_richtext), `intro`
(richtext), colours, padding.
**Schema — blocks:** `value` (repeatable) → `{ icon (image_picker), heading (text),
body (richtext), cta_label (text), cta_link (url) }`.

### 5.12 `owv2-partner` — partner CTA band

**Desktop:** orange band, eyebrow ("HOTELS · CAFÉS · OFFICES") left, big headline,
"Become a partner" button right.
**Mobile:** eyebrow → headline → button, stacked.

**Schema — settings:** `background_color` (orange), `text_color` (white),
`eyebrow` (text), `heading` (inline_richtext), `cta_label` (text), `cta_link`
(url), padding.

### 5.13 `owv2-newsletter` — newsletter + sticker

**Desktop & mobile:** pink section, a pill "sticker" ("A nature fund disguised as
coffee *for now*"), headline, and an email capture (`{% form 'customer' %}` with
`contact[tags]=newsletter`), input + Subscribe button. Success/error states from
the standard customer form.

**Schema — settings:** `background_color`, `sticker_text` (inline_richtext, so the
italic "*for now*" is editable), `heading` (inline_richtext), `placeholder` (text,
default "your@email.com"), `button_label` (text, default "Subscribe"),
`success_message` (text), colours, padding.

### 5.14 Footer — reuse vendor `footer.liquid` (config only)

Map redesign columns to existing footer blocks + navigation linklists:
Foundation (About Omawild / Our Blueprint / 1% for the Planet), Shop (Retail &
Wholesale / Specialty Coffee / Subscriptions), Support (FAQs / Contact Us /
Shipping / Privacy Policy), Follow (Instagram / The Dispatch). Logo + "© Wilde
Planet Limited 2026" via existing footer settings. Set pink background. No code.

---

## 6. Shared foundation

- **Palette:** applied as per-section colour setting **defaults** (orange
  `#F5450D`, pink `#FBDCDC`, cream `#F1ECE2`, white). No edit to `css-variables.liquid`,
  `base.css`, or any global token — v1 is provably unaffected because v2 sections
  are new files with their own scoped styles.
- **Fonts:** existing NHD stack via `var(--font-heading-family)` /
  `var(--font-body-family)`. Confirm the display look = NHD Black (900). No new fonts.
- **Accessibility:** honour `prefers-reduced-motion` on marquee and carousels;
  accordions are native `<details>`; all images take editable `alt`.

## 7. Homepage assembly (done by the client in the v2 theme editor)

New sections are placed/ordered in the editor (never by editing `index.json`).
Placement order, top to bottom:

1. Announcement bar (header group)
2. Header (header group) — with "Our Story" added
3. `owv2-hero`
4. `owv2-marquee`
5. `owv2-value-grid`
6. `od-featured-products` (products)
7. `owv2-subscribe`
8. `owv2-regen`
9. `owv2-story`
10. `owv2-banner`
11. `owv2-values`
12. `owv2-partner`
13. `owv2-newsletter`
14. Footer (footer group)

The implementer will supply matching **section `presets`** so each new section
appears in the editor's "Add section" list with sensible defaults pre-filled.

## 8. Verification (no live risk)

`shopify theme dev` 404s in this repo (documented), so front-end checks use **static
harnesses**: render each section's markup with representative settings, load the
real section CSS/JS, and assert layout with `getComputedStyle` /
`getBoundingClientRect` at 390px and desktop widths. The client previews real
placement on the v2 theme. `shopify theme check` must be 0 offenses before any push.

## 9. Phasing

1. **Foundation** — ownership-map note; build `owv2-hero` end-to-end (desktop +
   mobile + preset) to lock the pattern; client places it on the v2 theme to eyeball.
2. **Content sections** — `owv2-marquee`, `owv2-value-grid`, `owv2-values`,
   `owv2-partner`, `owv2-banner`, `owv2-story`, `owv2-regen`, `owv2-newsletter`.
3. **Products** — configure `od-featured-products`; extend minimally only if the
   card lacks the variant dropdown or GRADE 1 badge (§5.6).
4. **Subscription builder** — `owv2-subscribe` UI + `owv2-subscribe.js` (price
   display only; commerce deferred).
5. **Assembly & polish** — client orders all sections; responsive QA at 390px;
   reduced-motion + a11y pass; `theme check` clean.

Each new section is its own commit (small, reviewable); vendor/`od-*` edits (if any)
are committed alone with a reason (rule 4).

## 10. Out of scope (this pass)

- Subscription **commerce wiring** (selling plans / subscription app / real
  discount / cart binding) — `owv2-subscribe` is UI-only.
- Real product photography and final copy (client supplies via editor / product
  records).
- The countdown's actual drop/launch mechanic beyond the editable date.
- Any change to `main`, the live theme, global tokens, or vendor files (beyond an
  optional minimal `od-featured-products` extension in §5.6).
- Translations of new strings (new sections ship with English defaults; locale keys
  can follow if the client wants theme-check-level `t:` coverage).

## 11. Open decisions (non-blocking; default assumed)

1. **Hero copy** differs desktop vs mobile (body + 2nd CTA label) and the founder
   headline differs slightly. → Made **editable settings**; default to the mobile
   wording. Client finalises in the editor.
2. **`GRADE 1` badge source** — product metafield vs. section/card setting. →
   Resolve during §5.6 verification.
3. **Newsletter tag / list** — which tag the `{% form 'customer' %}` applies. →
   Default `newsletter`; confirm with client's email tooling.

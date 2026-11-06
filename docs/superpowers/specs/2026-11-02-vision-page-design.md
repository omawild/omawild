# Vision Page — Design Spec

**Date:** 2026-11-02  
**Status:** Ready for approval  
**Source:** Jenny Hsu (2026-10-23) + `Omawild Web Redesign.zip` → `Vision Page.dc.html`  
**Out of scope:** Rest of the redesign zip (Home, Shop, PDP, etc.)

---

## 1. Intent

Give partners, investors, and curious visitors a single public page that tells
Omawild’s full expedition story: who you are when you board, the vision itself,
and a soft-locked “Base Camp” for people with an invite code.

Success: someone can open `/pages/vision`, enter a name, read the vision, and —
if they know the code — unlock the investor bands. Failure modes we are avoiding:
shipping Figtree/Archivo instead of NHD; going live by pushing `omawild-v2` /
`--live`; hand-editing editor-owned JSON; treating the client hash as real
security for confidential numbers.

---

## 2. Goals / non-goals / anti-goals

**Goals**

- Port the redesign’s Vision flow into the Shopify theme as first-party `oma-*`
  code.
- Three-part experience: name boarding → public vision → Base Camp unlock.
- Typography via existing NHD tokens (`--font-heading-family` /
  `--font-body-family`), not the redesign’s Google fonts.
- Brand palette from the redesign / site: Electric `#FF3F00`, Wonderland
  `#FCD0FD`, Salmon `#FFE4E7`, Sand `#F7F5F1`, Midnight `#00180C`, Sunbrella
  `#FBB925`, plus Electric Deep `#D63200` for button hover only.
- Theme-editor editable copy, images, and number placeholders.
- Normal store chrome by default; a setting to switch to minimal chrome later.

**Non-goals (this version)**

- Redesigning any other page from the zip.
- Real auth, CRM, or server-side code verification.
- Filling real fundraising / ops numbers (placeholders only).
- Replacing or deleting `templates/page.invest.json` (unused legacy template).
- Nav / menu entry (page can be linked manually; product decides discoverability).

**Anti-goals**

- Publishing confidential investor data behind a client-side hash and calling it
  secure.
- Introducing Figtree, Archivo, or Typekit.
- Pushing to the live theme branch or using `--live` / `--allow-live`.

---

## 3. Constraints (from `CLAUDE.md`)

- Prefer **new files** (`sections/oma-vision*`, `assets/oma-vision*`). No RoarTheme
  vendor edits for this work.
- **`shopify theme check` = 0** before any push.
- **Do not hand-edit** `config/settings_data.json` or existing
  `templates/*.json`. Scaffolding a **new** `templates/page.vision.json` once so
  the template exists is allowed; after that, section placement/content is
  theme-editor owned. If `.shopifyignore` blocks the template from CLI push,
  create/assign the template in the admin instead — ask before changing ignore
  rules.
- Work on a **non-production branch**; push only to an unpublished review theme
  the user names. Never `git push` while on `omawild-v2` / `main` as deploy.
- Read store/theme from the user’s `.env` (`SHOP_STORE`, `SHOP_THEME`); do not
  assume a domain.

---

## 4. Product decisions (agreed)

| Topic | Decision |
|---|---|
| Scope | Vision page only |
| URL | `/pages/vision` (handle `vision`; changeable later in admin) |
| Template | New `page.vision` (own JSON template) |
| Fonts | NHD via theme CSS variables |
| Chrome | Normal header-group + footer-group by default |
| Minimal chrome | Theme setting for a later product flip — implement without blocking v1 |
| Boarding | Required name screen before vision content |
| Base Camp code | `DELUSIONAL` (case-insensitive via trim + uppercase before hash) |
| Redesign hash | Ignore; recompute SHA-256 for `DELUSIONAL` |
| Numbers | Ship redesign bracket placeholders; editable in editor |
| SEO | Normal public page — **no** `noindex` |
| Gate markup | Vision + Base Camp HTML is always in the page; gates are **visual/CSS** (and inert controls) until unlocked — not server-withheld |
| Theme editor | In Shopify `request.design_mode` / `Shopify.designMode`, both gates are treated as unlocked so every band is editable |
| Legacy invest | Leave `page.invest.json` alone; it is not live |

---

## 5. Experience

### 5.1 Boarding (gate 1)

Full-viewport Wonderland band (can sit under the normal header):

- Spinning expedition badge (asset from redesign `badge-expedition.svg`, or
  existing theme equivalent if already uploaded).
- Headline: “Pack your bags. We’re going on a mission.”
- Boarding-pass card: **Passenger** name field + **Board now**.
- Empty name → inline error (“Tell us who’s boarding.”).
- On success: `sessionStorage` keys `ow-vision2-boarded=1` and
  `ow-vision-guest=<name>`; reveal vision; scroll to top.
- Optional footer link to homepage (design had `omawild.com`) — keep as a
  text setting.

No invite code on boarding (redesign UI dropped it; leftover code-error strings
in the DC script are not part of this product).

**Markup:** boarding overlay/screen and the full vision stack both render in
Liquid on first paint. Until boarded, vision is hidden with CSS (e.g. a root
`[data-boarded]` attribute toggled by JS). Prefer a short inline critical rule
or default-locked attribute in Liquid so content does not flash unlocked before
JS runs. `aria-hidden` / `inert` on the locked region while boarding is shown.

**Design mode:** when the theme editor is open, skip both gates (show vision +
Base Camp content) so merchants can edit every band without entering a name or
code. Storefront behaviour is unchanged.

### 5.2 Vision (unlocked)

Sticky in-page logo bar from the redesign is **not** required while normal
store chrome is on. When **minimal chrome** is enabled, show a slim sticky
Omawild logo bar as in the design.

Section order (labels from the DC file):

1. Hero — “Stay 100% delusional…” + guest pill when name present  
2. How we started — Bali story + horizontal photo strip  
3. Our mission  
4. Sourcing criteria (ORS) + scale note / label legend  
5. Outdoor pantry roadmap (3 chapters)  
6. Our goals (if present in redesign; keep if copy exists)  
7. Where you come in — personalized eyebrow + multi-select help form →
   `mailto:hello@omawild.com` with prefilled body  
8. The nature fund / model loop  
9. Base Camp gate **or** unlocked investor stack (see §5.3)  
10. Founder note + links (Day 1, Spotify)  
11. Close CTA → Contact / partnerships  

Copy defaults = redesign text. All headings, body, labels, CTAs, mailto
targets, and links are schema settings (or block settings for repeatable
cards).

### 5.3 Base Camp (gate 2)

While locked:

- Eyebrow “INVESTOR ACCESS ONLY”
- Code field + **Climb on**
- Wrong code → “Not a base camp code. Ask us for one.”
- mailto `invest@omawild.com` for “please let us know”

On success (`DELUSIONAL`): set `sessionStorage ow-vision2-inner=1` and reveal:

- Paths explored / roads not taken  
- Product filter  
- Numbers (two columns of key/value rows; defaults like `[kg]`, `[NT$]`, etc.)

**Security note (explicit):** hash-in-JS is invite theatre. Do not put true
confidential figures in the Numbers settings until there is a real gate.

### 5.4 Persistence

Returning visitors in the same tab/session skip gates they’ve passed. Clearing
site data resets boarding and Base Camp. No account linkage.

---

## 6. How it gets made (architecture)

### 6.1 Files (builder call)

Prefer **one interactive section** so both gates share one controller:

| File | Role |
|---|---|
| `sections/oma-vision.liquid` | Markup + schema; loads CSS/JS |
| `assets/oma-vision.css` | Layout / bands / gates (tokens from existing CSS variables where possible) |
| `assets/oma-vision.js` | Boarding, Base Camp, story strip scroll, help form, sessionStorage |
| `templates/page.vision.json` | Template shell that mounts `oma-vision` (scaffold once) |

Repeatable content (ORS cards, story notes, chapters, roads, filter questions,
number rows, help options) = **blocks** inside `oma-vision`, not separate page
sections. That keeps gate JS simple and matches “one composition” better than
a stack of independent sections fighting `sessionStorage`.

Do **not** fork vendor sections. Do **not** copy the DC file’s Figtree/Archivo
`<link>`s.

### 6.2 Fonts & type

- `font-family: var(--font-heading-family)` / `var(--font-body-family)` (NHD).
- Heading weight: 700 or 900 only (no 800 — NHD does not ship 800; map
  redesign’s Figtree 800 → NHD 900 or 700, builder’s call, stay consistent).
- Body ~15px / ~21px to match redesign rhythm; use existing theme type patterns
  where they already match.

### 6.3 Chrome modes

| Setting | Behaviour |
|---|---|
| `chrome`: `store` (default) | Normal `header-group` / `footer-group` |
| `chrome`: `minimal` | Hide store header + footer for this page; show design sticky logo bar |

**Builder call for minimal:** implement via a `body` class toggled from the
section (small script) + CSS in `oma-vision.css` that hides the header/footer
section groups, **or** a dedicated layout if CSS hide proves fragile. Prefer
**not** editing `layout/theme.liquid` unless CSS/JS hide fails; if a layout
edit is required, stop and ask (rule 5).

### 6.4 Code check

```text
SHA-256( uppercase( trim( input ) ) ) === SHA-256( "DELUSIONAL" )
```

Store only the hex digest in JS (same pattern as the redesign), not the plaintext
string in an obvious `if (code === "DELUSIONAL")` if easy to avoid — still not
real security; just match the redesign’s posture.

### 6.5 Images

Each redesign `image-slot` → `image_picker` (section or block). Empty = branded
placeholder panel (Salmon + Electric border), not broken images. Alt text from
picker / text settings.

Badge SVG: add under `assets/` if not already present (`oma-vision-badge.svg` or
reuse `uploads`/`assets` from the zip).

### 6.6 Admin setup (human)

1. Create Page title “Vision”, handle `vision`.  
2. Assign template **vision**.  
3. Upload images in the section settings.  
4. Preview on an unpublished theme — never publish via CLI.

---

## 7. Verification

- `shopify theme check` → 0 offenses.  
- Manual: boarding blocks content → name unlocks → guest name in hero pill →
  Base Camp locked → `DELUSIONAL` unlocks investor bands → wrong code errors →
  reload keeps session state → mailto help form opens with name/email/picks.  
- Desktop ~1440 and mobile ~390: boarding, hero, strip, ORS grid, Base Camp.  
- With chrome `store`, site header/footer visible; toggle `minimal` and confirm
  hide + sticky logo (if implemented in v1).  
- View-source / response headers: no robots `noindex` forced by our code.  
- No Figtree/Archivo network requests from this page’s assets.

---

## 8. Left to the builder

- Exact block schema IDs and which bands are settings-only vs blocks.  
- NHD 700 vs 900 for display headings.  
- Whether goals band from the DC is included if redundant with other bands
  (include if present in the DC render path; drop only if clearly dead).  
- Minimal-chrome implementation technique (CSS/JS vs layout), asking before
  `theme.liquid` edits.  
- Whether `page.vision.json` is created in git or only in the theme editor,
  depending on `.shopifyignore` behaviour.  
- Static harness optional for CSS/JS without a push (repo docs pattern).

---

## 9. Open product follow-ups (not blocking v1)

- Add Vision to the store nav or keep URL-only.  
- Replace placeholder numbers with real figures.  
- Rotate Base Camp code without a deploy (metafield / setting) — nice later.  
- Retire or redirect legacy invest template when product wants one investor URL.

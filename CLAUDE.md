# omawild — Shopify theme

**Be Yours 8.5.0** by RoarTheme (paid third-party theme).
Docs: https://roartheme.co/blogs/beyours

- **Development store:** `eryn-tech-dev.myshopify.com` — all CLI commands target this.
- **Export provenance:** the baseline zip was exported from `f2e01f-77.myshopify.com`
  on 11 Aug 2026. Confirm that is the production store before any go-live.

This is a vendor theme we customize, not a theme we own. Everything below follows
from that.

## Rules

1. **Never `shopify theme push --live`.** Push to `--environment staging`, review the
   preview URL, then publish manually in the Shopify admin. Do not add `--allow-live`
   to any script.
2. **Never edit `config/settings_data.json` or `templates/*.json` by hand.** They are
   owned by the theme editor and are listed in `.shopifyignore`. A new section added
   in code must be placed once via the theme editor before it appears on a page.
3. **Prefer new files over edits to vendor files.** Every line changed inside a
   RoarTheme file is a line to re-apply by hand at the next theme upgrade. Custom work
   belongs in new sections/snippets, or in a CSS file loaded after the vendor CSS.
4. **When a vendor file must be edited, keep the diff minimal and commit it alone**
   with a message explaining why, so `git diff vendor-baseline-8.5.0` stays readable.
5. **`shopify theme check` must pass before pushing.** Do not silence a rule to make it
   pass — fix the code or ask.

## Ownership map

| Path | Owner | Editable |
|---|---|---|
| `sections/od-*`, `sections/ow-*`, `snippets/chapter-map.liquid` | us | yes |
| `sections/main-bloggle-article.liquid` | Bloggle app | no |
| `blocks/ai_gen_block_*.liquid` | Shopify AI-generated | regenerate, don't hand-edit |
| everything else | RoarTheme | rule 3 |

## Commands

```bash
shopify theme dev  --environment development   # local preview, hot reload, pushes nothing
shopify theme check                            # lint; must be clean
shopify theme push --environment staging       # deploy to the unpublished staging theme
shopify theme list --store eryn-tech-dev.myshopify.com
git diff vendor-baseline-8.5.0 --stat          # everything we've changed vs. the export
```

## Known backlog

`shopify theme check` reports **0 offenses** (222 files) as of 13 Aug 2026, down
from 14. Treat 0 as the expected baseline and anything above it as a regression.

### The Typekit offense, retired 13 Aug 2026

`layout/theme.liquid:7` used to carry a `RemoteAsset` error on the Adobe Typekit
stylesheet, kept deliberately because the kit was believed to be the only source
of the theme's webfonts. Fetching kit `rjm5uoy` settled it: it serves exactly two
families, `neue-haas-grotesk-display` and `neue-haas-grotesk-text`, and neither is
named anywhere in the theme. The link was deleted rather than silenced.

## Typography

**The theme renders in one family: `NHD`, the self-hosted Neue Haas Display Pro
faces in `assets/ow-nhd-*.woff2`.** There is no second font, by design.

`snippets/ow-fonts.liquid` declares the four faces (900 Black / 700 Bold /
600 Medium / 400 Roman) and then overrides `--font-body-family` and
`--font-heading-family`, the two tokens every vendor stylesheet reads. Headings
are Medium (600), body is Roman (400). `--font-navigation-family`,
`--font-button-family` and `--font-price-family` are aliases of those two in
`snippets/css-variables.liquid`, so they follow automatically.

It is rendered from `layout/theme.liquid` and `layout/password.liquid`,
**immediately after `render 'css-variables'`**. That order is load-bearing: both
write `:root` at equal specificity, so the later one wins. Do not move it.

The theme editor's two `font_picker` settings are therefore cosmetic — nothing
reads them. Leave them on a **system** font so `.system?` is true and Shopify
stops emitting `font_face` output and `<link rel=preload>` tags for fonts that
never render.

Three traps that were live before this landed, worth not reintroducing:

- `assets/base.css` forced `--font-body-family: "Neue Haas Grotesk" !important`.
  No `@font-face` declares that name — ours are `'NHD'` — so body copy silently
  fell back to `sans-serif`. `!important` on a custom property makes the
  *assignment* unbeatable, so it could not be corrected from anywhere else.
- `assets/section-option-table.css` asked for `museo-sans`, which nothing served.
- New CSS should read `var(--font-body-family)`, never `settings.type_body_font`.
  A weight of 500 will be synthesised; NHD ships 400/600/700/900 only.

### Notes worth keeping

- The `od-product-collection.liquid` tag-name splice hid three further offenses in
  that file — theme-check skips a file it cannot parse, so a `LiquidHTMLSyntaxError`
  understates the true count. Fixing one syntax error took the total 14 → 16 → 1.
- `layout/theme.liquid` and `layout/password.liquid` each wrap the picker-font
  `<link rel=preload>` block in a `theme-check-disable`. Those came in with the
  vendor export, not from us. Once the pickers are set to a system font the
  block emits nothing, so the disables guard dead code — candidates for removal
  at the next upgrade.
- `sections/od-canvas.liquid` carries our only deliberate `theme-check-disable`, on
  a `RemoteAsset` false positive (a Shopify-hosted video object, which `asset_url`
  cannot apply to). It is scoped to one line and justified in a comment. If you add
  another disable, justify it the same way or the rule stops meaning anything.

## Upgrading the theme

1. Export/download the new RoarTheme version.
2. Commit it on a branch as a new vendor baseline, tag `vendor-baseline-<version>`.
3. Replay our diff: `git diff vendor-baseline-8.5.0 main -- sections/ snippets/ assets/`.

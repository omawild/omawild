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

## Known backlog (not yet fixed — deliberate)

`shopify theme check` currently reports 14 errors, all in custom code:

- `sections/od-product-collection.liquid:398` — a Liquid `{% if %}` is spliced into an
  HTML **tag name** (`<{% if product %}a href=…{% else %}div{% endif %}>`). It renders
  correctly but theme-check cannot parse the file, so the whole file goes unlinted.
  Fix by branching the full element instead of the tag name.
- 6 × `ImgWidthAndHeight` — `od-featured-products`, `ow-home-products`, `od-canvas`,
  `chapter-map`. Missing `width`/`height` causes cumulative layout shift.
- 3 × `UndefinedObject`, 2 × `HardcodedRoutes` (use `routes.*`, breaks on non-`/en`
  markets), 2 × `RemoteAsset` (third-party asset on the critical path).

## Upgrading the theme

1. Export/download the new RoarTheme version.
2. Commit it on a branch as a new vendor baseline, tag `vendor-baseline-<version>`.
3. Replay our diff: `git diff vendor-baseline-8.5.0 main -- sections/ snippets/ assets/`.

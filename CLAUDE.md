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

`shopify theme check` reports **1 offense** (222 files) as of 13 Aug 2026, down from
14. The one remaining is deliberate and is described below — treat that as the
expected baseline, and anything above it as a regression.

### The one accepted offense

`layout/theme.liquid:7` — `RemoteAsset` on the Adobe Typekit stylesheet:

```liquid
<link rel="stylesheet" href="https://use.typekit.net/rjm5uoy.css">
```

The rule is correct on the merits: a render-blocking stylesheet on a third-party
host sits on the critical path and cannot be served from the Shopify CDN. It stays
anyway, because kit `rjm5uoy` is the only thing loading those webfonts. No file in
the theme references the kit id, so nothing *fetches* it a second way — but that
does not prove no stylesheet still names a family it provides, and a page that asks
for a missing family falls back silently rather than erroring. Removing the link is
a font change, not a lint fix, so it needs a visual check on a rendered page first.

It carries **no `theme-check-disable`** on purpose. Silencing it would make the
theme report 0 and quietly bury a real performance finding; leaving it visible keeps
the cost in view every time the linter runs. To retire it properly: self-host the
fonts in `assets/` behind `asset_url`, the way `snippets/ow-fonts.liquid` already
does for Neue Haas Grotesk, then delete the link.

### Notes worth keeping

- The `od-product-collection.liquid` tag-name splice hid three further offenses in
  that file — theme-check skips a file it cannot parse, so a `LiquidHTMLSyntaxError`
  understates the true count. Fixing one syntax error took the total 14 → 16 → 1.
- `sections/od-canvas.liquid` carries the only `theme-check-disable` in the theme, on
  a `RemoteAsset` false positive (a Shopify-hosted video object, which `asset_url`
  cannot apply to). It is scoped to one line and justified in a comment. If you add
  another disable, justify it the same way or the rule stops meaning anything.

## Upgrading the theme

1. Export/download the new RoarTheme version.
2. Commit it on a branch as a new vendor baseline, tag `vendor-baseline-<version>`.
3. Replay our diff: `git diff vendor-baseline-8.5.0 main -- sections/ snippets/ assets/`.

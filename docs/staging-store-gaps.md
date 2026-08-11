# Staging store gaps — `eryn-tech-dev`

Six templates in git have never existed on the staging theme (#157548576956).
They were silently dropped by the 10 Aug 2026 seed and stayed missing; the
homepage returned a 404 until 11 Aug 2026.

**None of these are code faults.** Each references a store-specific resource that
exists on the production store `f2e01f-77` but was never created on
`eryn-tech-dev`, and Shopify validates those references at upload, rejecting the
whole template.

| Template | Rejected because |
|---|---|
| `index.json` | `background_video` → `shopify://files/videos/girls-in-the-himalayas-short-omawild.mp4` not in Files |
| `page.landing-coffee.json` | `background_video` → same class of missing video |
| `page.blueprint.json` | `video` → same |
| `product.modal.json` | metafield `product.metafields.custom["origin-of-country"]` not defined |
| `product.product-coffee.json` | metafield `product.metafields.custom.varietal_all_listed` not defined |
| `article.bloggle-custom.json` | metafield `article.metafields.custom.blog_published_date` not defined |

## Why `git push` cannot fix this

`.shopifyignore` lists `templates/*.json` so the theme editor stays their owner.
That protects merchant edits from being clobbered — but it also means git cannot
*repair* a template that has gone missing on the remote. Nothing in the normal
workflow surfaces the gap; you find out when a page 404s.

## The one deviation currently in effect

`templates/index.json` on **staging** has `background_video` set to `""`. The
copy in git still points at the real video, because that is correct for
production. They are deliberately out of sync.

Restoring the homepage took a one-time push with the `templates/*.json` ignore
rule temporarily disabled, scoped with `--only templates/index.json --nodelete`
so nothing else could be touched, and the ignore file restored immediately after.

Two sections referenced by `index.json` do not render on staging and are worth
knowing about before judging the page:

- `od_canvas_idg6hh` — its background video is the setting that was cleared.
- `od_product_collection_YLwgbr` — `sections/od-product-collection.liquid` has
  the `LiquidHTMLSyntaxError` already recorded in CLAUDE.md's backlog.

## To close these gaps properly

1. Upload the missing videos to Files on `eryn-tech-dev`, or accept that
   video-backed sections stay blank on staging.
2. Create the three `custom` metafield definitions the product and article
   templates expect.
3. Re-run the scoped bypass push for the five templates still missing.

Until then, staging is not a faithful rehearsal of production for those pages.

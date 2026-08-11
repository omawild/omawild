# Omawild landing — asset provenance

Source: `omawild-landing(1).html`, imported 10 Aug 2026.

Most images came from the Figma MCP asset endpoint
(`https://www.figma.com/api/mcp/asset/<uuid>`). **Those URLs are ephemeral** —
this table is the only record of which Figma asset became which theme file. If
the design changes, re-export from Figma and replace the file here rather than
re-pointing at a URL.

32 references in the source resolved to 17 unique assets.

## Vendored from Figma

| Figma UUID | Theme asset | Used for |
|---|---|---|
| 8f63ed59-77f7-4fd7-bded-fbe4c781bec2 | `ow-logo.svg` | navbar + menu modal wordmark |
| 76fc34d8-86b1-4819-a5f5-bad16e0b7723 | `ow-logo-menu.svg` | footer wordmark |
| 4a28cc17-2c66-4664-9f15-6a9da4ebd823 | `ow-chevron-lang.svg` | region selector chevron |
| efb98fbc-5c69-4a0c-bdfd-233a714781d5 | `ow-chevron-link.svg` | navbar dropdown chevron |
| 78717e94-a317-47e1-8a09-36a826cc0ef0 | `ow-icon-cart.svg` | navbar cart |
| 7772c211-e1ed-4e16-b77a-36244d0bf7ce | `ow-icon-linkedin.svg` | footer social |
| 8ce3e4f6-8086-493d-9b44-240cd0223451 | `ow-icon-instagram.svg` | footer social |
| 5e9c92f5-37c8-4b78-b2ad-6a8944e62b28 | `ow-icon-submit.svg` | footer email submit |
| 5eca5710-97f8-4447-be55-1c1f5aed08a8 | `ow-arrow-left.svg` | regen carousel prev |
| f18b0a7d-c201-4079-921e-8fdcdcfb5be7 | `ow-arrow-right.svg` | regen carousel next |
| 5c75879e-ff03-45bf-b98c-742bd58d07b2 | `ow-bullet.svg` | footer nav column bullets |
| 4b53460b-24d0-49f4-a256-ac3ae5233cb3 | `ow-nature-head.svg` | footer illustration |
| 854d5203-177a-4e99-9f47-e14da9aa9dc4 | `ow-tagline.jpg` | tagline banner |
| d6136a6a-2126-449f-8989-6bed36c605bd | `ow-badge-1ftp.png` | 1% for the Planet badge |
| e7a34636-00c4-43f6-bd51-840a7b017d32 | `ow-badge-recyclable.png` | recyclable badge |
| 23245dbf-9f3d-4139-8bd9-b8ee66eb417e | `ow-about-card-placeholder.jpg` | about cards (see caveat) |
| 27906f4d-41ee-492e-813a-f47ddbc65d80 | `ow-product-card-placeholder.jpg` | product cards (see caveat) |

Watch out: the endpoint's URL extensions lie. `23245dbf-….png` serves
`image/jpeg`; it is stored here as `.jpg`.

## Extracted from inline base64 in the source HTML

The hero shipped three SVGs as base64 data URIs totalling ~246 KB of markup.

| Theme asset | Used for |
|---|---|
| `ow-hero-logo.svg` | hero wordmark (distinct artwork from `ow-logo.svg`) |
| `ow-hero-headline.svg` | "Welcome to the Expedition" lettering |
| `ow-hero-submark.svg` | hero submark |
| `ow-why-icon-regen.svg` | Regenerative Farming icon, was inline in the why band |

## Fonts

From `neue-haas-grotesk-display-pro.zip`, converted TTF → woff2 with fontTools
(395 KB → 102 KB). Declared in `snippets/ow-fonts.liquid` as family `NHD`.

| Source TTF | Theme asset | Weight |
|---|---|---|
| NeueHaasDisplayBlack.ttf | `ow-nhd-black.woff2` | 900 |
| NeueHaasDisplayBold.ttf | `ow-nhd-bold.woff2` | 700 |
| NeueHaasDisplayMediu.ttf | `ow-nhd-medium.woff2` | 600 |
| NeueHaasDisplayRoman.ttf | `ow-nhd-roman.woff2` | 400 |

`NeueHaasDisplayMediu.ttf` is truncated in the vendor zip; its internal name is
`NeueHaasDisplay-Mediu` and it is the Medium weight.

**Licensing:** Neue Haas Grotesk Display Pro is a commercial Monotype family.
Self-hosting webfonts on a public storefront needs a webfont licence, which is a
separate SKU from the desktop licence. Confirm before go-live.

## Flags

`ow-flags.css` carries the slice of flag-icons 7.5.0 (MIT) the region selector
needs — TW and HK — inlined as data URIs. Adding a market means adding a rule;
instructions are in the file.

## Optimisation

Rasters were resized to 2x their CSS display size and re-encoded; SVG path
coordinates were rounded to 2dp.

| Asset | Before | After |
|---|---|---|
| `ow-about-card-placeholder.jpg` | 3438 KB / 4032x3024 | 179 KB / 1024x768 |
| `ow-tagline.jpg` | 2967 KB / 2150x900 | 186 KB / 1600x670 |
| `ow-badge-1ftp.png` | 356 KB / 4096x1745 | 6 KB / 376x160 |
| `ow-product-card-placeholder.jpg` | 311 KB / 590x826 | 28 KB / 464x650 |
| `ow-badge-recyclable.png` | 18 KB / 512x512 | 3 KB / 160x160 |
| `ow-nature-head.svg` | 520 KB | 405 KB |
| `ow-hero-headline.svg` | 162 KB | 135 KB |

Raster total: 7092 KB → 405 KB.

## Known content gaps

- **Both card photos are stand-ins.** One image backs all four about cards (alts:
  Bali expedition, Conservation work, Omawild launch, West Java farm) and one
  backs all three product cards. The product placeholder is a stock photo of a
  *different* coffee brand — "Lykke kaffegårdar" packaging, their logo and
  Swedish copy visible. It must be replaced before go-live.
- **`omawild-garut-landscape.png` was never supplied.** The source referenced it
  at `/mnt/user-data/outputs/`, a dead sandbox path. It is the regen band's farm
  illustration, on both the mobile and desktop layouts. Until an image is set on
  the Regenerative block, that band renders its numbered dots over empty space.

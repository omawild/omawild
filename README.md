# omawild — Shopify theme

The code behind the Omawild storefront. It is **Be Yours 8.5.0** by RoarTheme, a
paid third-party theme, with our customizations layered on top.

If you are new here, read this file top to bottom once. It is written to be
followed literally — you should not need to improvise any command.

> **The one thing to know before anything else:** pushing this repo's `main`
> branch publishes to the real, customer-facing store. See
> [The two ways to break the live store](#the-two-ways-to-break-the-live-store).

---

## How the work flows

There are three separate places the theme exists, and keeping them straight is
most of what this document is for.

| Where | What it is | How it changes |
|---|---|---|
| **Your computer** | The files in this folder. | You and Claude edit them. |
| **Your review theme** | An *unpublished* theme on the store. Only people with the preview link see it. | `shopify theme push` |
| **The live theme** | What customers see. | Publishing in the Shopify admin, or `git push origin main` |

The loop is: edit locally → push to your review theme → look at it → commit →
push your **branch**. Going live is a separate, deliberate step that someone
does on purpose, never a side effect of your work.

---

## One-time setup

### 1. Install the tools

You need [Node.js](https://nodejs.org) (the LTS version is fine), then:

```bash
npm install -g @shopify/cli
shopify auth login
```

`shopify auth login` opens a browser. Log in with the account that has access to
the store.

### 2. Get the code

```bash
git clone git@github.com:omawild/omawild.git
cd omawild
```

### 3. Set up your review theme

You need your own unpublished theme to push to. **Create it by duplicating the
live theme in the Shopify admin** — not from the command line.

1. Shopify admin → **Online Store → Themes**
2. Find the live theme, click the **⋯** menu → **Duplicate**
3. Rename the copy to something with your name in it, e.g. `review — jenny`
4. Click **⋯ → Preview** on your new theme. Look at the URL in the address bar:

   ```
   https://your-store.myshopify.com/?preview_theme_id=123456789012
                                                      ^^^^^^^^^^^^
                                                      this is your theme ID
   ```

Duplicating rather than creating from scratch matters. A blank theme made by the
CLI would have no page layouts at all — see [Why the theme must be
duplicated](#why-the-theme-must-be-duplicated) — and every page would 404.

### 4. Record your store and theme ID

Create a file called `.env` in this folder:

```sh
# .env — your personal settings. Never committed; never uploaded.
SHOP_STORE=your-store.myshopify.com
SHOP_THEME=123456789012
```

Copy `.env.example` if you want a starting point. This file is ignored by both
git and the Shopify CLI, so your numbers stay yours and can't collide with
anyone else's.

---

## The daily loop

### 1. Start from an up-to-date branch

Never work directly on `main`.

```bash
git checkout main
git pull
git checkout -b what-im-changing      # e.g. fix-mobile-nav-spacing
```

`git pull` matters more here than in a normal repo: `main` moves on its own
whenever someone saves in the Shopify theme editor, because those edits sync
back into git automatically.

### 2. Make the change

Open Claude Code in this folder and describe what you want. `CLAUDE.md` in this
repo tells Claude the rules of the codebase, so it should already know what it
is and isn't allowed to touch.

### 3. Check it

```bash
shopify theme check
```

This must report **0 offenses**. If it doesn't, ask Claude to fix the offenses —
do not push past it, and do not let anything silence a rule to make the number
go down.

### 4. Push to your review theme

```bash
shopify theme push --store $SHOP_STORE --theme $SHOP_THEME
```

(If `$SHOP_STORE` doesn't resolve, just type the values out in full — the flags
are what matter.)

Read what the CLI prints back before confirming. It names the store and the
theme it is about to write to. **If it ever says "live theme", answer no.**

### 5. Look at it

```
https://your-store.myshopify.com/?preview_theme_id=<your theme id>
```

### 6. Save your work

```bash
git add -A
git commit -m "Describe what changed and why"
git push origin what-im-changing
```

Pushing a **branch** is safe — it publishes nothing. Open a pull request when
you want the change reviewed and eventually taken live.

---

## The two ways to break the live store

Both of these are one command away, and neither of them looks dangerous.

### `git push origin main`

`main` is connected to the production store through Shopify's GitHub
integration. Pushing it **is the deploy**. There is no review step, no preview,
no confirmation prompt — the storefront changes.

So: always work on a branch, always push that branch by name. If a command you
are about to run ends in `main`, stop.

### `shopify theme push --live` (or `--allow-live`)

Writes straight over the customer-facing theme. Never run it, and never add
`--allow-live` to a script or an npm task. Going live is a human clicking
**Publish** in the Shopify admin, after looking at a review theme.

---

## Things that look like bugs but aren't

### A new section doesn't appear on the page

Expected. Page layouts (`templates/*.json`) and theme settings
(`config/settings_data.json`) are owned by the **theme editor**, not by this
repo — they're in `.shopifyignore` so that pushing code can never wipe out
someone's editor work.

The consequence: adding a section in code makes it *available*, not *placed*.
Someone has to add it once in the theme editor for it to show up.

### Every page 404s after previewing a theme

Opening a `?preview_theme_id=...` link sets a **cookie** that sticks. If that
theme is broken or gets deleted, the whole storefront keeps 404ing for you and
looks dead — while being perfectly fine for everyone else.

Clear it by visiting the same URL with an empty value:

```
https://your-store.myshopify.com/?preview_theme_id=
```

Check in a private window before concluding the store is down.

### `shopify theme dev` shows 404 on every page

Known, and not worth fighting. `theme dev` builds a scratch theme from this
folder, and `.shopifyignore` withholds the page layouts from it, so the theme it
builds has no pages to serve. Use your review theme (step 4 above) instead.

### Why the theme must be duplicated

The same cause as above, which is why setup step 3 goes through the admin. A
theme duplicated in the admin arrives with all the layouts and settings already
in place; `theme push` then layers our code on top of it, leaving the merchant
content alone. That's exactly the split we want.

---

## Where to look next

- `CLAUDE.md` — the rules of this codebase: what's ours, what's the vendor's,
  what must never be hand-edited. Worth reading even if you never use Claude.
- `docs/ow-asset-manifest.md` — where our custom assets came from.
- `shopify.theme.toml` — CLI environments, and a note on why there is
  deliberately no `staging` or `production` one.

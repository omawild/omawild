/**
 * owv2-product.js — thin `<owv2-product>` controller.
 *
 * Never computes a variant. Subscribes to the vendor `variant-change`
 * pub/sub event (published by product-info.js with
 * `{ data: { sectionId, html, variant } }`) and mirrors the resolved
 * variant into our own price display and the mobile sticky bar. Also owns
 * the gallery thumbnail -> main image swap (a plain click handler, deferred
 * here rather than reusing vendor product-thumbnails.js — see
 * snippets/owv2-product-gallery.liquid for why).
 *
 * Depends on assets/pubsub.js having already defined the global `subscribe`
 * / `publish` / `PUB_SUB_EVENTS` — it is loaded globally by layout/theme.liquid
 * ahead of any section script, so this file never re-declares it.
 */
if (!customElements.get('owv2-product')) {
  customElements.define(
    'owv2-product',
    class extends HTMLElement {
      connectedCallback() {
        this.sectionId = this.dataset.section;
        this.priceEl = this.querySelector('[data-price]');
        this.compareEl = this.querySelector('[data-compare-at]');
        this.stickyBar = this.querySelector('[data-sticky-bar]');
        this.stickyPrice = this.querySelector('[data-sticky-price]');
        this.stickyCta = this.querySelector('[data-sticky-cta]');

        if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
          this._unsub = subscribe(PUB_SUB_EVENTS.variantChange, (event) => this.onVariantChange(event));
        }

        if (this.stickyCta) {
          this.stickyCta.addEventListener('click', () => this.onStickyCtaClick());
        }

        this.querySelectorAll('.pdp-gallery__thumb').forEach((thumb) => {
          thumb.addEventListener('click', () => this.onThumbClick(thumb));
        });
      }

      disconnectedCallback() {
        if (this._unsub) this._unsub();
      }

      money(cents) {
        // Reuse the theme's formatter (assets/global.js, theme.Currency)
        // and its configured money format (snippets/js-variables.liquid,
        // theme.shopSettings.moneyFormat) if present; else a minimal fallback.
        try {
          if (window.theme && theme.Currency && theme.Currency.formatMoney && theme.shopSettings) {
            return theme.Currency.formatMoney(cents, theme.shopSettings.moneyFormat);
          }
        } catch (e) {
          // fall through to the plain fallback below
        }
        return '$' + (Number(cents) / 100).toFixed(2);
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

        // The sticky bar's existence/visibility is rendered server-side
        // (see sections/owv2-product-main.liquid) so it's correct on first
        // paint even when `variant-change` never fires (single-variant
        // products render no picker, so the event never publishes). This
        // handler only keeps its contents in sync on subsequent changes —
        // it must never gate `hidden`/visibility itself.
        if (this.stickyPrice) this.stickyPrice.textContent = price;
        if (this.stickyCta) this.stickyCta.disabled = v.available === false;
      }

      // Sticky-bar CTA (mobile, <=749px): rather than a dead anchor, this
      // programmatically clicks the real vendor submit button so add-to-cart
      // logic (product-form.js) stays the single source of truth.
      onStickyCtaClick() {
        const submit = document.getElementById('ProductSubmitButton-' + this.sectionId);
        if (submit && !submit.disabled) submit.click();
      }

      // Gallery thumbnail -> main image swap (see owv2-product-gallery.liquid
      // for the `data-full-src` attribute this reads).
      onThumbClick(thumb) {
        const fullSrc = thumb.dataset.fullSrc;
        if (!fullSrc) return;

        const gallery = thumb.closest('.pdp-gallery');
        const mainImg = gallery && gallery.querySelector('.pdp-gallery__main img');
        if (mainImg) {
          mainImg.src = fullSrc;
          // Clear/rebuild srcset so the browser can't override `src` with a
          // stale descriptor from the previous image.
          mainImg.srcset = fullSrc;
        }

        if (gallery) {
          gallery.querySelectorAll('.pdp-gallery__thumb[aria-current="true"]').forEach((t) => {
            t.removeAttribute('aria-current');
          });
        }
        thumb.setAttribute('aria-current', 'true');
      }
    }
  );
}

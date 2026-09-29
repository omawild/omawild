/* variant-price-sync — generic "pick a variant, update the price shown next
 * to it" wiring for a product card whose price is otherwise static HTML
 * computed once at render time.
 *
 * Both blocks/ow-product-card.liquid (Home) and sections/od-collection-
 * showcase.liquid (Shop/Collections) render a real variant <select> but had
 * no JS reading it at all — the displayed price was whatever Liquid printed
 * for the product's default variant at page-render time, and never changed
 * no matter which variant a shopper picked. The Product Detail page doesn't
 * have this problem; it has its own JS (assets/owv2-product.js) already
 * driving its price display.
 *
 * Scoped to price only, deliberately -- od-collection-showcase.liquid's
 * "SAVE X%" discount badge isn't touched here, since keeping it in sync
 * would mean recomputing a percentage rather than just swapping a price
 * string, a different (and separate) fix if it turns out to matter.
 *
 * Contract, so any future card can opt in the same way:
 * - the <select> carries [data-variant-price-select]
 * - each <option> carries data-price="{cents}"
 * - the nearest ancestor with [data-price-card] is the whole card
 * - within it, [data-price-display] is the element whose text becomes the
 *   selected variant's formatted price
 */
(function () {
  if (window.__variantPriceSyncInit) return;
  window.__variantPriceSyncInit = true;

  function formatMoney(cents) {
    var theme = window.theme;
    if (theme && theme.Currency && typeof theme.Currency.formatMoney === 'function') {
      return theme.Currency.formatMoney(cents, theme.shopSettings && theme.shopSettings.moneyFormat);
    }
    return '$' + (cents / 100).toFixed(2);
  }

  function apply(select) {
    var option = select.options[select.selectedIndex];
    if (!option || option.dataset.price == null) return;
    var card = select.closest('[data-price-card]');
    if (!card) return;

    var priceEl = card.querySelector('[data-price-display]');
    if (priceEl) priceEl.textContent = formatMoney(option.dataset.price);
  }

  function bind(select) {
    if (select.__variantPriceSync) return;
    select.__variantPriceSync = true;
    select.addEventListener('change', function () { apply(select); });
  }

  function enhance(root) {
    var selects = (root || document).querySelectorAll('[data-variant-price-select]');
    for (var i = 0; i < selects.length; i++) bind(selects[i]);
  }

  if (document.readyState !== 'loading') enhance();
  else document.addEventListener('DOMContentLoaded', function () { enhance(); });

  document.addEventListener('shopify:section:load', function (e) { enhance(e.target); });
})();

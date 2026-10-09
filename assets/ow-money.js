/* ow-money — JS twin of snippets/ow-money.liquid: formats a price in cents
   the way the rest of Be Yours does, using the vendor's own formatter
   (theme.Currency.formatMoney in global.js) and the shop's money format,
   then appends the currency code when Theme settings > "Show currency codes"
   is on — the same rule assets/global.js's <price-money> applies.

   Every custom script that re-renders a price after a variant/plan change
   calls window.owMoney(cents) rather than carrying its own formatter, so a
   price never changes format when a shopper clicks. Loaded once, site-wide,
   from sections/ow-header.liquid, which renders before any section script. */
(function () {
  'use strict';
  if (window.owMoney) return;

  window.owMoney = function (cents) {
    var settings = window.theme.shopSettings;
    var formatted = window.theme.Currency.formatMoney(cents, settings.moneyFormat);
    return settings.currencyCode && settings.isoCode ? formatted + ' ' + settings.isoCode : formatted;
  };
})();

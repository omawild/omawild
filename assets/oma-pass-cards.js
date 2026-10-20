/* oma-pass-cards — keeps each pass button's total ("Buy · NT$798") in step
   with its quantity stepper. The stepper itself is the vendor's
   <quantity-input>, which fires a bubbling `change` on its input; the
   add-to-cart is the theme's own <product-form>. Prices are formatted with
   window.owMoney so they match the server-rendered snippets/ow-money. */
(function () {
  'use strict';
  if (window.omaPassCards) return;
  window.omaPassCards = true;

  document.addEventListener('change', function (event) {
    var input = event.target;
    if (!input.matches || !input.matches('.quantity__input')) return;
    var form = input.form;
    if (!form) return;
    var button = form.querySelector('[data-oma-pass-total]');
    if (!button || button.dataset.showTotal !== 'true' || !window.owMoney) return;
    var qty = Math.max(1, parseInt(input.value, 10) || 1);
    var text = button.querySelector('span') || button;
    text.textContent = button.dataset.label + ' · ' + window.owMoney(parseInt(button.dataset.unitPrice, 10) * qty);
  });
})();

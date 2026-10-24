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

  /* Unlock code. The section renders the code as an upper-cased SHA-256 in
     data-oma-pass-unlock and the buy form hidden; a matching entry reveals
     it. Remembered for the tab's session so a refresh doesn't re-lock. */
  var STORE_KEY = 'omaPassUnlocked';

  function remembered() {
    try { return JSON.parse(sessionStorage.getItem(STORE_KEY)) || []; } catch (e) { return []; }
  }

  function remember(hash) {
    try {
      var list = remembered();
      if (list.indexOf(hash) === -1) list.push(hash);
      sessionStorage.setItem(STORE_KEY, JSON.stringify(list));
    } catch (e) { /* private mode: just don't remember */ }
  }

  function unlock(lock, focus) {
    var buy = document.getElementById(lock.dataset.target);
    if (!buy) return;
    lock.hidden = true;
    buy.hidden = false;
    if (focus) {
      var button = buy.querySelector('[name="add"]');
      if (button) button.focus();
    }
  }

  function sha256(text) {
    var bytes = new TextEncoder().encode(text);
    return crypto.subtle.digest('SHA-256', bytes).then(function (buffer) {
      return Array.prototype.map.call(new Uint8Array(buffer), function (b) {
        return ('0' + b.toString(16)).slice(-2);
      }).join('');
    });
  }

  function restore() {
    var list = remembered();
    document.querySelectorAll('[data-oma-pass-unlock]').forEach(function (lock) {
      if (list.indexOf(lock.dataset.omaPassUnlock) !== -1) unlock(lock, false);
    });
  }

  document.addEventListener('submit', function (event) {
    var lock = event.target;
    if (!lock.matches || !lock.matches('[data-oma-pass-unlock]')) return;
    event.preventDefault();
    var error = lock.querySelector('.unlock-error');
    var entry = lock.elements.code.value.trim().toUpperCase();
    if (!entry || !window.crypto || !crypto.subtle) return;
    sha256(entry).then(function (hash) {
      if (hash === lock.dataset.omaPassUnlock) {
        if (error) error.textContent = '';
        remember(hash);
        unlock(lock, true);
      } else if (error) {
        error.textContent = error.dataset.message;
      }
    });
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restore);
  } else {
    restore();
  }
  document.addEventListener('shopify:section:load', restore);
})();

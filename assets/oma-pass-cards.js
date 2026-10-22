/* oma-pass-cards — keeps each pass button's total ("Buy · NT$798") in step
   with its quantity stepper, and runs the optional unlock codes. The stepper itself is the vendor's
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

  /* Unlock codes. A pass with a code renders its <product-form> hidden under
     a small code form; the section only prints a SHA-256 of the code
     (spaces removed, upper-cased), so the code itself isn't in the page.
     A match is remembered for the browser session. */
  function normalize(value) {
    return String(value || '').replace(/\s+/g, '').toUpperCase();
  }

  function sha256(value) {
    var data = new TextEncoder().encode(value);
    return crypto.subtle.digest('SHA-256', data).then(function (buffer) {
      return Array.prototype.map.call(new Uint8Array(buffer), function (b) {
        return ('0' + b.toString(16)).slice(-2);
      }).join('');
    });
  }

  function unlock(wrap, focus) {
    var gate = wrap.querySelector('.unlock');
    var productForm = wrap.querySelector('product-form');
    if (gate) gate.hidden = true;
    if (!productForm) return;
    productForm.hidden = false;
    if (focus) {
      var target = productForm.querySelector('.quantity__input, [name="add"]');
      if (target) target.focus();
    }
  }

  function remembered(wrap) {
    try { return sessionStorage.getItem(wrap.dataset.key) === wrap.dataset.hash; } catch (e) { return false; }
  }

  function remember(wrap) {
    try { sessionStorage.setItem(wrap.dataset.key, wrap.dataset.hash); } catch (e) {}
  }

  function initUnlocks(root) {
    (root || document).querySelectorAll('[data-oma-unlock]').forEach(function (wrap) {
      if (remembered(wrap)) unlock(wrap, false);
    });
  }

  document.addEventListener('submit', function (event) {
    var gate = event.target;
    if (!gate.matches || !gate.matches('.unlock')) return;
    event.preventDefault();
    var wrap = gate.closest('[data-oma-unlock]');
    var input = gate.querySelector('.unlock-input');
    var error = gate.querySelector('.unlock-error');
    var code = normalize(input.value);
    if (!wrap || !code || !window.crypto || !crypto.subtle) return;
    sha256(code).then(function (hash) {
      if (hash === wrap.dataset.hash) {
        remember(wrap);
        unlock(wrap, true);
        return;
      }
      error.hidden = false;
      gate.classList.remove('is-wrong');
      void gate.offsetWidth;
      gate.classList.add('is-wrong');
      input.select();
    });
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initUnlocks(); });
  } else {
    initUnlocks();
  }
  document.addEventListener('shopify:section:load', function (event) { initUnlocks(event.target); });
})();

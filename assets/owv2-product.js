/* Omawild PDP — buy panel behaviour for sections/owv2-product-main.liquid.
   Everything is read from the JSON island the section renders: variants,
   their selling-plan allocation prices and the copy strings. The form it
   drives is an ordinary /cart/add product form. */
(function () {
  'use strict';

  function formatMoney(cents, format) {
    if (typeof cents === 'string') cents = cents.replace('.', '');
    var value = '';
    var placeholder = /\{\{\s*(\w+)\s*\}\}/;
    format = format || '${{amount}}';

    function delimit(number, precision, thousands, decimal) {
      precision = precision == null ? 2 : precision;
      thousands = thousands || ',';
      decimal = decimal || '.';
      if (isNaN(number) || number == null) return '0';
      number = (number / 100.0).toFixed(precision);
      var parts = number.split('.');
      var dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands);
      var centsPart = parts[1] ? decimal + parts[1] : '';
      return dollars + centsPart;
    }

    var match = format.match(placeholder);
    switch (match ? match[1] : 'amount') {
      case 'amount': value = delimit(cents, 2); break;
      case 'amount_no_decimals': value = delimit(cents, 0); break;
      case 'amount_with_comma_separator': value = delimit(cents, 2, '.', ','); break;
      case 'amount_no_decimals_with_comma_separator': value = delimit(cents, 0, '.', ','); break;
      case 'amount_with_apostrophe_separator': value = delimit(cents, 2, "'", '.'); break;
      case 'amount_with_space_separator': value = delimit(cents, 2, ' ', ','); break;
      default: value = delimit(cents, 2);
    }
    return format.replace(placeholder, value);
  }

  function init(root) {
    if (root.__odp) return;
    root.__odp = true;

    var island = root.querySelector('[data-odp-json]');
    if (!island) return;
    var data;
    try { data = JSON.parse(island.textContent); } catch (e) { return; }

    var variantInput = root.querySelector('[data-odp-variant]');
    var planInput = root.querySelector('[data-odp-plan-input]');
    var qtyInput = root.querySelector('[data-odp-qty-input]');
    var nudge = root.querySelector('[data-odp-nudge]');
    var bar = root.querySelector('[data-odp-bar]');
    var mainImg = root.querySelector('img.odp-gallery__main');

    var state = {
      mode: data.mode,
      planId: data.planId != null ? String(data.planId) : null,
      planName: data.planName,
      qty: 1,
      options: []
    };

    var groups = Array.prototype.slice.call(root.querySelectorAll('[data-odp-option]'))
      .filter(function (g) { return !g.hasAttribute('data-odp-plans'); });
    groups.forEach(function (g, i) {
      var on = g.querySelector('[aria-pressed="true"]');
      state.options[i] = on ? on.getAttribute('data-odp-value') : null;
    });

    function findVariant(options) {
      if (data.defaultOnly) return data.variants[0];
      for (var i = 0; i < data.variants.length; i++) {
        var v = data.variants[i];
        var ok = true;
        for (var j = 0; j < options.length; j++) {
          if (v.options[j] !== options[j]) { ok = false; break; }
        }
        if (ok) return v;
      }
      return null;
    }

    function unitPrice(v) {
      if (state.mode === 'sub' && state.planId && v.plans[state.planId] != null) return v.plans[state.planId];
      return v.price;
    }

    function subPrice(v) {
      return state.planId && v.plans[state.planId] != null ? v.plans[state.planId] : v.price;
    }

    function percent(v) {
      if (!v.price) return 0;
      return Math.round(((v.price - subPrice(v)) / v.price) * 100);
    }

    function money(c) { return formatMoney(c, data.moneyFormat); }

    function each(sel, fn) {
      Array.prototype.forEach.call(root.querySelectorAll(sel), fn);
    }

    function render() {
      var v = findVariant(state.options);
      var available = !!(v && v.available);

      if (v) variantInput.value = v.id;
      qtyInput.value = state.qty;
      if (planInput) {
        planInput.disabled = state.mode !== 'sub';
        if (state.planId) planInput.value = state.planId;
      }

      // pills: pressed state + strike through values that can't combine into a buyable variant
      groups.forEach(function (g, i) {
        Array.prototype.forEach.call(g.querySelectorAll('[data-odp-value]'), function (btn) {
          var val = btn.getAttribute('data-odp-value');
          btn.setAttribute('aria-pressed', val === state.options[i] ? 'true' : 'false');
          var probe = state.options.slice();
          probe[i] = val;
          var pv = findVariant(probe);
          btn.classList.toggle('is-unavailable', !pv || !pv.available);
        });
      });
      each('[data-odp-mode]', function (btn) {
        if (btn.classList.contains('odp-choice')) {
          btn.setAttribute('aria-pressed', btn.getAttribute('data-odp-mode') === state.mode ? 'true' : 'false');
        }
      });
      each('[data-odp-plan]', function (btn) {
        btn.setAttribute('aria-pressed', btn.getAttribute('data-odp-plan') === state.planId ? 'true' : 'false');
      });

      if (!v) {
        each('[data-odp-cta]', function (b) { b.disabled = true; b.textContent = data.copy.soldOut; });
        return;
      }

      var total = unitPrice(v) * state.qty;
      var was = 0;
      if (state.mode === 'sub' && subPrice(v) < v.price) was = v.price * state.qty;
      else if (state.mode === 'once' && v.compare > v.price) was = v.compare * state.qty;

      each('[data-odp-price]', function (el) { el.textContent = money(total); });
      each('[data-odp-was]', function (el) { el.textContent = was ? money(was) : ''; });

      var pct = percent(v);
      var suffix = state.mode === 'sub'
        ? (data.multiPlan && state.planName ? state.planName : data.copy.lineSub)
        : data.copy.lineOnce;
      var parts = data.defaultOnly ? [] : v.options.slice();
      if (suffix) parts.push(suffix);
      each('[data-odp-line]', function (el) { el.textContent = parts.join(' · '); });

      var subCopy = root.querySelector('[data-odp-sub-copy]');
      if (subCopy) subCopy.textContent = data.copy.subCopy.replace('[percent]', pct);

      var badge = root.querySelector('[data-odp-badge]');
      if (badge) badge.textContent = state.mode === 'sub' && pct > 0 ? data.copy.badge.replace('[percent]', pct) : '';

      if (nudge) {
        var sub = subPrice(v) * state.qty;
        var saving = v.price * state.qty - sub;
        var showNudge = state.mode === 'once' && saving > 0;
        nudge.hidden = !showNudge;
        if (showNudge) {
          var text = nudge.querySelector('[data-odp-nudge-text]');
          var html = escapeHtml(data.copy.nudge)
            .replace('[price]', '<strong>' + escapeHtml(money(sub)) + '</strong>')
            .replace('[saving]', escapeHtml(money(saving)));
          text.innerHTML = html;
        }
      }

      each('[data-odp-cta]', function (b) {
        b.disabled = !available;
        b.textContent = !available ? data.copy.soldOut : (state.mode === 'sub' ? data.copy.ctaSub : data.copy.ctaOnce);
      });
      root.querySelector('[data-odp-qty-out]').textContent = state.qty;

      if (v.media && mainImg && mainImg.getAttribute('data-variant-src') !== v.media) {
        mainImg.setAttribute('data-variant-src', v.media);
        swapMain(v.media, '', mainImg.alt);
      }
    }

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }

    function swapMain(src, srcset, alt) {
      if (!mainImg) return;
      mainImg.removeAttribute('srcset');
      if (srcset) mainImg.setAttribute('srcset', srcset);
      mainImg.src = src;
      if (alt != null) mainImg.alt = alt;
    }

    root.addEventListener('click', function (e) {
      var t = e.target.closest('button');
      if (!t || !root.contains(t)) return;

      if (t.hasAttribute('data-odp-value')) {
        var g = t.closest('[data-odp-option]');
        var i = groups.indexOf(g);
        if (i > -1) { state.options[i] = t.getAttribute('data-odp-value'); render(); }
      } else if (t.hasAttribute('data-odp-mode')) {
        state.mode = t.getAttribute('data-odp-mode');
        render();
      } else if (t.hasAttribute('data-odp-plan')) {
        state.planId = t.getAttribute('data-odp-plan');
        state.planName = t.getAttribute('data-odp-plan-name');
        render();
      } else if (t.hasAttribute('data-odp-qty')) {
        state.qty = Math.max(1, Math.min(99, state.qty + parseInt(t.getAttribute('data-odp-qty'), 10)));
        render();
      } else if (t.hasAttribute('data-odp-thumb')) {
        each('[data-odp-thumb]', function (b) { b.removeAttribute('aria-current'); });
        t.setAttribute('aria-current', 'true');
        swapMain(t.getAttribute('data-src'), t.getAttribute('data-srcset'), t.getAttribute('data-alt'));
      }
    });

    // Sticky bar, same rule on desktop and phones: reveal once the bottom of the
    // origin band has come into view, hide again when scrolling back above it.
    // Without an origin section on the page, fall back to the in-page buy row
    // having scrolled above the viewport.
    if (bar) {
      var barBtn = bar.querySelector('[data-odp-cta]');
      var row = root.querySelector('[data-odp-buyrow]');
      var ticking = false;
      var setBar = function (show) {
        bar.classList.toggle('is-shown', show);
        bar.setAttribute('aria-hidden', show ? 'false' : 'true');
        if (barBtn) barBtn.tabIndex = show ? 0 : -1;
      };
      var check = function () {
        ticking = false;
        var origin = document.querySelector('[data-odp-origin]');
        if (origin) setBar(origin.getBoundingClientRect().bottom < window.innerHeight);
        else if (row) setBar(row.getBoundingClientRect().bottom < 0);
      };
      var onScroll = function () {
        if (!ticking) { ticking = true; window.requestAnimationFrame(check); }
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      check();
    }

    render();
  }

  function boot(scope) {
    Array.prototype.forEach.call((scope || document).querySelectorAll('[data-odp]'), init);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { boot(); });
  else boot();

  // theme editor: re-init a section after it is re-rendered
  document.addEventListener('shopify:section:load', function (e) { boot(e.target); });
})();

/* Omawild Subscription Spot — sections/owv2-subscribe.liquid.
   Roasts, sizes and delivery frequencies are all read from the JSON island
   the section renders (one entry per product in the merchant's collection
   that has a selling plan). Picking a roast rebuilds the size and frequency
   pills from that roast's own data, since they can differ per roast. The
   form submits an ordinary /cart/add — same approach as owv2-product.js. */
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

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // One representative variant per distinct first-option value (e.g. one
  // per Size), preferring an in-stock variant when a value has more than
  // one (a second product option, such as Grind, is otherwise ignored).
  function sizesFor(product) {
    var byValue = {};
    var order = [];
    product.variants.forEach(function (v) {
      if (!(v.value in byValue)) {
        order.push(v.value);
        byValue[v.value] = v;
      } else if (!byValue[v.value].available && v.available) {
        byValue[v.value] = v;
      }
    });
    return order.map(function (val) { return byValue[val]; });
  }

  if (!customElements.get('owv2-subscribe')) {
    customElements.define('owv2-subscribe', class extends HTMLElement {
      connectedCallback() {
        if (this.__init) return;
        this.__init = true;

        var island = this.querySelector('[data-owv2-subscribe-json]');
        if (!island) return;
        var data;
        try { data = JSON.parse(island.textContent); } catch (e) { return; }
        if (!data.products || !data.products.length) return;

        this.data = data;
        this.sectionId = this.dataset.owv2Id || '';
        this.state = { productId: null, variantId: null, planId: null };

        this.els = {
          sizeWrap: this.querySelector('[data-owv2-sizes]'),
          planWrap: this.querySelector('[data-owv2-plans]'),
          variantInput: this.querySelector('[data-owv2-variant]'),
          planInput: this.querySelector('[data-owv2-plan]'),
          cta: this.querySelector('[data-owv2-cta]'),
          roastTitle: this.querySelector('[data-roast]'),
          description: this.querySelector('[data-description]'),
          prices: this.querySelector('.prices'),
          total: this.querySelector('[data-total]'),
          original: this.querySelector('[data-original]'),
          saving: this.querySelector('[data-saving]')
        };

        try {
          this.formatter = new Intl.NumberFormat(this.dataset.locale || 'en', {
            style: 'currency', currency: this.dataset.currency || 'USD'
          });
        } catch (e) {
          this.formatter = null;
        }

        this.onChange = this.onChange.bind(this);
        this.addEventListener('change', this.onChange);

        var firstRoast = this.querySelector('[data-owv2-roast]:checked') || this.querySelector('[data-owv2-roast]');
        if (firstRoast) this.selectRoast(firstRoast.value);
      }

      disconnectedCallback() {
        this.removeEventListener('change', this.onChange);
      }

      findProduct(id) {
        return this.data.products.filter(function (p) { return String(p.id) === String(id); })[0];
      }

      onChange(e) {
        var t = e.target;
        if (!t) return;
        if (t.hasAttribute('data-owv2-roast')) {
          this.selectRoast(t.value);
        } else if (t.hasAttribute('data-owv2-size')) {
          this.state.variantId = t.value;
          this.render();
        } else if (t.hasAttribute('data-owv2-plan-radio')) {
          this.state.planId = t.value;
          this.render();
        }
      }

      selectRoast(id) {
        var product = this.findProduct(id);
        if (!product) return;
        this.state.productId = product.id;

        this.sizes = sizesFor(product);
        var defaultSize = this.sizes.filter(function (v) { return v.available; })[0] || this.sizes[0];
        this.state.variantId = defaultSize ? defaultSize.id : null;
        this.els.sizeWrap.innerHTML = this.sizes.map(function (v) {
          var unavailable = !v.available;
          return '<label class="option' + (unavailable ? ' is-unavailable' : '') + '">' +
            '<input type="radio" name="owv2-size-' + this.sectionId + '" value="' + v.id + '" data-owv2-size' +
            (v.id === this.state.variantId ? ' checked' : '') + '>' +
            '<span>' + escapeHtml(v.value || '') + '</span></label>';
        }, this).join('');

        var plans = product.sellingPlans || [];
        this.state.planId = plans.length ? plans[0].id : null;
        this.els.planWrap.innerHTML = plans.map(function (p, i) {
          return '<label class="option">' +
            '<input type="radio" name="owv2-plan-' + this.sectionId + '" value="' + p.id + '" data-owv2-plan-radio' +
            (i === 0 ? ' checked' : '') + '>' +
            '<span>' + escapeHtml(p.name || '') + '</span></label>';
        }, this).join('');

        this.render();
      }

      render() {
        var product = this.findProduct(this.state.productId);
        if (!product) return;
        var variant = this.sizes.filter(function (v) { return String(v.id) === String(this.state.variantId); }, this)[0];
        if (!variant) return;

        var plans = product.sellingPlans || [];
        var plan = plans.filter(function (p) { return String(p.id) === String(this.state.planId); }, this)[0];

        var money = function (cents) {
          return this.formatter ? this.formatter.format(cents / 100) : formatMoney(cents, this.data.moneyFormat);
        }.bind(this);

        var original = variant.price;
        var subPrice = (plan && variant.plans[plan.id] != null) ? variant.plans[plan.id] : original;
        var available = !!variant.available;

        this.els.roastTitle.textContent = product.title;
        this.els.description.textContent = [product.title, variant.value, plan && plan.name]
          .filter(Boolean).join(' · ');

        this.els.total.textContent = money(subPrice);
        this.els.original.textContent = money(original);
        this.els.original.hidden = original <= subPrice;
        this.els.prices.hidden = false;

        this.els.saving.textContent = original > subPrice
          ? (this.dataset.savings || '').replace('[amount]', money(original - subPrice))
          : '';

        this.els.variantInput.value = variant.id;
        this.els.planInput.value = plan ? plan.id : '';
        this.els.cta.disabled = !available;
        this.els.cta.textContent = available
          ? (this.dataset.cta || '')
          : (this.dataset.soldOut || '');
      }
    });
  }
})();

/* oma-page-header-office — drives the Workplace Coffee "sentence builder"
 * calculator: three inline steppers (team size, cups/person/day, office
 * days/week), a taste toggle, and the stats + tag-folding email capture
 * that reads off them. Ports the math straight from the design file:
 * cups/month = team * cups * days * 4.33 (weeks/month), kg/month =
 * cups/month * grams-per-cup / 1000.
 *
 * The customer form has no fields for these answers, so — same trick as
 * oma-sampler-form.js — they're folded into contact[tags] client-side
 * before submit. The hidden tags input already carries the section's
 * schema defaults server-side, so if JS never runs the email still goes
 * through; it just isn't tagged with whatever the visitor actually chose.
 *
 * On submit, a second background request also fires (see the submit
 * listener near the end of bind()) so the shop actually gets notified —
 * the visible 'customer' form alone is silent; nobody's emailed when it's
 * submitted, only a Customer record gets created/tagged.
 */
(function () {
  if (window.__omaPageHeaderOfficeInit) return;
  window.__omaPageHeaderOfficeInit = true;

  function slugify(value) {
    return String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function formatInt(n) {
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function formatKg(kg) {
    return kg < 10 ? kg.toFixed(1) : formatInt(kg);
  }

  var FIELDS = {
    team: { step: 1, decimals: 0, min: 1, max: 999999 },
    cups: { step: 0.5, decimals: 2, min: 0.5, max: 999 },
    days: { step: 1, decimals: 0, min: 1, max: 7 }
  };

  function bind(root) {
    if (root.__omaOfficeHeader) return;
    root.__omaOfficeHeader = true;

    var teamDefault = parseFloat(root.dataset.teamDefault) || 10;
    var cupsDefault = parseFloat(root.dataset.cupsDefault) || 1;
    var daysDefault = parseFloat(root.dataset.daysDefault) || 5;
    var gramsPerCup = parseFloat(root.dataset.gramsPerCup) || 15;
    var baseTag = root.dataset.baseTag || '';
    var unitSingular = {
      team: root.dataset.teamUnitSingular || 'person',
      cups: root.dataset.cupsUnitSingular || 'cup',
      days: root.dataset.daysUnitSingular || 'day'
    };
    var defaults = { team: teamDefault, cups: cupsDefault, days: daysDefault };

    var steppers = {};
    root.querySelectorAll('[data-stepper]').forEach(function (el) {
      var key = el.getAttribute('data-stepper');
      if (FIELDS[key]) steppers[key] = el;
    });

    var tasteEls = root.querySelectorAll('[data-taste-options] li');
    var tastes = [];
    for (var i = 0; i < tasteEls.length; i++) {
      var label = tasteEls[i].textContent.trim();
      if (label) tastes.push(label);
    }
    if (!tastes.length) tastes = ['chocolatey'];
    var tasteIndex = 0;

    var tasteLabelEl = root.querySelector('[data-taste-label]');
    var tasteToggle = root.querySelector('[data-taste-toggle]');
    var tagsInput = root.querySelector('[data-tags-input]');
    var kgEl = root.querySelector('[data-stat="kg"]');
    var cupsStatEl = root.querySelector('[data-stat="cups"]');

    function sizeInput(input) {
      input.style.width = Math.max(1, String(input.value).length) + 'ch';
    }

    function getValue(key) {
      var input = steppers[key] && steppers[key].querySelector('[data-input]');
      var n = parseFloat(input && input.value);
      return isNaN(n) ? defaults[key] : n;
    }

    function setValue(key, n) {
      var conf = FIELDS[key];
      var input = steppers[key] && steppers[key].querySelector('[data-input]');
      if (!input) return;
      n = Math.max(conf.min, Math.min(conf.max, n));
      n = Math.round(n * 100) / 100;
      input.value = conf.decimals === 0 ? String(Math.round(n)) : String(n);
      sizeInput(input);
    }

    function render() {
      var team = getValue('team');
      var cups = getValue('cups');
      var days = getValue('days');

      Object.keys(unitSingular).forEach(function (key) {
        var unitEl = root.querySelector('[data-unit="' + key + '"]');
        if (!unitEl) return;
        var n = key === 'team' ? team : key === 'cups' ? cups : days;
        unitEl.textContent = n === 1 ? unitSingular[key] : unitSingular[key] + 's';
      });

      var cupsPerMonth = team * cups * days * 4.33;
      var kg = (cupsPerMonth * gramsPerCup) / 1000;
      if (kgEl) kgEl.textContent = formatKg(kg);
      if (cupsStatEl) cupsStatEl.textContent = formatInt(cupsPerMonth);

      if (tagsInput) {
        var tasteSlug = slugify(tastes[tasteIndex]);
        var extra = [
          'team-' + Math.round(team),
          'cups-' + cups,
          'days-' + Math.round(days),
          'taste-' + tasteSlug
        ].join(', ');
        tagsInput.value = baseTag ? baseTag + ', ' + extra : extra;
      }
    }

    Object.keys(steppers).forEach(function (key) {
      var stepper = steppers[key];
      var conf = FIELDS[key];
      var input = stepper.querySelector('[data-input]');
      var down = stepper.querySelector('[data-step="down"]');
      var up = stepper.querySelector('[data-step="up"]');

      sizeInput(input);

      if (down) {
        down.addEventListener('click', function () {
          setValue(key, getValue(key) - conf.step);
          render();
        });
      }
      if (up) {
        up.addEventListener('click', function () {
          setValue(key, getValue(key) + conf.step);
          render();
        });
      }
      if (input) {
        input.addEventListener('input', function () {
          var pattern = conf.decimals === 0 ? /[^0-9]/g : /[^0-9.]/g;
          var cleaned = input.value.replace(pattern, '');
          if (conf.decimals !== 0) {
            var firstDot = cleaned.indexOf('.');
            if (firstDot !== -1) {
              cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
            }
          }
          input.value = cleaned;
          sizeInput(input);
        });
        input.addEventListener('blur', function () {
          var n = parseFloat(input.value);
          setValue(key, isNaN(n) || n <= 0 ? defaults[key] : n);
          render();
        });
        input.addEventListener('keydown', function (e) {
          if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
          e.preventDefault();
          var amount = conf.step * (e.shiftKey ? 10 : 1);
          var delta = e.key === 'ArrowUp' ? amount : -amount;
          setValue(key, getValue(key) + delta);
          render();
        });
      }
    });

    if (tasteToggle) {
      tasteToggle.addEventListener('click', function () {
        tasteIndex = (tasteIndex + 1) % tastes.length;
        if (tasteLabelEl) tasteLabelEl.textContent = tastes[tasteIndex];
        render();
      });
    }

    /* The visible form submits natively to Shopify's 'customer' form action
     * (creates/tags a Customer — see the tags-folding above), which is silent:
     * nobody at the shop is told a submission happened. Rather than switch the
     * visible form to 'contact' (and lose the tagged Customer record), fire a
     * second, background request using the exact form_type=contact convention
     * oma-programme-form.liquid already uses successfully, so this submission
     * ALSO lands as a normal contact-form notification email. sendBeacon (not
     * fetch) specifically because the native form submit navigates the page
     * away immediately after this handler returns — fetch's request can get
     * cancelled mid-flight by that navigation; sendBeacon is built to survive
     * it. Never blocks or cancels the real submission: on the rare chance
     * sendBeacon itself throws, the customer-tagging submit still goes through
     * untouched.
     */
    var officeForm = root.querySelector('[data-oma-page-header-office-form]');
    if (officeForm) {
      officeForm.addEventListener('submit', function () {
        try {
          if (!navigator.sendBeacon) return;
          var emailInput = officeForm.querySelector('input[name="contact[email]"]');
          var email = emailInput && emailInput.value;
          if (!email) return;

          var team = getValue('team');
          var cups = getValue('cups');
          var days = getValue('days');
          var cupsPerMonth = team * cups * days * 4.33;
          var kg = (cupsPerMonth * gramsPerCup) / 1000;

          var body = new URLSearchParams();
          body.set('form_type', 'contact');
          body.set('utf8', '✓');
          body.set('contact[email]', email);
          body.set('contact[Source]', 'Workplace Coffee — Get a free sampler');
          body.set('contact[Team size]', Math.round(team) + ' people');
          body.set('contact[Cups per person per day]', String(cups));
          body.set('contact[Office days per week]', String(Math.round(days)));
          body.set('contact[Taste preference]', tastes[tasteIndex]);
          body.set('contact[Estimated volume]', '≈ ' + formatKg(kg) + ' kg/month, ≈ ' + formatInt(cupsPerMonth) + ' cups/month');

          navigator.sendBeacon(window.location.pathname, body);
        } catch (err) {
          /* never let the notification beacon block the real submission */
        }
      });
    }

    render();
  }

  function enhance(root) {
    var nodes = (root || document).querySelectorAll('[data-oma-page-header-office]');
    for (var i = 0; i < nodes.length; i++) bind(nodes[i]);
  }

  if (document.readyState !== 'loading') enhance();
  else document.addEventListener('DOMContentLoaded', function () { enhance(); });

  document.addEventListener('shopify:section:load', function (e) { enhance(e.target); });
})();

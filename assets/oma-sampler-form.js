/* oma-sampler-form — folds the "team size" select into the customer form's
 * contact[tags] field client-side. Shopify's native `customer` form action
 * has no field for arbitrary answers like team size, but it does accept a
 * single tags string, so the base tag from the section setting and a
 * slugified team-size value are combined into one hidden input before
 * submit. If JS never runs (disabled, or the page navigates before load),
 * the hidden input still carries its base tag value, so the email is never
 * lost -- team size just doesn't get tagged that time.
 */
(function () {
  if (window.__omaSamplerFormInit) return;
  window.__omaSamplerFormInit = true;

  function slugify(value) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function bind(form) {
    if (form.__omaSampler) return;
    form.__omaSampler = true;

    var tagsInput = form.querySelector('[data-oma-sampler-tags]');
    var teamSize = form.querySelector('[data-oma-sampler-team-size]');
    if (!tagsInput || !teamSize) return;

    var baseTag = tagsInput.value;
    var sync = function () {
      var extra = teamSize.value ? slugify(teamSize.value) : '';
      tagsInput.value = extra ? baseTag + ', ' + extra : baseTag;
    };
    teamSize.addEventListener('change', sync);
    sync();
  }

  function enhance(root) {
    var forms = (root || document).querySelectorAll('[data-oma-sampler-form]');
    for (var i = 0; i < forms.length; i++) bind(forms[i]);
  }

  if (document.readyState !== 'loading') enhance();
  else document.addEventListener('DOMContentLoaded', function () { enhance(); });

  document.addEventListener('shopify:section:load', function (e) { enhance(e.target); });
})();

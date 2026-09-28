/* oma-programme-form — pill-button groups toggle like checkboxes (multiple)
 * or radios (single), folding the active pills' values into one hidden
 * input per group before submit, so Shopify's native contact form receives
 * a normal comma-joined text value under contact[<field label>] with no
 * server-side change needed. Progressive: without JS the hidden input
 * simply submits empty for that field, everything else in the form still
 * works.
 */
(function () {
  if (window.__omaProgrammeFormInit) return;
  window.__omaProgrammeFormInit = true;

  function sync(group) {
    var hidden = group.querySelector('[data-pill-group-value]');
    if (!hidden) return;
    var active = group.querySelectorAll('.pill[aria-pressed="true"]');
    var values = [];
    for (var i = 0; i < active.length; i++) values.push(active[i].getAttribute('data-value'));
    hidden.value = values.join(', ');
  }

  function bind(group) {
    if (group.__omaProgramme) return;
    group.__omaProgramme = true;

    var multiple = group.getAttribute('data-multiple') === 'true';
    var pills = group.querySelectorAll('.pill');

    for (var i = 0; i < pills.length; i++) {
      pills[i].addEventListener('click', function (e) {
        var pill = e.currentTarget;
        var pressed = pill.getAttribute('aria-pressed') === 'true';
        if (!multiple) {
          var all = group.querySelectorAll('.pill');
          for (var j = 0; j < all.length; j++) all[j].setAttribute('aria-pressed', 'false');
          pill.setAttribute('aria-pressed', pressed ? 'false' : 'true');
        } else {
          pill.setAttribute('aria-pressed', pressed ? 'false' : 'true');
        }
        sync(group);
      });
    }
  }

  function enhance(root) {
    var groups = (root || document).querySelectorAll('[data-pill-group]');
    for (var i = 0; i < groups.length; i++) bind(groups[i]);
  }

  if (document.readyState !== 'loading') enhance();
  else document.addEventListener('DOMContentLoaded', function () { enhance(); });

  document.addEventListener('shopify:section:load', function (e) { enhance(e.target); });
})();

/* oma-reserve-spotlight — fills the fermentation squares one day at a time
   the first time the card scrolls into view. The server renders every
   square filled and the counter at the last day, so with no JS, no
   IntersectionObserver, or reduced motion the card simply shows complete. */
(function () {
  'use strict';
  if (window.omaReserveSpotlight) return;
  window.omaReserveSpotlight = true;

  var STEP_MS = 45;

  function run(card) {
    var squares = card.querySelectorAll('.day');
    var count = card.querySelector('[data-oma-ferment-count]');
    var day = 0;
    card.classList.add('is-ready');
    if (count) count.textContent = '0';
    var timer = setInterval(function () {
      if (day >= squares.length) { clearInterval(timer); return; }
      squares[day].classList.add('is-on');
      day += 1;
      if (count) count.textContent = String(day);
    }, STEP_MS);
  }

  function init() {
    if (!('IntersectionObserver' in window)) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.querySelectorAll('[data-oma-ferment]:not([data-oma-ferment-bound])').forEach(function (card) {
      card.setAttribute('data-oma-ferment-bound', '');
      var io = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        run(card);
      }, { threshold: 0.4 });
      io.observe(card);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  document.addEventListener('shopify:section:load', init);
})();

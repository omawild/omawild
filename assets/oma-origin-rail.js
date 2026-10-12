/* oma-origin-rail — "sticky, but stops before it runs into something" for
 * oma-origin-facts.liquid's facts column on the Origin Intro page.
 *
 * Why this exists instead of plain CSS `position: sticky`: sticky only
 * stays stuck within its OWN parent's box. The facts band and the story
 * that should scroll past beside it are independent sibling sections (the
 * merchant stacks however many oma-image-text instances the story needs
 * after this one) -- there's no shared tall container for sticky to stick
 * within, so it would either not stick at all, or (with a tall parent)
 * stick for an arbitrary distance unrelated to how long the story actually
 * is. This instead measures the real stop target (the Coffees section) and
 * switches between three states by hand:
 *   - "before": above its own natural position -- normal flow, untouched.
 *   - "stuck": fixed at the configured top offset.
 *   - "after": the stop target has scrolled up to meet it -- parked with
 *     `position: absolute` just above the stop target, so from here it
 *     scrolls away with the page like ordinary content instead of
 *     overlapping what follows.
 *
 * Contract:
 * - [data-origin-rail-root] is the non-moving reference box (must be
 *   `position: relative` in CSS) -- its own left/width/top are read live on
 *   every update, and are NOT affected by the child's position changes
 *   (only content BEFORE it in the document affects its top; removing its
 *   child from flow only changes what comes after it, which nothing here
 *   depends on).
 * - [data-origin-rail] is the element that actually gets repositioned.
 * - data-sticky-top (on the root, px) — fixed/sticky offset from viewport
 *   top. data-sticky-stop (on the root) — CSS selector for the stop
 *   target (e.g. "#coffees"). data-sticky-gap (px) — breathing room kept
 *   above the stop target in the "after" state.
 * - Below 1024px this is inert by design (the design's own two-column
 *   layout only applies from that width up) -- state is always "before".
 */
(function () {
  if (window.__omaOriginRailInit) return;
  window.__omaOriginRailInit = true;

  var BREAKPOINT = 1024;

  function Rail(root) {
    this.root = root;
    this.rail = root.querySelector('[data-origin-rail]');
    this.stopSelector = root.dataset.stickyStop;
    this.top = parseInt(root.dataset.stickyTop, 10) || 0;
    this.gap = parseInt(root.dataset.stickyGap, 10) || 0;
    this.state = 'before';
  }

  Rail.prototype.clear = function () {
    this.rail.style.position = '';
    this.rail.style.top = '';
    this.rail.style.left = '';
    this.rail.style.width = '';
    this.state = 'before';
  };

  Rail.prototype.update = function () {
    if (!this.rail) return;

    if (window.innerWidth < BREAKPOINT) {
      if (this.state !== 'before') this.clear();
      return;
    }

    var stopEl = this.stopSelector ? document.querySelector(this.stopSelector) : null;
    var rootRect = this.root.getBoundingClientRect();

    if (!stopEl || rootRect.top > this.top) {
      if (this.state !== 'before') this.clear();
      return;
    }

    var stopRect = stopEl.getBoundingClientRect();
    var railHeight = this.rail.offsetHeight;

    if (stopRect.top > this.top + railHeight + this.gap) {
      this.state = 'stuck';
      this.rail.style.position = 'fixed';
      this.rail.style.top = this.top + 'px';
      this.rail.style.left = rootRect.left + 'px';
      this.rail.style.width = rootRect.width + 'px';
    } else {
      this.state = 'after';
      var rootDocTop = rootRect.top + window.scrollY;
      var stopDocTop = stopRect.top + window.scrollY;
      this.rail.style.position = 'absolute';
      this.rail.style.left = '0';
      this.rail.style.width = '100%';
      this.rail.style.top = (stopDocTop - railHeight - this.gap - rootDocTop) + 'px';
    }
  };

  var rails = [];
  var ticking = false;

  function updateAll() {
    ticking = false;
    for (var i = 0; i < rails.length; i++) rails[i].update();
  }

  function requestUpdate() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateAll);
  }

  function enhance(scope) {
    var roots = (scope || document).querySelectorAll('[data-origin-rail-root]');
    for (var i = 0; i < roots.length; i++) {
      if (roots[i].__omaOriginRail) continue;
      roots[i].__omaOriginRail = true;
      rails.push(new Rail(roots[i]));
    }
    requestUpdate();
  }

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);

  if (document.readyState !== 'loading') enhance();
  else document.addEventListener('DOMContentLoaded', function () { enhance(); });

  document.addEventListener('shopify:section:load', function (e) { enhance(e.target); });
})();

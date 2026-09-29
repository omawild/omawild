/* owv2-regen accordion — smooth open/close for the native <details> points.
 *
 * Progressive enhancement: with JS off the <details> still toggle (abruptly);
 * with JS on we intercept the toggle and animate the element height with the
 * Web Animations API. Explicit px keyframes are used (no interpolate-size /
 * ::details-content), so the motion is identical across every browser the
 * storefront serves. Honours prefers-reduced-motion by toggling instantly.
 */
(function () {
  if (window.__owv2RegenInit) return;
  window.__owv2RegenInit = true;

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

  function Accordion(details) {
    this.el = details;
    this.summary = details.querySelector('summary');
    this.content = details.querySelector('.answer');
    this.anim = null;
    this.closing = false;
    this.expanding = false;
    if (!this.summary || !this.content) return;
    this.summary.addEventListener('click', this.onClick.bind(this));
    details.__owv2 = true;
  }

  // The <details> carries its own vertical padding + border-bottom; offsetHeight
  // of the summary alone excludes them, so the collapsed/expanded targets add
  // this "chrome" back to avoid a jump at the end of the animation.
  Accordion.prototype.chrome = function () {
    var cs = getComputedStyle(this.el);
    return parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) +
           parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
  };

  Accordion.prototype.duration = function (px) {
    return Math.min(500, Math.max(220, px * 0.9));
  };

  Accordion.prototype.onClick = function (e) {
    e.preventDefault();
    if (REDUCED.matches) { this.el.open = !this.el.open; return; }
    this.el.style.overflow = 'hidden';
    if (this.closing || !this.el.open) this.open();
    else if (this.expanding || this.el.open) this.shrink();
  };

  Accordion.prototype.open = function () {
    this.el.style.height = this.el.offsetHeight + 'px';
    this.el.open = true;
    window.requestAnimationFrame(this.expand.bind(this));
  };

  Accordion.prototype.expand = function () {
    this.expanding = true;
    var start = this.el.offsetHeight;
    var end = this.summary.offsetHeight + this.content.offsetHeight + this.chrome();
    this.run(start, end, true);
  };

  Accordion.prototype.shrink = function () {
    this.closing = true;
    var start = this.el.offsetHeight;
    var end = this.summary.offsetHeight + this.chrome();
    this.run(start, end, false);
  };

  Accordion.prototype.run = function (start, end, open) {
    if (this.anim) this.anim.cancel();
    this.anim = this.el.animate(
      { height: [start + 'px', end + 'px'] },
      { duration: this.duration(Math.abs(end - start)), easing: 'cubic-bezier(.4,0,.2,1)' }
    );
    this.anim.onfinish = this.onFinish.bind(this, open);
    this.anim.oncancel = function () { this.closing = false; this.expanding = false; }.bind(this);
  };

  Accordion.prototype.onFinish = function (open) {
    this.el.open = open;
    this.anim = null;
    this.closing = false;
    this.expanding = false;
    this.el.style.height = '';
    this.el.style.overflow = '';
  };

  function init(root) {
    var scope = root || document;
    var list = scope.querySelectorAll('.owv2-regen details');
    for (var i = 0; i < list.length; i++) {
      if (!list[i].__owv2) new Accordion(list[i]);
    }
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', function () { init(); });

  // Re-bind when the theme editor re-renders this section.
  document.addEventListener('shopify:section:load', function (e) { init(e.target); });
})();

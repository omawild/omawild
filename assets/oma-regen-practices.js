/* oma-regen-practices — sticky TOC for the "Seven Practices" accordion.
 *
 * Three behaviours, each scoped to one [data-oma-regen-practices] section:
 *  - IntersectionObserver marks the TOC item for whichever <details> is
 *    nearest the top of the viewport as aria-current.
 *  - Clicking a TOC link opens its <details> (if closed) and smooth-scrolls
 *    to it, offset for the sticky header (112px, matching oma-sticky-story).
 *  - The expand/collapse-all button toggles every <details> at once.
 */
(function () {
  if (window.__omaRegenPracticesInit) return;
  window.__omaRegenPracticesInit = true;

  var HEADER_OFFSET = 112;

  function init(root) {
    var scope = root || document;
    var sections = scope.querySelectorAll('[data-oma-regen-practices]');
    for (var i = 0; i < sections.length; i++) {
      if (!sections[i].__omaInit) new Practices(sections[i]);
    }
  }

  function Practices(section) {
    this.section = section;
    this.details = Array.prototype.slice.call(section.querySelectorAll('[data-practice]'));
    this.tocLinks = Array.prototype.slice.call(section.querySelectorAll('[data-toc-link]'));
    this.toggleButtons = Array.prototype.slice.call(section.querySelectorAll('[data-toggle-all]'));
    if (!this.details.length) return;
    section.__omaInit = true;

    this.bindToc();
    this.bindToggleAll();
    this.observe();
  }

  Practices.prototype.bindToc = function () {
    var self = this;
    this.tocLinks.forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        var id = link.getAttribute('data-target');
        var el = document.getElementById(id);
        if (!el) return;
        if (!el.open) el.open = true;
        var top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
        window.scrollTo({ top: top, behavior: 'smooth' });
      });
    });
  };

  Practices.prototype.bindToggleAll = function () {
    var self = this;
    this.toggleButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var allOpen = self.details.every(function (d) { return d.open; });
        self.details.forEach(function (d) { d.open = !allOpen; });
        self.syncToggleLabels();
      });
    });
  };

  Practices.prototype.syncToggleLabels = function () {
    var allOpen = this.details.every(function (d) { return d.open; });
    var expandText = this.section.getAttribute('data-expand-label');
    var collapseText = this.section.getAttribute('data-collapse-label');
    if (!expandText || !collapseText) return;
    this.toggleButtons.forEach(function (btn) {
      btn.textContent = allOpen ? collapseText : expandText;
    });
  };

  Practices.prototype.observe = function () {
    var self = this;
    if (!('IntersectionObserver' in window)) return;
    this.io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.id;
        self.tocLinks.forEach(function (link) {
          link.setAttribute('aria-current', link.getAttribute('data-target') === id ? 'true' : 'false');
        });
      });
    }, { rootMargin: '-' + HEADER_OFFSET + 'px 0px -60% 0px', threshold: 0 });
    this.details.forEach(function (d) { self.io.observe(d); });
  };

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', function () { init(); });

  document.addEventListener('shopify:section:load', function (e) { init(e.target); });
})();

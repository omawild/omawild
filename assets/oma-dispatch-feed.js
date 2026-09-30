/* oma-dispatch-feed — client-side filter + "load more" over the story cards
 * Liquid already rendered into the DOM (see sections/oma-dispatch-feed.liquid).
 * No re-fetching: every article up to the section's "Articles to load" cap
 * is already in the markup, tagged via data-tags="tag1|tag2"; this just
 * toggles `hidden` on cards that don't match the active filter, and reveals
 * more of the matching set on "Load more". Tag comparisons are
 * case-insensitive since Shopify article tags and a merchant-typed filter
 * tag setting won't always match case for case.
 */
(function () {
  if (window.__omaDispatchFeedInit) return;
  window.__omaDispatchFeedInit = true;

  function tagsOf(el) {
    var raw = el.getAttribute('data-tags') || '';
    if (!raw) return [];
    return raw.split('|').map(function (t) { return t.toLowerCase(); }).filter(Boolean);
  }

  function bind(root) {
    if (root.__omaDispatch) return;
    root.__omaDispatch = true;

    var sectionId = root.getAttribute('data-section-id') || '';
    var i18n = (window.omaDispatchFeedI18n && window.omaDispatchFeedI18n[sectionId]) || {};
    var pageSize = parseInt(root.getAttribute('data-page-size'), 10) || 12;
    var hasFeatured = root.getAttribute('data-has-featured') === 'true';

    var filterRow = root.querySelector('[data-filter-row]');
    var pills = root.querySelectorAll('.filter-pill');
    var featured = root.querySelector('[data-featured-card]');
    var cards = Array.prototype.slice.call(root.querySelectorAll('[data-story-card]'));
    var moreRow = root.querySelector('[data-more-row]');
    var loadMoreBtn = root.querySelector('[data-load-more]');
    var shownCountEl = root.querySelector('[data-shown-count]');
    var progressFill = root.querySelector('[data-progress-fill]');
    var emptyMessage = root.querySelector('[data-empty-message]');

    var state = { filter: '', shown: pageSize };

    function matches(card) {
      if (!state.filter) return true;
      var tags = tagsOf(card);
      return tags.indexOf(state.filter) > -1;
    }

    function render() {
      if (featured) featured.hidden = !!state.filter || !hasFeatured;

      var matching = cards.filter(matches);
      var visible = matching.slice(0, state.shown);

      cards.forEach(function (card) {
        card.hidden = visible.indexOf(card) === -1;
      });

      var featuredVisible = !!featured && !featured.hidden;
      var extra = featuredVisible ? 1 : 0;
      var total = matching.length + extra;
      var shown = visible.length + extra;
      var remaining = matching.length - visible.length;

      if (moreRow) moreRow.hidden = total === 0;
      if (emptyMessage) emptyMessage.hidden = total !== 0;

      if (shownCountEl && i18n.shownOfTotal) {
        shownCountEl.textContent = i18n.shownOfTotal
          .replace('{shown}', shown)
          .replace('{total}', total);
      }
      if (progressFill) {
        var pct = total > 0 ? Math.round((shown / total) * 100) : 0;
        progressFill.style.width = pct + '%';
      }
      if (loadMoreBtn) {
        loadMoreBtn.hidden = remaining <= 0;
        if (i18n.loadMore) {
          loadMoreBtn.textContent = i18n.loadMore.replace('{count}', Math.min(pageSize, remaining));
        }
      }
    }

    if (filterRow) {
      filterRow.addEventListener('click', function (e) {
        var pill = e.target.closest('.filter-pill');
        if (!pill) return;
        state.filter = (pill.getAttribute('data-filter-tag') || '').toLowerCase();
        state.shown = pageSize;
        pills.forEach(function (p) { p.setAttribute('aria-selected', p === pill ? 'true' : 'false'); });
        render();
      });
    }

    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', function () {
        state.shown += pageSize;
        render();
      });
    }

    render();
  }

  function enhance(scope) {
    var roots = (scope || document).querySelectorAll('[data-oma-dispatch-feed]');
    for (var i = 0; i < roots.length; i++) bind(roots[i]);
  }

  if (document.readyState !== 'loading') enhance();
  else document.addEventListener('DOMContentLoaded', function () { enhance(); });

  document.addEventListener('shopify:section:load', function (e) { enhance(e.target); });
})();

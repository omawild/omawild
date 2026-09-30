/* oma-story founder-story gallery — horizontal card carousel.
 *
 * Borrowed from the old homepage's `about-cards-carousel` (assets/ow-landing.js
 * enableDragScroll + edge-fade update). Progressive enhancement: the rail is a
 * native overflow-x scroller, so touch + trackpad work with no JS. JS only adds
 * mouse drag-to-scroll, the gradient edge fades, and the optional prev/next
 * buttons. Always active -- the row shows a fixed 2/3/4-up card count per
 * breakpoint (see the section's CSS) and only actually scrolls once a
 * merchant adds more photos than that, at any breakpoint, not just a fixed
 * "more than N blocks" threshold. Honours prefers-reduced-motion implicitly
 * — it adds no animation of its own beyond native (smooth) scrolling.
 *
 * The prev/next buttons are a merchant toggle (section.settings.show_nav_buttons)
 * rendered as siblings of .gallery-wrap, in .story-head, not inside it -- so
 * they're looked up from the section root, not from `wrap`.
 */
(function () {
  if (window.__omaStoryInit) return;
  window.__omaStoryInit = true;

  function enhance(root) {
    var wraps = (root || document).querySelectorAll('.oma-story .gallery-wrap.is-scroll');
    for (var i = 0; i < wraps.length; i++) bind(wraps[i]);
  }

  function bind(wrap) {
    var scroller = wrap.querySelector('.gallery');
    if (!scroller || scroller.__oma) return;
    scroller.__oma = true;

    // Drag-to-scroll (mouse). Touch is handled natively by overflow-x:auto.
    var down = false, startX = 0, startScroll = 0, moved = false;
    scroller.addEventListener('mousedown', function (e) {
      down = true; moved = false;
      startX = e.pageX; startScroll = scroller.scrollLeft;
    });
    window.addEventListener('mouseup', function () {
      down = false; scroller.classList.remove('dragging');
    });
    scroller.addEventListener('mouseleave', function () {
      down = false; scroller.classList.remove('dragging');
    });
    scroller.addEventListener('mousemove', function (e) {
      if (!down) return;
      var delta = e.pageX - startX;
      // Only treat it as a drag past a small threshold, so a plain click on a
      // linked card still navigates rather than being swallowed.
      if (!moved && Math.abs(delta) < 4) return;
      moved = true;
      scroller.classList.add('dragging');
      e.preventDefault();
      scroller.scrollLeft = startScroll - delta;
    });
    // Suppress the click that follows a drag on a linked card.
    scroller.addEventListener('click', function (e) {
      if (moved) { e.preventDefault(); moved = false; }
    }, true);

    // Edge fades: hidden when there's nothing more to scroll toward.
    var fadeLeft = wrap.querySelector('.scroll-fade-left');
    var fadeRight = wrap.querySelector('.scroll-fade-right');

    // Prev/next buttons (optional, merchant-toggled) -- siblings of `wrap`,
    // both inside the same section root, not inside `wrap` itself.
    var root = wrap.closest('.oma-story') || wrap.parentElement;
    var btnPrev = root && root.querySelector('.story-nav-prev');
    var btnNext = root && root.querySelector('.story-nav-next');

    function update() {
      var overflowing = scroller.scrollWidth > scroller.clientWidth + 1;
      var atStart = scroller.scrollLeft <= 4;
      var atEnd = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 4;
      if (fadeLeft) fadeLeft.classList.toggle('hide', !overflowing || atStart);
      if (fadeRight) fadeRight.classList.toggle('hide', !overflowing || atEnd);
      if (btnPrev) btnPrev.disabled = !overflowing || atStart;
      if (btnNext) btnNext.disabled = !overflowing || atEnd;
    }
    scroller.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    update();

    if (btnPrev) {
      btnPrev.addEventListener('click', function () {
        scroller.scrollBy({ left: -scroller.clientWidth, behavior: 'smooth' });
      });
    }
    if (btnNext) {
      btnNext.addEventListener('click', function () {
        scroller.scrollBy({ left: scroller.clientWidth, behavior: 'smooth' });
      });
    }
  }

  if (document.readyState !== 'loading') enhance();
  else document.addEventListener('DOMContentLoaded', function () { enhance(); });

  document.addEventListener('shopify:section:load', function (e) { enhance(e.target); });
})();

/* owv2-story founder-story gallery — horizontal card carousel.
 *
 * Borrowed from the old homepage's `about-cards-carousel` (assets/ow-landing.js
 * enableDragScroll + edge-fade update). Progressive enhancement: the rail is a
 * native overflow-x scroller, so touch + trackpad work with no JS. JS only adds
 * mouse drag-to-scroll and the gradient edge fades, and only for the scrolling
 * variant (>3 cards on desktop). Honours prefers-reduced-motion implicitly —
 * it adds no animation of its own beyond native scrolling.
 */
(function () {
  if (window.__owv2StoryInit) return;
  window.__owv2StoryInit = true;

  function enhance(root) {
    var wraps = (root || document).querySelectorAll('.owv2-story .gallery-wrap.is-scroll');
    for (var i = 0; i < wraps.length; i++) bind(wraps[i]);
  }

  function bind(wrap) {
    var scroller = wrap.querySelector('.gallery');
    if (!scroller || scroller.__owv2) return;
    scroller.__owv2 = true;

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
    function update() {
      var overflowing = scroller.scrollWidth > scroller.clientWidth + 1;
      var atStart = scroller.scrollLeft <= 4;
      var atEnd = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 4;
      if (fadeLeft) fadeLeft.classList.toggle('hide', !overflowing || atStart);
      if (fadeRight) fadeRight.classList.toggle('hide', !overflowing || atEnd);
    }
    scroller.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    update();
  }

  if (document.readyState !== 'loading') enhance();
  else document.addEventListener('DOMContentLoaded', function () { enhance(); });

  document.addEventListener('shopify:section:load', function (e) { enhance(e.target); });
})();

/* ow-landing.js -- landing page behaviour only: regen card carousel, product
   carousel, regen desktop annotations, about carousel, and the shared
   setupScrollFade() edge-fade helper used by the carousels.

   Extracted from omawild-landing(1).html. Loaded by sections/ow-landing.liquid.
   Note: setupScrollFade() is the carousel edge-gradient helper and is unrelated
   to the .fade-up scroll reveal, which lives in ow-chrome.js.

   Everything is wrapped in init() so it can be re-run when the theme editor
   swaps in a freshly rendered section. Two things make a naive re-run unsafe,
   and both are handled here:

     - Listeners on window (resize, mouseup) would accumulate on every reload,
       each closure still pointing at discarded DOM. Every addEventListener
       takes an AbortController signal, so one abort() removes the whole
       generation at once.
     - The IntersectionObserver would keep observing detached nodes. It is
       tracked and disconnected on teardown.

   Every element lookup is guarded. Each band is an optional block, so any of
   these ids can legitimately be absent -- and an unguarded null here would
   throw and kill every carousel declared after it. */

(function () {
  let controller = null;
  let observers = [];

  function teardown() {
    if (controller) controller.abort();
    observers.forEach(o => o.disconnect());
    observers = [];
    controller = new AbortController();
    return controller.signal;
  }

  // ── SCROLL FADE (hints a row keeps scrolling; fades out at each end once
  //    scrolled that far, since the cards bleed edge-to-edge on both sides) ──
  function setupScrollFade(wrap, fadeLeft, fadeRight, signal) {
    if (!wrap) return;
    function update() {
      const overflowing = wrap.scrollWidth > wrap.clientWidth + 1;
      const atStart = wrap.scrollLeft <= 4;
      const atEnd = wrap.scrollLeft + wrap.clientWidth >= wrap.scrollWidth - 4;
      if (fadeLeft)  fadeLeft.classList.toggle('hide', !overflowing || atStart);
      if (fadeRight) fadeRight.classList.toggle('hide', !overflowing || atEnd);
    }
    wrap.addEventListener('scroll', update, { signal });
    window.addEventListener('resize', update, { signal });
    update();
  }

  function enableDragScroll(wrap, signal) {
    if (!wrap) return;
    let isDown = false, startX = 0, startScroll = 0;
    wrap.addEventListener('mousedown', (e) => {
      isDown = true;
      wrap.classList.add('dragging');
      startX = e.pageX;
      startScroll = wrap.scrollLeft;
    }, { signal });
    window.addEventListener('mouseup', () => {
      isDown = false;
      wrap.classList.remove('dragging');
    }, { signal });
    wrap.addEventListener('mouseleave', () => { isDown = false; wrap.classList.remove('dragging'); }, { signal });
    wrap.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      wrap.scrollLeft = startScroll - (e.pageX - startX);
    }, { signal });
  }

  function init() {
    const signal = teardown();

    // Native scrollTo({behavior:'smooth'}) animates over a fixed duration
    // regardless of distance, so paging three cards at once covered 1132px in
    // ~550ms — around 2000px/s, which reads as a teleport rather than a scroll.
    // This paces the animation to the distance instead, so a one-card step and
    // a three-card page travel at a comparable speed and both look like
    // scrolling. Clamped so short hops are not sluggish and long ones not slow.
    function glideScroll(el, to) {
      const from = el.scrollLeft;
      const delta = to - from;
      if (Math.abs(delta) < 1) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        el.scrollLeft = to;
        return;
      }
      if (el._regenAnim) cancelAnimationFrame(el._regenAnim);
      const duration = Math.min(1000, Math.max(420, Math.abs(delta) * 0.7));
      const start = performance.now();
      function frame(now) {
        const p = Math.min(1, (now - start) / duration);
        // easeInOutCubic — accelerates away and settles, rather than the
        // constant-velocity slide a linear curve would give.
        const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        el.scrollLeft = from + delta * e;
        el._regenAnim = p < 1 ? requestAnimationFrame(frame) : null;
      }
      el._regenAnim = requestAnimationFrame(frame);
    }

    // ── REGEN CARD SCROLL (both breakpoints) ──
    const regenTrack = document.getElementById('regenTrack');
    const regenPrev  = document.getElementById('regenPrev');
    const regenNext  = document.getElementById('regenNext');
    // The step used to be a hardcoded 220 + 12. The carousel now runs on desktop
    // too, where the cards are 300px, so the step is measured from the rendered
    // card and the CSS gap instead — a hardcoded value would leave the arrows
    // scrolling less than a full card and drifting further out of alignment
    // with every click.
    function regenCardStep() {
      const first = regenTrack && regenTrack.children[0];
      if (!first) return 0;
      const gap = parseFloat(getComputedStyle(regenTrack).columnGap) || 0;
      return first.getBoundingClientRect().width + gap;
    }
    // Cards per view: 1 on mobile, 3 on desktop where the CSS sizes them to a
    // third of the row. Measured off the track's CONTENT width — clientWidth
    // includes the container's own horizontal padding, and counting that would
    // read mobile as 1.7 cards and page two at a time.
    function regenPageSize() {
      const wrap = regenTrack && regenTrack.parentElement;
      const step = regenCardStep();
      if (!wrap || !step) return 1;
      const cs = getComputedStyle(wrap);
      const inner = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      // Rounded, not floored: three cards sized to fit exactly measure 2.97 of
      // a row once sub-pixel widths are included, and flooring would page by 2.
      return Math.max(1, Math.round(inner / step));
    }
    let regenIdx = 0;
    function scrollRegen(dir) {
      const cards = regenTrack.children.length;
      const page = regenPageSize();
      // Stop the last page flush with the end rather than scrolling past it
      // into empty space.
      const maxIdx = Math.max(0, cards - page);
      regenIdx = Math.max(0, Math.min(maxIdx, regenIdx + dir * page));
      const first = regenTrack.children[0];
      const target = regenTrack.children[regenIdx];
      if (!first || !target) return;
      // Offset between the two cards rather than index × step, so the maths
      // stays right however the scroll container is sized.
      glideScroll(regenTrack.parentElement, target.offsetLeft - first.offsetLeft);
    }
    // Crossing the 800px breakpoint changes the page size between 1 and 3, which
    // leaves the stored index pointing at a position that is no longer a page
    // boundary — the carousel ends up parked mid-card. Re-snap to the nearest
    // valid page and jump there without animating, since the user is dragging a
    // window edge rather than asking to move through the cards.
    function syncRegenToBreakpoint() {
      if (!regenTrack || !regenTrack.children.length) return;
      const page = regenPageSize();
      const cards = regenTrack.children.length;
      regenIdx = Math.min(Math.max(0, cards - page), Math.round(regenIdx / page) * page);
      const first = regenTrack.children[0];
      const target = regenTrack.children[regenIdx];
      if (first && target) {
        regenTrack.parentElement.scrollLeft = target.offsetLeft - first.offsetLeft;
      }
    }

    if (regenTrack && regenPrev && regenNext) {
      regenPrev.addEventListener('click', () => scrollRegen(-1), { signal });
      regenNext.addEventListener('click', () => scrollRegen(1), { signal });
      window.addEventListener('resize', syncRegenToBreakpoint, { signal });
    }

    // ── PRODUCT CAROUSEL (mobile) ──
    // Native horizontal scroll container, so touch swipe and trackpad
    // scrolling work without any custom code. Buttons and arrow keys move
    // it card-by-card; the current index is re-derived from the real
    // scroll position each time so a free swipe can't desync it.
    const prodWrap  = document.getElementById('productsTrackWrap');
    const prodTrack = document.getElementById('productsTrack');
    const PROD_CARD_W = 260 + 16;
    function scrollProd(dir) {
      const cards = prodTrack.children.length;
      const current = Math.round(prodWrap.scrollLeft / PROD_CARD_W);
      const next = Math.max(0, Math.min(cards - 1, current + dir));
      prodWrap.scrollTo({ left: next * PROD_CARD_W, behavior: 'smooth' });
    }
    if (prodWrap && prodTrack) {
      prodWrap.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); scrollProd(-1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); scrollProd(1); }
      }, { signal });
      setupScrollFade(
        prodWrap,
        document.querySelector('.products-carousel .scroll-fade-left'),
        document.querySelector('.products-carousel .scroll-fade-right'),
        signal
      );
    }

    // ── REGEN DESKTOP ANNOTATIONS ──
    const regenDesktop = document.getElementById('regenDesktop');
    if (regenDesktop) {
      const regenAnns = document.querySelectorAll('.regen-ann');
      const obs = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            regenAnns.forEach(a => {
              setTimeout(() => a.classList.add('visible'), parseInt(a.dataset.delay || 0));
            });
          }
        });
      }, { threshold: .15 });
      obs.observe(regenDesktop);
      observers.push(obs);
    }

    // ── ABOUT CAROUSEL (arrows shown on desktop only; visibility handled by CSS) ──
    // Same pattern as the product carousel: native horizontal scroll for
    // free swipe/trackpad support, buttons and arrow keys move it
    // card-by-card, and the current index is re-derived from the real
    // scroll position each time so a free swipe can't desync it.
    const aboutWrap = document.getElementById('aboutCardsWrap');
    function scrollAbout(dir) {
      const track = aboutWrap.querySelector('.about-cards-track');
      const firstCard = track.querySelector('.about-card');
      if (!firstCard) return;
      const gap = parseFloat(getComputedStyle(track).gap) || 16;
      const cardW = firstCard.offsetWidth + gap;
      const cards = track.children.length;
      const current = Math.round(aboutWrap.scrollLeft / cardW);
      const next = Math.max(0, Math.min(cards - 1, current + dir));
      aboutWrap.scrollTo({ left: next * cardW, behavior: 'smooth' });
    }
    if (aboutWrap) {
      aboutWrap.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); scrollAbout(-1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); scrollAbout(1); }
      }, { signal });
      setupScrollFade(
        aboutWrap,
        document.querySelector('.about-cards-carousel .scroll-fade-left'),
        document.querySelector('.about-cards-carousel .scroll-fade-right'),
        signal
      );
      enableDragScroll(aboutWrap, signal);
    }
  }

  init();

  // The theme editor re-renders a section into fresh DOM whenever it is edited,
  // leaving every listener above bound to nodes that are no longer on the page.
  // Re-init only when the reloaded section is one that owns a carousel, so
  // editing an unrelated section does not churn this one.
  document.addEventListener('shopify:section:load', (e) => {
    if (e.target.querySelector('#regenTrack, #productsTrackWrap, #aboutCardsWrap, #regenDesktop')) {
      init();
    }
  });

  // Removing the section should not leave window listeners behind.
  document.addEventListener('shopify:section:unload', (e) => {
    if (e.target.querySelector('#regenTrack, #productsTrackWrap, #aboutCardsWrap, #regenDesktop')) {
      teardown();
    }
  });
})();

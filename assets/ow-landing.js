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

    // ── REGEN CARD SCROLL (mobile) ──
    const regenTrack = document.getElementById('regenTrack');
    const regenPrev  = document.getElementById('regenPrev');
    const regenNext  = document.getElementById('regenNext');
    const CARD_W = 220 + 12;
    let regenIdx = 0;
    function scrollRegen(dir) {
      const cards = regenTrack.children.length;
      regenIdx = Math.max(0, Math.min(cards - 1, regenIdx + dir));
      regenTrack.parentElement.scrollTo({ left: regenIdx * CARD_W, behavior: 'smooth' });
    }
    if (regenTrack && regenPrev && regenNext) {
      regenPrev.addEventListener('click', () => scrollRegen(-1), { signal });
      regenNext.addEventListener('click', () => scrollRegen(1), { signal });
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

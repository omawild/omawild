/* ow-landing.js -- landing page behaviour only: regen card carousel, product
   carousel, regen desktop annotations, about carousel, and the shared
   setupScrollFade() edge-fade helper used by the carousels.

   Extracted from omawild-landing(1).html. Loaded by sections/ow-landing.liquid.
   Note: setupScrollFade() is the carousel edge-gradient helper and is unrelated
   to the .fade-up scroll reveal, which lives in ow-chrome.js. */

// ── REGEN CARD SCROLL (mobile) ──
const regenTrack = document.getElementById('regenTrack');
const regenPrev  = document.getElementById('regenPrev');
const regenNext  = document.getElementById('regenNext');
const CARD_W = 220 + 12;
let regenIdx = 0;
function scrollRegen(dir) {
  const cards = regenTrack.children.length;
  regenIdx = Math.max(0, Math.min(cards - 1, regenIdx + dir));
  regenTrack.parentElement.scrollTo({left: regenIdx * CARD_W, behavior:'smooth'});
}
regenPrev.addEventListener('click', () => scrollRegen(-1));
regenNext.addEventListener('click', () => scrollRegen(1));

// ── SCROLL FADE (hints a row keeps scrolling; fades out at each end once
//    scrolled that far, since the cards bleed edge-to-edge on both sides) ──
function setupScrollFade(wrap, fadeLeft, fadeRight) {
  if (!wrap) return;
  function update() {
    const overflowing = wrap.scrollWidth > wrap.clientWidth + 1;
    const atStart = wrap.scrollLeft <= 4;
    const atEnd = wrap.scrollLeft + wrap.clientWidth >= wrap.scrollWidth - 4;
    if (fadeLeft)  fadeLeft.classList.toggle('hide', !overflowing || atStart);
    if (fadeRight) fadeRight.classList.toggle('hide', !overflowing || atEnd);
  }
  wrap.addEventListener('scroll', update);
  window.addEventListener('resize', update);
  update();
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
  prodWrap.scrollTo({left: next * PROD_CARD_W, behavior:'smooth'});
}
prodWrap.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') { e.preventDefault(); scrollProd(-1); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); scrollProd(1); }
});
setupScrollFade(
  prodWrap,
  document.querySelector('.products-carousel .scroll-fade-left'),
  document.querySelector('.products-carousel .scroll-fade-right')
);

// ── REGEN DESKTOP ANNOTATIONS ──
const regenDesktop = document.getElementById('regenDesktop');
const regenAnns = document.querySelectorAll('.regen-ann');
new IntersectionObserver(entries => {
  entries.forEach(e => {
    if(e.isIntersecting) {
      regenAnns.forEach(a => {
        setTimeout(() => a.classList.add('visible'), parseInt(a.dataset.delay||0));
      });
    }
  });
}, {threshold:.15}).observe(regenDesktop);

// ── ABOUT CAROUSEL (arrows shown on desktop only; visibility handled by CSS) ──
// Same pattern as the product carousel: native horizontal scroll for
// free swipe/trackpad support, buttons and arrow keys move it
// card-by-card, and the current index is re-derived from the real
// scroll position each time so a free swipe can't desync it.
const aboutWrap  = document.getElementById('aboutCardsWrap');
function scrollAbout(dir) {
  const track = aboutWrap.querySelector('.about-cards-track');
  const firstCard = track.querySelector('.about-card');
  if (!firstCard) return;
  const gap = parseFloat(getComputedStyle(track).gap) || 16;
  const cardW = firstCard.offsetWidth + gap;
  const cards = track.children.length;
  const current = Math.round(aboutWrap.scrollLeft / cardW);
  const next = Math.max(0, Math.min(cards - 1, current + dir));
  aboutWrap.scrollTo({left: next * cardW, behavior:'smooth'});
}
aboutWrap.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') { e.preventDefault(); scrollAbout(-1); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); scrollAbout(1); }
});
setupScrollFade(
  aboutWrap,
  document.querySelector('.about-cards-carousel .scroll-fade-left'),
  document.querySelector('.about-cards-carousel .scroll-fade-right')
);
(function enableDragScroll(wrap) {
  if (!wrap) return;
  let isDown = false, startX = 0, startScroll = 0;
  wrap.addEventListener('mousedown', (e) => {
    isDown = true;
    wrap.classList.add('dragging');
    startX = e.pageX;
    startScroll = wrap.scrollLeft;
  });
  window.addEventListener('mouseup', () => {
    isDown = false;
    wrap.classList.remove('dragging');
  });
  wrap.addEventListener('mouseleave', () => { isDown = false; wrap.classList.remove('dragging'); });
  wrap.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    wrap.scrollLeft = startScroll - (e.pageX - startX);
  });
})(aboutWrap);

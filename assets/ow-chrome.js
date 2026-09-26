/* ow-chrome.js -- site chrome behaviour: launch countdown, navbar reveal +
   hide-on-scroll (global, every template), menu modal, mobile menu, footer
   email signup, footer nav accordion, region/language selector, and the
   site-wide .fade-up scroll reveal.

   Extracted from omawild-landing(1).html. Loaded on every page via the header
   section group, so everything here must tolerate landing-only elements being
   absent -- see the #hero guard below. Must load BEFORE ow-landing.js. */

// ── LAUNCH ANNOUNCEMENT BAR: live countdown ──
// Counts down to a target date, then flips to the live message. Runs
// indefinitely afterward (harmless — it just keeps re-setting the same text).
//
// Target date and both messages come from data attributes on #ann1, set by the
// Countdown bar block in sections/ow-header.liquid, so they are editable in the
// theme editor rather than hardcoded here.
(function () {
  const bar = document.getElementById('ann1');
  if (!bar) return;

  const target = new Date(bar.dataset.target).getTime();
  const textEl = document.getElementById('annLaunchText');
  const cdEl = document.getElementById('annLaunchCountdown');
  const BEFORE = bar.dataset.before || '';
  const AFTER = bar.dataset.after || '';

  // An unparseable date would render "NaN D : NaN HOUR"; leaving the static
  // before-text from Liquid in place is the safer failure.
  if (!textEl || !cdEl || Number.isNaN(target)) return;

  function tick() {
    const diff = target - Date.now();
    if (diff <= 0) {
      textEl.textContent = AFTER;
      cdEl.textContent = '';
      return;
    }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    textEl.textContent = BEFORE;
    function unit(value, label) {
      return '<span class="ann-countdown-num">' + String(value).padStart(2, '0') + '</span>'
        + '<span class="ann-countdown-unit"> ' + label + '</span>';
    }
    cdEl.innerHTML = unit(d, 'D') + '<span class="ann-countdown-unit"> : </span>'
      + unit(h, 'HOUR') + '<span class="ann-countdown-unit"> : </span>'
      + unit(m, 'MIN') + '<span class="ann-countdown-unit"> : </span>'
      + unit(s, 'SEC');
  }
  tick();
  setInterval(tick, 1000);
})();

// ── FIXED TOP CHROME + NAVBAR HIDE-ON-SCROLL ──
// The navbar is global chrome: this same behaviour runs on every template,
// not just the landing page. A page that names a hero (see `hero` below)
// keeps the navbar off entirely until the hero has scrolled out of view --
// the hero still owns the whole first viewport there. From that point on,
// and immediately on every page with no hero, the navbar hides while the
// visitor scrolls down and reappears the moment they scroll up.
// `let`, not `const`: same reason as timerBar/promoBar below -- the theme
// editor's live preview replaces this section's entire DOM subtree on every
// settings change (Section Rendering API), so a stale reference here left
// the freshly-rendered navbar stuck in its default hidden state (opacity:0,
// translateY(-100%)) until a full reload. See refreshHeaderChrome() further
// down, which re-binds this along with menuBtn/menuModal/menuClose and the
// region selectors -- everything ow-header.liquid renders.
let topChrome = document.getElementById('top-chrome');
let navbar    = document.getElementById('navbar');
// OW Navbar (sections/ow-header.liquid) carries no bars of its own -- the
// vendor's own Timer (announcement-bar.liquid) and Announcement Bar
// (scrolling-promotion.liquid) sections are the only source of promo bars
// now, pinned fixed above #top-chrome via ow-chrome.css. Either, both, or
// neither may be enabled on a given page, so every height read here guards
// on the element existing.
//
// Scoped to .shopify-section-group-header-group so a copy of either section
// dropped into a page template (outside the header) is never mistaken for
// the one that should be pinned above the navbar -- see ow-chrome.css's
// VENDOR PROMO BARS block for the matching CSS scope.
//
// `let`, not `const`: the theme editor's live preview replaces a section's
// entire DOM subtree on every edit (Section Rendering API), so these two
// have to be re-queried -- see refreshVendorBars() below -- or they end up
// pointing at a detached node and the chrome silently stops updating until
// a full reload (Save) re-runs this script from scratch.
let timerBar = document.querySelector('.shopify-section-group-header-group .announcement-bar');
let promoBar = document.querySelector('.shopify-section-group-header-group .scrolling-promotion');
// The element the navbar hides behind until it has scrolled clear. The landing
// page has #hero; any other page opts in by naming its own through
// data-navbar-reveal-target. Everything downstream still just reads `hero`, so
// a template can adopt the same treatment with one data attribute and no JS
// changes.
const revealTarget = topChrome.dataset.navbarRevealTarget;
const hero = document.getElementById('hero')
  || (revealTarget ? document.querySelector(revealTarget) : null);

function getVendorBarHeight() {
  // Timer + Announcement Bar combined, whichever of the two actually exist
  // on this page. Always counted regardless of navbar state -- unlike the
  // navbar, these never hide once enabled.
  //
  // Floored per bar, not raw: this is also what --ow-timer-h/--ow-promo-h
  // feed into positioning the bars/navbar themselves (see applyChrome()
  // below). Body padding used to sum the RAW fractional heights and ceil
  // only the total, which disagreed with the floored positions by ~1px
  // any time either bar's real height had a fractional part -- which is
  // effectively always. That mismatch was a guaranteed, structural gap
  // between the navbar and real content, not an occasional rounding fluke.
  // Flooring here first makes every consumer agree on the exact same
  // number the bars are actually positioned at.
  let h = 0;
  if (timerBar) { h += Math.floor(timerBar.getBoundingClientRect().height); }
  if (promoBar) { h += Math.floor(promoBar.getBoundingClientRect().height); }
  return h;
}

function getAnnBarHeight() {
  // Sum the height of every fixed bar ABOVE the navbar: the vendor promo
  // bars, plus (today, always empty) any .ann-bar left inside #top-chrome.
  let h = getVendorBarHeight();
  topChrome.querySelectorAll('.ann-bar').forEach(el => { h += el.getBoundingClientRect().height; });
  // Pages with no #hero show the navbar from first paint, so it occupies real
  // space at the top of the viewport and body padding has to clear it too.
  // On the landing page it is deliberately NOT counted: the padding would have
  // to grow by 54px at the moment the navbar fades in, jerking the page down
  // mid-scroll. There the revealed bar overlays content instead.
  if (!hero) { h += navbar.getBoundingClientRect().height; }
  // Round up so we always over-cover by a fraction of a px rather than
  // under-cover and reveal a sliver of the body background.
  return Math.ceil(h);
}

function getChromeOffset() {
  // What anything docking BELOW the chrome has to clear. Deliberately NOT the
  // same number as the body padding above: the navbar counts here whenever it
  // is actually on screen, including on pages where the padding ignores it. A
  // bar docked at the ann bars' edge would otherwise be swallowed by the navbar
  // the instant it reveals.
  let h = getVendorBarHeight();
  topChrome.querySelectorAll('.ann-bar').forEach(el => { h += el.getBoundingClientRect().height; });
  if (navbar.classList.contains('visible')) { h += navbar.getBoundingClientRect().height; }
  return Math.ceil(h);
}

function applyChrome() {
  document.body.style.paddingTop = getAnnBarHeight() + 'px';
  // --ow-timer-h / --ow-promo-h position the vendor bars themselves and
  // #top-chrome (see ow-chrome.css) -- read fresh here rather than cached,
  // since either bar's own content can reflow (window resize, text wrap).
  //
  // Math.floor, not ceil: these two values become the NEXT bar's `top`, so
  // rounding UP a fractional real height (e.g. 53.4px -> 54px) leaves that
  // sliver of page background exposed as a visible gap between the two bars.
  // Rounding down instead makes the next bar start at or a fraction of a
  // px before the real edge -- an imperceptible overlap, never a gap.
  document.documentElement.style.setProperty('--ow-timer-h', (timerBar ? Math.floor(timerBar.getBoundingClientRect().height) : 0) + 'px');
  document.documentElement.style.setProperty('--ow-promo-h', (promoBar ? Math.floor(promoBar.getBoundingClientRect().height) : 0) + 'px');
  // Published so anything docking below the fixed bars can find their bottom
  // edge from CSS alone. Every recalculation route (resize, fonts.ready, the
  // ResizeObserver, and every navbar reveal) runs through here, so it cannot go
  // stale. Today's only consumer is the vendor scrollspy nav -- see the
  // override at the foot of ow-chrome.css.
  document.documentElement.style.setProperty('--ow-chrome-h', getChromeOffset() + 'px');
}

// Single entry point for the navbar's visibility, so the docked bar can never
// be updated in one place and forgotten in another. CSS transitions both the
// navbar's transform and the bar's top over .38s, so they travel together.
function setNavbarVisible(on) {
  navbar.classList.toggle('visible', on);
  applyChrome();
}

applyChrome();
window.addEventListener('resize', applyChrome);
// Recalculate after fonts load to avoid 1px gap
document.fonts.ready.then(applyChrome);
// Recalculate any time the announcement bars actually change size
// (font swap, text reflow, orientation change, etc.) so the gap can never
// reappear after first paint.
let chromeResizeObserver;
if ('ResizeObserver' in window) {
  chromeResizeObserver = new ResizeObserver(applyChrome);
  chromeResizeObserver.observe(topChrome);
  // The vendor bars reflow independently of #top-chrome -- a countdown
  // wrapping to a second line on narrow screens, an announcement message
  // changing length -- so each needs its own watch, not just topChrome's.
  if (timerBar) { chromeResizeObserver.observe(timerBar); }
  if (promoBar) { chromeResizeObserver.observe(promoBar); }
}

// Re-find the vendor bars and recompute the chrome whenever a section
// reloads in the theme editor's live preview. Without this, editing either
// bar's settings (or toggling its blocks) swaps in a DOM node this script
// has never seen: the old `timerBar`/`promoBar` reference goes stale, its
// ResizeObserver watch fires into the void, and --ow-timer-h/--ow-promo-h/
// body padding freeze at their last real value until a full reload (Save).
// Fires on every section's reload, not just these two -- cheap enough
// (a couple of querySelectors) that filtering by section id isn't worth it,
// and matches the same broad-listener pattern the fade-up observer uses
// below.
function refreshVendorBars() {
  const nextTimerBar = document.querySelector('.shopify-section-group-header-group .announcement-bar');
  const nextPromoBar = document.querySelector('.shopify-section-group-header-group .scrolling-promotion');

  if (chromeResizeObserver) {
    if (timerBar && timerBar !== nextTimerBar) chromeResizeObserver.unobserve(timerBar);
    if (promoBar && promoBar !== nextPromoBar) chromeResizeObserver.unobserve(promoBar);
    if (nextTimerBar && nextTimerBar !== timerBar) chromeResizeObserver.observe(nextTimerBar);
    if (nextPromoBar && nextPromoBar !== promoBar) chromeResizeObserver.observe(nextPromoBar);
  }

  timerBar = nextTimerBar;
  promoBar = nextPromoBar;
  applyChrome();
}

// Fade the navbar in once the hero has fully left the viewport, and fade it
// back out when the hero returns. The navbar ships hidden, so at the top of the
// landing page there is no navbar at all -- the hero owns the whole viewport.
//
// `pastHero` is what gates the scroll handler further down: while it is false
// (a hero exists and is still on screen) these two observers own visibility
// outright and the scroll handler is a no-op. A page with no hero starts
// already past it, which is what lets that same handler run there from first
// paint. Guarding on `hero` here matters more than it looks: this is one
// classic script, so an exception on .observe(null) would kill every handler
// declared below it (menu modal, email form, mobile menu, region selector).
//
// The reveal and the un-reveal deliberately use DIFFERENT thresholds. A single
// observer flips both ways at the same pixel, so parking the scroll exactly on
// the hero's bottom edge and nudging the wheel replays the 380ms transition over
// and over. Splitting them leaves a dead band -- between the two edges neither
// observer fires and the navbar simply holds its current state.
const REVEAL_HYSTERESIS = 120;
let pastHero = !hero;
if (hero) {
  // Reveal once the hero is entirely above the viewport.
  new IntersectionObserver(
    ([e]) => {
      if (!e.isIntersecting) { pastHero = true; setNavbarVisible(true); }
    },
    { threshold: 0 }
  ).observe(hero);

  // Un-reveal only after REVEAL_HYSTERESIS px of hero has scrolled back into
  // view. A negative top rootMargin shrinks the observer's root box down from
  // the top of the viewport, which is what moves this edge below the first one.
  new IntersectionObserver(
    ([e]) => {
      if (e.isIntersecting) { pastHero = false; setNavbarVisible(false); }
    },
    { threshold: 0, rootMargin: '-' + REVEAL_HYSTERESIS + 'px 0px 0px 0px' }
  ).observe(hero);
} else {
  // No hero and no named target: nothing to scroll past, so the navbar is
  // shown from first paint. --no-reveal skips the slide-in transition for
  // this one appearance only -- it comes off two frames later so every
  // hide/reveal the scroll handler below triggers afterwards still animates.
  navbar.classList.add('navbar--no-reveal');
  setNavbarVisible(true);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    navbar.classList.remove('navbar--no-reveal');
  }));
}

// ── NAVBAR HIDE-ON-SCROLL (every template) ──
// Direction-based show/hide, active everywhere once past the hero (or
// immediately where there is none): scrolling down hides the navbar,
// scrolling up reveals it. rAF-throttled so it costs at most one read/write
// pair per frame, not one per scroll event.
// 8px fired on nearly every scroll tick -- a trackpad's natural jitter was
// enough to flip direction and retrigger the transition, which read as
// twitchy rather than a deliberate scroll-up/scroll-down gesture. 32px asks
// for a real, intentional scroll before the navbar reacts.
const SCROLL_DELTA = 32; // px of movement required before a direction counts
let lastScrollY = window.scrollY;
let scrollTicking = false;

function handleNavbarScroll() {
  scrollTicking = false;
  if (!pastHero) return; // the hero observers above own visibility until then
  const y = Math.max(0, window.scrollY);
  const delta = y - lastScrollY;
  lastScrollY = y;
  // Nothing to hide into while still inside the chrome's own height -- always
  // show it there rather than follow whatever direction the visitor last
  // nudged the wheel.
  if (y <= getChromeOffset()) { setNavbarVisible(true); return; }
  if (Math.abs(delta) < SCROLL_DELTA) return;
  setNavbarVisible(delta < 0); // scrolling up reveals, down hides
}

window.addEventListener('scroll', () => {
  if (scrollTicking) return;
  scrollTicking = true;
  requestAnimationFrame(handleNavbarScroll);
}, { passive: true });

// ── MENU MODAL ──
let menuBtn   = document.getElementById('menuBtn');
let menuModal = document.getElementById('menuModal');
let menuClose = document.getElementById('menuClose');

// Idempotent (guarded by __owBound) so refreshHeaderChrome() below can call
// this again after ow-header.liquid re-renders without double-binding a
// node it already bound.
function bindMenuButtons() {
  if (menuBtn && !menuBtn.__owBound) {
    menuBtn.__owBound = true;
    menuBtn.addEventListener('click', () => {
      menuModal.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  }
  if (menuClose && !menuClose.__owBound) {
    menuClose.__owBound = true;
    menuClose.addEventListener('click', () => {
      menuModal.classList.remove('open');
      document.body.style.overflow = '';
    });
  }
}
bindMenuButtons();

// ── FOOTER EMAIL SIGNUP ──
// This is a real Shopify customer form (sections/ow-footer.liquid), so the
// submit must NOT be intercepted -- an earlier version called preventDefault()
// and showed the success toast without ever subscribing anyone.
//
// Flow instead: the browser validates and submits natively, Shopify round-trips
// the page, and the Liquid renders .email-toast with .show when
// form.posted_successfully? is true. All this needs to do is dismiss it.
const emailToast = document.getElementById('emailToast');
const emailToastBackdrop = document.getElementById('emailToastBackdrop');
let emailToastTimer;

function dismissEmailToastLater() {
  clearTimeout(emailToastTimer);
  emailToastTimer = setTimeout(() => {
    emailToast.classList.remove('show');
    if (emailToastBackdrop) emailToastBackdrop.classList.remove('show');
  }, 3500);
}

if (emailToast && emailToast.classList.contains('show')) {
  if (emailToastBackdrop) emailToastBackdrop.classList.add('show');
  dismissEmailToastLater();
}

// ── MOBILE MENU: single source of truth ──
// The mobile modal's nav list is generated from the desktop navbar's
// .navbar-links at runtime, so there is exactly one place menu items
// are authored (the desktop navbar markup) — editing it updates both.
// A named, re-callable function (not the one-time IIFE it used to be):
// refreshHeaderChrome() below re-runs it after ow-header.liquid reloads in
// the theme editor, since the rebuilt #navbar/.navbar-links it reads are
// fresh nodes at that point. Queries by id/class fresh each call, so it
// doesn't depend on the topChrome/navbar/menuModal bindings above.
function buildMobileMenu() {
  const source = document.querySelector('#navbar .navbar-links');
  const target = document.querySelector('#menuModal .menu-nav');
  if (!source || !target) return;
  target.innerHTML = '';

  source.querySelectorAll(':scope > li').forEach(li => {
    const dropdown = li.querySelector('.navbar-dropdown');

    if (dropdown) {
      const toggleLink = li.querySelector('.navbar-link-toggle');
      const label = (toggleLink ? toggleLink.textContent : li.textContent).trim();

      const group = document.createElement('div');
      group.className = 'menu-nav-item-group';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'menu-nav-item menu-nav-item--discover';
      btn.setAttribute('aria-expanded', 'false');
      btn.innerHTML = label +
        ' <span class="menu-discover-arrow"><img src="https://www.figma.com/api/mcp/asset/efb98fbc-5c69-4a0c-bdfd-233a714781d5.svg" alt=""></span>';

      const sublist = document.createElement('div');
      sublist.className = 'menu-discover-sublist';
      dropdown.querySelectorAll('a').forEach(a => {
        sublist.appendChild(a.cloneNode(true));
      });

      btn.addEventListener('click', () => {
        const isOpen = group.classList.toggle('expanded');
        btn.setAttribute('aria-expanded', String(isOpen));
      });

      group.appendChild(btn);
      group.appendChild(sublist);
      target.appendChild(group);
    } else {
      const link = li.querySelector('a');
      if (!link) return;
      const a = document.createElement('a');
      a.className = 'menu-nav-item';
      a.href = link.getAttribute('href') || '#';
      a.textContent = link.textContent.trim();
      target.appendChild(a);
    }
  });

  // Close the modal on any real navigation link (not the Discover toggle).
  target.querySelectorAll('a.menu-nav-item, .menu-discover-sublist a').forEach(a => {
    a.addEventListener('click', () => {
      menuModal.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
}
buildMobileMenu();

// ── SCROLL FADE-UPS ──
// .fade-up is opacity:0 until this observer adds .visible, so anything it does
// not observe stays invisible forever.
const fadeObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if(e.isIntersecting) { e.target.classList.add('visible'); fadeObs.unobserve(e.target); }
  });
}, {threshold:.12});

function observeFadeUps(root) {
  const scope = root || document;
  if (scope.classList && scope.classList.contains('fade-up') && !scope.classList.contains('visible')) {
    fadeObs.observe(scope);
  }
  scope.querySelectorAll('.fade-up:not(.visible)').forEach(el => fadeObs.observe(el));
}

observeFadeUps();

// The theme editor re-renders a section through the Section Rendering API every
// time it is edited, swapping in DOM nodes this observer has never seen. Without
// re-scanning, those nodes keep opacity:0 and the section looks like its heading
// has vanished -- while unanimated siblings (product cards) still show.
document.addEventListener('shopify:section:load', (e) => observeFadeUps(e.target));

// ── FOOTER NAV ACCORDION (mobile) ──
function toggleFooterNav(head) {
  if(window.innerWidth >= 800) return;
  const links = head.nextElementSibling;
  links.classList.toggle('open');
  head.classList.toggle('open');
  head.setAttribute('aria-expanded', links.classList.contains('open') ? 'true' : 'false');
}

// The accordion only exists below 800px — above it, CSS shows every link list
// unconditionally and toggleFooterNav bails out. A button left reporting
// aria-expanded="false" next to visible links would lie to a screen reader, so
// the flag is recomputed from what is actually on screen: true on desktop
// always, and on mobile whatever the .open class currently says.
function syncFooterNavExpanded() {
  const desktop = window.innerWidth >= 800;
  document.querySelectorAll('.footer-nav-section-head').forEach(head => {
    const links = head.nextElementSibling;
    const open = desktop || (links && links.classList.contains('open'));
    head.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
}

document.addEventListener('DOMContentLoaded', syncFooterNavExpanded);
window.addEventListener('resize', syncFooterNavExpanded);

// ── REGION / LANGUAGE / CURRENCY SELECTOR ──
// Two instances (navbar + mobile menu), both click-to-toggle .expanded now —
// desktop used to open on :hover/:focus-within, which doesn't fire reliably
// on touch/tablet (no real hover state), so it's the same mechanism as the
// mobile menu's own Discover accordion for both. This handles: opening
// (click the trigger), re-syncing selection from the hidden inputs on open
// so an abandoned pick doesn't stick, selecting a row (pending), and Save
// (copy into hidden inputs + submit).
//
// A named, re-callable function (scoped to `scope`, like bootBrewDrag
// elsewhere in this file) rather than a one-time forEach: refreshHeaderChrome
// below calls it again after ow-header.liquid reloads in the theme editor,
// against whatever fresh .navbar-region elements that reload produced.
// __owBound guards each element so a re-call never double-binds one it
// already bound.
function bindRegionSelectors(scope) {
  (scope || document).querySelectorAll('.navbar-region').forEach(regionEl => {
  if (regionEl.__owBound) return;
  regionEl.__owBound = true;
  const form = regionEl.querySelector('form.navbar-region-form');
  const trigger = regionEl.querySelector('.navbar-lang');
  if (!form || !trigger) return;

  const countryInput = form.querySelector('[name="country_code"]');
  const localeInput = form.querySelector('[name="locale_code"]');
  const flagEl = regionEl.querySelector('.navbar-region-flag');
  const labelEl = regionEl.querySelector('.navbar-region-label');
  const countryOptions = regionEl.querySelectorAll('.navbar-region-option[data-country]');
  const localeOptions = regionEl.querySelectorAll('.navbar-region-option[data-locale]');
  const countrySection = regionEl.querySelector('[data-region-field="country"]');
  const langSection = regionEl.querySelector('[data-region-field="language"]');

  function selectInList(options, clicked) {
    options.forEach(o => {
      const on = o === clicked;
      o.setAttribute('aria-selected', on ? 'true' : 'false');
      o.classList.toggle('navbar-region-option--selected', on);
    });
  }

  // Each section (Country, Language) is its own mini-accordion, closed by
  // default -- opening one closes the other, matching the design file's
  // own toggleMRegion/toggleMLang (each resets the other's open state).
  function setSectionOpen(section, open) {
    if (!section) return;
    const head = section.querySelector('.navbar-region-section-head');
    const list = section.querySelector('.navbar-region-options');
    if (head) head.setAttribute('aria-expanded', String(open));
    if (list) list.hidden = !open;
  }

  function toggleSection(section) {
    const isOpen = section.querySelector('.navbar-region-section-head').getAttribute('aria-expanded') === 'true';
    setSectionOpen(countrySection, false);
    setSectionOpen(langSection, false);
    if (!isOpen) setSectionOpen(section, true);
  }

  // Both heads are always bound, unconditionally -- the language one just
  // no-ops while is-single (checked at click time, not by adding/removing
  // the listener), so filterLanguagesForCountry below only ever has to
  // flip a class and an attribute, never rewire event listeners.
  [countrySection, langSection].forEach(section => {
    if (!section) return;
    const head = section.querySelector('.navbar-region-section-head');
    if (!head) return;
    head.addEventListener('click', () => {
      if (section.classList.contains('is-single')) return;
      toggleSection(section);
    });
  });

  // Filters the language list down to whichever the (pending, not yet
  // saved) selected country's own market actually publishes -- data-langs
  // on each country option comes from country.available_languages in
  // ow-region-selector.liquid. Flips is-single live: a country with only
  // one language gets no chevron and can't be opened, matching the design
  // file's singleLang/multiLang branches, but re-evaluated per selection
  // instead of fixed at page load.
  function filterLanguagesForCountry(countryOption) {
    if (!langSection) return;
    const langs = (countryOption.dataset.langs || '').split(',').filter(Boolean);
    let visibleCount = 0;
    let firstVisible = null;
    let selectedStillVisible = false;
    localeOptions.forEach(o => {
      const ok = langs.length === 0 || langs.indexOf(o.dataset.locale) > -1;
      o.hidden = !ok;
      if (ok) {
        visibleCount++;
        if (!firstVisible) firstVisible = o;
        if (o.getAttribute('aria-selected') === 'true') selectedStillVisible = true;
      }
    });

    // The previously selected language isn't offered by the new country --
    // fall back to the first one it does offer, same correction the design
    // file's own country pick() makes.
    if (!selectedStillVisible && firstVisible) selectInList(localeOptions, firstVisible);

    const head = langSection.querySelector('.navbar-region-section-head');
    const isSingle = visibleCount <= 1;
    langSection.classList.toggle('is-single', isSingle);
    if (head) {
      if (isSingle) {
        head.setAttribute('tabindex', '-1');
        setSectionOpen(langSection, false);
      } else {
        head.removeAttribute('tabindex');
      }
    }
    updateSectionCurrent(langSection);
  }

  // Refreshes a section's compact "current value" line (flag + name, or
  // just the language name) from whichever option is presently selected --
  // called after every pick, so the collapsed head never shows a stale
  // value once its list closes back up.
  function updateSectionCurrent(section) {
    if (!section) return;
    const currentEl = section.querySelector('.navbar-region-section-current');
    if (!currentEl) return;
    if (section === countrySection) {
      const picked = regionEl.querySelector('.navbar-region-option[data-country][aria-selected="true"]');
      if (picked) currentEl.innerHTML = '<span class="fi ' + picked.dataset.flag + '"></span>' + picked.dataset.countryName;
    } else if (section === langSection) {
      const picked = regionEl.querySelector('.navbar-region-option[data-locale][aria-selected="true"]');
      if (picked) currentEl.textContent = picked.dataset.langName;
    }
  }

  function syncFromInputs() {
    const country = countryInput && countryInput.value;
    const locale = localeInput && localeInput.value;
    if (country && countryOptions.length) {
      countryOptions.forEach(o => {
        const on = o.dataset.country === country;
        o.setAttribute('aria-selected', on ? 'true' : 'false');
        o.classList.toggle('navbar-region-option--selected', on);
      });
    }
    if (locale && localeOptions.length) {
      localeOptions.forEach(o => {
        const on = o.dataset.locale === locale;
        o.setAttribute('aria-selected', on ? 'true' : 'false');
        o.classList.toggle('navbar-region-option--selected', on);
      });
    }
    // Reopening always starts from both sections closed and the language
    // list re-filtered for whatever country is actually saved right now --
    // abandoning an unsaved pending pick shouldn't leave stale state behind.
    setSectionOpen(countrySection, false);
    setSectionOpen(langSection, false);
    const savedCountryOption = regionEl.querySelector('.navbar-region-option[data-country][aria-selected="true"]');
    if (savedCountryOption) filterLanguagesForCountry(savedCountryOption);
    updateSectionCurrent(countrySection);
    updateSectionCurrent(langSection);
  }

  function setExpanded(open) {
    regionEl.classList.toggle('expanded', open);
    trigger.setAttribute('aria-expanded', String(open));
    if (open) syncFromInputs();
  }

  countryOptions.forEach(option => {
    option.addEventListener('click', () => {
      selectInList(countryOptions, option);
      updateSectionCurrent(countrySection);
      filterLanguagesForCountry(option);
      setSectionOpen(countrySection, false);
    });
  });
  localeOptions.forEach(option => {
    option.addEventListener('click', () => {
      selectInList(localeOptions, option);
      updateSectionCurrent(langSection);
      setSectionOpen(langSection, false);
    });
  });

  trigger.addEventListener('click', () => {
    setExpanded(!regionEl.classList.contains('expanded'));
  });

  // Floating desktop popover needs an explicit close; the inline mobile
  // accordion lives inside the already-dismissable full-screen menu and
  // doesn't, so this is scoped to the non-inline variant only.
  if (!regionEl.classList.contains('navbar-region--inline')) {
    document.addEventListener('click', (e) => {
      if (regionEl.classList.contains('expanded') && !regionEl.contains(e.target)) setExpanded(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && regionEl.classList.contains('expanded')) setExpanded(false);
    });
  }

  form.addEventListener('submit', () => {
    const countryOpt = regionEl.querySelector('.navbar-region-option[data-country][aria-selected="true"]');
    const localeOpt = regionEl.querySelector('.navbar-region-option[data-locale][aria-selected="true"]');

    if (countryOpt && countryInput) {
      countryInput.value = countryOpt.dataset.country;
      if (flagEl && countryOpt.dataset.flag) {
        flagEl.className = 'fi ' + countryOpt.dataset.flag + ' navbar-region-flag';
      }
      if (labelEl && countryOpt.dataset.label) {
        let label = countryOpt.dataset.label;
        if (localeOpt && localeOpt.dataset.langShort) {
          label += ' · ' + localeOpt.dataset.langShort;
        }
        labelEl.textContent = label;
      }
    }
    if (localeOpt && localeInput) {
      localeInput.value = localeOpt.dataset.locale;
    }
    // Native submit continues; page reloads on Shopify's response.
  });
  });
}
bindRegionSelectors();

// Re-binds everything ow-header.liquid renders (navbar visibility, the menu
// button/modal, the mobile nav list, the region selectors) after the theme
// editor's live preview reloads that section. Without this the freshly
// rendered navbar stayed invisible, the hamburger stopped opening, and the
// region selector stopped responding -- all pointing at DOM this script
// bound before the reload, now detached -- until a full page reload (Save).
function refreshHeaderChrome() {
  const nextTopChrome = document.getElementById('top-chrome');
  const nextNavbar = document.getElementById('navbar');
  if (nextTopChrome && nextNavbar && (nextTopChrome !== topChrome || nextNavbar !== navbar)) {
    // Read the outgoing node's own .visible state before swapping the
    // reference -- this reflects whatever scroll direction or hero position
    // last decided, not just whether we're past the hero, so a navbar
    // legitimately hidden by a downward scroll doesn't pop back open here.
    const wasVisible = navbar ? navbar.classList.contains('visible') : pastHero;
    if (chromeResizeObserver && topChrome) chromeResizeObserver.unobserve(topChrome);
    topChrome = nextTopChrome;
    navbar = nextNavbar;
    if (chromeResizeObserver) chromeResizeObserver.observe(topChrome);
    // Restore that state onto the fresh node, which otherwise starts from
    // its default hidden CSS state (opacity:0, translateY(-100%)).
    setNavbarVisible(wasVisible);
  }

  menuBtn = document.getElementById('menuBtn');
  menuModal = document.getElementById('menuModal');
  menuClose = document.getElementById('menuClose');
  bindMenuButtons();

  buildMobileMenu();
  bindRegionSelectors();
}

document.addEventListener('shopify:section:load', () => {
  refreshVendorBars();
  refreshHeaderChrome();
});

/* ow-chrome.js -- site chrome behaviour: launch countdown, navbar reveal,
   menu modal, mobile menu, footer email signup, footer nav accordion,
   region/language selector, and the site-wide .fade-up scroll reveal.

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

// ── FIXED TOP CHROME + NAVBAR REVEAL ──
const topChrome = document.getElementById('top-chrome');
const navbar    = document.getElementById('navbar');
// The element the navbar hides behind until it has scrolled clear. The landing
// page has #hero; any other page opts in by naming its own through
// data-navbar-reveal-target, which ow-header.liquid emits only on product
// templates. Everything downstream still just reads `hero`, so the reveal
// observers below did not have to change shape.
const revealTarget = topChrome.dataset.navbarRevealTarget;
const hero = document.getElementById('hero')
  || (revealTarget ? document.querySelector(revealTarget) : null);

function getAnnBarHeight() {
  // Sum the height of the fixed announcement bars.
  let h = 0;
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
  let h = 0;
  topChrome.querySelectorAll('.ann-bar').forEach(el => { h += el.getBoundingClientRect().height; });
  if (navbar.classList.contains('visible')) { h += navbar.getBoundingClientRect().height; }
  return Math.ceil(h);
}

function applyChrome() {
  document.body.style.paddingTop = getAnnBarHeight() + 'px';
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
if ('ResizeObserver' in window) {
  new ResizeObserver(applyChrome).observe(topChrome);
}

// Fade the navbar in once the hero has fully left the viewport, and fade it
// back out when the hero returns. The navbar ships hidden, so at the top of the
// landing page there is no navbar at all -- the hero owns the whole viewport.
//
// Only the landing page has a #hero. Everywhere else there is nothing to scroll
// past, so the navbar is shown from first paint, with --no-reveal to skip the
// slide-in transition. Guarding here matters more than it looks: this is one
// classic script, so an exception on .observe(null) would kill every handler
// declared below it (menu modal, email form, mobile menu, region selector).
//
// The reveal and the un-reveal deliberately use DIFFERENT thresholds. A single
// observer flips both ways at the same pixel, so parking the scroll exactly on
// the hero's bottom edge and nudging the wheel replays the 380ms transition over
// and over. Splitting them leaves a dead band -- between the two edges neither
// observer fires and the navbar simply holds its current state.
const REVEAL_HYSTERESIS = 120;
if (hero) {
  // Reveal once the hero is entirely above the viewport.
  new IntersectionObserver(
    ([e]) => {
      if (!e.isIntersecting) { setNavbarVisible(true); }
    },
    { threshold: 0 }
  ).observe(hero);

  // Un-reveal only after REVEAL_HYSTERESIS px of hero has scrolled back into
  // view. A negative top rootMargin shrinks the observer's root box down from
  // the top of the viewport, which is what moves this edge below the first one.
  new IntersectionObserver(
    ([e]) => {
      if (e.isIntersecting) { setNavbarVisible(false); }
    },
    { threshold: 0, rootMargin: '-' + REVEAL_HYSTERESIS + 'px 0px 0px 0px' }
  ).observe(hero);
} else {
  // No hero and no named target: nothing to scroll past, so the navbar is shown
  // from first paint. --no-reveal goes on first so it skips the slide-in.
  navbar.classList.add('navbar--no-reveal');
  setNavbarVisible(true);
}

// ── MENU MODAL ──
const menuBtn   = document.getElementById('menuBtn');
const menuModal = document.getElementById('menuModal');
const menuClose = document.getElementById('menuClose');
menuBtn.addEventListener('click', () => {
  menuModal.classList.add('open');
  document.body.style.overflow = 'hidden';
});
menuClose.addEventListener('click', () => {
  menuModal.classList.remove('open');
  document.body.style.overflow = '';
});

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
(function buildMobileMenu() {
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
})();

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

// ── SITE PREFERENCES DIALOG (region/language) ──
// snippets/ow-region-selector.liquid renders two instances: the navbar
// trigger + <dialog> (desktop) and a plain inline pair of <select>s inside
// #menuModal (mobile, inline: true — no trigger, no <dialog>, this block
// skips it entirely since regionEl.querySelector('dialog') is null there).
//
// The dialog itself needs no open-state class or outside-click detection —
// <dialog>.showModal() supplies a real ::backdrop, native focus trapping, and
// Escape-to-close for free. What is NOT free and has to be wired here:
// opening it from the trigger button, and resetting the two <select>s to
// whatever they were on open when the shopper cancels rather than saves —
// otherwise a cancelled choice would still show in the control the next time
// it opens, despite never having been submitted.
document.querySelectorAll('.navbar-region').forEach(regionEl => {
  const trigger = regionEl.querySelector('[data-region-trigger]');
  const dialog = regionEl.querySelector('dialog.region-panel');
  if (!trigger || !dialog) return;

  const selects = dialog.querySelectorAll('select');
  let snapshot = [];

  function open() {
    snapshot = Array.from(selects).map(s => s.value);
    trigger.setAttribute('aria-expanded', 'true');
    dialog.showModal();
  }

  function closeAndReset() {
    selects.forEach((s, i) => { s.value = snapshot[i]; });
    trigger.setAttribute('aria-expanded', 'false');
    dialog.close();
    trigger.focus();
  }

  trigger.addEventListener('click', open);

  dialog.querySelectorAll('[data-region-close]').forEach(btn => {
    btn.addEventListener('click', closeAndReset);
  });

  // Native <dialog> fires 'cancel' on Escape before 'close' fires on any
  // dismissal path — reset once here covers Escape, the X and Cancel buttons
  // (both call closeAndReset directly above, so this runs twice for those,
  // which is harmless: resetting an already-reset value is a no-op) and any
  // future dismissal path added later without needing a matching reset call.
  dialog.addEventListener('cancel', () => {
    selects.forEach((s, i) => { s.value = snapshot[i]; });
    trigger.setAttribute('aria-expanded', 'false');
  });

  // Backdrop click. <dialog> has no built-in light-dismiss — a click lands on
  // the dialog element itself only when it hits the ::backdrop, since the
  // visible panel content is sized to its own box, not the full viewport.
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) closeAndReset();
  });

  // Submitting (Save) navigates the page away immediately, so nothing further
  // needs to run on that path — the dialog and its state stop existing along
  // with the rest of the document.
});

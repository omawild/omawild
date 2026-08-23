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
const hero      = document.getElementById('hero');

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

function applyBodyPadding() {
  const h = getAnnBarHeight();
  document.body.style.paddingTop = h + 'px';
  // Publish the chrome's height so anything that has to dock *below* the fixed
  // bars can find their bottom edge from CSS alone. Every recalculation route
  // below (resize, fonts.ready, the ResizeObserver on #top-chrome) runs through
  // here, so the value can never go stale. Today's only consumer is the vendor
  // scrollspy nav -- see the override at the foot of ow-chrome.css.
  document.documentElement.style.setProperty('--ow-chrome-h', h + 'px');
}

applyBodyPadding();
window.addEventListener('resize', applyBodyPadding);
// Recalculate after fonts load to avoid 1px gap
document.fonts.ready.then(applyBodyPadding);
// Recalculate any time the announcement bars actually change size
// (font swap, text reflow, orientation change, etc.) so the gap can never
// reappear after first paint.
if ('ResizeObserver' in window) {
  new ResizeObserver(applyBodyPadding).observe(topChrome);
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
      if (!e.isIntersecting) { navbar.classList.add('visible'); }
    },
    { threshold: 0 }
  ).observe(hero);

  // Un-reveal only after REVEAL_HYSTERESIS px of hero has scrolled back into
  // view. A negative top rootMargin shrinks the observer's root box down from
  // the top of the viewport, which is what moves this edge below the first one.
  new IntersectionObserver(
    ([e]) => {
      if (e.isIntersecting) { navbar.classList.remove('visible'); }
    },
    { threshold: 0, rootMargin: '-' + REVEAL_HYSTERESIS + 'px 0px 0px 0px' }
  ).observe(hero);
} else {
  navbar.classList.add('visible', 'navbar--no-reveal');
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

// ── REGION / LANGUAGE / CURRENCY SELECTOR ──
// Two instances on the page (navbar, mobile menu modal) — each wired up
// independently by class rather than id. Open/close is handled by CSS
// for the navbar instance (:hover /
// :focus-within, same mechanism as the Discover dropdown) so there is no
// JS-managed open state that can get stuck across a navbar hide/show
// scroll cycle. This listener only handles selecting an option.
document.querySelectorAll('.navbar-region').forEach(regionEl => {
  const flagEl = regionEl.querySelector('.navbar-region-flag');
  const labelEl = regionEl.querySelector('.navbar-region-label');

  // The first row is the current country, rendered inert (aria-disabled, no
  // data-country). Selecting it would be a no-op reload, so it gets no
  // listener at all — the [data-country] filter does that on its own.
  regionEl.querySelectorAll('.navbar-region-option[data-country]').forEach(option => {
    option.addEventListener('click', () => {
      regionEl.querySelectorAll('.navbar-region-option').forEach(o => o.setAttribute('aria-selected', 'false'));
      option.setAttribute('aria-selected', 'true');
      flagEl.className = 'fi ' + option.dataset.flag + ' navbar-region-flag';
      labelEl.textContent = option.dataset.label;
      regionEl.querySelector('.navbar-lang').blur();
      regionEl.classList.remove('expanded');

      // Actually switch market. The option carries the ISO country code from
      // snippets/ow-region-selector.liquid; submitting Shopify's localization
      // form reloads the page in that country. locale_code is left at whatever
      // the snippet rendered, so the shopper's language survives the switch —
      // this selector deliberately does not offer a language choice. The
      // cosmetic updates above run first so the control does not appear frozen
      // during the reload. Without the form (selector rendered outside Shopify
      // data) this is a no-op and the control stays cosmetic.
      const form = regionEl.querySelector('form.navbar-region-form');
      if (form) {
        form.querySelector('[name="country_code"]').value = option.dataset.country;
        form.submit();
      }
    });
  });
});

// Inline variant (mobile menu modal) is click-to-toggle, not
// hover-driven — same accordion mechanism as the Discover group above.
document.querySelectorAll('.navbar-region--inline').forEach(regionEl => {
  const toggle = regionEl.querySelector('.navbar-lang');
  toggle.addEventListener('click', () => {
    const isOpen = regionEl.classList.toggle('expanded');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });
});

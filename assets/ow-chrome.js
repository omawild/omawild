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
  // Sum height of all visible ann-bars inside top-chrome, plus the
  // navbar itself if it's currently visible (on pages where the navbar
  // is shown immediately rather than revealed on scroll, it occupies
  // real space and body padding needs to account for it too).
  let h = 0;
  topChrome.querySelectorAll('.ann-bar').forEach(el => { h += el.getBoundingClientRect().height; });
  const visibleNavbar = topChrome.querySelector('.navbar.visible');
  if (visibleNavbar) { h += visibleNavbar.getBoundingClientRect().height; }
  // Round up so we always over-cover by a fraction of a px rather than
  // under-cover and reveal a sliver of the body background.
  return Math.ceil(h);
}

function applyBodyPadding() {
  // Body needs padding = ann bars only (navbar slides in on top, doesn't push content)
  document.body.style.paddingTop = getAnnBarHeight() + 'px';
}

function updateNavbarTop() {
  // Navbar position is relative inside top-chrome, so it auto-stacks below bars
  // Nothing needed here — CSS handles it
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

// Show navbar once hero bottom passes the top of the viewport.
// Only the landing page has a #hero. Everywhere else there is nothing to scroll
// past, so the navbar is shown immediately -- which is the case getAnnBarHeight()
// above already accounts for. Guarding here matters more than it looks: this is
// one classic script, so an exception on .observe(null) would kill every handler
// declared below it (menu modal, email form, mobile menu, region selector).
if (hero) {
  new IntersectionObserver(
    ([e]) => {
      navbar.classList.toggle('visible', !e.isIntersecting);
    },
    { threshold: 0, rootMargin: '0px 0px 0px 0px' }
  ).observe(hero);
} else {
  navbar.classList.add('visible');
  applyBodyPadding();
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
}

// ── REGION / LANGUAGE / CURRENCY SELECTOR ──
// There are now three instances on the page (navbar, footer desktop
// corner, footer mobile row) — each wired up independently by class
// rather than id. Open/close is handled entirely by CSS (:hover /
// :focus-within, same mechanism as the Discover dropdown) so there is no
// JS-managed open state that can get stuck across a navbar hide/show
// scroll cycle. This listener only handles selecting an option.
document.querySelectorAll('.navbar-region').forEach(regionEl => {
  const flagEl = regionEl.querySelector('.navbar-region-flag');
  const labelEl = regionEl.querySelector('.navbar-region-label');

  regionEl.querySelectorAll('.navbar-region-option').forEach(option => {
    option.addEventListener('click', () => {
      regionEl.querySelectorAll('.navbar-region-option').forEach(o => o.setAttribute('aria-selected', 'false'));
      option.setAttribute('aria-selected', 'true');
      flagEl.className = 'fi ' + option.dataset.flag + ' navbar-region-flag';
      labelEl.textContent = option.dataset.label;
      regionEl.querySelector('.navbar-lang').blur();
      regionEl.classList.remove('expanded');

      // Actually switch market/language. The option carries the ISO codes from
      // snippets/ow-region-selector.liquid; submitting Shopify's localization
      // form reloads the page in that country and locale. The cosmetic updates
      // above still run first so the control does not appear frozen during the
      // reload. If the markup is not inside a localization form (i.e. the
      // selector was rendered without Shopify data), this is a no-op and the
      // selector stays cosmetic.
      const form = regionEl.querySelector('form.navbar-region-form');
      if (form && option.dataset.country && option.dataset.locale) {
        form.querySelector('[name="country_code"]').value = option.dataset.country;
        form.querySelector('[name="locale_code"]').value = option.dataset.locale;
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

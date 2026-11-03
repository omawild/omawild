/**
 * oma-vision — gate helpers + section init.
 * Loaded as type=module from sections/oma-vision.liquid.
 * Pure helpers are imported by harness/oma-vision/gate.test.mjs.
 */

export const BASE_CAMP_DIGEST =
  'c583bde67aa71c3ae2ef8d37d3f3f65879a70994284e4b4fa5747ff209ac3c59';

export const STORAGE = {
  boarded: 'ow-vision2-boarded',
  guest: 'ow-vision-guest',
  inner: 'ow-vision2-inner'
};

/** @param {() => Storage | null | undefined} factory */
export function safeStorage(factory) {
  try {
    const s = typeof factory === 'function' ? factory() : factory;
    if (!s || typeof s.getItem !== 'function') return null;
    s.getItem(STORAGE.boarded);
    return s;
  } catch (_) {
    return null;
  }
}

export function normalizeCode(raw) {
  return String(raw ?? '').trim().toUpperCase();
}

export async function sha256Hex(text) {
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj?.subtle) {
    throw new Error('Web Crypto subtle digest unavailable');
  }
  const buf = await cryptoObj.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(String(text))
  );
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function isBaseCampCode(raw) {
  const digest = await sha256Hex(normalizeCode(raw));
  return digest === BASE_CAMP_DIGEST;
}

export function readGateState(storage, { designMode = false } = {}) {
  if (designMode) {
    return { boarded: true, guest: '', inner: true };
  }
  try {
    const boarded = storage?.getItem?.(STORAGE.boarded) === '1';
    const guest = storage?.getItem?.(STORAGE.guest) || '';
    const inner = storage?.getItem?.(STORAGE.inner) === '1';
    return { boarded, guest, inner };
  } catch (_) {
    return { boarded: false, guest: '', inner: false };
  }
}

export function buildHelpMailto({
  to,
  subjectPrefix,
  name,
  email,
  picks = [],
  note = ''
} = {}) {
  const safeTo = String(to || '').trim() || 'hello@omawild.com';
  const guest = String(name || '').trim();
  const subject = `${subjectPrefix || 'Expedition'}: ${guest || 'new crew'}`;
  const lines = [
    'Name: ' + guest,
    'Email: ' + String(email || '').trim(),
    '',
    'I can help with:',
    ...picks.map((p) => '- ' + p),
    '',
    String(note || '')
  ];
  return (
    'mailto:' +
    safeTo +
    '?subject=' +
    encodeURIComponent(subject) +
    '&body=' +
    encodeURIComponent(lines.join('\n'))
  );
}

const BOARD_ERR = "Tell us who's boarding.";
const INNER_ERR = 'Not a base camp code. Ask us for one.';

function isDesignMode() {
  return !!(globalThis.Shopify && Shopify.designMode);
}

function syncGuestPill(root, guest) {
  const pill = root.querySelector('[data-guest-pill]');
  const nameEl = root.querySelector('[data-guest-name]');
  if (!pill || !nameEl) return;
  const g = String(guest || '').trim();
  if (!g) {
    pill.hidden = true;
    nameEl.textContent = '';
    return;
  }
  nameEl.textContent = g.toUpperCase();
  pill.hidden = false;
}

function applyChrome(root) {
  const minimal = root.getAttribute('data-chrome') === 'minimal';
  document.body.classList.toggle('oma-vision-minimal', minimal);
}

export function initOmaVision(root, storage) {
  if (!root || root.dataset.omaVisionReady === '1') return;
  root.dataset.omaVisionReady = '1';

  const store = storage === undefined
    ? safeStorage(() => globalThis.sessionStorage)
    : storage;

  // Liquid sets data-boarded/inner true when request.design_mode.
  // Shopify.designMode covers editor section reloads.
  const designMode = isDesignMode();
  const state = readGateState(store, { designMode });
  let boarded = designMode || state.boarded || root.getAttribute('data-boarded') === 'true';
  let inner = designMode || state.inner || root.getAttribute('data-inner') === 'true';
  let guest = state.guest;

  root.setAttribute('data-boarded', boarded ? 'true' : 'false');
  root.setAttribute('data-inner', inner ? 'true' : 'false');
  syncGuestPill(root, guest);
  applyChrome(root);

  const boardForm = root.querySelector('[data-vision-board]');
  const boardMsg = root.querySelector('[data-vision-board-msg]');
  const nameField = root.querySelector('[data-vision-name-field]');
  const nameInput = root.querySelector('[data-vision-name]');

  boardForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = String(nameInput?.value || '').trim();
    if (!name) {
      if (boardMsg) {
        boardMsg.hidden = false;
        boardMsg.textContent = BOARD_ERR;
      }
      nameField?.classList.add('oma-vision__field--err');
      return;
    }
    nameField?.classList.remove('oma-vision__field--err');
    if (boardMsg) {
      boardMsg.hidden = true;
      boardMsg.textContent = '';
    }
    try {
      store?.setItem?.(STORAGE.boarded, '1');
      store?.setItem?.(STORAGE.guest, name);
    } catch (_) { /* private mode */ }
    guest = name;
    root.setAttribute('data-boarded', 'true');
    syncGuestPill(root, guest);
    const askEyebrowOnBoard = root.querySelector('[data-ask-eyebrow]');
    if (askEyebrowOnBoard && guest) {
      askEyebrowOnBoard.textContent = (guest + ', this is where you come in').toUpperCase();
    }
    window.scrollTo(0, 0);
  });

  const innerForm = root.querySelector('[data-vision-inner]');
  const innerMsg = root.querySelector('[data-vision-inner-msg]');
  const codeField = root.querySelector('[data-vision-code-field]');
  const codeInput = root.querySelector('[data-vision-code]');

  innerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    let ok = false;
    try {
      ok = await isBaseCampCode(codeInput?.value || '');
    } catch (_) {
      ok = false;
    }
    if (!ok) {
      if (innerMsg) {
        innerMsg.hidden = false;
        innerMsg.textContent = INNER_ERR;
      }
      codeField?.classList.add('oma-vision__field--err');
      return;
    }
    codeField?.classList.remove('oma-vision__field--err');
    if (innerMsg) {
      innerMsg.hidden = true;
      innerMsg.textContent = '';
    }
    try {
      store?.setItem?.(STORAGE.inner, '1');
    } catch (_) { /* private mode */ }
    root.setAttribute('data-inner', 'true');
  });

  // Notes strip (wired when markup exists)
  const notes = root.querySelector('[data-vision-notes]');
  root.querySelector('[data-vision-notes-prev]')?.addEventListener('click', () => {
    notes?.scrollBy({ left: -notes.clientWidth, behavior: 'smooth' });
  });
  root.querySelector('[data-vision-notes-next]')?.addEventListener('click', () => {
    notes?.scrollBy({ left: notes.clientWidth, behavior: 'smooth' });
  });

  const askEyebrow = root.querySelector('[data-ask-eyebrow]');
  if (askEyebrow && guest) {
    askEyebrow.textContent = (guest + ', this is where you come in').toUpperCase();
  }

  const picked = new Set();
  root.querySelectorAll('[data-help-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-help-key');
      const on = btn.getAttribute('aria-pressed') === 'true';
      btn.setAttribute('aria-pressed', on ? 'false' : 'true');
      if (!key) return;
      if (on) picked.delete(key);
      else picked.add(key);
    });
  });

  const askForm = root.querySelector('[data-vision-ask]');
  const askMsg = root.querySelector('[data-vision-ask-msg]');
  const askDone = root.querySelector('[data-vision-ask-done]');
  const askEmail = root.querySelector('[data-vision-ask-email]');
  const askNote = root.querySelector('[data-vision-ask-note]');
  const helpTo = root.getAttribute('data-help-to') || 'hello@omawild.com';

  askForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const labels = [...root.querySelectorAll('[data-help-toggle][aria-pressed="true"]')].map(
      (el) => el.getAttribute('data-help-label') || ''
    ).filter(Boolean);
    const email = String(askEmail?.value || '').trim();
    if (!labels.length) {
      if (askMsg) {
        askMsg.hidden = false;
        askMsg.textContent = 'Pick at least one.';
      }
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      if (askMsg) {
        askMsg.hidden = false;
        askMsg.textContent = 'Add an email so we can reply.';
      }
      return;
    }
    if (askMsg) {
      askMsg.hidden = true;
      askMsg.textContent = '';
    }
    const url = buildHelpMailto({
      to: helpTo,
      subjectPrefix: 'Expedition',
      name: guest,
      email,
      picks: labels,
      note: askNote?.value || ''
    });
    window.location.href = url;
    askForm.hidden = true;
    if (askDone) askDone.hidden = false;
  });
}

function boot() {
  document.querySelectorAll('[data-oma-vision]').forEach((el) => initOmaVision(el));
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  document.addEventListener('shopify:section:load', (e) => {
    const root = e.target?.querySelector?.('[data-oma-vision]') || (e.target?.matches?.('[data-oma-vision]') ? e.target : null);
    if (root) {
      delete root.dataset.omaVisionReady;
      initOmaVision(root);
    }
  });
}

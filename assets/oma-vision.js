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
  const boarded = storage?.getItem?.(STORAGE.boarded) === '1';
  const guest = storage?.getItem?.(STORAGE.guest) || '';
  const inner = storage?.getItem?.(STORAGE.inner) === '1';
  return { boarded, guest, inner };
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

export function initOmaVision(root, storage = globalThis.sessionStorage) {
  if (!root || root.dataset.omaVisionReady === '1') return;
  root.dataset.omaVisionReady = '1';

  // Liquid sets data-boarded/inner true when request.design_mode.
  // Shopify.designMode covers editor section reloads.
  const designMode = isDesignMode();
  const state = readGateState(storage, { designMode });
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
      storage?.setItem?.(STORAGE.boarded, '1');
      storage?.setItem?.(STORAGE.guest, name);
    } catch (_) { /* private mode */ }
    guest = name;
    root.setAttribute('data-boarded', 'true');
    syncGuestPill(root, guest);
    window.scrollTo(0, 0);
  });

  const innerForm = root.querySelector('[data-vision-inner]');
  const innerMsg = root.querySelector('[data-vision-inner-msg]');
  const codeField = root.querySelector('[data-vision-code-field]');
  const codeInput = root.querySelector('[data-vision-code]');

  innerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ok = await isBaseCampCode(codeInput?.value || '');
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
      storage?.setItem?.(STORAGE.inner, '1');
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

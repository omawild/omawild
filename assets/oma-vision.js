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

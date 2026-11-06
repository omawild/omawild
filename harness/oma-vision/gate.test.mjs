import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCode,
  isBaseCampCode,
  BASE_CAMP_DIGEST,
  readGateState,
  STORAGE,
  buildHelpMailto
} from '../../assets/oma-vision.js';

test('normalizeCode trims and uppercases', () => {
  assert.equal(normalizeCode('  delusional '), 'DELUSIONAL');
});

test('DELUSIONAL matches BASE_CAMP_DIGEST', async () => {
  assert.equal(BASE_CAMP_DIGEST, 'c583bde67aa71c3ae2ef8d37d3f3f65879a70994284e4b4fa5747ff209ac3c59');
  assert.equal(await isBaseCampCode('delusional'), true);
  assert.equal(await isBaseCampCode('WRONG'), false);
});

test('readGateState respects session and designMode', () => {
  const mem = {
    getItem: (k) => mem[k] ?? null,
    setItem: (k, v) => { mem[k] = String(v); }
  };
  assert.deepEqual(readGateState(mem, { designMode: false }), { boarded: false, guest: '', inner: false });
  mem.setItem(STORAGE.boarded, '1');
  mem.setItem(STORAGE.guest, 'Jenny');
  assert.equal(readGateState(mem, { designMode: false }).guest, 'Jenny');
  assert.equal(readGateState(mem, { designMode: true }).boarded, true);
  assert.equal(readGateState(mem, { designMode: true }).inner, true);
});

test('buildHelpMailto encodes name picks and email', () => {
  const url = buildHelpMailto({
    to: 'hello@omawild.com',
    subjectPrefix: 'Expedition',
    name: 'Jenny',
    email: 'j@x.com',
    picks: ['Funding', 'Distribution'],
    note: 'Hi'
  });
  assert.match(url, /^mailto:hello@omawild\.com\?/);
  assert.match(url, /Jenny/);
  assert.match(url, /Funding/);
});

test('safeStorage returns null when sessionStorage throws', async () => {
  const { safeStorage } = await import('../../assets/oma-vision.js');
  const boom = {
    get getItem() { throw new Error('blocked'); },
    get setItem() { throw new Error('blocked'); }
  };
  // If implementation takes a factory, test the helper that wraps access
  assert.equal(typeof safeStorage, 'function');
  const s = safeStorage(() => { throw new Error('blocked'); });
  assert.equal(s, null);
  const ok = safeStorage(() => ({
    getItem: () => null,
    setItem: () => {}
  }));
  assert.ok(ok);
});

test('readGateState tolerates throwing storage', async () => {
  const { readGateState } = await import('../../assets/oma-vision.js');
  const boom = {
    getItem() { throw new Error('blocked'); }
  };
  assert.deepEqual(readGateState(boom, { designMode: false }), { boarded: false, guest: '', inner: false });
});

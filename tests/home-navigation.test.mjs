import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalHome,
  rememberHome,
  homeHref,
  pageFromHash,
  exerciseHref,
} from '../apps/web/src/home-navigation.js';

function browser(hash = '') {
  const entries = new Map();
  globalThis.location = { hash };
  globalThis.history = {
    state: { preserved: true },
    replaceState(state, _, next) {
      assert.deepEqual(state, { preserved: true });
      location.hash = next;
    },
  };
  globalThis.sessionStorage = {
    setItem: (k, v) => entries.set(k, v),
    getItem: (k) => entries.get(k) ?? null,
  };
  globalThis.window = new EventTarget();
  // Navigation must never read, migrate, clear or overwrite Mermaid/theme storage.
  globalThis.localStorage = new Proxy(
    {},
    {
      get() {
        throw Error('Unexpected localStorage access');
      },
    },
  );
  return entries;
}

test('root and index aliases preserve filter query and existing history state', () => {
  for (const hash of [
    '',
    '#',
    '#index',
    '#home',
    '#home-bare',
    '#home-bare?q=23&status=workaround&cat=Caching&group=category',
    '#index?q=cookie&status=partial%2Cgap&group=status',
  ]) {
    browser(hash);
    assert.equal(pageFromHash(), 'home');
    assert.equal(location.hash, canonicalHome(hash));
  }
});

test('explicit return retains catalog context across requirement navigation and reload', () => {
  browser('#home?q=23&status=workaround&cat=Caching&group=category');
  rememberHome(location.hash);
  const expected = location.hash;
  for (let n = 1; n <= 42; n++) {
    location.hash = `#r${String(n).padStart(2, '0')}`;
    assert.equal(pageFromHash(), location.hash.slice(1));
    assert.equal(homeHref(), expected);
  }
});

test('R32 cross-service URL carries only a home hash and restores it on the request UI', () => {
  browser('#home?q=cookie&status=workaround&group=category');
  const expected = location.hash;
  const url = exerciseHref({ requestUrl: 'https://request.example', surface: 'web' });
  assert.equal(new URL(url).origin, 'https://request.example');
  browser(new URL(url).hash);
  assert.equal(pageFromHash(), 'r32');
  assert.equal(homeHref(), expected);
  assert.equal(exerciseHref({ surface: 'request' }), '#r32');
});

test('local preview never sends R32 navigation to a remote service', () => {
  browser('#home?q=cookie');
  assert.equal(
    exerciseHref({ localPreview: true, requestUrl: 'https://request.example' }),
    '#r32',
  );
});

test('untrusted return targets cannot turn the home link into an external navigation', () => {
  for (const target of [
    'https://example.com',
    '//example.com',
    '#r01',
    '#home-elsewhere',
  ]) {
    browser(`#r32?home=${encodeURIComponent(target)}`);
    assert.equal(pageFromHash(), 'r32');
    assert.equal(homeHref(), '#home');
  }
});

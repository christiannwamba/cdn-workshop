import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBrowserClient } from '../apps/web/src/browser-client.js';

test('UI-only exercise cannot write cookies or send network requests', async () => {
  let state;
  const fetchBefore = globalThis.fetch;
  globalThis.fetch = () => {
    throw Error('UI preview must never fetch');
  };
  try {
    // No document exists in Node: an accidental cookie write also fails the test.
    const client = createBrowserClient({
      profile: {},
      live: false,
      onChange: (s) => (state = s),
    });
    await client.prepare();
    for (const name of ['A', 'B', 'Missing', 'Invalid']) {
      await client.choose(name);
      await client.send();
    }
    await client.refresh();
    assert.deepEqual(
      state.receipts.map((r) => r.case),
      ['A', 'B', 'Missing', 'Invalid'],
    );
    assert.ok(state.receipts.every((r) => r.preview && !r.headers));
    assert.equal(state.evidence, null);
    await client.reset();
    assert.equal(state.session, null);
    assert.equal(state.receipts.length, 0);
    client.dispose();
  } finally {
    globalThis.fetch = fetchBefore;
  }
});

test('live adapter preserves browser cookies, same URL, fresh tickets and reset scope', async () => {
  const before = {
    fetch: globalThis.fetch,
    document: globalThis.document,
    location: globalThis.location,
  };
  let state,
    cookies = [],
    contentCalls = [],
    nextSlot = 0,
    closed = false;
  globalThis.document = {
    set cookie(value) {
      cookies.push(value);
    },
  };
  globalThis.location = { origin: 'https://request.example' };
  globalThis.fetch = async (url, opts = {}) => {
    if (url === '/api/browser') {
      const input = JSON.parse(opts.body);
      if (input.op === 'prepare')
        return Response.json({
          run: 'run-test',
          capability: 'private-test-key',
          contentPath: '/demo/run-test',
          collectorUrl: 'https://collector.example',
        });
      if (input.op === 'ticket') {
        assert.equal(opts.headers.authorization, 'Bearer private-test-key');
        return Response.json({ slot: ++nextSlot, ticket: `ticket-${nextSlot}` });
      }
      if (input.op === 'close') {
        closed = true;
        return Response.json({ closed: true });
      }
    }
    if (url === '/demo/run-test') {
      contentCalls.push({ url, opts });
      return new Response('content', {
        headers: {
          'x-vercel-cache': nextSlot === 1 ? 'MISS' : 'HIT',
          'x-workshop-event-id': `event-${nextSlot}`,
          'x-workshop-fill-id': 'fill',
        },
      });
    }
    if (url.startsWith('https://collector.example/'))
      return Response.json({
        status: 'PARTIAL',
        coveredCases: nextSlot === 1 ? ['A'] : ['A', 'B'],
        origins: [{ fillId: 'fill' }],
        rows: Array.from({ length: nextSlot }, (_, i) => ({
          slot: i + 1,
          eventId: `event-${i + 1}`,
          joined: true,
        })),
      });
    throw Error(`Unexpected network path ${url}`);
  };
  try {
    const client = createBrowserClient({
      profile: {},
      live: true,
      onChange: (s) => (state = s),
    });
    await client.prepare();
    await client.choose('A');
    await client.send();
    await client.choose('B');
    await client.send();
    assert.equal(contentCalls.length, 2);
    assert.equal(contentCalls[0].url, contentCalls[1].url);
    assert.ok(
      contentCalls.every(
        (c) =>
          c.opts.credentials === 'same-origin' && !c.opts.headers.cookie && !c.opts.cache,
      ),
    );
    assert.notEqual(
      contentCalls[0].opts.headers['x-fixture-ticket'],
      contentCalls[1].opts.headers['x-fixture-ticket'],
    );
    assert.ok(
      cookies.some(
        (c) =>
          c ===
          'workshop_choice=fixture-B; Path=/demo/run-test; Max-Age=600; Secure; SameSite=Strict',
      ),
    );
    assert.equal(state.receipts.length, 2);
    assert.match(state.logMessage, /2\/2 browser responses matched/);
    await client.reset();
    assert.ok(closed);
    assert.ok(
      cookies.some(
        (c) =>
          c ===
          'workshop_choice=; Path=/demo/run-test; Max-Age=0; Secure; SameSite=Strict',
      ),
    );
    client.dispose();
  } finally {
    Object.assign(globalThis, before);
  }
});

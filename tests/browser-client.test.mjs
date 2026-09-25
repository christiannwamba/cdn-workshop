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
      await client.sendWithCookie(name);
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
    closed = false,
    evidenceIssue = null;
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
      contentCalls.push({
        url,
        opts,
        cookie: cookies.filter((c) => c.startsWith('workshop_choice=')).at(-1),
      });
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
        status: evidenceIssue === 'failure' ? 'FAIL' : 'PARTIAL',
        checks: {
          cache: true,
          origin: true,
          cookies: evidenceIssue !== 'cookie',
          join: true,
          currentRequest: true,
          nativeCookieAbsent: true,
          noUnrelatedCookie: true,
        },
        coveredCases: nextSlot === 1 ? ['A'] : ['A', 'B'],
        origins: [{ fillId: evidenceIssue === 'fill' ? 'wrong-fill' : 'fill' }],
        rows: Array.from({ length: nextSlot }, (_, i) => ({
          slot: i + 1,
          name: ['A', 'B', 'Missing', 'Invalid'][i],
          status: 'PASS',
          eventId: evidenceIssue === 'join' ? 'unmatched' : `event-${i + 1}`,
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
    assert.equal(cookies.length, 0);
    assert.equal(contentCalls.length, 0);
    assert.equal(nextSlot, 0);
    await client.sendWithCookie('A');
    assert.doesNotMatch(state.logMessage, /demonstration complete/);
    await client.sendWithCookie('B');
    assert.equal(contentCalls.length, 2);
    assert.match(contentCalls[0].cookie, /^workshop_choice=fixture-A;/);
    assert.match(contentCalls[1].cookie, /^workshop_choice=fixture-B;/);
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
    assert.match(state.logMessage, /A\/B demonstration complete/);
    assert.equal(state.evidence.status, 'PARTIAL'); // Raw fixture-suite result stays honest.
    assert.doesNotMatch(state.logMessage, /optional|four/);
    for (const issue of ['cookie', 'fill', 'join', 'failure']) {
      evidenceIssue = issue;
      await client.refresh();
      assert.doesNotMatch(state.logMessage, /demonstration complete/, issue);
    }
    evidenceIssue = null;
    await client.refresh();
    assert.match(state.logMessage, /A\/B demonstration complete/);
    await client.sendWithCookie('Missing');
    await client.sendWithCookie('Invalid');
    assert.match(contentCalls[2].cookie, /^workshop_choice=;.*Max-Age=0/);
    assert.match(contentCalls[3].cookie, /^workshop_choice=INVALID_NEVER_CAPTURE;/);
    assert.deepEqual(
      state.receipts.map((r) => r.case),
      ['A', 'B', 'Missing', 'Invalid'],
    );
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

test('combined send blocks overlapping clicks and recovers from ticket errors', async () => {
  const before = {
    fetch: globalThis.fetch,
    document: globalThis.document,
    location: globalThis.location,
  };
  let state,
    releaseTicket,
    failTicket = false,
    ticketCalls = 0,
    contentCalls = 0;
  const cookies = [];
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
          contentPath: '/demo/run-test',
          collectorUrl: 'https://collector.example',
          capability: 'test-key',
        });
      if (input.op === 'ticket') {
        ticketCalls++;
        assert.equal(state.busy, true);
        assert.match(
          cookies.filter((c) => c.startsWith('workshop_choice=')).at(-1),
          new RegExp(`^workshop_choice=fixture-${input.expected};`),
        );
        if (failTicket)
          return Response.json({ error: 'Ticket unavailable' }, { status: 503 });
        if (ticketCalls === 1)
          return new Promise((resolve) => {
            releaseTicket = () => resolve(Response.json({ slot: 1, ticket: 'one' }));
          });
        return Response.json({ slot: 2, ticket: 'two' });
      }
    }
    if (url === '/demo/run-test') {
      assert.equal(state.busy, true);
      contentCalls++;
      return new Response('content', {
        headers: {
          'x-workshop-event-id': `event-${contentCalls}`,
          'x-workshop-fill-id': 'fill',
        },
      });
    }
    if (url.startsWith('https://collector.example/'))
      return Response.json({
        status: 'PARTIAL',
        coveredCases: ['A', 'B'],
        origins: [{ fillId: 'fill' }],
        rows: Array.from({ length: contentCalls }, (_, i) => ({
          slot: i + 1,
          eventId: `event-${i + 1}`,
          joined: true,
        })),
      });
    throw Error(`Unexpected network path ${url}`);
  };
  const client = createBrowserClient({
    profile: {},
    live: true,
    onChange: (s) => {
      state = s;
    },
  });
  try {
    await client.prepare();
    const pending = client.sendWithCookie('A');
    await client.sendWithCookie('B');
    assert.equal(ticketCalls, 1);
    assert.equal(cookies.length, 2);
    assert.equal(state.selected, 'A');
    assert.equal(contentCalls, 0);
    releaseTicket();
    await pending;
    assert.equal(contentCalls, 1);
    assert.equal(state.busy, false);
    failTicket = true;
    await client.sendWithCookie('B');
    assert.equal(contentCalls, 1);
    assert.equal(state.busy, false);
    assert.match(state.message, /Ticket unavailable/);
    failTicket = false;
    await client.sendWithCookie('B');
    assert.equal(contentCalls, 2);
    assert.deepEqual(
      state.receipts.map((r) => r.case),
      ['A', 'B'],
    );
    assert.equal(state.busy, false);
  } finally {
    client.dispose();
    Object.assign(globalThis, before);
  }
});

import { correlateReceipts } from '../../request-demo/public/lab-proof.js';

const cases = {
  A: 'fixture-A',
  B: 'fixture-B',
  Missing: null,
  Invalid: 'INVALID_NEVER_CAPTURE',
};
const json = async (url, options = {}) => {
  const r = await fetch(url, { ...options, signal: AbortSignal.timeout(25000) });
  const d = await r.json();
  if (!r.ok) throw Error(`${r.status}: ${d.error || 'Request failed'}`);
  return d;
};

// Same-origin browser adapter. UI-only preview never enters the network or cookie paths.
export function createBrowserClient({ profile, live, onChange }) {
  let state = {
    session: null,
    selected: null,
    receipts: [],
    evidence: null,
    busy: false,
    message: 'Start a fresh test to begin.',
  };
  let generation = 0,
    pollTimer = null,
    waitStarted = 0,
    disposed = false;
  const update = (patch) => {
    state = { ...state, ...patch };
    if (!disposed) onChange(state);
  };
  const api = (op, extra = {}, s = state.session) =>
    json('/api/browser', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(s ? { authorization: `Bearer ${s.capability}` } : {}),
      },
      body: JSON.stringify({ op, run: s?.run, ...extra }),
    });
  function clearCookies(s) {
    if (!live || !s) return;
    for (const name of ['workshop_choice', 'workshop_unrelated'])
      document.cookie = `${name}=; Path=${s.contentPath}; Max-Age=0; Secure; SameSite=Strict`;
  }
  async function reset() {
    const old = state.session;
    generation++;
    clearTimeout(pollTimer);
    clearCookies(old);
    update({
      session: null,
      selected: null,
      receipts: [],
      evidence: null,
      logMessage: '',
      message: live
        ? 'Test cookies cleared. Start a fresh test.'
        : 'UI preview reset. Start a fresh test.',
    });
    if (live && old)
      try {
        await api('close', {}, old);
      } catch (e) {
        update({
          message: `Test cookies cleared; session closure could not be confirmed: ${e.message}`,
        });
      }
  }
  async function prepare() {
    if (state.session) await reset();
    const g = generation;
    const session = live
      ? await api('prepare')
      : { run: 'ui-preview', contentPath: '/demo/run-ui-preview' };
    if (g !== generation || disposed) return;
    update({
      session,
      selected: null,
      message: live
        ? 'Test ready. Send request with cookie A to fetch the page.'
        : 'UI preview ready. Send request with cookie A to try the sequence.',
    });
  }
  function choose(name) {
    if (!state.session || !Object.hasOwn(cases, name))
      throw Error('Start a fresh test and choose a valid cookie case.');
    if (live) {
      const attributes = `Path=${state.session.contentPath}; Max-Age=600; Secure; SameSite=Strict`;
      document.cookie =
        cases[name] === null
          ? `workshop_choice=; Path=${state.session.contentPath}; Max-Age=0; Secure; SameSite=Strict`
          : `workshop_choice=${cases[name]}; ${attributes}`;
      document.cookie = `workshop_unrelated=NEVER_CAPTURE; ${attributes}`;
    }
    update({ selected: name });
  }
  async function refresh() {
    if (!state.session) return;
    if (!live) {
      update({
        message:
          'UI preview: log refresh selected. Live verification needs the request-host deployment.',
      });
      return;
    }
    const g = generation,
      s = state.session;
    try {
      const e = await json(
        `${s.collectorUrl || profile.collectorUrl}/api/service?op=evidence&run=${s.run}`,
        { headers: { authorization: `Bearer ${s.capability}` } },
      );
      if (g !== generation || disposed) return;
      const correlation = correlateReceipts(state.receipts, e.rows);
      const accepted = state.receipts.filter((r) => r.status === 200);
      const fillMatches =
        accepted.length > 0 &&
        e.origins.length === 1 &&
        accepted.every((r) => r.headers['x-workshop-fill-id'] === e.origins[0].fillId);
      const pending = correlation.accepted > 0 && !correlation.complete;
      const waiting = e.status === 'PENDING' || pending;
      const timedOut = waiting && Date.now() - waitStarted > 120000;
      // Completion describes this A/B demonstration, not the full fixture-policy suite
      // or the customer's overall requirement coverage. Keep raw collector status intact.
      const demoComplete =
        ['PASS', 'PARTIAL'].includes(e.status) &&
        ['A', 'B'].every((name) =>
          accepted.some(
            (receipt) =>
              receipt.case === name &&
              e.rows.some(
                (row) =>
                  row.name === name &&
                  row.status === 'PASS' &&
                  row.slot === receipt.slot &&
                  row.eventId === receipt.headers['x-workshop-event-id'],
              ),
          ),
        ) &&
        correlation.complete &&
        fillMatches &&
        [
          'cache',
          'origin',
          'cookies',
          'join',
          'currentRequest',
          'nativeCookieAbsent',
          'noUnrelatedCookie',
        ].every((check) => e.checks?.[check] === true);
      let logMessage =
        e.status === 'FAIL'
          ? 'Verification failed: observed records differ from expectations.'
          : demoComplete
            ? 'A/B demonstration complete. Both requests and cookie logs verified.'
            : e.status === 'EMPTY'
              ? 'No accepted content requests yet.'
              : ['PARTIAL', 'PASS'].includes(e.status)
                ? 'Send both A and B, then check their matched log records.'
                : 'Waiting for Vercel Log Drains to deliver the request and cookie records.';
      if (pending)
        logMessage = 'Waiting for each request to match its delivered cookie log.';
      if (timedOut)
        logMessage =
          'Logs are still incomplete after two minutes. Refresh to check for late arrivals.';
      logMessage += ` ${correlation.matched}/${correlation.accepted} browser responses matched. Content fill ${fillMatches ? 'matches the one recorded origin call' : 'not yet confirmed'}.`;
      update({ evidence: e, logMessage });
      clearTimeout(pollTimer);
      if (waiting && !timedOut) pollTimer = setTimeout(refresh, 4000);
    } catch (e) {
      if (g === generation && !disposed)
        update({
          logMessage: `Logs unavailable: ${e.message}. Refresh retries the same session.`,
        });
    }
  }
  async function send() {
    const s = state.session,
      name = state.selected,
      g = generation;
    if (!s || !name) throw Error('Start a fresh test before sending a request.');
    if (!live) {
      update({
        receipts: [...state.receipts, { case: name, preview: true }],
        message: `UI preview: ${name} action complete. ${name === 'A' ? 'Continue with B.' : 'Continue to Check the logs.'}`,
      });
      return;
    }
    const ticket = await api('ticket', { expected: name });
    if (g !== generation || disposed) return;
    // This fetch runs in the visitor's browser on the request-service origin.
    const r = await fetch(s.contentPath, {
      credentials: 'same-origin',
      headers: { 'x-fixture-ticket': ticket.ticket },
      signal: AbortSignal.timeout(20000),
    });
    await r.text();
    if (g !== generation || disposed) return;
    const url = location.origin + s.contentPath,
      timing = performance.getEntriesByName(url).at(-1);
    const receipt = {
      slot: ticket.slot,
      case: name,
      url,
      method: 'GET',
      status: r.status,
      at: new Date().toISOString(),
      headers: Object.fromEntries(
        [
          'x-vercel-cache',
          'x-workshop-event-id',
          'x-workshop-fill-id',
          'cache-control',
        ].map((k) => [k, r.headers.get(k)]),
      ),
      timing: timing
        ? {
            initiatorType: timing.initiatorType,
            transferSize: timing.transferSize,
            encodedBodySize: timing.encodedBodySize,
            duration: timing.duration,
            deliveryType: timing.deliveryType || '',
          }
        : null,
    };
    update({
      receipts: [...state.receipts, receipt],
      message: r.ok
        ? `${name} sent to the same URL. Check its headers, then the logs.`
        : `Request rejected (${r.status}). Send again for a fresh ticket; reset if the session expired.`,
    });
    waitStarted = Date.now();
    await refresh();
  }
  // One busy guard covers both operations; neither calls the wrapped public actions.
  async function sendWithCookie(name) {
    choose(name);
    await send();
  }
  const action =
    (fn) =>
    async (...args) => {
      if (state.busy || disposed) return;
      update({ busy: true });
      try {
        await fn(...args);
      } catch (e) {
        update({ message: e.message });
      } finally {
        update({ busy: false });
      }
    };
  return {
    prepare: action(prepare),
    sendWithCookie: action(sendWithCookie),
    refresh: action(refresh),
    reset: action(reset),
    dispose() {
      disposed = true;
      generation++;
      clearTimeout(pollTimer);
      clearCookies(state.session);
    },
  };
}

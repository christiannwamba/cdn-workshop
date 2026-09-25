export function analyze(data) {
  const all = data.batches.flatMap((b) =>
    b.records.map((record) => ({ record, receivedAt: b.receivedAt })),
  );
  const unique = [...new Map(all.map((x) => [x.record.id, x])).values()];
  const native = unique.filter((x) => x.record.source === 'external' && x.record.proxy);
  const emissions = unique.flatMap((x) => {
    try {
      const event = JSON.parse(x.record.message);
      return event.kind === 'workshop-cookie-v1' ? [{ ...x, event }] : [];
    } catch {
      return [];
    }
  });
  const rows = (data.observations || []).map((req) => {
    const e = emissions.filter((x) => x.event.eventId === req.eventId);
    const n = native.filter((x) => x.record.proxy.referer === req.referer);
    return {
      ...req,
      nativeCount: n.length,
      emissionCount: e.length,
      nativeRequestId: n[0]?.record.requestId || null,
      envelopeRequestId: e[0]?.record.requestId || null,
      joined:
        e.length === 1 &&
        n.length === 1 &&
        !!n[0].record.requestId &&
        e[0].record.requestId === n[0].record.requestId,
      nativeCache: n[0]?.record.proxy.vercelCache || null,
      nativeUserAgent: n[0]?.record.proxy.userAgent || null,
      cookieState: e[0]?.event.cookieState || null,
      cookie: e[0]?.event.cookie ?? null,
      nativeCookieAbsent:
        n.length === 1 && n[0].record.nativeCookieFieldPresent === false,
      delayMs: n[0] ? n[0].receivedAt - n[0].record.timestamp : null,
    };
  });
  const complete = rows.length === 4 && rows.every((r) => r.joined);
  const checks = {
    cache:
      rows.length === 4 &&
      rows.every(
        (r, i) => r.cache === (i === 0 ? 'MISS' : 'HIT') && r.nativeCache === r.cache,
      ),
    origin:
      data.origins.length === 1 && rows.every((r) => r.fillId === data.origins[0].fillId),
    cookies:
      rows.length === 4 &&
      rows.every(
        (r, i) =>
          r.cookieState === (i < 2 ? 'valid' : i === 2 ? 'missing' : 'invalid') &&
          r.cookie === (i < 2 ? `fixture-${i === 0 ? 'A' : 'B'}` : null),
      ),
    join: complete,
    nativeCookieAbsent: rows.length === 4 && rows.every((r) => r.nativeCookieAbsent),
    currentMetadata:
      rows.length === 4 &&
      new Set(rows.map((r) => r.nativeRequestId)).size === 4 &&
      rows.every((r) =>
        (Array.isArray(r.nativeUserAgent)
          ? r.nativeUserAgent
          : [r.nativeUserAgent]
        ).includes(`Workshop/${r.name}`),
      ),
    noUnrelatedCookie:
      all.length > 0 && all.every((x) => x.record.excludedValuePresent === false),
  };
  return {
    status: complete
      ? Object.values(checks).every(Boolean)
        ? 'PASS'
        : 'FAIL'
      : 'PENDING',
    checks,
    rows,
    originCount: data.origins.length,
    nativeCount: native.length,
    emissionCount: emissions.length,
    duplicateRecords: all.length - unique.length,
    unmatchedEmissions: emissions.filter(
      (e) => !native.some((n) => n.record.requestId === e.record.requestId),
    ).length,
    receivedBatches: data.batches.length,
    verifiedAt: new Date().toISOString(),
  };
}

// Browser receipts and intended labels never establish a native log join.
// Consumed event IDs are generated in Middleware and registered through service authentication.
export function analyzeBrowser(data) {
  const all = data.batches.flatMap((b) =>
    b.records.map((record) => ({ record, receivedAt: b.receivedAt })),
  );
  const unique = [...new Map(all.map((x) => [x.record.id, x])).values()];
  const native = unique.filter((x) => x.record.source === 'external' && x.record.proxy);
  const emissions = unique.flatMap((x) => {
    try {
      const event = JSON.parse(x.record.message);
      return event.kind === 'workshop-cookie-v1' ? [{ ...x, event }] : [];
    } catch {
      return [];
    }
  });
  const rows = data.consumed
    .sort((a, b) => a.at - b.at || a.slot - b.slot)
    .map((step, index) => {
      const es = emissions.filter(
        (x) => x.event.eventId === step.eventId && x.event.slot === step.slot,
      );
      const ns =
        es.length === 1
          ? native.filter((x) => x.record.requestId === es[0].record.requestId)
          : [];
      const joined = es.length === 1 && ns.length === 1 && !!ns[0].record.requestId;
      const wanted = {
        A: ['valid', 'fixture-A'],
        B: ['valid', 'fixture-B'],
        Missing: ['missing', null],
        Invalid: ['invalid', null],
      }[step.expected];
      const observed = es[0]?.event;
      const cookieCorrect =
        !!observed && observed.cookieState === wanted[0] && observed.cookie === wanted[1];
      const cache = ns[0]?.record.proxy.vercelCache || null,
        expectedCache = index === 0 ? 'MISS' : 'HIT';
      const safe =
        !!ns[0] &&
        ns[0].record.nativeCookieFieldPresent === false &&
        [...ns, ...es].every((x) => x.record.excludedValuePresent === false);
      return {
        slot: step.slot,
        name: step.expected,
        eventId: step.eventId,
        at: step.at,
        expectedCache,
        nativeCache: cache,
        nativeCount: ns.length,
        emissionCount: es.length,
        joined,
        nativeRequestId: ns[0]?.record.requestId || null,
        envelopeRequestId: es[0]?.record.requestId || null,
        nativeUserAgent: ns[0]?.record.proxy.userAgent || null,
        nativeReferrer: ns[0]?.record.proxy.referer || null,
        cookieState: observed?.cookieState || null,
        cookie: observed?.cookie ?? null,
        cookieCorrect,
        status: !joined
          ? 'PENDING'
          : cookieCorrect && cache === expectedCache && safe
            ? 'PASS'
            : 'FAIL',
        delayMs: ns[0] ? ns[0].receivedAt - ns[0].record.timestamp : null,
      };
    });
  const allJoined = rows.length > 0 && rows.every((r) => r.joined),
    covered = ['A', 'B', 'Missing', 'Invalid'].every((n) =>
      rows.some((r) => r.name === n && r.status === 'PASS'),
    );
  const originCorrect = data.origins.length === 1;
  const checks = {
    cache: allJoined && rows.every((r) => r.nativeCache === r.expectedCache),
    origin: originCorrect,
    cookies: allJoined && rows.every((r) => r.cookieCorrect),
    join: allJoined,
    currentRequest:
      allJoined && new Set(rows.map((r) => r.nativeRequestId)).size === rows.length,
    nativeCookieAbsent:
      native.length > 0 &&
      native.every((x) => x.record.nativeCookieFieldPresent === false),
    noUnrelatedCookie:
      all.length > 0 && all.every((x) => x.record.excludedValuePresent === false),
  };
  const failed = rows.some((r) => r.status === 'FAIL') || data.origins.length > 1;
  return {
    mode: 'browser',
    status: failed
      ? 'FAIL'
      : !rows.length
        ? 'EMPTY'
        : !allJoined
          ? 'PENDING'
          : covered && Object.values(checks).every(Boolean)
            ? 'PASS'
            : 'PARTIAL',
    checks,
    rows,
    coveredCases: [
      ...new Set(rows.filter((r) => r.status === 'PASS').map((r) => r.name)),
    ],
    originCount: data.origins.length,
    nativeCount: native.length,
    emissionCount: emissions.length,
    duplicateRecords: all.length - unique.length,
    unmatchedEmissions: emissions.filter(
      (e) => !native.some((n) => n.record.requestId === e.record.requestId),
    ).length,
    receivedBatches: data.batches.length,
    verifiedAt: new Date().toISOString(),
  };
}

// Browser receipts are observations, not trusted event records. Require a distinct
// authenticated platform join for every successful browser fetch, including repeats.
export function correlateReceipts(receipts, rows) {
  const accepted = receipts.filter((r) => r.status === 200);
  const ids = accepted.map((r) => r.headers['x-workshop-event-id']);
  const unique = ids.every(Boolean) && new Set(ids).size === ids.length;
  const matched = accepted.filter((r) =>
    rows.some(
      (e) =>
        e.slot === r.slot && e.eventId === r.headers['x-workshop-event-id'] && e.joined,
    ),
  );
  return {
    accepted: accepted.length,
    matched: matched.length,
    unique,
    complete: accepted.length > 0 && unique && matched.length === accepted.length,
  };
}

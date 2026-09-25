import { save } from './platform.mjs';
const base = process.argv[2] || 'https://cdn-workshop-request.vercel.app';
const response = await fetch(base + '/api/run', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: '{}',
});
const r = await response.json();
if (!response.ok) throw Error(JSON.stringify(r));
save('.private/latest-run.json', r);
const c = r.collectorUrl;
const controls = {};
controls.unsignedDrain = (
  await fetch(c + '/api/service?op=drain', { method: 'POST', body: '[]' })
).status;
controls.forgedSignature = (
  await fetch(c + '/api/service?op=drain', {
    method: 'POST',
    headers: { 'x-vercel-signature': '0'.repeat(40) },
    body: '[]',
  })
).status;
controls.unauthorizedEvidence = (
  await fetch(c + `/api/service?op=evidence&run=${r.run}`)
).status;
controls.wrongCapability = (
  await fetch(c + `/api/service?op=evidence&run=${r.run}`, {
    headers: { authorization: 'Bearer unrelated-run-capability' },
  })
).status;
controls.forgedFixture = (
  await fetch(base + `/demo/${r.run}`, {
    headers: {
      'x-fixture-ticket': '0.' + '0'.repeat(64),
      'x-workshop-event-id': 'forged',
    },
  })
).status;
controls.originProtected = (await fetch(c + `/origin/${r.run}`)).status;
controls.registrationProtected = (
  await fetch(c + '/api/service?op=register', { method: 'POST', body: '{}' })
).status;
controls.responseUUIDs =
  r.observations.every((o) => /^[a-f0-9-]{36}$/.test(o.eventId)) &&
  new Set(r.observations.map((o) => o.eventId)).size === 4;
save('.private/latest-controls.json', controls);
console.log({ run: r.run, environment: r.environment, controls });

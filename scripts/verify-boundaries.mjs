import { load, save } from './platform.mjs';
import { randomUUID, createHash } from 'node:crypto';
const p = load('workshop.config.json'),
  s = load('.private/secrets.json').preview,
  r = load('.private/preview-final-run.json');
const v = await fetch(p.environments.preview.requestUrl + '/api/run').then((r) =>
  r.json(),
);
const rateKey = createHash('sha256').update(randomUUID()).digest('hex');
const register = (url = r.collectorUrl, environment = 'preview') =>
  fetch(url + '/api/service?op=register', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${s.SERVICE_SECRET}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      run: 'run-' + randomUUID(),
      capabilityHash: createHash('sha256').update(randomUUID()).digest('hex'),
      deploymentId: v.deploymentId,
      revision: v.revision,
      environment,
      rateKey,
    }),
  });
const first = await register(),
  second = await register(),
  crossAdmin = await register(p.environments.production.collectorUrl, 'production'),
  crossEnv = await register(r.collectorUrl, 'production');
const old = load('.private/initial-run.json'),
  other = load('evidence/production-live.json');
const cross = await fetch(
  old.collectorUrl + `/api/service?op=evidence&run=${other.run}`,
  { headers: { authorization: `Bearer ${old.capability}` } },
);
const result = {
  verifiedAt: new Date().toISOString(),
  revision: v.revision,
  firstRegistration: first.status,
  duplicateRateWindow: second.status,
  wrongRunCapability: cross.status,
  previewAdminOnProduction: crossAdmin.status,
  wrongEnvironmentRegistration: crossEnv.status,
};
save('evidence/additional-controls.json', result);
console.log(result);
if (
  first.status !== 200 ||
  second.status !== 429 ||
  cross.status !== 401 ||
  crossAdmin.status !== 401 ||
  crossEnv.status !== 400
)
  process.exitCode = 1;

import sourceMappings from '../service-metadata.json' with { type: 'json' };
import { randomUUID, randomBytes, createHash, createHmac } from 'node:crypto';
const env = process.env.WORKSHOP_ENV || process.env.PILOT_ENV || 'unset';
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const collector = process.env.COLLECTOR_URL;
  if (req.method === 'GET')
    return res.json({
      sourceMappings,
      service: 'request',
      environment: env,
      collectorUrl: collector,
      revision: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID || null,
    });
  if (req.method !== 'POST') return res.status(405).end();
  const run = `run-${randomUUID()}`,
    capability = randomBytes(32).toString('hex');
  const post = async (op, data) => {
    const r = await fetch(`${collector}/api/service?op=${op}&run=${run}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.SERVICE_SECRET}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) {
      const error = Error(
        `${op}: ${r.status}${r.status === 429 ? ' — wait 15 seconds before another run' : ''}`,
      );
      error.status = r.status;
      throw error;
    }
    return r.json();
  };
  try {
    const version = await fetch(`${collector}/api/service?op=version`).then((r) =>
      r.json(),
    );
    if (version.environment !== env)
      throw Error('Environment mismatch; refusing cross-environment mutation');
    await post('register', {
      run,
      capabilityHash: createHash('sha256').update(capability).digest('hex'),
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
      revision: process.env.VERCEL_GIT_COMMIT_SHA,
      environment: env,
      rateKey: createHmac('sha256', process.env.SERVICE_SECRET)
        .update(
          `${Math.floor(Date.now() / 15000)}|${req.headers['x-forwarded-for'] || 'unknown'}`,
        )
        .digest('hex'),
    });
    const expires = Date.now() + 90000,
      ticket = `${expires}.${createHmac('sha256', process.env.FIXTURE_SECRET).update(`${run}|${expires}`).digest('hex')}`;
    const base = `https://${process.env.VERCEL_URL}`;
    const cookies = [
      'workshop_choice=fixture-A; unrelated=NEVER_CAPTURE',
      'workshop_choice=fixture-B; unrelated=NEVER_CAPTURE',
      'unrelated=NEVER_CAPTURE',
      'workshop_choice=INVALID_NEVER_CAPTURE',
    ];
    const observations = [];
    for (const [i, name] of ['A', 'B', 'Missing', 'Invalid'].entries()) {
      const referer = `https://fixture.example/${run}/${name}`;
      const r = await fetch(`${base}/demo/${run}`, {
        headers: {
          cookie: cookies[i],
          'user-agent': `Workshop/${name}`,
          referer,
          'x-fixture-ticket': ticket,
          'x-workshop-event-id': 'forged-client-value',
        },
        signal: AbortSignal.timeout(15000),
      });
      observations.push({
        name,
        status: r.status,
        cache: r.headers.get('x-vercel-cache'),
        fillId: r.headers.get('x-workshop-fill-id'),
        eventId: r.headers.get('x-workshop-event-id'),
        platformId: r.headers.get('x-vercel-id'),
        referer,
        at: new Date().toISOString(),
      });
      await r.text();
    }
    await post('observations', observations);
    return res.json({
      run,
      capability,
      collectorUrl: collector,
      environment: env,
      observations,
      revision: process.env.VERCEL_GIT_COMMIT_SHA,
      createdAt: new Date().toISOString(),
    });
  } catch (e) {
    if (e.status === 429) res.setHeader('Retry-After', '15');
    return res.status(e.status === 429 ? 429 : 502).json({
      error: e.message,
      run,
      hint: 'Check service environment and deployment protection. Reset creates a new namespace.',
    });
  }
}

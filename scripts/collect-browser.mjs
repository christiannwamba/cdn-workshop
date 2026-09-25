import { readFileSync, writeFileSync } from 'node:fs';
import { get, list } from '@vercel/blob';
import { analyzeBrowser } from '../apps/collector/lib/evidence.mjs';
const [run, environment = 'preview', name = run] = process.argv.slice(2);
if (
  !/^run-[a-f0-9-]{36}$/.test(run || '') ||
  !['preview', 'production'].includes(environment)
)
  throw Error('Valid run and environment required');
const text = readFileSync(`.private/collector-${environment}.env`, 'utf8');
const line = text.split('\n').find((l) => l.startsWith('BLOB_READ_WRITE_TOKEN='));
let token = line.slice(line.indexOf('=') + 1);
if (token.startsWith('"')) token = JSON.parse(token);
process.env.BLOB_READ_WRITE_TOKEN = token;
const base = `${environment}/runs/${run}/`;
async function read(path) {
  const b = await get(base + path, { access: 'private', useCache: false });
  return b ? JSON.parse(await new Response(b.stream).text()) : null;
}
async function rows(path) {
  const r = await list({ prefix: base + path, limit: 250 });
  return Promise.all(r.blobs.map((x) => read(x.pathname.slice(base.length))));
}
const cfg = await read('config.json'),
  data = {
    run,
    mode: 'browser',
    environment,
    revision: cfg.revision,
    deploymentId: cfg.deploymentId,
    origins: await rows('origins/'),
    batches: await rows('batches/'),
    consumed: await rows('consumed/'),
    observations: [],
  };
const result = { ...analyzeBrowser(data), ...data };
writeFileSync(`.private/${name}-full.json`, JSON.stringify(result, null, 2));
// Publish only synthetic measurements. Remove browser fingerprint/referrer data from every location.
function redact(value, key) {
  if (['nativeUserAgent', 'nativeReferrer', 'userAgent', 'referer'].includes(key))
    return '[browser metadata omitted]';
  if (Array.isArray(value)) return value.map((v) => redact(v));
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redact(v, k)]));
  return value;
}
writeFileSync(`evidence/${name}.json`, JSON.stringify(redact(result), null, 2) + '\n');
console.log({
  run,
  status: result.status,
  origin: result.originCount,
  native: result.nativeCount,
  emissions: result.emissionCount,
  checks: result.checks,
});

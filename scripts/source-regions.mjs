import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const compact = (line) => line.replace(/\s/g, '');
// Semantic boundaries survive formatting. End anchors are excluded from the excerpt.
const regions = {
  middleware: ["const selected = (request.headers.get('cookie')", 'const upstream ='],
  driver: ['export default async function', 4],
  collector: ['const raw = await body(req)', 'const parsed ='],
  verification: ['const es = emissions.filter', 'const wanted ='],
  browserLab: ['async function sendWithCookie(name)', 4],
  browserSession: ["const run = 'run-' + randomUUID()", 'await call('],
  configuration: ['"production": {', '"preview": {'],
};
// These describe the compact, already-published base; never attach new ranges to old SHAs.
const legacy = {
  middleware: ["const selected = (request.headers.get('cookie')", 4],
  driver: ['export default async function', 4],
  collector: ['const raw=await body(req),expected=', 2],
  verification: ['const es=emissions.filter', 3],
  browserSession: ["await call('register',run,", 2],
  configuration: ['"environments": {', 4],
};
export function locate(path, text, key, definitions = regions) {
  const lines = text.trimEnd().split('\n');
  const [start, end] = definitions[key];
  const first = lines.findIndex((line) => compact(line).includes(compact(start))) + 1;
  if (!first) throw Error(`Missing focused source region: ${key} in ${path}`);
  const last =
    typeof end === 'number'
      ? Math.min(first + end - 1, lines.length)
      : lines.findIndex(
          (line, index) => index >= first && compact(line).includes(compact(end)),
        );
  if (last < first || last - first >= 30)
    throw Error(`Invalid focused source boundary: ${key}`);
  const code = lines.slice(first - 1, last).join('\n');
  return { path, first, last, code, excerpt: code };
}
export function sourceMappings(sources, { local = false, revision = 'HEAD' } = {}) {
  return Object.fromEntries(
    Object.entries(sources).map(([key, path]) => {
      const map = locate(path, readFileSync(root + path, 'utf8'), key);
      if (local && key !== 'browserLab') {
        try {
          let oldPath = path;
          let old;
          try {
            old = execFileSync('git', ['show', `${revision}:${oldPath}`], {
              cwd: root,
              encoding: 'utf8',
              stdio: ['ignore', 'pipe', 'ignore'],
            });
          } catch {
            if (key !== 'configuration') throw Error('No committed file');
            oldPath = 'pilot.config.json'; // Historical filename at the pinned base revision.
            old = execFileSync('git', ['show', `${revision}:${oldPath}`], {
              cwd: root,
              encoding: 'utf8',
              stdio: ['ignore', 'pipe', 'ignore'],
            });
          }
          try {
            map.committed = locate(oldPath, old, key);
          } catch {
            map.committed = locate(oldPath, old, key, legacy);
          }
        } catch {
          /* Unpublished sources have no remote line link. */
        }
      }
      return [key, map];
    }),
  );
}

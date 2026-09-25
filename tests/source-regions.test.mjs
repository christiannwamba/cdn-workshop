import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { sourceMappings } from '../scripts/source-regions.mjs';
const config = JSON.parse(readFileSync('workshop.config.json', 'utf8'));
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

test('focused local and committed ranges select their own exact source text', () => {
  const maps = sourceMappings(config.sources, { local: true, revision });
  for (const map of Object.values(maps)) {
    const lines = readFileSync(map.path, 'utf8').split('\n');
    assert.equal(map.code, lines.slice(map.first - 1, map.last).join('\n'));
    assert.ok(map.last - map.first < 30);
    if (map.committed) {
      const old = map.committed;
      const committed = execFileSync('git', ['show', `${revision}:${old.path}`], {
        encoding: 'utf8',
      });
      assert.equal(
        old.code,
        committed
          .split('\n')
          .slice(old.first - 1, old.last)
          .join('\n'),
      );
    }
  }
  assert.match(maps.middleware.code, /console\.log/);
  assert.match(maps.collector.code, /invalid signature/);
  assert.match(maps.verification.code, /const joined/);
  assert.match(maps.browserLab.code, /credentials: 'same-origin'/);
  assert.equal(maps.browserLab.committed, undefined);
  assert.ok(maps.collector.committed);
});

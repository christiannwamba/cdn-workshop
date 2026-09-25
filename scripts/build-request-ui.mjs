import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
// The request origin serves the exact same application as the catalog host.
execFileSync('npm', ['run', 'build', '--workspace', 'apps/web'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, WORKSHOP_REQUEST_UI: '1' },
});

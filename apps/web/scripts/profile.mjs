import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { sourceMappings } from '../../../scripts/source-regions.mjs';
const env = process.env.VERCEL_ENV === 'preview' ? 'preview' : 'production';
let revision = process.env.VERCEL_GIT_COMMIT_SHA;
try {
  revision ||= execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
} catch {
  revision = 'local';
}
const base = JSON.parse(readFileSync('../../workshop.config.json', 'utf8'));
const localPreview = !process.env.VERCEL;
const profile = {
  ...base,
  ...base.environments[env],
  environment: env,
  revision,
  localPreview,
  surface: process.env.WORKSHOP_REQUEST_UI ? 'request' : 'web',
};
delete profile.environments;
profile.sources = sourceMappings(base.sources, { local: localPreview, revision });
mkdirSync('public', { recursive: true });
writeFileSync('public/profile.json', JSON.stringify(profile, null, 2));

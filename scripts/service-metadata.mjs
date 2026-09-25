import { readFileSync, writeFileSync } from 'node:fs';
import { sourceMappings } from './source-regions.mjs';
const service = process.argv[2];
const sources = JSON.parse(readFileSync('../../workshop.config.json', 'utf8')).sources;
const keys =
  service === 'request'
    ? ['middleware', 'driver', 'browserSession']
    : ['collector', 'verification'];
const mappings = sourceMappings(
  Object.fromEntries(keys.map((key) => [key, sources[key]])),
);
writeFileSync('service-metadata.json', JSON.stringify(mappings));

import { api, load, save } from './platform.mjs';
const cfg = load('workshop.config.json'),
  ps = load('.private/projects.json'),
  at = new Date().toISOString();
const history = {},
  projects = {};
for (const [key, p] of Object.entries(ps)) {
  const result = api('GET', `/v6/deployments?projectId=${p.id}&limit=100`);
  const deployments = result.deployments.map((d) => ({
    id: d.uid,
    url: 'https://' + d.url,
    state: d.state,
    target: d.target,
    source: d.source,
    revision: d.meta?.githubCommitSha,
    branch: d.meta?.githubCommitRef,
  }));
  history[key] = deployments;
  projects[key] = {
    ...p,
    production: deployments.find((d) => d.target === 'production' && d.state === 'READY'),
    preview: deployments.find((d) => d.target === null && d.state === 'READY'),
  };
}
const runtime = {};
for (const [env, p] of Object.entries(cfg.environments)) {
  runtime[env] = {
    web: await fetch(p.siteUrl + '/profile.json').then((r) => r.json()),
    request: await fetch(p.requestUrl + '/api/run').then((r) => r.json()),
    collector: await fetch(p.collectorUrl + '/api/service?op=version').then((r) =>
      r.json(),
    ),
  };
}
save('evidence/deployment-history.json', { verifiedAt: at, history });
save('manifest.json', {
  schemaVersion: 1,
  owner: cfg.owner,
  verifiedAt: at,
  repository: cfg.repo,
  team: cfg.team,
  projects,
  profiles: cfg.environments,
  sourceMappings: cfg.sources,
  runtimeRevisions: Object.fromEntries(
    Object.entries(runtime).map(([env, v]) => [
      env,
      Object.fromEntries(Object.entries(v).map(([service, x]) => [service, x.revision])),
    ]),
  ),
  metadataPaths: {
    web: '/profile.json',
    request: '/api/run',
    collector: '/api/service?op=version',
  },
  storage: {
    type: 'private Vercel Blob',
    storeId: load('.private/storage.json').store.id,
    namespaces: ['production/', 'preview/'],
  },
  drains: load('evidence/isolation.json').drains,
  pullRequests: [1, 2].map((n) => cfg.repo + '/pull/' + n),
  historyFile: 'evidence/deployment-history.json',
  snapshotNote:
    'These are observed deployments at verifiedAt. Later documentation commits can deploy newer identical runtime code; public metadata endpoints identify the current service revisions.',
});
console.log({
  verifiedAt: at,
  runtimeRevisions: Object.fromEntries(
    Object.entries(runtime).map(([env, v]) => [
      env,
      Object.fromEntries(Object.entries(v).map(([service, x]) => [service, x.revision])),
    ]),
  ),
});

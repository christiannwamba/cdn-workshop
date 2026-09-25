import { api, load, save } from './platform.mjs';
const ps = load('.private/projects.json');
const out = { checkedAt: new Date().toISOString(), projects: {} };
for (const [k, p] of Object.entries(ps)) {
  const d = api('GET', `/v6/deployments?projectId=${p.id}&limit=5`);
  out.projects[k] = {
    ...p,
    deployments: d.deployments.map((x) => ({
      id: x.uid,
      url: 'https://' + x.url,
      state: x.state,
      target: x.target,
      source: x.source,
      commit: x.meta?.githubCommitSha,
      branch: x.meta?.githubCommitRef,
    })),
  };
}
save('.private/deployments.json', out);
console.log(JSON.stringify(out, null, 2));

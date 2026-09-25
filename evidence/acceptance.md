# Acceptance matrix — 2026-09-25

Owner: Christian Nwamba. Public sample contains only newly authored synthetic fixture code and sanitized pilot evidence. Existing workshop projects were not changed.

| Area | Status | Observed result / boundary |
| --- | --- | --- |
| Architecture | PASS | One clean GitHub monorepo; three new Vercel projects; hosted request driver, owned origin and private Blob collector. No tunnel or laptop origin. |
| Public UX | PASS | Index filters/counts, secondary categories, clear R32 workaround status, complete runbook, live states and labeled recorded fallback. R20/R10 are outside-pilot catalog entries. |
| Live telemetry | PASS | Production and preview: A MISS, B/missing/invalid HIT; one origin call; four native records and four emissions; exact UUID/envelope/native joins. See production-live.json and preview-final-live.json. |
| Privacy / boundaries | PASS | Unrelated and invalid cookie values excluded before logging; raw native-field absence checked before sanitization. Unsigned/forged ingestion 403; missing/wrong capability 401; forged fixture and unsigned origin 403. |
| Run isolation | PASS | Wrong run capability 401; preview run queried on production 404. Separate Chrome/in-app runs and browser-local diagrams do not overwrite each other. |
| Async evidence | PASS | Real missing-delivery timeout observed, followed by fresh-run recovery after preview Drain setup. Delayed/duplicate/missing/tampered-record analyzer controls use recorded genuine data and are explicitly offline tests, not fabricated platform deliveries. No delivery SLA claimed. |
| Deployment configuration | PARTIAL | Historical profile-override tests predate the local cleanup. The editor and endpoint overrides are now removed; configuration is deployment-owned. Independent attendee account setup remains untested. |
| GitHub writes | PASS | Personal public repository creation, clean-source audit, commits, push, branch and PR creation succeeded. GitGuardian checks passed. |
| Git integration | PASS | All three projects linked to the repository with distinct roots. Observed deployments report source=git and exact commit SHAs; no CLI-only deployment is counted. |
| Repeated updates | PASS | Multiple main and codex/delivery-proof pushes produced independent deployments for all three services. |
| Preview isolation | PASS | Separate secrets and private-storage prefixes. Production rejects preview admin credentials. Request service checks collector environment; browser checks both environment and destination. |
| Merge policy | PASS | Actual repository permissions include admin/push. Rulesets are empty; main has no branch protection. Self-approval is not used. Automated checks and implementation review precede merge. Merge outcome is recorded in delivery-workflow.json. |
| Rollback / recovery | PASS | PR #1 merged and its frontend/backend marker was observed in production. PR #2 reverted that harmless marker through tested Git previews and merge; production revision ccf73bc delivered the restored behavior. A fresh production browser run then passed all four visitor cases. |
| Source links | PASS | Anonymous GitHub code URLs returned 200. Web and services expose their own deployed revisions; build-generated source ranges match actual files. Links do not use latest main. |
| Dashboard targets | PASS | Authenticated request Logs and team Drains pages opened in the correct team/project. Public learning flow works without dashboard access; anonymous dashboard authorization remains an account boundary. |
| Mermaid / rendering | PARTIAL | Original and valid edits render; invalid edits preserve the last valid diagram with a stale marker; valid draft survives reload; reset/teaching view work. Desktop and 390px layout, keyboard navigation, raw folding and Chrome print preview checked. Copy action reports success; automation clipboard/download interoperability is not fully verified. |
| Clean bootstrap | PASS | Clean local Git clone: npm ci, six analyzer tests, web build and both service metadata builds. npm audit reports zero vulnerabilities. This is not an independent deployment account test. |

## Important limitations

R32 remains a workaround with partial customer coverage even when the fixture passes. The initial public button used hosted synthetic HTTP sessions. The later real-browser flow verified actual same-origin cookie transport and cache/log correlation (see [browser controls](browser/controls.md)). The current local UI consolidation has not been deployed or freshly verified against CDN/log delivery. Third-party cookie behavior is not established. Customer cookie semantics, a universal production correlation contract, native automatic named-cookie fields, lossless telemetry, cost at scale, sustained throughput and delivery guarantees are not established.

Raw external TLS origins, WebSocket hosting/session limits, every framework cache topology, other account plans and all customer requirements are outside this pilot. Existing earlier failed and pending evidence is retained alongside the passing runs.

Storage has a one-hour read-capability lifetime but no automatic physical deletion. The owner must decide retention after the workshop. Public run allocation has a short network-bucket guard, not a comprehensive abuse-control system.

## Account choice

The preferred playground previously enforced mandatory SSO and denied project-level changes. This task used the authorized CN Demos fallback and changed only its three new synthetic projects; no organization protection was weakened. GitHub App integration succeeded with existing permissions, so no additional installation/access grant was required.

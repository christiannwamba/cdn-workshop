# CDN workshop pilot

One complete R32 exercise: can selected-cookie enrichment run when shared content is a CDN HIT? The answer demonstrated by the fixture is a **workaround**, not full customer coverage.

## Run locally

Node 24 is the deployment runtime. From a clean checkout:

```sh
npm ci
npm test
npm run build
npm run dev -w apps/web
```

The page uses deployed backends from `pilot.config.json`. Local Vite alone does not emulate the Vercel CDN or signed platform delivery. Do not mistake local checks for platform evidence.

## Architecture

- `apps/web`: React/Vite index, R32 runbook, strict Mermaid editor, public deployment profiles.
- `apps/request-demo`: scoped Routing Middleware and a hosted four-request visitor driver. Separate synthetic Cookie headers model A/B/missing/invalid sessions. No real browser cookies are read or forwarded.
- `apps/collector`: an owned origin, signed Drain ingestion, private Blob persistence and capability-protected run evidence. Only the request project is in Drain scope.
- `packages/shared/contracts.ts`: small portable profile and requirement contracts.

The source content is synthetic. The native log records are delivered by Vercel. The driver never fabricates them. Correlation uses response event UUID → application envelope → exact native `requestId`. An `x-vercel-id` suffix is never parsed as a contract.

## Deploy your own

1. Fork this clean repository. Install the Vercel GitHub App with access to your fork. Your account must permit project creation and Git integration. Do not weaken organization protection requirements; use an appropriate demo account if a public workshop is required.
2. Create three Vercel projects linked to that one repository. Set root directories to `apps/web`, `apps/request-demo`, and `apps/collector`. Select Vite for web (build `npm run build`, output `dist`); use Other for request and collector (output `public`). Include files outside the root directory for workspace installation and the web profile build. Use Node 24.
3. Create private Vercel Blob storage and connect it only to the collector. Keep `BLOB_READ_WRITE_TOKEN` server-side. Provisioning storage, Drain availability and consumption costs are account-specific prerequisites. No independent attendee account has been tested.
4. Generate random service, fixture and Drain secrets. Set `SERVICE_SECRET` and `FIXTURE_SECRET` to matching values on request and collector. Set `COLLECTOR_URL` on request. Set `DRAIN_SECRET` and `SOURCE_PROJECT_ID` on collector. Set matching `PILOT_ENV` values. Use **different secrets and storage namespaces for production and preview**. Do not expose these in public profiles.
5. Configure a Log Drain with `projects: some`, `projectIds: [request project ID]`, log schema v1, HTTP JSON delivery, no compression, and your chosen signing secret. Destination is `https://YOUR-COLLECTOR/api/service?op=drain`. Exclude web and collector. Create a separate preview destination/secret if testing previews; each collector accepts only its own registered deployment IDs.
6. Update `pilot.config.json`: site/request/collector URLs for each environment; repository base URL, dashboard host/team/project names and source mappings. The web build pins its Git revision and calculates source line ranges. Service builds publish their own revision and source mappings. Public assets use immutable deployment URLs to keep already-open pages usable during updates. Components contain no owner-specific account routes. After deployment, Setup supports validated browser-local overrides and JSON import/export. This does not change backend environment variables.
7. Push a commit. Inspect **Git-triggered** deployments for all three projects. CLI deployments are useful for diagnosis but do not prove continuous delivery. Start the live run from the shared page. Expect MISS then three HITs, one origin call, four native records and four emissions; allow asynchronous arrival. Incomplete delivery is not a cookie-coverage verdict.
8. Use a coordinated branch with working service URLs for previews. Confirm `/api/run` and collector `?op=version` agree on environment and destination. Never point preview request services at a production collector.

Production aliases can be public while evidence stays protected. A random run capability is returned once to the initiating browser, held in React memory, and sent only as an Authorization header. Reset discards that capability locally. A keyed, non-reversible network bucket limits registration to one run per 15-second window; no raw client address is stored. This is a bounded demo guard, not comprehensive abuse protection. Evidence expires for reads after one hour. Storage does not automatically expire; the owner must arrange retention or remove pilot objects when retiring it. Do not place capabilities in URLs, profiles or committed evidence.

## Evidence and limits

See `evidence/acceptance.md` and `manifest.json` for dated outcomes and exact deployments. A recorded fallback is clearly labeled separately from live evidence. Native records are field-allowlisted; IPs and unrelated headers are not retained. Signed batches are deduplicated by record ID during analysis; arrival counts and unmatched events remain visible.

This is bounded demonstration code, not a production telemetry ingestion service or load test. It does not establish lossless delivery, a delivery SLA, customer cookie semantics, production join guarantees, all plans, every framework cache topology, raw external TLS origins, WebSocket hosting/session limits, or all workshop requirements. R20/R10 are truthful catalog stubs outside the pilot.

## Public references

- [Vercel monorepos](https://vercel.com/docs/monorepos)
- [Drains security](https://vercel.com/docs/drains/security)
- [Log event schema](https://vercel.com/docs/drains/reference/logs)
- [Drain creation API](https://vercel.com/docs/rest-api/drains/create-a-new-drain)
- [Mermaid strict security](https://mermaid.js.org/config/schema-docs/config-properties-securitylevel.html)
- [Vite](https://vite.dev/guide/)

Owner: Christian Nwamba. Review deployment/storage/Drain retention after the workshop; no automatic destructive cleanup is configured.

## Verified delivery

Both [implementation PR #1](https://github.com/christiannwamba/cdn-workshop-pilot/pull/1) and [recovery PR #2](https://github.com/christiannwamba/cdn-workshop-pilot/pull/2) were merged after successful Git previews/checks. The temporary frontend/backend version marker reached production, was reverted through PR #2, and the restored production exercise passed again. `manifest.json` is a dated observation; current `/profile.json`, request `/api/run` (GET), and collector `/api/service?op=version` provide live revision metadata.

Browser automation verified JSON import, but could not independently confirm clipboard/file-download completion. If an embedded browser blocks downloads, the editable Mermaid and profile text remains available to copy manually. This limitation is retained as PARTIAL in the acceptance record.

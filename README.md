# CDN Workshop

One complete R32 exercise: can selected-cookie enrichment run when shared content is a CDN HIT? The answer demonstrated by the fixture is a **workaround**, not full customer coverage.

Four additional pages cover exact behavior differences: `/#r05` (missing versus zero Content-Length), `/#r06` (redirect status), `/#r09` (response-header removal), and `/#r29` (external-origin path optimization decision). They use dated recorded observations, with manual commands targeting the existing public synthetic test endpoint configured at `fixtures.platformGaps.url`. Localhost does not reproduce platform behavior. R29 has no performance-parity demonstration.

## Run locally

Node 24 is the deployment runtime. From a clean checkout:

```sh
npm ci
npm test
npm run build
npm run dev -w apps/web
```

The page uses deployed backends from `workshop.config.json`. Local Vite alone does not emulate the Vercel CDN or signed platform delivery. Do not mistake local checks for platform evidence.

## Architecture

- `apps/web`: Shared React/Vite requirement index, R32 browser exercise and strict Mermaid editor. Deployment-owned configuration is generated at build time.
- `apps/request-demo`: scoped Routing Middleware, same-origin browser session API, and the same shared UI built from `apps/web`. The retained `/api/run` driver is available for regression scripts; the teaching page uses actual browser cookies and fetches.
- `apps/collector`: an owned origin, signed Drain ingestion, private Blob persistence and capability-protected run evidence. Only the request project is in Drain scope.
- `packages/shared/contracts.ts`: small portable profile and requirement contracts.

The source content is synthetic. The native log records are delivered by Vercel. The driver never fabricates them. Correlation uses response event UUID → application envelope → exact native `requestId`. An `x-vercel-id` suffix is never parsed as a contract.

## Deploy your own

1. Fork this clean repository. Install the Vercel GitHub App with access to your fork. Your account must permit project creation and Git integration. Do not weaken organization protection requirements; use an appropriate demo account if a public workshop is required.
2. Create three Vercel projects linked to that one repository. Set root directories to `apps/web`, `apps/request-demo`, and `apps/collector`. Select Vite for web (build `npm run build`, output `dist`); use Other for request (output `dist`, repository build command) and collector (output `public`). Include files outside the root directory for workspace installation and the web profile build. Use Node 24.
3. Create private Vercel Blob storage and connect it only to the collector. Keep `BLOB_READ_WRITE_TOKEN` server-side. Provisioning storage, Drain availability and consumption costs are account-specific prerequisites. No independent attendee account has been tested.
4. Generate random service, fixture and Drain secrets. Set `SERVICE_SECRET` and `FIXTURE_SECRET` to matching values on request and collector. Set `COLLECTOR_URL` on request. Set `DRAIN_SECRET` and `SOURCE_PROJECT_ID` on collector. Set matching `WORKSHOP_ENV` values (`PILOT_ENV` remains a compatibility fallback for existing deployments). Use **different secrets and storage namespaces for production and preview**. Do not expose these in public profiles.
5. Configure a Log Drain with `projects: some`, `projectIds: [request project ID]`, log schema v1, HTTP JSON delivery, no compression, and your chosen signing secret. Destination is `https://YOUR-COLLECTOR/api/service?op=drain`. Exclude web and collector. Create a separate preview destination/secret if testing previews; each collector accepts only its own registered deployment IDs.
6. Update `workshop.config.json`: site/request/collector URLs for each environment; repository base URL, dashboard host/team/project names and source mappings. The shared UI and service builds pin their Git revision and derive focused source ranges from actual text. Public assets use hashed filenames on the serving origin so Monaco workers stay same-origin. Visitors cannot edit endpoints: legacy localStorage overrides are ignored and removed. Change deployment configuration here and server environment variables through your normal release process.
7. Push a commit. Inspect **Git-triggered** deployments for all three projects. CLI deployments are useful for diagnosis but do not prove continuous delivery. Start the live run from the shared page. Expect A MISS then B HIT, one origin call, two native records and two cookie emissions; allow asynchronous arrival. Incomplete delivery is not a cookie-coverage verdict.
8. Use a coordinated branch with working service URLs for previews. Confirm `/api/run` and collector `?op=version` agree on environment and destination. Never point preview request services at a production collector.

Production aliases can be public while evidence stays protected. A random run capability is returned once to the initiating browser, held in React memory, and sent only as an Authorization header. Reset discards that capability locally. A keyed, non-reversible network bucket limits registration to one run per 15-second window; no raw client address is stored. This is a bounded demo guard, not comprehensive abuse protection. Evidence expires for reads after one hour. Storage does not automatically expire; the owner must arrange retention or remove workshop objects when retiring it. Do not place capabilities in URLs, profiles or committed evidence.

## Evidence and limits

See `evidence/acceptance.md` and `manifest.json` for dated outcomes and exact deployments. A recorded fallback is clearly labeled separately from live evidence. Native records are field-allowlisted; IPs and unrelated headers are not retained. Signed batches are deduplicated by record ID during analysis; arrival counts and unmatched events remain visible.

This is bounded demonstration code, not a production telemetry ingestion service or load test. It does not establish lossless delivery, a delivery SLA, customer cookie semantics, production join guarantees, all plans, every framework cache topology, raw external TLS origins, WebSocket hosting/session limits, or all workshop requirements. R20/R10 are truthful catalog stubs without an exercise.

## Public references

- [Vercel monorepos](https://vercel.com/docs/monorepos)
- [Drains security](https://vercel.com/docs/drains/security)
- [Log event schema](https://vercel.com/docs/drains/reference/logs)
- [Drain creation API](https://vercel.com/docs/rest-api/drains/create-a-new-drain)
- [Mermaid strict security](https://mermaid.js.org/config/schema-docs/config-properties-securitylevel.html)
- [Vite](https://vite.dev/guide/)

Owner: Christian Nwamba. Review deployment/storage/Drain retention after the workshop; no automatic destructive cleanup is configured.

## Verified delivery

Both [implementation PR #1](https://github.com/christiannwamba/cdn-workshop/pull/1) and [recovery PR #2](https://github.com/christiannwamba/cdn-workshop/pull/2) were merged after successful Git previews/checks. The temporary frontend/backend version marker reached production, was reverted through PR #2, and the restored production exercise passed again. `manifest.json` is a dated observation; current `/profile.json`, request `/api/run` (GET), and collector `/api/service?op=version` provide live revision metadata.

Historical download automation did not confirm Mermaid file-download completion; Mermaid text remains available to copy. The profile editor and its import/export flow have been removed.

## Local UI iteration

Run `npm ci`, then `npm run dev -w apps/web -- --port 5173`. Open `http://127.0.0.1:5173/#r32`. This is explicitly a **UI preview**: preparation, cookie choices and send buttons exercise the layout without writing cookies, sending content requests or creating log evidence. Old browser endpoint overrides are never read. `npm run build` checks the shared app. The local footer and action results identify preview behavior; production exercises run on the request host.

## Real-browser R32 exercise

On release, the request service builds and serves the same React application as the catalog. The catalog's exercise link opens the request origin at `/#r32`; old `/lab.html` bookmarks also load that application. There is no separate lab HTML/CSS or hosted-driver UI. Requests remain actual browser fetches on the request origin, with no iframe or content proxy added.

Open Network with Disable cache **unchecked**, start a fresh test, send the request with cookie A, then with cookie B, and refresh logs. Each send sets the cookie and fetches the same test URL. Starting a test does neither. Reset closes the session and clears exact-path test cookies. Ten-minute sessions allow twelve one-use requests. The backend retains its existing session, expiry, signing and isolation behavior; advanced joining and regression automation are outside the primary teaching UI.

The browser sets only synthetic `workshop_choice` and `workshop_unrelated` cookies, host-only with exact run path, Secure and SameSite=Strict. Middleware reads the allowlisted value, then removes Cookie and Authorization before the origin rewrite. Ticket consumption adds a pre-cache collector operation, separate from content-origin calls.

The verifier requires authenticated Middleware event IDs and signed cookie/native requestId joins. Browser observations cannot manufacture a verified join. Incomplete manual runs remain partial; missing delivery stays pending. Existing browser transport verification is recorded in `evidence/browser/controls.md`. The integrated UI is released on the request host; dated release verification is recorded separately from historical evidence.

Source details show 2–4 relevant lines beside the step. Local previews label excerpts **unpublished** and only offer committed comparisons where a matching region exists in Git. Build-time region mappings prepare accurate links for the eventual release; local line numbers are never attached to a remote revision.

## Source formatting and editors

Run `npm run format` to format maintained JS/TS, React, JSON, CSS, HTML and Markdown; run `npm run format:check` to check it. Generated profiles/builds, dependencies, extracted design tokens and historical evidence are excluded. `npm test` includes a source-range check against both local files and the pinned committed revision.

Mermaid source starts collapsed. Opening it loads Monaco with a Mermaid Monarch grammar and a local editor worker. Closing it disposes the editor; edits remain in page state. Apply, error recovery and Reset original keep the existing diagram workflow. Read-only source excerpts load Shiki independently and follow the site's theme. See the [Monaco custom bundle entry points](https://github.com/microsoft/monaco-editor/blob/main/CHANGELOG.md) and [Shiki dual themes](https://shiki.style/guide/dual-themes).

## Naming transition — 25 September 2026

The repository is `christiannwamba/cdn-workshop`. The existing Vercel projects in `cn-demos-vtest314` are now `cdn-workshop`, `cdn-workshop-request` and `cdn-workshop-collector`. Project IDs, Git repository ID, production branch, credentials, environment variables and production deployments were preserved. New production aliases use those names; old aliases remain attached to the same deployments for compatibility.

The renames do **not** publish this local UI. Current hosted pages, generated profiles and service metadata still contain older branding, URLs and source revisions. `workshop.config.json` uses the new production URLs; preview URLs still target the recorded branch deployments. Their old names and historical evidence are intentional, not new deployment claims.

A later authorized release must publish the UI/configuration, refresh preview URLs for the actual release branch, and verify the integrated browser exercise. Existing request `COLLECTOR_URL` settings and signed Drain endpoints still use retained aliases. Migrate these together with an approved release before considering removal of any old alias. Existing `PILOT_ENV` values remain supported; new setups use `WORKSHOP_ENV`. No environment secrets or Drain settings were changed for the rename.

## Approved shared-UI release

The production catalog opens the live request host for the cookie exercise. Existing catalog `/#r32` bookmarks redirect there. The preview warning banner is removed; localhost still identifies UI-only actions in its footer and results. Monaco and highlighted excerpts share Geist syntax colors, and excerpts remove only their common leading indentation. Source revisions/ranges remain tied to each deployed service.

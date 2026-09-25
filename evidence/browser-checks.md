# Browser verification — 2026-09-25

Executed in the Codex in-app browser against actual public deployments.

- Index: each status filter returned 1; Workaround + Caching returned 0 with useful empty state. Categories remain secondary.
- Production browser live run `run-3a5e865a-8aa7-4629-bba8-95b001b3aeda`: COMPLETE. A MISS/MISS; B, missing and invalid HIT/HIT. All four exact joins matched. Fresh live status explicitly retains workaround/partial-coverage label.
- Mermaid: valid Alice→Bob teaching edit rendered. Invalid syntax displayed a parse error and kept the prior diagram. Reload restored the last valid browser-local draft. The original diagram initially exposed a semicolon parse error; corrected in commit 525c235 and rendered with all six participants and asynchronous paths.
- Teaching view opened/exited. At a 390 × 844 viewport, document scrollWidth was 375 and innerWidth 390: no page-level horizontal overflow. Diagram overflow is contained.
- Profile: malformed commit revision rejected. A production-page browser override routed to real preview service aliases and created preview run `run-a99c504c-91f4-472b-a0fa-9ac22f314511`. Preview collector had no Drain yet, so 0/4 records remained explicitly pending. No production collector mutation was involved.
- Recorded fallback: showed RECORDED FALLBACK; four historical rows matched; raw output expanded and collapsed. Returning to live clears the saved selection.
- A valid diagram Copy action showed “Copied Mermaid.” Browser clipboard transport did not independently confirm clipboard contents, so clipboard interoperability is PARTIAL.

Additional final checks are recorded in the acceptance matrix. This record does not claim native browser-cookie transport; these are hosted synthetic HTTP visitor sessions triggered through a browser.

Final observations:
- Missing preview delivery reached LIVE · TIMEOUT at the two-minute window, with 0/4 explicitly incomplete. After Drain setup, fresh preview run `run-bea729af-203e-475c-8b06-1ed2fcb2903f` recovered to LIVE · COMPLETE. Terminal run `run-ed3c2130-514f-4294-bffe-6143c3dbf995` also passed all seven checks; saved in `preview-final-live.json`.
- A deliberately mixed profile (preview request + production collector) showed LIVE · ERROR and “No run started.” Restoring defaults recovered the configuration.
- Profile JSON file import completed and applied. Export buttons were exercised in the in-app browser and Chrome, but their automation download-event observers timed out. File export verification remains PARTIAL; this is not claimed as an observed successful download.
- Independent Chrome session displayed its own “Isolated Chrome draft”; the in-app preview's diagram remained unchanged. The two sessions created distinct run namespaces. Resetting the in-app run did not change Chrome's selected run.
- Keyboard: Tab from Reset run reached View recorded fallback. Controls are native buttons, selects, links, textareas and summary elements with visible focus rings.
- Chrome print preview loaded a five-page PDF, with the current edited diagram, scenario labels, pending evidence state, verification steps and limitations. The preview's first page was visually checked; no clipping or overlap was observed. The print dialog was canceled.
- Authenticated dashboard pages resolved to the correct request-project Logs view and team Log Drains view. Anonymous public source links returned HTTP 200; dashboard access is explicitly documented as permission-dependent.

- Final production run after PR #2 merge: `run-04c1e9fa-5bc8-47d3-a1c6-be64bfb729e2` showed LIVE · COMPLETE. A MISS/MISS, B/missing/invalid HIT/HIT, all exact joins matched. Marker removed in production revision `ccf73bcf5ccf9193672ee1331c3417e5face9b2a`.
- Mermaid configuration override (`securityLevel: loose`) was rejected with a readable error, preserving the last valid drawing. Final teaching layout uses full width with source below; the note was shortened to avoid clipping.

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

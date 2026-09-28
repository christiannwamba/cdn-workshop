import React, { useState } from 'react';
import { CodeBlock } from './code-block.jsx';
import proof from './r23-solution-observations.json';

function Table({ headings, rows }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headings.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Source({ names, children }) {
  const [open, setOpen] = useState(false);
  return (
    <details className="source" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>{children}</summary>
      <p className="small">
        Owned synthetic test source · 28 September 2026. These are excerpts from the
        deployed response-type experiment, not the workshop application or Vercel’s
        private implementation.
      </p>
      {names.map((name) => {
        const source = proof.sources[name];
        return (
          <div key={name}>
            <p>
              <code>
                {source.path}:{source.first}–{source.last}
              </code>
            </p>
            {open && <CodeBlock source={{ ...source, code: source.displayCode }} />}
            <p className="small">
              File SHA-256: <code>{source.fileSha256}</code>
            </p>
          </div>
        );
      })}
      <p className="small">
        Formatting expanded for readability; no GitHub line link is supplied for this
        separate test checkout.
      </p>
    </details>
  );
}
export function VarySolution({ base }) {
  return (
    <section>
      <h2>Compare HTML and JSON at the same URL</h2>
      <p className="small">
        Recorded hosted test · 28 September 2026. These results do not rerun when you open
        this page. The temporary origin is stopped; use the presenter steps below for a
        live replay.
      </p>
      <ol className="exercise">
        <li>
          <h3>Change only the origin’s response type</h3>
          <p>
            The test first returned HTML, then JSON after the 20-second CDN lifetime
            expired. The public URL and incoming headers stayed the same for each
            language.
          </p>
          <Table
            headings={[
              'Origin response',
              'Vary at client',
              'English → French → English → French',
              'Origin calls',
            ]}
            rows={proof.phases.map((p) => [
              p.name,
              p.requests[0].vary || 'Absent',
              p.requests.map((r) => r.cache).join(' → '),
              p.originCalls,
            ])}
          />
          <p>
            HTML matched the removal rule; JSON did not. Each phase made two origin calls.
            Both repeats reused their own language’s body and fill ID.
          </p>
          <details className="source">
            <summary>Per-request fills and independent origin records</summary>
            <p>
              One recorded public path for both phases: <code>{proof.samplePath}</code>.
              The same <code>Content-Type: application/octet-stream</code> request header
              was sent throughout; the origin’s local state selected the returned type.
            </p>
            {proof.phases.map((p) => (
              <div key={p.name}>
                <h3>
                  {p.name}: {p.contentType}
                </h3>
                <Table
                  headings={['Language', 'Cache', 'Fill ID', 'Vary at client']}
                  rows={p.requests.map((r) => [
                    r.language,
                    r.cache,
                    <code title={r.fill}>{r.fill.slice(0, 8)}</code>,
                    r.vary || 'Absent',
                  ])}
                />
              </div>
            ))}
            <p>
              The independently read origin journal contains the four records below. No
              new origin record was written for a HIT. There is no application cache; the
              CDN-issued cache headers, reused body/fill IDs and journal counts are
              checked together.
            </p>
            <pre>
              <code>
                {JSON.stringify(
                  proof.phases.flatMap((p) => p.originEvents),
                  null,
                  2,
                )}
              </code>
            </pre>
            <p className="small">
              Recorded {proof.recordedAt} to {proof.finishedAt}.{' '}
              <a
                href={proof.recordedDeployment}
                target="_blank"
                rel="noopener noreferrer"
              >
                Recorded deployment ↗
              </a>{' '}
              (existing deployment protection may require sign-in).
            </p>
          </details>
        </li>
        <li>
          <h3>Follow the two pieces of custom code</h3>
          <p>
            Middleware chooses a separate internal cache entry for each language. On a
            MISS, the Function reads the origin’s actual response type and chooses whether
            to include Vary before the response is stored.
          </p>
          <Source names={['rewrite']}>Code: select the language’s cache identity</Source>
          <Source names={['matcher', 'response']}>
            Code: match the origin Content-Type and choose Vary
          </Source>
          <p className="small">
            Middleware runs for every request; origin fetch and response processing happen
            on a MISS. A fresh HIT does not inspect the origin again. Removing Vary safely
            depends on the explicit variant identity already being in place.
          </p>
        </li>
      </ol>
      <details className="source">
        <summary>Replay HTML → JSON with the presenter</summary>
        <p>
          The configured response-type endpoint is <code>{base}</code>. It needs the
          presenter’s owned temporary origin; opening an old sample URL alone will not
          change its response type.
        </p>
        <p>
          From the presenter’s <code>09-vary-response-type</code> test checkout, run:
        </p>
        <pre>
          <code>{`npm start\nnpm run deploy\nnode scripts/verify.mjs smoke constant-input\nnpm run stop`}</code>
        </pre>
        <p>
          The verifier creates one sample URL, sets HTML at the origin and sends
          en/fr/en/fr. It waits 26 seconds, changes only the origin to JSON, then repeats
          the same URL and headers. Look for PASS on both phases: MISS/MISS/HIT/HIT, two
          origin calls per phase, Vary absent for HTML and retained for JSON. It saves
          each response and the independent origin ledger under the printed evidence path.
        </p>
        <p className="small">
          The deploy command targets only the owned response-type test project, refreshing
          its temporary origin endpoint. Credentials stay in the test checkout and server
          environment. No public state-control API or editable endpoint profile is exposed
          here. Finish with stop; the origin also has a 55-minute watchdog.
        </p>
      </details>
      <details className="source">
        <summary>MIME patterns, cache boundaries and the native alternative</summary>
        <p>
          The tested case-insensitive prefixes are <code>text/html*</code>,{' '}
          <code>text/css*</code>, <code>text/js*</code>,{' '}
          <code>application/x-javascript*</code> and <code>image/x-icon*</code>. Literal{' '}
          <code>text/js*</code> does not match <code>text/javascript</code> or{' '}
          <code>application/javascript</code>. Confirm the customer’s exact exported rule
          before widening it.
        </p>
        <Table
          headings={['Actual origin Content-Type', 'Vary at client', 'Origin calls']}
          rows={proof.typeMatrix.map((p) => [
            p.contentType,
            p.vary || 'Absent',
            p.originCalls,
          ])}
        />
        <p className="small">
          Separate eight-type recorded matrix · 28 September 2026. Every row passed en
          MISS → fr MISS → en HIT → fr HIT. Mixed case and parameters are included. Bodies
          are diagnostic text, not an asset-rendering test.
        </p>
        <p>
          This example supports only the declared Accept-Language variant contract.
          Unexpected Vary dimensions or Set-Cookie are rejected. English/French are
          illustrative, not a confirmed customer language requirement. Browser max-age=0
          avoids a claim of long-lived downstream reuse without Vary.
        </p>
        <p>
          The older native test removed Vary after CDN storage on known URL paths. That
          remains a separate option when paths express the rule. It did not demonstrate
          choosing by the origin’s returned type. No supported native arbitrary
          origin-response Content-Type condition was established in this review.
        </p>
        <p>
          <a
            href="https://vercel.com/docs/project-configuration/vercel-json#conditional-matching-with-has-and-missing"
            target="_blank"
            rel="noopener noreferrer"
          >
            Native route conditions match incoming requests ↗
          </a>{' '}
          ·{' '}
          <a
            href="https://vercel.com/docs/caching/cdn-cache"
            target="_blank"
            rel="noopener noreferrer"
          >
            Vercel CDN cache variants ↗
          </a>
        </p>
      </details>
    </section>
  );
}

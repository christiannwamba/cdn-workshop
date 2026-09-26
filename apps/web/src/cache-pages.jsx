import React, { useState } from 'react';
import { CodeBlock } from './code-block.jsx';
import observation from './cache-observations.json';

export const cacheCatalog = [
  {
    id: 'R20',
    title: 'Can visitors share cached content?',
    status: 'supported',
    note: 'Native shared caching demonstrated on public test content; route policy remains to map.',
  },
  {
    id: 'R21',
    title: 'Can we refresh content before its TTL expires?',
    status: 'partial',
    note: 'Stale-while-revalidate is an alternative with different timing. Exact 90% prefresh is unverified.',
  },
  {
    id: 'R22',
    title: 'Can tracking links share the same cached search result?',
    status: 'workaround',
    note: 'Selected-query sharing works with an application ISR rewrite; external-origin attribution remains open.',
  },
  {
    id: 'R23',
    title: 'Can we remove Vary and keep language versions separate?',
    status: 'partial',
    note: 'Known-route removal retained CDN variants. Dynamic Content-Type matching is unverified.',
  },
  {
    id: 'R24',
    title: 'Can each audience group share its own cached content?',
    status: 'supported',
    note: 'Bounded public cookie variants share within a group and separate across groups.',
  },
].map((page) => ({ ...page, category: 'Caching', implemented: true }));

const copy = {
  r20: {
    status: 'Shared caching demonstrated',
    intro:
      'The current policy caches eligible content by route. Vercel’s native CDN can reuse a public response without calling the origin for each visitor. This test compares a first request with an exact repeat.',
    flow: 'The origin creates a fill ID and writes an independent journal record only when it executes.',
    decision:
      'Map the customer’s route TTLs, cache eligibility and personalized exceptions. The test’s 300-second TTL is an example, not the customer policy.',
  },
  r21: {
    status: 'Alternative timing · explanation only',
    intro:
      'The current policy enables cache prefresh at 90% of TTL. Vercel’s stale-while-revalidate is a proposed alternative: it can serve stale content while refreshing after the freshness period ends.',
    flow: 'Illustrative 100-second TTL. Both paths depend on a request; neither is a timer that refreshes idle content.',
    decision:
      'Agree how much staleness is acceptable and how often the origin should refresh. If refresh must begin before expiry at 90% of TTL, an exact supported mechanism still needs to be established.',
  },
  r22: {
    status: 'Application workaround demonstrated',
    intro:
      'The current search/browse rule selects which query parameters define cached content. Here, q changes the result and utm_source only tracks the visit. Native deletion and a custom Middleware → Next.js ISR rewrite both share the selected content, with different implications for the origin.',
    flow: 'Working application rewrite: the browser keeps its requested URL, while the ISR renderer receives only the canonical content query.',
    decision:
      'Confirm which browser pixels or backend services need tracking parameters, and whether application-hosted ISR is acceptable. The working rewrite does not establish cache-key control for arbitrary external origins or per-visitor origin attribution.',
  },
  r23: {
    status: 'Known-route behavior demonstrated',
    intro:
      'The current policy removes Vary for selected response content types. This Vercel test uses native response rules on known paths, while retaining separate CDN entries for English and French content.',
    flow: 'Logical stages demonstrated by the final responses and origin journal, not an internal platform trace.',
    decision:
      'Can the policy use known routes, or must it match each origin response’s Content-Type dynamically? That dynamic condition remains unverified. Browser and downstream cache behavior also needs validation before adopting removal.',
  },
  r24: {
    status: 'Bounded public variants demonstrated',
    intro:
      'The current cache policy can use cookies or flags to distinguish content. Here, native request rules map an experiment cookie to a small variant header; the CDN uses that header to keep public group content separate.',
    flow: 'The test already has an experiment cookie. Assignment policy is a separate question.',
    decision:
      'Agree the actual content-changing cookies and flags, allowed groups and sharing boundaries, including duplicate-cookie handling. This demonstrates public cohorts, not private-user authorization or arbitrary cookie-key parity.',
  },
};
const diagrams = {
  r20: `sequenceDiagram
  participant C as Client
  participant E as Vercel CDN
  participant O as Test origin
  participant J as Private origin journal
  C->>E: First request, same URL
  E->>O: MISS, fetch public content
  O->>J: Record one origin execution
  O-->>E: Body and fill ID, TTL 300s
  E-->>C: MISS, body and fill ID
  C->>E: Repeat same URL within TTL
  E-->>C: HIT, same body and fill ID
  Note over O,J: No second origin execution`,
  r21: `sequenceDiagram
  participant C as Client request
  participant E as CDN cache
  participant O as Origin
  alt Akamai prefresh, example TTL 100s
    C->>E: Request at age 90s, before expiry
    E-->>C: Cached response, still fresh
    E->>O: Background prefresh check
  else Proposed SWR, same freshness period
    C->>E: Request at age 90s
    E-->>C: Fresh response, no refresh triggered
    C->>E: Request after 100s, within stale window
    E-->>C: Stale response
    E->>O: Background revalidation
  end`,
  r22: `sequenceDiagram
  participant B as Browser
  participant M as Custom Middleware
  participant I as Next.js ISR
  participant O as Page renderer
  B->>M: q=chair and utm_source=email
  M->>I: Internal path based on q=chair
  I->>O: MISS, render canonical content
  O-->>I: Chair body and fill ID
  I-->>B: Chair result
  B->>M: q=chair and utm_source=social
  M->>I: Same internal path
  I-->>B: HIT, same chair body and fill ID
  Note over B,M: Requested URL still includes utm_source
  Note over I,O: Renderer gets no utm_source`,
  r23: `sequenceDiagram
  participant C as Client
  participant E as Vercel CDN and response rules
  participant O as Test origin
  C->>E: First English request
  E->>O: MISS, x-demo-language: en
  O-->>E: English body, Vary: x-demo-language
  E->>E: Store language variant, remove final Vary
  E-->>C: English body, Vary absent
  Note over E,O: French request creates its own entry the same way
  C->>E: Repeat English or French request
  E-->>C: HIT for that language, Vary absent`,
  r24: `sequenceDiagram
  participant C as Client
  participant E as Native rules and CDN
  participant O as Test origin
  C->>E: Cookie experiment=A
  E->>E: Set x-demo-variant: A
  E->>O: MISS for A
  O-->>E: Public A content, Vary: x-demo-variant
  E-->>C: A content and fill ID
  C->>E: Same group A, unrelated cookie changes
  E-->>C: HIT, same A content and fill ID
  C->>E: Cookie experiment=B
  E->>E: Set x-demo-variant: B
  E->>O: MISS for B
  O-->>E: Public B content, Vary: x-demo-variant
  E-->>C: B content and different fill ID`,
};
const docs = {
  cache: 'https://vercel.com/docs/caching/cdn-cache',
  headers: 'https://vercel.com/docs/caching/cache-control-headers',
  isr: 'https://nextjs.org/docs/pages/guides/incremental-static-regeneration',
  prefresh: 'https://techdocs.akamai.com/property-mgr/docs/know-caching#prefresh',
};
function Link({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children} ↗
    </a>
  );
}
function Source({ name, children }) {
  const [open, setOpen] = useState(false);
  const source = observation.sources[name];
  return (
    <details className="source" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>{children}</summary>
      <p className="small">
        Recorded test source · 24 September 2026 ·{' '}
        <code>
          {source.path}:{source.first}–{source.last}
        </code>
      </p>
      {open && <CodeBlock source={{ ...source, code: source.displayCode }} />}
      <p className="small">
        Formatting expanded for readability. Source excerpt from the existing cache test,
        not source at this workshop’s Git revision. File SHA-256:{' '}
        <code>{source.fileSha256}</code>.
      </p>
    </details>
  );
}
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
function Recorded() {
  return (
    <p className="small">
      Recorded hosted observations · 24 September 2026. These results do not rerun when
      you open this page.
    </p>
  );
}
function Results({ data, labels, vary = false }) {
  return (
    <Table
      headings={[
        'Request',
        'Cache',
        'Content',
        'Fill ID',
        ...(vary ? ['Vary at client'] : []),
      ]}
      rows={data.requests.map((r, i) => [
        labels[i],
        r.cache,
        r.content,
        <code title={r.fill}>{r.fill.slice(0, 8)}</code>,
        ...(vary ? [r.vary || 'Absent'] : []),
      ])}
    />
  );
}
function Evidence({ data, children }) {
  return (
    <details className="source">
      <summary>Test details and independent origin evidence</summary>
      <p>
        Verified run: {observation.startedAt} to {observation.verifiedAt}.{' '}
        <Link href={observation.deployment}>Recorded deployment</Link>.
      </p>
      {children}
      <p>
        The origin wrote durable private journal records when it executed. The selected
        fields below are recorded evidence; the response’s fill ID alone is not an
        independent origin count. Journal access remains protected.
      </p>
      <pre>
        <code>{JSON.stringify(data, null, 2)}</code>
      </pre>
      <p className="small">
        Recorded source digest: <code>{observation.sourceDigest}</code>. Only selected
        synthetic fields are included.
      </p>
    </details>
  );
}
const shellQuote = (s) => `'${s.replaceAll("'", "'\\''")}'`;
function commandText(id, base) {
  const start = `# Hosted synthetic test; each run uses a fresh cache path.\ncache_base=${shellQuote(base)}\ncache_run="workshop-$(uuidgen | tr '[:upper:]' '[:lower:]')"\n`;
  if (id === 'r20')
    return (
      start +
      `\n# Send the exact URL twice; inspect headers AND response body.\nfor attempt in 1 2; do\n  curl -q -sS --max-time 30 -D - "$cache_base/baseline/$cache_run?q=chair"\n  echo\ndone`
    );
  if (id === 'r22')
    return (
      start +
      `\n# Six requests per mode: chair/email, chair/social, repeat; then table.\nfor mode in baseline normalized rewrite; do\n  for term in chair table; do\n    for tracking in email social email; do\n      echo "$mode: q=$term, utm_source=$tracking"\n      curl -q -sS --max-time 30 -D - "$cache_base/$mode/$cache_run-$mode?q=$term&utm_source=$tracking"\n      echo\n    done\n  done\ndone`
    );
  if (id === 'r23')
    return (
      start +
      `\n# Same path, alternate language headers, then repeat both.\nfor language in en fr en fr; do\n  curl -q -sS --max-time 30 -D - -H "x-demo-language: $language" "$cache_base/vary/html/$cache_run"\n  echo\ndone`
    );
  return (
    start +
    `\n# Terminal Cookie headers: these are not browser-cookie actions.\nfor cookie in 'experiment=A; other=1' 'experiment=A; other=2' 'experiment=B' 'experiment=B; other=3'; do\n  curl -q -sS --max-time 30 -D - -H "Cookie: $cookie" "$cache_base/experiment/$cache_run"\n  echo\ndone`
  );
}
function Commands({ id, base }) {
  const [notice, setNotice] = useState('');
  const commands = commandText(id, base);
  return (
    <details className="source">
      <summary>Copyable commands for the hosted test</summary>
      <pre>
        <code>{commands}</code>
      </pre>
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(commands);
            setNotice('Commands copied.');
          } catch {
            setNotice('Copy unavailable; select the commands above.');
          }
        }}
      >
        Copy commands
      </button>
      <span className="small" role="status">
        {' '}
        {notice}
      </span>
      <p className="small">
        Run in a macOS/Linux terminal with curl and uuidgen. Rerun the whole block for a
        fresh path; it does not purge existing content. The page sends no test requests.
        Run the sequence within the 300-second test TTL.
      </p>
    </details>
  );
}
function Repeat({ id, base, children }) {
  const path = {
    r20: '/baseline/',
    r22: '/baseline/, /normalized/ and /rewrite/',
    r23: '/vary/html/',
    r24: '/experiment/',
  }[id];
  return (
    <li>
      <h3>Repeat against the hosted endpoint</h3>
      <p>
        Use <code>{base}</code> with <code>{path}</code> and a fresh path suffix from the
        commands.
      </p>
      <p>{children}</p>
      <Commands id={id} base={base} />
      <p className="small">
        Commands show current headers and content. Independent origin counts below come
        from the dated authenticated run, not a public journal API.
      </p>
    </li>
  );
}
function Baseline({ base }) {
  const data = observation.r20;
  return (
    <section>
      <h2>Compare the first request and its repeat</h2>
      <Recorded />
      <ol className="exercise">
        <li>
          <h3>Check the content and origin calls</h3>
          <Results
            data={data}
            labels={['First request', 'Exact repeat after 15 seconds']}
          />
          <p>
            The full response body and fill ID were identical. The independent origin
            journal contains <strong>one execution</strong> for this pair.
          </p>
          <Source name="cache">Code: record an origin fill and set cache headers</Source>
        </li>
        <Repeat id="r20" base={base}>
          Inspect <code>x-vercel-cache</code>, <code>x-origin-fill</code> and the body.
          Expect MISS → HIT with the same fill and content.
        </Repeat>
      </ol>
      <Evidence data={data.origin}>
        <p>
          The recorded repeat followed a 15-second idle interval inside the 300-second
          TTL. Full body equality: {String(data.sameBody)}. This is an owned Function
          origin.
        </p>
      </Evidence>
    </section>
  );
}
function Query({ base }) {
  const modes = ['baseline', 'normalized', 'rewrite'];
  const names = ['Unchanged query', 'Native query deletion', 'Middleware + Next.js ISR'];
  const labels = [
    'chair / email',
    'chair / social',
    'chair / email again',
    'table / email',
    'table / social',
    'table / email again',
  ];
  return (
    <section>
      <h2>Change tracking, then change the search</h2>
      <Recorded />
      <ol className="exercise">
        <li>
          <h3>Compare the three approaches</h3>
          <Table
            headings={[
              'Approach',
              'Chair: email → social → email',
              'Origin fills¹',
              'Query at origin on a fill',
            ]}
            rows={modes.map((mode, i) => [
              names[i],
              observation.r22[mode].requests
                .slice(0, 3)
                .map((r) => r.cache)
                .join(' → '),
              observation.r22[mode].origin.count,
              i === 0
                ? 'q + utm_source'
                : i === 1
                  ? 'q; utm_source deleted'
                  : 'Canonical q in the ISR renderer',
            ])}
          />
          <p className="small">
            ¹ Six requests per approach: three for chair, then three for table. Each
            approach returns separate chair and table content.
          </p>
          <p>
            Native deletion removes <code>utm_source</code> from the request; it is not an
            independently configurable cache key. The successful custom rewrite uses ISR
            instead of the plain Function response cache.
          </p>
          <p>
            The browser keeps <code>?q=chair&amp;utm_source=social</code> in its address
            bar. That does not mean the origin receives it: the ISR renderer sees only
            canonical content parameters, and a HIT makes no origin call.
          </p>
          <Source name="query">Config: delete utm_source from the native request</Source>
          <Source name="rewrite">
            Code: turn the content query into an internal path
          </Source>
          <Source name="isr">Code: render and cache that path with Next.js ISR</Source>
          <details className="source">
            <summary>Per-request results and implementation trade-offs</summary>
            {modes.map((mode, i) => (
              <div key={mode}>
                <h3>{names[i]}</h3>
                <Results data={observation.r22[mode]} labels={labels} />
              </div>
            ))}
            <p>
              The earlier plain Middleware → Function-cache rewrite failed selected-query
              sharing. The working ISR path adds Middleware on each request, ISR
              reads/writes and a first-fill render. This is a different cache
              architecture; no cost or performance equivalence is claimed.
            </p>
            <p>
              The test excludes utm_source, keeps other decoded query pairs, sorts keys
              and preserves duplicate-value order. This example does not replace the
              customer’s exact include/exclude rule.
            </p>
            <p>
              <Link href={docs.isr}>Next.js ISR behavior</Link>
            </p>
          </details>
        </li>
        <Repeat id="r22" base={base}>
          Compare <code>x-vercel-cache</code> and the body’s <code>fill</code>,{' '}
          <code>content</code> and <code>query</code>. In the two sharing approaches,
          chair/email and chair/social reuse a fill; table starts a different fill. The
          ISR fill is in the HTML body, not x-origin-fill.
        </Repeat>
      </ol>
      <Evidence
        data={Object.fromEntries(
          modes.map((mode) => [mode, observation.r22[mode].origin]),
        )}
      />
    </section>
  );
}
function Vary({ base }) {
  const data = observation.r23.html;
  return (
    <section>
      <h2>Alternate languages on one URL</h2>
      <Recorded />
      <ol className="exercise">
        <li>
          <h3>Check the language and the final Vary header</h3>
          <Results
            data={data}
            labels={['English', 'French', 'English again', 'French again']}
            vary
          />
          <p>
            English and French keep different fills. Each repeat reuses its own language,
            while the client receives no Vary header. The independent journal records two
            origin executions.
          </p>
          <Source name="cache">Code: generate content and the origin Vary header</Source>
          <Source name="vary">Config: remove Vary on known response paths</Source>
          <details className="source">
            <summary>Other tested response types and downstream scope</summary>
            <Table
              headings={[
                'Route type',
                'Response Content-Type',
                'Vary at client',
                'Origin fills',
              ]}
              rows={Object.entries(observation.r23).map(([type, result]) => [
                type,
                result.requests[0].contentType,
                result.requests[0].vary || 'Absent',
                result.origin.count,
              ])}
            />
            <p>
              All six sequences retained language separation. JSON is outside the deletion
              rule and kept Vary. The test’s JavaScript route emits text/javascript; the
              customer’s text/js* rule still needs exact mapping.
            </p>
            <p>
              Removal is a final response rule, not deletion of Vary before CDN storage.
              The test sends browser max-age=0; this CDN evidence alone does not establish
              safe reuse in browsers or downstream caches without Vary.
            </p>
            <p>
              <Link href={docs.cache}>Vercel CDN cache variants</Link>
            </p>
          </details>
        </li>
        <Repeat id="r23" base={base}>
          Send <code>x-demo-language: en</code> and <code>fr</code> to the same URL, then
          repeat both. Check <code>x-vercel-cache</code>, <code>x-origin-fill</code>, Vary
          and the body. Expect en MISS → fr MISS → en HIT → fr HIT, with Vary absent.
        </Repeat>
      </ol>
      <Evidence data={data.origin} />
    </section>
  );
}
function Cohorts({ base }) {
  const data = observation.r24;
  return (
    <section>
      <h2>Keep the group, then change it</h2>
      <Recorded />
      <ol className="exercise">
        <li>
          <h3>Compare two public groups</h3>
          <Results data={data} labels={['A; other=1', 'A; other=2', 'B', 'B; other=3']} />
          <p>
            Changing an unrelated cookie keeps the group’s fill. Switching A → B changes
            both the content and the fill. Native rules derive <code>x-demo-variant</code>
            ; the origin response varies on that header.
          </p>
          <Source name="cohorts">Config: map experiment=A to the variant header</Source>
          <Source name="cache">Code: return group content with Vary</Source>
        </li>
        <Repeat id="r24" base={base}>
          The terminal sends explicit Cookie headers to one <code>/experiment/</code> URL.
          Inspect <code>x-origin-fill</code> and <code>experiment:A</code> or{' '}
          <code>experiment:B</code> in the body. Expect MISS → HIT within each group.
          These commands do not set cookies in your browser.
        </Repeat>
      </ol>
      <Evidence data={data.origin}>
        <p>
          The full recorded run also included control-group and forged-header checks:
          three origin executions in total, one each for A, B and control. The main
          comparison above selects the four A/B requests; generic validation cases stay
          outside the exercise.
        </p>
      </Evidence>
    </section>
  );
}
function Refresh() {
  return (
    <section>
      <h2>Choose the freshness and load trade-off</h2>
      <p>
        With a 100-second TTL, a request after 90 seconds can trigger Akamai prefresh
        while the response is still fresh. With a 100-second freshness period and SWR,
        background revalidation waits for a request after 100 seconds; that request can
        receive stale content.
      </p>
      <p>
        A shorter freshness period plus a bounded stale window is a possible alternative,
        but changes freshness and origin load. It does not reproduce a 90%-of-TTL trigger.
      </p>
      <details className="source">
        <summary>Timing references</summary>
        <p>
          <Link href={docs.prefresh}>Akamai request-triggered prefresh</Link> ·{' '}
          <Link href={docs.headers}>Vercel stale-while-revalidate</Link>
        </p>
        <p>
          Documentation checked 27 September 2026. This page is an explanation; no 90%
          refresh experiment has been run. The cache test’s 300-second settings do not
          prove this requirement.
        </p>
      </details>
    </section>
  );
}
export function CachePage({ id, profile, Diagram }) {
  const page = cacheCatalog.find((p) => p.id.toLowerCase() === id);
  const content = copy[id];
  const base = profile.fixtures.cache.url.replace(/\/$/, '');
  return (
    <>
      <a className="back" href="#index">
        ← All requirements
      </a>
      <div className="hero">
        <span className={`badge ${page.status}`}>
          {page.id} · {content.status}
        </span>
        <h1>{page.title}</h1>
        <p className="lede">{content.intro}</p>
        {id === 'r21' && (
          <p className="small">
            Explanation only. Exact pre-expiry refresh is not demonstrated.
          </p>
        )}
      </div>
      <Diagram key={id} id={id} source={diagrams[id]} description={content.flow} />
      {id === 'r20' ? (
        <Baseline base={base} />
      ) : id === 'r21' ? (
        <Refresh />
      ) : id === 'r22' ? (
        <Query base={base} />
      ) : id === 'r23' ? (
        <Vary base={base} />
      ) : (
        <Cohorts base={base} />
      )}
      <section>
        <h2>{id === 'r20' || id === 'r24' ? 'Customer policy to agree' : 'Decision'}</h2>
        <p>{content.decision}</p>
        <p className="related">
          Related:{' '}
          {cacheCatalog
            .filter((r) => r.id !== page.id)
            .map((r, i) => (
              <React.Fragment key={r.id}>
                {i > 0 && ' · '}
                <a href={`#${r.id.toLowerCase()}`}>
                  {r.id} ·{' '}
                  {
                    {
                      R20: 'Shared cache',
                      R21: 'Refresh timing',
                      R22: 'Query parameters',
                      R23: 'Vary removal',
                      R24: 'Cookie groups',
                    }[r.id]
                  }
                </a>
              </React.Fragment>
            ))}
        </p>
      </section>
    </>
  );
}

import { OriginalRequirementDetails } from './original-requirements.jsx';
import {
  CodeExample,
  FoldedEvidence,
  polishedDiagramLayout,
} from './page-presentation.jsx';
import { HomeLink } from './home-link.jsx';
import { ComparisonDiagram } from './comparison-diagram.jsx';
import React, { useState } from 'react';
import { CodeBlock } from './code-block.jsx';
import observation from './cache-observations.json';
import { VarySolution } from './r23-solution.jsx';
import previousVaryDiagram from './r23-previous-diagram.json';

export const cacheCatalog = [
  {
    id: 'R20',
    implementation: 'Native configuration',
    title: 'Can visitors share cached content?',
    status: 'supported',
    note: 'Native shared caching demonstrated on public test content; route policy remains to map.',
  },
  {
    id: 'R21',
    implementation: 'Native configuration · SWR alternative',
    title: 'Can we refresh content before its TTL expires?',
    status: 'partial',
    note: 'Stale-while-revalidate is an alternative with different timing. Exact 90% prefresh is unverified.',
  },
  {
    id: 'R22',
    implementation: 'Middleware + application ISR rewrite',
    title: 'Can tracking links share the same cached search result?',
    status: 'workaround',
    note: 'Selected-query sharing works with an application ISR rewrite; external-origin attribution remains open.',
  },
  {
    id: 'R23',
    implementation: 'Middleware + Function on cache miss',
    title: 'Can we choose which responses lose Vary by their content type?',
    status: 'workaround',
    note: 'Custom origin-response Content-Type rule demonstrated with explicit CDN variant identity.',
  },
  {
    id: 'R24',
    implementation: 'Native configuration',
    title: 'Can each audience group share its own cached content?',
    status: 'supported',
    note: 'Bounded public cookie variants share within a group and separate across groups.',
  },
].map((page) => ({ ...page, category: 'Caching', implemented: true }));

const copy = {
  r20: {
    status: 'Shared caching demonstrated',
    intro:
      'Vercel’s CDN shares eligible public responses between visitors, using the route’s cache policy. A fresh cache hit reuses the stored response without calling the origin again.',
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
      'The search/browse rule needs content-changing query parameters to separate cached results while tracking parameters share them. The demonstrated Vercel approach uses Middleware and Next.js ISR to keep q in the cache identity and exclude utm_source, while preserving the browser URL.',
    flow: 'Working application rewrite: the browser keeps its requested URL, while the ISR renderer receives only the canonical content query.',
    decision:
      'Confirm which browser pixels or backend services need tracking parameters, and whether application-hosted ISR is acceptable. The working rewrite does not establish cache-key control for arbitrary external origins or per-visitor origin attribution.',
  },
  r23: {
    status: 'Workaround · response-type rule demonstrated',
    intro:
      'The rule removes Vary when the origin’s response Content-Type matches, while keeping cached variants separate. Vercel’s demonstrated approach selects a variant in Middleware before cache lookup, then uses a Function on a MISS to check Content-Type and choose the stored headers.',
    scope:
      'The browser keeps the same URL. The test switched the origin from HTML to JSON: HTML lost Vary, JSON kept it, and both retained separate English and French content.',
    flow: 'Routing Middleware runs globally before cache lookup. The Node.js Vercel Function runs in London (lhr1) in this demo. Both run inside Vercel; only a MISS reaches the Function and external origin. English/French are illustrative variants.',
    decision:
      'Map every customer content variant into the cache identity and confirm the exact MIME rules. Validate downstream caching before adopting removal: this test gives browsers zero freshness, while Vercel caches each variant for 20 seconds.',
  },
  r24: {
    status: 'Bounded public variants demonstrated',
    intro:
      'Native request rules map an experiment cookie to a bounded audience header, and the response’s Vary header gives each public group its own cached content. Visitors in the same group share a response even when unrelated cookies differ.',
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
  participant B as Browser
  participant M as Routing Middleware
  participant C as Vercel CDN cache
  participant F as Node.js Vercel Function
  participant O as External origin
  B->>M: Same public URL, selected language
  M->>C: Internal language identity, then cache lookup
  alt Fresh HIT
    C-->>B: Stored body and headers for that language
    Note over F,O: No Function or origin call
  else MISS
    C->>F: Run response handler
    F->>O: Fetch selected language
    O-->>F: Body, Content-Type and Vary
    F->>F: Matching type removes Vary, other types keep it
    F-->>C: Cacheable body and chosen headers
    C->>C: Store under explicit language identity
    C-->>B: Body and chosen headers
  end`,
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
// R23 presentation: Mermaid layout/typography for both comparison tabs. Colors come
// from page CSS (theme-aware); the editable diagram text is unchanged.
const varyDifference = [
  'Vercel uses Middleware to give each language its own cache entry. On a cache miss, a Function reads the origin’s response type and decides whether to keep Vary before the response is stored; a cache hit reuses that stored result without running the Function or calling the origin.',
  'The tested outcome matches the rule: HTML lost Vary, JSON kept it, and each language stayed separate. The difference is that this is custom code you maintain, not a native CDN rule that checks the origin’s response type.',
];
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
function CacheDemo({ id, base }) {
  const isQuery = id === 'r22';
  return (
    <section>
      <p>Recorded 24 September 2026. Opening this page does not rerun these requests.</p>
      <p>
        {id === 'r20'
          ? 'Request the same URL twice. Compare the cache header, response body and fill ID.'
          : isQuery
            ? 'Change only the tracking parameter, then change the search term. Compare the cached content and fill ID.'
            : 'Request as group A twice, then group B twice. Compare the content and fill ID within each group.'}
      </p>
      {isQuery ? (
        <Table
          headings={[
            'Approach',
            'Chair: email → social → email',
            'Origin fills (six requests)',
          ]}
          rows={['baseline', 'normalized', 'rewrite'].map((mode, i) => [
            ['Unchanged query', 'Native query deletion', 'Middleware + Next.js ISR'][i],
            observation.r22[mode].requests
              .slice(0, 3)
              .map((r) => r.cache)
              .join(' → '),
            observation.r22[mode].origin.count,
          ])}
        />
      ) : (
        <Results
          data={observation[id]}
          labels={
            id === 'r20'
              ? ['First request', 'Repeat after 15 seconds']
              : ['A; other=1', 'A; other=2', 'B', 'B; other=3']
          }
        />
      )}
      <p>
        {id === 'r20'
          ? 'Expected: MISS then HIT, with the same content and fill. The recorded pair called the origin once.'
          : isQuery
            ? 'The working ISR rewrite shares a fill across tracking values and keeps different search terms separate. The browser URL remains unchanged; a cache hit does not call the origin.'
            : 'Expected: MISS then HIT for each group. Unrelated cookies do not split the group’s cache entry.'}
      </p>
      <h3>Try it</h3>
      <p>
        Run these commands in a terminal. They create a fresh test URL; compare the
        response headers and content with the recorded result above.
      </p>
      <pre>
        <code>{commandText(id, base)}</code>
      </pre>
    </section>
  );
}
function Baseline({ base }) {
  return <CacheDemo id="r20" base={base} />;
}
function Query({ base }) {
  return <CacheDemo id="r22" base={base} />;
}
function Cohorts({ base }) {
  return <CacheDemo id="r24" base={base} />;
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

// The four remaining cache pages reuse the approved presentation primitives.
// Keep the old diagrams above as exact default migrations; custom edits survive.
const cachePresentation = {
  r20: {
    source: `sequenceDiagram
  participant B as Browser
  participant C as Vercel CDN cache
  participant O as Content origin
  B->>C: Request eligible public content
  alt Fresh HIT
    C-->>B: Stored public response
  else MISS
    C->>O: Fetch content
    O-->>C: Public response and shared-cache TTL
    C->>C: Store eligible response
    C-->>B: Public response
  end`,
    description:
      'The recorded example uses a Vercel Function as the content origin. A fresh HIT skips that Function; shared caching applies only to eligible public responses.',
    actorRoles: { C: 'vercel' },
  },
  r21: {
    required: `sequenceDiagram
  participant B as Browser
  participant C as CDN cache
  participant O as Content origin
  Note over B,O: Required timing, illustrative TTL 100 seconds
  B->>C: Request at age 90 seconds, before expiry
  C-->>B: Cached response, still fresh
  C->>O: Background prefresh check before expiry
  O-->>C: Refresh cached content`,
    source: `sequenceDiagram
  participant B as Browser
  participant C as Vercel CDN cache
  participant O as Content origin
  Note over B,O: SWR alternative, freshness period 100 seconds
  B->>C: Request at age 90 seconds
  C-->>B: Fresh response, no refresh triggered
  B->>C: Request after 100 seconds, within stale window
  C-->>B: Stale response
  C->>O: Background revalidation after expiry
  O-->>C: Refresh cached content`,
    requiredDescription:
      'Required pre-expiry timing, not an internal CDN trace. Prefresh depends on a request; it does not refresh idle content on a timer.',
    description:
      'SWR is a request-triggered alternative with different timing. This is an explanation, not a recorded refresh experiment.',
    difference:
      'At 90 seconds of a 100-second TTL, prefresh can start while content is still fresh. SWR waits for a request after the freshness period ends and can serve stale content during revalidation. A shorter TTL changes freshness and origin load; it does not implement the exact 90%-of-TTL trigger. An exact supported pre-expiry mechanism remains unverified.',
    actorRoles: { C: 'vercel' },
  },
  r22: {
    required: `sequenceDiagram
  participant B as Browser
  participant C as Required shared cache
  participant O as Content origin
  B->>C: q=chair and utm_source=email
  C->>C: Select identity from content query q=chair
  C->>O: MISS, fetch chair content
  O-->>C: Chair result
  C-->>B: Chair result
  B->>C: q=chair and utm_source=social
  C-->>B: HIT, same chair result
  B->>C: q=table and utm_source=social
  C->>O: Different identity, fetch table content
  O-->>C: Table result
  C-->>B: Table result`,
    source: `sequenceDiagram
  participant B as Browser
  participant M as Routing Middleware
  participant C as Next.js ISR cache
  participant F as Page renderer
  B->>M: q=chair and utm_source=email
  M->>C: Rewrite to internal identity containing q=chair
  C->>F: MISS, render canonical query
  F-->>C: Chair result, revalidate 300 seconds
  C-->>B: Chair result
  B->>M: q=chair and utm_source=social
  M->>C: Same internal identity
  C-->>B: HIT, same chair result
  Note over B,M: Browser URL keeps utm_source
  Note over C,F: Renderer receives canonical query, without utm_source`,
    requiredDescription:
      'Required sharing outcome, not guessed CDN internals. q changes the content; utm_source does not. Tracking data must remain available to its agreed consumers; their delivery path is a separate contract.',
    description:
      'Tested application path: Middleware runs before the ISR cache lookup; a fresh HIT skips the page renderer. Changing q selects a different internal path.',
    difference: [
      'The application rewrite preserves the browser URL, but the ISR renderer receives only the canonical query and a HIT makes no renderer call. This proves selected-query sharing with Next.js ISR; it does not establish arbitrary external-origin cache-key control or per-visitor origin attribution.',
      'This approach adds Middleware on each request, ISR reads/writes and a first-fill render. Confirm tracking consumers and whether application-hosted ISR is acceptable; no cost or performance equivalence is claimed.',
    ],
    actorRoles: { M: 'vercel', C: 'vercel', F: 'vercel' },
  },
  r24: {
    source: `sequenceDiagram
  participant B as Browser
  participant R as Native request rules
  participant C as Vercel CDN cache
  participant O as Content origin
  B->>R: Cookie experiment=A
  R->>C: Set audience header A, then cache lookup
  C->>O: MISS for group A
  O-->>C: Public A content, Vary on audience header
  C-->>B: A content
  B->>R: Same group A, unrelated cookie changes
  R->>C: Same audience header A
  C-->>B: HIT, same A content
  B->>R: Cookie experiment=B
  R->>C: Set audience header B
  C->>O: MISS for group B
  O-->>C: Public B content, Vary on audience header
  C-->>B: B content`,
    description:
      'Rules select the group before cache lookup and overwrite the incoming variant header. The origin response varies on that header. This demonstrates bounded public cohorts, not private-user authorization or automatic arbitrary-cookie cache keys.',
    actorRoles: { R: 'vercel', C: 'vercel' },
  },
};
function CacheImplementation({ id }) {
  return (
    <section>
      <h2>Implementation example</h2>
      {id === 'r20' && (
        <>
          <p>
            The tested response allows 300 seconds of shared-cache freshness and gives
            browsers zero freshness. Apply a sharing policy only to eligible public
            content; authenticated or private responses need their own policy.
          </p>
          <CodeExample
            source={{ path: 'handlers/cache.mjs' }}
            role="Recorded response-header field · 24 September 2026"
            code={`'cache-control': 'public, max-age=0, s-maxage=300'`}
          />
        </>
      )}
      {id === 'r21' && (
        <>
          <p>
            An illustrative SWR response header gives shared caches 100 seconds of
            freshness and a 30-second stale window. This configures the alternative, not
            pre-expiry refresh; it has not been exercised by this page’s cache tests.
          </p>
          <CodeExample
            source={{ path: 'response-headers.http' }}
            role="Illustrative SWR alternative · not a recorded implementation"
            code={`Cache-Control: public, max-age=0, s-maxage=100, stale-while-revalidate=30`}
          />
        </>
      )}
      {id === 'r22' && (
        <>
          <p>
            After validation, the tested Middleware excludes <code>utm_source</code>,
            keeps other content-query pairs and sorts their keys while preserving
            duplicate-value order. The relevant rewrite is:
          </p>
          <CodeExample
            source={{ path: 'proxy.js' }}
            role="Recorded rewrite · selected lines, diagnostic headers omitted"
            code={`const identity = Buffer.from(JSON.stringify(pairs)).toString('base64url');
url.pathname = \`/internal/\${namespace}/\${identity}\`;
url.search = '';
const response = NextResponse.rewrite(url);`}
          />
          <CodeExample
            source={{ path: 'pages/internal/[namespace]/[identity].jsx' }}
            role="Recorded getStaticProps return field · ISR freshness"
            code={`revalidate: 300`}
          />
          <p className="small">
            The internal route renders the canonical query with Next.js ISR. Validation
            and complete source remain in the recorded walkthrough.
          </p>
        </>
      )}
      {id === 'r24' && (
        <>
          <p>
            The test first overwrites the audience header with <code>control</code>, then
            maps the allowed A/B cookies. This is the A rule; a matching B rule selects B.
            The response uses that same header for cache separation.
          </p>
          <CodeExample
            source={{ path: 'vercel.json' }}
            role="Recorded native A rule · formatting condensed"
            code={`{
  "src": "/(?:experiment/.*|api/cache)",
  "has": [{ "type": "cookie", "key": "experiment", "value": "A" }],
  "continue": true,
  "transforms": [{
    "type": "request.headers", "op": "set",
    "target": { "key": "x-demo-variant" }, "args": "A"
  }]
}`}
          />
          <CodeExample
            source={{ path: 'handlers/cache.mjs' }}
            role="Recorded response field · public group content"
            code={`if (experiment) headers.vary = 'x-demo-variant';`}
          />
        </>
      )}
    </section>
  );
}
function PresentedCachePage({ id, page, content, base, Diagram }) {
  const presentation = cachePresentation[id];
  return (
    <div className="page-polish">
      <HomeLink className="back">← All requirements</HomeLink>
      <div className="hero">
        <span className={`badge ${page.status}`}>
          {page.id} · {content.status}
        </span>
        <h1>{page.title}</h1>
        <p className="lede">{content.intro}</p>
        <OriginalRequirementDetails id={id} />
      </div>
      {presentation.required ? (
        <ComparisonDiagram
          id={id}
          Diagram={Diagram}
          difference={presentation.difference}
          differencePlacement="below"
          diagramProps={{
            variant: 'polished',
            hideTitle: true,
            renderConfig: polishedDiagramLayout,
          }}
          required={{
            source: presentation.required,
            description: presentation.requiredDescription,
          }}
          approach={{
            source: presentation.source,
            previousSource: diagrams[id],
            description: presentation.description,
            actorRoles: presentation.actorRoles,
          }}
        />
      ) : (
        <Diagram
          id={id}
          title="Cache path"
          source={presentation.source}
          previousSource={diagrams[id]}
          description={presentation.description}
          actorRoles={presentation.actorRoles}
          variant="polished"
          renderConfig={polishedDiagramLayout}
        />
      )}
      <CacheImplementation id={id} />
      <section>
        <p>{content.decision}</p>
        {id !== 'r21' && (
          <FoldedEvidence title="Demo">
            <CacheDemo id={id} base={base} />
          </FoldedEvidence>
        )}
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
    </div>
  );
}

export function CachePage({ id, profile, Diagram }) {
  const page = cacheCatalog.find((p) => p.id.toLowerCase() === id);
  const content = copy[id];
  const base = profile.fixtures.cache.url.replace(/\/$/, '');
  if (cachePresentation[id])
    return (
      <PresentedCachePage
        key={id}
        id={id}
        page={page}
        content={content}
        base={base}
        Diagram={Diagram}
      />
    );
  // R23 is the local presentation iteration: scope its spacing/diagram/code styling.
  const Wrapper = id === 'r23' ? 'div' : React.Fragment;
  const wrapperProps = id === 'r23' ? { className: 'page-polish' } : {};
  return (
    <Wrapper {...wrapperProps}>
      <HomeLink className="back">← All requirements</HomeLink>
      <div className="hero">
        <span className={`badge ${page.status}`}>
          {page.id} · {content.status}
        </span>
        <h1>{page.title}</h1>
        <p className="lede">{content.intro}</p>
        <OriginalRequirementDetails id={id} />
        {id === 'r21' && (
          <p className="small">
            Explanation only. Exact pre-expiry refresh is not demonstrated.
          </p>
        )}
      </div>
      {id === 'r23' ? (
        <ComparisonDiagram
          id={id}
          Diagram={Diagram}
          difference={varyDifference}
          differencePlacement="below"
          differenceTitle="What changes with Vercel"
          diagramProps={{
            variant: 'polished',
            hideTitle: true,
            renderConfig: polishedDiagramLayout,
          }}
          required={{
            source: `sequenceDiagram
  participant B as Browser
  participant C as CDN cache and response policy
  participant O as External origin
  B->>C: Same public URL, selected language
  alt Fresh HIT
    C->>C: Select stored language variant
  else MISS
    C->>O: Fetch selected language
    O-->>C: Body, Content-Type and Vary
    C->>C: Store with correct language separation
  end
  C->>C: Matching response type removes outgoing Vary, other types keep it
  C-->>B: Body and chosen headers`,
            description:
              'Required behavior, not a claim about the customer’s internal CDN architecture. English/French illustrate two variants; the rule reads response Content-Type.',
          }}
          approach={{
            actorRoles: { M: 'vercel', C: 'vercel', F: 'vercel' },
            source: diagrams[id],
            previousSource: previousVaryDiagram,
            description: content.flow,
          }}
        />
      ) : (
        <Diagram
          key={id}
          id={id}
          source={diagrams[id]}
          previousSource={id === 'r23' ? previousVaryDiagram : undefined}
          description={content.flow}
        />
      )}
      {id === 'r20' ? (
        <Baseline base={base} />
      ) : id === 'r21' ? (
        <Refresh />
      ) : id === 'r22' ? (
        <Query base={base} />
      ) : id === 'r23' ? (
        <VarySolution decision={content.decision} />
      ) : (
        <Cohorts base={base} />
      )}
      <section>
        {id !== 'r23' && (
          <>
            <h2>
              {id === 'r20' || id === 'r24' ? 'Customer policy to agree' : 'Decision'}
            </h2>
            <p>{content.decision}</p>
          </>
        )}
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
    </Wrapper>
  );
}

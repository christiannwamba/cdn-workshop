import React, { useState } from 'react';
import { CodeBlock } from './code-block.jsx';
import observation from './gap-observations.json';
import previousDiagrams from './gap-diagram-previous.json';

export const gapCatalog = [
  {
    id: 'R05',
    title: 'Can we reject POSTs only when Content-Length is absent?',
    status: 'gap',
    category: 'Request policy',
    note: 'Original absent and explicit-zero headers were indistinguishable in the tested path.',
    implemented: true,
  },
  {
    id: 'R06',
    title: 'Can the first HTTP redirect return 301?',
    status: 'partial',
    category: 'Redirects and headers',
    note: 'Configured HTTPS routes returned 301; the automatic HTTP upgrade returned 308.',
    implemented: true,
  },
  {
    id: 'R09',
    title: 'Can we remove headers from every required response?',
    status: 'partial',
    category: 'Redirects and headers',
    note: 'Removal worked on tested application responses; platform redirects retained Server.',
    implemented: true,
  },
  {
    id: 'R29',
    title: 'How do we replace SureRoute’s origin path optimization?',
    status: 'gap',
    category: 'Origin networking',
    note: 'An equivalent customer-configurable external-origin policy has not been demonstrated.',
    implemented: true,
  },
];
const diagrams = {
  r05: `sequenceDiagram
  participant C as Client
  participant V as Vercel route and Function checks
  C->>V: POST /native, no Content-Length
  V-->>C: Header seen as missing
  C->>V: POST /native, Content-Length 0
  V-->>C: Header also seen as missing`,
  r06: `sequenceDiagram
  participant C as Client
  participant P as Platform HTTP entry
  participant R as Configured HTTPS route
  C->>P: HTTP /probe + query
  P-->>C: 308 to HTTPS /probe + same query
  Note over C,R: Separate test request below
  C->>R: HTTPS /configured-redirect + query
  R-->>C: 301 to /probe + same query`,
  r09: `sequenceDiagram
  participant C as Client
  participant V as Vercel routing and responses
  participant A as Application
  participant T as Response header rules
  alt Application response
    C->>V: HTTPS /probe
    V->>A: Request application
    A-->>V: 200 with synthetic Server and X-Powered-By
    V->>T: Apply configured response rules
    T-->>V: Delete both headers, set x-pack-transform
    V-->>C: 200, Server absent, x-pack-transform applied
  else Automatic HTTP redirect
    C->>V: HTTP /probe
    V->>V: Automatic redirect to HTTPS
    V-->>C: 308, Server Vercel, x-pack-transform absent
  else Configured HTTPS redirect
    C->>V: HTTPS /configured-redirect
    V->>V: Configured route returns 301
    V-->>C: 301, Server Vercel, x-pack-transform absent
  end`,
  r29: `sequenceDiagram
  participant V as Visitor
  participant A as Akamai CDN
  participant O as External origin
  V->>A: Request that needs an origin response
  Note over A,O: SureRoute optimizes this network path
  A->>O: Fetch using the selected path
  O-->>A: Origin response
  A-->>V: Response`,
};
const copy = {
  r05: {
    status: 'Required distinction unmet in test',
    intro:
      'The rule treats a missing Content-Length differently from Content-Length: 0. In our Vercel test, both looked missing, so the tested route and Function checks could not enforce that distinction.',
    scope: 'This example covers the missing-versus-zero rule within R05.',
    flow: 'The same endpoint receives two empty POSTs with different headers.',
    decision:
      'Find a supported check that can tell these requests apart, or agree to change the rule.',
    detailTitle: 'Other method rules to map',
    detail:
      'Vercel route conditions or custom Function checks can apply method rules. The complete route-specific policy still needs mapping, including OPTIONS and PUT exceptions; this result does not mean all method policy is unsupported.',
  },
  r06: {
    status: 'Partial · first redirect differs',
    intro:
      'The current policy requires 301 for HTTP-to-HTTPS redirects. Vercel returns an automatic 308 before configured route redirects run; a later 301 cannot replace that response.',
    scope: 'This example covers redirect status, not the full canonical-host policy.',
    flow: 'These are two separate test requests, not a recorded journey through two redirects.',
    decision:
      'Agree whether the automatic 308 is acceptable, or obtain a supported way to return the required 301.',
    detailTitle: 'Canonical-host rules still to verify',
    detail:
      'Validate the full host × path × protocol matrix, including encoded paths, repeated query parameters and the hsts.gif canonical-host exception.',
  },
  r09: {
    status: 'Partial · platform responses differ',
    intro:
      'The policy removes infrastructure-identifying headers. Native Vercel header removal worked on the tested application response; the tested platform redirects still included Server.',
    scope:
      'This example tests Server and synthetic X-Powered-By, not the full required header list or every response type.',
    flow: 'Logical response stages and recorded client headers; the captures do not trace Vercel’s internal pipeline.',
    decision:
      'Establish removal on the required platform responses, especially the automatic redirect, or agree a specific exception.',
    detailTitle: 'Full policy and earlier redirect tests',
    detail:
      'The full required header list still needs validation across the customer’s response types. The earlier successful redirect test used a Function-generated 301; this example uses a configured native 301. Those are different response paths, so neither result establishes coverage of all redirects.',
  },
  r29: {
    status: 'Equivalent policy not demonstrated',
    intro:
      'SureRoute optimizes the network path from the CDN to an external origin. The Vercel replacement needs a supported policy for that journey or an agreed alternative that meets the performance goal.',
    scope:
      'Evidence review: 24 September 2026. No parity experiment or performance comparison was run.',
    flow: 'Current SureRoute flow. The replacement decision sits outside this request path.',
    decision:
      'Confirm a supported Vercel external-origin optimization policy, or agree measurable latency and resilience criteria for accepting an alternative.',
  },
};
const docs = {
  config: 'https://vercel.com/docs/project-configuration/vercel-json#transforms',
  redirect: 'https://vercel.com/docs/cdn-security/encryption',
  sureRoute: 'https://techdocs.akamai.com/property-mgr/reference/latest-sure-route',
  regions: 'https://vercel.com/docs/regions',
};
function Link({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children} ↗
    </a>
  );
}
function SnapshotSource({ name, children }) {
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
      {open && <CodeBlock source={source} />}
      <p className="small">
        Excerpt from the verified test, not new source at the workshop’s deployed
        revision. Source digest: <code>{observation.source_digest}</code>.
      </p>
    </details>
  );
}
function Commands({ children }) {
  const [notice, setNotice] = useState('');
  return (
    <details className="source">
      <summary>Commands for the hosted test</summary>
      <pre>
        <code>{children}</code>
      </pre>
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(children);
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
    </details>
  );
}
function Recorded({ children }) {
  return (
    <>
      <p className="small">
        Recorded hosted observation · 24 September 2026, 17:35 UTC. {children}
      </p>
    </>
  );
}
function Provenance() {
  return (
    <details className="source">
      <summary>Test details</summary>
      <p>
        Verified at <code>{observation.verified_at_utc}</code> on{' '}
        <code>{observation.base}</code>.
      </p>
      <p>
        Recorded deployment:{' '}
        <Link href={observation.deployment_url}>recorded deployment</Link>. The local page
        displays selected synthetic fields from that run. It does not rerun the test or
        label these results as live.
      </p>
      <p className="small">
        Source digest: <code>{observation.source_digest}</code>. Namespace, request IDs,
        account identifiers and unrelated diagnostics are omitted.
      </p>
    </details>
  );
}
function Framing({ base }) {
  const native = observation.framing.filter((r) => r.case.startsWith('native-'));
  return (
    <section>
      <h2>Compare the two requests</h2>
      <ol className="exercise">
        <li>
          <h3>Check how each header arrives</h3>
          <Recorded />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Client sends</th>
                  <th>Tested checks see</th>
                </tr>
              </thead>
              <tbody>
                {native.slice(0, 2).map((r, i) => (
                  <tr key={r.case}>
                    <td>{i === 0 ? 'No Content-Length' : 'Content-Length: 0'}</td>
                    <td>
                      {r.native === 'missing' && !r.contentLengthPresent
                        ? 'Header missing'
                        : 'See test details'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>Both requests have an empty body, so body size cannot distinguish them.</p>
          <SnapshotSource name="presence">
            Code: check whether the header is present
          </SnapshotSource>
          <details className="source">
            <summary>Control request and detailed results</summary>
            <p>
              The seven-byte control retained its length header. Both the native route
              matcher and the Function reported the two empty requests as missing the
              header. The direct <code>/probe</code> test returned the same Function
              fields. These endpoints report what arrives; they do not reject requests.
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Client header</th>
                    <th>Route matcher</th>
                    <th>Function: present</th>
                    <th>Function: value</th>
                  </tr>
                </thead>
                <tbody>
                  {native.map((r, i) => (
                    <tr key={r.case}>
                      <td>{['Absent', 'Content-Length: 0', 'Content-Length: 7'][i]}</td>
                      <td>{r.native}</td>
                      <td>{String(r.contentLengthPresent)}</td>
                      <td>{r.contentLength ?? 'null'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <SnapshotSource name="methodMissing">
              Config: match a missing header
            </SnapshotSource>
            <SnapshotSource name="methodPresent">
              Config: match a present header
            </SnapshotSource>
            <Commands>{`# Seven-byte control\ncurl -q --http1.1 --max-time 20 --trace-ascii - -H 'Content-Type: application/octet-stream' --data-binary 'fixture' '${base}/native'`}</Commands>
          </details>
        </li>
        <li>
          <h3>Repeat the comparison from a terminal</h3>
          <p>
            Send the two requests to <code>{base}/native</code>. Compare the outgoing
            Content-Length header with <code>contentLengthPresent</code> in each response.
            Expect <code>false</code> for both if behavior is unchanged.
          </p>
          <Commands>{`# Absent: no body and no Content-Length header\ncurl -q --http1.1 --max-time 20 --trace-ascii - -X POST -H 'Content-Length:' '${base}/native'\n\n# Explicit zero: same path and no body\ncurl -q --http1.1 --max-time 20 --trace-ascii - -X POST -H 'Content-Length: 0' '${base}/native'`}</Commands>
          <p className="small">
            These commands use the hosted test endpoint. The local page does not send
            them. Browser fetch cannot set this header precisely.
          </p>
          <p className="small">
            <Link href={docs.config}>Vercel route conditions</Link>
          </p>
        </li>
      </ol>
      <Provenance />
    </section>
  );
}
function Redirects({ base, headers = false }) {
  const rows = observation.branches.filter((r) =>
    ['automatic-http-GET', 'configured-301-GET', ...(headers ? ['normal'] : [])].includes(
      r.branch,
    ),
  );
  const names = {
    'automatic-http-GET': 'Automatic HTTP redirect',
    'configured-301-GET': 'Configured HTTPS redirect',
    normal: 'Application response',
    'cache-fill': 'Application cache fill',
    'cache-hit': 'Application cache hit',
    'controlled-error': 'Application error',
    'missing-static': 'Platform missing static file',
  };
  return (
    <section>
      <h2>{headers ? 'Compare the response types' : 'Compare the two redirects'}</h2>
      <ol className="exercise">
        <li>
          <h3>
            {headers ? 'Inspect Server at the client' : 'Inspect the redirect status'}
          </h3>
          <Recorded>R06 and R09 use these same redirect captures.</Recorded>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Response type</th>
                  <th>Status</th>
                  {headers ? <th>Server</th> : <th>Location</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.branch}>
                    <td>{names[r.branch]}</td>
                    <td>{r.status}</td>
                    {headers ? (
                      <td>{r.server ?? 'Absent'}</td>
                    ) : (
                      <td>
                        {r.branch === 'automatic-http-GET'
                          ? 'HTTPS, same host + /probe + query'
                          : '/probe + query'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {headers ? (
            <>
              <p>The application response also removed synthetic X-Powered-By.</p>
              <details className="source">
                <summary>More results: cache, errors and transform markers</summary>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Response type</th>
                        <th>Status</th>
                        <th>Cache</th>
                        <th>Server</th>
                        <th>Transform</th>
                      </tr>
                    </thead>
                    <tbody>
                      {observation.branches.map((r) => (
                        <tr key={r.branch}>
                          <td>{names[r.branch]}</td>
                          <td>{r.status}</td>
                          <td>{r.cache ?? 'Absent'}</td>
                          <td>{r.server ?? 'Absent'}</td>
                          <td>{r.transform ?? 'Absent'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p>
                  The recorded cache HIT reused the fill’s invocation ID. Server and
                  synthetic X-Powered-By were absent on the cache and application-error
                  responses. The platform 404 retained Server.
                </p>
              </details>
              <SnapshotSource name="transforms">
                Config: delete response headers
              </SnapshotSource>
              <SnapshotSource name="originHeaders">
                Code: synthetic response headers to remove
              </SnapshotSource>
            </>
          ) : (
            <>
              <SnapshotSource name="redirect">
                Config: the explicit 301 route
              </SnapshotSource>
            </>
          )}
        </li>
        <li>
          <h3>Recheck without following redirects</h3>
          <p>
            Run these commands against the hosted test endpoint. Inspect the status,{' '}
            <code>Location</code>
            {headers ? ' and Server' : ''} in the terminal. Do not add <code>-L</code>: it
            would follow the redirect.
          </p>
          <Commands>{`# Automatic HTTP first response: recorded 308, Server: Vercel\ncurl -q --http1.1 --max-time 20 -sS -D - -o /dev/null '${base.replace('https:', 'http:')}/probe?example=1'\n\n# Configured HTTPS route: recorded 301, Server: Vercel\ncurl -q --http1.1 --max-time 20 -sS -D - -o /dev/null '${base}/configured-redirect?example=1'${headers ? `\n\n# Application response: recorded 200, Server absent\ncurl -q --http1.1 --max-time 20 -sS -D - -o /dev/null '${base}/probe'\n\n# Application error: recorded 500, Server absent\ncurl -q --http1.1 --max-time 20 -sS -D - -o /dev/null '${base}/error'` : ''}`}</Commands>
          <p className="small">
            Expected values are from the dated run. The local page does not send these
            requests. A browser may upgrade HTTP before sending it.{' '}
            <Link href={headers ? docs.config : docs.redirect}>
              {headers ? 'Vercel response transforms' : 'Vercel automatic HTTPS redirect'}
            </Link>
          </p>
        </li>
      </ol>
      <Provenance />
    </section>
  );
}
function OriginBackground() {
  return (
    <details className="source">
      <summary>Current setup and acceptance criteria</summary>
      <p>
        The current SureRoute setup uses a custom map, a probe object and a 30-minute
        lifetime for race statistics. Selecting a destination URL or hosting region does
        not establish equivalent network-path optimization.
      </p>
      <p>
        <Link href={docs.sureRoute}>Akamai SureRoute behavior</Link>
      </p>
      <p>
        Vercel documents private connections between its points of presence and regions.
        That does not establish a customer-configurable optimization policy for the onward
        path to an external origin.
      </p>
      <p className="small">
        <Link href={docs.regions}>Vercel global network and regions</Link> · Documentation
        checked 25 September 2026.
      </p>
      <p>
        Ask the networking/product team for the supported controls and operating contract.
        Agree acceptance criteria such as p95 origin-fetch TTFB and failure recovery
        before evaluating an alternative.
      </p>
    </details>
  );
}
export function GapPage({ id, profile, Diagram }) {
  const page = gapCatalog.find((r) => r.id.toLowerCase() === id);
  const content = copy[id];
  const base = profile.fixtures.platformGaps.url.replace(/\/$/, '');
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
        <p className="small">{content.scope}</p>
      </div>
      <Diagram
        key={id}
        id={id}
        source={diagrams[id]}
        previousSource={previousDiagrams[id]}
        description={content.flow}
      />
      {id === 'r05' ? (
        <Framing base={base} />
      ) : id === 'r29' ? null : (
        <Redirects base={base} headers={id === 'r09'} />
      )}
      <section>
        <h2>Decision</h2>
        <p>{content.decision}</p>
        {content.detail && (
          <details className="source">
            <summary>{content.detailTitle}</summary>
            <p>{content.detail}</p>
          </details>
        )}
        {id === 'r29' && <OriginBackground />}
        <p className="related">
          Related:{' '}
          {gapCatalog
            .filter((r) => r.id !== page.id)
            .map((r, i) => (
              <React.Fragment key={r.id}>
                {i > 0 && ' · '}
                <a href={`#${r.id.toLowerCase()}`}>
                  {r.id} ·{' '}
                  {r.id === 'R05'
                    ? 'Request headers'
                    : r.id === 'R06'
                      ? 'Redirect status'
                      : r.id === 'R09'
                        ? 'Response headers'
                        : 'Origin paths'}
                </a>
              </React.Fragment>
            ))}
        </p>
      </section>
    </>
  );
}

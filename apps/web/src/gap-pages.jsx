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
import observation from './gap-observations.json';
import previousDiagrams from './gap-diagram-previous.json';

export const gapCatalog = [
  {
    id: 'R05',
    implementation: '',
    title: 'Can we reject POSTs only when Content-Length is absent?',
    status: 'gap',
    category: 'Request policy',
    note: 'Original absent and explicit-zero headers were indistinguishable in the tested path.',
    implemented: true,
  },
  {
    id: 'R06',
    implementation: 'Automatic HTTPS redirect · 308',
    title: 'Can the first HTTP redirect return 301?',
    status: 'partial',
    category: 'Redirects and headers',
    note: 'The automatic HTTP-to-HTTPS upgrade returned 308, not the required 301.',
    implemented: true,
  },
  {
    id: 'R09',
    implementation: 'Native configuration · application responses',
    title: 'Can we remove headers from every required response?',
    status: 'partial',
    category: 'Redirects and headers',
    note: 'Removal worked on tested application responses; platform redirects retained Server.',
    implemented: true,
  },
  {
    id: 'R29',
    implementation: '',
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
  participant V as Request policy
  C->>V: POST with no Content-Length
  V-->>C: Required: reject this request
  C->>V: POST with Content-Length: 0
  V-->>C: Required: allow past this check
  Note over C,V: Tested Vercel checks see both headers as missing
  Note over V: Original absent versus explicit zero is lost`,
  r06: `sequenceDiagram
  participant C as Browser
  participant P as Vercel
  C->>P: HTTP request with path and query
  P-->>C: 308 to HTTPS, preserving path and query`,
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
  V->>A: Non-cacheable request: no-store or bypass-cache
  Note over A,O: SureRoute optimizes this network path
  A->>O: Fetch using the selected path
  O-->>A: Origin response
  A-->>V: Response`,
};
const priorR06TestDiagram = `sequenceDiagram
  participant C as Client
  participant P as Platform HTTP entry
  participant R as Configured HTTPS route
  C->>P: HTTP /probe + query
  P-->>C: 308 to HTTPS /probe + same query
  Note over C,R: Separate test request below
  C->>R: HTTPS /configured-redirect + query
  R-->>C: 301 to /probe + same query`;
const priorFramingDiagram =
  'sequenceDiagram\n  participant C as Client\n  participant V as Vercel route and Function checks\n  C->>V: POST /native, no Content-Length\n  V-->>C: Header seen as missing\n  C->>V: POST /native, Content-Length 0\n  V-->>C: Header also seen as missing';
const copy = {
  r05: {
    status: 'Gap · original header distinction unmet',
    intro:
      'The rule treats a missing Content-Length differently from Content-Length: 0. In our Vercel test, both looked missing, so the tested route and Function checks could not enforce that distinction.',
    scope: 'This example covers the missing-versus-zero rule within R05.',
    flow: 'The rule depends on the original header being present, not the body size. Both requests have an empty body.',
    decision:
      'Find a supported check that can tell these requests apart, or agree to change the rule.',
    detailTitle: 'Other method rules to map',
    detail:
      'Vercel route conditions or custom Function checks can apply method rules. The complete route-specific policy still needs mapping, including OPTIONS and PUT exceptions; this result does not mean all method policy is unsupported.',
  },
  r06: {
    status: 'Partial · first redirect differs',
    intro:
      'The current policy requires 301 for HTTP-to-HTTPS redirects. Vercel upgrades HTTP to HTTPS automatically with 308; a way to return 301 for that first response has not been demonstrated.',
    scope: 'This example covers redirect status, not the full canonical-host policy.',
    flow: 'Vercel tells the browser to request the HTTPS URL. The first response is 308.',
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
      'The customer uses SureRoute to optimize the CDN-to-external-origin path for non-cacheable no-store or bypass-cache traffic. An equivalent customer-configurable Vercel policy for that path has not been established. Performance against your origin still needs verification.',
    scope:
      'Evidence review: 24 September 2026. No parity experiment or performance comparison was run.',
    flow: 'Current SureRoute flow for non-cacheable traffic. The replacement decision sits outside this request path.',
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
  const rows = observation.framing
    .filter((r) => r.case.startsWith('native-'))
    .slice(0, 2);
  return (
    <section>
      <p>
        Recorded 24 September 2026. Compare a POST without Content-Length with one
        explicitly sending zero.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Client sends</th>
              <th>Tested checks see</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.case}>
                <td>{i === 0 ? 'No Content-Length' : 'Content-Length: 0'}</td>
                <td>
                  {r.native === 'missing' && !r.contentLengthPresent
                    ? 'Header missing'
                    : 'Header present'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        To repeat, run both commands and compare contentLengthPresent in the responses.
        Both recorded requests had an empty body.
      </p>
      <pre>
        <code>{`# No Content-Length header\ncurl -q --http1.1 --max-time 20 -X POST -H 'Content-Length:' '${base}/native'\n\n# Explicit zero\ncurl -q --http1.1 --max-time 20 -X POST -H 'Content-Length: 0' '${base}/native'`}</code>
      </pre>
    </section>
  );
}
function Redirects({ base, headers }) {
  const names = {
    'automatic-http-GET': 'Automatic HTTP redirect',
    'configured-301-GET': 'Configured HTTPS redirect',
    normal: 'Application response',
  };
  const rows = observation.branches.filter(
    (r) => Object.hasOwn(names, r.branch) && (headers || r.branch !== 'normal'),
  );
  return (
    <section>
      <p>
        Recorded 24 September 2026.{' '}
        {headers
          ? 'Compare the Server header across application and redirect responses.'
          : 'Compare the first HTTP redirect with the configured HTTPS redirect.'}
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Response</th>
              <th>Status</th>
              {headers && <th>Server</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.branch}>
                <td>{names[r.branch]}</td>
                <td>{r.status}</td>
                {headers && <td>{r.server ?? 'Absent'}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        To repeat, inspect the response headers without following redirects. Do not add{' '}
        <code>-L</code>.
      </p>
      <pre>
        <code>{`curl -q --http1.1 --max-time 20 -sS -D - -o /dev/null '${base.replace('https:', 'http:')}/probe?example=1'\ncurl -q --http1.1 --max-time 20 -sS -D - -o /dev/null '${base}/configured-redirect?example=1'${headers ? `\ncurl -q --http1.1 --max-time 20 -sS -D - -o /dev/null '${base}/probe'` : ''}`}</code>
      </pre>
      <p className="small">
        These commands send requests to the hosted example. Opening this page does not
        rerun the test.
      </p>
    </section>
  );
}
export function GapPage({ id, profile, Diagram }) {
  const page = gapCatalog.find((r) => r.id.toLowerCase() === id);
  const content = copy[id];
  const base = profile.fixtures.platformGaps.url.replace(/\/$/, '');
  const polished = ['r05', 'r06', 'r09', 'r29'].includes(id);
  const Wrapper = polished ? 'div' : React.Fragment;
  return (
    <Wrapper {...(polished ? { className: 'page-polish' } : {})}>
      <HomeLink className="back">← All requirements</HomeLink>
      <div className="hero">
        <span className={`badge ${page.status}`}>
          {page.id} · {content.status}
        </span>
        <h1>{page.title}</h1>
        <p className="lede">{content.intro}</p>
        <OriginalRequirementDetails id={id} />
        {id !== 'r29' && <p className="small">{content.scope}</p>}
      </div>
      {id === 'r06' ? (
        <ComparisonDiagram
          id={id}
          Diagram={Diagram}
          differencePlacement="below"
          diagramProps={{
            variant: 'polished',
            hideTitle: true,
            renderConfig: polishedDiagramLayout,
          }}
          difference="The HTTPS upgrade works, but the first response is 308 instead of the required 301. No workaround for that status-code requirement has been demonstrated."
          required={{
            source: `sequenceDiagram
  participant C as Browser
  participant P as CDN
  C->>P: HTTP request with path and query
  P-->>C: Required: 301 to HTTPS, preserving path and query`,
            description:
              'Required HTTP-to-HTTPS status. Confirm any additional host and path rules separately.',
            actorRoles: {},
          }}
          approach={{
            source: diagrams[id],
            previousSource: [priorR06TestDiagram, ...[previousDiagrams[id]].flat()],
            description: content.flow,
            actorRoles: { P: 'vercel' },
          }}
        />
      ) : id === 'r09' ? (
        <ComparisonDiagram
          id={id}
          Diagram={Diagram}
          differencePlacement="below"
          diagramProps={{
            variant: 'polished',
            hideTitle: true,
            renderConfig: polishedDiagramLayout,
          }}
          difference="Server was removed from the tested application responses, but remained on the automatic HTTP 308 and configured HTTPS 301 redirects."
          required={{
            source: `sequenceDiagram
  participant C as Client
  participant V as Vercel routing and responses
  participant A as Application
  participant T as Response header rules
  alt Application response
    C->>V: HTTPS /probe
    V->>A: Request application
    A-->>V: 200 with identifying headers
    V->>T: Required removal of identifying headers
    T-->>V: Remove Server and X-Powered-By
    V-->>C: Required: 200 without those headers
  else Automatic HTTP redirect
    C->>V: HTTP /probe
    V->>T: Required removal on redirect response
    T-->>V: Remove Server if present
    V-->>C: Required: redirect without Server
  else Configured HTTPS redirect
    C->>V: HTTPS /configured-redirect
    V->>T: Required removal on redirect response
    T-->>V: Remove Server if present
    V-->>C: Required: 301 without Server
  end`,
            description:
              'Desired removal across these response types. These logical stages describe the requirement, not a verified internal pipeline.',
          }}
          approach={{
            source: diagrams[id],
            previousSource: previousDiagrams[id],
            description: content.flow,
          }}
        />
      ) : (
        <Diagram
          key={id}
          id={id}
          liveEditing={id === 'r29'}
          title={
            ['r05', 'r29'].includes(id)
              ? 'Our understanding of the requirement'
              : undefined
          }
          variant={polished ? 'polished' : undefined}
          renderConfig={polished ? polishedDiagramLayout : undefined}
          source={diagrams[id]}
          previousSource={
            id === 'r05'
              ? [priorFramingDiagram, ...[previousDiagrams[id]].flat()]
              : previousDiagrams[id]
          }
          description={content.flow}
        />
      )}
      {id === 'r09' && (
        <section className="implementation">
          <h2>Implementation example</h2>
          <p>
            These native response transforms delete the two identifying headers. The
            recorded application response applied them; the tested automatic HTTP 308 and
            configured HTTPS 301 retained <code>Server</code>.
          </p>
          <CodeExample
            source={{ ...observation.sources.transforms, first: undefined }}
            role="Native response transforms · compacted"
            code={`{
  "src": "/(.*)",
  "continue": true,
  "transforms": [
    { "type": "response.headers", "op": "delete", "target": { "key": "server" } },
    { "type": "response.headers", "op": "delete", "target": { "key": "x-powered-by" } }
  ]
}`}
          />
          <p className="small">
            From the configuration verified on 24 September 2026; the diagnostic marker
            transform is omitted. The recorded response headers are in the demo.
          </p>
        </section>
      )}
      {polished && id !== 'r29' ? (
        <>
          <p>{content.decision}</p>
          <FoldedEvidence title="Demo">
            {id === 'r05' ? (
              <Framing base={base} />
            ) : (
              <Redirects base={base} headers={id === 'r09'} />
            )}
          </FoldedEvidence>
        </>
      ) : id === 'r29' ? null : (
        <Redirects base={base} />
      )}

      <section>
        {id === 'r29' && <p>{content.decision}</p>}
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
    </Wrapper>
  );
}

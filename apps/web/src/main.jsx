import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import mermaid from 'mermaid';
import DOMPurify from 'dompurify';
import { createBrowserClient } from './browser-client.js';
import { CodeBlock } from './code-block.jsx';
import { GapPage, gapCatalog } from './gap-pages.jsx';
import './tokens.css';
const MermaidEditor = lazy(() => import('./mermaid-editor.jsx'));
import './style.css';
mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'strict',
  suppressErrorRendering: true,
  theme: 'neutral',
  htmlLabels: false,
  flowchart: { htmlLabels: false },
  maxTextSize: 15000,
  secure: [
    'secure',
    'securityLevel',
    'startOnLoad',
    'maxTextSize',
    'suppressErrorRendering',
  ],
});
const original = `sequenceDiagram
  participant V as Your browser
  participant M as Routing Middleware
  participant C as CDN cache
  participant O as Owned origin
  participant P as Vercel Log Drains
  participant R as Signed collector
  V->>R: Start a fresh test via session API (no content request)
  V->>V: Send action sets or clears the test cookie
  V->>R: Obtain a fresh one-use ticket via session API
  V->>M: Browser fetch, same URL and actual Cookie header
  M->>R: Consume bounded ticket (not a content-origin call)
  M-->>P: Log selected cookie + event ID
  M->>C: Continue to public content
  alt First request: MISS
    C->>O: Fetch shared content
    O-->>C: Fill ID (one durable origin record)
  else Later request: HIT
    C-->>C: Reuse content, no origin call
  end
  C-->>V: Content + current event UUID
  C-->>P: Native request metadata
  P-->>R: Asynchronous signed batches
  Note over P,R: Arrival may be delayed
  R-->>V: Logs for this session`;
const catalog = [
  ...gapCatalog,
  {
    id: 'R20',
    title: 'Can visitors share cached content?',
    status: 'supported',
    category: 'Caching',
    note: 'Fully supported for bounded public shared content. No R20 exercise yet.',
    implemented: false,
  },
  {
    id: 'R32',
    title: 'Can we log a cookie when the CDN serves a cached page?',
    status: 'workaround',
    category: 'Observability',
    note: 'Cookie logging demonstrated with custom middleware and Vercel Log Drains. Other R32 fields remain to be mapped.',
    implemented: true,
  },
  {
    id: 'R10',
    title: 'Can application code inspect visitor TLS metadata?',
    status: 'gap',
    category: 'Transport',
    note: 'Visitor TLS details needed by this requirement are not exposed here. No R10 exercise yet.',
    implemented: false,
  },
];
const labels = {
  supported: '✓ Fully supported',
  workaround: '△ Workaround',
  gap: '⊘ Gap',
  partial: '◐ Partial mapping',
};
const readLocal = (k) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const writeLocal = (k, v) => {
  try {
    localStorage.setItem(k, v);
  } catch {}
};
const jsonFetch = async (url, init = {}) => {
  const r = await fetch(url, { ...init, signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw Error(`HTTP ${r.status}: ${await r.text()}`);
  return r.json();
};
function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Diagram({
  id: requirement = 'r32',
  source = original,
  previousSource,
  description,
} = {}) {
  const [text, setText] = useState(() => {
      const saved = readLocal(`${requirement}-diagram`);
      // Upgrade the saved former default, while preserving attendees' custom diagrams.
      const previousOriginal = original.replace(
        'Vercel Log Drains',
        'Platform log pipeline',
      );
      const earlierOriginal = previousOriginal.replace(
        '  V->>R: Start a fresh test via session API (no content request)\n  V->>V: Send action sets or clears the test cookie\n  V->>R: Obtain a fresh one-use ticket via session API',
        '  V->>R: Prepare session and obtain one-use ticket',
      );
      if (requirement !== 'r32') {
        const priorDefaults = Array.isArray(previousSource)
          ? previousSource
          : [previousSource];
        return !saved || priorDefaults.includes(saved) ? source : saved;
      }
      return !saved || saved === previousOriginal || saved === earlierOriginal
        ? original
        : saved;
    }),
    [svg, setSvg] = useState(''),
    [error, setError] = useState(''),
    [large, setLarge] = useState(false),
    [notice, setNotice] = useState(''),
    [rendering, setRendering] = useState(false),
    [editorOpen, setEditorOpen] = useState(false);
  const seq = useRef(0);
  async function apply(value = text) {
    const id = ++seq.current;
    setRendering(true);
    try {
      if (value.includes('%%{') || /^---/m.test(value))
        throw Error('Configuration directives are disabled; edit diagram content only.');
      await mermaid.parse(value);
      const out = await mermaid.render(`diagram-${requirement}-${id}`, value);
      if (id === seq.current) {
        setSvg(
          DOMPurify.sanitize(out.svg, { USE_PROFILES: { svg: true, svgFilters: true } }),
        );
        setError('');
        writeLocal(`${requirement}-diagram`, value);
      }
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      if (id === seq.current) setRendering(false);
    }
  }
  useEffect(() => {
    apply();
  }, []);
  return (
    <section className={large ? 'diagram teaching' : 'diagram'} id="diagram">
      <div className="section-head">
        <div>
          <h2>Request flow</h2>
        </div>
        <button onClick={() => setLarge(!large)}>
          {large ? 'Close enlarged view' : 'Enlarge diagram'}
        </button>
      </div>
      <p>
        {description ||
          'Custom middleware reads the current request’s cookie before the cache lookup. Vercel Log Drains delivers the cookie record and the native request log; the collector verifies and matches them for display.'}
      </p>
      <div className="diagram-grid">
        <div
          className="drawing"
          aria-label="Rendered request sequence"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <details className="editor" onToggle={(e) => setEditorOpen(e.currentTarget.open)}>
          <summary>Edit Mermaid</summary>
          {editorOpen && (
            <Suspense fallback={<p role="status">Loading editor…</p>}>
              <MermaidEditor value={text} onChange={setText} />
            </Suspense>
          )}
          <div className="buttons">
            <button onClick={() => apply()}>Apply diagram</button>
            <button
              onClick={() => {
                setText(source);
                apply(source);
              }}
            >
              Reset original
            </button>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(text);
                setNotice('Copied Mermaid.');
              }}
            >
              Copy
            </button>
            <button onClick={() => download(`${requirement}.mmd`, text)}>
              Download .mmd
            </button>
          </div>
          <p className="small">
            Diagram edits stay in this browser and do not change the demo.
          </p>
          <p role="status">
            {rendering ? 'Rendering edit; previous diagram remains visible…' : notice}
          </p>
        </details>
      </div>
      {error && (
        <div className="notice error" role="alert">
          <strong>Invalid edit · last valid diagram is stale</strong>
          <pre>{error}</pre>
        </div>
      )}
    </section>
  );
}

function Source({ profile, name, children }) {
  const [open, setOpen] = useState(false);
  const source = profile.sources[name];
  const revision = source?.revision || profile.revision;
  if (!source) return null;
  return (
    <details className="source" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>{children}</summary>
      <p className="small">
        {profile.localPreview
          ? 'Local source · unpublished'
          : 'Source at this deployment'}{' '}
        ·{' '}
        <code>
          {source.path}:{source.first}–{source.last}
        </code>
      </p>
      {open && <CodeBlock source={source} />}
      {!profile.localPreview && (
        <a
          href={`${profile.repo}/blob/${revision}/${source.path}#L${source.first}-L${source.last}`}
          target="_blank"
          rel="noopener"
        >
          Open these lines on GitHub ↗
        </a>
      )}
      {profile.localPreview && source.committed && (
        <a
          className="small"
          href={`${profile.repo}/blob/${profile.revision}/${source.committed.path}#L${source.committed.first}-L${source.committed.last}`}
          target="_blank"
          rel="noopener"
        >
          Compare committed source at {profile.revision.slice(0, 8)} (before these local
          edits) ↗
        </a>
      )}
    </details>
  );
}
function Exercise({ profile }) {
  const [state, setState] = useState({
    receipts: [],
    evidence: null,
    busy: false,
    message: 'Start a fresh test to begin.',
  });
  const client = useRef(null);
  const live =
    profile.surface === 'request' &&
    !profile.localPreview &&
    location.protocol === 'https:';
  useEffect(() => {
    const c = createBrowserClient({ profile, live, onChange: setState });
    client.current = c;
    return () => c.dispose();
  }, [profile, live]);
  const act = (method, ...args) => client.current?.[method](...args);
  const receipt = (name) => state.receipts.filter((r) => r.case === name).at(-1);
  const result = (name) => {
    const r = receipt(name);
    if (!r) return null;
    return (
      <div className="step-result" role="status">
        {r.preview ? (
          <p>UI preview: {name} action complete. No content request was sent.</p>
        ) : (
          <>
            <p>
              Observed: HTTP {r.status} ·{' '}
              <code>{r.headers['x-vercel-cache'] || 'no cache header'}</code>.{' '}
              {r.status === 200
                ? 'Check the logs below to verify this request.'
                : 'Request rejected; no successful content request counted.'}
            </p>
            <details>
              <summary>Response headers and timing</summary>
              <pre>{JSON.stringify(r, null, 2)}</pre>
            </details>
          </>
        )}
      </div>
    );
  };
  const buttons = (name) => (
    <div className="buttons">
      <button
        className="primary"
        disabled={state.busy || !state.session}
        onClick={() => act('sendWithCookie', name)}
      >
        Send request with cookie {name}
      </button>
    </div>
  );
  const e = state.evidence;
  const sourceProfile = { ...profile, sources: { ...profile.sources } };
  if (live) {
    for (const [mappings, revision] of [
      [state.session?.sourceMappings, state.session?.revision],
      [e?.collectorSourceMappings, e?.collectorRevision],
    ]) {
      if (!mappings || !revision) continue;
      for (const [key, mapping] of Object.entries(mappings))
        sourceProfile.sources[key] =
          mapping.last - mapping.first < 30 ? { ...mapping, revision } : null;
    }
  }

  return (
    <>
      <section id="try">
        <h2>Try it</h2>
        <p>
          The visitor already has a cookie from an earlier visit. This exercise uses
          JavaScript to create that starting state before requesting the page. A and B are
          successive cookie values in this browser.
        </p>
        <ol className="exercise">
          <li>
            <h3>Open Network and start a fresh test</h3>
            <p>
              Open Developer Tools → Network. Leave{' '}
              <strong>Disable cache unchecked</strong> and filter by{' '}
              <code>/demo/run-</code>. Start a fresh test to create a new content URL
              without requesting it or setting the test cookie. Nothing appears under this
              filter until you click a Send button. Both A and B use this same test URL.
            </p>
            <button disabled={state.busy} onClick={() => act('prepare')}>
              Start a fresh test
            </button>
            <p className="small" role="status">
              {state.session ? (
                <>
                  Content URL: <code>{state.session.contentPath}</code>
                </>
              ) : (
                'No test started.'
              )}
            </p>
            <Source profile={sourceProfile} name="browserSession">
              Code: prepare without fetching content
            </Source>
          </li>
          <li>
            <h3>Send the page request with cookie A</h3>
            <p>
              This button sets <code>workshop_choice=fixture-A</code>, then requests the
              page. In Network, open <code>/demo/run-…</code> → Request Headers → Cookie
              (or Request Cookies) and check for <code>workshop_choice=fixture-A</code>.
              Under Response Headers, expect <code>x-vercel-cache: MISS</code>. Note the{' '}
              <code>x-workshop-fill-id</code> and <code>x-workshop-event-id</code> for
              comparison with B.
            </p>
            {buttons('A')}
            {result('A')}
            <Source profile={sourceProfile} name="browserLab">
              Code: set the cookie, then send the request
            </Source>
          </li>
          <li>
            <h3>Send the same page request with cookie B</h3>
            <p>
              This button replaces the same cookie with{' '}
              <code>workshop_choice=fixture-B</code>, then requests the same test URL. In
              Network, open the new request and check Request Headers → Cookie (or Request
              Cookies) for <code>workshop_choice=fixture-B</code>. Under Response Headers,
              expect <code>x-vercel-cache: HIT</code>, the same{' '}
              <code>x-workshop-fill-id</code>, and a different{' '}
              <code>x-workshop-event-id</code>.
            </p>
            {buttons('B')}
            {result('B')}
            <Source profile={sourceProfile} name="middleware">
              Code: log this request’s cookie before the cache lookup
            </Source>
          </li>
        </ol>
        <p className="action-status" role="status" aria-live="polite">
          {state.busy ? 'Working…' : state.message}
        </p>
      </section>
      <section id="logs">
        <h2>Check the logs</h2>
        <ol className="exercise" start="4">
          <li>
            <h3>Match B’s request to its log record</h3>
            <p>
              Refresh logs reads the records delivered by Vercel Log Drains; it does not
              request the page again. Each cookie log contains its own request’s value:
              A’s log has <code>fixture-A</code>; B’s log has <code>fixture-B</code>, even
              though B receives the shared content as a <code>HIT</code>. Expect one
              content-origin call overall. “Matched” means the browser response and the
              delivered cookie and native logs identify the same request.
            </p>
            <div className="buttons">
              <button
                disabled={state.busy || !state.session}
                onClick={() => act('refresh')}
              >
                Refresh logs
              </button>
              <a
                href={`${profile.dashboard}/${profile.team}/${profile.projects.request}/logs`}
                target="_blank"
                rel="noopener"
              >
                Open request project logs ↗
              </a>
            </div>
            <p className="small">
              In the dashboard, search for <code>workshop-cookie-v1</code>. Dashboard
              access requires project permission.
            </p>
            <p role="status">
              {!live
                ? 'UI preview: no live logs. Run this exercise on the request host after an approved release.'
                : state.logMessage ||
                  'No logs loaded yet. Vercel Log Drains delivery is asynchronous.'}
            </p>
            {e && (
              <>
                <p>
                  {e.originCount} content-origin calls · {e.nativeCount} request records ·{' '}
                  {e.emissionCount} cookie records
                </p>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Case</th>
                        <th>Cache</th>
                        <th>Cookie</th>
                        <th>Request match</th>
                        <th>Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {e.rows.map((r) => (
                        <tr key={r.slot}>
                          <td>{r.name}</td>
                          <td>{r.nativeCache || 'Pending'}</td>
                          <td>
                            {r.cookieState} / {r.cookie ?? 'null'}
                          </td>
                          <td>{r.joined ? 'Matched' : 'Waiting'}</td>
                          <td>{r.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <details>
                  <summary>Raw signed log evidence</summary>
                  <pre>{JSON.stringify(e, null, 2)}</pre>
                </details>
              </>
            )}
            <Source profile={sourceProfile} name="verification">
              Code: match the cookie log to the native request record
            </Source>
            <Source profile={sourceProfile} name="collector">
              Code: verify the log delivery signature
            </Source>
          </li>
        </ol>
        <div className="reset-test">
          <h3>Reset test</h3>
          <p>
            Clear this browser’s test cookies and close the session. Start a fresh test
            when you’re ready to repeat A and B with a new content URL.
          </p>
          <button disabled={state.busy} onClick={() => act('reset')}>
            Reset test
          </button>
        </div>
        <details>
          <summary>Implementation notes</summary>
          <p>
            This demo logs only synthetic values of <code>workshop_choice</code>. The
            collector verifies signed delivery, stores evidence in private Vercel Blob,
            and matches records by request identity. Delayed or incomplete delivery stays
            unverified; a cache header alone does not establish a log match.
          </p>
          <p>
            Sessions last ten minutes and allow twelve requests. Each send obtains a
            one-use ticket. The ticket check calls the collector before the cache lookup;
            it is separate from the content-origin count and is demo plumbing, not a
            production cost benchmark. If the session expires, start a fresh test.
          </p>
        </details>
      </section>
    </>
  );
}
function App() {
  const [p, setP] = useState(null),
    [message, setMessage] = useState(''),
    [page, setPage] = useState(
      location.pathname === '/lab.html' ? 'r32' : location.hash.slice(1) || 'index',
    ),
    [status, setStatus] = useState('all'),
    [category, setCategory] = useState('all');
  useEffect(() => {
    // Deployment-owned configuration only. Old browser overrides are never read.
    try {
      localStorage.removeItem('workshop-profile');
    } catch {}
    jsonFetch('/profile.json')
      .then(setP)
      .catch((e) => setMessage(e.message));
    const h = () => {
      setPage(location.hash.slice(1) || 'index');
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);
  const openLiveExercise =
    p && !p.localPreview && p.surface !== 'request' && page === 'r32';
  useEffect(() => {
    if (openLiveExercise) location.replace(`${p.requestUrl}/#r32`);
  }, [openLiveExercise, p]);
  if (openLiveExercise)
    return (
      <main>
        <p>Opening exercise…</p>
      </main>
    );
  if (!p)
    return (
      <main>
        <h1>Loading workshop…</h1>
        <p role="alert">{message}</p>
      </main>
    );
  const exerciseUrl =
    p.localPreview || p.surface === 'request' ? '#r32' : `${p.requestUrl}/#r32`;
  const selected = catalog.filter(
    (r) =>
      (status === 'all' || r.status === status) &&
      (category === 'all' || r.category === category),
  );
  return (
    <>
      <header>
        <a className="brand" href="#index">
          <span className="brand-mark">◈</span> CDN Workshop
        </a>
        <nav aria-label="Appearance">
          <button
            aria-label="Toggle theme"
            onClick={() => {
              const t =
                document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
              document.documentElement.dataset.theme = t;
              writeLocal('theme', t);
            }}
          >
            ◐
          </button>
        </nav>
      </header>
      <main>
        {gapCatalog.some((r) => r.id.toLowerCase() === page) ? (
          <GapPage key={page} id={page} profile={p} Diagram={Diagram} />
        ) : page === 'r32' ? (
          <>
            <a className="back" href="#index">
              ← All requirements
            </a>
            <div className="hero">
              <span className="badge workaround">R32 · Workaround demonstrated</span>
              <h1>Can we log a cookie when the CDN serves a cached page?</h1>
              <p className="lede">
                Akamai can include a selected request cookie in its logs. Here, custom
                middleware logs the cookie before the cache lookup, and Vercel Log Drains
                delivers that record alongside the request log.
              </p>
              <p className="small">This example covers cookie logging within R32.</p>
            </div>
            <Diagram key="r32" />
            <Exercise profile={p} />
            <section>
              <h2>Mapping and remaining work</h2>
              <ul className="limitations">
                <li>
                  The cookie is logged by middleware in a separate record and matched to
                  the request log. It is not an automatic cookie field in the native
                  request log.
                </li>
                <li>
                  Cookie logging is demonstrated. The customer's other required fields and
                  downstream log format still need to be mapped and verified.
                </li>
              </ul>
              <p className="related">
                <a href="#index">
                  ← Requirements: shared caching (R20) and TLS metadata (R10)
                </a>
              </p>
            </section>
          </>
        ) : (
          <>
            <div className="hero index-hero">
              <p className="eyebrow">CDN workshop</p>
              <h1>Explore the CDN requirements.</h1>
              <p className="lede">
                Choose a requirement to see its status and try the available exercise.
              </p>
              <p className="small">
                {catalog.length} requirements ·{' '}
                {catalog.filter((r) => r.implemented).length} pages available
              </p>
            </div>
            <div className="filters">
              <div className="tabs" aria-label="Status filters">
                {[['all', 'All requirements'], ...Object.entries(labels)].map(
                  ([k, v]) => (
                    <button
                      key={k}
                      aria-pressed={status === k}
                      onClick={() => setStatus(k)}
                    >
                      {v}{' '}
                      <span>
                        {k === 'all'
                          ? catalog.length
                          : catalog.filter((r) => r.status === k).length}
                      </span>
                    </button>
                  ),
                )}
              </div>
              <label>
                Category{' '}
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="all">All categories</option>
                  {[...new Set(catalog.map((r) => r.category))].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
            </div>
            <p className="small" role="status">
              {selected.length} requirement{selected.length === 1 ? '' : 's'} shown
            </p>
            {['supported', 'workaround', 'partial', 'gap'].map((s) => {
              const rows = selected.filter((r) => r.status === s);
              return (
                rows.length > 0 && (
                  <section className="catalog-group" key={s}>
                    <h2 className={s}>
                      {labels[s]} <span className="count">{rows.length}</span>
                    </h2>
                    {rows.map((r) => (
                      <article className="requirement" key={r.id}>
                        <div>
                          <p className="eyebrow">
                            {r.category} <span> / {r.id}</span>
                          </p>
                          <h3>{r.title}</h3>
                          <p>{r.note}</p>
                        </div>
                        {r.implemented ? (
                          <a
                            className="button primary"
                            href={r.id === 'R32' ? exerciseUrl : `#${r.id.toLowerCase()}`}
                          >
                            {r.id === 'R32' ? 'Open exercise →' : 'Open requirement →'}
                          </a>
                        ) : (
                          <span className="badge neutral">No exercise yet</span>
                        )}
                      </article>
                    ))}
                  </section>
                )
              );
            })}
            {!selected.length && (
              <div className="empty">
                No requirements match both filters. Select All requirements and All
                categories.
              </div>
            )}
          </>
        )}
      </main>
      <footer>
        <span>CDN Workshop · synthetic test data</span>
        <span>
          {p.localPreview ? 'Local UI preview' : p.environment} ·{' '}
          {p.localPreview ? 'base ' : ''}
          <code>{p.revision.slice(0, 8)}</code>
        </span>
      </footer>
    </>
  );
}
document.documentElement.dataset.theme = readLocal('theme') || 'light';
createRoot(document.getElementById('root')).render(<App />);

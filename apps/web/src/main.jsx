import { transportOrder, transportCategory } from './transport-navigation.jsx';
import { cookiesOrder, cookiesCategory } from './cookies-navigation.jsx';
import { requestRuleOrder, requestRuleCategory } from './request-rule-navigation.jsx';
import { routingOrder, routingCategory } from './routing-navigation.jsx';
import { processingOrder, processingCategory } from './processing-navigation.jsx';
import {
  LoggingNavigation,
  loggingOrder,
  loggingCategory,
} from './logging-navigation.jsx';
import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import mermaid from 'mermaid';
import DOMPurify from 'dompurify';
import { createBrowserClient } from './browser-client.js';
import { CodeBlock } from './code-block.jsx';
import { LiveDiagramVersions } from './live-diagram-versions.jsx';
import { DiagramSnippets } from './diagram-snippets.jsx';
import { CookieArchitecture, CookieWalkthrough } from './r32-presentation.jsx';
import { GapPage, gapCatalog } from './gap-pages.jsx';
import { CachePage, cacheCatalog } from './cache-pages.jsx';
import { RequirementPage, requirementCatalog } from './requirement-pages.jsx';
import './tokens.css';
const MermaidEditor = lazy(() => import('./mermaid-editor.jsx'));
// Compile out the preparation page and its content from every production build.
const PreparationChecklist = import.meta.env.DEV
  ? lazy(() => import('./preparation-checklist.jsx'))
  : null;
const PreparationAgenda = import.meta.env.DEV
  ? lazy(() => import('./preparation-agenda.jsx'))
  : null;
import './style.css';
// Approved homepage plus archived landing alternatives on direct design routes.
import { LandingDesignPage, isDesignPage } from './landing-designs.jsx';
import { HomeLink } from './home-link.jsx';
import { pageFromHash, exerciseHref } from './home-navigation.js';
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
  ...cacheCatalog,
  ...requirementCatalog,
  {
    id: 'R32',
    implementation: 'Middleware on every request',
    title: 'Can we log a cookie when the CDN serves a cached page?',
    status: 'workaround',
    category: loggingCategory,
    note: 'Cookie logging demonstrated with custom middleware and Vercel Log Drains. Other R32 fields remain to be mapped.',
    implemented: true,
  },
];
const labels = {
  supported: '✓ Supported mapping',
  workaround: '△ Workaround',
  gap: '⊘ Gap',
  partial: '◐ Partial mapping',
  confirmation: '? Needs confirmation',
};
const indexViews = {
  number: 'Requirement number',
  category: 'Category',
  status: 'Support status',
};
const categories = [...new Set(catalog.map((r) => r.category))];
const categoryOrders = new Map([
  [loggingCategory, loggingOrder],
  [processingCategory, processingOrder],
  [routingCategory, routingOrder],
  [requestRuleCategory, requestRuleOrder],
  [cookiesCategory, cookiesOrder],
  [transportCategory, transportOrder],
]);
const byRequirementNumber = (a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1));
function byCategoryOrder(category) {
  const order = categoryOrders.get(category) || [];
  const rank = (id) => {
    const index = order.indexOf(id.toLowerCase());
    return index < 0 ? order.length : index;
  };
  return (a, b) => rank(a.id) - rank(b.id) || byRequirementNumber(a, b);
}
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
// Page-controlled Mermaid frontmatter for layout/typography (fonts, margins, mirroring).
// It is prepended only at render time, so the editable text stays directive-free and the
// existing block on participant-supplied directives/frontmatter still applies. Keys in the
// `secure` list above cannot be changed this way.
function frontmatter(config) {
  const lines = ['---', 'config:'];
  const walk = (value, depth) => {
    for (const [key, item] of Object.entries(value)) {
      const pad = '  '.repeat(depth);
      if (item && typeof item === 'object') {
        lines.push(`${pad}${key}:`);
        walk(item, depth + 1);
      } else lines.push(`${pad}${key}: ${JSON.stringify(item)}`);
    }
  };
  walk(config, 1);
  lines.push('---');
  return `${lines.join('\n')}\n`;
}
function Diagram({
  id: requirement = 'r32',
  source = original,
  previousSource,
  title = 'Request flow',
  description,
  // Opt-in presentation for the six reviewed pages. Undefined preserves other pages.
  variant,
  renderConfig,
  actorRoles = {},
  hideTitle = false,
  liveEditing = false,
} = {}) {
  const [initial] = useState(() => {
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
    const priorDefaults = Array.isArray(previousSource)
      ? [...previousSource]
      : [previousSource];
    if (requirement === 'r32')
      priorDefaults.push(original, previousOriginal, earlierOriginal);
    const valid = !saved || priorDefaults.includes(saved) ? source : saved;
    const draft = liveEditing ? readLocal(`${requirement}-diagram-draft-v1`) : null;
    return {
      valid,
      draft: draft === null || priorDefaults.includes(draft) ? valid : draft,
    };
  });
  const [text, setText] = useState(initial.draft),
    [svg, setSvg] = useState(''),
    [naturalWidth, setNaturalWidth] = useState(0),
    [error, setError] = useState(''),
    [large, setLarge] = useState(false),
    [notice, setNotice] = useState(''),
    [rendering, setRendering] = useState(false),
    [editorOpen, setEditorOpen] = useState(false),
    [validatedText, setValidatedText] = useState(null),
    [storageError, setStorageError] = useState(''),
    [editorRevision, setEditorRevision] = useState(0),
    [snippetsOpen, setSnippetsOpen] = useState(true);
  const seq = useRef(0);
  function changeText(value) {
    if (value === text) return;
    // Invalidate immediately, including the debounce window before the next render.
    if (liveEditing) {
      seq.current++;
      setRendering(true);
      setError('');
      try {
        localStorage.setItem(`${requirement}-diagram-draft-v1`, value);
        setStorageError('');
      } catch {
        setStorageError(
          'This browser could not save your draft. Keep this page open or download the Mermaid text.',
        );
      }
    }
    setText(value);
  }
  function replaceText(value) {
    changeText(value);
    setEditorRevision((revision) => revision + 1);
  }
  async function renderDiagram(value, id) {
    if (value.length > 15000) throw Error('Keep the diagram within 15,000 characters.');
    if (value.includes('%%{') || /^---/m.test(value))
      throw Error('Configuration directives are disabled; edit diagram content only.');
    await mermaid.parse(value);
    const prelude = renderConfig ? frontmatter(renderConfig) : '';
    const out = await mermaid
      .render(`diagram-${requirement}-${id}`, prelude + value)
      .catch((e) => {
        // A layout prelude must never hide a valid participant edit.
        if (!prelude) throw e;
        console.warn('Diagram layout config rejected; rendering plain', e);
        return mermaid.render(`diagram-${requirement}-${id}-plain`, value);
      });
    const clean = DOMPurify.sanitize(out.svg, {
      USE_PROFILES: { svg: true, svgFilters: true },
    });
    const doc = new DOMParser().parseFromString(clean, 'image/svg+xml');
    for (const actor of doc.querySelectorAll('rect.actor')) {
      if (actorRoles[actor.getAttribute('name')] === 'vercel')
        actor.classList.add('vercel-actor');
    }
    const box = /viewBox="[-\d.]+ [-\d.]+ ([\d.]+)/.exec(out.svg);
    return {
      svg: new XMLSerializer().serializeToString(doc.documentElement),
      width: box ? Math.round(Number(box[1])) : 0,
    };
  }
  async function apply(value = text) {
    const id = ++seq.current;
    setRendering(true);
    try {
      const result = await renderDiagram(value, id);
      if (id === seq.current) {
        setSvg(result.svg);
        setNaturalWidth(result.width);
        setValidatedText(value);
        setError('');
        if (liveEditing) {
          try {
            localStorage.setItem(`${requirement}-diagram`, value);
          } catch {
            setStorageError(
              'This browser could not save the diagram. Keep this page open or download the Mermaid text.',
            );
          }
        } else writeLocal(`${requirement}-diagram`, value);
      }
    } catch (e) {
      // On reload with an unfinished draft, recover the last valid saved drawing.
      if (liveEditing && !svg && id === seq.current) {
        for (const fallback of [...new Set([initial.valid, source])]) {
          try {
            const result = await renderDiagram(fallback, `${id}-fallback`);
            if (id === seq.current) {
              setSvg(result.svg);
              setNaturalWidth(result.width);
            }
            break;
          } catch {
            /* Try the page's original if a legacy custom value is invalid. */
          }
        }
      }
      if (id === seq.current) setError(String(e.message || e));
    } finally {
      if (id === seq.current) setRendering(false);
    }
  }
  useEffect(() => {
    if (liveEditing) return;
    apply();
    return () => {
      seq.current++;
    };
  }, []);
  useEffect(() => {
    if (!liveEditing) return;
    const timer = setTimeout(() => apply(text), svg ? 450 : 0);
    return () => {
      clearTimeout(timer);
      seq.current++;
    };
  }, [liveEditing, text]);
  const polished = variant === 'polished';
  const caption =
    description ||
    'Custom middleware reads the current request’s cookie before the cache lookup. Vercel Log Drains delivers the cookie record and the native request log; the collector verifies and matches them for display.';
  return (
    <section
      className={`${large ? 'diagram teaching' : 'diagram'}${title !== 'Request flow' ? ' pilot-diagram' : ''}${polished ? ' pilot-polish' : ''}${liveEditing ? ' diagram-live' : ''}${liveEditing && editorOpen ? ' editing-live' : ''}${liveEditing && editorOpen && snippetsOpen ? ' show-snippets' : ''}`}
      id="diagram"
      data-diagram={requirement}
    >
      {polished ? (
        // Comparison tabs can name the view; standalone diagrams retain their heading.
        <div className="section-head diagram-caption">
          <div>
            <h2 className={large || !hideTitle ? undefined : 'visually-hidden'}>
              {title}
            </h2>
            <p>{caption}</p>
          </div>
          <button onClick={() => setLarge(!large)}>
            {large ? 'Close enlarged view' : 'Enlarge diagram'}
          </button>
        </div>
      ) : (
        <>
          <div className="section-head">
            <div>
              <h2>{title}</h2>
            </div>
            <button onClick={() => setLarge(!large)}>
              {large ? 'Close enlarged view' : 'Enlarge diagram'}
            </button>
          </div>
          <p>{caption}</p>
        </>
      )}
      <div className="diagram-grid">
        <div
          className="drawing"
          aria-label="Rendered request sequence"
          style={
            naturalWidth ? { '--diagram-natural-width': `${naturalWidth}px` } : undefined
          }
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <details className="editor" onToggle={(e) => setEditorOpen(e.currentTarget.open)}>
          <summary>Edit Mermaid</summary>
          {liveEditing && editorOpen && (
            <div className="snippet-toolbar">
              <button
                aria-expanded={snippetsOpen}
                onClick={() => setSnippetsOpen(!snippetsOpen)}
              >
                {snippetsOpen ? 'Hide snippets' : 'Diagram snippets'}
              </button>
            </div>
          )}
          <div
            className={
              liveEditing && editorOpen && snippetsOpen
                ? 'editor-workspace with-snippets'
                : 'editor-workspace'
            }
          >
            <div className="editor-main">
              {liveEditing && error && (
                <p className="live-diagram-error" role="status">
                  {error.startsWith('Configuration') ||
                  error.startsWith('Keep the diagram')
                    ? error
                    : 'Mermaid needs a correction.'}{' '}
                  Last valid diagram shown; your draft is kept.
                </p>
              )}
              {editorOpen && (
                <Suspense fallback={<p role="status">Loading editor…</p>}>
                  <MermaidEditor
                    value={text}
                    onChange={changeText}
                    syncRevision={liveEditing ? editorRevision : undefined}
                  />
                </Suspense>
              )}
              {liveEditing && (
                <LiveDiagramVersions
                  identity={requirement}
                  text={text}
                  source={source}
                  onReplace={replaceText}
                  valid={!rendering && !error && validatedText === text}
                />
              )}
              <div className="buttons">
                {!liveEditing && <button onClick={() => apply()}>Apply diagram</button>}
                {!liveEditing && (
                  <button
                    onClick={() => {
                      setText(source);
                      apply(source);
                    }}
                  >
                    Reset original
                  </button>
                )}
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
                {liveEditing
                  ? 'Live preview updates after a short pause. Drafts and versions stay in this browser on this address.'
                  : 'Diagram edits stay in this browser and do not change the demo.'}
              </p>
              {storageError && (
                <p className="small" role="alert">
                  {storageError}
                </p>
              )}
              <p role="status">
                {rendering ? 'Rendering edit; previous diagram remains visible…' : notice}
              </p>
            </div>
            {liveEditing && editorOpen && snippetsOpen && <DiagramSnippets text={text} />}
          </div>
        </details>
      </div>
      {error && !liveEditing && (
        <div className="notice error" role="alert">
          <strong>Invalid edit · last valid diagram is stale</strong>
          <pre>{error}</pre>
        </div>
      )}
    </section>
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
            <p className="small">
              Fill: <code>{r.headers['x-workshop-fill-id'] || 'Unavailable'}</code> ·
              Request: <code>{r.headers['x-workshop-event-id'] || 'Unavailable'}</code>
            </p>
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
            </div>
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
              </>
            )}
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
        <p className="small">
          Sessions last ten minutes. If the session expires, start a fresh test. Delayed
          or incomplete log delivery stays unverified.
        </p>
      </section>
    </>
  );
}
function App() {
  const [p, setP] = useState(null),
    [message, setMessage] = useState(''),
    [page, setPage] = useState(
      location.pathname === '/lab.html' ? 'r32' : pageFromHash(),
    ),
    [status, setStatus] = useState('all'),
    [category, setCategory] = useState('all'),
    [view, setView] = useState(() => {
      const saved = readLocal('workshop-index-view');
      return Object.hasOwn(indexViews, saved) ? saved : 'number';
    });
  useEffect(() => {
    // Deployment-owned configuration only. Old browser overrides are never read.
    try {
      localStorage.removeItem('workshop-profile');
    } catch {}
    jsonFetch('/profile.json')
      .then(setP)
      .catch((e) => setMessage(e.message));
    const h = () => {
      setPage(pageFromHash());
    };
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [page]);
  const openLiveExercise =
    p && !p.localPreview && p.surface !== 'request' && page === 'r32';
  useEffect(() => {
    if (openLiveExercise) location.replace(exerciseHref(p));
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
  const exerciseUrl = exerciseHref(p);
  const selected = catalog.filter(
    (r) =>
      (status === 'all' || r.status === status) &&
      (category === 'all' || r.category === category),
  );
  const groups =
    view === 'number'
      ? [{ key: 'number', rows: [...selected].sort(byRequirementNumber) }]
      : view === 'category'
        ? categories.map((name) => ({
            key: name,
            title: name,
            rows: selected.filter((r) => r.category === name).sort(byCategoryOrder(name)),
          }))
        : ['supported', 'workaround', 'partial', 'confirmation', 'gap'].map((key) => ({
            key,
            title: labels[key],
            status: key,
            rows: selected.filter((r) => r.status === key).sort(byRequirementNumber),
          }));
  return (
    <>
      <main>
        {isDesignPage(page) ? (
          <LandingDesignPage
            key={page}
            page={page}
            catalog={catalog}
            exerciseUrl={exerciseUrl}
          />
        ) : gapCatalog.some((r) => r.id.toLowerCase() === page) ? (
          <GapPage key={page} id={page} profile={p} Diagram={Diagram} />
        ) : cacheCatalog.some((r) => r.id.toLowerCase() === page) ? (
          <CachePage key={page} id={page} profile={p} Diagram={Diagram} />
        ) : requirementCatalog.some((r) => r.id.toLowerCase() === page) ? (
          <RequirementPage key={page} id={page} Diagram={Diagram} profile={p} />
        ) : page === 'r32' ? (
          <div className="page-polish">
            <HomeLink className="back">← All requirements</HomeLink>
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
            <CookieArchitecture Diagram={Diagram} previousSource={original} />
            <CookieWalkthrough>
              <Exercise profile={p} />
            </CookieWalkthrough>
            <section>
              <LoggingNavigation id="r32" profile={p} />
              <p className="related">
                <a href="#r31">← R31 · Request identity</a>
                {' · '}
                <a href="#r33">R33 · Log destinations →</a>
              </p>
            </section>
          </div>
        ) : (
          <>
            <div className="hero index-hero">
              <p className="eyebrow">CDN workshop</p>
              <h1>Explore the CDN requirements.</h1>
              <p className="lede">
                Choose a requirement to see its mapping, evidence and remaining decision.
              </p>
              <p className="small">
                {catalog.length} requirements ·{' '}
                {catalog.filter((r) => r.implemented).length} pages available · page
                availability does not mean verified customer parity. Logging/reporting,
                processing, routing/admission and request/rule labels have been reviewed;
                other category totals remain provisional.
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
              <div className="index-selectors">
                <label>
                  View{' '}
                  <select
                    value={view}
                    onChange={(e) => {
                      setView(e.target.value);
                      writeLocal('workshop-index-view', e.target.value);
                    }}
                  >
                    {Object.entries(indexViews).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Category{' '}
                  <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="all">All categories</option>
                    {categories.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <p className="small" role="status">
              {selected.length} requirement{selected.length === 1 ? '' : 's'} shown
            </p>
            {groups.map(
              ({ key, title, status: groupStatus, rows }) =>
                rows.length > 0 && (
                  <section className="catalog-group" key={key}>
                    {title && (
                      <h2 className={groupStatus}>
                        {title} <span className="count">{rows.length}</span>
                      </h2>
                    )}
                    {rows.map((r) => (
                      <article className="requirement" key={r.id}>
                        <div>
                          <p className="eyebrow">
                            {r.category} <span> / {r.id}</span>
                            <span className={`badge ${r.status}`}>
                              {labels[r.status]}
                            </span>
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
                ),
            )}
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
        {import.meta.env.DEV && (
          <span>
            <a href="/checklist">Preparation checklist</a> ·{' '}
            <a href="/agenda">Speaker notes</a>
          </span>
        )}
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
createRoot(document.getElementById('root')).render(
  /^\/(checklist|agenda)\/?$/.test(location.pathname) ? (
    import.meta.env.DEV ? (
      <Suspense fallback={<main>Loading preparation…</main>}>
        {location.pathname.replace(/\/$/, '') === '/agenda' ? (
          <PreparationAgenda />
        ) : (
          <PreparationChecklist catalog={catalog} />
        )}
      </Suspense>
    ) : (
      <main>
        <h1>Page not found</h1>
        <a href="/#home">All requirements</a>
      </main>
    )
  ) : (
    <App />
  ),
);

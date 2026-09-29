import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import './landing-designs.css';
import { canonicalHome, rememberHome, homeHref } from './home-navigation.js';

// Approved homepage and archived alternatives. All layouts read the same merged
// 42-row catalog assembled by main.jsx; requirement content is unchanged.

export const designs = {
  'design-a': {
    letter: 'A',
    name: 'Overview first',
    priority:
      'Puts the whole status distribution above a clean, searchable requirement list, so the workshop can open with the complete picture before filtering.',
  },
  'design-b': {
    letter: 'B',
    name: 'Browse first',
    priority:
      'Keeps the most requirements visible in a dense, readable table with a compact pie summary and filter menus, so a specific requirement is quick to find mid-discussion.',
  },
  'design-c': {
    letter: 'C',
    name: 'Persistent overview',
    priority:
      'Holds the summary and filters beside the list, so the whole picture stays visible while moving between statuses and categories.',
  },
};
// #home is the approved homepage; the router also accepts root and legacy #index.
export const standalonePage = 'home';
export const isDesignPage = (page) =>
  page === 'design-options' || page === standalonePage || page in designs;

// The five existing support statuses, verbatim, in fixed presentation order.
export const statusOrder = ['supported', 'workaround', 'partial', 'confirmation', 'gap'];
const statusGroupOrder = ['gap', 'confirmation', 'partial', 'workaround', 'supported'];
export const statusLabels = {
  supported: 'Supported',
  workaround: 'Workaround',
  partial: 'Partial',
  confirmation: 'Needs confirmation',
  gap: 'Gap',
};

// Read implementation from the same catalog as the page title/status/category.
// Gaps deliberately have no implementation; unresolved mappings stay explicit.
const implementationLabel = (requirement) =>
  requirement.status === 'gap' ? '' : requirement.implementation || 'To confirm';

const byNumber = (a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1));
const percent = (count, total) => (total ? (count / total) * 100 : 0);
const formatPercent = (value) => `${value.toFixed(1)}%`;

const groupModes = { none: 'None', category: 'Category', status: 'Status' };

function readState(design) {
  const raw = (
    design === standalonePage
      ? canonicalHome(location.hash) || location.hash
      : location.hash
  ).slice(1);
  const query = raw.startsWith(`${design}?`) ? raw.slice(design.length + 1) : '';
  const params = new URLSearchParams(query);
  const statuses = (params.get('status') || '')
    .split(',')
    .filter((s) => statusOrder.includes(s));
  const group = params.get('group');
  return {
    q: params.get('q') || '',
    statuses,
    category: params.get('cat') || 'all',
    group: group in groupModes ? group : 'none',
  };
}
function writeState(design, state) {
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.statuses.length) params.set('status', state.statuses.join(','));
  if (state.category !== 'all') params.set('cat', state.category);
  if (state.group !== 'none') params.set('group', state.group);
  const query = params.toString();
  const next = `#${design}${query ? `?${query}` : ''}`;
  if (location.hash !== next) history.replaceState(history.state, '', next);
}
const scrollKey = (design) => `landing-scroll:${design}`;

// One state hook shared by all three layouts: URL is the source of truth, so filters
// survive opening a requirement page and returning with the browser's Back control.
function useLandingState(design, catalog) {
  const [state, setState] = useState(() => readState(design));
  useEffect(() => {
    if (design === standalonePage) rememberHome(location.hash);
  }, [design, state]);
  useEffect(() => {
    const sync = () => {
      if (
        location.hash.slice(1).split('?')[0] === design ||
        (design === standalonePage && canonicalHome(location.hash))
      ) {
        setState(readState(design));
        if (design === standalonePage) rememberHome(location.hash);
      }
    };
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, [design]);
  useEffect(() => {
    const saved = sessionStorage.getItem(scrollKey(design));
    if (saved === null) return;
    sessionStorage.removeItem(scrollKey(design));
    const top = Number(saved);
    const id = setTimeout(() => window.scrollTo({ top, behavior: 'instant' }), 0);
    return () => clearTimeout(id);
  }, [design]);
  const update = (patch) =>
    setState((prev) => {
      const next = { ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) };
      writeState(design, next);
      return next;
    });
  const toggleStatus = (key) =>
    update((prev) => ({
      statuses: prev.statuses.includes(key)
        ? prev.statuses.filter((s) => s !== key)
        : statusOrder.filter((s) => s === key || prev.statuses.includes(s)),
    }));
  const reset = () => update({ q: '', statuses: [], category: 'all' });
  const rememberScroll = () =>
    sessionStorage.setItem(scrollKey(design), String(window.scrollY));

  const categories = useMemo(() => {
    const first = new Map();
    for (const r of [...catalog].sort(byNumber))
      if (!first.has(r.category)) first.set(r.category, r.id);
    return [...first.keys()];
  }, [catalog]);
  const summary = useMemo(
    () =>
      statusOrder.map((key) => {
        const count = catalog.filter((r) => r.status === key).length;
        return {
          key,
          label: statusLabels[key],
          count,
          pct: percent(count, catalog.length),
        };
      }),
    [catalog],
  );
  const filtered = useMemo(() => {
    const q = state.q.trim().toLowerCase();
    const digits = q.replace(/^r/, '');
    const numeric = /^\d+$/.test(digits);
    return catalog
      .filter((r) => {
        if (state.statuses.length && !state.statuses.includes(r.status)) return false;
        if (state.category !== 'all' && r.category !== state.category) return false;
        if (!q) return true;
        const id = r.id.toLowerCase();
        return (
          id.includes(q) ||
          (numeric && String(Number(r.id.slice(1))).startsWith(digits)) ||
          r.title.toLowerCase().includes(q)
        );
      })
      .sort(byNumber);
  }, [catalog, state]);
  const groups = useMemo(() => {
    if (state.group === 'category')
      return categories
        .map((name) => ({
          key: name,
          title: name,
          rows: filtered.filter((r) => r.category === name),
        }))
        .filter((g) => g.rows.length);
    if (state.group === 'status')
      return statusGroupOrder
        .map((key) => ({
          key,
          title: statusLabels[key],
          status: key,
          rows: filtered.filter((r) => r.status === key),
        }))
        .filter((g) => g.rows.length);
    return [{ key: 'all', rows: filtered }];
  }, [filtered, state.group, categories]);
  const active =
    Boolean(state.q.trim()) || state.statuses.length > 0 || state.category !== 'all';
  return {
    state,
    update,
    toggleStatus,
    reset,
    rememberScroll,
    categories,
    summary,
    filtered,
    groups,
    active,
    total: catalog.length,
  };
}

/* ---------- shared pieces ---------- */

export function DesignNav({ current }) {
  return (
    <nav className="design-nav" aria-label="Landing design options">
      <span className="design-nav-label">Landing design options</span>
      {Object.entries(designs).map(([key, d]) => (
        <a key={key} href={`#${key}`} aria-current={current === key ? 'page' : undefined}>
          {d.letter} · {d.name}
        </a>
      ))}
      <a
        href="#design-options"
        aria-current={current === 'design-options' ? 'page' : undefined}
      >
        Compare
      </a>
      <a href={`#${standalonePage}`}>B standalone</a>
      <a href="#index" className="design-nav-home">
        Current homepage
      </a>
    </nav>
  );
}

function PageTitle({ design, clean }) {
  return (
    <div className="landing-title">
      <p className="landing-eyebrow">
        {clean
          ? 'CDN workshop'
          : `Design ${designs[design].letter} · ${designs[design].name}`}
      </p>
      <h1>Akamai to Vercel: Migration Gap Analysis</h1>
      <p className="landing-lede">
        Explore how each requirement maps to Vercel, then open one for its evidence and
        remaining decision.
      </p>
      <a className="source-home-link" href="#sources">
        Original requirements →
      </a>
      {!clean && <p className="landing-priority">{designs[design].priority}</p>}
    </div>
  );
}

function barLabel(summary, total) {
  return `Requirement mappings, ${total} requirements: ${summary
    .map((s) => `${s.count} ${s.label} (${formatPercent(s.pct)})`)
    .join(', ')}.`;
}

// Composition bar. Decorative segments with a full text alternative; exact counts live
// in the accompanying legend or status control. Denominator is always the whole catalog.
function StackedBar({ summary, total, selected, thin }) {
  return (
    <div
      className={`stacked-bar${thin ? ' thin' : ''}`}
      role="img"
      aria-label={barLabel(summary, total)}
    >
      {summary.map((s) => (
        <span
          key={s.key}
          className={`segment ${s.key}${
            selected.length && !selected.includes(s.key) ? ' dim' : ''
          }`}
          style={{ flexGrow: s.count }}
          title={`${s.label}: ${s.count} (${formatPercent(s.pct)})`}
        />
      ))}
    </div>
  );
}

// Pie chart (design B). Slices reveal name and percentage on hover or keyboard focus and
// toggle that status in the shared filter; the text legend keeps exact counts visible.
function PieChart({ summary, total, selected, onToggle }) {
  const [hover, setHover] = useState(null);
  const box = useRef(null);
  const size = 132;
  const r = size / 2 - 2;
  const c = size / 2;
  let angle = -Math.PI / 2;
  const slices = summary
    .filter((s) => s.count > 0)
    .map((s) => {
      const sweep = (s.count / total) * Math.PI * 2;
      const start = angle;
      const end = angle + sweep;
      angle = end;
      const mid = (start + end) / 2;
      const point = (a, radius = r) => [
        c + radius * Math.cos(a),
        c + radius * Math.sin(a),
      ];
      const [x1, y1] = point(start);
      const [x2, y2] = point(end);
      const large = sweep > Math.PI ? 1 : 0;
      const d =
        s.count === total
          ? `M ${c} ${c - r} A ${r} ${r} 0 1 1 ${c} ${c + r} A ${r} ${r} 0 1 1 ${c} ${c - r} Z`
          : `M ${c} ${c} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
      return { ...s, d, centroid: point(mid, r * 0.62) };
    });
  const show = (s, x, y) => {
    const rect = box.current.getBoundingClientRect();
    setHover({ key: s.key, x: x - rect.left, y: y - rect.top });
  };
  const showAt = (s) => {
    const svg = box.current.querySelector('svg').getBoundingClientRect();
    const rect = box.current.getBoundingClientRect();
    const scale = svg.width / size;
    setHover({
      key: s.key,
      x: svg.left - rect.left + s.centroid[0] * scale,
      y: svg.top - rect.top + s.centroid[1] * scale,
    });
  };
  const active = hover && summary.find((s) => s.key === hover.key);
  return (
    <div className="pie-box" ref={box} onMouseLeave={() => setHover(null)}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        role="img"
        aria-label={barLabel(summary, total)}
      >
        {slices.map((s) => (
          <path
            key={s.key}
            d={s.d}
            className={`slice ${s.key}${
              (selected.length && !selected.includes(s.key)) ||
              (hover && hover.key !== s.key)
                ? ' dim'
                : ''
            }`}
            tabIndex={0}
            role="button"
            aria-pressed={selected.includes(s.key)}
            aria-label={`${s.label}: ${s.count} of ${total}, ${formatPercent(s.pct)}. Filter by this status`}
            onMouseMove={(e) => show(s, e.clientX, e.clientY)}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onToggle(s.key)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onToggle(s.key);
              }
            }}
            onFocus={() => showAt(s)}
            onBlur={() => setHover(null)}
          />
        ))}
      </svg>
      {active && (
        <div
          className="pie-tooltip"
          role="tooltip"
          style={{ left: hover.x, top: hover.y }}
        >
          <span className="pie-tooltip-title">
            <span className={`dot ${active.key}`} aria-hidden="true" />
            <strong>{active.label}</strong> · {formatPercent(active.pct)}
          </span>
          <span className="pie-tooltip-count">
            {active.count} of {total} requirements ·{' '}
            {selected.includes(active.key) ? 'click to remove filter' : 'click to filter'}
          </span>
        </div>
      )}
    </div>
  );
}

// Legend items are the Status control: each is a toggle button, so the chart's labels
// and the filter are one thing rather than a legend plus a second row of pills.
function StatusLegend({ summary, selected, onToggle, vertical }) {
  return (
    <div
      className={`status-legend${vertical ? ' vertical' : ''}`}
      role="group"
      aria-label="Filter by support status"
    >
      {summary.map((s) => (
        <button
          key={s.key}
          type="button"
          className="legend-item"
          aria-pressed={selected.includes(s.key)}
          onClick={() => onToggle(s.key)}
        >
          <span className={`dot ${s.key}`} aria-hidden="true" />
          <span className="legend-label">{s.label}</span>
          <span className="legend-count">{s.count}</span>
          <span className="legend-pct">{formatPercent(s.pct)}</span>
        </button>
      ))}
    </div>
  );
}

function SearchInput({ value, onChange, compact }) {
  const id = useId();
  return (
    <div className={`search-input${compact ? ' compact' : ''}`}>
      <label htmlFor={id}>Search</label>
      <div className="search-field">
        <input
          id={id}
          type="search"
          value={value}
          placeholder="R number or title"
          autoComplete="off"
          onChange={(e) => onChange(e.target.value)}
        />
        {value && (
          <button
            type="button"
            className="search-clear"
            aria-label="Clear search"
            onClick={() => onChange('')}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

function CategorySelect({ value, categories, onChange }) {
  const id = useId();
  return (
    <div className="control">
      <label htmlFor={id}>Category</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="all">All categories</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );
}

function GroupSelect({ value, onChange }) {
  const id = useId();
  return (
    <div className="control">
      <label htmlFor={id}>Group by</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {Object.entries(groupModes).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
    </div>
  );
}

// Segmented control for group mode (design B): radio semantics, arrow-key movement.
function GroupSegmented({ value, onChange }) {
  const keys = Object.keys(groupModes);
  const refs = useRef([]);
  const onKeyDown = (e, i) => {
    let next;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % keys.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
      next = (i - 1 + keys.length) % keys.length;
    else return;
    e.preventDefault();
    onChange(keys[next]);
    refs.current[next]?.focus();
  };
  return (
    <div className="control">
      <span className="control-label" id="group-by-label">
        Group by
      </span>
      <div className="segmented" role="radiogroup" aria-labelledby="group-by-label">
        {keys.map((k, i) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={value === k}
            tabIndex={value === k ? 0 : -1}
            ref={(el) => {
              refs.current[i] = el;
            }}
            onClick={() => onChange(k)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {groupModes[k]}
          </button>
        ))}
      </div>
    </div>
  );
}

// Status filter menu (design B): a labelled disclosure with checkboxes and counts, the
// pattern used by the dashboard's deployment status filter. Closes on outside click/Esc.
function StatusMenu({ summary, selected, onToggle, onClear }) {
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => {
      if (ref.current?.open && !ref.current.contains(e.target)) ref.current.open = false;
    };
    const esc = (e) => {
      if (e.key === 'Escape' && ref.current?.open) {
        ref.current.open = false;
        ref.current.querySelector('summary')?.focus();
      }
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', esc);
    };
  }, []);
  return (
    <div className="control">
      <span className="control-label" aria-hidden="true">
        Status
      </span>
      <details className="filter-menu" ref={ref}>
        <summary aria-label={`Status filter, ${selected.length || 'none'} selected`}>
          {selected.length
            ? selected.length === 1
              ? statusLabels[selected[0]]
              : `${selected.length} selected`
            : 'All statuses'}
          <span className="chevron" aria-hidden="true">
            ▾
          </span>
        </summary>
        <div className="filter-menu-panel">
          {summary.map((s) => (
            <label key={s.key} className="filter-option">
              <input
                type="checkbox"
                checked={selected.includes(s.key)}
                onChange={() => onToggle(s.key)}
              />
              <span className={`dot ${s.key}`} aria-hidden="true" />
              <span className="filter-option-label">{s.label}</span>
              <span className="filter-option-count">{s.count}</span>
            </label>
          ))}
          <button
            type="button"
            className="filter-menu-clear"
            disabled={!selected.length}
            onClick={onClear}
          >
            Show all statuses
          </button>
        </div>
      </details>
    </div>
  );
}

function orderText(group) {
  if (group === 'category') return 'grouped by category, numeric within each group';
  if (group === 'status') return 'grouped by status, numeric within each group';
  return 'in R01–R42 order';
}

function ResultsLine({ shown, total, group, active, onReset, state }) {
  const parts = [];
  if (state.statuses.length)
    parts.push(state.statuses.map((s) => statusLabels[s]).join(' + '));
  if (state.category !== 'all') parts.push(state.category);
  if (state.q.trim()) parts.push(`“${state.q.trim()}”`);
  return (
    <div className="results-line">
      <p role="status" aria-live="polite">
        Showing <strong>{shown}</strong> of {total} requirements, {orderText(group)}
        {parts.length > 0 && (
          <>
            {' · '}
            <span className="active-filters">{parts.join(' · ')}</span>
          </>
        )}
      </p>
      {active && (
        <button type="button" className="reset" onClick={onReset}>
          Clear filters
        </button>
      )}
    </div>
  );
}

// Optional disclosure, shown only when Workaround or Partial is selected. It explains
// the dimensions to weigh without inventing latency or cost figures.
function TradeoffNote({ statuses }) {
  if (!statuses.some((s) => s === 'workaround' || s === 'partial')) return null;
  return (
    <details className="tradeoff-note">
      <summary>How to read workaround trade-offs</summary>
      <p>
        Workaround means a different Vercel implementation with a trade-off to weigh, not
        a fixed extra cost. Where the custom part runs matters: Middleware on each
        matching request (R32 logs the cookie even when the content is a cache HIT), a
        Function only on a cache miss (R23 fetches the origin only when the variant is
        missing), or an external service such as Queue-it (R36, R37) that adds an
        integration dependency. Latency and cost were not measured for this overview; each
        requirement page states exactly what was demonstrated.
      </p>
    </details>
  );
}

function EmptyState({ onReset }) {
  return (
    <div className="landing-empty">
      <p>
        <strong>No requirements match these filters.</strong>
      </p>
      <p>Try a different R number or title, or clear the filters.</p>
      <button type="button" onClick={onReset}>
        Clear filters
      </button>
    </div>
  );
}

const rowHref = (r, exerciseUrl) =>
  r.id === 'R32'
    ? exerciseUrl.startsWith('#')
      ? exerciseUrl
      : `${exerciseUrl.split('#')[0]}#r32?${new URLSearchParams({ home: homeHref() })}`
    : `#${r.id.toLowerCase()}`;

function GroupHeading({ group, as: Tag = 'h2' }) {
  if (!group.title) return null;
  return (
    <Tag className={`group-heading${group.status ? ` ${group.status}` : ''}`}>
      {group.status && <span className={`dot ${group.status}`} aria-hidden="true" />}
      {group.title} <span className="group-count">{group.rows.length}</span>
    </Tag>
  );
}

/* ---------- Design A: overview first ---------- */

function RowList({ groups, exerciseUrl, onOpen, showNote = true, hideCategory }) {
  return groups.map((g) => (
    <section className="row-group" key={g.key}>
      <GroupHeading group={g} />
      <ul className="row-list">
        {g.rows.map((r) => (
          <li className="row" key={r.id}>
            <span className="row-id">{r.id}</span>
            <div className="row-main">
              <a href={rowHref(r, exerciseUrl)} className="row-link" onClick={onOpen}>
                {r.title}
              </a>
              {showNote && <p className="row-note">{r.note}</p>}
              <p className="row-meta">
                {!hideCategory && <span>{r.category}</span>}
                {implementationLabel(r) && <span>{implementationLabel(r)}</span>}
              </p>
            </div>
            <span className={`status-badge ${r.status}`}>{statusLabels[r.status]}</span>
          </li>
        ))}
      </ul>
    </section>
  ));
}

function DesignA({ catalog, exerciseUrl }) {
  const L = useLandingState('design-a', catalog);
  return (
    <div className="landing design-a">
      <PageTitle design="design-a" />
      <section className="overview" aria-labelledby="overview-a">
        <div className="overview-head">
          <h2 id="overview-a">Requirement mappings</h2>
          <span className="overview-total">{L.total} requirements</span>
        </div>
        <StackedBar summary={L.summary} total={L.total} selected={L.state.statuses} />
        <StatusLegend
          summary={L.summary}
          selected={L.state.statuses}
          onToggle={L.toggleStatus}
        />
        <p className="scope-note">
          Unweighted count of requirement mappings in this local catalog, not migration
          effort or verified customer parity. Select a status to filter the list; the
          summary always shows all {L.total}.
        </p>
      </section>
      <div className="toolbar">
        <SearchInput value={L.state.q} onChange={(q) => L.update({ q })} />
        <CategorySelect
          value={L.state.category}
          categories={L.categories}
          onChange={(category) => L.update({ category })}
        />
        <GroupSelect value={L.state.group} onChange={(group) => L.update({ group })} />
      </div>
      <ResultsLine
        shown={L.filtered.length}
        total={L.total}
        group={L.state.group}
        active={L.active}
        onReset={L.reset}
        state={L.state}
      />
      <TradeoffNote statuses={L.state.statuses} />
      {L.filtered.length ? (
        <RowList groups={L.groups} exerciseUrl={exerciseUrl} onOpen={L.rememberScroll} />
      ) : (
        <EmptyState onReset={L.reset} />
      )}
    </div>
  );
}

/* ---------- Design B: browse first ---------- */

function DesignB({ catalog, exerciseUrl, route = 'design-b', clean = false }) {
  const L = useLandingState(route, catalog);
  const [details, setDetails] = useState(false);
  const detailsId = useId();
  return (
    <div className="landing design-b">
      <div className="b-head">
        <PageTitle design="design-b" clean={clean} />
        <section className="b-summary" aria-labelledby="overview-b">
          <div className="overview-head">
            <h2 id="overview-b">Requirement mappings</h2>
            <span className="overview-total">{L.total} requirements</span>
          </div>
          <div className="pie-row">
            <PieChart
              summary={L.summary}
              total={L.total}
              selected={L.state.statuses}
              onToggle={L.toggleStatus}
            />
            <ul className="text-legend vertical">
              {L.summary.map((s) => (
                <li
                  key={s.key}
                  className={
                    L.state.statuses.length && !L.state.statuses.includes(s.key)
                      ? 'dim'
                      : ''
                  }
                >
                  <span className={`dot ${s.key}`} aria-hidden="true" />
                  <span className="text-legend-label">{s.label}</span>
                  <strong>{s.count}</strong>
                  <span className="legend-pct">{formatPercent(s.pct)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
      <div className="toolbar b-toolbar">
        <SearchInput value={L.state.q} onChange={(q) => L.update({ q })} compact />
        <StatusMenu
          summary={L.summary}
          selected={L.state.statuses}
          onToggle={L.toggleStatus}
          onClear={() => L.update({ statuses: [] })}
        />
        <CategorySelect
          value={L.state.category}
          categories={L.categories}
          onChange={(category) => L.update({ category })}
        />
        <GroupSegmented value={L.state.group} onChange={(group) => L.update({ group })} />
        <label className="toggle" htmlFor={detailsId}>
          <input
            id={detailsId}
            type="checkbox"
            checked={details}
            onChange={(e) => setDetails(e.target.checked)}
          />
          Show descriptions
        </label>
      </div>
      <ResultsLine
        shown={L.filtered.length}
        total={L.total}
        group={L.state.group}
        active={L.active}
        onReset={L.reset}
        state={L.state}
      />
      <TradeoffNote statuses={L.state.statuses} />
      {L.filtered.length ? (
        <div className="table-scroll">
          <table className="req-table">
            <thead>
              <tr>
                <th scope="col" className="col-id">
                  #
                </th>
                <th scope="col">Requirement</th>
                <th scope="col" className="col-category">
                  Category
                </th>
                <th scope="col" className="col-impl">
                  Implementation
                </th>
                <th scope="col" className="col-status">
                  Status
                </th>
              </tr>
            </thead>
            {L.groups.map((g) => (
              <tbody key={g.key}>
                {g.title && (
                  <tr className="group-row">
                    <th scope="rowgroup" colSpan={5}>
                      <GroupHeading group={g} as="span" />
                    </th>
                  </tr>
                )}
                {g.rows.map((r) => (
                  <tr key={r.id}>
                    <td className="col-id">
                      <span className="row-id">{r.id}</span>
                    </td>
                    <td>
                      <a
                        href={rowHref(r, exerciseUrl)}
                        className="row-link"
                        onClick={L.rememberScroll}
                      >
                        {r.title}
                      </a>
                      <span className="cell-category">{r.category}</span>
                      {details && <p className="row-note">{r.note}</p>}
                    </td>
                    <td className="col-category">{r.category}</td>
                    <td className="col-impl">{implementationLabel(r) || ''}</td>
                    <td className="col-status">
                      <span className={`status-badge ${r.status}`}>
                        {statusLabels[r.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      ) : (
        <EmptyState onReset={L.reset} />
      )}
    </div>
  );
}

/* ---------- Design C: persistent overview ---------- */

function DesignC({ catalog, exerciseUrl }) {
  const L = useLandingState('design-c', catalog);
  return (
    <div className="landing design-c">
      <PageTitle design="design-c" />
      <div className="split">
        <aside className="side" aria-label="Summary and filters">
          <section className="overview side-overview" aria-labelledby="overview-c">
            <div className="overview-head">
              <h2 id="overview-c">Requirement mappings</h2>
              <span className="overview-total">{L.total}</span>
            </div>
            <StackedBar summary={L.summary} total={L.total} selected={L.state.statuses} />
            <StatusLegend
              summary={L.summary}
              selected={L.state.statuses}
              onToggle={L.toggleStatus}
              vertical
            />
            <p className="scope-note">
              Unweighted count of requirement mappings in this local catalog, not
              migration effort or verified parity. The summary always shows all {L.total}.
            </p>
          </section>
          <div className="side-controls">
            <SearchInput value={L.state.q} onChange={(q) => L.update({ q })} />
            <CategorySelect
              value={L.state.category}
              categories={L.categories}
              onChange={(category) => L.update({ category })}
            />
            <GroupSelect
              value={L.state.group}
              onChange={(group) => L.update({ group })}
            />
            {L.active && (
              <button type="button" className="reset" onClick={L.reset}>
                Clear filters
              </button>
            )}
          </div>
        </aside>
        <div className="list-pane">
          <ResultsLine
            shown={L.filtered.length}
            total={L.total}
            group={L.state.group}
            active={false}
            state={L.state}
          />
          <TradeoffNote statuses={L.state.statuses} />
          {L.filtered.length ? (
            <RowList
              groups={L.groups}
              exerciseUrl={exerciseUrl}
              onOpen={L.rememberScroll}
              hideCategory={L.state.group === 'category'}
            />
          ) : (
            <EmptyState onReset={L.reset} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Comparison page ---------- */

const comparison = [
  {
    aspect: 'Overview placement',
    a: 'Full-width bar and legend above the list.',
    b: 'Pie chart beside the title; hover or focus a slice for name and percentage; legend keeps counts.',
    c: 'Bar and vertical legend in a persistent side column.',
  },
  {
    aspect: 'Status control',
    a: 'Legend items toggle statuses (multi-select).',
    b: 'Pie slices and a Status menu with checkboxes toggle the same selection.',
    c: 'Vertical legend items toggle statuses (multi-select).',
  },
  {
    aspect: 'Row density',
    a: 'One requirement per row with description and metadata.',
    b: 'Table rows; descriptions hidden until switched on.',
    c: 'Narrower list rows with description and metadata.',
  },
  {
    aspect: 'Best moment',
    a: 'Opening the workshop with the whole picture.',
    b: 'Finding a requirement quickly during discussion.',
    c: 'Moving between statuses and categories while presenting.',
  },
  {
    aspect: 'Mobile',
    a: 'Stacks naturally; legend wraps.',
    b: 'Category and implementation columns fold under the title.',
    c: 'Side column stacks above the list.',
  },
];

function DesignOptions({ catalog }) {
  const L = useLandingState('design-options', catalog);
  return (
    <div className="landing design-options">
      <div className="landing-title">
        <p className="landing-eyebrow">Local design alternatives · 28 September 2026</p>
        <h1>Landing page options</h1>
        <p className="landing-lede">
          Three layouts for the same workshop screen. Each uses the identical {L.total}
          -requirement catalog, five statuses, wording, search, Category and Group by
          controls; only the layout and the placement of the status control differ.
        </p>
        <p className="scope-note">
          These archived alternatives remain available for comparison. The approved
          homepage is <a href="#home">#home</a>. Nothing here is deployed.{' '}
          <a href={`#${standalonePage}`}>#home</a> shows design B on its own, without this
          comparison framing.
        </p>
      </div>
      <ul className="option-list">
        {Object.entries(designs).map(([key, d]) => (
          <li key={key} className="option">
            <div className="option-head">
              <span className="option-letter">{d.letter}</span>
              <h2>{d.name}</h2>
            </div>
            <p>{d.priority}</p>
            <a className="option-link" href={`#${key}`}>
              Open design {d.letter} →
            </a>
          </li>
        ))}
      </ul>
      <div className="table-scroll">
        <table className="compare-table">
          <thead>
            <tr>
              <th scope="col">Aspect</th>
              <th scope="col">A · Overview first</th>
              <th scope="col">B · Browse first</th>
              <th scope="col">C · Persistent overview</th>
            </tr>
          </thead>
          <tbody>
            {comparison.map((row) => (
              <tr key={row.aspect}>
                <th scope="row">{row.aspect}</th>
                <td>{row.a}</td>
                <td>{row.b}</td>
                <td>{row.c}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="scope-note">
        Shared in all three: summary computed from the active catalog (
        {L.summary.map((s) => `${s.count} ${s.label}`).join(', ')}); the {L.total}{' '}
        denominator stays fixed while filters change the visible count; filter state is
        kept in the URL so returning from a requirement page restores it.
      </p>
    </div>
  );
}

export function LandingDesignPage({ page, catalog, exerciseUrl }) {
  if (page === standalonePage)
    return (
      <DesignB catalog={catalog} exerciseUrl={exerciseUrl} route={standalonePage} clean />
    );
  return (
    <>
      <DesignNav current={page} />
      {page === 'design-a' && <DesignA catalog={catalog} exerciseUrl={exerciseUrl} />}
      {page === 'design-b' && <DesignB catalog={catalog} exerciseUrl={exerciseUrl} />}
      {page === 'design-c' && <DesignC catalog={catalog} exerciseUrl={exerciseUrl} />}
      {page === 'design-options' && <DesignOptions catalog={catalog} />}
    </>
  );
}

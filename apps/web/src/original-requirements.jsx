import React, { useState } from 'react';
import source from './original-requirements.json';
import { HomeLink } from './home-link.jsx';
import './original-requirements.css';

export default function OriginalRequirements({ catalog, exerciseUrl }) {
  const params = new URLSearchParams(location.hash.split('?')[1]);
  const [query, setQuery] = useState(params.get('q') || '');
  const [view, setView] = useState(params.get('view') === 'pdf' ? 'pdf' : 'lookup');
  const term = query.trim().toLowerCase();
  const numericId = /^r?0?(\d{1,2})$/i.exec(term);
  const wantedId = numericId ? `R${numericId[1].padStart(2, '0')}` : null;
  const catalogById = new Map(catalog.map((r) => [r.id, r]));
  function update(nextQuery, nextView) {
    setQuery(nextQuery);
    setView(nextView);
    const next = new URLSearchParams();
    if (nextQuery) next.set('q', nextQuery);
    if (nextView === 'pdf') next.set('view', 'pdf');
    history.replaceState(history.state, '', `#sources${next.size ? `?${next}` : ''}`);
  }
  const overviewRows = source.rows.filter((r) =>
    wantedId
      ? r.requirements.includes(wantedId)
      : `${r.functionality} ${r.usage} ${r.requirements.join(' ')}`
          .toLowerCase()
          .includes(term),
  );
  const lookupRows = source.lookup.filter((r) => {
    if (wantedId) return r.id === wantedId;
    const original = source.rows.filter((row) => row.requirements.includes(r.id));
    return `${r.id} ${catalogById.get(r.id)?.title} ${original.map((row) => `${row.functionality} ${row.usage}`).join(' ')} ${r.configurationExcerpt?.text || ''}`
      .toLowerCase()
      .includes(term);
  });
  function requirementLink(id) {
    return (
      <a key={id} href={id === 'R32' ? exerciseUrl : `#${id.toLowerCase()}`}>
        {id}
      </a>
    );
  }
  return (
    <div className="original-requirements">
      <HomeLink className="back">← All requirements</HomeLink>
      <h1>Original requirements</h1>
      <p className="source-intro">
        Find the customer’s original wording from a workshop number. The PDFs have no
        R-numbers; we added these references. One original row can relate to several
        workshop items.
      </p>
      <div className="source-controls">
        <label>
          Find a requirement
          <input
            type="search"
            placeholder="R21, cookie, redirect…"
            value={query}
            onChange={(e) => update(e.target.value, view)}
          />
        </label>
        <div className="source-views" role="group" aria-label="Source table view">
          <button
            aria-pressed={view === 'lookup'}
            onClick={() => update(query, 'lookup')}
          >
            R01–R42 lookup
          </button>
          <button aria-pressed={view === 'pdf'} onClick={() => update(query, 'pdf')}>
            Original PDF table
          </button>
        </div>
        {query && <button onClick={() => update('', view)}>Clear search</button>}
      </div>
      {view === 'lookup' ? (
        <>
          <p className="small">
            {lookupRows.length} of 42 workshop items · References use PDF page numbers.
            “PM Config” is the 33-page configuration document; “Feature overview” is the
            3-page requirements table.
          </p>
          <div
            className="source-table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Workshop numbers mapped to original source"
          >
            <table className="source-reference-table">
              <thead>
                <tr>
                  <th scope="col">Workshop item</th>
                  <th scope="col">Original wording</th>
                  <th scope="col">Source references</th>
                </tr>
              </thead>
              <tbody>
                {lookupRows.map((r) => {
                  const rows = source.rows.filter((row) =>
                    row.requirements.includes(r.id),
                  );
                  return (
                    <tr key={r.id}>
                      <th scope="row">
                        {requirementLink(r.id)}
                        <span className="source-workshop-title">
                          {catalogById.get(r.id)?.title}
                        </span>
                      </th>
                      <td>
                        {rows.map((row) => (
                          <div className="source-excerpt" key={row.key}>
                            <strong>{row.functionality}</strong>
                            {row.usage ? (
                              <p>{row.usage}</p>
                            ) : (
                              <p className="small">Usage cell is blank in the PDF.</p>
                            )}
                            <small>Feature overview, p. {row.pages}</small>
                          </div>
                        ))}
                        {r.configurationExcerpt && (
                          <div className="source-excerpt">
                            <strong>{r.configurationExcerpt.heading}</strong>
                            <p>{r.configurationExcerpt.text}</p>
                            <small>
                              PM Config excerpt, p. {r.configurationExcerpt.page}. This
                              item has no separate row in the feature overview.
                            </small>
                          </div>
                        )}
                      </td>
                      <td>
                        {r.references.map((ref) => (
                          <p key={ref}>{ref}</p>
                        ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <h2>{source.tableTitle}</h2>
          <p className="small">
            {source.title}. Original wording, spelling, order and blank cells retained;
            PDF line wrapping removed. Workshop numbers and page references are our
            additions. The original “Vercel Equivalent / Gap” column is blank throughout.
          </p>
          <p className="small">
            {overviewRows.length} of 21 original rows. Eight workshop items come from
            configuration detail rather than a separate overview row; use R01–R42 lookup
            to find them.
          </p>
          <div
            className="source-table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Original PDF requirements table"
          >
            <table className="source-reference-table source-pdf-table">
              <thead>
                <tr>
                  <th scope="col">Workshop numbers</th>
                  {source.columns.map((c) => (
                    <th scope="col" key={c}>
                      {c}
                    </th>
                  ))}
                  <th scope="col">PDF page</th>
                </tr>
              </thead>
              <tbody>
                {overviewRows.map((r) => (
                  <tr key={r.key}>
                    <td>
                      <div className="source-id-list">
                        {r.requirements.map(requirementLink)}
                      </div>
                    </td>
                    <th scope="row">{r.functionality}</th>
                    <td>{r.usage}</td>
                    <td aria-label="Blank in original PDF">{r.equivalent}</td>
                    <td>{r.pages}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {(view === 'lookup' ? lookupRows.length : overviewRows.length) === 0 && (
        <p>
          No matching rows. Clear the search or switch to R01–R42 lookup for
          configuration-only items.
        </p>
      )}
      <p className="source-footnote">
        This is a source reference, not a support assessment. Open the linked workshop
        item for the current mapping and its qualifications.
      </p>
    </div>
  );
}

export function OriginalRequirementDetails({ id }) {
  const requirementId = id.toUpperCase();
  const entry = source.lookup.find((r) => r.id === requirementId);
  if (!entry) return null;
  const rows = source.rows.filter((r) => r.requirements.includes(requirementId));
  return (
    <details className="original-requirement-brief" key={requirementId}>
      <summary>Original requirement (PDF)</summary>
      <div className="original-requirement-body">
        {rows.map((row) => (
          <div className="source-excerpt" key={row.key}>
            <strong>{row.functionality}</strong>
            {row.usage ? (
              <blockquote>{row.usage}</blockquote>
            ) : (
              <p className="small">The usage cell is blank in the original PDF.</p>
            )}
          </div>
        ))}
        {entry.configurationExcerpt && (
          <div className="source-excerpt">
            <strong>{entry.configurationExcerpt.heading}</strong>
            <blockquote>{entry.configurationExcerpt.text}</blockquote>
          </div>
        )}
        <a href={`#sources?q=${requirementId}`}>
          View {requirementId} in the source table →
        </a>
      </div>
    </details>
  );
}

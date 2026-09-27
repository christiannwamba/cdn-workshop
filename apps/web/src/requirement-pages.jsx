import { CookiesNavigation } from './cookies-navigation.jsx';
import { RoutingNavigation } from './routing-navigation.jsx';
import { RequestRuleNavigation } from './request-rule-navigation.jsx';
import React, { useState } from 'react';
import { CodeBlock } from './code-block.jsx';
import pages from './requirement-content.json';
import { LoggingNavigation } from './logging-navigation.jsx';
import { ProcessingNavigation } from './processing-navigation.jsx';

export const requirementCatalog = Object.entries(pages).map(([id, page]) => ({
  id: id.toUpperCase(),
  title: page.title,
  status: page.status,
  category: page.category,
  note: page.note,
  implemented: true,
}));
function Source({ source }) {
  const [open, setOpen] = useState(false);
  return (
    <details className="source" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>{source.title || 'Code and configuration'}</summary>
      <p className="small">
        {source.label} ·{' '}
        <code>
          {source.path}
          {source.first ? `:${source.first}–${source.last}` : ''}
        </code>
      </p>
      {open && <CodeBlock source={source} />}
    </details>
  );
}
function Observation({ page: p }) {
  return (
    <>
      {p.table && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {p.table.headers.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {p.table.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((v, j) => (
                    <td key={j}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {p.observation && <p className="small">{p.observation}</p>}
    </>
  );
}
export function RequirementPage({ id, Diagram, profile }) {
  const p = pages[id];
  return (
    <>
      <a className="back" href="#index">
        ← All requirements
      </a>
      <div className="hero">
        <span className={`badge ${p.status}`}>
          {id.toUpperCase()} · {p.statusText || 'Mapping to validate'}
        </span>
        <h1>{p.title}</h1>
        <p className="lede">{p.intro}</p>
        <p className="small">
          {p.scope ||
            'Explanation and decision · customer behavior has not been validated on Vercel.'}
        </p>
      </div>
      <LoggingNavigation id={id} profile={profile} />
      <ProcessingNavigation id={id} />
      <RoutingNavigation id={id} />
      <RequestRuleNavigation id={id} />
      <CookiesNavigation id={id} />
      <Diagram
        key={id}
        id={id}
        source={p.diagram}
        previousSource={p.previousDiagram}
        description={p.flow}
      />
      <section>
        <h2>{p.sectionTitle || 'How the mapping works'}</h2>
        {(p.paragraphs || []).map((t) => (
          <p key={t}>{t}</p>
        ))}
        {p.exercise && (
          <>
            <p>
              <a href={p.exercise.url} target="_blank" rel="noopener noreferrer">
                {p.exercise.label} ↗
              </a>
            </p>
            <p>{p.exercise.intro}</p>
            <ol className="exercise">
              {p.exercise.steps.map((step) => (
                <li key={step.title}>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                  {(step.sources || []).map((source, i) => (
                    <Source key={i} source={source} />
                  ))}
                </li>
              ))}
            </ol>
            <p className="small">{p.exercise.reset}</p>
          </>
        )}
        {p.recorded ? (
          <details className="source">
            <summary>{p.recordedTitle}</summary>
            <Observation page={p} />
          </details>
        ) : (
          <Observation page={p} />
        )}
        {(p.sources || []).map((s, i) => (
          <Source key={i} source={s} />
        ))}
        {p.code && (
          <Source
            source={{
              path: 'illustrative-policy.ts',
              label: 'Illustrative design only; not deployed or customer-validated',
              code: p.code,
            }}
          />
        )}
        {p.detail && (
          <details className="source">
            <summary>{p.detailTitle || 'Mapping details'}</summary>
            <p>{p.detail}</p>
          </details>
        )}
        {p.docs?.length > 0 && (
          <p className="small">
            {p.docs.map((d, i) => (
              <React.Fragment key={d.url}>
                {i > 0 && ' · '}
                <a href={d.url} target="_blank" rel="noopener noreferrer">
                  {d.label} ↗
                </a>
              </React.Fragment>
            ))}
          </p>
        )}
      </section>
      <section>
        <h2>Decision</h2>
        <p>{p.decision}</p>
        {p.related?.length > 0 && (
          <p className="related">
            Related:{' '}
            {p.related.map((r, i) => (
              <React.Fragment key={r.id}>
                {i > 0 && ' · '}
                <a href={`#${r.id.toLowerCase()}`}>
                  {r.id.toUpperCase()} · {r.label}
                </a>
              </React.Fragment>
            ))}
          </p>
        )}
      </section>
    </>
  );
}

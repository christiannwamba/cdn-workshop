import { OriginalRequirementDetails } from './original-requirements.jsx';
import {
  CodeExample,
  FoldedEvidence,
  polishedDiagramLayout,
} from './page-presentation.jsx';
import { HomeLink } from './home-link.jsx';
import { TransportNavigation } from './transport-navigation.jsx';
import { CookiesNavigation } from './cookies-navigation.jsx';
import { RoutingNavigation } from './routing-navigation.jsx';
import { RequestRuleNavigation } from './request-rule-navigation.jsx';
import React, { useState } from 'react';
import { CodeBlock } from './code-block.jsx';
import pages from './requirement-content.json';
import { LoggingNavigation } from './logging-navigation.jsx';
import { ProcessingNavigation } from './processing-navigation.jsx';
import { ComparisonDiagram } from './comparison-diagram.jsx';

export const requirementCatalog = Object.entries(pages).map(([id, page]) => ({
  id: id.toUpperCase(),
  title: page.title,
  status: page.status,
  category: page.category,
  note: page.note,
  implementation: page.implementation,
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
  if (
    [
      'r03',
      'r35',
      'r36',
      'r37',
      'r38',
      'r42',
      'r26',
      'r31',
      'r33',
      'r34',
      'r01',
      'r02',
      'r04',
      'r07',
      'r08',
      'r18',
      'r41',
      'r11',
      'r12',
      'r13',
      'r14',
      'r15',
      'r16',
      'r17',
      'r25',
      'r30',
      'r27',
      'r28',
      'r40',
    ].includes(id)
  )
    return <CorrectedRequirement id={id} p={p} Diagram={Diagram} profile={profile} />;
  if (['r19', 'r39', 'r10'].includes(id))
    return <PilotRequirement id={id} p={p} Diagram={Diagram} />;
  return (
    <>
      <HomeLink className="back">← All requirements</HomeLink>
      <div className="hero">
        <span className={`badge ${p.status}`}>
          {id.toUpperCase()} · {p.statusText || 'Mapping to validate'}
        </span>
        <h1>{p.title}</h1>
        <p className="lede">{p.intro}</p>
        <OriginalRequirementDetails id={id} />
        {p.scope !== '' && (
          <p className="small">
            {p.scope ||
              'Explanation and decision · customer behavior has not been validated on Vercel.'}
          </p>
        )}
      </div>
      <LoggingNavigation id={id} profile={profile} />
      <ProcessingNavigation id={id} />
      <RoutingNavigation id={id} />
      <RequestRuleNavigation id={id} />
      <CookiesNavigation id={id} />
      <TransportNavigation id={id} />
      <Diagram
        key={id}
        id={id}
        title={p.diagramTitle}
        source={p.diagram}
        previousSource={p.previousDiagram}
        description={p.flow}
      />
      <RequirementEvidence p={p} />
      <section>
        <h2>
          {id === 'r19' || id === 'r39'
            ? 'Customer policy to map'
            : id === 'r10'
              ? 'What needs confirmation'
              : 'Decision'}
        </h2>
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

function CorrectedRequirement({ id, p, Diagram, profile }) {
  const view = p.presentation;
  const diagramProps = {
    variant: 'polished',
    renderConfig: polishedDiagramLayout,
  };
  const approach = {
    source: p.diagram,
    previousSource: p.previousDiagram,
    description: p.flow,
    actorRoles: view.actorRoles || {},
  };
  return (
    <div className="page-polish">
      <HomeLink className="back">← All requirements</HomeLink>
      <div className="hero">
        <span className={`badge ${p.status}`}>
          {id.toUpperCase()} · {p.statusText}
        </span>
        <h1>{p.title}</h1>
        <p className="lede">{p.intro}</p>
        <OriginalRequirementDetails id={id} />
      </div>
      {view.requiredDiagram ? (
        <ComparisonDiagram
          id={id}
          Diagram={Diagram}
          required={{
            source: view.requiredDiagram,
            previousSource: view.requiredPreviousDiagram,
            description: view.requiredFlow,
            actorRoles: {},
          }}
          approach={approach}
          diagramProps={{ ...diagramProps, hideTitle: true }}
          difference={view.difference}
          differenceTitle={view.differenceTitle}
          differencePlacement="below"
        />
      ) : (
        <>
          <Diagram
            id={id}
            title={p.diagramTitle || 'Where the code runs'}
            {...diagramProps}
            {...approach}
          />
          {view.difference && (
            <div className="pattern-difference pattern-difference-below">
              <h3>{view.differenceTitle}</h3>
              <p>{view.difference}</p>
            </div>
          )}
        </>
      )}
      {view.implementationSources && (
        <section className="implementation">
          <h2>Implementation example</h2>
          <p>{view.implementationIntro}</p>
          {view.implementationSources.map((source) => (
            <React.Fragment key={source.path}>
              <h3>{source.title}</h3>
              <CodeExample source={source} role={source.label} />
            </React.Fragment>
          ))}
        </section>
      )}
      <p>{p.decision}</p>
      {hasDemo(id, p) && (
        <FoldedEvidence title="Demo">
          <RequirementEvidence p={p} id={id} />
        </FoldedEvidence>
      )}
      <LoggingNavigation id={id} profile={profile} />
      <CookiesNavigation id={id} />
      {['r27', 'r28'].includes(id) && <TransportNavigation id={id} />}
      {id === 'r40' && <ProcessingNavigation id={id} />}
      {['r01', 'r02', 'r04', 'r07', 'r08', 'r18', 'r41'].includes(id) && (
        <RequestRuleNavigation id={id} />
      )}
      <p className="related">
        Related:{' '}
        {p.related.map((item, i) => (
          <React.Fragment key={item.id}>
            {i > 0 && ' · '}
            <a href={`#${item.id}`}>
              {item.id.toUpperCase()} · {item.label}
            </a>
          </React.Fragment>
        ))}
      </p>
    </div>
  );
}

// A demo is an exercise or a recorded observation, never a reference drawer.
function hasDemo(id, p) {
  return id !== 'r37' && Boolean(p.exercise || p.table);
}
function RequirementEvidence({ p, id }) {
  const runnable = p.exercise && !['r27', 'r35'].includes(id);
  return (
    <section>
      {runnable ? (
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
              </li>
            ))}
          </ol>
          <p className="small">{p.exercise.reset}</p>
        </>
      ) : (
        <p>
          This is a recorded demonstration, not a live test. A hands-on replay can be
          arranged separately.
        </p>
      )}
      <h3>{p.recordedTitle || 'Recorded result'}</h3>
      {p.scope && <p className="small">{p.scope}</p>}
      <Observation page={p} />
    </section>
  );
}

function PilotRequirement({ id, p, Diagram }) {
  const supported = id !== 'r10';
  const source =
    id === 'r19'
      ? p.exercise.steps[1].sources[0]
      : id === 'r39'
        ? p.implementationSource || p.exercise.steps[0].sources[0]
        : null;
  return (
    <div className="page-polish">
      <HomeLink className="back">← All requirements</HomeLink>
      <div className="hero">
        <span className={`badge ${p.status}`}>
          {id.toUpperCase()} · {p.statusText}
        </span>
        <h1>{p.title}</h1>
        <p className="lede">{p.intro}</p>
        <OriginalRequirementDetails id={id} />
      </div>
      <Diagram
        id={id}
        title={p.diagramTitle}
        source={p.diagram}
        previousSource={p.previousDiagram}
        description={p.flow}
        variant="polished"
        renderConfig={polishedDiagramLayout}
        actorRoles={id === 'r39' ? { M: 'vercel', V: 'vercel' } : {}}
      />
      {supported ? (
        <section className="implementation">
          <h2>Implementation example</h2>
          {id === 'r19' ? (
            <>
              <p>
                For assets, two ordered rules express cookie <strong>OR</strong> header.
                The cookie branch also sets the outgoing header. Both match literal
                lowercase <code>true</code>; the final rule selects normal assets.
              </p>
              <CodeExample
                source={source}
                role="Native routing · asset matching fields"
                code={`[
  {
    "src": "^(/static/.*)$",
    "has": [
      {"type": "host", "value": {"eq": "argos-ws-native-routing.vercel.app"}},
      {"type": "cookie", "key": "internal-cell", "value": {"re": "(?-i)^true$"}}
    ]
  },
  {
    "src": "^(/static/.*)$",
    "has": [
      {"type": "header", "key": "x-argos-internal-cell", "value": {"re": "(?-i)^true$"}}
    ]
  }
]`}
              />
              <p className="small">
                Matching fields from the two deployed alternate-asset rules. Destinations,
                the outgoing-header transform and the default rule are omitted.
                Application routes use the cookie condition only; a header alone does not
                switch the application. The downstream recorder reports the destination
                and does not choose it.
              </p>
            </>
          ) : (
            <>
              <p>
                The guard checks whether <code>ewresponse</code> is present. The retry
                generated by the handler uses <code>ewresponse=retry</code>; the guard
                does not validate its value.
              </p>
              <CodeExample
                source={source}
                role="Middleware · processing guard and retry"
              />
              <p className="small">
                This skips only the selected processing step, then rewrites to the
                backend. The actual PIM code still determines where its processing
                belongs. This handles a reported failure, not automatic crash recovery.
              </p>
            </>
          )}
        </section>
      ) : (
        <p>{p.decision}</p>
      )}
      {supported && <p>{p.decision}</p>}
      {hasDemo(id, p) && (
        <FoldedEvidence title="Demo">
          <RequirementEvidence p={p} id={id} />
        </FoldedEvidence>
      )}
      <p className="related">
        Related:{' '}
        {p.related.map((item, i) => (
          <React.Fragment key={item.id}>
            {i > 0 && ' · '}
            <a href={`#${item.id}`}>
              {item.id.toUpperCase()} · {item.label}
            </a>
          </React.Fragment>
        ))}
      </p>
    </div>
  );
}

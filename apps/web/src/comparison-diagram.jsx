import React, { useRef, useState } from 'react';

// Keep the existing id for the approach so participants retain their saved edits.
// The requirement has a separate key; opening it must never replace the approach.
// `differencePlacement="below"` moves the trade-off under the selected diagram with a
// plain heading; the default preserves the earlier above-panel presentation.
// `diagramProps` are shared by both tabs (for example a presentation variant).
export function ComparisonDiagram({
  id,
  Diagram,
  required,
  approach,
  difference,
  differencePlacement = 'above',
  differenceTitle = 'What changes with Vercel',
  diagramProps = {},
  className = '',
}) {
  const [active, setActive] = useState(0);
  const buttons = useRef([]);
  const labels = ['What you need', 'Vercel approach'];
  const selected = active === 0 ? required : approach;
  function onKeyDown(event, index) {
    let next;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') next = 1 - index;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = 1;
    else return;
    event.preventDefault();
    setActive(next);
    buttons.current[next].focus();
  }
  const points = Array.isArray(difference) ? difference : [difference];
  const below = differencePlacement === 'below';
  return (
    <div className={`comparison${className ? ` ${className}` : ''}`}>
      <div
        className="diagram-tabs"
        role="tablist"
        aria-label="Compare requirement and Vercel approach"
      >
        {labels.map((label, index) => (
          <button
            key={label}
            ref={(el) => {
              buttons.current[index] = el;
            }}
            role="tab"
            id={`${id}-tab-${index}`}
            aria-selected={active === index}
            aria-controls={`${id}-panel`}
            tabIndex={active === index ? 0 : -1}
            onClick={() => setActive(index)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {label}
          </button>
        ))}
      </div>
      {!below && (
        <p className="pattern-difference">
          <strong>The difference:</strong> {difference}
        </p>
      )}
      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${active}`}>
        <Diagram
          key={`${id}-${active}`}
          id={active === 0 ? `${id}-need` : id}
          title={labels[active]}
          {...diagramProps}
          {...selected}
        />
      </div>
      {below && (
        <div className="pattern-difference pattern-difference-below">
          <h3>{differenceTitle}</h3>
          {points.length > 1 ? (
            <ul>
              {points.map((point, index) => (
                <li key={index}>{point}</li>
              ))}
            </ul>
          ) : (
            <p>{points[0]}</p>
          )}
        </div>
      )}
    </div>
  );
}

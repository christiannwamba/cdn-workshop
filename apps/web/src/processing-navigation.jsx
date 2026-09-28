import React from 'react';

export const processingOrder = ['r38', 'r39', 'r40'];
export const processingCategory = 'Processing';
const topics = ['Custom code', 'Bounded retry', 'Child identity'];
export function ProcessingNavigation({ id }) {
  if (!processingOrder.includes(id)) return null;
  return (
    <nav className="logging-nav" aria-label="Processing category">
      <p className="small">Processing: custom code, bounded retry and child identity.</p>
      <div>
        {processingOrder.map((r, i) => (
          <a key={r} aria-current={r === id ? 'page' : undefined} href={`#${r}`}>
            {r.toUpperCase()} · {topics[i]}
          </a>
        ))}
      </div>
    </nav>
  );
}

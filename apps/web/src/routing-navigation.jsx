import React from 'react';

export const routingOrder = ['r19', 'r35', 'r36', 'r37'];
export const routingCategory = 'Routing and admission';
const topics = ['Destinations', 'Holding page', 'Admission', 'Queue-it controls'];
export function RoutingNavigation({ id }) {
  if (!routingOrder.includes(id)) return null;
  return (
    <nav className="logging-nav" aria-label="Routing and admission category">
      <p className="small">
        Routing and holding: R19–R35. Visitor admission and its controls: R36–R37.
      </p>
      <div>
        {routingOrder.map((r, i) => (
          <a key={r} aria-current={r === id ? 'page' : undefined} href={`#${r}`}>
            {r.toUpperCase()} · {topics[i]}
          </a>
        ))}
      </div>
    </nav>
  );
}

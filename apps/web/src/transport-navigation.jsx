import React from 'react';

export const transportCategory = 'TLS and transport';
export const transportTopics = [
  [
    'Two TLS connections',
    [
      ['r10', 'Visitor TLS'],
      ['r03', 'Origin TLS'],
    ],
  ],
  [
    'Response and session behavior',
    [
      ['r28', 'Streaming'],
      ['r27', 'WebSockets'],
    ],
  ],
];
export const transportOrder = transportTopics.flatMap(([, rows]) =>
  rows.map(([id]) => id),
);
export function TransportNavigation({ id }) {
  if (!transportOrder.includes(id)) return null;
  return (
    <nav className="logging-nav cookies-nav" aria-label="TLS and transport category">
      {transportTopics.map(([topic, rows]) => (
        <div key={topic}>
          <p className="small">{topic}</p>
          <div>
            {rows.map(([r, label]) => (
              <a key={r} aria-current={r === id ? 'page' : undefined} href={`#${r}`}>
                {r.toUpperCase()} · {label}
              </a>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

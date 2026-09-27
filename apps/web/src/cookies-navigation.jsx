import React from 'react';

export const cookiesCategory = 'Cookies and consent';
export const cookieTopics = [
  [
    'Consent and cookie mutation',
    [
      ['r11', 'Legacy consent'],
      ['r12', 'Optanon consent'],
      ['r13', 'Cookie lifecycle'],
      ['r14', 'Link identifiers'],
    ],
  ],
  [
    'Device and audience inputs',
    [
      ['r15', 'Physical device'],
      ['r16', 'Mobile flag'],
      ['r17', 'Assignment'],
    ],
  ],
  [
    'Related delivery rules',
    [
      ['r25', 'Cache tags'],
      ['r30', 'Compression and hints'],
    ],
  ],
];
export const cookiesOrder = cookieTopics.flatMap(([, rows]) => rows.map(([id]) => id));
export function CookiesNavigation({ id }) {
  if (!cookiesOrder.includes(id)) return null;
  return (
    <nav className="logging-nav cookies-nav" aria-label="Cookies and consent category">
      {cookieTopics.map(([topic, rows]) => (
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

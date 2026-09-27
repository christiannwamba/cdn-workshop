import React from 'react';

export const loggingOrder = ['r31', 'r32', 'r33', 'r26', 'r34'];
export const loggingCategory = 'Logging, reporting and measurement';
const topics = [
  'Request identity',
  'Cookie logs',
  'Destinations',
  'Reporting and costs',
  'Browser measurement',
];
export function LoggingNavigation({ id, profile }) {
  if (!loggingOrder.includes(id)) return null;
  return (
    <nav className="logging-nav" aria-label="Logging category">
      <p className="small">
        Logging: R31 → R32 → R33. Related: reporting and browser measurement.
      </p>
      <div>
        {loggingOrder.map((r, i) => (
          <a
            key={r}
            aria-current={r === id ? 'page' : undefined}
            href={
              r === 'r32' && !profile.localPreview && profile.surface !== 'request'
                ? `${profile.requestUrl}/#r32`
                : `#${r}`
            }
          >
            {r.toUpperCase()} · {topics[i]}
          </a>
        ))}
      </div>
    </nav>
  );
}

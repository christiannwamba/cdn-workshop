import React from 'react';

export const requestRuleOrder = ['r01', 'r02', 'r04', 'r08', 'r07', 'r41', 'r18', 'r42'];
export const requestRuleCategory = 'Request and rule mappings';
const topics = [
  'Hosts',
  'Service paths',
  'Visitor IP',
  'Headers',
  'Legacy URLs',
  'Redirect ownership',
  'Request state',
  'Conditions',
];
export function RequestRuleNavigation({ id }) {
  if (!requestRuleOrder.includes(id)) return null;
  return (
    <nav className="logging-nav" aria-label="Request and rule category">
      <p className="small">
        Hosts and forwarding → redirects and ownership → state and rule order.
      </p>
      <div>
        {requestRuleOrder.map((r, i) => (
          <a key={r} aria-current={r === id ? 'page' : undefined} href={`#${r}`}>
            {r.toUpperCase()} · {topics[i]}
          </a>
        ))}
      </div>
    </nav>
  );
}

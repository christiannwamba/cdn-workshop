import React from 'react';
import './preparation-checklist.css';

export default function PreparationAgenda() {
  return (
    <main className="prep-checklist prep-agenda">
      <h1>Agenda</h1>
      <ol className="prep-agenda-order">
        <li>Introductions</li>
        <li>Short break · 5 minutes</li>
        <li>Gaps and open questions</li>
        <li>Break · 15 minutes</li>
        <li>Alternatives and partial coverage</li>
        <li>Short break · 5 minutes</li>
        <li>Supported mappings, if time allows</li>
        <li>Decisions and next steps</li>
      </ol>
    </main>
  );
}

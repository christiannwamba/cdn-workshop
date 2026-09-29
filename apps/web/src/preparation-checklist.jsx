import React, { useState } from 'react';
import './preparation-checklist.css';

const storageKey = 'workshop-preparation-v1';
const tasks = [
  [
    'pages',
    'Pages reviewed',
    'All 42 pages and implementation labels have passed local review.',
  ],
  [
    'release',
    'Choose the version to present and share',
    'If releasing, verify the hosted version. The redesigned site is currently local only.',
  ],
  [
    'agenda',
    'Align the agenda',
    'Confirm 13:00–16:00 BST, the architecture discussion format, and what attendees have received.',
  ],
  [
    'opening',
    'Practice the opening aloud',
    'Explain the purpose, format, order and intended outcome in about a minute.',
  ],
  [
    'revisit',
    'Revisit anything that was hard to explain',
    'Use the rehearsal list below. Know where the diagram, focused code and recorded evidence live.',
  ],
  [
    'questions',
    'Practice handling questions',
    'Rehearse a demo request, an unverified detail and a discussion that runs long.',
  ],
  [
    'setup',
    'Check the presentation setup',
    'Check screen sharing, diagram readability, navigation and a fallback for the version you will present.',
  ],
  [
    'diagram-camera',
    'Practice editing a diagram on camera',
    'While screen sharing, edit a Mermaid label or arrow, watch the live update, save a version, restore it, and recover from a typo.',
    '/#r29',
    'Practice on R29',
  ],
  [
    'request-header-logging-refresher',
    'Review Request Header Logging and Priority Projects',
    'Revisit the feature Sam highlighted: what it captures, when it runs, which headers are filtered, and current access requirements. Check whether it covers the cookie-logging requirement before treating it as an alternative.',
    'https://vercel.com/docs/vercel-firewall/priority-projects',
    'Read the documentation Sam shared',
  ],
  [
    'cdn-configuration-practice',
    'Make a small CDN change yourself in each place',
    'Use a separate practice project, locally and on Vercel. Edit a vercel.json rule, change a dashboard setting, change Routing Middleware/Proxy, and change a Function. Make each change yourself, send a request, observe the result and undo it. Notice which changes need deployment and where each runs relative to the cache.',
  ],
  [
    'closing',
    'Prepare the decision record and closing',
    'Capture decisions, affected services, owners and next actions. Leave time to recap them.',
  ],
];
const groups = [
  [
    'gap',
    'Gaps',
    'Which service depends on this exact behavior, and what happens if it changes?',
  ],
  [
    'confirmation',
    'Needs confirmation',
    'The mapping depends on this detail. What does your current system require?',
  ],
  ['partial', 'Partial', 'This covers X, but Y remains. Where is Y required?'],
  [
    'workaround',
    'Workarounds',
    'This approach achieves it with this difference. Does that fit your architecture and operating model?',
  ],
  [
    'supported',
    'Supported',
    'This maps to this configuration or code. Is there another condition we need to account for?',
  ],
];
function readProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) return saved;
  } catch {}
  return { pages: true };
}
export default function PreparationChecklist({ catalog }) {
  const [checked, setChecked] = useState(readProgress);
  const [saveError, setSaveError] = useState(false);
  const done = (key) => checked[key] === true;
  const rehearsed = catalog.filter((r) => done(r.id)).length;
  const ready =
    tasks.filter(([key]) => done(key)).length + (rehearsed === catalog.length ? 1 : 0);
  function toggle(key) {
    const next = { ...checked, [key]: !done(key) };
    setChecked(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }
  return (
    <main className="prep-checklist">
      <a className="prep-back" href="/#home">
        ← All requirements
      </a>
      {' · '}
      <a className="prep-back" href="/agenda">
        Speaker notes →
      </a>
      <p className="prep-eyebrow">Local preparation · 29 September · 13:00–16:00 BST</p>
      <h1>Preparation checklist</h1>
      <p className="prep-intro">
        Be ready to explain the mappings, guide the discussion and name what remains
        unknown. You don’t need every answer or a live demo for every requirement.
      </p>
      <div className="prep-progress" aria-live="polite">
        <strong>
          {ready} of {tasks.length + 1} preparation steps
        </strong>
        <span>
          {rehearsed} of {catalog.length} requirements rehearsed
        </span>
      </div>
      <progress aria-label="Preparation progress" value={ready} max={tasks.length + 1} />
      <p className="prep-storage">
        Progress stays in this browser on this local address. Nothing is sent to the
        workshop services.
      </p>
      {saveError && (
        <p role="alert">
          Your browser couldn’t save this change. Progress will last only until you leave
          this page.
        </p>
      )}
      <section aria-labelledby="prep-ready">
        <h2 id="prep-ready">Before the call</h2>
        <div className="prep-tasks">
          {tasks.map(([key, title, detail, href, linkLabel]) => (
            <label className="prep-task" key={key}>
              <input type="checkbox" checked={done(key)} onChange={() => toggle(key)} />
              <span>
                <strong>{title}</strong>
                <small>{detail}</small>
                {href && (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {linkLabel} ↗
                  </a>
                )}
              </span>
            </label>
          ))}
          <div className="prep-task prep-auto">
            <span aria-hidden="true">{rehearsed === catalog.length ? '✓' : '○'}</span>
            <span>
              <strong>Rehearse all {catalog.length} requirements</strong>
              <small>
                Complete the speaking pass below. This step updates automatically.
              </small>
            </span>
          </div>
        </div>
      </section>
      <section aria-labelledby="prep-rehearsal">
        <h2 id="prep-rehearsal">Requirement rehearsal</h2>
        <p>
          For each page: explain the ask, our mapping, the remaining difference and what
          you need from the room. Tick it when you can say that clearly. This tracks your
          rehearsal, not feature support or test coverage.
        </p>
        {groups.map(([status, title, question]) => {
          const rows = catalog
            .filter((r) => r.status === status)
            .sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));
          const count = rows.filter((r) => done(r.id)).length;
          return (
            <details className="prep-group" key={status}>
              <summary>
                {title}
                <span>
                  {count} / {rows.length}
                </span>
              </summary>
              <p className="prep-prompt">Ask: “{question}”</p>
              {rows.map((r) => (
                <div className="prep-requirement" key={r.id}>
                  <input
                    id={`prep-${r.id}`}
                    type="checkbox"
                    checked={done(r.id)}
                    onChange={() => toggle(r.id)}
                  />
                  <label htmlFor={`prep-${r.id}`}>
                    <span className="prep-id">{r.id}</span>
                    {r.title}
                  </label>
                  <a
                    href={`/#${r.id.toLowerCase()}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${r.id} in a new tab`}
                  >
                    Open ↗
                  </a>
                </div>
              ))}
            </details>
          );
        })}
      </section>
      <section aria-labelledby="prep-words">
        <h2 id="prep-words">Words to practice</h2>
        <details className="prep-group">
          <summary>The opening</summary>
          <p>
            Today we’re working through the requirements you shared for your current
            Akamai CDN setup and how they map to Vercel. We want to agree what fits, where
            the approach changes, and what still needs a decision.
          </p>
          <p>
            We’ll use architecture diagrams and short implementation examples, starting
            with gaps and open questions. Please correct our assumptions about your setup
            as we go.
          </p>
          <p>
            We’ve used targeted proofs of concept to inform these mappings. Today we’ll
            focus on the design decisions; detailed implementation walkthroughs can follow
            asynchronously or in a focused session.
          </p>
          <p>
            We should leave with agreed approaches and clear owners and next steps for
            anything unresolved.
          </p>
        </details>
        {[
          [
            'Why isn’t this hands-on?',
            'We need to agree the mappings first. That lets us focus a hands-on session on the approaches you actually want to take forward.',
          ],
          [
            'Can we see the demo?',
            'What would you like it to establish? If it changes this decision, let’s address it. If it’s an implementation walkthrough, I’ll capture it for a focused follow-up.',
          ],
          [
            'Has this been tested?',
            'State the specific recorded test and its limit. If unverified: “We haven’t verified that condition. Let’s record it as a follow-up rather than treat it as confirmed.”',
          ],
          [
            'Can someone from the CDN team join?',
            'I can coordinate a focused follow-up and check who from the CDN team is available.',
          ],
          [
            'When discussion runs long',
            'The open decision here is X. Let’s capture the next action and an owner, then move on.',
          ],
        ].map(([title, text]) => (
          <details className="prep-group" key={title}>
            <summary>{title}</summary>
            <p>{text}</p>
          </details>
        ))}
      </section>
      <p className="prep-storage">
        Preparing all 42 gives you confidence. It doesn’t commit the meeting to equal time
        on every requirement.
      </p>
    </main>
  );
}

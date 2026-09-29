import React, { useEffect, useState } from 'react';

function Preview({ kind }) {
  const dotted = kind === 'dotted' || kind === 'async';
  return (
    <svg className="snippet-preview" viewBox="0 0 64 24" aria-hidden="true">
      {kind === 'participant' ? (
        <>
          <rect x="10" y="3" width="44" height="17" rx="3" />
          <text x="32" y="15">
            Name
          </text>
        </>
      ) : kind === 'decision' ? (
        <path d="M32 2 58 12 32 22 6 12Z" />
      ) : kind === 'note' ? (
        <>
          <path d="M8 3h41l7 7v11H8Z M49 3v7h7" />
          <path d="M16 11h25m-25 5h31" />
        </>
      ) : kind === 'self' ? (
        <>
          <path d="M15 3v18M15 6h33v12H15m6-4-6 4 6 4" />
        </>
      ) : kind === 'block' ? (
        <>
          <rect x="5" y="2" width="54" height="20" rx="2" />
          <path d="M5 11h54" strokeDasharray="3 2" />
        </>
      ) : kind === 'layout' ? (
        <>
          <rect x="3" y="6" width="17" height="12" rx="2" />
          <rect x="44" y="6" width="17" height="12" rx="2" />
          <path d="M22 12h19m-5-4 5 4-5 4" />
        </>
      ) : (
        <>
          <path d="M5 12h49" strokeDasharray={dotted ? '4 3' : undefined} />
          <path d="m48 7 8 5-8 5" fill={kind === 'async' ? 'none' : 'currentColor'} />
        </>
      )}
    </svg>
  );
}
export function DiagramSnippets({ text }) {
  const detected = /^\s*(flowchart|graph)\b/.test(text) ? 'flowchart' : 'sequence';
  const [type, setType] = useState(detected);
  const [copied, setCopied] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    setType(detected);
  }, [detected]);
  const aliases = [
    ...new Set(
      [...text.matchAll(/^\s*(?:participant|actor)\s+([\w-]+)/gm)].map(
        (match) => match[1],
      ),
    ),
  ];
  const [a = 'A', b = 'B'] = aliases;
  let next = 'N';
  for (let i = 2; aliases.includes(next); i++) next = `N${i}`;
  const sequence = [
    [
      'Participant / alias',
      'participant',
      `participant ${next} as New service`,
      'The short alias is used in arrows. Put this near the other participants.',
    ],
    ['Solid arrow', 'solid', `${a}->>${b}: Request message`],
    ['Dotted arrow', 'dotted', `${b}-->>${a}: Response message`],
    [
      'Note over two participants',
      'note',
      `Note over ${a},${b}: Explain this connection`,
    ],
    ['Self-arrow', 'self', `${a}->>${a}: Process locally`],
    ['Asynchronous arrow', 'async', `${a}--)${b}: Deliver an event`],
    ['Note over one participant', 'note', `Note over ${a}: Explain this step`],
    ['Line break in a note', 'note', `Note over ${a},${b}: First line<br/>Second line`],
    [
      'Conditional branches',
      'block',
      `alt First condition\n  ${a}->>${b}: First action\nelse Another condition\n  ${a}->>${b}: Alternative action\nend`,
      'Add more else branches if needed. Keep the closing end.',
    ],
    [
      'Repeat a sequence',
      'block',
      `loop For each item\n  ${a}->>${b}: Send the next item\nend`,
    ],
    [
      'Sequence starter',
      'layout',
      `sequenceDiagram\n  participant A as Browser\n  participant B as Service\n  A->>B: Request\n  B-->>A: Response`,
      'A complete diagram. Replace the source to start fresh.',
    ],
  ];
  const flowchart = [
    ['Rectangle / identifier', 'participant', 'A[Display name]'],
    ['Decision diamond', 'decision', 'A{Condition met?}'],
    ['Solid connection', 'solid', 'A --> B'],
    ['Labelled connection', 'solid', 'A -->|Yes| B'],
    ['Dotted connection', 'dotted', 'A -.-> B'],
    ['Labelled dotted connection', 'dotted', 'A -.->|Background event| B'],
    ['Inline dotted label', 'dotted', 'A -. Explanation .-> B'],
    [
      'Branch and rejoin',
      'block',
      'A{Condition met?} -->|Yes| B[First path]\nA -->|No| C[Other path]\nB --> D[Continue]\nC --> D',
      'Reusing an identifier connects to the same box.',
    ],
    [
      'Left-to-right starter',
      'layout',
      'flowchart LR\n  A[First step] --> B[Next step]',
      'A complete diagram. Replace the source to start fresh.',
    ],
    [
      'Top-to-bottom starter',
      'layout',
      'flowchart TB\n  A[First step] --> B[Next step]',
      'TD is also used for top-to-bottom. Replace the source to start fresh.',
    ],
  ];
  return (
    <aside className="diagram-snippets" aria-label="Diagram snippets">
      <div className="snippets-heading">
        <h3>Diagram snippets</h3>
        <span>Copy & paste</span>
      </div>
      <div className="snippet-types" role="group" aria-label="Snippet diagram type">
        <button aria-pressed={type === 'sequence'} onClick={() => setType('sequence')}>
          Sequence
        </button>
        <button aria-pressed={type === 'flowchart'} onClick={() => setType('flowchart')}>
          Flowchart
        </button>
      </div>
      <p className="snippet-hint">
        {type === 'sequence' && aliases.length ? (
          <>
            Using your aliases: <code>{aliases.slice(0, 8).join(' · ')}</code>. Change the
            message after <code>:</code>.
          </>
        ) : (
          'Use these in a flowchart. Rename A, B and other identifiers to match your boxes.'
        )}
      </p>
      <div className="snippet-list">
        {(type === 'sequence' ? sequence : flowchart).map(([name, kind, code, hint]) => (
          <div className="snippet-item" key={`${type}-${name}`}>
            <div className="snippet-item-head">
              <Preview kind={kind} />
              <strong>{name}</strong>
              <button
                aria-label={`Copy ${name} snippet`}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(code);
                    setCopied(name);
                    setError('');
                  } catch {
                    setError('Clipboard unavailable. Select and copy the code below.');
                    setCopied('');
                  }
                }}
              >
                {copied === name ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre tabIndex={0}>
              <code>{code}</code>
            </pre>
            {hint && <p>{hint}</p>}
          </div>
        ))}
      </div>
      <p className="snippet-copy-status" role="status">
        {error ||
          (copied
            ? `${copied} copied. Paste at your cursor.`
            : 'Copy a pattern, then paste it where you want it in the editor.')}
      </p>
    </aside>
  );
}

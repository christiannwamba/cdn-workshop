import React from 'react';
import { CodeBlock } from './code-block.jsx';

export const polishedDiagramLayout = {
  fontFamily: 'Geist, sans-serif',
  // Mermaid's top-level fontSize would force one size onto actors, messages and notes;
  // a falsy value lets the per-element sequence sizes below apply.
  fontSize: 0,
  // Diagram-type-specific spacing; ignored by the sequence renderer.
  flowchart: {
    diagramPadding: 16,
    nodeSpacing: 40,
    rankSpacing: 48,
    padding: 18,
  },
  sequence: {
    mirrorActors: false,
    actorFontFamily: 'Geist, sans-serif',
    messageFontFamily: 'Geist, sans-serif',
    noteFontFamily: 'Geist, sans-serif',
    actorFontSize: 15,
    actorFontWeight: 500,
    messageFontSize: 15,
    noteFontSize: 14,
    wrap: true,
    wrapPadding: 12,
    width: 200,
    height: 52,
    actorMargin: 40,
    boxMargin: 14,
    boxTextMargin: 8,
    noteMargin: 12,
    messageMargin: 36,
    diagramMarginX: 16,
    diagramMarginY: 12,
    labelBoxWidth: 56,
    labelBoxHeight: 22,
    bottomMarginAdj: 12,
  },
};

// Optional presentation primitives; page authors retain the precise mapping and source.
export function CodeExample({ source, role, code = source.code }) {
  return (
    <figure className="code-figure">
      <p className="code-label">
        <code>{source.path.split('/').pop()}</code>
        <span>
          {role}
          {source.first ? ` · lines ${source.first}–${source.last}` : ''} · excerpt
        </span>
      </p>
      <CodeBlock source={{ ...source, code }} />
    </figure>
  );
}
export function FoldedEvidence({
  children,
  title = 'Demo walkthrough and recorded results',
}) {
  return (
    <details className="source">
      <summary>{title}</summary>
      {children}
    </details>
  );
}

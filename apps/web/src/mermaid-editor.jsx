import React, { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor/editor';
import 'monaco-editor/features/bracketMatching/register';
import 'monaco-editor/features/wordHighlighter/register';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';

import { registerGeistEditorTheme } from './geist-editor-theme.js';

self.MonacoEnvironment = { getWorker: () => new EditorWorker() };
monaco.languages.register({ id: 'mermaid' });
// Monarch handles both the workshop's sequence diagram and simple flowchart edits.
monaco.languages.setMonarchTokensProvider('mermaid', {
  keywords: [
    'sequenceDiagram',
    'flowchart',
    'graph',
    'participant',
    'actor',
    'as',
    'alt',
    'else',
    'end',
    'opt',
    'loop',
    'par',
    'and',
    'rect',
    'critical',
    'break',
    'autonumber',
    'activate',
    'deactivate',
    'Note',
    'note',
    'over',
    'left',
    'right',
    'of',
    'subgraph',
    'direction',
    'classDef',
    'class',
    'style',
    'linkStyle',
    'click',
    'title',
    'TD',
    'TB',
    'BT',
    'LR',
    'RL',
  ],
  tokenizer: {
    root: [
      [/%%.*$/, 'comment'],
      [/"([^"\\]|\\.)*"/, 'string'],
      [/[-=.]+(?:>>?|\)|x|o)|<<?[-=.]+/, 'operator'],
      [/:.*$/, 'string'],
      [/\b\d+\b/, 'number'],
      [
        /[a-zA-Z_][\w-]*/,
        { cases: { '@keywords': 'keyword', '@default': 'identifier' } },
      ],
      [/[{}()[\]]/, '@brackets'],
      [/[,+|]/, 'delimiter'],
    ],
  },
});
monaco.languages.setLanguageConfiguration('mermaid', {
  comments: { lineComment: '%%' },
  brackets: [
    ['[', ']'],
    ['(', ')'],
    ['{', '}'],
  ],
  autoClosingPairs: [
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
  ],
});

export default function MermaidEditor({ value, onChange }) {
  const host = useRef(null);
  const editor = useRef(null);
  const changed = useRef(onChange);
  changed.current = onChange;
  useEffect(() => {
    const theme = () => registerGeistEditorTheme(monaco);
    const model = monaco.editor.createModel(value, 'mermaid');
    const instance = monaco.editor.create(host.current, {
      model,
      theme: theme(),
      ariaLabel: 'Editable Mermaid source',
      automaticLayout: true,
      minimap: { enabled: false },
      fontFamily: 'Geist Mono, monospace',
      fontSize: 13,
      lineHeight: 22,
      lineNumbersMinChars: 3,
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      wrappingIndent: 'indent',
      tabSize: 2,
      folding: false,
      bracketPairColorization: { enabled: false },
      glyphMargin: false,
      padding: { top: 14, bottom: 14 },
      renderLineHighlight: 'none',
      overviewRulerLanes: 0,
      scrollbar: { alwaysConsumeMouseWheel: false },
    });
    // Tab leaves the editor by default; keyboard users can still opt into indentation.
    instance.updateOptions({ tabFocusMode: true });
    editor.current = instance;
    const subscription = instance.onDidChangeModelContent(() =>
      changed.current(instance.getValue()),
    );
    const observer = new MutationObserver(() => monaco.editor.setTheme(theme()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => {
      observer.disconnect();
      subscription.dispose();
      instance.dispose();
      model.dispose();
      editor.current = null;
    };
  }, []);
  useEffect(() => {
    if (editor.current && editor.current.getValue() !== value)
      editor.current.setValue(value);
  }, [value]);
  return <div className="mermaid-editor" ref={host} />;
}

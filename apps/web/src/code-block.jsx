import React, { useEffect, useState } from 'react';
import { snippetText } from './source-code.js';

export function CodeBlock({ source }) {
  const code = snippetText(source);
  const lang = source.path.endsWith('.json')
    ? 'json'
    : source.path.endsWith('.ts')
      ? 'typescript'
      : 'javascript';
  const [html, setHtml] = useState('');
  useEffect(() => {
    let active = true;
    setHtml('');
    import('./highlighter.js')
      .then(({ highlight }) => highlight(code, lang))
      .then((value) => {
        if (active) setHtml(value);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [code, lang]);
  return html ? (
    <div className="highlighted-code" dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <pre>
      <code>{code}</code>
    </pre>
  );
}

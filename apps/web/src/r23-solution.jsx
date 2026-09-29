import { CodeExample } from './page-presentation.jsx';
import React, { useState } from 'react';
import { CodeBlock } from './code-block.jsx';
import proof from './r23-solution-observations.json';

function Table({ headings, rows }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headings.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
// Focused slices of the preserved, dated source. No setup or authentication plumbing.
const focusedCode = {
  rewrite: proof.sources.rewrite.displayCode,
  matcher: proof.sources.matcher.displayCode,
  response: [
    proof.sources.response.displayCode
      .slice(
        proof.sources.response.displayCode.indexOf('const contentType'),
        proof.sources.response.displayCode.indexOf('// Explicitly'),
      )
      .trim(),
    '// After validating the variant contract and preparing cache headers:',
    proof.sources.response.displayCode
      .slice(proof.sources.response.displayCode.indexOf('if (!removeVary'))
      .trim(),
  ].join('\n'),
};
function Source({ names, children }) {
  const [open, setOpen] = useState(false);
  return (
    <details className="source" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>{children}</summary>
      <p className="small">
        Owned synthetic test source · 28 September 2026. These are excerpts from the
        deployed response-type experiment, not the workshop application or Vercel’s
        private implementation.
      </p>
      {names.map((name) => {
        const source = proof.sources[name];
        return (
          <div key={name}>
            <p>
              <code>
                {source.path}:{source.first}–{source.last}
              </code>
            </p>
            {open && <CodeBlock source={{ ...source, code: focusedCode[name] }} />}
            <p className="small">
              File SHA-256: <code>{source.fileSha256}</code>
            </p>
          </div>
        );
      })}
      <p className="small">
        Focused excerpts, with setup omitted and an explanatory comment added. Full source
        ranges and hashes refer to the preserved test files.
      </p>
    </details>
  );
}
export function VarySolution({ decision }) {
  const rewrite = proof.sources.rewrite;
  const response = proof.sources.response;
  return (
    <section className="implementation">
      <h2>Implementation example</h2>
      <h3>Middleware: select a separate cache entry for each language</h3>
      <p>
        Rewrite to an internal URL containing the selected language. The browser’s URL
        stays the same.
      </p>
      <CodeExample source={rewrite} role="Middleware" code={focusedCode.rewrite} />
      <h3>Function: choose whether to include Vary</h3>
      <p>
        On a cache miss, read the origin’s response type. <code>removeVary</code> matches
        the configured response types; matching responses omit the header. The cache
        entries are already separated by language.
      </p>
      <CodeExample source={response} role="Function" code={focusedCode.response} />
      <p className="small">
        Excerpts from the tested implementation. Origin fetch, validation and cache-header
        setup are omitted from these focused excerpts.
      </p>
      <p>{decision}</p>
      <details className="source">
        <summary>Demo</summary>
        <VaryDemo />
      </details>
    </section>
  );
}
function VaryDemo() {
  return (
    <section>
      <h3>Change the response type at the same URL</h3>
      <p>
        Recorded 28 September 2026. The temporary origin is stopped; this is a recorded
        demonstration. A live replay can be arranged separately.
      </p>
      <ol className="exercise">
        <li>Return HTML from the origin and request English, French, English, French.</li>
        <li>
          Let the cached response expire, change the origin to JSON, and repeat the same
          URLs and request headers.
        </li>
        <li>Compare Vary, the cache result and the number of origin calls.</li>
      </ol>
      <Table
        headings={[
          'Origin response',
          'Vary at client',
          'English → French → English → French',
          'Origin calls',
        ]}
        rows={proof.phases.map((p) => [
          p.name,
          p.requests[0].vary || 'Absent',
          p.requests.map((r) => r.cache).join(' → '),
          p.originCalls,
        ])}
      />
      <p>
        HTML lost Vary; JSON kept it. Each language retained its own content, and each
        phase made two origin calls. The decision used the origin’s response type, not an
        incoming request header.
      </p>
    </section>
  );
}

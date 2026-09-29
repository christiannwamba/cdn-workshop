import React, { useState } from 'react';
import { ComparisonDiagram } from './comparison-diagram.jsx';
import { CodeExample, polishedDiagramLayout } from './page-presentation.jsx';

export const cookieRequirement = `sequenceDiagram
 participant B as Browser
 participant C as CDN
 participant L as Operational logs
 B->>C: Request A with cookie A
 C-->>B: MISS: shared public content
 C--)L: A request record includes cookie A
 B->>C: Request B with cookie B, same URL
 C-->>B: HIT: same public content
 C--)L: B request record includes cookie B
 Note over B,L: Share public content, keep each request's cookie in its own log`;

export const cookieApproach = `sequenceDiagram
 participant B as Browser
 participant M as Routing Middleware
 participant C as Vercel CDN cache
 participant D as Vercel Log Drains
 participant L as Collector
 loop Each current request: A, then B
 B->>M: Same URL with current cookie
 M->>M: Read selected cookie and emit structured log
 M->>C: Continue to public content
 C-->>B: A: MISS and fill, B: HIT, same public content
 M--)D: Custom cookie log record
 C--)D: Native request record
 D--)L: Deliver signed batches asynchronously
 L->>L: Verify, store and match exact requestId
 end
 Note over D,L: Delivery can arrive later, refresh reads stored evidence`;

export function CookieArchitecture({ Diagram, previousSource }) {
  return (
    <>
      <ComparisonDiagram
        id="r32"
        Diagram={Diagram}
        required={{
          source: cookieRequirement,
          description:
            'Required outcome: each request’s own selected cookie is available in operational logs, even when the public content is reused. This describes the customer outcome, not Akamai internals.',
          actorRoles: {},
        }}
        approach={{
          source: cookieApproach,
          previousSource,
          description:
            'Middleware runs before cache lookup. Actual Vercel Log Drains delivers the custom and native records; the collector verifies, stores and joins them. The diagram separates request processing from asynchronous log delivery, whose arrival order can vary.',
          actorRoles: { M: 'vercel', C: 'vercel', D: 'vercel' },
        }}
        diagramProps={{
          variant: 'polished',
          renderConfig: polishedDiagramLayout,
          hideTitle: true,
        }}
        differencePlacement="below"
        difference={[
          'The cookie is logged by Middleware in a separate record and matched to the native request log. The tested native records did not contain the cookie; this is custom enrichment, not an automatic native cookie field. Priority Projects header logging also filters Cookie.',
          'A and B share public content, not cookie values: A’s log contains A’s cookie and B’s log contains B’s cookie. This demonstrates the named-cookie portion of R32; other operational fields and the downstream format still need mapping and verification.',
        ]}
      />
      <section className="implementation">
        <h2>Implementation example</h2>
        <p>
          After reading and validating the current request’s selected cookie, Middleware
          emits this structured log before continuing to cache lookup. The demo uses
          <code> workshop_choice</code> and two synthetic allowed values. This shortened
          excerpt omits cookie parsing, session fields and security checks; the full
          implementation keeps them.
        </p>
        <CodeExample
          source={{
            path: 'apps/request-demo/middleware.ts',
            code: `console.log(
  JSON.stringify({
    kind: 'workshop-cookie-v1',
    // Run, event, slot and cookie-state fields omitted.
    cookie: valid ? value : null,
  }),
);`,
          }}
          role="Actual Middleware log emission · shortened"
        />
      </section>
    </>
  );
}

// Mount only when first opened. Keep the exercise mounted on subsequent folds so
// hiding the walkthrough never resets an active session or changes its controls.
export function CookieWalkthrough({ children }) {
  const [visited, setVisited] = useState(false);
  return (
    <details
      className="source"
      onToggle={(event) => {
        if (event.currentTarget.open) setVisited(true);
      }}
    >
      <summary>Demo</summary>
      {visited && children}
    </details>
  );
}

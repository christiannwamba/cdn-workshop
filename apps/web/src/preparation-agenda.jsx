import React from 'react';
import './preparation-checklist.css';

export default function PreparationAgenda() {
  return (
    <main className="prep-checklist prep-agenda">
      <p className="prep-back">
        <a href="/checklist">← Preparation checklist</a> ·{' '}
        <a href="/#home">Workshop website ↗</a>
      </p>
      <p className="prep-eyebrow">Local speaker notes · 29 September · 13:00–16:00 BST</p>
      <h1>Workshop talking points</h1>
      <p className="prep-intro">
        Agree how the current Akamai CDN requirements map to Vercel, where the approach
        changes, and what needs a decision.
      </p>
      <section>
        <h2>Bring everyone together</h2>
        <p>
          “Thanks, everyone. Today we’re working through the requirements you shared and
          how they map to Vercel. We want to agree what fits, where the approach changes,
          and what we still need to resolve.”
        </p>
        <p>
          “We’ll use diagrams and short configuration or code examples. Please correct our
          assumptions about your setup as we go. We’ve used targeted proofs of concept to
          inform these mappings; detailed implementation walkthroughs can follow
          asynchronously or in a focused session.”
        </p>
      </section>
      <section>
        <h2>Discussion order</h2>
        <p className="prep-storage">
          Suggested pacing. Spend time on decisions, not equal time on every page.
        </p>
        <ol className="prep-agenda-order">
          <li>
            <strong>13:00 · Introductions and overview.</strong> Explain category, support
            level and implementation. The chart counts requirements; it is not a
            migration-readiness score.
          </li>
          <li>
            <strong>13:10 · Gaps and open questions.</strong> Establish the required
            behavior, affected services and impact.
          </li>
          <li>
            <strong>14:10 · Short break.</strong>
          </li>
          <li>
            <strong>14:20 · Alternatives and partial coverage.</strong> Compare the
            requested behavior with the Vercel approach and discuss the exact trade-off.
          </li>
          <li>
            <strong>15:20 · Supported mappings.</strong> Prioritize anything the team
            wants to validate.
          </li>
          <li>
            <strong>15:45 · Decisions and next steps.</strong> Confirm an owner and next
            action for unresolved items. Finish by 16:00.
          </li>
        </ol>
      </section>
      <section>
        <h2>Move from overview to discussion</h2>
        <p>
          “Let’s start where the answer could affect your design. For each requirement,
          we’ll check our understanding, look at the mapping and agree what remains to be
          decided.”
        </p>
        <p>
          Then, moving to alternatives: “Now let’s look at the requirements where the
          approach changes. We’ll compare the two designs and establish whether the
          difference works for your services.”
        </p>
      </section>
      <section>
        <h2>For each requirement</h2>
        <p>
          <strong>What you need → how it maps → what we need to decide.</strong>
        </p>
        <p>
          Gap: “Where do you rely on this exact behavior?” Alternative: “Does this
          approach fit your setup?” Partial: “Where is the remaining behavior required?”
          Unknown: “Who can confirm this detail?” Supported: “Any additional condition we
          need to account for?”
        </p>
      </section>
      <section>
        <h2>Keep the discussion useful</h2>
        <p>
          <strong>Why no hands-on exercise?</strong> “We need to agree the mappings first.
          Then we can focus a hands-on session on the approaches you want to take
          forward.”
        </p>
        <p>
          <strong>Can we see a demo?</strong> “What would you like it to establish? If it
          changes this decision, let’s address it. If it’s an implementation walkthrough,
          I’ll capture it for follow-up.”
        </p>
        <p>
          <strong>Something unverified?</strong> “We haven’t verified that condition.
          Let’s record it rather than treat it as confirmed.”
        </p>
        <p>
          <strong>Discussion running long?</strong> “The open decision is X. Let’s agree
          an owner and next action, then move on.”
        </p>
      </section>
      <section>
        <h2>Close with decisions</h2>
        <p>
          “Let’s recap the approaches we agreed, the questions still open, and who owns
          each next step.”
        </p>
        <p className="prep-storage">
          Capture: requirement · affected service · decision or open question · owner ·
          next action. Offer focused follow-ups; check CDN-team availability before
          promising attendance.
        </p>
      </section>
    </main>
  );
}

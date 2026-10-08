// AlgoNook — Concept Learning Screen
// Teaches a DSA concept before the learner attempts problems.
// Data-driven: reads from concepts.js

import { useState } from 'react';
import { getConceptForNode } from '../data/concepts.js';
import { ROADMAP_NODE_MAP } from '../data/roadmap.js';
import { sfx } from '../game/sfx.js';
import { useShuffledOptions } from '../game/answerOptions.js';

const EMPTY_OPTIONS = [];

function Section({ title, children, icon, collapsible = false }) {
  const heading = <div className="flex items-center justify-between gap-2 mb-3">
    <div className="flex items-center gap-2">
        {icon && <span className="text-[var(--bb-green)] text-sm">{icon}</span>}
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--bb-muted)]">
          {title}
        </h3>
    </div>
    {collapsible && <span aria-hidden="true" className="text-xs text-[var(--bb-cyan)]">＋</span>}
  </div>;

  if (collapsible) return (
    <details className="concept-card border border-[var(--bb-line)] bg-black/20 p-4 sm:p-5">
      <summary className="list-none cursor-pointer [&::-webkit-details-marker]:hidden">{heading}</summary>
      <div className="concept-card-body">{children}</div>
    </details>
  );

  return (
    <section className="border border-[var(--bb-line)] bg-black/20 p-4 sm:p-5">
      {heading}
      {children}
    </section>
  );
}

function CodeBlock({ code, language = 'python' }) {
  return (
    <pre className="border border-[var(--bb-line)] bg-black/40 p-3 overflow-x-auto text-xs font-mono text-[var(--bb-text)] leading-relaxed">
      <code>{code}</code>
    </pre>
  );
}

export default function ConceptScreen({ nodeId, onContinue, onBack }) {
  const node = ROADMAP_NODE_MAP[nodeId];
  const concept = getConceptForNode(nodeId);
  const [conceptSolved, setConceptSolved] = useState(false);
  const [conceptFeedback, setConceptFeedback] = useState('');
  const check = concept?.conceptCheck;
  const checkOptions = useShuffledOptions(check?.options || EMPTY_OPTIONS, nodeId);

  // Determine the next step text based on the node's learning stages
  const getNextStepLabel = () => {
    if (nodeId === 'foundations') return 'Complexity Analysis';
    return 'Visualization';
  };

  if (!node || !concept) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-8 pb-24">
        <button onClick={onBack} className="bb-btn bb-btn-ghost text-xs mb-4">
          ← Back
        </button>
        <div className="border border-[var(--bb-line)] bg-black/20 p-6 text-center">
          <p className="text-sm text-[var(--bb-muted)]">
            Concept content not available for this topic yet.
          </p>
          <p className="mt-3 text-xs text-[var(--bb-muted)]">Return to the topic hub when this content is available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-24">
      {/* Header */}
      <button
        onClick={() => { sfx.select(); onBack(); }}
        className="mb-5 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[var(--bb-muted)] hover:text-[var(--bb-text)] transition-colors"
      >
        ← Back to {node.label}
      </button>

      <div className="border border-[var(--bb-green-dim)] bg-[var(--bb-panel)] p-5 sm:p-6 mb-6">
        <div className="flex items-start gap-4 mb-3">
          <span className="font-mono text-3xl text-[var(--bb-green)] leading-none mt-1">
            {node.icon}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--bb-muted)] mb-1">
              Concept Learning
            </p>
            <h1 className="text-2xl font-bold text-[var(--bb-text)] leading-tight">
              {concept.title}
            </h1>
          </div>
          <span className="text-[9px] uppercase tracking-widest border border-[var(--bb-green-dim)] px-2 py-1 text-[var(--bb-green)] font-mono shrink-0">
            Step 1
          </span>
        </div>
        <p className="text-xs text-[var(--bb-muted)]">
          Explore the short briefing cards, prove the key idea, then use the next screen to manipulate the visual model yourself.
        </p>
      </div>

      {/* What is it? */}
      <Section title="What is it?" icon="▸">
        <p className="text-sm leading-relaxed text-[var(--bb-text)]">
          {concept.whatIsIt}
        </p>
      </Section>

      {/* Why it matters */}
      <Section title="Why it matters" icon="◆" collapsible>
        <p className="text-sm leading-relaxed text-[var(--bb-text)]">
          {concept.whyMatters}
        </p>
      </Section>

      {/* When to use */}
      <Section title="When should I use it?" icon="?" collapsible>
        <ul className="space-y-2">
          {concept.whenToUse.map((signal, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-[var(--bb-text)]">
              <span className="text-[var(--bb-green)] mt-0.5 shrink-0">→</span>
              <span>{signal}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Key idea */}
      <Section title="Key Idea" icon="◎">
        <div className="border-l-2 border-[var(--bb-green-dim)] pl-4 py-2">
          <p className="text-sm font-medium leading-relaxed text-[var(--bb-green)]">
            {concept.keyIdea}
          </p>
        </div>
      </Section>

      {/* Example */}
      {concept.example && (
        <Section title="Simple Example" icon="▭" collapsible>
          <div className="space-y-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--bb-muted)] mb-1">
                Problem
              </p>
              <p className="text-sm text-[var(--bb-text)]">
                {concept.example.problem}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--bb-muted)] mb-1">
                Approach
              </p>
              <p className="text-sm text-[var(--bb-text)]">
                {concept.example.approach}
              </p>
            </div>
            {concept.example.code && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[var(--bb-muted)] mb-2">
                  Code
                </p>
                <CodeBlock code={concept.example.code} />
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Complexity */}
      {concept.complexity && (
        <Section title="Complexity" icon="⧗" collapsible>
          <div className="space-y-2 text-sm">
            {Object.entries(concept.complexity).map(([key, value]) => (
              <div key={key} className="flex items-start gap-3">
                <span className="font-mono text-[var(--bb-muted)] uppercase text-xs w-20 shrink-0">
                  {key}
                </span>
                <span className="text-[var(--bb-text)]">{value}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Next steps */}
      {concept.nextSteps && (
        <details className="concept-card mt-6 border border-[var(--bb-green-dim)] bg-[rgba(0,244,142,0.04)] p-4">
          <summary className="list-none cursor-pointer text-[10px] uppercase tracking-wider text-[var(--bb-green)] [&::-webkit-details-marker]:hidden">Next Steps <span className="float-right">＋</span></summary>
          <ul className="mt-3 space-y-1">
            {concept.nextSteps.map((step, i) => <li key={i} className="flex items-start gap-2 text-xs text-[var(--bb-text)]"><span className="text-[var(--bb-green)]">→</span><span>{step}</span></li>)}
          </ul>
        </details>
      )}

      {check && (
        <Section title="Check Your Understanding" icon="✓">
          <p className="mb-3 text-sm text-[var(--bb-text)]">{check.prompt}</p>
          <div className="space-y-2">
            {checkOptions.map((option) => (
              <button
                key={option.text}
                disabled={conceptSolved}
                onClick={() => {
                  setConceptFeedback(option.feedback);
                  if (option.correct) { setConceptSolved(true); sfx.correct(); }
                  else sfx.wrong();
                }}
                className="bb-btn bb-btn-ghost w-full !justify-start text-left text-xs disabled:opacity-60"
              >
                {option.text}
              </button>
            ))}
          </div>
          {conceptFeedback && <p role="status" className={`mt-3 text-xs ${conceptSolved ? 'text-[var(--bb-green)]' : 'text-[var(--bb-amber)]'}`}>{conceptFeedback}</p>}
        </Section>
      )}

      {/* Continue button */}
      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => { sfx.select(); onBack(); }}
          className="bb-btn bb-btn-ghost text-xs"
        >
          ← Back
        </button>
        <button
          onClick={() => { sfx.select(); onContinue(); }}
          disabled={!conceptSolved}
          className="bb-btn bb-btn-green text-xs flex-1 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {conceptSolved ? `Continue to ${getNextStepLabel()} →` : 'Answer the concept check to continue'}
        </button>
      </div>
    </div>
  );
}

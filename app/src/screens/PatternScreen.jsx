// AlgoNook — Pattern Recognition Screen
// Teaches learners when to recognize and apply a DSA pattern.
// Critical for interview success: "What clues tell me to use this approach?"

import { getPatternForNode } from '../data/patterns.js';
import { ROADMAP_NODE_MAP } from '../data/roadmap.js';
import { sfx } from '../game/sfx.js';

function Section({ title, children, icon }) {
  return (
    <section className="border border-[var(--bb-line)] bg-black/20 p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        {icon && <span className="text-[var(--bb-green)] text-sm">{icon}</span>}
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--bb-muted)]">
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

export default function PatternScreen({ nodeId, onContinue, onBack }) {
  const node = ROADMAP_NODE_MAP[nodeId];
  const pattern = getPatternForNode(nodeId);

  if (!node || !pattern) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-8 pb-24">
        <button onClick={onBack} className="bb-btn bb-btn-ghost text-xs mb-4">
          ← Back
        </button>
        <div className="border border-[var(--bb-line)] bg-black/20 p-6 text-center">
          <p className="text-sm text-[var(--bb-muted)]">
            Pattern content not available for this topic yet.
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
        ← Back to Visualization
      </button>

      <div className="border border-[var(--bb-amber)] bg-[var(--bb-panel)] p-5 sm:p-6 mb-6">
        <div className="flex items-start gap-4 mb-3">
          <span className="font-mono text-3xl text-[var(--bb-amber)] leading-none mt-1">
            {node.icon}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--bb-muted)] mb-1">
              Pattern Recognition
            </p>
            <h1 className="text-2xl font-bold text-[var(--bb-text)] leading-tight">
              {pattern.title}
            </h1>
          </div>
          <span className="text-[9px] uppercase tracking-widest border border-[var(--bb-amber)] px-2 py-1 text-[var(--bb-amber)] font-mono shrink-0">
            Step 3
          </span>
        </div>
        <p className="text-xs text-[var(--bb-muted)]">
          Learn to recognize when to apply this pattern. In interviews, identifying the right approach is half the battle.
        </p>
      </div>

      {/* What this pattern solves */}
      <Section title="What This Pattern Solves" icon="◎">
        <p className="text-sm leading-relaxed text-[var(--bb-text)]">
          {pattern.description}
        </p>
      </Section>

      {/* Recognition signals */}
      <Section title="When Should I Think of This Pattern?" icon="◆">
        <p className="text-xs text-[var(--bb-muted)] mb-3">
          Watch for these signals in the problem statement:
        </p>
        <ul className="space-y-2">
          {pattern.signals.map((signal, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-[var(--bb-text)]">
              <span className="text-[var(--bb-amber)] mt-0.5 shrink-0 font-bold">●</span>
              <span>{signal}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Key questions */}
      {pattern.keyQuestions && (
        <Section title="Ask Yourself" icon="?">
          <p className="text-xs text-[var(--bb-muted)] mb-3">
            Before coding, ask these questions:
          </p>
          <ul className="space-y-2">
            {pattern.keyQuestions.map((question, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[var(--bb-amber)]">
                <span className="shrink-0">→</span>
                <span>{question}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Example problems */}
      {pattern.examples && (
        <Section title="Classic Problems Using This Pattern" icon="▭">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {pattern.examples.map((example, i) => (
              <div
                key={i}
                className="border border-[var(--bb-line)] bg-black/20 px-3 py-2 text-xs text-[var(--bb-text)]"
              >
                {example}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Anti-patterns */}
      {pattern.antipatterns && (
        <Section title="When NOT to Use This Pattern" icon="⚠">
          <ul className="space-y-2">
            {pattern.antipatterns.map((anti, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[var(--bb-muted)]">
                <span className="text-[var(--bb-red)] mt-0.5 shrink-0">✗</span>
                <span>{anti}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Call to action */}
      <div className="mt-6 border border-[var(--bb-amber)] bg-[rgba(255,176,0,0.06)] p-4">
        <p className="text-xs text-[var(--bb-amber)] font-medium">
          Ready to test your pattern recognition?
        </p>
        <p className="text-xs text-[var(--bb-muted)] mt-1">
          Next: quick practice challenges to verify you understand when to apply {node.label}.
        </p>
      </div>

      {/* Navigation */}
      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => { sfx.select(); onBack(); }}
          className="bb-btn bb-btn-ghost text-xs"
        >
          ← Back to Visualization
        </button>
        <button
          onClick={() => { sfx.select(); onContinue(); }}
          className="bb-btn bb-btn-green text-xs flex-1"
        >
          Continue to Practice →
        </button>
      </div>
    </div>
  );
}

// AlgoNook — Complexity Analysis Learning Screen
// Teaches Big-O notation and complexity analysis for Foundations topic.
// This is a special educational stage that explains algorithmic complexity.

import { sfx } from '../game/sfx.js';

const COMPLEXITY_CLASSES = [
  { notation: 'O(1)', name: 'Constant', color: 'text-[var(--bb-green)]', example: 'Array index access, hash table lookup' },
  { notation: 'O(log n)', name: 'Logarithmic', color: 'text-cyan-400', example: 'Binary search, balanced tree operations' },
  { notation: 'O(n)', name: 'Linear', color: 'text-[var(--bb-amber)]', example: 'Array traversal, linear search' },
  { notation: 'O(n log n)', name: 'Linearithmic', color: 'text-orange-400', example: 'Efficient sorting (merge sort, quicksort)' },
  { notation: 'O(n²)', name: 'Quadratic', color: 'text-[var(--bb-red)]', example: 'Nested loops, bubble sort' },
  { notation: 'O(2ⁿ)', name: 'Exponential', color: 'text-purple-400', example: 'Recursive fibonacci (naive), subset generation' },
];

const BIG_O_RULES = [
  {
    rule: 'Drop Constants',
    before: 'O(2n + 3)',
    after: 'O(n)',
    why: 'Constants don\'t matter for growth rate as n → ∞',
  },
  {
    rule: 'Drop Lower Terms',
    before: 'O(n² + n + 1)',
    after: 'O(n²)',
    why: 'Highest-order term dominates for large n',
  },
  {
    rule: 'Different Inputs = Different Variables',
    before: 'Two nested loops over different arrays',
    after: 'O(a × b), not O(n²)',
    why: 'If inputs have different sizes, use different variables',
  },
  {
    rule: 'Successive Steps Add',
    before: 'O(a) then O(b)',
    after: 'O(a + b)',
    why: 'Sequential operations add their complexities',
  },
  {
    rule: 'Nested Steps Multiply',
    before: 'O(a) inside O(b)',
    after: 'O(a × b)',
    why: 'Each outer iteration runs the full inner operation',
  },
];

export default function ComplexityScreen({ onContinue, onBack }) {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-24">
      {/* Header */}
      <button
        onClick={() => { sfx.select(); onBack(); }}
        className="mb-5 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[var(--bb-muted)] hover:text-[var(--bb-text)] transition-colors"
      >
        ← Back to Concept
      </button>

      <div className="border border-[var(--bb-amber)] bg-[var(--bb-panel)] p-5 sm:p-6 mb-6">
        <div className="flex items-start gap-4 mb-3">
          <span className="font-mono text-3xl text-[var(--bb-amber)] leading-none mt-1">
            ⧗
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--bb-muted)] mb-1">
              Complexity Analysis
            </p>
            <h1 className="text-2xl font-bold text-[var(--bb-text)] leading-tight">
              Understanding Big-O Notation
            </h1>
          </div>
          <span className="text-[9px] uppercase tracking-widest border border-[var(--bb-amber)] px-2 py-1 text-[var(--bb-amber)] font-mono shrink-0">
          Step 3
          </span>
        </div>
        <p className="text-xs text-[var(--bb-muted)]">
          Learn to measure algorithm efficiency. Big-O describes how runtime or space grows as input size increases.
        </p>
      </div>

      {/* What is Big-O */}
      <section className="border border-[var(--bb-line)] bg-black/20 p-4 sm:p-5 mb-6">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--bb-muted)] mb-3">
          What is Big-O?
        </h2>
        <p className="text-sm leading-relaxed text-[var(--bb-text)] mb-3">
          Big-O notation describes the <strong>worst-case growth rate</strong> of an algorithm's time or space usage relative to input size.
        </p>
        <p className="text-sm leading-relaxed text-[var(--bb-text)]">
          It answers: <em>"As my input doubles, how much longer does my algorithm take?"</em>
        </p>
      </section>

      {/* Common Complexity Classes */}
      <section className="border border-[var(--bb-line)] bg-black/20 p-4 sm:p-5 mb-6">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--bb-muted)] mb-4">
          Common Complexity Classes
        </h2>
        <div className="space-y-3">
          {COMPLEXITY_CLASSES.map((c) => (
            <div key={c.notation} className="border border-[var(--bb-line)] bg-black/30 p-3">
              <div className="flex items-baseline gap-3 mb-1">
                <code className={`font-mono text-sm font-bold ${c.color}`}>{c.notation}</code>
                <span className="text-xs text-[var(--bb-muted)]">{c.name}</span>
              </div>
              <p className="text-xs text-[var(--bb-text)] pl-3">
                {c.example}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 text-xs text-[var(--bb-muted)] italic">
          Order from best (top) to worst (bottom). Aim for O(n) or better in most interview problems.
        </div>
      </section>

      {/* Big-O Rules */}
      <section className="border border-[var(--bb-line)] bg-black/20 p-4 sm:p-5 mb-6">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--bb-muted)] mb-4">
          Simplification Rules
        </h2>
        <div className="space-y-3">
          {BIG_O_RULES.map((r, i) => (
            <div key={i} className="border-l-2 border-[var(--bb-amber)] pl-3 py-2">
              <h3 className="text-xs font-semibold text-[var(--bb-text)] mb-1">
                {i + 1}. {r.rule}
              </h3>
              <div className="flex items-center gap-2 mb-1 font-mono text-xs">
                <code className="text-[var(--bb-muted)]">{r.before}</code>
                <span className="text-[var(--bb-amber)]">→</span>
                <code className="text-[var(--bb-green)]">{r.after}</code>
              </div>
              <p className="text-xs text-[var(--bb-muted)] italic">{r.why}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Space Complexity */}
      <section className="border border-[var(--bb-line)] bg-black/20 p-4 sm:p-5 mb-6">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--bb-muted)] mb-3">
          Time vs Space Complexity
        </h2>
        <div className="space-y-3 text-sm text-[var(--bb-text)]">
          <div>
            <strong className="text-[var(--bb-green)]">Time Complexity:</strong> How long the algorithm takes to run.
          </div>
          <div>
            <strong className="text-cyan-400">Space Complexity:</strong> How much extra memory the algorithm uses.
          </div>
          <div className="mt-3 border-l-2 border-[var(--bb-green-dim)] pl-3 text-xs text-[var(--bb-muted)]">
            Many problems involve a <strong>space-time tradeoff</strong>: use more memory to run faster (e.g., hash tables), or save memory at the cost of slower runtime.
          </div>
        </div>
      </section>

      {/* Example Analysis */}
      <section className="border border-[var(--bb-green-dim)] bg-[rgba(0,244,142,0.04)] p-4 sm:p-5 mb-6">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--bb-muted)] mb-3">
          Example: Analyze This Code
        </h2>
        <pre className="border border-[var(--bb-line)] bg-black/40 p-3 overflow-x-auto text-xs font-mono text-[var(--bb-text)] leading-relaxed mb-3">
          <code>{`def find_duplicates(arr):
    seen = set()          # O(1) space initially
    for num in arr:       # O(n) iterations
        if num in seen:   # O(1) hash lookup
            return True
        seen.add(num)     # O(1) hash insert
    return False`}</code>
        </pre>
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-[var(--bb-amber)] mt-0.5">▸</span>
            <div>
              <strong className="text-[var(--bb-green)]">Time:</strong> <code className="font-mono text-[var(--bb-text)]">O(n)</code> — single loop, O(1) operations inside
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[var(--bb-amber)] mt-0.5">▸</span>
            <div>
              <strong className="text-cyan-400">Space:</strong> <code className="font-mono text-[var(--bb-text)]">O(n)</code> — worst case, set stores all n elements
            </div>
          </div>
        </div>
      </section>

      {/* Key Takeaways */}
      <div className="border border-[var(--bb-amber)] bg-[rgba(255,176,0,0.06)] p-4 mb-6">
        <p className="text-xs text-[var(--bb-amber)] font-medium mb-2">
          Key Takeaways
        </p>
        <ul className="space-y-1 text-xs text-[var(--bb-text)]">
          <li className="flex items-start gap-2">
            <span className="text-[var(--bb-amber)]">→</span>
            <span>Big-O measures <strong>growth rate</strong>, not exact runtime</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--bb-amber)]">→</span>
            <span>Focus on <strong>worst case</strong> in interviews</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--bb-amber)]">→</span>
            <span>Nested loops = multiply complexities</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--bb-amber)]">→</span>
            <span>Consider <strong>both time and space</strong></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--bb-amber)]">→</span>
            <span>O(n) or better is the interview target for most problems</span>
          </li>
        </ul>
      </div>

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row gap-3">
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
          Continue to Complexity Game →
        </button>
      </div>
    </div>
  );
}

// Stage 7: Conceptual Explanation — post-solve reasoning
// "Why does Linear Search take O(n) in worst case?" or "Why can we stop when found?"
// Answers directly impact mastery state, not just XP.
import { useState } from 'react';
import { sfx } from '../game/sfx.js';

export default function ExplanationStage({ data, onComplete, onMistake }) {
  const { question, options } = data;
  const [picked, setPicked] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [wrong, setWrong] = useState([]);

  const choose = (idx) => {
    if (isAnswered || wrong.includes(idx)) return;
    setPicked(idx);
    const opt = options[idx];
    if (opt.correct) {
      setIsAnswered(true);
      sfx.correct();
    } else {
      setWrong((w) => [...w, idx]);
      sfx.wrong();
      if (onMistake) onMistake(opt.rationale);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border border-[var(--bb-line)] bg-black/40 p-4">
        <div className="text-[10px] uppercase tracking-widest text-[var(--bb-amber)]">
          Stage 7: Conceptual Explanation & Algorithmic Analysis
        </div>
        <h3 className="font-crt text-xl text-[var(--bb-green)] bb-glow mt-1">
          REASONING & COMPLEXITY PROOF
        </h3>
        <p className="mt-1 text-xs text-[var(--bb-muted)]">
          Proving why the algorithm works is essential for mastery advancement.
        </p>
      </div>

      <div className="bb-panel p-5">
        <p className="text-sm leading-relaxed text-[var(--bb-text)] font-semibold mb-4">
          {question}
        </p>

        <div className="space-y-2">
          {options.map((opt, i) => {
            const isOptWrong = wrong.includes(i);
            const isOptRight = isAnswered && opt.correct;

            return (
              <button
                key={i}
                onClick={() => choose(i)}
                disabled={isAnswered || isOptWrong}
                className={`block w-full border p-3 text-left text-xs leading-relaxed transition-all sm:text-sm ${
                  isOptRight
                    ? 'border-[var(--bb-green)] bg-[rgba(0,244,142,0.12)] text-[var(--bb-green)] font-bold'
                    : isOptWrong
                    ? 'border-red-900/60 text-red-500/60 line-through bg-red-950/20'
                    : 'border-[var(--bb-line)] text-[var(--bb-text)] hover:border-[var(--bb-green-dim)] hover:bg-[rgba(0,244,142,0.05)]'
                }`}
              >
                <span className="mr-2 text-[var(--bb-muted)] font-mono">{String.fromCharCode(65 + i)} ›</span>
                {opt.text}
              </button>
            );
          })}
        </div>

        {isAnswered && (
          <div className="anim-rise mt-4 border border-[var(--bb-green)]/40 bg-[rgba(0,244,142,0.06)] p-3 text-xs leading-relaxed text-[var(--bb-green)]">
            <span className="font-bold">✓ CORRECT REASONING: </span>
            {options[picked].rationale}
            <div className="mt-3">
              <button
                onClick={() => { sfx.select(); onComplete({ firstTry: wrong.length === 0 }); }}
                className="bb-btn bb-btn-green text-xs"
              >
                Advance to Transfer Challenge ▶
              </button>
            </div>
          </div>
        )}

        {picked !== null && !isAnswered && (
          <div className="anim-shake mt-3 border border-red-500/40 bg-red-950/20 p-2.5 text-xs text-red-400">
            <span className="font-bold">✗ RECONSIDER: </span>
            {options[picked].rationale}
          </div>
        )}
      </div>
    </div>
  );
}

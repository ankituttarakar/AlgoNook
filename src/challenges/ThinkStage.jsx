// Stage: Think Challenge — Mental algorithm construction before coding
// Asks sequential prediction questions: Where to begin? What if not target? When to stop?
import { useState } from 'react';
import { sfx } from '../game/sfx.js';

export default function ThinkStage({ questions = [], onComplete, onMistake }) {
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [wrong, setWrong] = useState([]);
  const [isAnswered, setIsAnswered] = useState(false);

  const curQ = questions[qIdx];

  const choose = (optIdx) => {
    if (isAnswered || wrong.includes(optIdx)) return;
    setSelected(optIdx);
    const opt = curQ.options[optIdx];

    if (opt.correct) {
      setIsAnswered(true);
      sfx.correct();
    } else {
      setWrong((w) => [...w, optIdx]);
      sfx.wrong();
      if (onMistake) onMistake(opt.rationale);
    }
  };

  const nextQuestion = () => {
    sfx.select();
    if (qIdx + 1 < questions.length) {
      setQIdx((i) => i + 1);
      setSelected(null);
      setWrong([]);
      setIsAnswered(false);
    } else {
      onComplete();
    }
  };

  return (
    <div className="space-y-4">
      <div className="border border-[var(--bb-line)] bg-black/40 p-4">
        <div className="text-[10px] uppercase tracking-widest text-[var(--bb-amber)]">
          Stage 3: Think Challenge (Predictive Construction)
        </div>
        <h3 className="font-crt text-xl text-[var(--bb-green)] bb-glow mt-1">
          MENTAL ALGORITHM MODEL · STEP {qIdx + 1}/{questions.length}
        </h3>
        <p className="mt-1 text-xs text-[var(--bb-muted)]">
          Construct the core logic mentally before writing or tracing code.
        </p>
      </div>

      <div className="bb-panel p-5">
        <p className="text-sm leading-relaxed text-[var(--bb-text)] font-semibold mb-4">
          {curQ.prompt}
        </p>

        <div className="space-y-2">
          {curQ.options.map((opt, i) => {
            const isSelected = selected === i;
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
            <span className="font-bold">✓ CORRECT LOGIC: </span>
            {curQ.options[selected].rationale}
            <div className="mt-3">
              <button
                onClick={nextQuestion}
                className="bb-btn bb-btn-green text-xs"
              >
                {qIdx + 1 < questions.length ? 'Next Prediction ▶' : 'Advance to Algorithmic Trace ▶'}
              </button>
            </div>
          </div>
        )}

        {selected !== null && !isAnswered && (
          <div className="anim-shake mt-3 border border-red-500/40 bg-red-950/20 p-2.5 text-xs text-red-400">
            <span className="font-bold">✗ RECONSIDER: </span>
            {curQ.options[selected].rationale}
          </div>
        )}
      </div>
    </div>
  );
}

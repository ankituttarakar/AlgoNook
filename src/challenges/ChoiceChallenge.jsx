// Engine 1 — multiple choice / code trace, with per-option explanations,
// retry after wrong answers, and optional hint (costs the first-try bonus)
import { useState } from 'react';
import { sfx } from '../game/sfx.js';

export default function ChoiceChallenge({ challenge, onSolved, onMistake }) {
  const [wrong, setWrong] = useState([]); // indices answered wrongly
  const [picked, setPicked] = useState(null); // last picked index
  const [solved, setSolved] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);

  const choose = (i) => {
    if (solved || wrong.includes(i)) return;
    setPicked(i);
    const opt = challenge.opts[i];
    if (opt.ok) {
      setSolved(true);
      sfx.correct();
      onSolved({ firstTry: wrong.length === 0, hintUsed: hintOpen });
    } else {
      setWrong((w) => [...w, i]);
      sfx.wrong();
      onMistake(opt.why);
    }
  };

  const feedback = picked != null ? challenge.opts[picked] : null;

  return (
    <div>
      {challenge.code && (
        <pre className="mb-4 overflow-x-auto border border-[var(--bb-line)] bg-black/70 p-3 text-xs leading-relaxed text-[var(--bb-green)]">
          {challenge.code}
        </pre>
      )}

      <p className="mb-4 text-sm leading-relaxed text-[var(--bb-text)]">{challenge.q}</p>

      <div className="space-y-2">
        {challenge.opts.map((opt, i) => {
          const isWrong = wrong.includes(i);
          const isRight = solved && opt.ok;
          return (
            <button
              key={i}
              onClick={() => choose(i)}
              disabled={solved || isWrong}
              className={[
                'block w-full border px-3 py-2.5 text-left text-xs leading-relaxed transition-all sm:text-sm',
                isRight
                  ? 'anim-pop border-[var(--bb-green)] bg-[rgba(0,244,142,0.12)] text-[var(--bb-green)]'
                  : isWrong
                    ? 'border-[var(--bb-red)]/50 text-[var(--bb-red)]/60 line-through'
                    : 'border-[var(--bb-line)] text-[var(--bb-text)] hover:border-[var(--bb-green-dim)] hover:bg-[rgba(0,244,142,0.05)]',
              ].join(' ')}
            >
              <span className="mr-2 text-[var(--bb-muted)]">{String.fromCharCode(65 + i)} ›</span>
              {opt.t}
            </button>
          );
        })}
      </div>

      {/* hint */}
      {!solved && challenge.hint && (
        <div className="mt-4">
          {hintOpen ? (
            <p className="anim-rise border border-[var(--bb-amber)]/40 bg-[rgba(255,176,0,0.06)] px-3 py-2 text-xs text-[var(--bb-amber)]">
              DECRYPTED HINT: {challenge.hint}
              <span className="ml-2 text-[10px] text-[var(--bb-muted)]">(first-try bonus forfeited)</span>
            </p>
          ) : (
            <button
              onClick={() => { setHintOpen(true); sfx.hint(); }}
              className="bb-btn bb-btn-amber !min-h-0 !px-3 !py-1.5 text-[10px]"
            >
              ▚ Decrypt hint
            </button>
          )}
        </div>
      )}

      {/* feedback */}
      {feedback && (
        <div
          className={`anim-rise mt-4 border px-3 py-2.5 text-xs leading-relaxed ${
            solved
              ? 'border-[var(--bb-green)]/50 bg-[rgba(0,244,142,0.06)] text-[var(--bb-green)]'
              : 'border-[var(--bb-red)]/50 bg-[rgba(255,82,82,0.06)] text-[var(--bb-red)]'
          }`}
        >
          <span className="font-bold">{solved ? '✓ SIGNAL LOCKED — ' : '✗ REJECTED — '}</span>
          {feedback.why}
          {!solved && <span className="mt-1 block text-[var(--bb-muted)]">Recalibrate and try again — remaining options are live.</span>}
        </div>
      )}
    </div>
  );
}

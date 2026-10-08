// Engine 2 — sequence ordering: tap steps in the correct order.
// Wrong taps are rejected with an explanation; the sequence rebuilds.
import { useMemo, useState } from 'react';
import { sfx } from '../game/sfx.js';

function shuffled(items) {
  const idx = items.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  // guarantee the shuffle is not already solved
  if (idx.every((v, i) => v === i) && idx.length > 1) [idx[0], idx[1]] = [idx[1], idx[0]];
  return idx;
}

export default function OrderChallenge({ challenge, onSolved, onMistake }) {
  const [pool, setPool] = useState(() => shuffled(challenge.items));
  const [placed, setPlaced] = useState([]); // original indices, in chosen order
  const [mistakes, setMistakes] = useState(0);
  const [error, setError] = useState(null);
  const [hintOpen, setHintOpen] = useState(false);
  const solved = placed.length === challenge.items.length;

  const pick = (origIdx) => {
    if (solved) return;
    if (origIdx === placed.length) {
      const next = [...placed, origIdx];
      setPlaced(next);
      setError(null);
      sfx.push();
      if (next.length === challenge.items.length) {
        sfx.correct();
        onSolved({ firstTry: mistakes === 0, hintUsed: hintOpen });
      }
    } else {
      setMistakes((m) => m + 1);
      const msg = `"${challenge.items[origIdx]}" does not belong at step ${placed.length + 1}. Think about what must be true BEFORE this step runs.`;
      setError(msg);
      sfx.wrong();
      onMistake(msg);
    }
  };

  const reset = () => {
    setPool(shuffled(challenge.items));
    setPlaced([]);
    setError(null);
    sfx.select();
  };

  return (
    <div>
      <p className="mb-4 text-sm leading-relaxed text-[var(--bb-text)]">{challenge.q}</p>

      {/* placed sequence */}
      <div className="mb-3 min-h-[44px] space-y-1.5 border border-dashed border-[var(--bb-line)] p-2">
        {placed.length === 0 && (
          <p className="py-1 text-center text-[10px] uppercase tracking-widest text-[var(--bb-green-faint)]">
            tap steps below in execution order
          </p>
        )}
        {placed.map((origIdx, i) => (
          <div
            key={origIdx}
            className="anim-pop flex items-center gap-2 border border-[var(--bb-green-dim)] bg-[rgba(0,244,142,0.07)] px-3 py-2 text-xs text-[var(--bb-green)]"
          >
            <span className="text-[var(--bb-muted)]">{i + 1}.</span>
            {challenge.items[origIdx]}
          </div>
        ))}
      </div>

      {/* remaining pool */}
      {!solved && (
        <div className="space-y-1.5">
          {pool
            .filter((origIdx) => !placed.includes(origIdx))
            .map((origIdx) => (
              <button
                key={origIdx}
                onClick={() => pick(origIdx)}
                className="block w-full border border-[var(--bb-line)] px-3 py-2.5 text-left text-xs text-[var(--bb-text)] transition-all hover:border-[var(--bb-green-dim)] hover:bg-[rgba(0,244,142,0.05)]"
              >
                {challenge.items[origIdx]}
              </button>
            ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!solved && placed.length > 0 && (
          <button onClick={reset} className="bb-btn bb-btn-ghost !min-h-0 !px-3 !py-1.5 text-[10px]">
            ↺ Reset sequence
          </button>
        )}
        {!solved && challenge.hint && !hintOpen && (
          <button
            onClick={() => { setHintOpen(true); sfx.hint(); }}
            className="bb-btn bb-btn-amber !min-h-0 !px-3 !py-1.5 text-[10px]"
          >
            ▚ Decrypt hint
          </button>
        )}
      </div>
      {hintOpen && !solved && (
        <p className="anim-rise mt-3 border border-[var(--bb-amber)]/40 bg-[rgba(255,176,0,0.06)] px-3 py-2 text-xs text-[var(--bb-amber)]">
          DECRYPTED HINT: {challenge.hint}
          <span className="ml-2 text-[10px] text-[var(--bb-muted)]">(first-try bonus forfeited)</span>
        </p>
      )}

      {error && !solved && (
        <div className="anim-shake mt-4 border border-[var(--bb-red)]/50 bg-[rgba(255,82,82,0.06)] px-3 py-2.5 text-xs text-[var(--bb-red)]">
          <span className="font-bold">✗ OUT OF ORDER — </span>{error}
        </div>
      )}
      {solved && (
        <div className="anim-rise mt-4 border border-[var(--bb-green)]/50 bg-[rgba(0,244,142,0.06)] px-3 py-2.5 text-xs leading-relaxed text-[var(--bb-green)]">
          <span className="font-bold">✓ SEQUENCE VALID — </span>{challenge.why}
        </div>
      )}
    </div>
  );
}

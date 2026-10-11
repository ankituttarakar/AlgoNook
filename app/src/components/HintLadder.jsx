// AlgoNook — 6-Level Progressive Hint Ladder
// Level 1: Goal reminder
// Level 2: Observation / question that directs attention
// Level 3: Pattern or data-structure suggestion
// Level 4: Algorithmic invariant / reasoning
// Level 5: Pseudocode
// Level 6: Code skeleton / solution model
import { useState } from 'react';
import { sfx } from '../game/sfx.js';

export const LADDER_NAMES = [
  'Goal Reminder',
  'Attentive Question',
  'Pattern & Structure',
  'Algorithmic Invariant',
  'Pseudocode Logic',
  'Code Skeleton',
];

export default function HintLadder({ ladder = [], onHintRevealed, disabled = false }) {
  // ladder is array of strings (indices 0..5 for level 1..6)
  const [maxRevealedLevel, setMaxRevealedLevel] = useState(0);

  if (!ladder || ladder.length === 0) return null;

  const revealNext = () => {
    if (disabled || maxRevealedLevel >= ladder.length) return;
    const nextLevel = maxRevealedLevel + 1;
    setMaxRevealedLevel(nextLevel);
    sfx.hint();
    if (onHintRevealed) {
      onHintRevealed(nextLevel);
    }
  };

  return (
    <div className="mt-4 border border-[var(--bb-line)] bg-black/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--bb-line)] pb-2 text-[10px] uppercase tracking-widest">
        <span className="flex items-center gap-1.5 text-[var(--bb-amber)]">
          <span>▚</span> SCAFFOLDED INTEL LADDER
        </span>
        <span className="text-[var(--bb-muted)]">
          LEVEL {maxRevealedLevel}/{ladder.length}
        </span>
      </div>

      {/* Ladder level indicator bars */}
      <div className="mt-2.5 grid grid-cols-6 gap-1">
        {ladder.map((_, i) => (
          <div
            key={i}
            className={`h-1 transition-colors ${
              i < maxRevealedLevel
                ? 'bg-[var(--bb-amber)] bb-glow-amber'
                : 'bg-zinc-800'
            }`}
            title={`Level ${i + 1}: ${LADDER_NAMES[i] || 'Hint'}`}
          />
        ))}
      </div>

      {/* Revealed hints */}
      {maxRevealedLevel > 0 && (
        <div className="mt-3 space-y-2">
          {ladder.slice(0, maxRevealedLevel).map((text, i) => (
            <div
              key={i}
              className="anim-rise border-l-2 border-[var(--bb-amber)] bg-[rgba(255,176,0,0.05)] p-2 text-xs leading-relaxed"
            >
              <div className="mb-0.5 text-[9px] uppercase tracking-widest text-[var(--bb-amber)]">
                L{i + 1} · {LADDER_NAMES[i] || `Level ${i + 1}`}
              </div>
              <div className="whitespace-pre-line text-[var(--bb-text)] font-mono text-[11px]">
                {text}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Button to unlock next level */}
      {!disabled && maxRevealedLevel < ladder.length && (
        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={revealNext}
            className="bb-btn bb-btn-amber !min-h-0 !px-3 !py-1 text-[10px]"
          >
            {maxRevealedLevel === 0 ? '▶ Request Hint (L1: Goal)' : `▶ Advance Hint Ladder (L${maxRevealedLevel + 1}: ${LADDER_NAMES[maxRevealedLevel]})`}
          </button>
          <span className="text-[9px] text-[var(--bb-muted)]">
            {maxRevealedLevel >= 2 ? '⚠️ High scaffold level limits independent mastery' : 'Light scaffold'}
          </span>
        </div>
      )}
    </div>
  );
}

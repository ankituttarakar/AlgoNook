// Stage: Concept Discovery & Interactive Sandbox for Linear Search
// Player scans warehouse cargo slots to build initial intuition before formal algorithms
import { useState } from 'react';
import { sfx } from '../game/sfx.js';
import DiscoveryFrame from '../components/DiscoveryFrame.jsx';

export default function ConceptDiscovery({ data, onComplete }) {
  const { target, slots, storyPrompt } = data;
  const [inspected, setInspected] = useState([]);
  const [foundIndex, setFoundIndex] = useState(null);

  const inspect = (index) => {
    if (foundIndex !== null) return;
    if (inspected.includes(index)) return;

    const val = slots[index];
    const newInspected = [...inspected, index];
    setInspected(newInspected);

    if (val === target) {
      setFoundIndex(index);
      sfx.correct();
    } else {
      sfx.tick();
    }
  };

  return (
    <DiscoveryFrame
      context="STAGE 2 · UNSORTED WAREHOUSE"
      title="Scan the cargo bay"
      objective={`Locate package #${target}. Select a sealed bay to inspect it.`}
      evidence={storyPrompt || `A crucial package with ID #${target} is misplaced somewhere among unsorted storage bays. Inspect the containers below to uncover its location.`}
      evidenceLabel="Inspect warehouse dispatch"
    >
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="text-[var(--bb-muted)]">
            TARGET CRATE: <span className="font-bold text-[var(--bb-amber)] bb-glow-amber">#{target}</span>
          </span>
          <span className="text-[var(--bb-muted)]">
            SCANS EXPENDED: <span className="text-[var(--bb-green)]">{inspected.length}</span>
          </span>
        </div>

        {/* Cargo containers array visualization */}
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {slots.map((val, idx) => {
            const isRevealed = inspected.includes(idx);
            const isTarget = isRevealed && val === target;
            return (
              <button
                key={idx}
                onClick={() => inspect(idx)}
                disabled={foundIndex !== null}
                className={`flex flex-col items-center justify-center p-3 border transition-all ${
                  isTarget
                    ? 'border-[var(--bb-green)] bg-[rgba(0,244,142,0.18)] text-[var(--bb-green)] anim-pop'
                    : isRevealed
                    ? 'border-[var(--bb-line)] bg-zinc-900/60 text-zinc-400'
                    : 'border-zinc-700 bg-black hover:border-[var(--bb-green-dim)] text-[var(--bb-muted)]'
                }`}
              >
                <span className="text-[9px] text-[var(--bb-muted)] font-mono">[{idx}]</span>
                <span className="font-crt text-lg mt-1">
                  {isRevealed ? `#${val}` : '???'}
                </span>
                <span className="text-[8px] uppercase tracking-wider mt-1 text-zinc-500">
                  {isTarget ? 'FOUND' : isRevealed ? 'EMPTY' : 'SCAN'}
                </span>
              </button>
            );
          })}
        </div>

        {foundIndex !== null && (
          <div className="anim-rise mt-5 border border-[var(--bb-green)]/40 bg-[rgba(0,244,142,0.06)] p-3 text-xs">
            <div className="font-bold text-[var(--bb-green)]">✓ TARGET IDENTIFIED AT SLOT [{foundIndex}]</div>
            <p className="mt-1 text-[var(--bb-text)] leading-relaxed">
              Notice what happened: because the crates are <strong>unsorted</strong>, you had no prior clue whether crate #{target} was at slot 0, in the middle, or at the very end. The only reliable approach without ordering is checking slot after slot.
            </p>
            <button
              onClick={() => { sfx.select(); onComplete(); }}
              className="bb-btn bb-btn-green mt-3 text-xs w-full sm:w-auto"
            >
              Proceed to Algorithmic Reasoning ▶
            </button>
          </div>
        )}
    </DiscoveryFrame>
  );
}

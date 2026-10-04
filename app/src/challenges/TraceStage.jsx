// Stage 5: Step-by-step Interactive Algorithm Trace
// Player steps an index pointer across memory cells, evaluating invariants at each index
import { useState } from 'react';
import { sfx } from '../game/sfx.js';
import HintLadder from '../components/HintLadder.jsx';

export default function TraceStage({ data, onComplete, onHintRevealed }) {
  const { array, target, ladder = [] } = data;
  const [pointer, setPointer] = useState(0);
  const [history, setHistory] = useState([]);
  const [terminated, setTerminated] = useState(false);
  const [foundIndex, setFoundIndex] = useState(null);

  const stepForward = () => {
    if (terminated) return;

    const currentVal = array[pointer];
    const isMatch = currentVal === target;
    const logEntry = {
      index: pointer,
      value: currentVal,
      isMatch,
    };

    setHistory((prev) => [...prev, logEntry]);

    if (isMatch) {
      setFoundIndex(pointer);
      setTerminated(true);
      sfx.correct();
    } else {
      if (pointer + 1 < array.length) {
        setPointer((p) => p + 1);
        sfx.tick();
      } else {
        setTerminated(true);
        sfx.wrong();
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="border border-[var(--bb-line)] bg-black/40 p-4">
        <div className="text-[10px] uppercase tracking-widest text-[var(--bb-amber)]">
          Stage 5: Algorithm Trace & Invariant Simulation
        </div>
        <h3 className="font-crt text-xl text-[var(--bb-green)] bb-glow mt-1">
          STEP-BY-STEP EXECUTION TRACE
        </h3>
        <p className="mt-1 text-xs text-[var(--bb-text)] leading-relaxed">
          Simulate the CPU executing linear search. Target value = <strong className="text-[var(--bb-amber)]">#{target}</strong>.
          Advance the pointer <span className="font-mono text-[var(--bb-green)]">i</span> step-by-step and observe how the loop evaluates the invariant.
        </p>
      </div>

      <div className="bb-panel p-5">
        {/* Memory Grid Visualization */}
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-widest text-[var(--bb-muted)] mb-2">
            MEMORY ARRAY SLOTS
          </div>
          <div className="flex flex-wrap gap-2">
            {array.map((val, idx) => {
              const isCurrent = idx === pointer && !terminated;
              const isPast = idx < pointer;
              const isFound = foundIndex === idx;

              return (
                <div
                  key={idx}
                  className={`flex flex-col items-center justify-center w-12 h-14 border transition-all ${
                    isFound
                      ? 'border-[var(--bb-green)] bg-[rgba(0,244,142,0.2)] text-[var(--bb-green)] font-bold anim-pop'
                      : isCurrent
                      ? 'border-[var(--bb-amber)] bg-[rgba(255,176,0,0.15)] text-[var(--bb-amber)] scale-105'
                      : isPast
                      ? 'border-zinc-800 bg-zinc-900/40 text-zinc-500'
                      : 'border-[var(--bb-line)] bg-black/60 text-[var(--bb-text)]'
                  }`}
                >
                  <span className="text-[9px] font-mono text-[var(--bb-muted)]">[{idx}]</span>
                  <span className="font-crt text-lg">{val}</span>
                  {isCurrent && (
                    <span className="text-[8px] uppercase tracking-wider text-[var(--bb-amber)] font-bold">
                      ▲ i
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action button */}
        {!terminated && (
          <button
            onClick={stepForward}
            className="bb-btn bb-btn-green w-full sm:w-auto text-xs"
          >
            ▶ Step Pointer (Compare array[{pointer}] === {target})
          </button>
        )}

        {/* Step log */}
        <div className="mt-4 border-t border-[var(--bb-line)] pt-3">
          <div className="text-[10px] uppercase tracking-widest text-[var(--bb-muted)] mb-2">
            EXECUTION REGISTER & TRACE LOG
          </div>
          <div className="max-h-36 overflow-y-auto space-y-1 font-mono text-xs">
            {history.map((h, i) => (
              <div
                key={i}
                className={`p-1.5 border-l-2 ${
                  h.isMatch
                    ? 'border-[var(--bb-green)] bg-[rgba(0,244,142,0.08)] text-[var(--bb-green)]'
                    : 'border-zinc-700 bg-black/40 text-zinc-400'
                }`}
              >
                PASS {i + 1}: check index [{h.index}] value {h.value} == {target} →{' '}
                {h.isMatch ? 'MATCH! RETURN INDEX ' + h.index : 'MISMATCH (increment pointer)'}
              </div>
            ))}
          </div>
        </div>

        {terminated && (
          <div className="anim-rise mt-4 border border-[var(--bb-green)]/40 bg-[rgba(0,244,142,0.06)] p-3 text-xs leading-relaxed">
            <div className="font-bold text-[var(--bb-green)]">✓ TRACE COMPLETE</div>
            <p className="mt-1 text-[var(--bb-text)]">
              {foundIndex !== null
                ? `Algorithm reached element ${target} at index [${foundIndex}] in ${history.length} operations. Because it found the match, it early-exited without inspecting the remaining elements.`
                : `Target ${target} was not in the array. All ${array.length} elements were evaluated before concluding with -1.`}
            </p>
            <button
              onClick={() => { sfx.select(); onComplete(); }}
              className="bb-btn bb-btn-green mt-3 text-xs"
            >
              Proceed to Implementation Challenge ▶
            </button>
          </div>
        )}

        <HintLadder ladder={ladder} onHintRevealed={onHintRevealed} />
      </div>
    </div>
  );
}

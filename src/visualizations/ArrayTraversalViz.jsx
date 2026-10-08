// AlgoNook — Array Traversal Visualization
// Shows a pointer moving left-to-right through an array, highlighting each element.
// Self-contained: no external state, just a play/pause/step UI.

import { useEffect, useRef, useState } from 'react';

const DEFAULT_ARRAY = [3, 1, 7, 2, 9, 4, 6];

export default function ArrayTraversalViz({ initialArray = DEFAULT_ARRAY }) {
  const [arr] = useState(initialArray);
  const [pointer, setPointer] = useState(-1);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const intervalRef = useRef(null);

  const stop = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
  };

  const reset = () => {
    stop();
    setPointer(-1);
    setDone(false);
  };

  const step = () => {
    setPointer((p) => {
      const next = p + 1;
      if (next >= arr.length) {
        stop();
        setDone(true);
        return p;
      }
      return next;
    });
  };

  const play = () => {
    if (done) { reset(); return; }
    setRunning(true);
  };

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setPointer((p) => {
          const next = p + 1;
          if (next >= arr.length) {
            stop();
            setDone(true);
            return p;
          }
          return next;
        });
      }, 700);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, arr.length]);

  return (
    <div className="space-y-6">
      {/* Complexity badge */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="border border-[var(--bb-green-dim)] px-2 py-1 text-[var(--bb-green)] font-mono">
          Time: O(n)
        </span>
        <span className="border border-[var(--bb-line)] px-2 py-1 text-[var(--bb-muted)] font-mono">
          Space: O(1)
        </span>
      </div>

      {/* Array visualization */}
      <div className="relative">
        {/* Pointer indicator */}
        <div className="mb-2 flex" style={{ gap: 0 }}>
          {arr.map((_, i) => (
            <div
              key={i}
              className="flex-1 text-center transition-all duration-300"
              style={{ minWidth: 0 }}
            >
              {i === pointer ? (
                <span className="text-[var(--bb-amber)] text-xs font-mono">▼</span>
              ) : (
                <span className="text-transparent text-xs">▼</span>
              )}
            </div>
          ))}
        </div>

        {/* Array cells */}
        <div className="flex">
          {arr.map((val, i) => (
            <div
              key={i}
              className={`flex-1 border border-[var(--bb-line)] py-3 text-center transition-all duration-300 font-mono text-sm ${
                i === pointer
                  ? 'border-[var(--bb-amber)] bg-[rgba(255,176,0,0.15)] text-[var(--bb-amber)] scale-110 z-10'
                  : i < pointer
                  ? 'border-[var(--bb-green-dim)] bg-[rgba(0,244,142,0.05)] text-[var(--bb-green-dim)]'
                  : 'text-[var(--bb-text)]'
              }`}
              style={{ position: 'relative', minWidth: 0 }}
            >
              {val}
            </div>
          ))}
        </div>

        {/* Index labels */}
        <div className="mt-1 flex">
          {arr.map((_, i) => (
            <div key={i} className="flex-1 text-center text-[9px] text-[var(--bb-muted)] font-mono" style={{ minWidth: 0 }}>
              [{i}]
            </div>
          ))}
        </div>
      </div>

      {/* State readout */}
      <div className="border border-[var(--bb-line)] bg-black/30 px-4 py-3 font-mono text-xs">
        {pointer < 0 ? (
          <span className="text-[var(--bb-muted)]">// Press Play to start traversal</span>
        ) : done ? (
          <span className="text-[var(--bb-green)]">// Traversal complete — visited all {arr.length} elements</span>
        ) : (
          <>
            <span className="text-[var(--bb-muted)]">i = </span>
            <span className="text-[var(--bb-amber)]">{pointer}</span>
            <span className="text-[var(--bb-muted)]">  arr[i] = </span>
            <span className="text-[var(--bb-green)]">{arr[pointer]}</span>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={running ? stop : play}
          className={`bb-btn text-xs ${running ? 'bb-btn-amber' : 'bb-btn-green'}`}
        >
          {running ? '⏸ Pause' : done ? '↺ Replay' : '▶ Play'}
        </button>
        <button
          onClick={step}
          disabled={running || done}
          className="bb-btn bb-btn-ghost text-xs disabled:opacity-40"
        >
          Step →
        </button>
        <button onClick={reset} className="bb-btn bb-btn-ghost text-xs">
          Reset
        </button>
        <span className="text-[10px] text-[var(--bb-muted)] ml-2">
          {pointer < 0 ? 'Not started' : done ? 'Done' : `Step ${pointer + 1} / ${arr.length}`}
        </span>
      </div>
    </div>
  );
}

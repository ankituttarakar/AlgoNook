// AlgoNook — Two Pointers Visualization
// Left pointer moves right, right pointer moves left.
// Goal: find a pair that sums to target in a sorted array.

import { useEffect, useRef, useState } from 'react';

const DEFAULT_ARRAY = [1, 3, 5, 7, 9, 11, 14, 16];
const DEFAULT_TARGET = 20;

export default function TwoPointersViz({
  initialArray = DEFAULT_ARRAY,
  target = DEFAULT_TARGET,
}) {
  const arr = initialArray; // must be sorted
  const [left, setLeft] = useState(0);
  const [right, setRight] = useState(arr.length - 1);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null); // null | 'found' | 'not-found'
  const intervalRef = useRef(null);

  const stop = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
  };

  const reset = () => {
    stop();
    setLeft(0);
    setRight(arr.length - 1);
    setResult(null);
  };

  const doStep = (l, r) => {
    if (l >= r) return { newL: l, newR: r, done: true, found: false };
    const sum = arr[l] + arr[r];
    if (sum === target) return { newL: l, newR: r, done: true, found: true };
    if (sum < target) return { newL: l + 1, newR: r, done: false };
    return { newL: l, newR: r - 1, done: false };
  };

  const step = () => {
    setLeft((l) => {
      setRight((r) => {
        const { newL, newR, done, found } = doStep(l, r);
        if (done) {
          stop();
          setResult(found ? 'found' : 'not-found');
        }
        setLeft(newL);
        setRight(newR);
        return newR;
      });
      return l; // will be overwritten above, this is just to get the closure
    });
  };

  // Simpler: just store as state and use an effect
  const [state, setState] = useState({ l: 0, r: arr.length - 1 });

  const performStep = (currentL = state.l, currentR = state.r) => {
    if (currentL >= currentR) {
      setResult('not-found');
      stop();
      return;
    }
    const sum = arr[currentL] + arr[currentR];
    if (sum === target) {
      setState({ l: currentL, r: currentR });
      setResult('found');
      stop();
      return;
    }
    const newState =
      sum < target
        ? { l: currentL + 1, r: currentR }
        : { l: currentL, r: currentR - 1 };
    setState(newState);
  };

  const handleReset = () => {
    stop();
    setState({ l: 0, r: arr.length - 1 });
    setResult(null);
  };

  const play = () => {
    if (result) { handleReset(); return; }
    setRunning(true);
  };

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setState((prev) => {
          const { l, r } = prev;
          if (l >= r) {
            setResult('not-found');
            stop();
            return prev;
          }
          const sum = arr[l] + arr[r];
          if (sum === target) {
            setResult('found');
            stop();
            return prev;
          }
          return sum < target ? { l: l + 1, r } : { l, r: r - 1 };
        });
      }, 800);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, arr, target]);

  const { l, r } = state;
  const currentSum = arr[l] + arr[r];

  return (
    <div className="space-y-6">
      {/* Target */}
      <div className="flex flex-wrap gap-3 text-xs items-center">
        <span className="text-[var(--bb-muted)]">Target sum:</span>
        <span className="border border-[var(--bb-amber)] px-2 py-1 text-[var(--bb-amber)] font-mono text-sm">
          {target}
        </span>
        <span className="border border-[var(--bb-green-dim)] px-2 py-1 text-[var(--bb-green)] font-mono">
          Time: O(n)
        </span>
        <span className="border border-[var(--bb-line)] px-2 py-1 text-[var(--bb-muted)] font-mono">
          Space: O(1)
        </span>
      </div>

      {/* Pointer labels */}
      <div className="flex" style={{ gap: 0 }}>
        {arr.map((_, i) => (
          <div key={i} className="flex-1 text-center" style={{ minWidth: 0 }}>
            {i === l && i === r ? (
              <span className="text-[9px] font-mono text-[var(--bb-amber)]">L=R</span>
            ) : i === l ? (
              <span className="text-[9px] font-mono text-[var(--bb-green)]">L</span>
            ) : i === r ? (
              <span className="text-[9px] font-mono text-[#a78bfa)]" style={{ color: '#a78bfa' }}>R</span>
            ) : (
              <span className="text-[9px] text-transparent">.</span>
            )}
          </div>
        ))}
      </div>

      {/* Array cells */}
      <div className="flex">
        {arr.map((val, i) => {
          const isL = i === l && i !== r;
          const isR = i === r && i !== l;
          const isBoth = i === l && i === r;
          const isInRange = i > l && i < r;
          const isOutside = i < l || i > r;

          return (
            <div
              key={i}
              className={`flex-1 border py-3 text-center font-mono text-sm transition-all duration-400 ${
                result === 'found' && (i === l || i === r)
                  ? 'border-[var(--bb-green)] bg-[rgba(0,244,142,0.18)] text-[var(--bb-green)]'
                  : isBoth
                  ? 'border-[var(--bb-amber)] bg-[rgba(255,176,0,0.12)] text-[var(--bb-amber)]'
                  : isL
                  ? 'border-[var(--bb-green)] bg-[rgba(0,244,142,0.12)] text-[var(--bb-green)]'
                  : isR
                  ? 'border-purple-500 bg-purple-900/20 text-purple-400'
                  : isInRange
                  ? 'border-[var(--bb-line)] text-[var(--bb-text)]'
                  : 'border-[var(--bb-line)] text-[var(--bb-muted)] opacity-40'
              }`}
              style={{ minWidth: 0 }}
            >
              {val}
            </div>
          );
        })}
      </div>

      {/* Index labels */}
      <div className="flex">
        {arr.map((_, i) => (
          <div key={i} className="flex-1 text-center text-[9px] text-[var(--bb-muted)] font-mono" style={{ minWidth: 0 }}>
            {i}
          </div>
        ))}
      </div>

      {/* State readout */}
      <div className="border border-[var(--bb-line)] bg-black/30 px-4 py-3 font-mono text-xs space-y-1">
        {result === 'found' ? (
          <p className="text-[var(--bb-green)]">
            ✓ Found! arr[{l}] + arr[{r}] = {arr[l]} + {arr[r]} = {target}
          </p>
        ) : result === 'not-found' ? (
          <p className="text-[var(--bb-amber)]">// No pair found that sums to {target}</p>
        ) : l === 0 && r === arr.length - 1 && !running ? (
          <p className="text-[var(--bb-muted)]">// Press Play — left=0, right={arr.length - 1}</p>
        ) : (
          <>
            <p>
              <span className="text-[var(--bb-muted)]">left=</span>
              <span className="text-[var(--bb-green)]">{l}</span>
              <span className="text-[var(--bb-muted)]">  right=</span>
              <span className="text-purple-400">{r}</span>
              <span className="text-[var(--bb-muted)]">  sum=</span>
              <span className={currentSum === target ? 'text-[var(--bb-green)]' : currentSum < target ? 'text-[var(--bb-amber)]' : 'text-[var(--bb-red)]'}>
                {currentSum}
              </span>
            </p>
            <p className="text-[var(--bb-muted)]">
              {currentSum < target
                ? `// sum < target → move left pointer right`
                : currentSum > target
                ? `// sum > target → move right pointer left`
                : `// sum === target → found!`}
            </p>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={running ? stop : play}
          className={`bb-btn text-xs ${running ? 'bb-btn-amber' : 'bb-btn-green'}`}
        >
          {running ? '⏸ Pause' : result ? '↺ Replay' : '▶ Play'}
        </button>
        <button
          onClick={() => !running && !result && performStep(l, r)}
          disabled={running || !!result}
          className="bb-btn bb-btn-ghost text-xs disabled:opacity-40"
        >
          Step →
        </button>
        <button onClick={handleReset} className="bb-btn bb-btn-ghost text-xs">
          Reset
        </button>
      </div>
    </div>
  );
}

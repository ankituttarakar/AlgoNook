// AlgoNook — Binary Search Visualization
// Shows lo/mid/hi pointers narrowing the search space step by step.

import { useEffect, useRef, useState } from 'react';

const DEFAULT_ARRAY = [2, 5, 8, 12, 16, 23, 38, 45, 56, 72, 91];
const DEFAULT_TARGET = 23;

export default function BinarySearchViz({
  initialArray = DEFAULT_ARRAY,
  target = DEFAULT_TARGET,
}) {
  const arr = initialArray; // must be sorted

  const initialState = { lo: 0, hi: arr.length - 1, mid: Math.floor((arr.length - 1) / 2) };
  const [bsState, setBsState] = useState(initialState);
  const [result, setResult] = useState(null); // null | number (found index) | 'not-found'
  const [running, setRunning] = useState(false);
  const [stepCount, setStepCount] = useState(0);
  const intervalRef = useRef(null);

  const stop = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
  };

  const reset = () => {
    stop();
    setBsState(initialState);
    setResult(null);
    setStepCount(0);
  };

  const performStep = (s = bsState) => {
    const { lo, hi } = s;
    if (lo > hi) {
      setResult('not-found');
      stop();
      return s;
    }
    const mid = Math.floor((lo + hi) / 2);
    if (arr[mid] === target) {
      setBsState({ lo, hi, mid });
      setResult(mid);
      stop();
      setStepCount((c) => c + 1);
      return { lo, hi, mid };
    }
    const newState =
      arr[mid] < target
        ? { lo: mid + 1, hi, mid: Math.floor((mid + 1 + hi) / 2) }
        : { lo, hi: mid - 1, mid: Math.floor((lo + mid - 1) / 2) };
    setBsState(newState);
    setStepCount((c) => c + 1);
    return newState;
  };

  const play = () => {
    if (result !== null) { reset(); return; }
    setRunning(true);
  };

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setBsState((prev) => {
          const { lo, hi } = prev;
          if (lo > hi) {
            setResult('not-found');
            stop();
            return prev;
          }
          const mid = Math.floor((lo + hi) / 2);
          setStepCount((c) => c + 1);
          if (arr[mid] === target) {
            setResult(mid);
            stop();
            return { lo, hi, mid };
          }
          return arr[mid] < target
            ? { lo: mid + 1, hi, mid: Math.floor((mid + 1 + hi) / 2) }
            : { lo, hi: mid - 1, mid: Math.floor((lo + mid - 1) / 2) };
        });
      }, 900);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, arr, target]);

  const { lo, hi, mid } = bsState;

  const getCellClass = (i) => {
    if (result === i) return 'border-[var(--bb-green)] bg-[rgba(0,244,142,0.2)] text-[var(--bb-green)]';
    if (i === mid && result === null) return 'border-[var(--bb-amber)] bg-[rgba(255,176,0,0.15)] text-[var(--bb-amber)]';
    if (i === lo && result === null) return 'border-[var(--bb-green-dim)] text-[var(--bb-green)]';
    if (i === hi && result === null) return 'border-purple-500 text-purple-400';
    if (i >= lo && i <= hi && result === null) return 'border-[var(--bb-line)] text-[var(--bb-text)]';
    return 'border-[var(--bb-line)] text-[var(--bb-muted)] opacity-30';
  };

  return (
    <div className="space-y-6">
      {/* Info */}
      <div className="flex flex-wrap gap-3 text-xs items-center">
        <span className="text-[var(--bb-muted)]">Target:</span>
        <span className="border border-[var(--bb-amber)] px-2 py-1 text-[var(--bb-amber)] font-mono">
          {target}
        </span>
        <span className="border border-[var(--bb-green-dim)] px-2 py-1 text-[var(--bb-green)] font-mono">
          Time: O(log n)
        </span>
        <span className="border border-[var(--bb-line)] px-2 py-1 text-[var(--bb-muted)] font-mono">
          Space: O(1)
        </span>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-[10px]">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-[var(--bb-green)] inline-block" />
          <span className="text-[var(--bb-muted)]">lo</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-[var(--bb-amber)] inline-block" />
          <span className="text-[var(--bb-muted)]">mid (compare)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-purple-500 inline-block" />
          <span className="text-[var(--bb-muted)]">hi</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-[var(--bb-muted)] opacity-30 inline-block" />
          <span className="text-[var(--bb-muted)]">eliminated</span>
        </div>
      </div>

      {/* Pointer row */}
      <div className="flex flex-wrap gap-1">
        {arr.map((val, i) => (
          <div key={i} className="text-center" style={{ flex: '1 0 0', minWidth: 0 }}>
            <div className="text-[8px] font-mono mb-0.5 leading-none text-[var(--bb-muted)]">
              {i === lo && i === hi ? 'l=h' : i === lo ? 'lo' : i === hi ? 'hi' : i === mid && result === null ? 'mid' : ''}
            </div>
          </div>
        ))}
      </div>

      {/* Array cells */}
      <div className="flex flex-wrap gap-1">
        {arr.map((val, i) => (
          <div
            key={i}
            className={`border py-2 text-center font-mono text-sm transition-all duration-500 ${getCellClass(i)}`}
            style={{ flex: '1 0 0', minWidth: 0 }}
          >
            {val}
          </div>
        ))}
      </div>

      {/* State readout */}
      <div className="border border-[var(--bb-line)] bg-black/30 px-4 py-3 font-mono text-xs space-y-1">
        {result === null && stepCount === 0 ? (
          <p className="text-[var(--bb-muted)]">// Press Play — search space: 0..{arr.length - 1}, target = {target}</p>
        ) : typeof result === 'number' ? (
          <p className="text-[var(--bb-green)]">✓ Found {target} at index {result} in {stepCount} step{stepCount !== 1 ? 's' : ''}</p>
        ) : result === 'not-found' ? (
          <p className="text-[var(--bb-amber)]">// {target} not in array (checked in {stepCount} steps)</p>
        ) : (
          <>
            <p>
              <span className="text-[var(--bb-green)]">lo</span>
              <span className="text-[var(--bb-muted)]">={lo}  </span>
              <span className="text-[var(--bb-amber)]">mid</span>
              <span className="text-[var(--bb-muted)]">={mid}  </span>
              <span className="text-purple-400">hi</span>
              <span className="text-[var(--bb-muted)]">={hi}</span>
            </p>
            <p className="text-[var(--bb-muted)]">
              arr[mid]={arr[mid]}  {arr[mid] < target ? `< ${target} → lo = mid+1` : arr[mid] > target ? `> ${target} → hi = mid-1` : `= ${target} → found!`}
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
          {running ? '⏸ Pause' : result !== null ? '↺ Replay' : '▶ Play'}
        </button>
        <button
          onClick={() => !running && result === null && performStep()}
          disabled={running || result !== null}
          className="bb-btn bb-btn-ghost text-xs disabled:opacity-40"
        >
          Step →
        </button>
        <button onClick={reset} className="bb-btn bb-btn-ghost text-xs">
          Reset
        </button>
        <span className="text-[10px] text-[var(--bb-muted)] ml-2">
          Steps: {stepCount} / max ⌈log₂ {arr.length}⌉ = {Math.ceil(Math.log2(arr.length))}
        </span>
      </div>
    </div>
  );
}

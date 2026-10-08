import { useEffect, useMemo, useState } from 'react';
import { normalizeExecutionTrace, traceActionLabel } from '../game/executionTrace.js';

const SPEEDS = [0.5, 1, 1.5, 2];

function ArrayFrame({ problemId, state, action }) {
  const values = state.array || [];
  const seen = new Set(state.seen || []);
  const isTwoPointers = problemId === 'two-sum-sorted';
  const currentIndex = state.index;

  if (!values.length) return <div className="trace-empty-array">This execution step did not emit an array snapshot.</div>;

  return (
    <div className="trace-array-wrap">
      <div className="trace-pointer-row" aria-hidden="true">
        {values.map((_, index) => <span key={index}>{isTwoPointers ? [state.left === index && state.right === index ? 'L·R' : state.left === index ? 'L' : state.right === index ? 'R' : ''] : currentIndex === index ? 'i' : ''}</span>)}
      </div>
      <div className="trace-array" role="img" aria-label={`${isTwoPointers ? `Two pointer state, left ${state.left ?? 'unset'}, right ${state.right ?? 'unset'}` : `Array traversal at index ${currentIndex ?? 'complete'}`}`}>
        {values.map((value, index) => {
          const isCurrent = isTwoPointers ? index === state.left || index === state.right : index === currentIndex;
          const wasSeen = !isTwoPointers && seen.has(value);
          return <div key={`${index}-${String(value)}`} className={`trace-cell ${isCurrent ? 'is-current' : ''} ${wasSeen ? 'is-seen' : ''} ${action === 'found' && isCurrent ? 'is-found' : ''}`}><strong>{String(value)}</strong><small>{index}</small></div>;
        })}
        {values.length === 64 && <span className="trace-array-more" aria-label="More values omitted">…</span>}
      </div>
      <div className="trace-state-line" aria-live="polite">
        {isTwoPointers && state.left !== undefined && state.right !== undefined ? <><span>left <b>{state.left}</b></span><span>right <b>{state.right}</b></span>{state.sum !== undefined && <span>sum <b>{state.sum}</b></span>}{state.target !== undefined && <span>target <b>{state.target}</b></span>}</> : <><span>{state.index !== undefined ? <>index <b>{state.index}</b></> : traceActionLabel(action)}</span>{state.value !== undefined && <span>value <b>{state.value}</b></span>}{state.seen && <span>seen <b>{state.seen.length}</b></span>}</>}
      </div>
    </div>
  );
}

export default function ExecutionPlayback({ problemId, trace }) {
  const frames = useMemo(() => normalizeExecutionTrace(trace), [trace]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const current = frames[index] || null;

  useEffect(() => {
    setIndex(0);
    setPlaying(false);
  }, [frames]);

  useEffect(() => {
    if (!playing || frames.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setIndex((currentIndex) => Math.min(frames.length - 1, currentIndex + 1));
    }, 900 / speed);
    return () => window.clearInterval(timer);
  }, [playing, speed, frames.length]);

  useEffect(() => {
    if (playing && index >= frames.length - 1) setPlaying(false);
  }, [playing, index, frames.length]);

  const restart = () => { setPlaying(false); setIndex(0); };
  const stepBackward = () => { setPlaying(false); setIndex((value) => Math.max(0, value - 1)); };
  const stepForward = () => { setPlaying(false); setIndex((value) => Math.min(frames.length - 1, value + 1)); };

  return (
    <section className="execution-playback" aria-label="Execution trace playback">
      <header className="trace-heading"><div><p className="workspace-kicker">LIVE EXECUTION</p><h3>Watch the algorithm</h3></div><span className="trace-source">PYTHON SANDBOX</span></header>
      {current ? <>
        <div className="trace-canvas">
          <ArrayFrame problemId={problemId} state={current.state} action={current.action} />
          <div className="trace-action" aria-live="polite"><i>{String(current.step).padStart(2, '0')}</i><span>{traceActionLabel(current.action)}</span></div>
        </div>
        <div className="trace-progress" role="progressbar" aria-label="Trace position" aria-valuemin={1} aria-valuemax={frames.length} aria-valuenow={index + 1}><i style={{ width: `${((index + 1) / frames.length) * 100}%` }} /></div>
        <div className="trace-controls">
          <button type="button" onClick={restart} disabled={frames.length < 2} aria-label="Restart playback">↺</button>
          <button type="button" onClick={stepBackward} disabled={index === 0} aria-label="Step backward">←</button>
          <button type="button" className="trace-play" onClick={() => { if (index === frames.length - 1) setIndex(0); setPlaying((value) => !value); }} disabled={frames.length < 2} aria-label={playing ? 'Pause playback' : 'Play playback'}>{playing ? 'Ⅱ' : '▶'}</button>
          <button type="button" onClick={stepForward} disabled={index >= frames.length - 1} aria-label="Step forward">→</button>
          <label>Speed <select aria-label="Playback speed" value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>{SPEEDS.map((value) => <option key={value} value={value}>{value}×</option>)}</select></label>
          <span className="trace-count">{index + 1} / {frames.length}</span>
        </div>
      </> : <div className="trace-unavailable"><span aria-hidden="true">⌁</span><strong>No trace steps returned</strong><p>Run your Python solution with <code>algonook.step(action, state)</code> calls to create playback from the code that actually ran.</p></div>}
    </section>
  );
}

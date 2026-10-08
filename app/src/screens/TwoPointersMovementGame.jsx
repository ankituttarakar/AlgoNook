import { useMemo, useState } from 'react';
import { useGame } from '../game/GameContext.jsx';
import { sfx } from '../game/sfx.js';

const VALUES = [1, 3, 4, 6, 8, 11];
const TARGET = 10;

function expectedMove(left, right) {
  const sum = VALUES[left] + VALUES[right];
  return sum < TARGET ? 'left' : sum > TARGET ? 'right' : 'match';
}

export default function TwoPointersMovementGame({ onBack }) {
  const { recordSkillSession } = useGame();
  const [left, setLeft] = useState(0);
  const [right, setRight] = useState(VALUES.length - 1);
  const [mistakes, setMistakes] = useState(0);
  const [feedback, setFeedback] = useState('Use the sorted order: choose the pointer move that can bring the sum toward 10.');
  const [complete, setComplete] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const currentSum = VALUES[left] + VALUES[right];
  const move = (choice) => {
    if (complete) return;
    const expected = expectedMove(left, right);
    if (choice !== expected) {
      setMistakes((count) => count + 1);
      setFeedback(expected === 'left'
        ? `${currentSum} is below 10. Move left right to increase the sum; moving right inward would lower it.`
        : expected === 'right'
          ? `${currentSum} is above 10. Move right left to lower the sum; increasing the left value moves the wrong way.`
          : `${currentSum} equals 10. Record this pair without moving either pointer.`);
      sfx.wrong();
      return;
    }
    sfx.correct();
    if (choice === 'match') {
      setComplete(true);
      setFeedback(`Correct: indices ${left} and ${right} contain ${VALUES[left]} + ${VALUES[right]} = ${TARGET}.`);
      if (!recorded) {
        recordSkillSession('two-pointers-pair-sum', { solvePassed: true, mistakes, explanationCorrect: false, transferPassed: false });
        setRecorded(true);
      }
    } else if (choice === 'left') {
      setFeedback(`${currentSum} < ${TARGET}: sorted order proves the current left value cannot pair with this or any smaller right-side value. Advance left.`);
      setLeft((value) => value + 1);
    } else {
      setFeedback(`${currentSum} > ${TARGET}: this right value is too large even with the current left. Decrement right.`);
      setRight((value) => value - 1);
    }
  };
  const reset = () => {
    setLeft(0); setRight(VALUES.length - 1); setMistakes(0); setComplete(false); setRecorded(false);
    setFeedback('Use the sorted order: choose the pointer move that can bring the sum toward 10.');
  };
  const moveExpected = expectedMove(left, right);
  const cells = useMemo(() => VALUES.map((value, index) => ({ value, index })), []);

  return <main className="mx-auto max-w-3xl px-4 pt-6 pb-24">
    <button onClick={onBack} className="mb-5 text-[10px] uppercase tracking-widest text-[var(--bb-muted)]">← Back to Two Pointers</button>
    <header className="mb-5 border border-[var(--bb-green-dim)] bg-[var(--bb-panel)] p-5">
      <p className="text-[10px] uppercase tracking-widest text-[var(--bb-green)]">Pointer Movement Game · O(n) time · O(1) extra space</p>
      <h1 className="mt-2 text-2xl font-bold">Find a pair that sums to {TARGET}</h1>
      <p className="mt-2 text-sm text-[var(--bb-muted)]">Choose a move after comparing the active endpoints. An incorrect move leaves the pointers in place and explains which candidates the sorted order rules out.</p>
    </header>
    <section className="border border-[var(--bb-line)] bg-[var(--bb-panel)] p-5" aria-label="Pointer state">
      <div className="mb-2 grid grid-cols-6 text-center font-mono text-xs text-[var(--bb-muted)]">{cells.map(({ index }) => <span key={index}>{index === left ? 'L' : ''}{index === right ? 'R' : ''}{index === left && index === right ? ' · ' : ''}</span>)}</div>
      <div className="grid grid-cols-6">{cells.map(({ value, index }) => <div key={index} className={`border p-3 text-center font-mono ${index === left || index === right ? 'border-[var(--bb-green)] text-[var(--bb-green)]' : index < left || index > right ? 'opacity-35' : 'text-[var(--bb-text)]'}`}>{value}</div>)}</div>
      <p className="mt-4 font-mono text-sm">nums[{left}] + nums[{right}] = {VALUES[left]} + {VALUES[right]} = <strong>{currentSum}</strong> · target {TARGET}</p>
      <p role="status" className="mt-3 min-h-12 text-sm text-[var(--bb-muted)]">{feedback}</p>
      {!complete ? <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => move('left')} disabled={moveExpected === 'match'} className="bb-btn bb-btn-ghost text-xs disabled:opacity-40">Move left →</button>
        <button onClick={() => move('right')} disabled={moveExpected === 'match'} className="bb-btn bb-btn-ghost text-xs disabled:opacity-40">Move right ←</button>
        {moveExpected === 'match' && <button onClick={() => move('match')} className="bb-btn bb-btn-green text-xs">Record this pair</button>}
        <span className="self-center text-xs text-[var(--bb-muted)]">Incorrect moves: {mistakes}</span>
      </div> : <div className="mt-4 flex flex-wrap gap-2"><span className="self-center text-xs text-[var(--bb-green)]">Game complete · {mistakes} incorrect moves recorded</span><button onClick={reset} className="bb-btn bb-btn-ghost text-xs">Replay</button></div>}
    </section>
  </main>;
}

import { useState } from 'react';
import { useGame } from '../game/GameContext.jsx';
import { sfx } from '../game/sfx.js';

const VALUES = [4, 7, 2, 7, 5];

export default function ArraySetGame({ onBack }) {
  const { recordSkillSession } = useGame();
  const [index, setIndex] = useState(0);
  const [seen, setSeen] = useState([]);
  const [mistakes, setMistakes] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [complete, setComplete] = useState(false);

  const value = VALUES[index];
  const duplicate = seen.includes(value);

  const choose = (detectDuplicate) => {
    if (complete) return;
    if (detectDuplicate === duplicate) {
      sfx.correct();
      setFeedback(duplicate
        ? `${value} is already in {${seen.join(', ')}}. Stop: a duplicate is proven.`
        : `${value} is new. Add it to the processed set before continuing.`);
      if (duplicate) {
        recordSkillSession('contains-duplicate', {
          solvePassed: true,
          maxHintLevelUsed: 0,
          mistakes,
          explanationCorrect: false,
          transferPassed: false,
        });
        setComplete(true);
      } else {
        setSeen((current) => [...current, value]);
        setIndex((current) => current + 1);
      }
    } else {
      setMistakes((current) => current + 1);
      setFeedback(duplicate
        ? `The processed set already contains ${value}; checking membership should stop the scan.`
        : `${value} is not in the processed set yet. Add it before moving on.`);
      sfx.wrong();
    }
  };

  const reset = () => {
    setIndex(0);
    setSeen([]);
    setMistakes(0);
    setFeedback('');
    setComplete(false);
  };

  return (
    <main className="mx-auto max-w-2xl px-4 pt-6 pb-24">
      <button onClick={onBack} className="mb-5 text-[10px] uppercase tracking-widest text-[var(--bb-muted)]">← Back to Arrays</button>
      <section className="border border-[var(--bb-green-dim)] bg-[var(--bb-panel)] p-5 sm:p-6">
        <p className="text-[10px] uppercase tracking-widest text-[var(--bb-green)]">Arrays Game 2 · Set Memory Sprint</p>
        <h1 className="mt-2 text-2xl font-bold">Catch the Duplicate</h1>
        <p className="mt-2 text-sm text-[var(--bb-muted)]">Scan each value once. Keep the processed prefix in <code>seen</code>; check membership before adding the current value.</p>

        {!complete ? (
          <>
            <div className="mt-5 flex items-center justify-between text-xs text-[var(--bb-muted)]">
              <span>Position {index + 1} of {VALUES.length}</span>
              <span>{mistakes} incorrect {mistakes === 1 ? 'choice' : 'choices'}</span>
            </div>
            <div className="mt-3 flex gap-2" aria-label="Input values">
              {VALUES.map((item, position) => (
                <div key={position} className={`flex-1 border px-2 py-3 text-center font-mono ${position === index ? 'border-[var(--bb-amber)] text-[var(--bb-amber)]' : position < index ? 'border-[var(--bb-green-dim)] text-[var(--bb-green)]' : 'border-[var(--bb-line)] text-[var(--bb-muted)]'}`}>
                  <span className="block text-[9px] opacity-70">{position}</span>{item}
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm">Current value: <strong className="font-mono text-[var(--bb-amber)]">{value}</strong></p>
            <p className="mt-1 text-xs text-[var(--bb-muted)]">Processed set: <code>{`{${seen.join(', ')}}`}</code></p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button onClick={() => choose(false)} className="bb-btn bb-btn-ghost text-xs">Add to seen and continue</button>
              <button onClick={() => choose(true)} className="bb-btn bb-btn-green text-xs">Duplicate found — stop</button>
            </div>
            {feedback && <p role="status" className="mt-4 border border-[var(--bb-line)] px-3 py-2 text-xs">{feedback}</p>}
          </>
        ) : (
          <div className="mt-5 border border-[var(--bb-green-dim)] p-4">
            <p className="text-sm font-semibold text-[var(--bb-green)]">Duplicate found at index {index}.</p>
            <p className="mt-2 text-xs text-[var(--bb-muted)]">The second 7 matched a value in the processed set. You stopped as soon as the scan proved a duplicate; incorrect choices: {mistakes}.</p>
            <div className="mt-4 flex gap-2">
              <button onClick={reset} className="bb-btn bb-btn-ghost text-xs">Play again</button>
              <button onClick={onBack} className="bb-btn bb-btn-green text-xs">Return to Arrays →</button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

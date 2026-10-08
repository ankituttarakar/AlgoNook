import { useState } from 'react';
import { useGame } from '../game/GameContext.jsx';
import { sfx } from '../game/sfx.js';

const STREAM = ['pear', 'plum', 'pear', 'kiwi', 'plum', 'pear'];

export default function HashFrequencyGame({ onBack }) {
  const { recordSkillSession } = useGame();
  const [index, setIndex] = useState(0);
  const [counts, setCounts] = useState({});
  const [mistakes, setMistakes] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [complete, setComplete] = useState(false);
  const isRecall = index >= STREAM.length;
  const current = STREAM[index];
  const expectedAction = current && counts[current] ? 'increment' : 'initialize';

  const chooseAction = (action) => {
    if (action !== expectedAction) {
      setMistakes((value) => value + 1);
      setFeedback(expectedAction === 'increment'
        ? `${current} is already in the map with count ${counts[current]}; increase that count by one.`
        : `${current} is new. Create its map entry with count 1.`);
      sfx.wrong();
      return;
    }
    setCounts((value) => ({ ...value, [current]: (value[current] || 0) + 1 }));
    setFeedback(expectedAction === 'increment'
      ? `Incremented ${current}; its count is now ${(counts[current] || 0) + 1}.`
      : `Added ${current} with count 1.`);
    setIndex((value) => value + 1);
    sfx.correct();
  };

  const chooseMostFrequent = (key) => {
    if (key !== 'pear') {
      setMistakes((value) => value + 1);
      setFeedback('Recount the completed map: compare the values, not how many distinct keys there are.');
      sfx.wrong();
      return;
    }
    setFeedback('Correct: pear appears 3 times, the highest frequency.');
    setComplete(true);
    recordSkillSession('hashing-frequency', {
      solvePassed: true,
      maxHintLevelUsed: 0,
      mistakes,
      explanationCorrect: false,
      transferPassed: false,
    });
    sfx.correct();
  };

  const reset = () => {
    setIndex(0);
    setCounts({});
    setMistakes(0);
    setFeedback('');
    setComplete(false);
  };

  return (
    <main className="mx-auto max-w-2xl px-4 pt-6 pb-24">
      <button onClick={onBack} className="mb-5 text-[10px] uppercase tracking-widest text-[var(--bb-muted)]">← Back to Hashing</button>
      <section className="border border-[var(--bb-green-dim)] bg-[var(--bb-panel)] p-5 sm:p-6">
        <p className="text-[10px] uppercase tracking-widest text-[var(--bb-green)]">Hashing Game · Frequency Map Builder</p>
        <h1 className="mt-2 text-2xl font-bold">Count Each Key</h1>
        <p className="mt-2 text-sm text-[var(--bb-muted)]">Scan the stream once. Initialize unseen keys at 1, increment keys already in the map, then identify the highest frequency.</p>

        {!complete && !isRecall && (
          <>
            <div className="mt-5 flex items-center justify-between text-xs text-[var(--bb-muted)]">
              <span>Key {index + 1} of {STREAM.length}</span>
              <span>{mistakes} incorrect {mistakes === 1 ? 'choice' : 'choices'}</span>
            </div>
            <div className="mt-3 flex gap-2" aria-label="Input key stream">
              {STREAM.map((key, position) => (
                <div key={position} className={`flex-1 border px-1 py-2 text-center font-mono text-[10px] ${position === index ? 'border-[var(--bb-amber)] text-[var(--bb-amber)]' : position < index ? 'border-[var(--bb-green-dim)] text-[var(--bb-green)]' : 'border-[var(--bb-line)] text-[var(--bb-muted)]'}`}>
                  <span className="block opacity-60">{position}</span>{key}
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm">Current key: <strong className="font-mono text-[var(--bb-amber)]">{current}</strong></p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button onClick={() => chooseAction('initialize')} className="bb-btn bb-btn-ghost text-xs">Initialize key at 1</button>
              <button onClick={() => chooseAction('increment')} className="bb-btn bb-btn-ghost text-xs">Increment existing count</button>
            </div>
          </>
        )}

        {!complete && isRecall && (
          <div className="mt-5">
            <p className="text-sm">Which key has the highest frequency?</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {Object.keys(counts).map((key) => <button key={key} onClick={() => chooseMostFrequent(key)} className="bb-btn bb-btn-ghost text-xs">{key} · {counts[key]}</button>)}
            </div>
          </div>
        )}

        {Object.keys(counts).length > 0 && (
          <section aria-label="Frequency map" className="mt-5 border border-[var(--bb-line)] bg-black/20 p-3">
            <h2 className="text-[9px] uppercase tracking-widest text-[var(--bb-muted)]">Current frequency map</h2>
            <dl className="mt-2 flex flex-wrap gap-2">
              {Object.entries(counts).map(([key, count]) => <div key={key} className="border border-[var(--bb-green-dim)] px-3 py-2 font-mono text-xs"><dt className="inline">{key}</dt><dd className="ml-2 inline text-[var(--bb-green)]">{count}</dd></div>)}
            </dl>
          </section>
        )}

        {feedback && <p role="status" className="mt-4 border border-[var(--bb-line)] px-3 py-2 text-xs">{feedback}</p>}

        {complete && (
          <div className="mt-5 border border-[var(--bb-green-dim)] p-4">
            <p className="text-sm font-semibold text-[var(--bb-green)]">Frequency map complete.</p>
            <p className="mt-2 text-xs text-[var(--bb-muted)]">{Object.entries(counts).map(([key, count]) => `${key}: ${count}`).join(' · ')} · mistakes: {mistakes}</p>
            <div className="mt-4 flex gap-2">
              <button onClick={reset} className="bb-btn bb-btn-ghost text-xs">Play again</button>
              <button onClick={onBack} className="bb-btn bb-btn-green text-xs">Return to Hashing →</button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

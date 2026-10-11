// Stage 6: Code Completion / Block assembly with 6-level hint ladder
import { useState } from 'react';
import { sfx } from '../game/sfx.js';
import HintLadder from '../components/HintLadder.jsx';
import DiscoveryFrame from '../components/DiscoveryFrame.jsx';

export default function CodeChallenge({ data, onComplete, onMistake, onHintRevealed }) {
  const { prompt, blanks, codeTemplate, ladder = [] } = data;
  // blanks is array of { id, label, correct, options: string[] }
  const [selected, setSelected] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleSelect = (blankId, val) => {
    setSelected((prev) => ({ ...prev, [blankId]: val }));
    setSubmitted(false);
    setFeedback(null);
  };

  const checkSolution = () => {
    // verify all blanks are selected
    const allFilled = blanks.every((b) => selected[b.id]);
    if (!allFilled) {
      setFeedback({ ok: false, msg: 'Fill in all code slots before compiling.' });
      sfx.wrong();
      return;
    }

    const wrongBlank = blanks.find((b) => selected[b.id] !== b.correct);
    if (!wrongBlank) {
      setIsCorrect(true);
      setSubmitted(true);
      setFeedback({ ok: true, msg: 'Implementation compiled and verified. All unit tests passed.' });
      sfx.correct();
      onComplete({ firstTry: !submitted && !feedback });
    } else {
      setIsCorrect(false);
      setSubmitted(true);
      const msg = wrongBlank.explain || `Syntax/logic error around ${wrongBlank.label}.`;
      setFeedback({ ok: false, msg });
      sfx.wrong();
      if (onMistake) onMistake(msg);
    }
  };

  return (
    <DiscoveryFrame context="IMPLEMENTATION BAY" title="Assemble the routine" objective={prompt}>
        {/* Code display with slot selector */}
        <div className="border border-[var(--bb-line)] bg-black/80 p-4 font-mono text-xs leading-relaxed text-zinc-300 overflow-x-auto">
          <div className="text-zinc-500 mb-2">// Complete the linear search implementation</div>
          {codeTemplate(selected, handleSelect, blanks)}
        </div>

        {/* Blank slot pickers */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {blanks.map((b) => (
            <div key={b.id} className="border border-[var(--bb-line)] p-2.5 bg-black/40">
              <div className="text-[10px] uppercase tracking-widest text-[var(--bb-amber)] mb-1.5">
                {b.label}
              </div>
              <select
                value={selected[b.id] || ''}
                onChange={(e) => handleSelect(b.id, e.target.value)}
                disabled={isCorrect}
                className="w-full bg-zinc-900 border border-zinc-700 text-xs px-2 py-1.5 text-[var(--bb-green)] focus:border-[var(--bb-green)] outline-none"
              >
                <option value="">-- select syntax --</option>
                {b.options.map((opt, i) => (
                  <option key={i} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* Compile button */}
        {!isCorrect && (
          <div className="mt-4">
            <button
              onClick={checkSolution}
              className="bb-btn bb-btn-green text-xs w-full sm:w-auto"
            >
              ▶ Compile & Run Test Suite
            </button>
          </div>
        )}

        {/* Feedback block */}
        {feedback && (
          <div
            className={`anim-rise mt-4 border p-3 text-xs leading-relaxed ${
              feedback.ok
                ? 'border-[var(--bb-green)]/50 bg-[rgba(0,244,142,0.06)] text-[var(--bb-green)]'
                : 'border-red-500/50 bg-red-950/20 text-red-400'
            }`}
          >
            <span className="font-bold">{feedback.ok ? '✓ COMPILE SUCCESS — ' : '✗ COMPILATION ERROR — '}</span>
            {feedback.msg}
          </div>
        )}

        {isCorrect && (
          <div className="mt-4">
            <button
              onClick={() => { sfx.select(); onComplete({ firstTry: true }); }}
              className="bb-btn bb-btn-green text-xs"
            >
              Advance to Explanation Stage ▶
            </button>
          </div>
        )}

        <HintLadder ladder={ladder} onHintRevealed={onHintRevealed} disabled={isCorrect} />
    </DiscoveryFrame>
  );
}

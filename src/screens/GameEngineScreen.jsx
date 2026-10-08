import { useMemo, useState } from 'react';
import { useGame } from '../game/GameContext.jsx';
import { evaluateGameAnswer } from '../game/engine.js';
import { useShuffledOptions } from '../game/answerOptions.js';
import HintLadder from '../components/HintLadder.jsx';

function Stage({ stage, onContinue, onMistake, onHint }) {
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [solved, setSolved] = useState(false);
  const [buildPosition, setBuildPosition] = useState(0);
  const [buildOrder, setBuildOrder] = useState([]);
  const options = useShuffledOptions(stage.options || stage.items || [], stage.id);
  const build = stage.type === 'build';

  const submit = (value) => {
    if (solved) return;
    const result = evaluateGameAnswer(stage, value);
    setFeedback(result.feedback);
    if (result.correct) {
      setSolved(true);
    } else onMistake();
  };

  const chooseBuildItem = (item) => {
    const result = evaluateGameAnswer(stage, { candidateId: item.id, position: buildPosition });
    setFeedback(result.feedback);
    if (!result.correct) {
      onMistake();
      return;
    }
    const nextOrder = [...buildOrder, item.id];
    setBuildOrder(nextOrder);
    setBuildPosition(buildPosition + 1);
    if (buildPosition + 1 === stage.expectedOrder.length) {
      setSolved(true);
    }
  };

  return (
    <div className="border border-[var(--bb-line)] bg-[var(--bb-panel)] p-5">
      <p className="text-[10px] uppercase tracking-widest text-[var(--bb-green)]">{stage.label}</p>
      <h1 className="mt-2 text-lg font-semibold">{stage.prompt}</h1>
      {stage.code && <pre className="mt-4 overflow-x-auto border border-[var(--bb-line)] bg-black/50 p-3 text-xs leading-relaxed">{stage.code}</pre>}

      {build ? (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-[var(--bb-muted)]">Step {Math.min(buildPosition + 1, stage.expectedOrder.length)} of {stage.expectedOrder.length}</p>
          {options.filter((item) => !buildOrder.includes(item.id)).map((item) => (
            <button key={item.id} disabled={solved} onClick={() => chooseBuildItem(item)} className="bb-btn bb-btn-ghost w-full !justify-start text-left text-xs">
              {item.label}
            </button>
          ))}
          {buildOrder.length > 0 && <ol className="list-decimal pl-5 text-xs text-[var(--bb-green)]">{buildOrder.map((id) => <li key={id}>{stage.items.find((item) => item.id === id)?.label}</li>)}</ol>}
        </div>
      ) : stage.options ? (
        <div className="mt-4 space-y-2">
          {options.map((option) => (
            <button key={option.id} disabled={solved} onClick={() => submit(option.id)} className="bb-btn bb-btn-ghost w-full !justify-start text-left text-xs">
              {option.label}
            </button>
          ))}
        </div>
      ) : (
        <form className="mt-4 flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); submit(answer); }}>
          <input aria-label="Your answer" value={answer} onChange={(event) => setAnswer(event.target.value)} disabled={solved} className="min-w-40 flex-1 border border-[var(--bb-line)] bg-black/50 px-3 py-2 text-sm" />
          <button disabled={solved || !answer.trim()} className="bb-btn bb-btn-green text-xs">Check reasoning</button>
        </form>
      )}

      {feedback && <p role="status" className={`mt-4 text-xs ${solved ? 'text-[var(--bb-green)]' : 'text-[var(--bb-amber)]'}`}>{feedback}</p>}
      {solved && <p className="mt-2 text-xs leading-relaxed text-[var(--bb-muted)]">{stage.explanation}</p>}
      <HintLadder key={stage.id} ladder={stage.hints} onHintRevealed={onHint} disabled={solved} />
      {solved && <button onClick={onContinue} className="bb-btn bb-btn-green mt-5 text-xs">Continue →</button>}
    </div>
  );
}

export default function GameEngineScreen({ game, onBack, onComplete, backLabel = '← Back to Visualization', completeLabel = 'Continue to Pattern →' }) {
  const { recordSkillSession } = useGame();
  const [stageIndex, setStageIndex] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [maxHintLevelUsed, setMaxHintLevelUsed] = useState(0);
  const [complete, setComplete] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const stage = game.stages[stageIndex];
  const allTypesSupported = useMemo(() => game.stages.every((item) => ['trace', 'predict', 'build', 'repair', 'debug', 'complexity-duel', 'pattern-match', 'constraint-challenge'].includes(item.type)), [game]);

  const advance = () => {
    if (stageIndex < game.stages.length - 1) setStageIndex((value) => value + 1);
    else {
      setComplete(true);
      if (!recorded) {
        recordSkillSession(game.skillId, {
          solvePassed: true,
          maxHintLevelUsed,
          mistakes,
          // The game stages prove reasoning and transfer; the coding mission's
          // Explain stage supplies explanation evidence for independent mastery.
          explanationCorrect: false,
          transferPassed: true,
        });
        setRecorded(true);
      }
    }
  };

  return (
    <main className="mx-auto max-w-2xl px-4 pt-6 pb-24">
      <button onClick={onBack} className="mb-5 text-[10px] uppercase tracking-widest text-[var(--bb-muted)]">{backLabel}</button>
      {!allTypesSupported ? <p role="alert">This game contains an unsupported stage.</p> : complete ? (
        <section className="border border-[var(--bb-green-dim)] bg-[var(--bb-panel)] p-6 text-center">
          <p className="text-[10px] uppercase tracking-widest text-[var(--bb-green)]">Game complete</p>
          <h1 className="mt-2 text-2xl font-bold">Reasoning proof finished</h1>
          <p className="mt-3 text-sm text-[var(--bb-muted)]">You solved all {game.stages.length} stages. Mastery evidence reflects {mistakes} incorrect attempts and a highest hint level of {maxHintLevelUsed}.</p>
          <button onClick={onComplete} className="bb-btn bb-btn-green mt-5 text-xs">{completeLabel}</button>
        </section>
      ) : (
        <>
          <header className="mb-4">
            <p className="text-[10px] uppercase tracking-widest text-[var(--bb-muted)]">{game.title}</p>
            <div className="mt-2 h-1 border border-[var(--bb-line)] bg-black/50"><div className="h-full bg-[var(--bb-green)]" style={{ width: `${stageIndex / game.stages.length * 100}%` }} /></div>
            <p className="mt-2 text-[10px] text-[var(--bb-muted)]">Challenge {stageIndex + 1} of {game.stages.length} · {mistakes} mistakes</p>
          </header>
          <Stage key={stage.id} stage={stage} onContinue={advance} onMistake={() => setMistakes((value) => value + 1)} onHint={(level) => setMaxHintLevelUsed((value) => Math.max(value, level))} />
        </>
      )}
    </main>
  );
}

// Learning Mission Orchestrator for AlgoNook
// Follows the genuine learning loop:
// 1. Story / Context (PLAY)
// 2. Concept Discovery (DISCOVER)
// 3. Think Challenge (THINK)
// 4. Guided Reasoning & 5. Algorithm Trace (ATTEMPT & GUIDED HELP)
// 6. Coding Challenge (SOLVE with 6-level hint ladder)
// 7. Conceptual Explanation (EXPLAIN)
// 8. Transfer Challenge (TRANSFER)
// 9. Mission Result, Mastery Update, Spaced Review
import { useState } from 'react';
import { useGame } from '../game/GameContext.jsx';
import { levelFromXp, challengeXp, missionStars, MISSION_BONUS, REPLAY_FACTOR } from '../game/progression.js';
import { sfx } from '../game/sfx.js';
import ConceptDiscovery from '../challenges/ConceptDiscovery.jsx';
import ThinkStage from '../challenges/ThinkStage.jsx';
import TraceStage from '../challenges/TraceStage.jsx';
import CodeChallenge from '../challenges/CodeChallenge.jsx';
import ExplanationStage from '../challenges/ExplanationStage.jsx';
import TransferStage from '../challenges/TransferStage.jsx';
import DiscoveryFrame from '../components/DiscoveryFrame.jsx';
import DSAProblemFlow from './DSAProblemFlow.jsx';

const STAGES = [
  { id: 'story', title: '1. MISSION BRIEF & STORY' },
  { id: 'discovery', title: '2. CONCEPT DISCOVERY' },
  { id: 'think', title: '3. THINK PREDICTION' },
  { id: 'trace', title: '4. ALGORITHM TRACE' },
  { id: 'code', title: '5. CODE IMPLEMENTATION' },
  { id: 'explanation', title: '6. EXPLANATION PROOF' },
  { id: 'transfer', title: '7. TRANSFER APPLICATION' },
];

export default function LearningRunScreen({ mission, onFinish, onAbort }) {
  const { save, cleared, awardXp, recordSkillSession } = useGame();
  const replay = !!cleared[mission.id];

  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [maxHintLevelUsed, setMaxHintLevelUsed] = useState(0);
  const [explanationPassed, setExplanationPassed] = useState(false);
  const [transferPassed, setTransferPassed] = useState(false);
  const [codeFirstTry, setCodeFirstTry] = useState(true);
  const [earned, setEarned] = useState([]);
  const [levelUps, setLevelUps] = useState([]);

  const currentStage = STAGES[currentStageIndex];

  const handleHintRevealed = (level) => {
    setMaxHintLevelUsed((prev) => Math.max(prev, level));
  };

  const handleMistake = () => {
    setMistakes((m) => m + 1);
  };

  const awardStageXp = (label, difficulty, { firstTry = true }) => {
    const xp = challengeXp(difficulty, {
      firstTry,
      hintUsed: maxHintLevelUsed > 0,
      streak: 0,
      replay,
    });
    const before = levelFromXp(save.xp);
    const after = levelFromXp(save.xp + xp);
    awardXp(xp);
    if (after > before) {
      setLevelUps((l) => [...l, after]);
      sfx.levelup();
    }
    setEarned((prev) => [...prev, { label, xp }]);
  };

  const advanceStage = () => {
    sfx.select();
    if (currentStageIndex + 1 < STAGES.length) {
      setCurrentStageIndex((idx) => idx + 1);
    } else {
      finalizeMission();
    }
  };

  const finalizeMission = (sessionOverrides = {}) => {
    const bonus = replay ? Math.round(MISSION_BONUS * REPLAY_FACTOR) : MISSION_BONUS;
    const before = levelFromXp(save.xp);
    const after = levelFromXp(save.xp + bonus);
    awardXp(bonus);

    const finalLevelUps = after > before ? [...levelUps, after] : levelUps;
    const stars = missionStars(mistakes);

    const sessionStats = {
      skill: mission.skill || 'linear-search',
      maxHintLevelUsed,
      explanationCorrect: explanationPassed,
      transferPassed,
      solvePassed: true,
      mistakes,
      ...sessionOverrides,
    };

    // Update Skill Mastery & Spaced Review scheduling
    recordSkillSession(mission.skill || 'linear-search', sessionStats);

    const totalXp = earned.reduce((sum, e) => sum + e.xp, 0) + bonus;

    onFinish({
      mission,
      earned,
      bonus,
      total: totalXp,
      stars,
      mistakes,
      replay,
      levelUps: finalLevelUps,
      skillStats: sessionStats,
    });
  };

  if (mission.problemFlow) {
    return (
      <DSAProblemFlow
        flow={mission.problemFlow}
        onStageComplete={({ label, difficulty, firstTry }) => awardStageXp(label, difficulty, { firstTry })}
        onMistake={handleMistake}
        onHintRevealed={handleHintRevealed}
        onAbort={onAbort}
        onComplete={({ explanationFirstTry, transferFirstTry }) => finalizeMission({
          explanationCorrect: explanationFirstTry,
          transferPassed: transferFirstTry,
        })}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">
      {/* Header HUD */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--bb-line)] pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { sfx.select(); onAbort(); }}
            className="bb-btn bb-btn-ghost !min-h-0 !px-2.5 !py-1 text-[10px]"
          >
            ◄ Abort
          </button>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--bb-muted)]">
              {mission.title} · {currentStage.title}
            </div>
            <div className="text-xs text-[var(--bb-green)]">
              SKILL: <span className="font-bold">{mission.skill || 'linear-search'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {maxHintLevelUsed > 0 && (
            <span className="text-[10px] text-[var(--bb-amber)] border border-[var(--bb-amber)]/40 px-1.5 py-0.5">
              HINT L{maxHintLevelUsed}
            </span>
          )}
          <span className="tabular-nums text-[var(--bb-green)]">
            +{earned.reduce((s, e) => s + e.xp, 0)} XP
          </span>
        </div>
      </div>

      {/* Progress Stages Rail */}
      <div className="mb-6 grid grid-cols-7 gap-1">
        {STAGES.map((s, idx) => (
          <div
            key={s.id}
            className={`h-1.5 border border-[var(--bb-line)] transition-colors ${
              idx < currentStageIndex
                ? 'bg-[var(--bb-green)]'
                : idx === currentStageIndex
                ? 'bg-[var(--bb-amber)] bb-glow-amber'
                : 'bg-black/60'
            }`}
            title={s.title}
          />
        ))}
      </div>

      {/* STAGE 1: Story / Context */}
      {currentStage.id === 'story' && (
        <DiscoveryFrame
          context="STAGE 1 · SECTOR TRANSMISSION"
          title={mission.story.location}
          objective="Investigate unsorted storage bays, uncover how a computer finds items when no index or sorting guarantees exist, and formulate the linear search algorithm."
          evidence={mission.story.transmission}
          evidenceLabel="Decrypt incoming transmission"
        >
            <button
              onClick={() => {
                awardStageXp('STORY BRIEF', 'easy', { firstTry: true });
                advanceStage();
              }}
              className="bb-btn bb-btn-green w-full text-xs"
            >
              Enter Cargo Bay & Discover Concept ▶
            </button>
        </DiscoveryFrame>
      )}

      {/* STAGE 2: Concept Discovery */}
      {currentStage.id === 'discovery' && (
        <ConceptDiscovery
          data={mission.discovery}
          onComplete={() => {
            awardStageXp('CONCEPT DISCOVERY', 'easy', { firstTry: true });
            advanceStage();
          }}
        />
      )}

      {/* STAGE 3: Think Challenge */}
      {currentStage.id === 'think' && (
        <ThinkStage
          questions={mission.think}
          onMistake={handleMistake}
          onComplete={() => {
            awardStageXp('THINK PREDICTIONS', 'med', { firstTry: mistakes === 0 });
            advanceStage();
          }}
        />
      )}

      {/* STAGE 4: Algorithm Trace */}
      {currentStage.id === 'trace' && (
        <TraceStage
          data={mission.trace}
          onHintRevealed={handleHintRevealed}
          onComplete={() => {
            awardStageXp('ALGORITHM TRACE', 'med', { firstTry: maxHintLevelUsed <= 2 });
            advanceStage();
          }}
        />
      )}

      {/* STAGE 5: Code Implementation */}
      {currentStage.id === 'code' && (
        <CodeChallenge
          data={{
            ...mission.codeChallenge,
            codeTemplate: (selected) => (
              <pre className="font-mono text-xs leading-relaxed text-zinc-300">
{`function linearSearch(arr, target) {
  // Loop through all elements in the array
  for (`}<span className="text-[var(--bb-amber)] font-bold">{selected.loop_init || '/* [Loop Header] */'}</span>{`) {
    // Check if current slot holds the target value
    if (`}<span className="text-[var(--bb-green)] font-bold">{selected.condition || '/* [Match Condition] */'}</span>{`) {
      return i; // Target located at index i
    }
  }
  // Target not present anywhere in array
  `}<span className="text-[var(--bb-amber)] font-bold">{selected.return_not_found || '/* [Exhausted Return] */'}</span>{`;
}`}
              </pre>
            ),
          }}
          onHintRevealed={handleHintRevealed}
          onMistake={handleMistake}
          onComplete={({ firstTry }) => {
            setCodeFirstTry(firstTry);
            awardStageXp('CODE IMPLEMENTATION', 'hard', { firstTry });
            advanceStage();
          }}
        />
      )}

      {/* STAGE 6: Explanation Proof */}
      {currentStage.id === 'explanation' && (
        <ExplanationStage
          data={mission.explanation}
          onMistake={handleMistake}
          onComplete={({ firstTry }) => {
            setExplanationPassed(firstTry);
            awardStageXp('COMPLEXITY EXPLANATION', 'med', { firstTry });
            advanceStage();
          }}
        />
      )}

      {/* STAGE 7: Transfer Challenge */}
      {currentStage.id === 'transfer' && (
        <TransferStage
          data={mission.transfer}
          onHintRevealed={handleHintRevealed}
          onMistake={handleMistake}
          onComplete={({ firstTry }) => {
            setTransferPassed(firstTry);
            awardStageXp('DOMAIN TRANSFER', 'med', { firstTry });
            finalizeMission();
          }}
        />
      )}
    </div>
  );
}

// Mission run — gathers answer evidence; the server validates and awards completion.
import { useState, useRef } from 'react';
import ChoiceChallenge from '../challenges/ChoiceChallenge.jsx';
import OrderChallenge from '../challenges/OrderChallenge.jsx';
import MachineChallenge from '../challenges/MachineChallenge.jsx';
import { useGame } from '../game/GameContext.jsx';
import { levelFromXp } from '../game/progression.js';
import { sfx } from '../game/sfx.js';

const ENGINES = { mc: ChoiceChallenge, order: OrderChallenge, machine: MachineChallenge };
const DIFF_LABEL = { easy: 'EASY', med: 'MEDIUM', hard: 'HARD' };
const DIFF_COLOR = {
  easy: 'text-[var(--bb-green)] border-[var(--bb-green-dim)]',
  med: 'text-[var(--bb-amber)] border-[var(--bb-amber)]/50',
  hard: 'text-[var(--bb-red)] border-[var(--bb-red)]/50',
};

export default function RunScreen({ mission, onFinish, onAbort }) {
  const { save, cleared, submitEvent } = useGame();
  const replay = !!cleared[mission.id];
  const eventId = useRef(globalThis.crypto.randomUUID());
  const submissionLock = useRef(false);

  const [idx, setIdx] = useState(0);
  const [evidence, setEvidence] = useState([]);
  const [clearedNow, setClearedNow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const challenge = mission.challenges[idx];
  const Engine = ENGINES[challenge.t];
  const engineKey = `${mission.id}:${idx}`;

  const handleSolved = ({ evidence: answerEvidence }) => {
    setEvidence((items) => [...items, answerEvidence]);
    setClearedNow(true);
  };

  const next = async () => {
    sfx.select();
    if (idx + 1 < mission.challenges.length) {
      setIdx((value) => value + 1);
      setClearedNow(false);
      return;
    }

    if (submissionLock.current) return;
    submissionLock.current = true;
    setSubmitting(true);
    setSubmitError('');
    try {
      const previousLevel = levelFromXp(save.xp);
      const result = await submitEvent({
        eventId: eventId.current,
        type: 'mission_completed',
        missionId: mission.id,
        evidence,
      });
      const stars = result.snapshot.missions?.[mission.id]?.stars || result.stars;
      const level = result.snapshot.progress.level;
      sfx.unlock();
      onFinish({
        mission,
        earned: [],
        bonus: result.awardedXp,
        total: result.awardedXp,
        stars,
        mistakes: null,
        replay: replay || result.duplicate,
        levelUps: level > previousLevel ? [level] : [],
      });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : String(error));
    } finally {
      submissionLock.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">
      <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button onClick={() => { sfx.select(); onAbort(); }} className="bb-btn bb-btn-ghost !min-h-0 !px-2.5 !py-1 text-[10px]">
          ◄ Abort
        </button>
        <div className="text-[10px] uppercase tracking-widest text-[var(--bb-muted)]">
          {mission.title}
        </div>
        <div className="ml-auto text-xs text-[var(--bb-green)]">Answers are verified at completion</div>
      </div>

      <div className="mb-5 flex items-center gap-1.5">
        {mission.challenges.map((item, index) => (
          <div
            key={index}
            className={`h-1.5 flex-1 border border-[var(--bb-line)] transition-colors ${
              index < idx || (index === idx && clearedNow)
                ? 'bg-[var(--bb-green)]'
                : index === idx
                  ? 'bg-[rgba(0,244,142,0.25)]'
                  : 'bg-black/60'
            }`}
          />
        ))}
      </div>

      <div className="bb-panel anim-pop p-5 sm:p-6" key={engineKey}>
        <div className="mb-4 flex items-center gap-2 text-[10px] uppercase tracking-widest">
          <span className="text-[var(--bb-muted)]">Challenge {idx + 1}/{mission.challenges.length}</span>
          <span className={`border px-1.5 py-0.5 ${DIFF_COLOR[challenge.d]}`}>{DIFF_LABEL[challenge.d]}</span>
          <span className="text-[var(--bb-green-faint)]">
            {challenge.t === 'machine' ? '◈ LIVE MACHINE' : challenge.t === 'order' ? '◈ SEQUENCE' : '◈ SIGNAL'}
          </span>
        </div>

        <Engine challenge={challenge} onSolved={handleSolved} onMistake={() => {}} />

        {clearedNow && (
          <div className="anim-pop mt-5 flex items-center justify-between border-t border-[var(--bb-line)] pt-4">
            <span className="font-crt text-lg text-[var(--bb-amber)]">Answer recorded for verification</span>
            <button onClick={next} disabled={submitting} className="bb-btn bb-btn-green">
              {submitting ? 'Verifying…' : idx + 1 < mission.challenges.length ? 'Next challenge ▶' : 'Complete mission ▶'}
            </button>
          </div>
        )}
        {submitError && <p role="alert" className="mt-4 text-xs text-[var(--bb-red)]">{submitError}</p>}
      </div>

      <p className="mt-3 text-center text-[10px] text-[var(--bb-muted)]">
        Progress and rewards are saved after the server verifies the completed activity.
      </p>
    </div>
  );
}

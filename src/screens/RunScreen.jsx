// Mission run — orchestrates challenges, streaks, XP awards, abort handling
import { useMemo, useState } from 'react';
import ChoiceChallenge from '../challenges/ChoiceChallenge.jsx';
import OrderChallenge from '../challenges/OrderChallenge.jsx';
import MachineChallenge from '../challenges/MachineChallenge.jsx';
import { useGame } from '../game/GameContext.jsx';
import { challengeXp, missionStars, levelFromXp, MISSION_BONUS, REPLAY_FACTOR } from '../game/progression.js';
import { sfx } from '../game/sfx.js';

const ENGINES = { mc: ChoiceChallenge, order: OrderChallenge, machine: MachineChallenge };
const DIFF_LABEL = { easy: 'EASY', med: 'MEDIUM', hard: 'HARD' };
const DIFF_COLOR = {
  easy: 'text-[var(--bb-green)] border-[var(--bb-green-dim)]',
  med: 'text-[var(--bb-amber)] border-[var(--bb-amber)]/50',
  hard: 'text-[var(--bb-red)] border-[var(--bb-red)]/50',
};

export default function RunScreen({ mission, onFinish, onAbort }) {
  const { save, cleared, awardXp } = useGame();
  const replay = !!cleared[mission.id];

  const [idx, setIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [earned, setEarned] = useState([]); // { label, xp }
  const [clearedNow, setClearedNow] = useState(false);
  const [lastGain, setLastGain] = useState(null);
  const [levelUps, setLevelUps] = useState([]);

  const challenge = mission.challenges[idx];
  const Engine = ENGINES[challenge.t];
  // key remount resets each engine between challenges
  const engineKey = `${mission.id}:${idx}`;

  const totalEarned = useMemo(() => earned.reduce((n, e) => n + e.xp, 0), [earned]);

  const handleSolved = ({ firstTry, hintUsed }) => {
    const xp = challengeXp(challenge.d, { firstTry, hintUsed, streak, replay });
    const before = levelFromXp(save.xp);
    const after = levelFromXp(save.xp + xp);
    awardXp(xp);
    if (after > before) {
      setLevelUps((l) => [...l, after]);
      sfx.levelup();
    }
    setEarned((e) => [...e, { label: `CH-${idx + 1}`, xp }]);
    setLastGain(xp);
    setStreak((s) => (firstTry ? s + 1 : 0));
    if (!firstTry) setMistakes((m) => m + 1);
    if (hintUsed && firstTry) setMistakes((m) => m + 1); // hint counts as a stumble for stars
    setClearedNow(true);
  };

  const next = () => {
    sfx.select();
    if (idx + 1 < mission.challenges.length) {
      setIdx((i) => i + 1);
      setClearedNow(false);
      setLastGain(null);
    } else {
      const bonus = replay ? Math.round(MISSION_BONUS * REPLAY_FACTOR) : MISSION_BONUS;
      const before = levelFromXp(save.xp);
      const after = levelFromXp(save.xp + bonus);
      awardXp(bonus);
      const finalLevelUps = after > before ? [...levelUps, after] : levelUps;
      const stars = missionStars(mistakes);
      onFinish({
        mission,
        earned,
        bonus,
        total: totalEarned + bonus,
        stars,
        mistakes,
        replay,
        levelUps: finalLevelUps,
      });
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">
      {/* run HUD */}
      <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button onClick={() => { sfx.select(); onAbort(); }} className="bb-btn bb-btn-ghost !min-h-0 !px-2.5 !py-1 text-[10px]">
          ◄ Abort
        </button>
        <div className="text-[10px] uppercase tracking-widest text-[var(--bb-muted)]">
          {mission.title}
        </div>
        <div className="ml-auto flex items-center gap-3 text-xs">
          {streak >= 2 && (
            <span className="anim-pop text-[var(--bb-amber)] bb-glow-amber">▲ STREAK ×{streak}</span>
          )}
          <span className="tabular-nums text-[var(--bb-green)]">+{totalEarned} XP</span>
        </div>
      </div>

      {/* progress dots */}
      <div className="mb-5 flex items-center gap-1.5">
        {mission.challenges.map((c, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 border border-[var(--bb-line)] transition-colors ${
              i < idx || (i === idx && clearedNow)
                ? 'bg-[var(--bb-green)]'
                : i === idx
                  ? 'bg-[rgba(0,244,142,0.25)]'
                  : 'bg-black/60'
            }`}
          />
        ))}
      </div>

      <div className="bb-panel anim-pop p-5 sm:p-6" key={engineKey}>
        <div className="mb-4 flex items-center gap-2 text-[10px] uppercase tracking-widest">
          <span className="text-[var(--bb-muted)]">
            Challenge {idx + 1}/{mission.challenges.length}
          </span>
          <span className={`border px-1.5 py-0.5 ${DIFF_COLOR[challenge.d]}`}>
            {DIFF_LABEL[challenge.d]}
          </span>
          <span className="text-[var(--bb-green-faint)]">
            {challenge.t === 'machine' ? '◈ LIVE MACHINE' : challenge.t === 'order' ? '◈ SEQUENCE' : '◈ SIGNAL'}
          </span>
        </div>

        <Engine challenge={challenge} onSolved={handleSolved} onMistake={() => {}} />

        {clearedNow && (
          <div className="anim-pop mt-5 flex items-center justify-between border-t border-[var(--bb-line)] pt-4">
            <span className="font-crt text-2xl text-[var(--bb-amber)] bb-glow-amber">
              +{lastGain} XP
            </span>
            <button onClick={next} className="bb-btn bb-btn-green">
              {idx + 1 < mission.challenges.length ? 'Next challenge ▶' : 'Complete mission ▶'}
            </button>
          </div>
        )}
      </div>

      <p className="mt-3 text-center text-[10px] text-[var(--bb-muted)]">
        Wrong answers cost the first-try bonus — but you can always retry. XP is banked instantly.
      </p>
    </div>
  );
}

// Mission debrief — XP breakdown, stars, level-ups, next objective
import { useEffect } from 'react';
import { nextMission } from '../data/missions/index.js';
import { useGame } from '../game/GameContext.jsx';
import { levelTitle } from '../game/progression.js';
import { sfx } from '../game/sfx.js';

export default function DebriefScreen({ result, onNext, onReplay, onMap }) {
  const { cleared, completeMission, skills } = useGame();
  const { mission, earned, bonus, total, stars, mistakes, replay, levelUps } = result;

  // record the clear once, on mount
  useEffect(() => {
    completeMission(mission.id, stars, mistakes);
    sfx.unlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const next = nextMission(mission.id, { ...cleared, [mission.id]: true });

  return (
    <div className="mx-auto max-w-xl px-4 pb-24 pt-10">
      <div className="bb-panel anim-pop p-6 text-center sm:p-8">
        <div className="text-[10px] uppercase tracking-widest text-[var(--bb-muted)]">
          Mission debrief
        </div>
        <h1 className="font-crt mt-1 text-5xl text-[var(--bb-green)] bb-glow">MISSION CLEAR</h1>
        <p className="mt-1 text-xs uppercase tracking-widest text-[var(--bb-muted)]">{mission.title}</p>

        {/* stars */}
        <div className="mt-4 font-crt text-4xl tracking-[0.3em]">
          {[1, 2, 3].map((i) => (
            <span
              key={i}
              className={`anim-pop inline-block ${i <= stars ? 'text-[var(--bb-amber)] bb-glow-amber' : 'text-[var(--bb-green-faint)]'}`}
              style={{ animationDelay: `${i * 220}ms` }}
            >
              ★
            </span>
          ))}
        </div>
        <p className="mt-1 text-[10px] text-[var(--bb-muted)]">
          {stars === 3 ? 'FLAWLESS — no stumbles' : mistakes > 0 ? `${mistakes} stumble${mistakes > 1 ? 's' : ''} (wrong first tries / hints)` : ''}
          {replay ? ' · replay rate ¼ XP' : ''}
        </p>

        {/* XP ledger */}
        <div className="mx-auto mt-6 max-w-xs text-left text-xs">
          {earned.map((e, i) => (
            <div key={i} className="flex justify-between border-b border-[var(--bb-line)] py-1.5">
              <span className="text-[var(--bb-muted)]">{e.label}</span>
              <span className="tabular-nums text-[var(--bb-green)]">+{e.xp} XP</span>
            </div>
          ))}
          <div className="flex justify-between border-b border-[var(--bb-line)] py-1.5">
            <span className="text-[var(--bb-muted)]">MISSION BONUS</span>
            <span className="tabular-nums text-[var(--bb-green)]">+{bonus} XP</span>
          </div>
          <div className="flex justify-between py-2 text-sm font-bold">
            <span className="text-[var(--bb-text)]">TOTAL</span>
            <span className="tabular-nums text-[var(--bb-amber)] bb-glow-amber">+{total} XP</span>
          </div>
        </div>

        {/* Skill Mastery & Spaced Review Section */}
        {mission.skill && (
          <div className="mx-auto mt-5 max-w-sm border border-[var(--bb-line)] bg-black/60 p-3 text-left">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-[var(--bb-muted)] mb-1.5">
              <span>DSA SKILL MASTERY</span>
              <span className="text-[var(--bb-amber)] font-bold">{mission.skill}</span>
            </div>
            {(() => {
              const skillRecord = skills[mission.skill];
              if (!skillRecord) return null;
              const mastery = skillRecord.masteryLevel || 'introduced';
              const daysLeft = skillRecord.reviewDue
                ? Math.max(1, Math.ceil((skillRecord.reviewDue - Date.now()) / (24 * 60 * 60 * 1000)))
                : 1;

              return (
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--bb-muted)]">Current Tier:</span>
                    <span className="font-bold uppercase tracking-wider text-[var(--bb-green)]">
                      {mastery}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--bb-muted)]">Independent Solves:</span>
                    <span className="tabular-nums text-zinc-300">
                      {skillRecord.successfulIndependentSolves}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-zinc-800 pt-1 text-[11px]">
                    <span className="text-[var(--bb-muted)]">Spaced Review Due:</span>
                    <span className="text-[var(--bb-amber)] font-mono">
                      In ~{daysLeft} {daysLeft === 1 ? 'day' : 'days'}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* level ups */}
        {levelUps.map((lv) => (
          <div key={lv} className="anim-pop mt-3 border border-[var(--bb-amber)] bg-[rgba(255,176,0,0.08)] px-3 py-2">
            <span className="font-crt text-2xl text-[var(--bb-amber)] bb-glow-amber">LEVEL UP → LV {lv}</span>
            <div className="text-[10px] uppercase tracking-widest text-[var(--bb-amber)]">{levelTitle(lv)}</div>
          </div>
        ))}

        <div className="mt-7 grid gap-2 sm:grid-cols-3">
          <button onClick={() => { sfx.select(); onReplay(); }} className="bb-btn bb-btn-ghost text-xs">
            ↺ Replay
          </button>
          <button onClick={() => { sfx.select(); onMap(); }} className="bb-btn bb-btn-ghost text-xs">
            Sector map
          </button>
          {next ? (
            <button onClick={() => { sfx.unlock(); onNext(next); }} className="bb-btn bb-btn-green text-xs">
              Next mission ▶
            </button>
          ) : (
            <button onClick={() => { sfx.levelup(); onMap(); }} className="bb-btn bb-btn-amber text-xs">
              ★ Game clear
            </button>
          )}
        </div>
        {next && (
          <p className="mt-3 text-[10px] uppercase tracking-widest text-[var(--bb-muted)]">
            Next objective: {next.title}
          </p>
        )}
      </div>
    </div>
  );
}

// World map — 14 sectors × 3 missions, linear campaign unlocks
import { TOPICS } from '../data/topics.js';
import { MISSIONS, missionsOfTopic, isUnlocked, isGameCleared, nextMission } from '../data/missions/index.js';
import { useGame } from '../game/GameContext.jsx';
import { sfx } from '../game/sfx.js';

function Stars({ n }) {
  return (
    <span className="text-[var(--bb-amber)]" aria-label={`${n} stars`}>
      {'★'.repeat(n)}
      <span className="text-[var(--bb-green-faint)]">{'★'.repeat(3 - n)}</span>
    </span>
  );
}

export default function MapScreen({ onSelect }) {
  const { cleared, clearedCount, totalStars, skills } = useGame();
  const won = isGameCleared(cleared);
  const next = nextMission(null, cleared) || nextMission(MISSIONS[0].id, cleared);

  const skillCount = Object.keys(skills).length;
  const reviewsDueCount = Object.values(skills).filter(
    (s) => s.reviewDue && Date.now() >= s.reviewDue
  ).length;

  const handleSelect = (mission) => {
    if (!isUnlocked(mission.id, cleared)) {
      sfx.wrong();
      return;
    }
    sfx.select();
    onSelect(mission);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6">
      {won && (
        <div className="bb-panel anim-pop mb-6 border-[var(--bb-amber)] p-4 text-center">
          <div className="font-crt text-3xl text-[var(--bb-amber)] bb-glow-amber">MAINFRAME CONQUERED</div>
          <p className="mt-1 text-xs text-[var(--bb-muted)]">
            All 42 missions cleared. Replay any mission to chase 3-star perfection.
          </p>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-crt text-4xl text-[var(--bb-green)] bb-glow">SECTOR MAP</h1>
          <p className="text-xs text-[var(--bb-muted)]">
            Clear a mission to unlock the next. Sectors open in sequence.
          </p>
        </div>
        <div className="flex items-center gap-4 text-right text-xs text-[var(--bb-muted)]">
          {skillCount > 0 && (
            <div>
              <span className="text-[var(--bb-green)] font-bold">{skillCount}</span> skill{skillCount > 1 ? 's' : ''} tracked
              {reviewsDueCount > 0 && (
                <div className="text-[10px] text-[var(--bb-amber)] anim-pulse-glow">
                  ● {reviewsDueCount} review due
                </div>
              )}
            </div>
          )}
          <div>
            <div>
              <span className="text-[var(--bb-green)]">{clearedCount}</span>/{MISSIONS.length} missions
            </div>
            <div>
              <span className="text-[var(--bb-amber)]">{totalStars}</span>/{MISSIONS.length * 3} ★
            </div>
          </div>
        </div>
      </div>

      {/* overall progress rail */}
      <div className="mb-8 h-1.5 w-full border border-[var(--bb-line)] bg-black/60">
        <div
          className="h-full bg-[var(--bb-green)] transition-all duration-700"
          style={{ width: `${(clearedCount / MISSIONS.length) * 100}%` }}
        />
      </div>

      <div className="space-y-3">
        {TOPICS.map((topic, ti) => {
          const missions = missionsOfTopic(topic.id);
          const done = missions.filter((m) => cleared[m.id]).length;
          const sectorOpen = isUnlocked(missions[0].id, cleared);
          const isNextSector = next && missions.some((m) => m.id === next.id);

          return (
            <section
              key={topic.id}
              className={`bb-panel anim-rise p-4 transition-opacity ${sectorOpen ? '' : 'opacity-45'}`}
              style={{ animationDelay: `${Math.min(ti * 40, 400)}ms` }}
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex items-center gap-3">
                  <span className="font-crt w-12 text-center text-xl text-[var(--bb-green-dim)]">
                    {topic.glyph}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[var(--bb-muted)]">SEC-{topic.sec}</span>
                      <h2 className="font-crt text-2xl leading-none text-[var(--bb-text)]">
                        {topic.name}
                      </h2>
                      {isNextSector && (
                        <span className="anim-blink text-[10px] uppercase tracking-widest text-[var(--bb-amber)]">
                          ◄ objective
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--bb-muted)]">{topic.tag}</p>
                  </div>
                </div>

                <div className="ml-auto flex items-center gap-2">
                  {missions.map((m) => {
                    const rec = cleared[m.id];
                    const open = isUnlocked(m.id, cleared);
                    const boss = m.kind === 'boss';
                    return (
                      <button
                        key={m.id}
                        onClick={() => handleSelect(m)}
                        disabled={!open}
                        title={open ? m.title : 'Clear the previous mission to unlock'}
                        className={[
                          'flex min-h-[44px] w-[92px] flex-col items-center justify-center border px-1 py-1.5 transition-all sm:w-[110px]',
                          rec
                            ? 'border-[var(--bb-green-dim)] bg-[rgba(0,244,142,0.07)] text-[var(--bb-green)]'
                            : open
                              ? boss
                                ? 'border-[var(--bb-amber)] text-[var(--bb-amber)] anim-pulse-glow'
                                : 'border-[var(--bb-green)] text-[var(--bb-green)] anim-pulse-glow'
                              : 'border-[var(--bb-line)] text-[var(--bb-green-faint)]',
                        ].join(' ')}
                      >
                        <span className="text-[9px] uppercase tracking-wider">
                          {boss ? '◆ BOSS' : `M-${m.id.split('-')[1]}`}
                        </span>
                        <span className="w-full truncate text-center text-[10px] leading-tight">
                          {open ? m.title : 'LOCKED'}
                        </span>
                        <span className="text-[10px] leading-none">
                          {rec ? <Stars n={rec.stars} /> : open ? 'READY' : '▦▦▦'}
                        </span>
                        {m.skill && skills[m.skill] && (
                          <span className="mt-0.5 text-[8px] uppercase tracking-wider text-[var(--bb-amber)] font-mono">
                            {skills[m.skill].masteryLevel}
                          </span>
                        )}
                      </button>
                    );
                  })}
                  <span className="ml-1 w-10 text-right text-[10px] tabular-nums text-[var(--bb-muted)]">
                    {done}/{missions.length}
                  </span>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

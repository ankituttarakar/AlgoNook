// Mission briefing — story, intel (teaching), objectives, deploy
import Type from '../components/Type.jsx';
import { TOPIC_MAP } from '../data/topics.js';
import { useGame } from '../game/GameContext.jsx';
import { sfx } from '../game/sfx.js';

const DIFF_LABEL = { easy: 'EZ', med: 'MED', hard: 'HRD' };
const DIFF_COLOR = {
  easy: 'text-[var(--bb-green)]',
  med: 'text-[var(--bb-amber)]',
  hard: 'text-[var(--bb-red)]',
};

export default function BriefScreen({ mission, onDeploy, onBack }) {
  const { cleared } = useGame();
  const topic = TOPIC_MAP[mission.topic];
  const replay = !!cleared[mission.id];

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-8">
      <button onClick={() => { sfx.select(); onBack(); }} className="bb-btn bb-btn-ghost mb-6 text-xs">
        ◄ Sector Map
      </button>

      <div className="bb-panel anim-pop p-5 sm:p-7">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--bb-muted)]">
          <span>SEC-{topic.sec} · {topic.name}</span>
          {mission.kind === 'boss' && (
            <span className="border border-[var(--bb-amber)] px-1.5 py-0.5 text-[var(--bb-amber)]">SECTOR BOSS</span>
          )}
          {replay && (
            <span className="border border-[var(--bb-line)] px-1.5 py-0.5">REPLAY · ¼ XP</span>
          )}
        </div>

        <h1 className="font-crt mt-2 text-4xl text-[var(--bb-green)] bb-glow sm:text-5xl">
          {mission.title}
        </h1>

        <p className="mt-4 min-h-[3.5rem] text-sm leading-relaxed text-[var(--bb-text)]">
          <Type text={mission.brief} speed={12} />
        </p>

        <div className="mt-5 border-t border-[var(--bb-line)] pt-4">
          <div className="mb-2 text-[10px] uppercase tracking-widest text-[var(--bb-amber)]">
            ▚ Intel decrypt
          </div>
          <ul className="space-y-1.5 text-xs leading-relaxed text-[var(--bb-muted)]">
            {mission.intel.map((line, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-[var(--bb-green-dim)]">▸</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[var(--bb-line)] pt-4 text-xs">
          <span className="text-[var(--bb-muted)]">OBJECTIVES:</span>
          {mission.learningFlow ? (
            <span className="border border-[var(--bb-green)] text-[var(--bb-green)] px-2 py-1">
              FULL LEARNING LOOP · 7 ACTIVE STAGES
            </span>
          ) : (
            (mission.challenges || []).map((c, i) => (
              <span key={i} className={`border border-[var(--bb-line)] px-2 py-1 ${DIFF_COLOR[c.d]}`}>
                {i + 1}·{DIFF_LABEL[c.d]}
              </span>
            ))
          )}
        </div>

        <button
          onClick={() => { sfx.unlock(); onDeploy(); }}
          className="bb-btn bb-btn-green anim-pulse-glow mt-6 w-full"
        >
          ▶ Deploy — {mission.learningFlow ? 'Mastery Learning Mission' : `${mission.challenges?.length || 3} challenges`}
        </button>
      </div>
    </div>
  );
}

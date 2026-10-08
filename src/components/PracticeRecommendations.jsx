import { FloatingPanel } from './PageScene.jsx';
import { sfx } from '../game/sfx.js';

export default function PracticeRecommendations({ recommendations = [], onLaunch, title = 'Practice for you', compact = false }) {
  if (!recommendations.length) return null;
  const groups = recommendations.reduce((result, item) => {
    (result[item.section] ||= []).push(item);
    return result;
  }, {});

  return (
    <section className="space-y-4" aria-label={title}>
      {!compact && <header><p className="scene-eyebrow">ADAPTIVE TRAINING / SAVED LEARNING RECORD</p><h2 className="text-xl font-semibold text-[var(--bb-text)]">{title}</h2></header>}
      {Object.entries(groups).map(([section, items]) => (
        <div key={section}>
          <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--bb-muted)]">{section}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((item) => (
              <FloatingPanel key={item.id} as="article" className="practice-recommendation-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><p className="scene-eyebrow">{item.chapter} · {item.mastery}</p><h4 className="mt-1 text-base font-semibold capitalize text-[var(--bb-text)]">{item.title}</h4></div>
                  <span aria-hidden="true" className="font-mono text-lg text-[var(--bb-green)]">{item.due ? '↻' : item.section === 'KEEP SHARP' ? '✦' : '◇'}</span>
                </div>
                <p className="mt-2 text-xs text-[var(--bb-muted)]">{item.reason}</p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--bb-line)] pt-3">
                  <span className="text-[10px] text-[var(--bb-muted)]">NEXT · {item.activity.label}</span>
                  <button className="bb-btn bb-btn-ghost !min-h-0 !px-3 !py-1.5 text-[10px]" onClick={() => { sfx.select(); onLaunch(item); }}>Start →</button>
                </div>
              </FloatingPanel>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

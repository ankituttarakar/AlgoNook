import { FloatingPanel } from '../components/PageScene.jsx';
import PracticeRecommendations from '../components/PracticeRecommendations.jsx';

export default function PracticeHubScreen({ recommendations, onLaunch, onChooseChapter }) {
  const groups = ['REVIEW NOW', 'YOU STRUGGLED WITH', 'PRACTICE NEXT', 'KEEP SHARP'];
  return <main className="practice-hub scene-page-width">
    <header className="arena-heading"><p className="scene-eyebrow">ALGO NOOK / TRAINING DECK</p><h1>Practice<br /><em>for what’s next.</em></h1><p>Your training queue is ranked from saved mastery, recent clears, mistakes, hint use, and review timing. Each recommendation opens an existing learning activity.</p>{recommendations.length > 0 && <button className="bb-btn bb-btn-ghost mt-4 text-xs" onClick={onChooseChapter}>Choose a chapter →</button>}</header>
    <div className="practice-hub-orbit" aria-hidden="true"><span>↻</span></div>
    {recommendations.length ? <div className="practice-hub-groups">{groups.map((group) => {
      const items = recommendations.filter((item) => item.section === group);
      if (!items.length) return null;
      return <section key={group} aria-label={group}><p className="scene-eyebrow">{group}</p><PracticeRecommendations recommendations={items} onLaunch={onLaunch} title={group === 'REVIEW NOW' ? 'Due to revisit' : group === 'YOU STRUGGLED WITH' ? 'Turn friction into fluency' : group === 'KEEP SHARP' ? 'Retained skills' : 'Build the next skill'} /></section>;
    })}</div> : <FloatingPanel as="section" className="practice-hub-empty"><p className="scene-eyebrow">TRAINING QUEUE EMPTY</p><h2>Start a chapter to build your first learning signals.</h2><p>Recommendations appear after saved learning activity. Nothing is randomized or pre-filled as completed.</p><button className="bb-btn bb-btn-green mt-4 text-xs" onClick={onChooseChapter}>Choose a chapter →</button></FloatingPanel>}
  </main>;
}

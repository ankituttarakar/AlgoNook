import { useGame } from '../game/GameContext.jsx';
import { FloatingPanel } from '../components/PageScene.jsx';
import { ROADMAP_NODES, computeNodeState } from '../data/roadmap.js';
import { sfx } from '../game/sfx.js';

export default function PracticeChapterPickerScreen({ onPractice, onLearn, onBack }) {
  const { cleared, skills, topics } = useGame();
  return <main className="chapter-picker scene-page-width">
    <button className="scene-back-link" onClick={onBack}>← Back to Practice</button>
    <header className="arena-heading"><p className="scene-eyebrow">ALGO NOOK / TRAINING DECK</p><h1>Choose a<br /><em>chapter.</em></h1><p>Choose an unlocked chapter to open its registered knowledge checks. Locked chapters show the prerequisite route.</p></header>
    <div className="chapter-picker-grid">{ROADMAP_NODES.map((node, index) => {
      const status = computeNodeState(node.id, cleared, skills, topics);
      const locked = status === 'LOCKED';
      return <FloatingPanel as="article" key={node.id} className={`chapter-picker-card ${locked ? 'is-locked' : ''}`}>
        <div className="chapter-picker-meta"><span>CHAPTER {String(index + 1).padStart(2, '0')}</span><b>{status.replaceAll('_', ' ')}</b></div>
        <div className="chapter-picker-title"><span aria-hidden="true">{node.icon}</span><div><h2>{node.label}</h2><p>{node.subtitle}</p></div></div>
        <button disabled={locked} className="bb-btn bb-btn-green mt-4 text-xs" onClick={() => { sfx.select(); onPractice(node); }}>{locked ? 'Locked by prerequisites' : `Practice ${node.label} →`}</button>
        {locked && <button className="chapter-picker-learn" onClick={() => { sfx.select(); onLearn(node); }}>Open chapter to learn prerequisites →</button>}
      </FloatingPanel>;
    })}</div>
  </main>;
}

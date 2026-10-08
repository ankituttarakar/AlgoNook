import { useGame } from '../game/GameContext.jsx';
import { FloatingPanel } from '../components/PageScene.jsx';

export default function LeaderboardScreen({ onBack, onProfile }) {
  const { save, level, title } = useGame();
  return <main className="arena-room scene-page-width leaderboard-room">
    <button className="scene-back-link" onClick={onBack}>← Learning world</button>
    <header className="arena-heading"><p className="scene-eyebrow">ALGO NOOK / COMPETITION ARENA</p><h1>Standings<br /><em>in the making.</em></h1><p>Your account progression is available here. A competitive ranking needs shared leaderboard data, which this build does not yet provide.</p></header>
    <div className="arena-stage" aria-hidden="true"><i /><i /><i /><span>♜</span></div>
    <FloatingPanel as="section" className="arena-player-record"><div><small>YOUR SAVED RECORD</small><strong>{save.xp || 0} XP</strong><span>Level {level} · {title}</span></div><button className="bb-btn bb-btn-ghost text-xs" onClick={onProfile}>Open player profile →</button></FloatingPanel>
    <FloatingPanel as="section" className="leaderboard-empty"><p className="scene-eyebrow">GLOBAL STANDINGS</p><h2>Competition data is not connected</h2><p>No player ranking is shown until a shared leaderboard source is available. Your XP and rank above come from your persisted account progress.</p></FloatingPanel>
  </main>;
}

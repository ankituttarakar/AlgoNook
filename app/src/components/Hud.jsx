import { useGame } from '../game/GameContext.jsx';
import { sfx } from '../game/sfx.js';
import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/react';

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: '⌂' },
  { id: 'roadmap', label: 'Learn', icon: '◎' },
  { id: 'guidebook', label: 'Notes', icon: '≡' },
  { id: 'challenges', label: 'Challenges', icon: '✳' },
  { id: 'practice', label: 'Practice', icon: '⌘' },
  { id: 'arena', label: 'Arena', icon: '♜' },
  { id: 'leaderboard', label: 'Leaderboard', icon: '▤' },
  { id: 'review', label: 'Review', icon: '↻' },
];

export default function Hud({ location, onNavigate }) {
  const { save, level, levelInfo, toggleSound } = useGame();
  const pct = Math.min(100, Math.round((levelInfo.into / levelInfo.span) * 100));
  const active = location === 'Review & Mastery' ? 'review' : ['Practice', 'Adaptive Training Room', 'Choose a Practice Chapter'].includes(location) ? 'practice' : location === 'Competition Arena' ? 'leaderboard' : location === 'Battlefield Arena' ? 'arena' : location === 'Challenge Area' ? 'challenges' : location === 'Learning Roadmap' ? 'roadmap' : location === 'Player Headquarters' ? 'home' : location === 'DSA Guidebook' ? 'guidebook' : ['Arrays Game Lab', 'Set Memory Sprint', 'Frequency Map Builder', 'Pointer Movement Game', 'Mission Brief', 'Results'].includes(location) || location?.endsWith('Reasoning Lab') ? 'challenges' : 'roadmap';

  return (
    <header className="app-header">
      <div className="app-header-main">
        <button onClick={() => onNavigate?.('home')} className="brand-lockup" aria-label="AlgoNook home"><span className="brand-symbol">a<span>n</span></span><span>AlgoNook<small>LEARN BY DOING</small></span></button>
        {location && <span className="header-location">/ {location}</span>}
        <div className="header-spacer" />
        <div className="header-progress"><span>LV {level} <i>·</i> {levelInfo.into}/{levelInfo.span} XP</span><div><i style={{ width: `${pct}%` }} /></div></div>
        <span className="hud-callsign" data-testid="hud-callsign">{save.callsign}</span>
        <Show when="signed-out"><div className="auth-actions"><SignInButton mode="modal"><button className="nav-auth">Sign in</button></SignInButton><SignUpButton mode="modal"><button className="nav-join">Join free <span>↗</span></button></SignUpButton></div></Show>
        <Show when="signed-in"><div className="profile-menu"><button className="profile-portal" onClick={() => onNavigate?.('profile')} aria-label="Open player profile"><span aria-hidden="true">◉</span><b>PROFILE</b></button><UserButton appearance={{ elements: { userButtonAvatarBox: 'w-8 h-8 border border-[var(--bb-green-dim)]' } }} /></div></Show>
      </div>
      <nav className="primary-nav" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => <button key={item.id} className={`primary-nav-item ${active === item.id ? 'is-active' : ''}`} aria-current={active === item.id ? 'page' : undefined} onClick={() => { sfx.select(); onNavigate?.(item.id); }}><span aria-hidden="true">{item.icon}</span>{item.label}</button>)}
        <button onClick={() => { toggleSound(); sfx.select(); }} className="sound-button" aria-label={save.sound ? 'Turn sound off' : 'Turn sound on'} title={save.sound ? 'Sound on' : 'Sound off'}>{save.sound ? '♫' : '♫̸'}</button>
      </nav>
    </header>
  );
}

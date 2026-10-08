import { useUser } from '@clerk/react';
import { useGame } from '../game/GameContext.jsx';
import { FloatingPanel } from '../components/PageScene.jsx';
import { isSkillReviewDue, MASTERY_LEVELS } from '../game/mastery.js';
import { MISSION_MAP } from '../data/missions/index.js';
import { getCompletedChapterCount } from '../game/recommendations.js';

const MASTERED = new Set(['independent', 'retained']);

export default function ProfileScreen({ onBack, onReview }) {
  const { user } = useUser();
  const { save, level, title, skills, cleared } = useGame();
  const skillRecords = Object.values(skills || {});
  const masteredSkills = skillRecords.filter((item) => MASTERED.has(item.masteryLevel)).length;
  const dueSkills = skillRecords.filter(isSkillReviewDue).length;
  const clearedMissions = Object.values(cleared || {}).filter(Boolean).length;
  const earnedStars = Object.values(cleared || {}).reduce((sum, record) => sum + (Number(record?.stars) || 0), 0);
  const completedChapters = getCompletedChapterCount(save);
  const codingSolved = Object.entries(cleared || {}).filter(([id, record]) => !!record && MISSION_MAP[id]?.problemFlow).length;
  const displayName = user?.fullName || user?.username || save.callsign || 'Learner';
  const masteryRank = (record) => MASTERY_LEVELS.indexOf(record?.masteryLevel || 'introduced');
  const strongest = Object.entries(skills || {}).filter(([, record]) => ['independent', 'retained'].includes(record.masteryLevel))
    .sort((a, b) => masteryRank(b[1]) - masteryRank(a[1]) || (b[1].successfulIndependentSolves || 0) - (a[1].successfulIndependentSolves || 0)).slice(0, 3);
  const needsWork = Object.entries(skills || {}).filter(([, record]) => ['introduced', 'guided', 'practicing'].includes(record.masteryLevel))
    .sort((a, b) => masteryRank(a[1]) - masteryRank(b[1]) || (b[1].attempts || 0) - (a[1].attempts || 0)).slice(0, 3);
  const recentActivity = [
    ...Object.entries(cleared || {}).filter(([id, record]) => record?.clearedAt && MISSION_MAP[id]).map(([id, record]) => ({ label: `${MISSION_MAP[id].title} cleared`, time: Number(record.clearedAt) })),
    ...Object.entries(skills || {}).filter(([, record]) => record?.lastPracticed).map(([id, record]) => ({ label: `${id.replaceAll('-', ' ')} practiced`, time: Number(record.lastPracticed) })),
  ].sort((a, b) => b.time - a.time).slice(0, 5);

  return (
    <main className="profile-room scene-page-width">
      <button className="scene-back-link" onClick={onBack}>← Learning world</button>
      <FloatingPanel as="section" className="profile-identity">
        <div className="profile-avatar" aria-hidden="true">{user?.imageUrl ? <img src={user.imageUrl} alt="" /> : (save.callsign || 'AN').slice(0, 2)}</div>
        <div className="profile-copy"><p className="scene-eyebrow">PLAYER ARCHIVE / VERIFIED ACCOUNT</p><h1>{displayName}</h1><p>Callsign <strong>{save.callsign || 'Not set'}</strong>{user?.primaryEmailAddress?.emailAddress ? ` · ${user.primaryEmailAddress.emailAddress}` : ''}</p></div>
        <div className="profile-rank"><small>CURRENT RANK</small><strong>{title}</strong><span>LEVEL {level}</span></div>
      </FloatingPanel>

      <section className="profile-stat-grid" aria-label="Learning record">
        <FloatingPanel className="profile-stat-card"><small>EXPERIENCE</small><strong>{save.xp || 0}<i> XP</i></strong><span>Earned through learning activity</span></FloatingPanel>
        <FloatingPanel className="profile-stat-card"><small>SKILLS MASTERED</small><strong>{masteredSkills}</strong><span>Independent or retained mastery</span></FloatingPanel>
        <FloatingPanel className="profile-stat-card"><small>CHAPTERS COMPLETE</small><strong>{completedChapters}</strong><span>All persisted chapter stages and challenges</span></FloatingPanel>
        <FloatingPanel className="profile-stat-card"><small>CODING CLEARS</small><strong>{codingSolved}</strong><span>Registered coding missions passed</span></FloatingPanel>
        <FloatingPanel className="profile-stat-card"><small>MISSIONS CLEARED</small><strong>{clearedMissions}</strong><span>Saved completed mission records</span></FloatingPanel>
        <FloatingPanel className="profile-stat-card"><small>STARS EARNED</small><strong>{earnedStars}</strong><span>Stars recorded on cleared missions</span></FloatingPanel>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2" aria-label="Skill summary">
        <FloatingPanel as="section" className="p-5"><p className="scene-eyebrow">STRONGEST SKILLS</p><h2 className="mb-3 text-lg font-semibold">Proven independently</h2>{strongest.length ? <ul className="space-y-2">{strongest.map(([skillId, record]) => <li key={skillId} className="flex items-center justify-between gap-3 border-b border-[var(--bb-line)] pb-2 text-sm"><span className="capitalize">{skillId.replaceAll('-', ' ')}</span><span className="text-xs uppercase text-[var(--bb-green)]">{record.masteryLevel}</span></li>)}</ul> : <p className="text-xs text-[var(--bb-muted)]">No independent or retained skill records yet.</p>}</FloatingPanel>
        <FloatingPanel as="section" className="p-5"><p className="scene-eyebrow">NEEDS PRACTICE</p><h2 className="mb-3 text-lg font-semibold">Skills still building</h2>{needsWork.length ? <ul className="space-y-2">{needsWork.map(([skillId, record]) => <li key={skillId} className="flex items-center justify-between gap-3 border-b border-[var(--bb-line)] pb-2 text-sm"><span className="capitalize">{skillId.replaceAll('-', ' ')}</span><span className="text-xs uppercase text-[var(--bb-amber)]">{record.masteryLevel}</span></li>)}</ul> : <p className="text-xs text-[var(--bb-muted)]">No developing skill records right now.</p>}</FloatingPanel>
      </section>

      <FloatingPanel as="section" className="mt-6 p-5"><p className="scene-eyebrow">RECENT LEARNING ACTIVITY</p><h2 className="mb-3 text-lg font-semibold">Latest saved proof</h2>{recentActivity.length ? <ul className="grid gap-2 sm:grid-cols-2">{recentActivity.map((item, index) => <li key={`${item.label}-${index}`} className="flex items-center justify-between gap-3 text-xs"><span className="capitalize text-[var(--bb-text)]">{item.label}</span><time className="shrink-0 text-[var(--bb-muted)]" dateTime={new Date(item.time).toISOString()}>{new Date(item.time).toLocaleDateString()}</time></li>)}</ul> : <p className="text-xs text-[var(--bb-muted)]">Learning activity will appear after the first saved practice session.</p>}</FloatingPanel>

      <FloatingPanel as="section" className="profile-review-panel">
        <div><p className="scene-eyebrow">NEXT TRAINING WINDOW</p><h2>{dueSkills ? `${dueSkills} skill${dueSkills === 1 ? '' : 's'} ready for review` : 'Your review queue is clear'}</h2><p>Practice intervals and mastery are based on your saved learning record.</p></div>
        <button className="bb-btn bb-btn-green" onClick={onReview}>Enter review room →</button>
      </FloatingPanel>
    </main>
  );
}

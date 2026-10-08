import { useMemo } from 'react';
import { useGame } from '../game/GameContext.jsx';
import { isSkillReviewDue } from '../game/mastery.js';
import { ROADMAP_NODES } from '../data/roadmap.js';
import { MISSION_MAP, missionsOfTopic } from '../data/missions/index.js';
import PracticeRecommendations from '../components/PracticeRecommendations.jsx';

export default function HomeScreen({ onRoadmap, onPractice, onReview, onGuidebook, onContinueNode, recommendations = [], onLaunchRecommendation }) {
  const { save, cleared, skills, topics, level, levelInfo, title } = useGame();
  const reviewCount = Object.values(skills || {}).filter(isSkillReviewDue).length;
  const masteredCount = Object.values(skills || {}).filter((skill) => ['independent', 'retained'].includes(skill.masteryLevel)).length;
  const currentNode = ROADMAP_NODES.find((node) => {
    const stageMap = topics?.[node.id]?.stages || {};
    const missions = (node.missionTopics || (node.topicId ? [node.topicId] : [])).flatMap(missionsOfTopic);
    return node.learningStages?.some((stage) => stage === 'problems'
      ? missions.length > 0 && !missions.every((mission) => !!cleared?.[mission.id])
      : !stageMap[stage === 'patterns' ? 'pattern' : stage]);
  }) || ROADMAP_NODES[0];
  const clearedMissions = useMemo(() => Object.entries(cleared || {}).filter(([, record]) => !!record)
    .map(([id, record]) => ({ mission: MISSION_MAP[id], record }))
    .filter((item) => item.mission)
    .sort((a, b) => (Number(b.record?.clearedAt) || 0) - (Number(a.record?.clearedAt) || 0))
    .slice(0, 3), [cleared]);
  const xpPercent = Math.min(100, Math.round((levelInfo.into / levelInfo.span) * 100));

  return <main className="home-hub-shell">
    <section className="home-hub-hero floating-panel">
      <div><p className="eyebrow">PLAYER HEADQUARTERS / LEVEL {String(level).padStart(2, '0')}</p><h1>Welcome back,<br /><em>{save.callsign || 'learner'}.</em></h1><p>Your next step is ready in the algorithm world. Learn one idea, prove it with a trace, then carry it into a problem.</p>
        <div className="home-hub-actions"><button className="bb-btn bb-btn-green" onClick={() => onContinueNode(currentNode)}>Continue {currentNode.label} →</button><button className="bb-btn bb-btn-ghost" onClick={onRoadmap}>View roadmap</button></div>
      </div>
      <div className="home-level-panel"><span className="home-level-orb">{String(level).padStart(2, '0')}</span><small>{title}</small><strong>{save.xp || 0} XP</strong><i><b style={{ width: `${xpPercent}%` }} /></i><small>{levelInfo.into} / {levelInfo.span} XP to next level</small></div>
    </section>
    <section className="home-hub-stats" aria-label="Learning snapshot">
      <article><small>MISSIONS CLEARED</small><strong>{Object.keys(cleared || {}).filter((id) => MISSION_MAP[id] && cleared[id]).length}</strong><span>Recorded in your learning history</span></article>
      <article><small>SKILLS MASTERED</small><strong>{masteredCount}</strong><span>Independent or retained mastery</span></article>
      <article className={reviewCount ? 'has-review' : ''}><small>READY TO REVIEW</small><strong>{reviewCount}</strong><span>{reviewCount ? 'Retrieve these while they are due' : 'No saved skills are due right now'}</span></article>
    </section>
    {!!recommendations.length && <div className="home-recommendations"><PracticeRecommendations recommendations={recommendations} onLaunch={onLaunchRecommendation} title="Practice for you" /></div>}
    <div className="home-hub-grid">
      <section className="home-hub-card home-next-card"><p className="eyebrow">NEXT CHAPTER</p><span className="home-next-icon">{currentNode.icon}</span><h2>{currentNode.label}</h2><p>{currentNode.subtitle}</p><button onClick={() => onContinueNode(currentNode)}>Enter chapter room →</button></section>
      <section className="home-hub-card"><p className="eyebrow">TRAINING ROUTE</p><h2>Practice with purpose</h2><p>Use your saved mastery and review schedule to choose a deliberate practice session.</p><button onClick={onPractice}>Open practice →</button></section>
      <section className="home-hub-card"><p className="eyebrow">FIELD NOTES</p><h2>Revise a pattern</h2><p>Definitions, recognition clues, complexity, implementation sketches, and common mistakes.</p><button onClick={onGuidebook}>Open guidebook →</button></section>
    </div>
    <section className="home-recent"><div><p className="eyebrow">RECENT PROOF</p><h2>Your cleared missions</h2></div><button onClick={onReview}>Review skill history →</button>
      {clearedMissions.length ? <ul>{clearedMissions.map(({ mission, record }) => <li key={mission.id}><span className="home-proof-check">✓</span><span><strong>{mission.title}</strong><small>{mission.topic} · {record?.stars ? `${record.stars} stars` : 'cleared'}</small></span></li>)}</ul> : <p className="home-recent-empty">Cleared missions will appear here as you demonstrate your learning.</p>}
    </section>
  </main>;
}

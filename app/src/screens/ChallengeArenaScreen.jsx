import { useMemo, useState } from 'react';
import { useGame } from '../game/GameContext.jsx';
import { getPracticeRecommendations } from '../game/recommendations.js';
import { FloatingPanel } from '../components/PageScene.jsx';
import { MISSION_MAP } from '../data/missions/index.js';
import { CODING_CHALLENGES, filterCodingChallenges, getChallengeStatus } from '../data/challengeCatalogue.js';
import { TOPIC_MAP } from '../data/topics.js';
import { ROADMAP_NODES } from '../data/roadmap.js';

function BattleCard({ mission, status, skills, onStartMission, onOpenPrerequisite, onChooseChapter }) {
  const record = skills[mission.skill];
  const nextPrerequisite = status.prerequisites[0];
  const openPrerequisite = () => {
    if (nextPrerequisite?.kind === 'mission') {
      const mission = MISSION_MAP[nextPrerequisite.id];
      const node = mission && ROADMAP_NODES.find((item) => item.id === mission.roadmapNodeId)
        || mission && ROADMAP_NODES.find((item) => item.id === mission.chapter)
        || mission && ROADMAP_NODES.find((item) => item.topicId === mission.topic || item.missionTopics?.includes(mission.topic));
      if (node) onOpenPrerequisite(node.id);
      else onChooseChapter();
    } else if (nextPrerequisite?.kind === 'chapter') onOpenPrerequisite(nextPrerequisite.id);
    else onChooseChapter();
  };
  return <FloatingPanel as="article" key={mission.id} className={`arena-battle-card ${status.status === 'locked' ? 'is-locked' : ''}`}>
    <div className="arena-battle-meta"><span>{TOPIC_MAP[mission.topic]?.name || mission.topic}</span><span>{mission.problemFlow.difficulty}</span></div>
    <h3>{mission.problemFlow.title}</h3><p>{mission.brief}</p>
    <div className="arena-battle-status"><span>{record?.masteryLevel ? `Mastery · ${record.masteryLevel}` : 'Mastery · not yet recorded'}</span><b>{status.status === 'available' ? 'READY' : 'LOCKED'}</b></div>
    {status.status === 'available'
      ? <button className="bb-btn bb-btn-green mt-4 text-xs" onClick={() => onStartMission(mission)}>Enter coding lab →</button>
      : <div className="mt-3"><p className="text-xs text-[var(--bb-muted)]">{nextPrerequisite
        ? `Complete these prerequisites to unlock this challenge: ${status.prerequisites.map((item) => item.label).join(', ')}.`
        : 'Complete the roadmap prerequisites for this challenge.'}</p><button className="bb-btn bb-btn-ghost mt-3 text-xs" onClick={openPrerequisite}>Continue prerequisite →</button></div>}
  </FloatingPanel>;
}

export default function ChallengeArenaScreen({ onBack, onStartMission, onChooseChapter, onOpenPrerequisite = onChooseChapter }) {
  const { save, cleared, skills, topics } = useGame();
  const [topicFilter, setTopicFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const progress = { cleared, skills, topics };
  const recommendations = useMemo(() => getPracticeRecommendations(save, { limit: 20 }), [save]);
  const recommendation = recommendations.find((item) => item.activity.type === 'coding');
  const filters = { topic: topicFilter, difficulty: difficultyFilter };
  const filteredCatalogue = useMemo(() => filterCodingChallenges(CODING_CHALLENGES, filters), [topicFilter, difficultyFilter]);
  const statuses = useMemo(() => filteredCatalogue.map((mission) => {
    const eligibility = getChallengeStatus(mission, progress);
    return { mission, eligibility };
  }), [filteredCatalogue, cleared, skills, topics]);
  const available = statuses.filter(({ eligibility }) => eligibility.status === 'available');
  const locked = statuses.filter(({ eligibility }) => eligibility.status === 'locked');
  const completed = statuses.filter(({ eligibility }) => eligibility.status === 'cleared');
  const topicsAvailable = [...new Set(CODING_CHALLENGES.map((mission) => mission.topic))];
  const levelsAvailable = [...new Set(CODING_CHALLENGES.map((mission) => mission.problemFlow.difficulty))];
  const currentMission = recommendation?.activity.mission && available.find(({ mission }) => mission.id === recommendation.activity.mission.id)?.mission;

  return <main className="arena-room scene-page-width challenge-arena-room">
    <button className="scene-back-link" onClick={onBack}>← Learning world</button>
    <header className="arena-heading"><p className="scene-eyebrow">ALGO NOOK / CHALLENGE AREA</p><h1>Choose your<br /><em>challenge.</em></h1><p>Browse real coding challenges unlocked by your saved roadmap progress. Every launch uses the existing authenticated coding lab and server-verified tests.</p></header>
    <div className="arena-stage" aria-hidden="true"><i /><i /><i /><span>✳</span></div>
    {currentMission && <FloatingPanel as="section" className="arena-current-battle" aria-label="Recommended coding challenge">
      <div><p className="scene-eyebrow">RECOMMENDED CODING CHALLENGE · FROM YOUR SAVED RECORD</p><h2>{currentMission.problemFlow.title}</h2><p>{recommendation.reason}</p></div><button className="bb-btn bb-btn-green mt-4 text-xs" onClick={() => onStartMission(currentMission)}>Enter coding lab →</button>
    </FloatingPanel>}
    <section className="mt-6" aria-label="Coding challenges">
      <div className="arena-section-heading"><div><p className="scene-eyebrow">CHALLENGE CATALOGUE</p><h2>Choose your challenge</h2></div><span>{available.length} READY · {locked.length} LOCKED · {completed.length} CLEARED</span></div>
      <div className="arena-filters"><label>Topic <select aria-label="Filter challenges by topic" value={topicFilter} onChange={(event) => setTopicFilter(event.target.value)}><option value="all">All topics</option>{topicsAvailable.map((topic) => <option key={topic} value={topic}>{TOPIC_MAP[topic]?.name || topic}</option>)}</select></label><label>Difficulty <select aria-label="Filter challenges by difficulty" value={difficultyFilter} onChange={(event) => setDifficultyFilter(event.target.value)}><option value="all">All levels</option>{levelsAvailable.map((level) => <option key={level} value={level}>{level}</option>)}</select></label></div>
      {available.length > 0 && <div className="arena-battle-grid">{available.map(({ mission, eligibility }) => <BattleCard key={mission.id} mission={mission} status={eligibility} skills={skills} onStartMission={onStartMission} onOpenPrerequisite={onOpenPrerequisite} onChooseChapter={onChooseChapter} />)}</div>}
      {available.length === 0 && locked.length === 0 && <FloatingPanel as="div" className="arena-empty-state"><span className="arena-emblem" aria-hidden="true">⌁</span><div><p className="scene-eyebrow">NO CHALLENGES MATCH</p><h2>{CODING_CHALLENGES.length ? 'No challenges match these filters.' : 'No coding challenges are registered yet.'}</h2><p>{CODING_CHALLENGES.length ? 'Try another topic or difficulty.' : 'The coding challenge catalogue is currently empty.'}</p></div></FloatingPanel>}
      {locked.length > 0 && <section className="mt-7" aria-label="Locked coding challenges"><div className="arena-section-heading"><div><p className="scene-eyebrow">ROADMAP PREREQUISITES</p><h2>Challenges to unlock</h2></div><span>{locked.length} LOCKED</span></div><div className="arena-battle-grid">{locked.map(({ mission, eligibility }) => <BattleCard key={mission.id} mission={mission} status={eligibility} skills={skills} onStartMission={onStartMission} onOpenPrerequisite={onOpenPrerequisite} onChooseChapter={onChooseChapter} />)}</div></section>}
      {completed.length > 0 && <section className="mt-7" aria-label="Completed coding battles"><div className="arena-section-heading"><div><p className="scene-eyebrow">COMPLETED BATTLES</p><h2>Proof on record</h2></div><span>{completed.length} CLEARED</span></div><div className="arena-completed-list">{completed.map(({ mission }) => <div key={mission.id}><span aria-hidden="true">✓</span><strong>{mission.problemFlow.title}</strong><small>{TOPIC_MAP[mission.topic]?.name || mission.topic} · {mission.problemFlow.difficulty} · Cleared</small><button className="bb-btn bb-btn-ghost mt-3 text-xs" onClick={() => onStartMission(mission)}>Review challenge →</button></div>)}</div></section>}
    </section>
  </main>;
}

import { useMemo, useState } from 'react';
import { useGame } from '../game/GameContext.jsx';
import { getPracticeRecommendations } from '../game/recommendations.js';
import { FloatingPanel } from '../components/PageScene.jsx';
import { MISSIONS, isUnlocked } from '../data/missions/index.js';
import { ROADMAP_NODES, computeNodeState } from '../data/roadmap.js';

export default function ChallengeArenaScreen({ onBack, onStartMission, onChooseChapter }) {
  const { save, cleared, skills, topics } = useGame();
  const [topicFilter, setTopicFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const codingMissions = useMemo(() => MISSIONS.filter((mission) => mission.problemFlow), []);
  const recommendation = useMemo(() => getPracticeRecommendations(save, { limit: 20 }).find((item) => item.activity.type === 'coding'), [save]);
  const missionNode = (mission) => ROADMAP_NODES.find((node) => node.id === mission.chapter || node.topicId === mission.topic || node.missionTopics?.includes(mission.topic));
  const available = codingMissions.filter((mission) => {
    const node = missionNode(mission);
    return !cleared[mission.id] && isUnlocked(mission.id, cleared) && node && computeNodeState(node.id, cleared, skills, topics) !== 'LOCKED';
  });
  const completed = codingMissions.filter((mission) => !!cleared[mission.id]);
  const topicsAvailable = [...new Set(codingMissions.map((mission) => mission.topic))];
  const filtered = available.filter((mission) => (topicFilter === 'all' || mission.topic === topicFilter)
    && (difficultyFilter === 'all' || mission.problemFlow.difficulty === difficultyFilter));
  const currentMission = recommendation?.activity.mission && available.find((mission) => mission.id === recommendation.activity.mission.id);
  const launchable = (mission) => <button className="bb-btn bb-btn-green mt-4 text-xs" onClick={() => onStartMission(mission)}>Enter coding lab →</button>;

  return <main className="arena-room scene-page-width challenge-arena-room">
    <button className="scene-back-link" onClick={onBack}>← Learning world</button>
    <header className="arena-heading"><p className="scene-eyebrow">ALGO NOOK / CHALLENGE AREA</p><h1>Choose your<br /><em>challenge.</em></h1><p>Browse coding challenges unlocked by your saved roadmap progress. Every launch uses the existing coding lab and its explanation, transfer, and mastery flow.</p></header>
    <div className="arena-stage" aria-hidden="true"><i /><i /><i /><span>✳</span></div>
    {currentMission && <FloatingPanel as="section" className="arena-current-battle" aria-label="Recommended coding challenge">
      <div><p className="scene-eyebrow">RECOMMENDED CODING CHALLENGE · FROM YOUR SAVED RECORD</p><h2>{currentMission.problemFlow.title}</h2><p>{recommendation.reason}</p></div>{launchable(currentMission)}
    </FloatingPanel>}
    <section className="mt-6" aria-label="Available coding battles">
      <div className="arena-section-heading"><div><p className="scene-eyebrow">AVAILABLE BATTLES</p><h2>Choose your challenge</h2></div><span>{filtered.length} READY · {completed.length} CLEARED</span></div>
      <div className="arena-filters"><label>Topic <select value={topicFilter} onChange={(event) => setTopicFilter(event.target.value)}><option value="all">All topics</option>{topicsAvailable.map((topic) => <option key={topic} value={topic}>{topic}</option>)}</select></label><label>Difficulty <select value={difficultyFilter} onChange={(event) => setDifficultyFilter(event.target.value)}><option value="all">All levels</option>{[...new Set(codingMissions.map((mission) => mission.problemFlow.difficulty))].map((level) => <option key={level} value={level}>{level}</option>)}</select></label></div>
      {filtered.length ? <div className="arena-battle-grid">{filtered.map((mission) => {
        const record = skills[mission.skill];
        const isRecommended = recommendation?.activity.mission?.id === mission.id;
        return <FloatingPanel as="article" key={mission.id} className={`arena-battle-card ${isRecommended ? 'is-recommended' : ''}`}>
          <div className="arena-battle-meta"><span>{mission.topic}</span><span>{mission.problemFlow.difficulty}</span></div><h3>{mission.problemFlow.title}</h3><p>{mission.brief}</p><div className="arena-battle-status"><span>{record?.masteryLevel ? `Mastery · ${record.masteryLevel}` : 'Mastery · not yet recorded'}</span>{isRecommended && <b>RECOMMENDED</b>}</div>{launchable(mission)}
        </FloatingPanel>;
      })}</div> : <FloatingPanel as="div" className="arena-empty-state"><span className="arena-emblem" aria-hidden="true">⌁</span><div><p className="scene-eyebrow">NO CHALLENGES MATCH</p><h2>{available.length ? 'Adjust the battlefield filters.' : 'No coding challenges are ready yet.'}</h2><p>{available.length ? 'Try another topic or difficulty.' : 'Challenges unlock as you complete the saved chapter prerequisites and earlier missions. Choose a chapter to practice while you work toward the next coding challenge.'}</p>{!available.length && <button className="bb-btn bb-btn-green mt-4 text-xs" onClick={onChooseChapter}>Choose a practice chapter →</button>}</div></FloatingPanel>}
    </section>
    {completed.length > 0 && <section className="mt-7" aria-label="Completed coding battles"><div className="arena-section-heading"><div><p className="scene-eyebrow">COMPLETED BATTLES</p><h2>Proof on record</h2></div><span>{completed.length} CLEARED</span></div><div className="arena-completed-list">{completed.map((mission) => <div key={mission.id}><span aria-hidden="true">✓</span><strong>{mission.problemFlow.title}</strong><small>{mission.topic} · {mission.problemFlow.difficulty} · Cleared</small></div>)}</div></section>}
  </main>;
}

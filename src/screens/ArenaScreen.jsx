import { useMemo } from 'react';
import { useGame } from '../game/GameContext.jsx';
import { FloatingPanel } from '../components/PageScene.jsx';
import { getPracticeRecommendations } from '../game/recommendations.js';
import { MISSIONS, isUnlocked } from '../data/missions/index.js';
import { ROADMAP_NODES, computeNodeState } from '../data/roadmap.js';

export default function ArenaScreen({ onBack, onOpenChallenges, onChooseChapter, onStartMission }) {
  const { save, cleared, skills, topics } = useGame();
  const codingMissions = useMemo(() => MISSIONS.filter((mission) => mission.problemFlow), []);
  const available = codingMissions.filter((mission) => {
    const node = ROADMAP_NODES.find((item) => item.id === mission.chapter || item.topicId === mission.topic || item.missionTopics?.includes(mission.topic));
    return !cleared[mission.id] && isUnlocked(mission.id, cleared) && node
      && computeNodeState(node.id, cleared, skills, topics) !== 'LOCKED';
  });
  const recommendations = useMemo(() => getPracticeRecommendations(save, { limit: 20 }), [save]);
  const recommended = recommendations.find((item) => item.activity.type === 'coding')?.activity.mission;
  const battle = available.find((mission) => mission.id === recommended?.id) || available[0];
  const clearedCoding = codingMissions.filter((mission) => !!cleared[mission.id]).length;
  const skill = battle && skills[battle.skill];

  return <main className="arena-room scene-page-width battlefield-room">
    <button className="scene-back-link" onClick={onBack}>← Learning world</button>
    <header className="arena-heading"><p className="scene-eyebrow">ALGO NOOK / BATTLEFIELD</p><h1>Hold the<br /><em>frontline.</em></h1><p>A focused battle environment for applying what you know. Battles here are real registered coding problems; launch enters the existing coding lab.</p></header>
    <div className="arena-stage battlefield-stage" aria-hidden="true"><i /><i /><i /><span>♜</span></div>
    <FloatingPanel as="section" className="battlefield-record"><div><small>BATTLES CLEARED</small><strong>{clearedCoding} <i>/ {codingMissions.length}</i></strong><span>Recorded coding mission clears</span></div><button className="bb-btn bb-btn-ghost text-xs" onClick={onOpenChallenges}>Browse Challenge Area →</button></FloatingPanel>
    {battle ? <FloatingPanel as="section" className="battlefield-current">
      <div className="battlefield-current-head"><p className="scene-eyebrow">{battle.id === recommended?.id ? 'RECOMMENDED BATTLE' : 'NEXT UNLOCKED BATTLE'}</p><span>READY TO DEPLOY</span></div>
      <h2>{battle.problemFlow.title}</h2><p>{battle.brief}</p>
      <div className="arena-battle-meta"><span>{battle.topic}</span><span>{battle.problemFlow.difficulty}</span></div>
      <div className="arena-battle-status"><span>{skill?.masteryLevel ? `Mastery · ${skill.masteryLevel}` : 'Mastery · not yet recorded'}</span><span>{recommended?.id === battle.id ? recommendations.find((item) => item.activity.mission?.id === battle.id)?.reason : 'Prerequisites and mission status are satisfied'}</span></div>
      <button className="bb-btn bb-btn-green mt-5 text-xs" onClick={() => onStartMission(battle)}>Enter coding lab →</button>
    </FloatingPanel> : <FloatingPanel as="section" className="arena-empty-state battlefield-empty"><span className="arena-emblem" aria-hidden="true">⌁</span><div><p className="scene-eyebrow">FRONTLINE QUIET</p><h2>No eligible battles are available yet.</h2><p>The next battle unlocks when its roadmap prerequisites and earlier coding missions are cleared. Build those skills in chapter practice or inspect the Challenge Area.</p><div className="flex flex-wrap gap-2 mt-4"><button className="bb-btn bb-btn-green text-xs" onClick={onChooseChapter}>Choose a practice chapter →</button><button className="bb-btn bb-btn-ghost text-xs" onClick={onOpenChallenges}>Open Challenge Area →</button></div></div></FloatingPanel>}
  </main>;
}

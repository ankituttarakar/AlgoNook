import { GAME_LAB_BY_NODE } from '../data/games/index.js';
import { missionsOfTopic, isUnlocked } from '../data/missions/index.js';
import { ROADMAP_NODES, computeNodeState } from '../data/roadmap.js';
import { MASTERY_TITLES, isSkillReviewDue } from '../game/mastery.js';
import { useGame } from '../game/GameContext.jsx';
import { sfx } from '../game/sfx.js';
import { FloatingPanel, WorldCard } from '../components/PageScene.jsx';

const STAGE_LABELS = {
  concept: 'Interactive concept lesson',
  visualize: 'Explore the visual model',
  complexity: 'Compare algorithm growth',
  game: 'Reasoning arena',
  patterns: 'Pattern lesson',
  practice: 'Quick practice',
  problems: 'Chapter challenge',
  mock: 'Interview simulation',
};

const stageKey = (stage) => stage === 'patterns' ? 'pattern' : stage;

function remainingEstimate(estimate, remaining, total) {
  if (!total || remaining <= 0) return 'Complete';
  const range = String(estimate || '').match(/(\d+)\s*[–-]\s*(\d+)\s*h/i);
  if (!range) return `About ${estimate || 'time not estimated'} remaining`;
  const fraction = remaining / total;
  const low = Math.max(1, Math.ceil(Number(range[1]) * fraction));
  const high = Math.max(low, Math.ceil(Number(range[2]) * fraction));
  return `~${low}–${high} h left`;
}

function getTopicModel(node, { cleared, skills, topics }) {
  const topicProgress = topics?.[node.id];
  const topicMissions = (node.missionTopics || (node.topicId ? [node.topicId] : [])).flatMap(missionsOfTopic);
  const skillIds = new Set([
    ...topicMissions.map((mission) => mission.skill).filter(Boolean),
    GAME_LAB_BY_NODE[node.id]?.skillId,
  ].filter(Boolean));
  const skillPrefixes = node.missionTopics || (node.topicId ? [node.topicId] : []);
  const topicSkills = Object.entries(skills || {}).filter(([skillId]) =>
    skillIds.has(skillId) || skillPrefixes.some((prefix) => skillId.startsWith(prefix) || skillId.includes(prefix))
  ).map(([, record]) => record);
  const lessons = (node.learningStages || []).map((stage) => {
    const done = stage === 'problems'
      ? topicMissions.length > 0 && topicMissions.every((mission) => !!cleared[mission.id])
      : !!topicProgress?.stages?.[stageKey(stage)];
    return { id: stage, label: STAGE_LABELS[stage] || stage, done };
  });
  const completedLessons = lessons.filter((lesson) => lesson.done).length;
  const totalLessons = lessons.length;
  const missionCleared = topicMissions.some((mission) => !!cleared[mission.id]);
  const derivedState = computeNodeState(node.id, cleared, skills, topics);
  const isMastered = topicSkills.some((skill) => ['independent', 'retained'].includes(skill.masteryLevel));
  const reviewDue = topicSkills.some(isSkillReviewDue);
  const hasProgress = !!topicProgress?.startedAt || completedLessons > 0 || missionCleared || topicSkills.some((skill) => skill.attempts > 0);
  const isComplete = totalLessons > 0 && completedLessons === totalLessons;
  const locked = derivedState === 'LOCKED';
  const mastery = topicSkills.reduce((best, skill) => {
    const rank = ['introduced', 'guided', 'practicing', 'independent', 'retained'].indexOf(skill.masteryLevel);
    const bestRank = ['introduced', 'guided', 'practicing', 'independent', 'retained'].indexOf(best || '');
    return rank > bestRank ? skill.masteryLevel : best;
  }, '');

  return {
    node,
    topicProgress,
    topicMissions,
    cleared,
    clearedMissions: topicMissions.filter((mission) => !!cleared[mission.id]).length,
    topicSkills,
    lessons,
    completedLessons,
    totalLessons,
    remainingLessons: Math.max(0, totalLessons - completedLessons),
    progressPercent: totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0,
    remainingEstimate: remainingEstimate(node.estimatedTime, totalLessons - completedLessons, totalLessons),
    derivedState,
    mastery,
    isMastered,
    reviewDue,
    hasProgress,
    isComplete,
    locked,
  };
}

function getStatus(model, isCurrent) {
  if (model.reviewDue) return 'REVIEW DUE';
  if (model.isMastered) return 'MASTERED';
  if (model.isComplete) return 'COMPLETED';
  if (model.locked) return 'LOCKED';
  if (isCurrent) return 'CURRENT';
  if (model.hasProgress) return 'IN PROGRESS';
  return 'AVAILABLE';
}

function recommendation(model, prerequisites) {
  if (model.reviewDue) return 'Review this skill in the training room';
  if (model.locked) {
    const unmet = prerequisites.filter((item) => item.locked).map((item) => item.label);
    return unmet.length ? `Unlock after ${unmet.join(' and ')}` : 'Complete the chapter prerequisites';
  }
  if (model.isComplete) return 'Chapter lessons complete · revisit for spaced review';

  const nextLesson = model.lessons.find((lesson) => !lesson.done);
  if (!nextLesson) return 'Explore the chapter room';
  if (nextLesson.id === 'problems') {
    const next = model.topicMissions.find((item) => !model.cleared[item.id] && isUnlocked(item.id, model.cleared));
    if (next) return `Chapter challenge · ${next.title}`;
    if (!model.topicMissions.length) return 'No challenge is registered for this stage';
    return model.topicMissions.some((item) => !model.cleared[item.id])
      ? 'Next challenge follows campaign order'
      : 'All registered chapter challenges are clear';
  }
  return nextLesson.label;
}

function StatusLegend() {
  return (
    <div className="roadmap-legend" aria-label="Roadmap status legend">
      {[
        ['COMPLETED', '✓'], ['MASTERED', '✦'], ['IN PROGRESS', '◒'], ['AVAILABLE', '○'],
        ['LOCKED', '⌑'], ['REVIEW DUE', '↻'], ['CURRENT', '⌖'],
      ].map(([label, icon]) => <span className={`legend-status legend-${label.toLowerCase().replaceAll(' ', '-')}`} key={label}><i aria-hidden="true">{icon}</i>{label}</span>)}
    </div>
  );
}

function RoadmapNode({ model, index, current, prereqModels, onSelect }) {
  const { node } = model;
  const status = getStatus(model, current);
  const canOpen = !model.locked;
  const prereqText = prereqModels.length
    ? prereqModels.map((item) => `${item.node.label} ${item.reviewDue ? '↻' : item.isMastered ? '✦' : item.isComplete ? '✓' : item.locked ? '⌑' : item.hasProgress ? '◒' : '○'}`).join(' · ')
    : 'Starting point';
  const nextActivity = recommendation(model, prereqModels);
  return (
    <li className={`roadmap-stop status-${status.toLowerCase().replaceAll(' ', '-')} ${current ? 'is-current' : ''} ${model.locked ? 'is-locked' : ''}`}>
      <article className="roadmap-node-info">
        <div className="roadmap-node-heading">
          <span className="roadmap-chapter-label">CHAPTER {String(index + 1).padStart(2, '0')}</span>
          <span className={`roadmap-status-pill status-pill-${status.toLowerCase().replaceAll(' ', '-')}`}>{status}</span>
        </div>
        <h3>{node.label}</h3>
        <p className="roadmap-node-subtitle">{node.subtitle}</p>
        <div className="roadmap-progress-line" aria-label={`${model.completedLessons} of ${model.totalLessons} lessons complete`}>
          <span><i style={{ width: `${model.progressPercent}%` }} /></span>
          <small>{model.progressPercent}%</small>
        </div>
        <div className="roadmap-node-facts">
          <span>{model.completedLessons}/{model.totalLessons} lessons</span>
          {model.topicMissions.length > 0 && <span>{model.clearedMissions}/{model.topicMissions.length} missions</span>}
          <span>{model.remainingLessons} remaining</span>
          <span>{model.remainingEstimate}</span>
        </div>
        <div className="roadmap-node-meta">
          <span className={`roadmap-mastery ${model.isMastered ? 'has-mastery' : ''}`}>MASTERY · {model.reviewDue ? 'REVIEW DUE' : MASTERY_TITLES[model.mastery] || 'NOT YET PROVEN'}</span>
          <span className="roadmap-prereq">PREREQUISITES · {prereqText}</span>
        </div>
        <p className={`roadmap-recommendation ${model.locked ? 'is-unavailable' : ''}`}><small>NEXT RECOMMENDED</small><strong>{nextActivity}</strong></p>
      </article>

      <div className="roadmap-island-wrap">
        <span className="roadmap-island-shadow" aria-hidden="true" />
        <WorldCard
          className={`roadmap-island ${current ? 'is-current' : ''} ${model.isMastered ? 'is-mastered' : ''} ${model.reviewDue ? 'is-review-due' : ''} ${model.locked ? 'is-locked' : ''}`}
          onClick={() => { if (canOpen) { sfx.select(); onSelect(node); } }}
          disabled={!canOpen}
          aria-label={`${node.label}, ${status.toLowerCase()}, ${model.completedLessons} of ${model.totalLessons} lessons complete${model.locked ? ', locked' : ''}`}
          title={model.locked ? nextActivity : `Open ${node.label}`}
        >
          <span className="roadmap-level-marker">{String(index + 1).padStart(2, '0')}</span>
          <strong aria-hidden="true">{node.icon}</strong>
          {current && <span className="roadmap-current-signal" aria-hidden="true" />}
          {model.isMastered && <span className="roadmap-mastery-signal" aria-label="Mastery demonstrated">✦</span>}
          {model.reviewDue && <span className="roadmap-review-signal" aria-label="Review due">↻</span>}
        </WorldCard>
        <span className="roadmap-island-caption">{status === 'CURRENT' ? 'YOU ARE HERE' : status}</span>
      </div>
    </li>
  );
}

export default function RoadmapScreen({ onSelectNode, onReview }) {
  const { cleared, skills, save, level, levelInfo, title, topics } = useGame();
  const models = ROADMAP_NODES.map((node) => getTopicModel(node, { cleared, skills, topics }));
  const modelById = new Map(models.map((model) => [model.node.id, model]));
  const dueModel = models.find((model) => model.reviewDue && !model.locked);
  const activeModel = models.find((model) => model.hasProgress && !model.isComplete && !model.isMastered && !model.locked);
  const nextOpenModel = models.find((model) => !model.locked && !model.isComplete && !model.isMastered);
  const current = dueModel || activeModel || nextOpenModel || null;
  const completedCount = models.filter((model) => model.isComplete).length;
  const masteredCount = models.filter((model) => model.isMastered).length;
  const completedLessons = models.reduce((sum, model) => sum + model.completedLessons, 0);
  const totalLessons = models.reduce((sum, model) => sum + model.totalLessons, 0);
  const overallPercent = totalLessons ? Math.round(completedLessons / totalLessons * 100) : 0;
  const reviewCount = Object.values(skills || {}).filter(isSkillReviewDue).length;
  const currentRecommendation = current ? recommendation(current, (current.node.prerequisites || []).map((id) => modelById.get(id)).filter(Boolean)) : 'All currently available chapters are complete.';
  const xpProgress = Math.min(100, Math.round((levelInfo.into / levelInfo.span) * 100));

  return (
    <main className="learn-home roadmap-shell">
      <FloatingPanel as="section" className="roadmap-command-center">
        <div className="roadmap-command-copy">
          <p className="eyebrow"><span className="status-dot" /> ALGO NOOK / PROGRESSION MAP</p>
          <h1>Your path to<br /><em>algorithm fluency.</em></h1>
          <p className="roadmap-command-intro">One connected route from first principles to interview patterns. Your markers reflect saved lessons and demonstrated mastery.</p>
          {current ? (
            <div className="roadmap-current-card">
              <span className="roadmap-current-icon" aria-hidden="true">{current.node.icon}</span>
              <div><small>{current.reviewDue ? 'REVIEW IS DUE' : 'YOU ARE HERE'} · CHAPTER {String(models.indexOf(current) + 1).padStart(2, '0')}</small><strong>{current.node.label}</strong><span>{currentRecommendation}</span></div>
              <button className="bb-btn bb-btn-green" onClick={() => { sfx.select(); current.reviewDue ? onReview() : onSelectNode(current.node); }}>{current.reviewDue ? 'Review now' : current.hasProgress ? 'Continue chapter' : 'Begin chapter'} <b aria-hidden="true">→</b></button>
            </div>
          ) : <p className="roadmap-path-complete">You’ve explored every currently available chapter. Review due skills or revisit any unlocked world.</p>}
        </div>
        <div className="roadmap-overview" aria-label="Progress overview">
          <div className="roadmap-level-cube"><small>LEVEL</small><strong>{String(level).padStart(2, '0')}</strong><span>{title}</span></div>
          <div className="roadmap-overview-stats">
            <div><small>CHAPTERS COMPLETE</small><strong>{completedCount}<i> / {models.length}</i></strong></div>
            <div><small>CHAPTERS REMAINING</small><strong>{models.length - completedCount}</strong></div>
            <div><small>MASTERED</small><strong>{masteredCount}</strong></div>
            <div><small>REVIEW DUE</small><strong className={reviewCount ? 'has-due' : ''}>{reviewCount}</strong></div>
          </div>
          <div className="roadmap-xp"><span>{save.xp || 0} XP</span><span>{levelInfo.into} / {levelInfo.span} to next level</span><i><b style={{ width: `${xpProgress}%` }} /></i></div>
          <div className="roadmap-total-progress"><span>JOURNEY COMPLETION</span><strong>{overallPercent}%</strong><i><b style={{ width: `${overallPercent}%` }} /></i><small>{completedLessons} of {totalLessons} lesson proofs</small></div>
        </div>
      </FloatingPanel>

      <div className="roadmap-path-heading">
        <div><p className="eyebrow">THE LEARNING WORLD</p><h2>Fourteen chapters. <em>One path.</em></h2><p>Completed lessons, mastery evidence, and review timing come from your saved learning record.</p></div>
        <span className="roadmap-endpoint">GOAL <b>⬡</b> INTERVIEW READY</span>
      </div>
      <StatusLegend />

      <ol className="roadmap-path" aria-label="DSA learning progression">
        {models.map((model, index) => {
          const prerequisiteModels = (model.node.prerequisites || []).map((id) => modelById.get(id)).filter(Boolean);
          return <RoadmapNode key={model.node.id} model={model} index={index} current={model === current} prereqModels={prerequisiteModels} onSelect={onSelectNode} />;
        })}
      </ol>
      <footer className="roadmap-footer"><span>PROGRESS SYNCED FROM YOUR SAVED LEARNING RECORD</span><span>{reviewCount ? `${reviewCount} skill${reviewCount === 1 ? '' : 's'} ready for review` : 'NO REVIEWS CURRENTLY DUE'}</span></footer>
    </main>
  );
}

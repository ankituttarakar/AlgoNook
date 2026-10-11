// AlgoNook — Topic / Skill Hub Page
// Opens when the user clicks a roadmap node.
// Shows: overview, prerequisites, visualizations, missions, mastery progress.
// Does NOT hard-code topic content — reads from roadmap.js + missions data.

import { useMemo } from 'react';
import { ROADMAP_NODE_MAP, computeNodeState } from '../data/roadmap.js';
import { MISSIONS, missionsOfTopic, isUnlocked } from '../data/missions/index.js';
import { useGame } from '../game/GameContext.jsx';
import { MASTERY_COLORS } from '../game/mastery.js';
import { sfx } from '../game/sfx.js';
import { GAME_LAB_BY_NODE } from '../data/games/index.js';

const STAGE_LABELS = {
  concept: 'Learn the idea', visualize: 'Explore the mechanics', game: 'Play the pattern',
  complexity: 'Analyze the trade-offs', patterns: 'Recognize the pattern', practice: 'Check your instincts',
  problems: 'Solve a mission', mock: 'Interview simulation',
};

function LearningStage({ stage, index, complete, upcoming }) {
  return <div className={`chapter-step ${complete ? 'is-complete' : upcoming ? 'is-upcoming' : ''}`} aria-current={upcoming ? 'step' : undefined}>
    <span className="chapter-step-marker">{complete ? '✓' : String(index + 1).padStart(2, '0')}</span>
    <span>{STAGE_LABELS[stage] || stage}</span>
    <small>{complete ? 'DONE' : upcoming ? 'NEXT' : 'LATER'}</small>
  </div>;
}

function MissionRow({ mission, isCleared, isOpen, onStart }) {
  const rec = isCleared;
  return (
    <div
      className={`flex items-center justify-between border border-[var(--bb-line)] px-3 py-2.5 gap-2 ${
        !isOpen ? 'opacity-40' : ''
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {rec ? (
            <span className="text-[var(--bb-green)] text-[10px]">✓</span>
          ) : isOpen ? (
            <span className="text-[var(--bb-amber)] text-[10px]">○</span>
          ) : (
            <span className="text-[var(--bb-muted)] text-[10px]">▦</span>
          )}
          <span className={`text-xs font-medium truncate ${isOpen ? 'text-[var(--bb-text)]' : 'text-[var(--bb-muted)]'}`}>
            {isOpen ? mission.title : 'Locked'}
          </span>
        </div>
        {isOpen && mission.brief && (
          <p className="mt-0.5 text-[10px] text-[var(--bb-muted)] truncate pl-4">
            {mission.brief.slice(0, 80)}{mission.brief.length > 80 ? '…' : ''}
          </p>
        )}
      </div>
      {isOpen && (
        <button
          onClick={() => { sfx.select(); onStart(mission); }}
          className="bb-btn bb-btn-ghost !min-h-0 !px-2.5 !py-1 text-[10px] shrink-0"
        >
          {rec ? 'Replay' : 'Start'} →
        </button>
      )}
    </div>
  );
}

export default function TopicScreen({ nodeId, onBack, onStartMission, onContinueChapter, onReview, onGuidebook }) {
  const { cleared, skills, topics } = useGame();
  const node = ROADMAP_NODE_MAP[nodeId];

  const nodeState = computeNodeState(nodeId, cleared, skills, topics);
  const topicMissions = node ? (node.missionTopics || (node.topicId ? [node.topicId] : [])).flatMap(missionsOfTopic) : [];

  // Skill records for this topic
  const topicSkills = useMemo(() => {
    if (!node) return [];
    const knownSkills = new Set([
      GAME_LAB_BY_NODE[nodeId]?.skillId,
      ...topicMissions.map((mission) => mission.skill),
    ].filter(Boolean));
    return Object.entries(skills || {}).filter(([skillId]) =>
      knownSkills.has(skillId)
      || (!node.missionTopics && node.topicId && (skillId.startsWith(node.topicId) || skillId.includes(node.topicId)))
      || (nodeId === 'arrays' && skillId === 'contains-duplicate')
    );
  }, [skills, node, nodeId, topicMissions]);

  const clearedCount = topicMissions.filter(m => cleared[m.id]).length;
  const topicProgress = topics?.[nodeId];
  const stageIsComplete = (stage) => stage === 'problems'
    ? topicMissions.length > 0 && topicMissions.every((item) => !!cleared[item.id])
    : !!topicProgress?.stages?.[stage === 'patterns' ? 'pattern' : stage];
  const completeStageCount = node?.learningStages?.filter(stageIsComplete).length || 0;
  const nextStage = node?.learningStages?.find((stage) => !stageIsComplete(stage)) || null;

  const prerequisiteNodes = (node?.prerequisites || []).map(id => ROADMAP_NODE_MAP[id]).filter(Boolean);

  if (!node) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-8 pb-24">
        <button onClick={onBack} className="bb-btn bb-btn-ghost text-xs mb-4">← Back</button>
        <p className="text-sm text-[var(--bb-muted)]">Topic not found.</p>
      </div>
    );
  }

  return (
    <main className="topic-chapter mx-auto max-w-4xl px-4 pt-6 pb-24">

      {/* Back nav */}
      <button
        onClick={() => { sfx.select(); onBack(); }}
        className="mb-5 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[var(--bb-muted)] hover:text-[var(--bb-text)] transition-colors"
      >
        ← Learning Roadmap
      </button>

      {/* Topic header */}
      <div className="chapter-hero border border-[var(--bb-line)] bg-[var(--bb-panel)] p-5 sm:p-7 mb-6">
        <div className="flex items-start gap-4">
          <span className="font-mono text-3xl text-[var(--bb-green)] leading-none mt-1">
            {node.icon}
          </span>
          <div className="flex-1 min-w-0">
            <p className="eyebrow mb-1">
              DESTINATION / {String(ROADMAP_NODE_MAP[node.prerequisites?.[0]]?.label || 'FOUNDATIONS').toUpperCase()}
            </p>
            <h1 className="text-2xl font-bold text-[var(--bb-text)] leading-tight">
              {node.label}
            </h1>
            <p className="text-sm text-[var(--bb-muted)] mt-1">{node.subtitle}</p>
          </div>
          {/* State badge */}
          <div className="shrink-0">
            <span className={`text-[9px] uppercase tracking-widest border px-2 py-1 font-mono ${
              nodeState === 'MASTERED' ? 'border-[var(--bb-green-dim)] text-[var(--bb-green)]' :
              nodeState === 'IN_PROGRESS' ? 'border-[var(--bb-amber)] text-[var(--bb-amber)]' :
              nodeState === 'REVIEW_DUE' ? 'border-purple-500 text-purple-400' :
              nodeState === 'AVAILABLE' ? 'border-[var(--bb-green)] text-[var(--bb-green)]' :
              'border-[var(--bb-line)] text-[var(--bb-muted)]'
            }`}>
              {nodeState.replace('_', ' ')}
            </span>
          </div>
        </div>

        <p className="chapter-description mt-4 text-sm leading-relaxed text-[var(--bb-text)]/80">
          {node.description}
        </p>

        <div className="mt-4 flex flex-wrap gap-3 text-[10px] text-[var(--bb-muted)]">
          {topicMissions.length > 0 && <span className="border border-[var(--bb-line)] px-2 py-1">{topicMissions.length} chapter challenges</span>}
          {topicMissions.some((mission) => mission.problemFlow) && <span className="border border-[var(--bb-line)] px-2 py-1">{topicMissions.filter((mission) => mission.problemFlow).length} executable coding task{topicMissions.filter((mission) => mission.problemFlow).length === 1 ? '' : 's'}</span>}
          <span className="border border-[var(--bb-line)] px-2 py-1">~{node.estimatedTime}</span>
          {topicMissions.length > 0 && (
            <span className="border border-[var(--bb-line)] px-2 py-1">
              {clearedCount}/{topicMissions.length} missions cleared
            </span>
          )}
        </div>
      </div>

      {/* Prerequisites */}
      {prerequisiteNodes.length > 0 && (
        <section className="mb-6">
          <h2 className="text-[10px] uppercase tracking-[0.18em] text-[var(--bb-muted)] mb-3">
            Prerequisites
          </h2>
          <div className="flex flex-wrap gap-2">
            {prerequisiteNodes.map((prereq) => {
              const prereqState = computeNodeState(prereq.id, cleared, skills, topics);
              const done = prereqState === 'MASTERED' || prereqState === 'REVIEW_DUE';
              return (
                <span
                  key={prereq.id}
                  className={`border px-2.5 py-1 text-xs font-mono ${
                    done
                      ? 'border-[var(--bb-green-dim)] text-[var(--bb-green)]'
                      : 'border-[var(--bb-line)] text-[var(--bb-muted)]'
                  }`}
                >
                  {done ? '✓ ' : ''}{prereq.label}
                </span>
              );
            })}
          </div>
        </section>
      )}

      {/* Learning stages */}
      <section className="chapter-journey mb-6 border border-[var(--bb-green-dim)] bg-[rgba(0,244,142,0.04)] p-4 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[10px] uppercase tracking-[0.18em] text-[var(--bb-muted)]">
            CHAPTER PATH · {completeStageCount} / {node.learningStages.length} PROOFS
          </h2>
          {nodeState !== 'LOCKED' && nextStage && (
            <button
              onClick={() => { sfx.select(); onContinueChapter(nextStage); }}
              className="bb-btn bb-btn-green !min-h-0 !px-3 !py-1.5 text-[10px]"
            >
              {topicProgress?.stages && Object.values(topicProgress.stages).some(Boolean) ? 'Continue chapter' : 'Begin chapter'} <span aria-hidden="true">→</span>
            </button>
          )}
          {nodeState !== 'LOCKED' && !nextStage && (
            <button onClick={() => { sfx.select(); onReview(); }} className="bb-btn bb-btn-ghost !min-h-0 !px-3 !py-1.5 text-[10px]">Review mastery →</button>
          )}
        </div>
        <div className="chapter-steps">
          {node.learningStages.map((stage, i) => {
            const complete = stageIsComplete(stage);
            const upcoming = !complete && node.learningStages.slice(0, i).every(stageIsComplete);
            return <LearningStage key={stage} stage={stage} index={i} complete={complete} upcoming={upcoming} />;
          })}
        </div>
        {nodeState !== 'LOCKED' && (
          <p className="mt-3 text-xs text-[var(--bb-muted)] italic">
            Learn the idea, inspect the visual model, prove your reasoning in a game, then practice, code, explain, and review. Your next activity resumes from saved chapter evidence.
          </p>
        )}
      </section>


      {/* Skill mastery records */}
      {topicSkills.length > 0 && (
        <section className="mb-6">
          <h2 className="text-[10px] uppercase tracking-[0.18em] text-[var(--bb-muted)] mb-3">
            Skill Mastery
          </h2>
          <div className="space-y-2">
            {topicSkills.map(([skillId, rec]) => (
              <div
                key={skillId}
                className={`border px-3 py-2 flex items-center justify-between text-xs ${MASTERY_COLORS[rec.masteryLevel] || ''}`}
              >
                <span className="font-mono">{skillId}</span>
                <div className="flex items-center gap-3 text-[10px]">
                  <span>{rec.successfulIndependentSolves} ind. solves</span>
                  <span className="uppercase tracking-wider font-bold">{rec.masteryLevel}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Mission choices stay in the chapter, below the ordered learning path. */}
      {topicMissions.length > 0 && (
        <details className="chapter-mission-list mb-6 border border-[var(--bb-line)] bg-black/20 p-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <span><strong className="block text-sm text-[var(--bb-text)]">Chapter challenges</strong><small className="text-xs text-[var(--bb-muted)]">Reasoning missions and coding challenges where available</small></span>
            <span className="shrink-0 text-[10px] font-mono text-[var(--bb-cyan)]">{clearedCount}/{topicMissions.length} cleared　⌄</span>
          </summary>
          <div className="mt-4 h-1 w-full border border-[var(--bb-line)] bg-black/60"><div className="h-full bg-[var(--bb-green)] transition-all duration-500" style={{ width: `${(clearedCount / topicMissions.length) * 100}%` }} /></div>
          <div className="mt-3 space-y-1">{topicMissions.map((item) => <MissionRow key={item.id} mission={item} isCleared={cleared[item.id]} isOpen={isUnlocked(item.id, cleared)} onStart={onStartMission} />)}</div>
        </details>
      )}

      {/* No missions yet — only relevant for topics with a 'problems' stage */}
      {topicMissions.length === 0 && node.learningStages.includes('problems') && (
        <section className="mb-6 border border-[var(--bb-line)] bg-black/20 p-5 text-center">
          <p className="text-xs text-[var(--bb-muted)]">
            No chapter challenges are registered for <strong className="text-[var(--bb-text)]">{node.label}</strong> yet.
          </p>
          <p className="mt-1 text-[10px] text-[var(--bb-muted)]">
            Explore the learning path above to start learning.
          </p>
        </section>
      )}

      {/* Concept-only topic (e.g. Foundations) — no problems stage */}
      {!node.learningStages.includes('problems') && (
        <section className="mb-6 border border-[var(--bb-green-dim)] bg-[rgba(0,244,142,0.04)] p-5 text-center">
          <p className="text-xs text-[var(--bb-muted)]">
            <strong className="text-[var(--bb-text)]">{node.label}</strong> is a concept-focused topic — no coding problems required.
          </p>
          <p className="mt-1 text-[10px] text-[var(--bb-muted)]">
            Complete the learning path above to build your foundation.
          </p>
        </section>
      )}

      {/* Back to roadmap */}
      <div className="flex gap-2 mt-4">
        <button onClick={() => onGuidebook?.()} className="bb-btn bb-btn-ghost text-xs">Open {node.label} notes →</button>
        <button onClick={() => { sfx.select(); onBack(); }} className="bb-btn bb-btn-ghost text-xs">
          ← Back to Roadmap
        </button>
      </div>
    </main>
  );
}

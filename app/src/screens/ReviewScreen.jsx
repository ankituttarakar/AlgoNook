// AlgoNook — Review & Mastery Screen
// Shows skill mastery progress and spaced review schedule.
// Uses existing GameContext.skills and mastery.js — does NOT create a duplicate system.

import { useMemo } from 'react';
import { useGame } from '../game/GameContext.jsx';
import { MASTERY_LEVELS, MASTERY_TITLES, MASTERY_COLORS, isSkillReviewDue } from '../game/mastery.js';
import { ROADMAP_NODES, ROADMAP_NODE_MAP } from '../data/roadmap.js';
import { GAME_LAB_BY_NODE } from '../data/games/index.js';
import { missionsOfTopic } from '../data/missions/index.js';
import { MISSION_MAP } from '../data/missions/index.js';
import { getPracticeForNode } from '../data/practice.js';
import { sfx } from '../game/sfx.js';
import { getPracticeRecommendations } from '../game/recommendations.js';
import PracticeRecommendations from '../components/PracticeRecommendations.jsx';

function SkillCard({ skillId, record, onReview, recommendation, onLaunchRecommendation }) {
  const isDue = isSkillReviewDue(record);
  const nextReview = record.reviewDue ? new Date(record.reviewDue) : null;
  const daysTillReview = nextReview ? Math.ceil((nextReview - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  const nextTier = ({
    introduced: 'Next: clear a guided run',
    guided: 'Next: solve and explain the approach',
    practicing: 'Next: solve independently and pass transfer',
    independent: `Independent proofs toward retention: ${Math.min(record.successfulIndependentSolves || 0, 3)}/3`,
    retained: 'Retained · keep it sharp with spaced review',
  })[record.masteryLevel] || 'Continue practicing this skill';
  const reason = recommendation?.reason || (isDue ? 'Your saved review interval has elapsed' : daysTillReview !== null && daysTillReview <= 3 ? 'Retention review is approaching' : `Saved mastery is ${MASTERY_TITLES[record.masteryLevel] || record.masteryLevel}`);

  return (
    <div className={`border p-4 ${MASTERY_COLORS[record.masteryLevel] || 'border-[var(--bb-line)]'}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-mono text-sm font-medium truncate">
            {skillId}
          </h3>
          <p className="text-[10px] uppercase tracking-wider font-bold mt-1">
            {MASTERY_TITLES[record.masteryLevel] || record.masteryLevel}
          </p>
        </div>
        {isDue && (
          <span className="text-[9px] uppercase tracking-widest border border-purple-500 px-2 py-1 text-purple-400 font-mono shrink-0">
            Review Due
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-[var(--bb-muted)] mb-3">
        <div>Attempts: {record.attempts}</div>
        <div>Independent: {record.successfulIndependentSolves}</div>
        <div>Hints used: {record.hintUsage?.totalHintsUsed || 0}</div>
        {record.lastPracticed && <div>Last practiced: {new Date(record.lastPracticed).toLocaleDateString()}</div>}
        <div>Review: {isDue ? 'due now' : daysTillReview !== null ? `in ${Math.max(0, daysTillReview)}d` : 'not scheduled'}</div>
      </div>

      <p className="mb-2 text-[10px] text-[var(--bb-muted)]">{reason}</p>
      <p className="mb-3 text-[10px] text-[var(--bb-muted)]">{nextTier}</p>

      {record.masteryLevel === 'independent' && (
        <div className="mb-3 border-t border-[var(--bb-line)] pt-2 text-[10px] text-[var(--bb-muted)]">
          Independent proofs toward retention: {Math.min(record.successfulIndependentSolves || 0, 3)}/3
          <div className="mt-1 h-1 overflow-hidden rounded bg-black/50" role="progressbar" aria-label={`${skillId} independent proofs toward retention`} aria-valuemin="0" aria-valuemax="3" aria-valuenow={Math.min(record.successfulIndependentSolves || 0, 3)}><div className="h-full bg-purple-400" style={{ width: `${Math.min(100, ((record.successfulIndependentSolves || 0) / 3) * 100)}%` }} /></div>
        </div>
      )}

      <button
        onClick={() => { sfx.select(); recommendation ? onLaunchRecommendation(recommendation) : onReview(skillId); }}
        className="bb-btn bb-btn-ghost !min-h-0 !px-3 !py-1.5 text-xs w-full"
      >
        {recommendation?.activity?.label ? `Start ${recommendation.activity.label} →` : 'Open chapter hub →'}
      </button>
    </div>
  );
}

function MasteryProgress({ skills }) {
  const counts = useMemo(() => {
    const result = {};
    MASTERY_LEVELS.forEach(level => { result[level] = 0; });
    Object.values(skills).forEach(rec => {
      if (rec.masteryLevel) result[rec.masteryLevel]++;
    });
    return result;
  }, [skills]);

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

  return (
    <div className="border border-[var(--bb-line)] bg-black/20 p-5">
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--bb-muted)] mb-4">
        Mastery Distribution
      </h3>
      <div className="space-y-3">
        {MASTERY_LEVELS.map(level => {
          const count = counts[level];
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={level}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className={MASTERY_COLORS[level]}>{MASTERY_TITLES[level]}</span>
                <span className="text-[var(--bb-muted)]">{count} skills ({pct.toFixed(0)}%)</span>
              </div>
              <div className="h-1.5 w-full bg-black/60 border border-[var(--bb-line)]">
                <div
                  className={`h-full transition-all duration-500 ${MASTERY_COLORS[level]}`}
                  style={{ width: `${pct}%`, backgroundColor: 'currentColor', opacity: 0.6 }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function skillsForNode(skillEntries, node) {
  const missionTopics = node.missionTopics || (node.topicId ? [node.topicId] : []);
  const knownSkills = new Set([
    GAME_LAB_BY_NODE[node.id]?.skillId,
    ...missionTopics.flatMap(missionsOfTopic).map((mission) => mission.skill),
  ].filter(Boolean));
  return skillEntries.filter(([skillId]) => knownSkills.has(skillId)
    || (!node.missionTopics && node.topicId && (skillId.startsWith(node.topicId) || skillId.includes(node.topicId))));
}

function nodeForSkill(skillId) {
  return ROADMAP_NODES.find((node) => skillsForNode([[skillId, null]], node).length > 0);
}

function TopicProgress({ nodeId, skillEntries, onNavigate }) {
  const node = ROADMAP_NODE_MAP[nodeId];
  if (!node) return null;

  const topicSkills = skillsForNode(skillEntries, node);

  if (topicSkills.length === 0) return null;

  const mastered = topicSkills.filter(([, rec]) =>
    rec.masteryLevel === 'independent' || rec.masteryLevel === 'retained'
  ).length;

  const reviewDue = topicSkills.filter(([, rec]) => isSkillReviewDue(rec)).length;

  return (
    <button
      onClick={() => { sfx.select(); onNavigate('topic', { nodeId: node.id }); }}
      className="border border-[var(--bb-line)] bg-black/20 p-4 text-left hover:border-[var(--bb-green-dim)] transition-colors w-full"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xl text-[var(--bb-green)]">{node.icon}</span>
          <div>
            <h4 className="text-sm font-medium text-[var(--bb-text)]">{node.label}</h4>
            <p className="text-xs text-[var(--bb-muted)] mt-0.5">
              {topicSkills.length} skills tracked
            </p>
          </div>
        </div>
        {reviewDue > 0 && (
          <span className="text-[9px] uppercase tracking-widest border border-purple-500 px-2 py-1 text-purple-400 font-mono shrink-0">
            {reviewDue} due
          </span>
        )}
      </div>
      <div className="flex items-center gap-4 text-xs text-[var(--bb-muted)]">
        <span>{mastered}/{topicSkills.length} mastered</span>
        <span className="text-[var(--bb-green)]">→</span>
      </div>
    </button>
  );
}

export default function ReviewScreen({ onNavigate, onLaunchRecommendation, onBack }) {
  const { skills, save } = useGame();
  const recommendations = useMemo(() => getPracticeRecommendations(save, { limit: Math.max(8, Object.keys(save?.skills || {}).length) }), [save]);
  const recommendationBySkill = useMemo(() => new Map(recommendations.map((item) => [item.skillId, item])), [recommendations]);

  const skillEntries = useMemo(() => Object.entries(skills || {}), [skills]);
  const savedChapterCount = Object.values(save?.topics || {}).filter((topic) => Object.values(topic?.stages || {}).some(Boolean)).length;
  const savedMissionCount = Object.entries(save?.missions || {}).filter(([id, record]) => !!record && !!MISSION_MAP[id]).length;

  const reviewDue = useMemo(() => {
    return skillEntries.filter(([, rec]) => isSkillReviewDue(rec));
  }, [skillEntries]);

  const learning = useMemo(() => {
    return skillEntries.filter(([, rec]) =>
      rec.masteryLevel === 'introduced' ||
      rec.masteryLevel === 'guided' ||
      rec.masteryLevel === 'practicing'
    );
  }, [skillEntries]);

  const mastered = useMemo(() => {
    return skillEntries.filter(([, rec]) =>
      rec.masteryLevel === 'independent' || rec.masteryLevel === 'retained'
    );
  }, [skillEntries]);

  const topicsWithSkills = useMemo(() => {
    const topics = new Set();
    skillEntries.forEach(([skillId]) => {
      // Match skill to topic by checking if skillId contains topic id
      for (const node of ROADMAP_NODES) {
        if (nodeForSkill(skillId)) topics.add(nodeForSkill(skillId).id);
      }
    });
    return Array.from(topics);
  }, [skillEntries]);

  const handleReviewSkill = (skillId) => {
    const node = nodeForSkill(skillId);
    if (!node) return onNavigate('practice-choose');
    if (getPracticeForNode(node.id).length) return onNavigate('practice', { nodeId: node.id });
    onNavigate('topic', { nodeId: node.id });
  };

  return (
    <div className="mx-auto max-w-4xl px-4 pt-6 pb-24">
      {/* Header */}
      <button
        onClick={() => { sfx.select(); onBack(); }}
        className="mb-5 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[var(--bb-muted)] hover:text-[var(--bb-text)] transition-colors"
      >
        ← Back to Roadmap
      </button>

      <div className="border border-[var(--bb-green-dim)] bg-[var(--bb-panel)] p-5 sm:p-6 mb-8">
        <h1 className="text-2xl font-bold text-[var(--bb-text)] leading-tight mb-2">
          Review & Mastery
        </h1>
        <p className="text-sm text-[var(--bb-muted)]">
          Track your skill mastery and spaced review schedule. Regular review builds long-term retention.
        </p>
      </div>

      <div className="mb-8"><PracticeRecommendations recommendations={recommendations.slice(0, 4)} onLaunch={onLaunchRecommendation} title="Your next best practice" /></div>

      {/* Empty state */}
      {skillEntries.length === 0 && (
        <div className="border border-[var(--bb-line)] bg-black/20 p-8 text-center">
          <p className="text-sm text-[var(--bb-muted)] mb-3">No saved skill mastery records are available.</p>
          {(savedChapterCount > 0 || savedMissionCount > 0) ? <p className="mx-auto max-w-xl text-xs text-[var(--bb-muted)] mb-4">Your account still has {savedChapterCount} chapter record{savedChapterCount === 1 ? '' : 's'} and {savedMissionCount} mission clear{savedMissionCount === 1 ? '' : 's'}. Skill mastery is saved after a coding run completes its explanation and transfer stages; no mastery is inferred from chapter visits or clears.</p> : <p className="text-xs text-[var(--bb-muted)] mb-4">A chapter practice check reviews a topic. A skill mastery record is created by a registered coding challenge after its explanation and transfer stages.</p>}
          <button
            onClick={() => { sfx.select(); onNavigate((savedChapterCount > 0 || savedMissionCount > 0) ? 'challenges' : 'practice-choose'); }}
            className="bb-btn bb-btn-green text-xs"
          >
            {(savedChapterCount > 0 || savedMissionCount > 0) ? 'Open Challenge Area →' : 'Choose a practice chapter →'}
          </button>
        </div>
      )}

      {/* Has skills */}
      {skillEntries.length > 0 && (
        <div className="space-y-6">
          {/* Summary stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="border border-[var(--bb-line)] bg-black/20 p-4">
              <p className="text-[10px] uppercase tracking-wider text-[var(--bb-muted)] mb-1">
                Total Skills
              </p>
              <p className="text-2xl font-bold text-[var(--bb-text)]">
                {skillEntries.length}
              </p>
            </div>
            <div className="border border-[var(--bb-green-dim)] bg-[rgba(0,244,142,0.04)] p-4">
              <p className="text-[10px] uppercase tracking-wider text-[var(--bb-muted)] mb-1">
                Mastered
              </p>
              <p className="text-2xl font-bold text-[var(--bb-green)]">
                {mastered.length}
              </p>
            </div>
            <div className="border border-purple-500 bg-purple-950/20 p-4">
              <p className="text-[10px] uppercase tracking-wider text-[var(--bb-muted)] mb-1">
                Review Due
              </p>
              <p className="text-2xl font-bold text-purple-400">
                {reviewDue.length}
              </p>
            </div>
          </div>

          {/* Mastery distribution */}
          <MasteryProgress skills={skills} />

          {/* Review due */}
          {reviewDue.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-[var(--bb-text)] mb-3 flex items-center gap-2">
                <span className="text-purple-400">◆</span>
                Skills Due for Review ({reviewDue.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {reviewDue.map(([skillId, record]) => (
                  <SkillCard
                    key={skillId}
                    skillId={skillId}
                    record={record}
                    onReview={handleReviewSkill}
                    recommendation={recommendationBySkill.get(skillId)}
                    onLaunchRecommendation={onLaunchRecommendation}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Currently learning */}
          {learning.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-[var(--bb-text)] mb-3 flex items-center gap-2">
                <span className="text-[var(--bb-amber)]">◆</span>
                Currently Learning ({learning.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {learning.map(([skillId, record]) => (
                  <SkillCard
                    key={skillId}
                    skillId={skillId}
                    record={record}
                    onReview={handleReviewSkill}
                    recommendation={recommendationBySkill.get(skillId)}
                    onLaunchRecommendation={onLaunchRecommendation}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Mastered skills */}
          {mastered.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-[var(--bb-text)] mb-3 flex items-center gap-2">
                <span className="text-[var(--bb-green)]">◆</span>
                Mastered Skills ({mastered.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {mastered.map(([skillId, record]) => (
                  <SkillCard
                    key={skillId}
                    skillId={skillId}
                    record={record}
                    onReview={handleReviewSkill}
                    recommendation={recommendationBySkill.get(skillId)}
                    onLaunchRecommendation={onLaunchRecommendation}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Topics with skills */}
          {topicsWithSkills.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-[var(--bb-text)] mb-3">
                Topics
              </h2>
              <div className="space-y-2">
                {topicsWithSkills.map(topicId => (
                  <TopicProgress
                    key={topicId}
                    nodeId={topicId}
                    skillEntries={skillEntries}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

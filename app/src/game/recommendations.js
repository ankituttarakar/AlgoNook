// Deterministic practice selection derived only from the hydrated learning record.
import { ROADMAP_NODES } from '../data/roadmap.js';
import { GAME_LAB_BY_NODE } from '../data/games/index.js';
import { MISSION_MAP, missionsOfTopic, isUnlocked } from '../data/missions/index.js';
import { computeNodeState } from '../data/roadmap.js';
import { getPracticeForNode } from '../data/practice.js';

const MASTERY_RANK = { introduced: 0, guided: 1, practicing: 2, independent: 3, retained: 4 };
const RECENT_WINDOW = 14 * 24 * 60 * 60 * 1000;

function nodeMissions(node) {
  return (node.missionTopics || (node.topicId ? [node.topicId] : [])).flatMap(missionsOfTopic);
}

function nodeForSkill(skillId) {
  return ROADMAP_NODES.find((node) => {
    const missions = nodeMissions(node);
    return missions.some((mission) => mission.skill === skillId)
      || GAME_LAB_BY_NODE[node.id]?.skillId === skillId
      || (!node.missionTopics && node.topicId && (skillId.startsWith(node.topicId) || skillId.includes(node.topicId)));
  });
}

function persistedSignals(skillId, record, missions, now) {
  const skillMissions = Object.entries(missions || {})
    .map(([id, progress]) => ({ mission: MISSION_MAP[id], progress }))
    .filter((item) => item.mission?.skill === skillId && item.progress?.clearedAt);
  const latest = skillMissions.sort((a, b) => (Number(b.progress.clearedAt) || 0) - (Number(a.progress.clearedAt) || 0))[0];
  const recentMistakes = latest && now - Number(latest.progress.clearedAt) <= RECENT_WINDOW
    ? Math.max(0, Number(latest.progress.mistakes) || 0)
    : 0;
  const hintLevel = Number(record?.hintUsage?.highestLevelHintRevealed) || 0;
  const reviewInDays = record?.reviewDue ? Math.ceil((Number(record.reviewDue) - now) / 86400000) : null;
  return { recentMistakes, hintLevel: hintLevel >= 4 ? hintLevel : 0, reviewInDays };
}

function selectActivity(node, skillId, mastery, due, cleared, topics) {
  const missions = nodeMissions(node);
  const sameSkill = missions.filter((mission) => mission.skill === skillId && mission.problemFlow);
  const canLaunchMission = (mission) => !cleared?.[mission.id]
    && isUnlocked(mission.id, cleared || {})
    && computeNodeState(node.id, cleared || {}, {}, topics || {}) !== 'LOCKED';
  const openSameSkill = sameSkill.find(canLaunchMission);
  const openCoding = missions.find((mission) => mission.problemFlow && canLaunchMission(mission));
  const practiceActivity = () => getPracticeForNode(node.id).length
    ? { type: 'practice', label: `${node.label} review practice`, nodeId: node.id, key: `practice:${node.id}` }
    : { type: 'topic', label: `${node.label} chapter`, nodeId: node.id, key: `topic:${node.id}` };
  // A due skill can return to its own solved challenge as a deliberate review.
  const reviewMission = due ? sameSkill[0] : null;
  if (reviewMission) {
    const mission = reviewMission;
    return { type: 'coding', label: mission.problemFlow.title, mission, nodeId: node.id, key: `mission:${mission.id}` };
  }
  if (due) return practiceActivity();
  if (mastery === 'introduced' || mastery === 'guided') {
    const done = topics?.[node.id]?.stages || {};
    if (!done.concept) return { type: 'concept', label: `${node.label} concept room`, nodeId: node.id, key: `concept:${node.id}` };
    if (!done.visualize) return { type: 'visualize', label: `${node.label} visual model`, nodeId: node.id, key: `visualize:${node.id}` };
    const game = GAME_LAB_BY_NODE[node.id];
    if (game && !done.game) return { type: 'game', label: game.title || 'Reasoning game', nodeId: node.id, key: `game:${node.id}` };
    if (!done.practice && getPracticeForNode(node.id).length) return { type: 'practice', label: `${node.label} guided practice`, nodeId: node.id, key: `practice:${node.id}` };
  }
  if (openSameSkill || openCoding) {
    const mission = openSameSkill || openCoding;
    return { type: 'coding', label: mission.problemFlow.title, mission, nodeId: node.id, key: `mission:${mission.id}` };
  }
  if (mastery === 'practicing' && getPracticeForNode(node.id).length) return { type: 'practice', label: `${node.label} independent practice`, nodeId: node.id, key: `practice:${node.id}` };
  return practiceActivity();
}

/** Returns ranked recommendations; pass `now` for deterministic boundary checks. */
export function getPracticeRecommendations(save, { now = Date.now(), limit = 8 } = {}) {
  const skills = save?.skills || {};
  const candidates = [];

  for (const [skillId, record] of Object.entries(skills)) {
    const node = nodeForSkill(skillId);
    if (!node || !record) continue;
    const mastery = record.masteryLevel || 'introduced';
    const signals = persistedSignals(skillId, record, save?.missions, now);
    const rank = MASTERY_RANK[mastery] ?? 0;
    const due = !!record.reviewDue && Number(record.reviewDue) <= now;
    const reviewSoon = signals.reviewInDays !== null && signals.reviewInDays >= 0 && signals.reviewInDays <= 3;
    const retained = mastery === 'retained';
    if (retained && !due && !reviewSoon && (Number(record.attempts) || 0) % 3 !== 0) continue;
    const reasons = [];
    let score = 0;

    if (due) { score += 20000; reasons.push('Review is due'); }
    if (signals.recentMistakes > 0) {
      score += 8000 + Math.min(500, signals.recentMistakes * 100);
      reasons.push(`Your latest cleared run recorded ${signals.recentMistakes} ${signals.recentMistakes === 1 ? 'mistake' : 'mistakes'}`);
    }
    if (signals.hintLevel) {
      score += 6500;
      reasons.push(`Your saved hint history reaches level ${signals.hintLevel}`);
    }
    if (!due) {
      score += ({ introduced: 5000, guided: 4400, practicing: 3200, independent: 1600, retained: 250 }[mastery] || 0);
      if (rank <= 2) reasons.push(`This skill is still at ${mastery[0].toUpperCase()}${mastery.slice(1)}`);
      else if (retained) reasons.push("You've retained this skill — keep it sharp");
      else reasons.push(`Continue strengthening ${mastery} mastery`);
    }
    if (reviewSoon && !due) { score += 2300; reasons.unshift('Retention review is coming up'); }
    if (retained && !due && !reviewSoon) score += 100;

    const activity = selectActivity(node, skillId, mastery, due, save?.missions, save?.topics);
    candidates.push({
      id: skillId,
      skillId,
      title: skillId.replaceAll('-', ' '),
      nodeId: node.id,
      chapter: node.label,
      mastery,
      due,
      score,
      reason: reasons[0],
      reasons,
      section: due ? 'REVIEW NOW' : (signals.recentMistakes || signals.hintLevel) ? 'YOU STRUGGLED WITH' : retained ? 'KEEP SHARP' : 'PRACTICE NEXT',
      activity,
      lastPracticed: Number(record.lastPracticed) || 0,
    });
  }

  const seenActivities = new Set();
  return candidates
    .sort((a, b) => b.score - a.score || (a.lastPracticed - b.lastPracticed) || a.skillId.localeCompare(b.skillId))
    .filter((item) => {
      if (seenActivities.has(item.activity.key)) return false;
      seenActivities.add(item.activity.key);
      return true;
    })
    .slice(0, limit);
}

export function getCompletedChapterCount(save) {
  const topics = save?.topics || {};
  const cleared = save?.missions || {};
  return ROADMAP_NODES.filter((node) => (node.learningStages || []).every((stage) => {
    if (stage === 'problems') {
      const missions = nodeMissions(node);
      return missions.length > 0 && missions.every((mission) => !!cleared[mission.id]);
    }
    return !!topics[node.id]?.stages?.[stage === 'patterns' ? 'pattern' : stage];
  })).length;
}

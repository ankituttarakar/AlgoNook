import { MISSIONS, MISSION_MAP, isUnlocked } from './missions/index.js';
import { ROADMAP_NODE_MAP, ROADMAP_NODES, computeNodeState, isChapterComplete } from './roadmap.js';

export const CODING_CHALLENGES = MISSIONS.filter((mission) => !!mission.problemFlow);

export function filterCodingChallenges(challenges, { topic = 'all', difficulty = 'all' } = {}) {
  return challenges.filter((entry) => {
    const mission = entry.mission || entry;
    return (topic === 'all' || mission.topic === topic)
      && (difficulty === 'all' || mission.problemFlow.difficulty === difficulty);
  });
}

function roadmapNodeForMission(mission) {
  return ROADMAP_NODES.find((node) => node.id === mission.roadmapNodeId)
    || ROADMAP_NODES.find((node) => node.id === mission.chapter)
    || ROADMAP_NODES.find((node) => node.topicId === mission.topic || node.missionTopics?.includes(mission.topic))
    || null;
}

function firstIncompletePrerequisites(node, progress, visited = new Set()) {
  if (!node || visited.has(node.id)) return [];
  visited.add(node.id);
  const result = [];
  for (const prerequisiteId of node.prerequisites) {
    const prerequisite = ROADMAP_NODE_MAP[prerequisiteId];
    if (!prerequisite || isChapterComplete(prerequisite, progress.cleared, progress.topics)) continue;
    if (computeNodeState(prerequisiteId, progress.cleared, progress.skills, progress.topics) === 'LOCKED') {
      result.push(...firstIncompletePrerequisites(prerequisite, progress, visited));
    } else {
      result.push(prerequisite);
    }
  }
  return result;
}

function missionPrerequisites(mission, cleared) {
  if (mission.codingProblem) {
    return MISSIONS.filter((item) => item.topic === mission.topic && !item.codingProblem && !cleared[item.id]);
  }
  const index = MISSIONS.findIndex((item) => item.id === mission.id);
  const previous = index > 0 ? MISSIONS[index - 1] : null;
  return previous && !cleared[previous.id] ? [previous] : [];
}

export function getChallengeStatus(mission, progress) {
  const cleared = progress?.cleared || {};
  const normalized = { cleared, topics: progress?.topics || {}, skills: progress?.skills || {} };
  if (cleared[mission.id]) return { status: 'cleared', prerequisites: [] };

  const node = roadmapNodeForMission(mission);
  const missingMissions = missionPrerequisites(mission, cleared);
  const missingChapters = node
    ? firstIncompletePrerequisites(node, normalized)
    : [];
  const nodeAccessible = node && computeNodeState(node.id, cleared, normalized.skills, normalized.topics) !== 'LOCKED';
  const missionUnlocked = isUnlocked(mission.id, cleared);
  if (nodeAccessible && missionUnlocked) return { status: 'available', prerequisites: [] };

  const prerequisites = [
    ...missingMissions.map((item) => ({ id: item.id, label: item.problemFlow?.title || item.title, kind: 'mission' })),
    ...missingChapters.map((item) => ({ id: item.id, label: item.label, kind: 'chapter' })),
  ];
  return {
    status: 'locked',
    prerequisites: [...new Map(prerequisites.map((item) => [item.id, item])).values()],
  };
}

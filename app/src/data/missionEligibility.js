import { MISSIONS, isUnlocked } from './missions/index.js';
import { ROADMAP_NODES, computeNodeState } from './roadmap.js';

/** Resolve the mission's explicit roadmap mapping before falling back to its content topic. */
export function resolveRoadmapNodeForMission(mission) {
  return ROADMAP_NODES.find((node) => node.id === mission?.roadmapNodeId)
    || ROADMAP_NODES.find((node) => node.id === mission?.chapter)
    || ROADMAP_NODES.find((node) => node.topicId === mission?.topic || node.missionTopics?.includes(mission?.topic))
    || null;
}

/** Arena availability keeps its own mission and roadmap gates. */
export function isArenaBattleEligible(mission, progress) {
  const cleared = progress?.cleared || {};
  if (!mission || cleared[mission.id]) return false;

  const node = resolveRoadmapNodeForMission(mission);
  if (!node) return false;

  return isUnlocked(mission.id, cleared)
    && computeNodeState(node.id, cleared, progress?.skills || {}, progress?.topics || {}) !== 'LOCKED';
}

/** One authoritative view of the registered coding-mission count and saved clears. */
export function getArenaBattleSnapshot(progress, missions = MISSIONS) {
  const codingMissions = missions.filter((mission) => !!mission.problemFlow);
  const cleared = progress?.cleared || {};
  return {
    codingMissions,
    eligibleMissions: codingMissions.filter((mission) => isArenaBattleEligible(mission, progress)),
    clearedCount: codingMissions.filter((mission) => !!cleared[mission.id]).length,
  };
}

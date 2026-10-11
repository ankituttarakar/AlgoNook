// AlgoNook — mission registry: ordered campaign + unlock logic
import a from './a.js';
import b from './b.js';
import c from './c.js';
import d from './d.js';
import e from './e.js';
import { TOPICS } from '../topics.js';
import { CODING_PROBLEMS, makeCodingMission } from '../codingProblems.js';

const chapterCodingMissions = CODING_PROBLEMS.map(makeCodingMission);

// Campaign order follows TOPICS order: all missions of sector 1, then 2, ...
const byTopic = {};
for (const m of [...a, ...b, ...c, ...d, ...e]) {
  (byTopic[m.topic] ||= []).push(m);
}

export const MISSIONS = [...TOPICS.flatMap((t) => byTopic[t.id] || []), ...chapterCodingMissions];
export const MISSION_MAP = Object.fromEntries(MISSIONS.map((m) => [m.id, m]));

export function missionsOfTopic(topicId) {
  const exactChapter = chapterCodingMissions.filter((mission) => mission.chapter === topicId);
  const byContentTopic = chapterCodingMissions.filter((mission) => mission.topic === topicId && !chapterCodingMissions.some((item) => item.chapter === topicId));
  return [...(byTopic[topicId] || []), ...exactChapter, ...byContentTopic];
}

/** Linear campaign: mission i is unlocked when mission i−1 is cleared. */
export function isUnlocked(missionId, cleared) {
  const mission = MISSION_MAP[missionId];
  if (mission?.codingProblem) {
    const chapterMissions = byTopic[mission.topic] || [];
    return chapterMissions.filter((item) => !item.codingProblem).every((item) => !!cleared[item.id]);
  }
  const idx = MISSIONS.findIndex((m) => m.id === missionId);
  if (idx <= 0) return true;
  return !!cleared[MISSIONS[idx - 1].id];
}

export function nextMission(currentId, cleared) {
  const idx = MISSIONS.findIndex((m) => m.id === currentId);
  for (let i = idx + 1; i < MISSIONS.length; i++) {
    if (!cleared[MISSIONS[i].id]) return MISSIONS[i];
  }
  return null;
}

export function isTopicCleared(topicId, cleared) {
  return missionsOfTopic(topicId).every((m) => cleared[m.id]);
}

export function isGameCleared(cleared) {
  return MISSIONS.every((m) => cleared[m.id]);
}

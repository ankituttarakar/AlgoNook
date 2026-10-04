// AlgoNook — mission registry: ordered campaign + unlock logic
import a from './a.js';
import b from './b.js';
import c from './c.js';
import d from './d.js';
import e from './e.js';
import { TOPICS } from '../topics.js';

// Campaign order follows TOPICS order: all missions of sector 1, then 2, ...
const byTopic = {};
for (const m of [...a, ...b, ...c, ...d, ...e]) {
  (byTopic[m.topic] ||= []).push(m);
}

export const MISSIONS = TOPICS.flatMap((t) => byTopic[t.id] || []);
export const MISSION_MAP = Object.fromEntries(MISSIONS.map((m) => [m.id, m]));

export function missionsOfTopic(topicId) {
  return byTopic[topicId] || [];
}

/** Linear campaign: mission i is unlocked when mission i−1 is cleared. */
export function isUnlocked(missionId, cleared) {
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

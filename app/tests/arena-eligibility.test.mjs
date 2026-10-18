import assert from 'node:assert/strict';
import test from 'node:test';
import { CODING_CHALLENGES } from '../src/data/challengeCatalogue.js';
import { MISSIONS } from '../src/data/missions/index.js';
import { getArenaBattleSnapshot, isArenaBattleEligible, resolveRoadmapNodeForMission } from '../src/data/missionEligibility.js';
import { GAME_LAB_BY_NODE } from '../src/data/games/index.js';
import { ROADMAP_NODES } from '../src/data/roadmap.js';

const codingMissions = MISSIONS.filter((mission) => mission.problemFlow);

test('Arena and Challenge Area use the same explicit roadmap node resolution', () => {
  assert.equal(codingMissions.length, 18);
  for (const mission of CODING_CHALLENGES) {
    const node = resolveRoadmapNodeForMission(mission);
    assert.ok(node, `${mission.id} resolves to a registered roadmap node`);
    if (mission.roadmapNodeId) assert.equal(node.id, mission.roadmapNodeId);
    else if (mission.chapter && ROADMAP_NODES.some(({ id }) => id === mission.chapter)) assert.equal(node.id, mission.chapter);
  }

  const windowMission = codingMissions.find(({ id }) => id === 'code-window-max-sum');
  assert.equal(resolveRoadmapNodeForMission(windowMission)?.id, 'sliding-window');
  const mergeSortMission = codingMissions.find(({ id }) => id === 'code-merge-sort-values');
  assert.equal(mergeSortMission.roadmapNodeId, 'arrays');
  assert.equal(resolveRoadmapNodeForMission(mergeSortMission)?.id, 'arrays');
});

test('Arena keeps battles locked until both the mission and roadmap prerequisites are satisfied', () => {
  const mission = codingMissions.find(({ id }) => id === 'code-window-max-sum');
  assert.equal(isArenaBattleEligible(mission, {}), false);

  const cleared = Object.fromEntries(MISSIONS.filter(({ id }) => id !== mission.id).map(({ id }) => [id, true]));
  const topics = Object.fromEntries(Object.keys(GAME_LAB_BY_NODE).map((id) => [id, { stages: { game: true } }]));
  assert.equal(isArenaBattleEligible(mission, { cleared, topics, skills: {} }), true);
  assert.equal(isArenaBattleEligible(mission, { cleared: { ...cleared, [mission.id]: true }, topics, skills: {} }), false);
});

test('fresh progress yields the truthful empty state and catalogue-based clear count', () => {
  const snapshot = getArenaBattleSnapshot({ cleared: {}, skills: {}, topics: {} });
  assert.equal(snapshot.codingMissions.length, 18);
  assert.equal(snapshot.eligibleMissions.length, 0);
  assert.equal(snapshot.clearedCount, 0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { TOPICS } from '../src/data/topics.js';
import { MISSION_MAP, missionsOfTopic } from '../src/data/missions/index.js';
import { TWO_SUM_SORTED_PROBLEM } from '../api/code/problems/twoSumSorted.mjs';
import { getPracticeForNode } from '../src/data/practice.js';
import { GAME_LAB_BY_NODE } from '../src/data/games/index.js';
import { ROADMAP_NODE_MAP } from '../src/data/roadmap.js';

test('Two Pointers is its own roadmap mission topic and complete flow', () => {
  assert.equal(TOPICS.filter(({ id }) => id === 'two-pointers').length, 1);
  assert.equal(ROADMAP_NODE_MAP['two-pointers'].topicId, 'two-pointers');
  const mission = MISSION_MAP['arr-2'];
  assert.equal(mission.topic, 'two-pointers');
  assert.equal(mission.skill, 'two-pointers-pair-sum');
  assert.deepEqual(mission.problemFlow.steps.map(({ id }) => id), ['problem', 'pattern', 'complexity', 'algorithm', 'implementation', 'tests', 'explain', 'transfer']);
  assert.equal(missionsOfTopic('two-pointers').some(({ id }) => id === 'arr-2'), true);
});

test('Two Pointers has trusted, server-owned sorted-pair cases', () => {
  assert.equal(Object.isFrozen(TWO_SUM_SORTED_PROBLEM), true);
  assert.equal(TWO_SUM_SORTED_PROBLEM.testCases.length, 5);
  assert.deepEqual(TWO_SUM_SORTED_PROBLEM.testCases.find(({ id }) => id === 'no-pair').expected, []);
  assert.deepEqual(TWO_SUM_SORTED_PROBLEM.testCases.find(({ id }) => id === 'duplicate-values-distinct-indices').expected, [0, 1]);
});

test('reasoning lab and practice cover pair movement and complexity', () => {
  const game = GAME_LAB_BY_NODE['two-pointers'];
  assert.equal(game.stages.length >= 3, true);
  assert.ok(game.stages.some(({ prompt }) => /move/i.test(prompt)));
  assert.equal(getPracticeForNode('two-pointers').length >= 4, true);
});

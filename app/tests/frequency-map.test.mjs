import test from 'node:test';
import assert from 'node:assert/strict';
import { FREQUENCY_MAP_PROBLEM } from '../api/code/problems/frequencyMap.mjs';
import { GAME_LAB_BY_NODE } from '../src/data/games/index.js';
import { getPatternForNode } from '../src/data/patterns.js';
import { getPracticeForNode } from '../src/data/practice.js';
import { MISSION_MAP } from '../src/data/missions/index.js';

test('Hashing includes frequency map test cases for empty, repeated, and case-sensitive input', () => {
  const byId = Object.fromEntries(FREQUENCY_MAP_PROBLEM.testCases.map((item) => [item.id, item]));
  assert.deepEqual(byId['empty-input'].expected, {});
  assert.deepEqual(byId['repeated-key'].expected, { pear: 2, plum: 1 });
  assert.deepEqual(byId['case-sensitive-keys'].expected, { A: 2, a: 1 });
  assert.ok(Object.isFrozen(FREQUENCY_MAP_PROBLEM.testCases));
  assert.ok(FREQUENCY_MAP_PROBLEM.testCases.every((item) => Object.isFrozen(item.values) && Object.isFrozen(item.expected)));
});

test('Hashing keeps its reasoning lab, pattern, practice, and a trusted frequency coding mission', () => {
  assert.equal(GAME_LAB_BY_NODE.hashing.topicId, 'hashing');
  assert.ok(getPatternForNode('hashing'));
  assert.ok(getPracticeForNode('hashing').length >= 3);
  assert.equal(MISSION_MAP['hsh-1'].learningFlow, true);
  assert.equal(MISSION_MAP['hsh-1'].skill, 'hashing-frequency');
  assert.ok(MISSION_MAP['hsh-1'].problemFlow.steps.some((step) => step.type === 'implementation' && step.challenge.problemId === FREQUENCY_MAP_PROBLEM.id));
  assert.ok(MISSION_MAP['hsh-1'].problemFlow.steps.some((step) => step.id === 'transfer'));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { TOPICS } from '../src/data/topics.js';
import { CODING_CHALLENGES, filterCodingChallenges, getChallengeStatus } from '../src/data/challengeCatalogue.js';
import { CODING_PROBLEMS, makeCodingMission } from '../src/data/codingProblems.js';
import { MISSION_MAP, MISSIONS } from '../src/data/missions/index.js';
import { GAME_LAB_BY_NODE } from '../src/data/games/index.js';
import { ROADMAP_NODES } from '../src/data/roadmap.js';
import { getCodeProblemById } from '../server/code/problems/index.mjs';
import { HIDDEN_CHALLENGE_CASES } from '../server/code/problems/hiddenCases.mjs';

test('every supported curriculum topic has a registered executable challenge', () => {
  const covered = new Set(CODING_CHALLENGES.map((mission) => mission.topic));
  assert.deepEqual(TOPICS.filter(({ id }) => !covered.has(id)).map(({ id }) => id), []);
  assert.ok(CODING_CHALLENGES.every((mission) => {
    const implementation = mission.problemFlow.steps.find((step) => step.type === 'implementation');
    return !!implementation?.challenge?.problemId && !!getCodeProblemById(implementation.challenge.problemId);
  }));
  assert.ok(CODING_CHALLENGES.every((mission) => ROADMAP_NODES.some((node) => node.id === mission.roadmapNodeId
    || node.id === mission.chapter || node.topicId === mission.topic || node.missionTopics?.includes(mission.topic))));
});

test('catalogue metadata and stable IDs satisfy the trusted problem schema', () => {
  assert.equal(new Set(CODING_PROBLEMS.map(({ id }) => id)).size, CODING_PROBLEMS.length);
  for (const problem of CODING_PROBLEMS) {
    assert.ok(problem.id && problem.title && problem.topic && problem.skill);
    assert.ok(problem.statement && problem.prompt && problem.intuition);
    assert.ok(problem.constraints.length > 0 && problem.examples.length > 0 && problem.cases.length >= 3);
    assert.ok(['Easy', 'Medium', 'Hard'].includes(problem.difficulty || 'Easy'));
    assert.ok(problem.cases.every(({ id, expected }) => id && expected !== undefined));
    const mission = makeCodingMission(problem);
    const statement = mission.problemFlow.steps.find((step) => step.type === 'problem');
    assert.ok(statement.statement && statement.constraints.length && statement.examples.length);
    assert.equal(mission.problemFlow.difficulty, problem.difficulty || 'Easy');
    assert.ok(mission.problemFlow.steps.some((step) => step.id === 'explain'));
    assert.ok(mission.problemFlow.steps.some((step) => step.id === 'transfer'));
  }
});

test('supplemental trusted edge cases remain server-owned and are not copied into the client catalogue', () => {
  for (const [problemId, cases] of Object.entries(HIDDEN_CHALLENGE_CASES)) {
    const visibleProblem = CODING_PROBLEMS.find((problem) => problem.id === problemId);
    const trustedProblem = getCodeProblemById(problemId);
    assert.ok(visibleProblem && trustedProblem);
    assert.ok(cases.every((item) => !visibleProblem.cases.some((visible) => visible.id === item.id)));
    assert.ok(cases.every((item) => trustedProblem.testCases.some((trusted) => trusted.id === item.id)));
  }
});

test('topic and difficulty filters return matching challenges without stale selections', () => {
  const all = CODING_CHALLENGES.map((mission) => ({ mission, eligibility: { status: 'available' } }));
  const stacks = filterCodingChallenges(all, { topic: 'stacks' });
  assert.ok(stacks.length > 0);
  assert.ok(stacks.every(({ mission }) => mission.topic === 'stacks'));
  const hard = filterCodingChallenges(all, { difficulty: 'Hard' });
  assert.ok(hard.length > 0);
  assert.ok(hard.every(({ mission }) => mission.problemFlow.difficulty === 'Hard'));
  assert.equal(filterCodingChallenges(all, { topic: 'stacks', difficulty: 'Hard' }).length, 0);
  assert.equal(filterCodingChallenges(all, { topic: 'all', difficulty: 'all' }).length, CODING_CHALLENGES.length);
});

test('the screen filter accepts the raw catalogue before eligibility is calculated', () => {
  const topic = 'arrays';
  const allLevels = filterCodingChallenges(CODING_CHALLENGES, { topic });
  assert.ok(allLevels.length > 0);
  assert.ok(allLevels.every((mission) => mission.topic === topic));
  for (const difficulty of ['Easy', 'Medium', 'Hard']) {
    const matches = filterCodingChallenges(CODING_CHALLENGES, { topic, difficulty });
    assert.ok(matches.every((mission) => mission.topic === topic && mission.problemFlow.difficulty === difficulty));
  }
  assert.equal(filterCodingChallenges(CODING_CHALLENGES, { topic, difficulty: 'all' }).length, allLevels.length);
});

test('blocked Stacks challenges explain the roadmap prerequisite and open after authoritative prerequisites clear', () => {
  const stackChallenge = MISSION_MAP['code-valid-parentheses'];
  const empty = getChallengeStatus(stackChallenge, {});
  assert.equal(empty.status, 'locked');
  assert.ok(empty.prerequisites.length > 0);
  assert.ok(empty.prerequisites.every((item) => item.id));

  const cleared = Object.fromEntries(MISSIONS.filter((mission) => mission.id !== stackChallenge.id).map((mission) => [mission.id, true]));
  const topics = Object.fromEntries(Object.keys(GAME_LAB_BY_NODE).map((nodeId) => [nodeId, { stages: { game: true } }]));
  assert.equal(getChallengeStatus(stackChallenge, { cleared, topics, skills: {} }).status, 'available');
  assert.equal(getChallengeStatus(stackChallenge, { cleared: { ...cleared, [stackChallenge.id]: true }, topics, skills: {} }).status, 'cleared');
  assert.ok(ROADMAP_NODES.some((node) => node.id === 'stacks-queues'));
});

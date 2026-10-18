import assert from 'node:assert/strict';
import test from 'node:test';
import { MISSION_MAP } from '../src/data/missions/index.js';
import {
  ARENA_ORIGIN,
  CHALLENGES_ORIGIN,
  appendWorkflowOrigin,
  createNavigationRequest,
  getChallengeWorkflowHeader,
  getWorkflowHeader,
  getMissionReturnTarget,
  getNavigationOrigin,
} from '../src/lib/navigationOrigin.mjs';

const mission = MISSION_MAP['code-kth-largest'];

test('Challenges launch builds a refresh-safe briefing and coding URL', () => {
  assert.equal(appendWorkflowOrigin('/challenge/code-kth-largest/brief', CHALLENGES_ORIGIN), '/challenge/code-kth-largest/brief?from=challenges');
  assert.equal(getNavigationOrigin('?from=challenges'), CHALLENGES_ORIGIN);
  assert.equal(getNavigationOrigin('?from=other'), null);
  assert.equal(appendWorkflowOrigin('/challenge/code-kth-largest/run', CHALLENGES_ORIGIN), '/challenge/code-kth-largest/run?from=challenges');
});

test('challenge-origin workflow keeps Challenges selected and labels the shared coding lab', () => {
  for (const screen of ['brief', 'run', 'debrief']) {
    assert.deepEqual(getChallengeWorkflowHeader(CHALLENGES_ORIGIN, screen), {
      location: 'Challenge Coding Lab',
      activeNavigation: 'challenges',
    });
  }
  assert.equal(getChallengeWorkflowHeader(null, 'run'), null);
  assert.equal(getChallengeWorkflowHeader(CHALLENGES_ORIGIN, 'practice'), null);
});

test('Arena-origin workflow keeps Battlefield Arena selected through briefing, coding, and results', () => {
  for (const screen of ['brief', 'run', 'debrief']) {
    assert.deepEqual(getWorkflowHeader(ARENA_ORIGIN, screen), {
      location: 'Battlefield Coding Lab',
      activeNavigation: 'arena',
    });
  }
  assert.equal(appendWorkflowOrigin('/challenge/code-kth-largest/brief', ARENA_ORIGIN), '/challenge/code-kth-largest/brief?from=arena');
  assert.equal(appendWorkflowOrigin('/challenge/code-kth-largest/run', ARENA_ORIGIN), '/challenge/code-kth-largest/run?from=arena');
  assert.equal(appendWorkflowOrigin('/results', ARENA_ORIGIN), '/results?from=arena');
  assert.equal(getNavigationOrigin('?from=arena'), ARENA_ORIGIN);
  assert.equal(getMissionReturnTarget(ARENA_ORIGIN, 'roadmap'), 'arena');
  assert.equal(getMissionReturnTarget(ARENA_ORIGIN, null), 'arena');
});

test('challenge abort, briefing back, and result map return to Challenges', () => {
  assert.equal(getMissionReturnTarget(CHALLENGES_ORIGIN, 'heaps'), 'challenges', 'brief back and workflow abort');
  assert.equal(getMissionReturnTarget(CHALLENGES_ORIGIN, 'roadmap'), 'challenges', 'result map button');
  assert.equal(appendWorkflowOrigin('/results', CHALLENGES_ORIGIN), '/results?from=challenges');
  assert.equal(getNavigationOrigin('?from=challenges'), CHALLENGES_ORIGIN);
  assert.equal(getMissionReturnTarget(null, 'heaps'), 'heaps');
  assert.equal(getMissionReturnTarget(null, 'roadmap'), 'roadmap');
});

test('completion keeps the result payload while the URL records the challenge origin', () => {
  const result = { mission, stars: 3, bonus: 40, total: 40 };
  const request = createNavigationRequest(appendWorkflowOrigin('/results', CHALLENGES_ORIGIN), 'debrief', { result });
  assert.equal(request.path, '/results?from=challenges');
  assert.equal(request.state.result, result);
});

test('normal Practice and Roadmap mission URLs keep their existing destinations', () => {
  assert.equal(appendWorkflowOrigin('/challenge/code-kth-largest/run', null), '/challenge/code-kth-largest/run');
  assert.equal(appendWorkflowOrigin('/challenge/code-kth-largest/brief', null), '/challenge/code-kth-largest/brief');
  assert.equal(getNavigationOrigin(''), null);
  assert.equal(getNavigationOrigin('?topic=arrays'), null);
  assert.equal(appendWorkflowOrigin('/topic/arrays/practice', null), '/topic/arrays/practice');
  assert.equal(getMissionReturnTarget(null, 'topic'), 'topic');
  assert.equal(getMissionReturnTarget(null, 'roadmap'), 'roadmap');
  assert.equal(getWorkflowHeader(null, 'run'), null);
});

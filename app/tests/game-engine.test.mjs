import test from 'node:test';
import assert from 'node:assert/strict';
import { ARRAYS_GAME_LAB } from '../src/data/games/arrays.js';
import { GAME_LAB_BY_NODE } from '../src/data/games/index.js';
import { evaluateGameAnswer, GAME_STAGE_TYPES } from '../src/game/engine.js';
import { shuffleAnswerOptions } from '../src/game/answerOptions.js';
import { ROADMAP_NODES } from '../src/data/roadmap.js';

test('Arrays game defines one stage for every supported reasoning task', () => {
  assert.deepEqual(ARRAYS_GAME_LAB.stages.map((stage) => stage.type), GAME_STAGE_TYPES);
});

test('each implemented roadmap topic has a non-empty, supported reasoning lab', () => {
  assert.deepEqual(Object.keys(GAME_LAB_BY_NODE).sort(), ROADMAP_NODES.map((node) => node.id).sort());
  for (const [nodeId, lab] of Object.entries(GAME_LAB_BY_NODE)) {
    assert.equal(lab.topicId, nodeId);
    assert.ok(lab.stages.length > 0);
    for (const stage of lab.stages) {
      assert.ok(GAME_STAGE_TYPES.includes(stage.type), `${nodeId}: ${stage.type}`);
      assert.ok(stage.prompt && stage.explanation && stage.retryFeedback, `${nodeId}: ${stage.id} feedback`);
      assert.ok(stage.hints?.length, `${nodeId}: ${stage.id} hints`);
    }
  }
});

test('all multiple-choice reasoning stages distinguish correct answers from distractors', () => {
  for (const stage of ARRAYS_GAME_LAB.stages.filter((item) => item.options)) {
    assert.equal(evaluateGameAnswer(stage, stage.answerId).correct, true, stage.id);
    const wrong = stage.options.find((option) => option.id !== stage.answerId);
    assert.equal(evaluateGameAnswer(stage, wrong.id).correct, false, stage.id);
  }
});

test('build stage only accepts the next invariant-preserving step', () => {
  const stage = ARRAYS_GAME_LAB.stages.find((item) => item.type === 'build');
  assert.equal(evaluateGameAnswer(stage, { candidateId: 'initialize', position: 0 }).correct, true);
  assert.equal(evaluateGameAnswer(stage, { candidateId: 'insert', position: 0 }).correct, false);
  assert.equal(evaluateGameAnswer(stage, { candidateId: 'iterate', position: 1 }).correct, true);
});

test('typed answers are normalized and matched against accepted answers', () => {
  const stage = ARRAYS_GAME_LAB.stages.find((item) => item.type === 'predict');
  assert.equal(evaluateGameAnswer(stage, ' TRUE ').correct, true);
  assert.equal(evaluateGameAnswer(stage, 'false').correct, false);
});

test('shuffled choices cannot leave the correct option in position one', () => {
  const options = [{ id: 'right', correct: true }, { id: 'wrong', correct: false }];
  const shuffled = shuffleAnswerOptions(options, () => 0.99);
  assert.equal(shuffled[0].correct, false);
  assert.equal(options[0].correct, true, 'shuffle must not mutate source data');
  const multipleCorrect = shuffleAnswerOptions([
    { id: 'right-a', correct: true },
    { id: 'right-b', correct: true },
    { id: 'wrong', correct: false },
  ], () => 0.99);
  assert.equal(multipleCorrect[0].correct, false);
});

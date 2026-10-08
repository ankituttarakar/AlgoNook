export const GAME_STAGE_TYPES = Object.freeze([
  'trace',
  'predict',
  'build',
  'repair',
  'debug',
  'complexity-duel',
  'pattern-match',
  'constraint-challenge',
]);

export function normalizeGameAnswer(answer) {
  return String(answer ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function evaluateGameAnswer(stage, answer) {
  if (!stage || !GAME_STAGE_TYPES.includes(stage.type)) {
    return { correct: false, feedback: 'This game stage is not configured.' };
  }

  if (stage.type === 'build') {
    const nextExpectedId = stage.expectedOrder?.[answer.position];
    const correct = answer.candidateId === nextExpectedId;
    return {
      correct,
      feedback: correct
        ? `Step ${answer.position + 1} fits the invariant.`
        : stage.retryFeedback,
    };
  }

  if (stage.options) {
    const option = stage.options.find((item) => item.id === answer);
    return {
      correct: option?.id === stage.answerId,
      feedback: option?.feedback || stage.retryFeedback,
    };
  }

  const normalized = normalizeGameAnswer(answer);
  const accepted = (stage.acceptedAnswers || []).map(normalizeGameAnswer);
  const correct = accepted.includes(normalized);
  return { correct, feedback: correct ? stage.explanation : stage.retryFeedback };
}

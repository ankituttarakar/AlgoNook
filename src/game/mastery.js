// AlgoNook — Skill Mastery & Spaced Review System
// Implements 5-tier mastery ladder & review intervals:
// introduced -> guided -> practicing -> independent -> retained

export const MASTERY_LEVELS = [
  'introduced',
  'guided',
  'practicing',
  'independent',
  'retained',
];

export const MASTERY_TITLES = {
  introduced: 'INTRODUCED',
  guided: 'GUIDED',
  practicing: 'PRACTICING',
  independent: 'INDEPENDENT',
  retained: 'RETAINED',
};

export const MASTERY_COLORS = {
  introduced: 'text-zinc-400 border-zinc-700 bg-zinc-900/50',
  guided: 'text-cyan-400 border-cyan-800 bg-cyan-950/40',
  practicing: 'text-[var(--bb-amber)] border-[var(--bb-amber)]/40 bg-[rgba(255,176,0,0.08)]',
  independent: 'text-[var(--bb-green)] border-[var(--bb-green-dim)] bg-[rgba(0,244,142,0.08)]',
  retained: 'text-purple-400 border-purple-600 bg-purple-950/40 bb-glow',
};

// Review intervals in days: 1d -> 3d -> 7d -> 14d
export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14];

export function createDefaultSkillState(skillId) {
  return {
    skill: skillId,
    lastPracticed: null,
    masteryLevel: 'introduced',
    hintUsage: {
      totalHintsUsed: 0,
      highestLevelHintRevealed: 0,
      ladderReveals: [0, 0, 0, 0, 0, 0], // counts for levels 1 to 6
    },
    attempts: 0,
    successfulIndependentSolves: 0,
    reviewDue: null,
  };
}

/**
 * Calculates updated skill mastery after a mission/challenge run.
 * Rules:
 * - Do NOT award mastery simply because a mission was completed.
 * - If highest hint level revealed <= 1 (only goal reminder or none) and no wrong code attempts:
 *     independent solve counter advances.
 * - Mastery moves up when criteria met:
 *     introduced -> guided (first guided interaction cleared)
 *     guided -> practicing (attempted & solved with moderate scaffolding)
 *     practicing -> independent (solved without high hints: level <= 2, explanation correct, transfer passed)
 *     independent -> retained (multiple independent solves or successful review solve)
 */
export function updateSkillRecord(prevRecord = {}, sessionStats = {}) {
  const record = {
    ...createDefaultSkillState(sessionStats.skill || 'linear-search'),
    ...prevRecord,
  };

  const now = Date.now();
  const {
    maxHintLevelUsed = 0,
    explanationCorrect = false,
    transferPassed = false,
    solvePassed = true,
    mistakes = 0,
  } = sessionStats;

  record.attempts += 1;
  record.lastPracticed = now;

  // Track hint usage
  if (maxHintLevelUsed > 0) {
    record.hintUsage.totalHintsUsed += 1;
    record.hintUsage.highestLevelHintRevealed = Math.max(
      record.hintUsage.highestLevelHintRevealed,
      maxHintLevelUsed
    );
    if (maxHintLevelUsed <= 6) {
      record.hintUsage.ladderReveals[maxHintLevelUsed - 1] =
        (record.hintUsage.ladderReveals[maxHintLevelUsed - 1] || 0) + 1;
    }
  }

  // Check independent solve quality:
  // Independent means no high level hints (maxHintLevelUsed <= 2), no coding stumbles, good explanation & transfer
  const isIndependentSolve =
    solvePassed &&
    maxHintLevelUsed <= 2 &&
    mistakes === 0 &&
    explanationCorrect &&
    transferPassed;

  if (isIndependentSolve) {
    record.successfulIndependentSolves += 1;
  }

  // Progressive mastery calculation:
  const currentIdx = MASTERY_LEVELS.indexOf(record.masteryLevel);
  let newLevel = record.masteryLevel;

  if (currentIdx === 0) {
    // introduced -> guided upon completing the guided run
    if (solvePassed) newLevel = 'guided';
  } else if (currentIdx === 1) {
    // guided -> practicing if they practiced and understood explanation
    if (solvePassed && explanationCorrect) {
      newLevel = 'practicing';
    }
  } else if (currentIdx === 2) {
    // practicing -> independent requires genuine independent solve
    if (record.successfulIndependentSolves >= 1 && explanationCorrect && transferPassed) {
      newLevel = 'independent';
    }
  } else if (currentIdx === 3) {
    // independent -> retained requires multiple independent solves or spacing
    if (record.successfulIndependentSolves >= 3) {
      newLevel = 'retained';
    }
  }

  record.masteryLevel = newLevel;

  // Review interval calculation (1, 3, 7, 14 days based on mastery level)
  const intervalIndex = Math.min(
    Math.max(0, MASTERY_LEVELS.indexOf(newLevel) - 1),
    REVIEW_INTERVALS_DAYS.length - 1
  );
  const daysToAdd = REVIEW_INTERVALS_DAYS[intervalIndex] || 1;
  record.reviewDue = now + daysToAdd * 24 * 60 * 60 * 1000;

  return record;
}

export function isSkillReviewDue(record) {
  if (!record || !record.reviewDue) return false;
  return Date.now() >= record.reviewDue;
}

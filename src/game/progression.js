// AlgoNook — progression math (pure functions, no side effects)

export const XP_BY_DIFFICULTY = { easy: 20, med: 35, hard: 55 };
export const MISSION_BONUS = 40;
export const STREAK_STEP = 5;
export const STREAK_CAP = 20;
export const RETRY_FACTOR = 0.4;   // correct after a wrong first try
export const HINT_FACTOR = 0.6;    // hint used on a first-try solve
export const REPLAY_FACTOR = 0.25; // replaying an already-cleared mission

// XP needed to *reach* a given level (cumulative threshold)
export function xpForLevel(level) {
  return 50 * (level - 1) * level;
}

export function levelFromXp(xp) {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

export function levelProgress(xp) {
  const level = levelFromXp(xp);
  const cur = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, cur, next, into: xp - cur, span: next - cur };
}

export const LEVEL_TITLES = [
  'NULL POINTER', 'BOOTLOADER', 'SCRIPT RUNNER', 'DEBUG UNIT',
  'POINTER CHASER', 'STACK SURFER', 'HASH RUNNER', 'TREE CLIMBER',
  'GRAPH WALKER', 'ALGORITHM ADEPT', 'OPTIMIZER', 'KERNEL MIND',
  'ALGONOOK MASTER', 'LEGEND OF THE MAINFRAME',
];

export function levelTitle(level) {
  return LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length) - 1];
}

/**
 * XP awarded for a single challenge outcome.
 * @param difficulty 'easy'|'med'|'hard'
 * @param firstTry   solved without a prior wrong attempt
 * @param hintUsed   hint was revealed before solving
 * @param streak     current first-try streak (0-based count before this solve)
 * @param replay     mission was already cleared before
 */
export function challengeXp(difficulty, { firstTry, hintUsed, streak, replay }) {
  const base = XP_BY_DIFFICULTY[difficulty] || XP_BY_DIFFICULTY.easy;
  let xp;
  if (!firstTry) xp = Math.round(base * RETRY_FACTOR);
  else if (hintUsed) xp = Math.round(base * HINT_FACTOR);
  else xp = base + Math.min(streak * STREAK_STEP, STREAK_CAP);
  if (replay) xp = Math.max(1, Math.round(xp * REPLAY_FACTOR));
  return xp;
}

/** Stars for a finished mission: 3 = flawless, 2 = <=2 stumbles, 1 = cleared */
export function missionStars(mistakes) {
  if (mistakes === 0) return 3;
  if (mistakes <= 2) return 2;
  return 1;
}

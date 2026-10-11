// AlgoNook — level display math; XP awards are calculated by the server.

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

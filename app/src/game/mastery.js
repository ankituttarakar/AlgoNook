// Client-side mastery labels; mastery changes are derived by the server.

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

export function isSkillReviewDue(record) {
  if (!record || !record.reviewDue) return false;
  return Date.now() >= record.reviewDue;
}

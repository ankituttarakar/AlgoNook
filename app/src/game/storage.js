// AlgoNook — localStorage persistence with safe fallback and backward-compatible migration
const NEW_KEY = 'algonook.save.v1';
const OLD_KEY = 'bytebound.save.v1';

const DEFAULT_SAVE = {
  callsign: 'OPERATOR',
  xp: 0,
  sound: true,
  // missions: { [missionId]: { stars, mistakes, clearedAt } }
  missions: {},
  // skills: { [skillId]: { skill, lastPracticed, masteryLevel, hintUsage, attempts, successfulIndependentSolves, reviewDue } }
  skills: {},
  booted: false, // has the player seen the boot screen
};

export function loadSave() {
  try {
    let raw = localStorage.getItem(NEW_KEY);
    // Backward-compatible fallback & migration from legacy key
    if (!raw) {
      const oldRaw = localStorage.getItem(OLD_KEY);
      if (oldRaw) {
        raw = oldRaw;
        // Save forward to the new key
        try {
          localStorage.setItem(NEW_KEY, oldRaw);
        } catch { /* noop */ }
      }
    }

    if (!raw) return { ...DEFAULT_SAVE };
    const parsed = JSON.parse(raw);
    // merge over defaults so older saves survive new fields
    return {
      ...DEFAULT_SAVE,
      ...parsed,
      missions: parsed.missions || {},
      skills: parsed.skills || {},
    };
  } catch {
    return { ...DEFAULT_SAVE };
  }
}

export function writeSave(save) {
  try {
    localStorage.setItem(NEW_KEY, JSON.stringify(save));
  } catch {
    // storage full / private mode — game keeps running in memory
  }
}

export function wipeSave() {
  try {
    localStorage.removeItem(NEW_KEY);
    localStorage.removeItem(OLD_KEY);
  } catch { /* noop */ }
  return { ...DEFAULT_SAVE };
}

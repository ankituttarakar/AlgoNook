// AlgoNook — global game state: save data + derived progression
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { loadSave, writeSave, wipeSave } from './storage.js';
import { levelFromXp, levelProgress, levelTitle } from './progression.js';
import { updateSkillRecord } from './mastery.js';
import { setSoundEnabled } from './sfx.js';

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [save, setSave] = useState(loadSave);

  // Persist on every change (refresh-safe)
  useEffect(() => {
    writeSave(save);
  }, [save]);

  useEffect(() => {
    setSoundEnabled(save.sound);
  }, [save.sound]);

  /** Award XP. Callers compute level-ups from xp before/after (pure). */
  const awardXp = useCallback((amount) => {
    setSave((s) => ({ ...s, xp: s.xp + amount }));
  }, []);

  /** Record a mission clear. Keeps the best star rating ever earned. */
  const completeMission = useCallback((missionId, stars, mistakes) => {
    setSave((s) => {
      const prev = s.missions[missionId];
      const best = prev ? Math.max(prev.stars, stars) : stars;
      return {
        ...s,
        missions: {
          ...s.missions,
          [missionId]: { stars: best, mistakes, clearedAt: Date.now() },
        },
      };
    });
  }, []);

  /** Update learning mastery and review tracking for a skill */
  const recordSkillSession = useCallback((skillId, sessionStats) => {
    setSave((s) => {
      const existing = (s.skills && s.skills[skillId]) || null;
      const updated = updateSkillRecord(existing, { ...sessionStats, skill: skillId });
      return {
        ...s,
        skills: {
          ...(s.skills || {}),
          [skillId]: updated,
        },
      };
    });
  }, []);

  const toggleSound = useCallback(() => {
    setSave((s) => ({ ...s, sound: !s.sound }));
  }, []);

  const setCallsign = useCallback((callsign) => {
    setSave((s) => ({ ...s, callsign: callsign.slice(0, 14).toUpperCase() || 'OPERATOR' }));
  }, []);

  const setBooted = useCallback(() => {
    setSave((s) => ({ ...s, booted: true }));
  }, []);

  const resetAll = useCallback(() => {
    setSave(wipeSave());
  }, []);

  const value = useMemo(() => {
    const cleared = save.missions;
    const clearedCount = Object.keys(cleared).length;
    const stars = Object.values(cleared).reduce((n, m) => n + (m.stars || 0), 0);
    const skills = save.skills || {};
    return {
      save,
      cleared,
      skills,
      clearedCount,
      totalStars: stars,
      level: levelFromXp(save.xp),
      levelInfo: levelProgress(save.xp),
      title: levelTitle(levelFromXp(save.xp)),
      awardXp,
      completeMission,
      recordSkillSession,
      toggleSound,
      setCallsign,
      setBooted,
      resetAll,
    };
  }, [save, awardXp, completeMission, recordSkillSession, toggleSound, setCallsign, setBooted, resetAll]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}

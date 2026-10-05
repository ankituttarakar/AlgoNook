// AlgoNook — global game state: save data + derived progression
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth, useUser } from '@clerk/react';
import { loadSave, writeSave, wipeSave } from './storage.js';
import { levelFromXp, levelProgress, levelTitle } from './progression.js';
import { updateSkillRecord } from './mastery.js';
import { setSoundEnabled } from './sfx.js';
import { loadUserProgress, saveUserProgress } from '../lib/db.ts';

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [save, setSave] = useState(loadSave);
  const { getToken } = useAuth();
  const { isSignedIn, user } = useUser();

  // Track the last XP value synchronized with Neon to avoid redundant writes
  const lastSyncedXpRef = useRef(null);
  const isInitialLoadDoneRef = useRef(false);

  // 1. Initial load from Neon when authenticated user mounts GameProvider
  useEffect(() => {
    let isCancelled = false;

    async function syncInitialProgress() {
      if (!isSignedIn) return;

      try {
        const res = await loadUserProgress(getToken);
        if (!isCancelled && res && res.ok && res.progress) {
          const serverXp = Number(res.progress.xp);
          const serverLevel = Number(res.progress.level);

          setSave((currentSave) => {
            // Keep the maximum of local and server XP if user gained XP offline, or adopt server
            const resolvedXp = Math.max(currentSave.xp || 0, serverXp);
            const resolvedLevel = Math.max(currentSave.level || 1, serverLevel, levelFromXp(resolvedXp));
            lastSyncedXpRef.current = resolvedXp;
            isInitialLoadDoneRef.current = true;

            return {
              ...currentSave,
              xp: resolvedXp,
              level: resolvedLevel,
            };
          });
        } else {
          isInitialLoadDoneRef.current = true;
        }
      } catch (err) {
        console.warn('[GameContext] Error loading user progress from Neon:', err);
        isInitialLoadDoneRef.current = true;
      }
    }

    syncInitialProgress();

    return () => {
      isCancelled = true;
    };
  }, [isSignedIn, user?.id, getToken]);

  // 2. Persist to localStorage on every change (local fallback & temporary cache)
  useEffect(() => {
    writeSave(save);
  }, [save]);

  // 3. Persist XP & level changes to Neon when XP changes, preventing redundant writes
  useEffect(() => {
    // Only save if initial fetch completed, user is signed in, and XP changed from last synchronized value
    if (!isSignedIn || !isInitialLoadDoneRef.current) return;
    if (lastSyncedXpRef.current === save.xp) return;

    const targetXp = save.xp;
    const targetLevel = levelFromXp(targetXp);

    const timer = setTimeout(async () => {
      try {
        const res = await saveUserProgress({ xp: targetXp, level: targetLevel }, getToken);
        if (res && res.ok) {
          lastSyncedXpRef.current = targetXp;
        }
      } catch (err) {
        console.warn('[GameContext] Error persisting progress to Neon:', err);
      }
    }, 600); // Debounce to coalesce rapid XP increases and prevent writes on every React render

    return () => clearTimeout(timer);
  }, [save.xp, isSignedIn, getToken]);

  useEffect(() => {
    setSoundEnabled(save.sound);
  }, [save.sound]);

  /** Award XP. Callers compute level-ups from xp before/after (pure). */
  const awardXp = useCallback((amount) => {
    setSave((s) => {
      const nextXp = s.xp + amount;
      return {
        ...s,
        xp: nextXp,
        level: levelFromXp(nextXp),
      };
    });
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
    lastSyncedXpRef.current = null;
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

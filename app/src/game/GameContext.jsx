// AlgoNook — global game state: Neon-authoritative save + derived progression.
//
// SOURCE OF TRUTH CONTRACT:
//   - For authenticated users, Neon Postgres is the SOLE authority for ALL progress
//     (xp, level, missions, skills, topics, sound, booted, callsign).
//   - localStorage is NEVER read as truth: initial state is empty, then REPLACED by
//     the server snapshot. localStorage is write-only cache (see storage.js).
//   - The app MUST NOT render progress UI until hydration completes ('ready').
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth, useUser } from '@clerk/react';
import { writeSave, wipeSave } from './storage.js';
import { levelFromXp, levelProgress, levelTitle } from './progression.js';
import { setSoundEnabled } from './sfx.js';
import { loadUserProgress, saveUserProgress, submitLearningEvent } from '../lib/db.ts';
import { DEFAULT_CALLSIGN, displayCallsign, normalizeCallsign } from '../lib/callsign.mjs';

const GameContext = createContext(null);

const EMPTY_SAVE = {
  callsign: DEFAULT_CALLSIGN,
  xp: 0,
  generation: 0,
  sound: true,
  missions: {},
  skills: {},
  topics: {},
  booted: false,
};

// Re-hydrate timing
const SYNC_DEBOUNCE_MS = 600;
const MAX_SYNC_BACKOFF_MS = 30000;

/** Preferences are client-editable; all progression is written by event endpoints. */
function buildServerPayload(save) {
  const callsign = normalizeCallsign(save.callsign);
  return {
    sound: !!save.sound,
    booted: !!save.booted,
    ...(callsign ? { callsign } : {}),
  };
}

/** Merge a server snapshot into a save object. Server wins on everything; missing keys keep defaults. */
function saveFromServerSnapshot(snapshot) {
  const progress = (snapshot && snapshot.progress) || {};
  const missions = {};
  for (const [missionId, m] of Object.entries((snapshot && snapshot.missions) || {})) {
    missions[missionId] = {
      stars: m.stars || 0,
      mistakes: m.mistakes ?? null,
      clearedAt: m.clearedAt ?? null,
    };
  }
  const skills = {};
  for (const [skillId, s] of Object.entries((snapshot && snapshot.skills) || {})) {
    skills[skillId] = {
      skill: skillId,
      lastPracticed: s.lastPracticed ?? null,
      masteryLevel: s.masteryLevel || 'introduced',
      hintUsage: {
        totalHintsUsed: (s.hintUsage && s.hintUsage.totalHintsUsed) || 0,
        highestLevelHintRevealed: (s.hintUsage && s.hintUsage.highestLevelHintRevealed) || 0,
        ladderReveals: (s.hintUsage && s.hintUsage.ladderReveals) || [0, 0, 0, 0, 0, 0],
      },
      attempts: s.attempts || 0,
      successfulIndependentSolves: s.successfulIndependentSolves || 0,
      reviewDue: s.reviewDue ?? null,
    };
  }
  const topics = {};
  for (const [nodeId, t] of Object.entries((snapshot && snapshot.topics) || {})) {
    topics[nodeId] = {
      stages: (t.stages && { ...t.stages }) || {},
      startedAt: t.startedAt ?? null,
      completedAt: t.completedAt ?? null,
    };
  }
  return {
    ...EMPTY_SAVE,
    xp: Math.max(0, Number(progress.xp) || 0),
    generation: Number.isSafeInteger(progress.generation) && progress.generation >= 0 ? progress.generation : 0,
    sound: progress.sound !== undefined ? !!progress.sound : true,
    booted: !!progress.booted,
    // Always coerce to a displayable, saveable value so a legacy DB row can
    // never produce a payload the API rejects (which would block all saves).
    callsign: displayCallsign(progress.callsign),
    missions,
    skills,
    topics,
  };
}

export function GameProvider({ children }) {
  const [save, setSave] = useState({ ...EMPTY_SAVE });
  const [hydration, setHydration] = useState('idle'); // idle | loading | ready | error
  const [syncStatus, setSyncStatus] = useState('idle'); // idle | syncing | synced | error
  const [syncError, setSyncError] = useState(null);
  const { getToken } = useAuth();
  const { isSignedIn, user } = useUser();
  const userIdRef = useRef(user?.id);
  userIdRef.current = user?.id;
  const hydrationAttemptRef = useRef(0);
  const snapshotUpdatedAtRef = useRef(0);

  const saveRef = useRef(save);
  saveRef.current = save;
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  // --- Serialized sync engine ---
  // Guarantees: one in-flight save at a time; stale responses can never mark
  // newer state as synced; dedupe avoids redundant writes; backoff on failure.
  const hydratedRef = useRef(false);
  const dirtyRef = useRef(false);
  const inFlightRef = useRef(false);
  const debounceTimerRef = useRef(null);
  const backoffRef = useRef(1000);
  const lastSyncedJsonRef = useRef('');
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const flushSync = useCallback(async (opts = {}) => {
    if (!hydratedRef.current || !isSignedInRef.current) return;
    if (inFlightRef.current) return; // current loop will re-flush when done

    const currentSave = saveRef.current;
    const payload = buildServerPayload(currentSave);
    const payloadJson = JSON.stringify(payload);
    // Dedupe: nothing changed since last successful sync.
    if (!dirtyRef.current || payloadJson === lastSyncedJsonRef.current) {
      dirtyRef.current = false;
      return;
    }

    inFlightRef.current = true;
    if (mountedRef.current) setSyncStatus('syncing');
    try {
      const res = await saveUserProgress(payload, getTokenRef.current, opts);
      if (res && res.ok) {
        lastSyncedJsonRef.current = payloadJson;
        backoffRef.current = 1000;
        if (mountedRef.current) {
          setSyncStatus('synced');
          setSyncError(null);
        }
        // If state changed while the request was in flight, flush the newest state.
        if (dirtyRef.current && JSON.stringify(buildServerPayload(saveRef.current)) !== lastSyncedJsonRef.current) {
          inFlightRef.current = false;
          flushSync(opts);
        } else {
          dirtyRef.current = false;
          inFlightRef.current = false;
        }
      } else {
        throw new Error((res && res.error) || 'Save failed');
      }
    } catch (err) {
      inFlightRef.current = false;
      const delay = Math.min(backoffRef.current, MAX_SYNC_BACKOFF_MS);
      backoffRef.current = Math.min(backoffRef.current * 2, MAX_SYNC_BACKOFF_MS);
      if (mountedRef.current) {
        setSyncStatus('error');
        setSyncError(err instanceof Error ? err.message : String(err));
      }
      // Keep dirty so we retry; schedule with backoff.
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        if (mountedRef.current) flushSync();
      }, delay);
    }
  }, []);

  const isSignedInRef = useRef(isSignedIn);
  isSignedInRef.current = isSignedIn;

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      flushSync();
    }, SYNC_DEBOUNCE_MS);
  }, [flushSync]);

  // Heartbeat: ensure dirty state eventually reaches the server even if a
  // debounce chain was dropped (tab backgrounding, timers throttled).
  useEffect(() => {
    const id = setInterval(() => {
      if (dirtyRef.current && !inFlightRef.current && hydratedRef.current) flushSync();
    }, 15000);
    return () => clearInterval(id);
  }, [flushSync]);

  // Retry hook for network recovery.
  useEffect(() => {
    const onOnline = () => {
      if (dirtyRef.current) flushSync();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [flushSync]);

  // --- Hydration: Neon is authoritative. State is REPLACED, never merged. ---
  const hydrate = useCallback(async () => {
    if (!isSignedInRef.current) return;
    const attempt = ++hydrationAttemptRef.current;
    const requestedUserId = userIdRef.current;
    setHydration('loading');
    setSyncStatus('syncing');
    try {
      const res = await loadUserProgress(getTokenRef.current);
      if (!mountedRef.current || attempt !== hydrationAttemptRef.current
        || requestedUserId !== userIdRef.current || !isSignedInRef.current) return;
      if (res && res.ok && res.snapshot) {
        const next = saveFromServerSnapshot(res.snapshot);
        let currentSnapshot = saveRef.current;
        if (res.snapshot.progress.updatedAt >= snapshotUpdatedAtRef.current) {
          snapshotUpdatedAtRef.current = res.snapshot.progress.updatedAt;
          setSave(next);
          writeSave(next); // cache only
          currentSnapshot = next;
        }
        hydratedRef.current = true;
        dirtyRef.current = false;
        lastSyncedJsonRef.current = JSON.stringify(buildServerPayload(currentSnapshot));
        setHydration('ready');
        setSyncStatus('synced');
        setSyncError(null);
      } else {
        hydratedRef.current = false;
        setHydration('error');
        setSyncStatus('error');
        setSyncError((res && res.error) || 'Failed to load progress');
      }
    } catch (err) {
      if (!mountedRef.current || attempt !== hydrationAttemptRef.current
        || requestedUserId !== userIdRef.current || !isSignedInRef.current) return;
      hydratedRef.current = false;
      setHydration('error');
      setSyncStatus('error');
      setSyncError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    if (isSignedIn && user?.id) {
      hydratedRef.current = false;
      dirtyRef.current = false;
      snapshotUpdatedAtRef.current = 0;
      hydrate();
    } else if (!isSignedIn) {
      // Signed out: nothing is rendered that consumes progress. Reset to empty
      // so a different user on this machine never sees someone else's state.
      hydratedRef.current = false;
      hydrationAttemptRef.current += 1;
      snapshotUpdatedAtRef.current = 0;
      dirtyRef.current = false;
      inFlightRef.current = false;
      lastSyncedJsonRef.current = '';
      setSave({ ...EMPTY_SAVE });
      setHydration('idle');
      setSyncStatus('idle');
      setSyncError(null);
    }
  }, [isSignedIn, user?.id, hydrate]);

  // Write-only cache on every authenticated change (never read back).
  useEffect(() => {
    if (hydratedRef.current && isSignedIn) writeSave(save);
  }, [save, isSignedIn]);

  useEffect(() => {
    setSoundEnabled(save.sound);
  }, [save.sound]);

  const submitEvent = useCallback(async (event) => {
    if (!hydratedRef.current || !isSignedInRef.current) {
      throw new Error('Progress is not ready. Reload progress before submitting a learning event.');
    }
    const requestedUserId = userIdRef.current;
    const generation = saveRef.current.generation;
    const result = await submitLearningEvent({ ...event, generation }, getTokenRef.current);
    if (!result.ok) {
      if (result.code === 'STALE_GENERATION') await hydrate();
      throw new Error(result.error);
    }
    if (requestedUserId !== userIdRef.current || !isSignedInRef.current) return result;
    if (result.snapshot && result.snapshot.progress.updatedAt >= snapshotUpdatedAtRef.current) {
      const next = saveFromServerSnapshot(result.snapshot);
      snapshotUpdatedAtRef.current = result.snapshot.progress.updatedAt;
      setSave(next);
      writeSave(next);
      lastSyncedJsonRef.current = JSON.stringify(buildServerPayload(next));
      dirtyRef.current = false;
      if (mountedRef.current) {
        setSyncStatus('synced');
        setSyncError(null);
      }
    }
    return result;
  }, [hydrate]);

  const completeGameLab = useCallback((nodeId, evidence, eventId) => submitEvent({
    eventId,
    type: 'game_lab_completed',
    nodeId,
    evidence,
  }), [submitEvent]);

  const toggleSound = useCallback(() => {
    setSave((s) => ({ ...s, sound: !s.sound }));
    markDirty();
  }, [markDirty]);

  const setCallsign = useCallback((raw) => {
    const next =
      normalizeCallsign(raw) ?? (typeof raw === 'string' && raw ? displayCallsign(raw) : DEFAULT_CALLSIGN);
    setSave((s) => ({ ...s, callsign: next }));
    markDirty();
  }, [markDirty]);

  const setBooted = useCallback(() => {
    setSave((s) => ({ ...s, booted: true }));
    markDirty();
  }, [markDirty]);

  /** Full reset: clears Neon first (server authority), then local state + cache. */
  const resetAll = useCallback(async () => {
    if (!isSignedInRef.current || !hydratedRef.current) return false;
    const requestedUserId = userIdRef.current;
    const requestedGeneration = saveRef.current.generation;
    if (inFlightRef.current) {
      setSyncStatus('error');
      setSyncError('Wait for the pending preference save to finish before resetting progress.');
      return false;
    }
    inFlightRef.current = true;
    hydrationAttemptRef.current += 1;
    setSyncStatus('syncing');
    try {
      const res = await saveUserProgress({ reset: true }, getTokenRef.current);
      if (!res.ok || !res.snapshot) throw new Error(res.error || 'Progress reset failed.');
      if (requestedUserId !== userIdRef.current || !isSignedInRef.current) return false;
      if (res.snapshot.progress.generation <= requestedGeneration) {
        throw new Error('Progress reset did not return a newer authoritative generation.');
      }
      if (res.snapshot.progress.updatedAt < snapshotUpdatedAtRef.current) {
        if (mountedRef.current) {
          setSyncStatus('synced');
          setSyncError(null);
        }
        return false;
      }
      const next = saveFromServerSnapshot(res.snapshot);
      snapshotUpdatedAtRef.current = res.snapshot.progress.updatedAt;
      lastSyncedJsonRef.current = JSON.stringify(buildServerPayload(next));
      dirtyRef.current = false;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      saveRef.current = next;
      setSave(next);
      writeSave(next);
      if (mountedRef.current) {
        setSyncStatus('synced');
        setSyncError(null);
      }
      return true;
    } catch (err) {
      if (mountedRef.current && requestedUserId === userIdRef.current && isSignedInRef.current) {
        setSyncStatus('error');
        setSyncError(err instanceof Error ? err.message : String(err));
      }
      return false;
    } finally {
      inFlightRef.current = false;
      if (dirtyRef.current && hydratedRef.current && isSignedInRef.current) {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => flushSync(), SYNC_DEBOUNCE_MS);
      }
    }
  }, [flushSync]);

  /** Manual retry for the error screen. */
  const retryHydration = useCallback(() => {
    hydratedRef.current = false;
    hydrate();
  }, [hydrate]);

  /** Flush any pending changes immediately (e.g. before navigation or tab close). */
  const flushPending = useCallback((opts = {}) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    flushSync(opts);
  }, [flushSync]);

  // --- Flush pending progress when the tab is hidden or being closed ---
  // Changes inside the debounce window (600ms) would otherwise be lost on tab
  // close. The send uses keepalive so the browser completes it after unload.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') flushPending({ keepalive: true });
    };
    const handlePageHide = () => flushPending({ keepalive: true });
    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [flushPending]);

  const value = useMemo(() => {
    const cleared = save.missions || {};
    const clearedCount = Object.keys(cleared).length;
    const stars = Object.values(cleared).reduce((n, m) => n + (m.stars || 0), 0);
    const skills = save.skills || {};
    const topics = save.topics || {};
    return {
      save,
      cleared,
      skills,
      topics,
      clearedCount,
      totalStars: stars,
      level: levelFromXp(save.xp || 0),
      levelInfo: levelProgress(save.xp || 0),
      title: levelTitle(levelFromXp(save.xp || 0)),
      hydration, // idle | loading | ready | error
      syncStatus, // idle | syncing | synced | error
      syncError,
      retryHydration,
      flushPending,
      submitEvent,
      completeGameLab,
      toggleSound,
      setCallsign,
      setBooted,
      resetAll,
    };
  }, [save, hydration, syncStatus, syncError, retryHydration, flushPending, submitEvent, completeGameLab, toggleSound, setCallsign, setBooted, resetAll]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}

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
import { updateSkillRecord } from './mastery.js';
import { setSoundEnabled } from './sfx.js';
import { loadUserProgress, saveUserProgress } from '../lib/db.ts';
import { DEFAULT_CALLSIGN, displayCallsign, normalizeCallsign } from '../lib/callsign.mjs';
import { ROADMAP_NODE_MAP } from '../data/roadmap.js';

const GameContext = createContext(null);

// Stages the server accepts for topic_progress (must match VALID_TOPIC_STAGES
// in api/progress.ts — anything else would 400 the entire save payload).
const PERSISTABLE_STAGES = new Set(['concept', 'visualize', 'complexity', 'game', 'pattern', 'practice']);
// Roadmap UI stage keys that differ from the canonical server key.
const STAGE_ALIASES = { patterns: 'pattern' };

function expectedStagesForNode(nodeId) {
  const node = ROADMAP_NODE_MAP[nodeId];
  if (!node || !Array.isArray(node.learningStages)) return [];
  return node.learningStages
    .map((s) => STAGE_ALIASES[s] || s)
    .filter((s) => PERSISTABLE_STAGES.has(s));
}

const EMPTY_SAVE = {
  callsign: DEFAULT_CALLSIGN,
  xp: 0,
  sound: true,
  missions: {},
  skills: {},
  topics: {},
  booted: false,
};

// Re-hydrate timing
const SYNC_DEBOUNCE_MS = 600;
const MAX_SYNC_BACKOFF_MS = 30000;

/** Build the server payload from current save. Only send non-empty collections as full sets. */
function buildServerPayload(save, reset = false) {
  const missions = Object.entries(save.missions || {}).map(([missionId, m]) => ({
    missionId,
    stars: m.stars || 0,
    mistakes: m.mistakes || 0,
    clearedAt: m.clearedAt ?? null,
  }));
  const skills = Object.entries(save.skills || {}).map(([skillId, s]) => ({
    skillId,
    masteryLevel: s.masteryLevel || 'introduced',
    attempts: s.attempts || 0,
    successfulIndependentSolves: s.successfulIndependentSolves || 0,
    highestHintLevelRevealed: (s.hintUsage && s.hintUsage.highestLevelHintRevealed) || 0,
    totalHintsUsed: (s.hintUsage && s.hintUsage.totalHintsUsed) || 0,
    ladderReveals: (s.hintUsage && s.hintUsage.ladderReveals) || [0, 0, 0, 0, 0, 0],
    lastPracticed: s.lastPracticed ?? null,
    reviewDue: s.reviewDue ?? null,
  }));
  const topics = Object.entries(save.topics || {}).map(([nodeId, t]) => ({
    nodeId,
    stages: t.stages || {},
    startedAt: t.startedAt ?? null,
    completedAt: t.completedAt ?? null,
  }));
  // Only send a callsign the API would accept back: an un-normalizable value is
  // omitted rather than risking a 400 that would wedge every future save.
  const callsign = normalizeCallsign(save.callsign);
  return {
    xp: Math.max(0, Math.floor(save.xp || 0)),
    level: levelFromXp(Math.max(0, Math.floor(save.xp || 0))),
    sound: !!save.sound,
    booted: !!save.booted,
    missions,
    skills,
    topics,
    ...(callsign ? { callsign } : {}),
    ...(reset ? { reset: true } : {}),
  };
}

/** Merge a server snapshot into a save object. Server wins on everything; missing keys keep defaults. */
function saveFromServerSnapshot(snapshot) {
  const progress = (snapshot && snapshot.progress) || {};
  const missions = {};
  for (const [missionId, m] of Object.entries((snapshot && snapshot.missions) || {})) {
    missions[missionId] = {
      stars: m.stars || 0,
      mistakes: m.mistakes || 0,
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
    setHydration('loading');
    setSyncStatus('syncing');
    try {
      const res = await loadUserProgress(getTokenRef.current);
      if (!mountedRef.current) return;
      if (res && res.ok && res.snapshot) {
        const next = saveFromServerSnapshot(res.snapshot);
        hydratedRef.current = true;
        dirtyRef.current = false;
        lastSyncedJsonRef.current = JSON.stringify(buildServerPayload(next));
        setSave(next);
        writeSave(next); // cache only
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
      if (!mountedRef.current) return;
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
      hydrate();
    } else if (!isSignedIn) {
      // Signed out: nothing is rendered that consumes progress. Reset to empty
      // so a different user on this machine never sees someone else's state.
      hydratedRef.current = false;
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

  /** Award XP. Level is derived; persisted by the sync engine. */
  const awardXp = useCallback((amount) => {
    setSave((s) => {
      const nextXp = Math.max(0, (s.xp || 0) + amount);
      return { ...s, xp: nextXp };
    });
    markDirty();
  }, [markDirty]);

  /** Record a mission clear. Keeps the best star rating ever earned. */
  const completeMission = useCallback((missionId, stars, mistakes) => {
    setSave((s) => {
      const prev = (s.missions || {})[missionId];
      const best = prev ? Math.max(prev.stars, stars) : stars;
      return {
        ...s,
        missions: {
          ...(s.missions || {}),
          [missionId]: { stars: best, mistakes, clearedAt: Date.now() },
        },
      };
    });
    markDirty();
  }, [markDirty]);

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
    markDirty();
  }, [markDirty]);

  /**
   * Record that a learning stage was completed for a topic node. Completion is one-way.
   * - Normalizes UI stage keys to the canonical server key ('patterns' → 'pattern').
   * - Ignores stages the server would reject (keeps the payload valid).
   * - Auto-sets completedAt once every persistable stage of the node is true.
   */
  const completeStage = useCallback((nodeId, stage) => {
    if (!nodeId || !stage) return;
    const canonical = STAGE_ALIASES[stage] || stage;
    if (!PERSISTABLE_STAGES.has(canonical)) return;
    setSave((s) => {
      const prev = (s.topics || {})[nodeId] || { stages: {}, startedAt: null, completedAt: null };
      const wasSet = !!(prev.stages && prev.stages[canonical]);
      const stages = { ...(prev.stages || {}), [canonical]: true };
      const expected = expectedStagesForNode(nodeId);
      const allDone = expected.length > 0 && expected.every((k) => !!stages[k]);
      const completedAt = prev.completedAt || (allDone ? Date.now() : null);
      if (wasSet && completedAt === prev.completedAt) return s;
      return {
        ...s,
        topics: {
          ...(s.topics || {}),
          [nodeId]: { stages, startedAt: prev.startedAt ?? Date.now(), completedAt },
        },
      };
    });
    markDirty();
  }, [markDirty]);

  /** Record that a learner began a topic node (started tracking). */
  const startTopic = useCallback((nodeId) => {
    if (!nodeId) return;
    setSave((s) => {
      const prev = (s.topics || {})[nodeId];
      if (prev) return s;
      return {
        ...s,
        topics: {
          ...(s.topics || {}),
          [nodeId]: { stages: {}, startedAt: Date.now(), completedAt: null },
        },
      };
    });
    markDirty();
  }, [markDirty]);

  /** Mark an entire topic node completed (all local stages + optional mission clear elsewhere). */
  const completeTopic = useCallback((nodeId) => {
    if (!nodeId) return;
    setSave((s) => {
      const prev = (s.topics || {})[nodeId] || { stages: {}, startedAt: null, completedAt: null };
      if (prev.completedAt) return s;
      return {
        ...s,
        topics: {
          ...(s.topics || {}),
          [nodeId]: {
            stages: { ...(prev.stages || {}) },
            startedAt: prev.startedAt ?? Date.now(),
            completedAt: Date.now(),
          },
        },
      };
    });
    markDirty();
  }, [markDirty]);

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
    const next = { ...EMPTY_SAVE };
    if (isSignedInRef.current && hydratedRef.current) {
      try {
        inFlightRef.current = true;
        setSyncStatus('syncing');
        const res = await saveUserProgress({ ...buildServerPayload(next), reset: true }, getTokenRef.current);
        // A reset clears progress, not identity: the server keeps the callsign,
        // so adopt the returned value or the follow-up flush would overwrite it.
        const serverCallsign = res && res.ok && res.snapshot ? res.snapshot.progress?.callsign : null;
        if (serverCallsign) next.callsign = displayCallsign(serverCallsign);
      } catch {
        // Best effort: server reset retried by sync loop on next dirty change.
      } finally {
        inFlightRef.current = false;
      }
    }
    lastSyncedJsonRef.current = '';
    dirtyRef.current = false;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setSave(next);
    wipeSave();
    if (mountedRef.current && isSignedInRef.current) {
      dirtyRef.current = true;
      flushSync();
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
      awardXp,
      completeMission,
      recordSkillSession,
      completeStage,
      startTopic,
      completeTopic,
      toggleSound,
      setCallsign,
      setBooted,
      resetAll,
    };
  }, [save, hydration, syncStatus, syncError, retryHydration, flushPending, awardXp, completeMission, recordSkillSession, completeStage, startTopic, completeTopic, toggleSound, setCallsign, setBooted, resetAll]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}

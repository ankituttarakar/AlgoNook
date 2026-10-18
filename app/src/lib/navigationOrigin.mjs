export const CHALLENGES_ORIGIN = 'challenges';
export const ARENA_ORIGIN = 'arena';
const WORKFLOW_ORIGINS = new Set([CHALLENGES_ORIGIN, ARENA_ORIGIN]);

export function getNavigationOrigin(search) {
  const origin = new URLSearchParams(search).get('from');
  return WORKFLOW_ORIGINS.has(origin) ? origin : null;
}

export function appendWorkflowOrigin(path, origin) {
  return WORKFLOW_ORIGINS.has(origin) ? `${path}?from=${origin}` : path;
}

export function createNavigationRequest(path, target, extra = {}) {
  return {
    path,
    state: target === 'debrief' ? { result: extra.result } : undefined,
  };
}

export function getWorkflowHeader(origin, screen) {
  if (!['brief', 'run', 'debrief'].includes(screen)) return null;
  if (origin === CHALLENGES_ORIGIN) return { location: 'Challenge Coding Lab', activeNavigation: 'challenges' };
  if (origin === ARENA_ORIGIN) return { location: 'Battlefield Coding Lab', activeNavigation: 'arena' };
  return null;
}

export function getChallengeWorkflowHeader(origin, screen) {
  return origin === CHALLENGES_ORIGIN ? getWorkflowHeader(origin, screen) : null;
}

export function getMissionReturnTarget(origin, normalTarget) {
  if (origin === CHALLENGES_ORIGIN) return 'challenges';
  if (origin === ARENA_ORIGIN) return 'arena';
  return normalTarget;
}

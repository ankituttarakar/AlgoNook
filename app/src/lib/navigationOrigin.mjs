export const CHALLENGES_ORIGIN = 'challenges';

export function getNavigationOrigin(search) {
  return new URLSearchParams(search).get('from') === CHALLENGES_ORIGIN
    ? CHALLENGES_ORIGIN
    : null;
}

export function appendWorkflowOrigin(path, origin) {
  return origin === CHALLENGES_ORIGIN ? `${path}?from=${CHALLENGES_ORIGIN}` : path;
}

export function createNavigationRequest(path, target, extra = {}) {
  return {
    path,
    state: target === 'debrief' ? { result: extra.result } : undefined,
  };
}

export function getChallengeWorkflowHeader(origin, screen) {
  return origin === CHALLENGES_ORIGIN && ['brief', 'run', 'debrief'].includes(screen)
    ? { location: 'Challenge Coding Lab', activeNavigation: 'challenges' }
    : null;
}

export function getMissionReturnTarget(origin, normalTarget) {
  return origin === CHALLENGES_ORIGIN ? 'challenges' : normalTarget;
}

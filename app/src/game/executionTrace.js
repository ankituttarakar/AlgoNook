export const TRACE_ACTIONS = Object.freeze([
  'visit', 'compare', 'move-left', 'move-right', 'found', 'not-found', 'duplicate', 'complete',
]);

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

/** Validate and bound the trace returned by the trusted execution service. */
export function normalizeExecutionTrace(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 40).flatMap((event, index) => {
    if (!event || typeof event !== 'object' || !TRACE_ACTIONS.includes(event.action)) return [];
    const state = event.state;
    if (!state || typeof state !== 'object' || Array.isArray(state)) return [];
    const array = Array.isArray(state.array)
      ? state.array.slice(0, 64).filter((item) => isFiniteNumber(item) || typeof item === 'string').map((item) => typeof item === 'string' ? item.slice(0, 120) : item)
      : [];
    const cleanState = { array };
    for (const key of ['index', 'left', 'right', 'target', 'sum', 'value']) {
      if (isFiniteNumber(state[key])) cleanState[key] = state[key];
    }
    for (const key of ['seen']) {
      if (Array.isArray(state[key])) cleanState[key] = state[key].slice(0, 64).filter((item) => isFiniteNumber(item) || typeof item === 'string').map((item) => typeof item === 'string' ? item.slice(0, 120) : item);
    }
    return [{ step: index + 1, action: event.action, state: cleanState }];
  });
}

export function traceActionLabel(action) {
  return ({
    visit: 'Visit value',
    compare: 'Compare endpoints',
    'move-left': 'Move left pointer',
    'move-right': 'Move right pointer',
    found: 'Pair found',
    'not-found': 'No pair in remaining range',
    duplicate: 'Duplicate detected',
    complete: 'Traversal complete',
  })[action] || 'Algorithm step';
}

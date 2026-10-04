// AlgoNook — challenge constructors (keep data files terse)

/** Multiple choice / code trace. opts: array of [text, why, ok?] */
export const mc = (d, q, opts, extra = {}) => ({
  t: 'mc', d, q,
  opts: opts.map(([t, why, ok]) => ({ t, why, ok: !!ok })),
  ...extra,
});

/** Sequence ordering. items must be listed in the CORRECT order; UI shuffles. */
export const order = (d, q, items, why, extra = {}) => ({
  t: 'order', d, q, items, why, ...extra,
});

/** Stack/queue machine. input: items enter in order. target: required output. */
export const mach = (d, mode, input, target, why, extra = {}) => ({
  t: 'machine', d, mode, input, target, why, ...extra,
});

// Supplemental runner-owned cases stay out of the client curriculum bundle.
export const HIDDEN_CHALLENGE_CASES = Object.freeze({
  'queue-rotate': Object.freeze([
    Object.freeze({ id: 'edge-01', queue: [4], k: 99, expected: [4] }),
  ]),
  'bst-search': Object.freeze([
    Object.freeze({ id: 'edge-01', tree: [5, 3, 8, 1, 4, 7, 9], target: 7, expected: true }),
  ]),
  'anagram-check': Object.freeze([
    Object.freeze({ id: 'edge-01', s: 'aabbcc', t: 'abcabc', expected: true }),
  ]),
  'merge-sort-values': Object.freeze([
    Object.freeze({ id: 'edge-01', values: [0, -3, 2, -3], expected: [-3, -3, 0, 2] }),
  ]),
  'longest-increasing-subsequence': Object.freeze([
    Object.freeze({ id: 'edge-01', values: [3, 10, 2, 1, 20], expected: 3 }),
  ]),
});

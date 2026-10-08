const testCases = [
  { id: 'pair-at-endpoints', nums: [1, 3, 5, 7, 9], target: 10, expected: [0, 4] },
  { id: 'duplicate-values-distinct-indices', nums: [2, 2, 3], target: 4, expected: [0, 1] },
  { id: 'negative-and-positive', nums: [-4, -1, 2, 6], target: 1, expected: [1, 2] },
  { id: 'no-pair', nums: [1, 2, 4, 8], target: 20, expected: [] },
  { id: 'multiple-valid-pairs', nums: [1, 2, 3, 4, 5], target: 6, expected: [0, 4] },
].map((item) => Object.freeze({ ...item, nums: Object.freeze([...item.nums]), expected: Object.freeze([...item.expected]) }));

export const TWO_SUM_SORTED_PROBLEM = Object.freeze({
  id: 'two-sum-sorted',
  functionName: 'twoSumSorted',
  argumentKeys: Object.freeze(['nums', 'target']),
  resultType: 'index-pair',
  testCases: Object.freeze(testCases),
});

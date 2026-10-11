const testCases = [
  { id: 'duplicate-at-end', nums: [1, 2, 3, 1], expected: true },
  { id: 'all-unique', nums: [1, 2, 3, 4], expected: false },
  { id: 'empty-array', nums: [], expected: false },
  { id: 'single-value', nums: [7], expected: false },
  { id: 'negative-duplicate', nums: [-4, 0, -4], expected: true },
  { id: 'duplicate-at-start', nums: [5, 5, 6, 7], expected: true },
  { id: 'integer-boundaries', nums: [-2147483648, 2147483647], expected: false },
].map((testCase) => Object.freeze({
  ...testCase,
  nums: Object.freeze([...testCase.nums]),
}));

export const CONTAINS_DUPLICATE_PROBLEM = Object.freeze({
  id: 'contains-duplicate',
  functionName: 'containsDuplicate',
  testCases: Object.freeze(testCases),
});

export function getCodeProblemById(id) {
  return id === CONTAINS_DUPLICATE_PROBLEM.id ? CONTAINS_DUPLICATE_PROBLEM : null;
}

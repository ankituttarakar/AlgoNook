const testCases = [
  { id: 'empty-input', values: [], expected: {} },
  { id: 'single-key', values: ['pear'], expected: { pear: 1 } },
  { id: 'repeated-key', values: ['pear', 'plum', 'pear'], expected: { pear: 2, plum: 1 } },
  { id: 'several-frequencies', values: ['red', 'blue', 'red', 'green', 'blue', 'red'], expected: { red: 3, blue: 2, green: 1 } },
  { id: 'case-sensitive-keys', values: ['A', 'a', 'A'], expected: { A: 2, a: 1 } },
].map((testCase) => Object.freeze({
  ...testCase,
  values: Object.freeze([...testCase.values]),
  expected: Object.freeze({ ...testCase.expected }),
}));

export const FREQUENCY_MAP_PROBLEM = Object.freeze({
  id: 'frequency-map',
  functionName: 'countFrequencies',
  argumentKey: 'values',
  resultType: 'frequency-map',
  testCases: Object.freeze(testCases),
});

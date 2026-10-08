import { CONTAINS_DUPLICATE_PROBLEM } from './containsDuplicate.mjs';
import { FREQUENCY_MAP_PROBLEM } from './frequencyMap.mjs';
import { TWO_SUM_SORTED_PROBLEM } from './twoSumSorted.mjs';
import { CODING_PROBLEMS } from '../../../src/data/codingProblems.js';

const functionNames = {
  'max-profit': 'maxProfit',
  'binary-search-first': 'lowerBound',
  'window-max-sum': 'maxWindowSum',
  'valid-parentheses': 'isValidBrackets',
  'reverse-linked-values': 'reverseValues',
  'tree-max-depth': 'maxDepth',
  'kth-largest': 'kthLargest',
  'reachable-nodes': 'reachableCount',
  subsets: 'subsets',
  'climb-stairs': 'climbStairs',
};
const addedProblems = CODING_PROBLEMS.map((problem) => Object.freeze({
  id: problem.id,
  functionName: functionNames[problem.id],
  argumentKeys: Object.freeze([...problem.args]),
  resultType: problem.id === 'valid-parentheses' ? 'bool' : problem.id === 'reverse-linked-values' ? 'integer-list' : problem.id === 'subsets' ? 'unordered-integer-subsets' : 'json',
  testCases: Object.freeze(problem.cases.map((test) => Object.freeze({ ...test }))),
}));
const problems = [CONTAINS_DUPLICATE_PROBLEM, FREQUENCY_MAP_PROBLEM, TWO_SUM_SORTED_PROBLEM, ...addedProblems];
const byId = new Map(problems.map((problem) => [problem.id, problem]));

export function getCodeProblemById(id) {
  return byId.get(id) || null;
}

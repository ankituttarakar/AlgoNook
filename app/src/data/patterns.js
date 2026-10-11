// AlgoNook — Pattern Recognition Training
// Teaches learners to recognize which DSA pattern applies to a problem.
// Critical skill for interviews: "What clues tell me to use X?"

/**
 * Pattern structure:
 *   id          — unique identifier matching roadmap node id
 *   title       — pattern name
 *   description — what this pattern solves
 *   signals     — recognition clues (when to think of this pattern)
 *   examples    — problem titles that use this pattern
 *   antipatterns — when NOT to use this
*/

import { SUPPLEMENTAL_BY_NODE } from './supplementalCurriculum.js';

export const PATTERNS = [
  {
    id: 'foundations',
    title: 'Algorithmic Thinking',
    description: 'Systematic approach to analyzing and solving problems: understand, plan, implement, verify',
    signals: [
      'You need to analyze time or space complexity',
      'Choosing between multiple algorithm approaches',
      'Optimizing an existing solution',
      'Explaining your approach in an interview',
      'Comparing trade-offs between solutions',
    ],
    keyQuestions: [
      'What is the input size? (Determines if O(n²) is acceptable)',
      'What is the bottleneck operation? (Most expensive step)',
      'Can I use extra space to save time? (Space-time tradeoff)',
      'What is the best theoretical complexity? (Lower bound)',
      'Does my solution handle edge cases? (Empty input, single element, duplicates)',
    ],
    examples: [
      'Analyzing nested loops → O(n²)',
      'Recognizing binary search opportunity → O(log n)',
      'Using hash map to avoid nested search → O(n) from O(n²)',
      'Identifying in-place algorithm → O(1) space',
    ],
    antipatterns: [
      'Optimizing before understanding the problem → solve correctly first',
      'Ignoring space complexity → memory matters too',
      'Assuming sorted input without checking → verify assumptions',
    ],
  },
  {
    id: 'arrays',
    title: 'Array Patterns',
    description: 'Sequential access, in-place manipulation, multi-pass traversal',
    signals: [
      'Problem mentions "array", "list", or "sequence"',
      'Need to access elements by index',
      'Asked to modify array without extra space',
      'Counting, frequency, or occurrence questions',
      'Looking for contiguous subarrays',
    ],
    keyQuestions: [
      'Can I solve this in one pass?',
      'Can I solve this in-place?',
      'Do I need to track state while scanning?',
      'Would sorting help?',
    ],
    examples: [
      'Contains Duplicate',
      'Maximum Subarray',
      'Product of Array Except Self',
      'Find Minimum in Rotated Sorted Array',
    ],
    antipatterns: [
      'If insertion/deletion is frequent → use linked list or dynamic structure',
      'If need fast membership checks → use hash set',
    ],
  },
  {
    id: 'hashing',
    title: 'Hashing Patterns',
    description: 'O(1) lookup, frequency counting, deduplication, complement finding',
    signals: [
      'Question asks "find duplicate", "count occurrences", "unique elements"',
      'Need to check if something exists quickly',
      'Looking for complement or pair (e.g., two sum)',
      'Tracking what you\'ve seen before',
      'Problem has O(n²) brute force with nested search',
    ],
    keyQuestions: [
      'Am I searching the same collection repeatedly?',
      'Can I trade space for faster lookup?',
      'Do I need to count frequencies?',
      'Am I looking for a complement (target - current)?',
    ],
    examples: [
      'Two Sum',
      'Contains Duplicate',
      'Valid Anagram',
      'Group Anagrams',
      'Longest Consecutive Sequence',
    ],
    antipatterns: [
      'If order matters significantly → may need array/list instead',
      'If space is severely constrained → sorting might be better',
    ],
  },
  {
    id: 'two-pointers',
    title: 'Two Pointers Pattern',
    description: 'Converging or expanding pointers to eliminate O(n²) nested loops',
    signals: [
      'Input is sorted or can be sorted',
      'Looking for pairs/triplets with sum/difference condition',
      'Need to partition array by condition',
      'Palindrome or symmetry check',
      'Removing duplicates in sorted array',
    ],
    keyQuestions: [
      'Is the array sorted?',
      'Can I use two indices instead of two nested loops?',
      'Do I need to check opposite ends?',
      'Am I comparing elements from different positions?',
    ],
    examples: [
      'Two Sum II (sorted array)',
      'Container With Most Water',
      'Valid Palindrome',
      '3Sum',
      'Remove Duplicates from Sorted Array',
    ],
    antipatterns: [
      'If array is unsorted and can\'t be sorted → hashing might be better',
      'If need all pairs/combinations → may need different approach',
    ],
  },
  {
    id: 'binary-search',
    title: 'Binary Search Pattern',
    description: 'Halving search space on sorted data or answer ranges',
    signals: [
      'Array is sorted',
      'Problem asks for "search", "find first/last", "find minimum/maximum"',
      'Can frame as "is X possible?" for various X',
      'Looking for boundary or threshold',
      'Time limit suggests better than O(n)',
    ],
    keyQuestions: [
      'Is the search space sorted or monotonic?',
      'Can I check a candidate answer in O(n) or less?',
      'Am I finding a boundary (first/last occurrence)?',
      'Does eliminating half the space preserve correctness?',
    ],
    examples: [
      'Binary Search',
      'Search in Rotated Sorted Array',
      'Find First and Last Position',
      'Search a 2D Matrix',
      'Koko Eating Bananas (search on answer)',
    ],
    antipatterns: [
      'If data is unsorted and can\'t determine monotonic property → linear search needed',
      'If checking candidate is expensive → binary search advantage diminishes',
    ],
  },
  {
    id: 'sliding-window',
    title: 'Sliding Window Pattern',
    description: 'Dynamic window over array/string for contiguous subarray problems',
    signals: [
      'Asked for "subarray", "substring", or "contiguous elements"',
      'Find max/min/longest/shortest with a condition',
      'Problem mentions "window of size k"',
      'Optimization problem on contiguous elements',
    ],
    keyQuestions: [
      'Can I expand/shrink a window as I traverse?',
      'Is the subarray/substring contiguous?',
      'Can I maintain window state efficiently?',
      'Does the window size vary or stay fixed?',
    ],
    examples: [
      'Maximum Sum Subarray of Size K',
      'Longest Substring Without Repeating Characters',
      'Minimum Window Substring',
      'Permutation in String',
    ],
    antipatterns: [
      'If elements don\'t need to be contiguous → use different approach',
      'If window can\'t be maintained incrementally → may need DP',
    ],
  },
];

export const PATTERN_MAP = Object.fromEntries(PATTERNS.map((p) => [p.id, p]));

/** Get pattern for a roadmap node */
export function getPatternForNode(nodeId) {
  const saved = PATTERN_MAP[nodeId];
  if (saved) return saved;
  const supplemental = SUPPLEMENTAL_BY_NODE[nodeId];
  return supplemental ? {
    id: nodeId,
    title: `${supplemental.concept.title} Patterns`,
    description: supplemental.notes.intuition,
    signals: supplemental.notes.whenToUse,
    keyQuestions: supplemental.notes.interviewClues,
    examples: Array.isArray(supplemental.notes.exampleProblems) ? supplemental.notes.exampleProblems : [supplemental.notes.exampleProblems],
    antipatterns: supplemental.notes.whenNotToUse,
    commonMistakes: supplemental.notes.commonMistakes,
  } : null;
}

// AlgoNook — Practice Stage Challenges
// Lightweight knowledge checks before full coding problems.
// Tests understanding without requiring full implementation.

/**
 * Practice challenge types:
 *   - pattern_match: Given problem statement, choose correct pattern
 *   - complexity: Choose time/space complexity
 *   - trace: Predict algorithm behavior on input
 *   - choose_approach: Select correct approach among options
*/

import { SUPPLEMENTAL_BY_NODE } from './supplementalCurriculum.js';

export const PRACTICE_CHALLENGES = [
  {
    id: 'foundations-practice-1',
    nodeId: 'foundations',
    type: 'complexity',
    prompt: 'What is the time complexity of this code?',
    code: `for i in range(n):
    print(i)`,
    options: [
      { text: 'O(n)', correct: true, reason: 'Single loop iterating n times — linear time.' },
      { text: 'O(1)', correct: false, reason: 'O(1) means constant time regardless of input size. This loop runs n times.' },
      { text: 'O(n²)', correct: false, reason: 'O(n²) requires nested loops. This is a single loop.' },
      { text: 'O(log n)', correct: false, reason: 'O(log n) occurs when you halve the problem each step (binary search). This processes every element.' },
    ],
  },
  {
    id: 'foundations-practice-2',
    nodeId: 'foundations',
    type: 'complexity',
    prompt: 'What is the time complexity of this code?',
    code: `for i in range(n):
    for j in range(n):
        print(i, j)`,
    options: [
      { text: 'O(n²)', correct: true, reason: 'Nested loops where each runs n times: n × n = n².' },
      { text: 'O(n)', correct: false, reason: 'O(n) is single-pass linear. These nested loops do n² operations.' },
      { text: 'O(2n)', correct: false, reason: 'O(2n) simplifies to O(n). Nested loops are O(n²), not additive.' },
      { text: 'O(log n)', correct: false, reason: 'These nested loops process all n² pairs, not a logarithmic subset.' },
    ],
  },
  {
    id: 'foundations-practice-3',
    nodeId: 'foundations',
    type: 'pattern_match',
    prompt: 'Which complexity is better for large inputs?',
    problem: 'You need to search a sorted array of 1,000,000 elements.',
    options: [
      { text: 'O(log n) binary search', correct: true, reason: 'log₂(1,000,000) ≈ 20 steps. Far better than scanning all elements.' },
      { text: 'O(n) linear search', correct: false, reason: 'Linear search checks up to 1,000,000 elements. Much slower than O(log n).' },
      { text: 'O(n²) nested search', correct: false, reason: 'O(n²) would be 1 trillion operations. Never acceptable for large inputs.' },
      { text: 'O(1) hash lookup', correct: false, reason: 'While O(1) is ideal, the problem states "sorted array," so binary search O(log n) is the right approach here.' },
    ],
  },
  {
    id: 'foundations-practice-reasoning',
    nodeId: 'foundations',
    type: 'short_answer',
    prompt: 'What is the time complexity? Explain mentally by counting the total iterations.',
    code: `for i in range(n):
    for j in range(i):
        work()`,
    acceptedAnswers: ['O(n^2)', 'O(n²)', 'quadratic'],
    retryReason: 'The inner loop runs 0, 1, 2, …, n−1 times. Add those counts and simplify the growth rate.',
    explanation: 'The total is 0 + 1 + … + (n−1) = n(n−1)/2, which grows as O(n²).',
  },
  {
    id: 'hashing-practice-2',
    nodeId: 'hashing',
    type: 'complexity',
    prompt: 'Why use a hash set to check for duplicates instead of nested loops?',
    problem: 'You need to check if any element appears twice in an array.',
    options: [
      { text: 'Hash set is O(n) time vs O(n²) for nested loops', correct: true, reason: 'Hash set checks each element once with O(1) lookup = O(n) total. Nested loops compare every pair = O(n²).' },
      { text: 'Hash set uses less memory', correct: false, reason: 'Hash set uses O(n) extra space. Nested loops use O(1) space. Memory tradeoff, not advantage.' },
      { text: 'Hash set always finds the answer faster', correct: false, reason: 'If duplicates are near the start, both are fast. Complexity analysis is about worst case.' },
      { text: 'Hash set works only on sorted arrays', correct: false, reason: 'Hash sets work on any array. Sorting is not required.' },
    ],
  },
  {
    id: 'hashing-practice-3',
    nodeId: 'hashing',
    type: 'pattern_match',
    prompt: 'When is a hash map better than a sorted array?',
    problem: 'You need to frequently check membership and add new elements.',
    options: [
      { text: 'Hash map: O(1) insert and lookup, sorted array: O(n) insert', correct: true, reason: 'Hash map inserts in O(1). Sorted array requires O(n) to find insertion point and shift elements.' },
      { text: 'Sorted array is always faster', correct: false, reason: 'Sorted array requires O(n) for inserts. Hash map is O(1) average for both operations.' },
      { text: 'Hash map uses less memory', correct: false, reason: 'Both use O(n) space. Memory usage is comparable.' },
      { text: 'Sorted array supports range queries better', correct: false, reason: 'This is true, but the question asks about membership checks and adds, not range queries. For the stated use case, hash map wins.' },
    ],
  },
  {
    id: 'arrays-practice-1',
    nodeId: 'arrays',
    type: 'pattern_match',
    prompt: 'Which pattern best solves this problem?',
    problem: 'Given an array of integers, find if there are two numbers that add up to a specific target.',
    options: [
      { text: 'Brute force nested loops', correct: false, reason: 'Works but O(n²) — too slow for large inputs.' },
      { text: 'Hash map to store complements', correct: true, reason: 'O(n) time by checking if (target - current) exists in map.' },
      { text: 'Sort then binary search', correct: false, reason: 'O(n log n) — works but hash map is simpler and faster.' },
      { text: 'Two pointers', correct: false, reason: 'Only works if array is already sorted.' },
    ],
  },
  {
    id: 'arrays-practice-2',
    nodeId: 'arrays',
    type: 'complexity',
    prompt: 'What is the time complexity of this code?',
    code: `for i in range(len(arr)):
    for j in range(i + 1, len(arr)):
        if arr[i] + arr[j] == target:
            return [i, j]`,
    options: [
      { text: 'O(n)', correct: false, reason: 'Two nested loops means quadratic, not linear.' },
      { text: 'O(n log n)', correct: false, reason: 'No divide-and-conquer or sorting happening here.' },
      { text: 'O(n²)', correct: true, reason: 'Outer loop runs n times, inner loop runs up to n times → n×n = n².' },
      { text: 'O(log n)', correct: false, reason: 'Logarithmic only with halving search space (binary search).' },
    ],
  },
  {
    id: 'hashing-practice-1',
    nodeId: 'hashing',
    type: 'pattern_match',
    prompt: 'When should you use a hash map?',
    problem: 'You need to check if an element appears more than once in an array.',
    options: [
      { text: 'Sort the array and check adjacent elements', correct: false, reason: 'Works but O(n log n). Hash set is O(n).' },
      { text: 'Use a hash set to track seen elements', correct: true, reason: 'O(n) time, O(n) space — optimal for this problem.' },
      { text: 'Use two nested loops to compare all pairs', correct: false, reason: 'O(n²) — too slow and unnecessary.' },
      { text: 'Use binary search', correct: false, reason: 'Binary search requires sorted data and doesn\'t help here.' },
    ],
  },
  {
    id: 'two-pointers-practice-1',
    nodeId: 'two-pointers',
    type: 'trace',
    prompt: 'Trace the two pointers on this input.',
    problem: 'Find two numbers in sorted array [1, 3, 5, 7, 9] that sum to 10.',
    initial: 'left = 0 (arr[0]=1), right = 4 (arr[4]=9)',
    question: 'What happens in the first iteration?',
    options: [
      { text: 'left = 1, right = 4', correct: false, reason: '1+9=10 which equals target, so we return immediately.' },
      { text: 'left = 0, right = 3', correct: false, reason: '1+9=10 which equals target, so we return immediately.' },
      { text: 'Return [0, 4]', correct: true, reason: 'arr[0] + arr[4] = 1 + 9 = 10. Found the pair on first check!' },
      { text: 'Return []', correct: false, reason: '1+9=10 matches the target exactly.' },
    ],
  },
  {
    id: 'two-pointers-practice-2',
    nodeId: 'two-pointers',
    type: 'pattern_match',
    prompt: 'Which approach is best?',
    problem: 'Remove all instances of a value from a sorted array in-place.',
    options: [
      { text: 'Create a new array without the value', correct: false, reason: 'Not in-place — uses extra O(n) space.' },
      { text: 'Two pointers: one reads, one writes', correct: true, reason: 'In-place O(n) time, O(1) space. Reader skips unwanted values, writer places keepers.' },
      { text: 'Use filter() function', correct: false, reason: 'Creates a new array — not in-place.' },
      { text: 'Binary search then delete', correct: false, reason: 'Multiple instances require multiple deletes — inefficient.' },
    ],
  },
  {
    id: 'two-pointers-practice-3',
    nodeId: 'two-pointers',
    type: 'trace',
    prompt: 'The current sum is too large. Which pointer move preserves the possibility of reaching a smaller sum?',
    problem: 'Sorted array [-4, -1, 2, 6], target 1; left = 0 and right = 3.',
    options: [
      { text: 'Move right left from index 3 to index 2.', correct: true, reason: 'The largest endpoint is too large; removing it can lower the sum while keeping the current left candidate.' },
      { text: 'Move left right from index 0 to index 1.', correct: false, reason: 'The array is sorted, so increasing the left value raises an already-too-large sum.' },
      { text: 'Move both pointers inward.', correct: false, reason: 'The comparison justifies discarding the right endpoint; moving both skips candidates without proof.' },
    ],
  },
  {
    id: 'two-pointers-practice-4',
    nodeId: 'two-pointers',
    type: 'complexity',
    prompt: 'What bounds the number of pair-sum comparisons?',
    problem: 'Each iteration increments left or decrements right, so the active interval shrinks.',
    options: [
      { text: 'At most n − 1 comparisons, so O(n) time and O(1) extra space.', correct: true, reason: 'The interval loses at least one index per step and stores only two indices.' },
      { text: 'All n(n−1)/2 pairs, so O(n²) time.', correct: false, reason: 'The pointers do not revisit pairs; each comparison eliminates a row or column of candidates.' },
      { text: 'log n comparisons because pointers halve the interval.', correct: false, reason: 'The interval shrinks by one endpoint, not by half, so the bound is linear.' },
    ],
  },
  {
    id: 'binary-search-practice-1',
    nodeId: 'binary-search',
    type: 'complexity',
    prompt: 'Why is binary search O(log n)?',
    problem: 'Binary search eliminates half the array each iteration.',
    options: [
      { text: 'Because we visit every element once', correct: false, reason: 'We skip half the elements each step — never visit most of them.' },
      { text: 'Because we divide the problem in half repeatedly', correct: true, reason: 'Each comparison eliminates half the search space: n → n/2 → n/4 → ... → 1. Takes log₂(n) steps.' },
      { text: 'Because we sort the array first', correct: false, reason: 'Binary search assumes pre-sorted data; it doesn\'t sort.' },
      { text: 'Because we use recursion', correct: false, reason: 'Recursion doesn\'t determine complexity — the halving does.' },
    ],
  },
  {
    id: 'binary-search-practice-2',
    nodeId: 'binary-search',
    type: 'trace',
    prompt: 'Trace binary search for target = 7',
    problem: 'Array: [1, 3, 5, 7, 9, 11, 13]',
    initial: 'left = 0, right = 6',
    question: 'What is the sequence of mid values checked?',
    options: [
      { text: 'mid = 3 → found', correct: true, reason: 'mid = (0+6)//2 = 3, arr[3] = 7. Match on first try!' },
      { text: 'mid = 3, mid = 1, mid = 2 → found', correct: false, reason: 'First mid check finds 7 immediately.' },
      { text: 'mid = 6, mid = 3 → found', correct: false, reason: 'mid = (0+6)//2 = 3 on first iteration, not 6.' },
      { text: 'mid = 0, mid = 3 → found', correct: false, reason: 'mid calculation starts at (0+6)//2 = 3, not 0.' },
    ],
  },
];

export const PRACTICE_MAP = Object.fromEntries(
  PRACTICE_CHALLENGES.map((c) => [c.id, c])
);

/** Get practice challenges for a roadmap node */
export function getPracticeForNode(nodeId) {
  const existing = PRACTICE_CHALLENGES.filter((c) => c.nodeId === nodeId);
  return existing.length ? existing : (SUPPLEMENTAL_BY_NODE[nodeId]?.practice || []);
}

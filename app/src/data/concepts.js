// AlgoNook — Concept Learning Content
// Each concept teaches a DSA topic before the learner solves problems.
// Data-driven: add new concepts here without changing UI components.

/**
 * Concept structure:
 *   id          — unique identifier matching roadmap node id
 *   title       — concept name
 *   whatIsIt    — concise technical definition
 *   whyMatters  — practical motivation (interviews, performance)
 *   whenToUse   — recognition signals
 *   keyIdea     — the core insight
 *   example     — simple concrete example
 *   complexity  — time/space analysis (optional)
 *   nextSteps   — what comes after learning this concept
*/

import { SUPPLEMENTAL_BY_NODE } from './supplementalCurriculum.js';

export const CONCEPTS = [
  {
    id: 'arrays',
    title: 'Arrays',
    whatIsIt: 'Contiguous block of memory storing elements of the same type, accessible by index in O(1) time.',
    whyMatters: 'Arrays appear in 40%+ of interview questions. Understanding array manipulation is fundamental to all algorithmic thinking.',
    whenToUse: [
      'Need fast random access by index',
      'Fixed or growable collection of same-type elements',
      'Sequential processing (traversal, searching, sorting)',
      'In-place manipulation to save space',
    ],
    keyIdea: 'Index arithmetic gives you direct memory access. No need to traverse from the start.',
    conceptCheck: { prompt: 'Why can an array read a[i] without scanning earlier elements?', options: [
      { text: 'The index maps directly to an address using the base address and element size.', correct: true, feedback: 'Correct. The address is computed directly from the base plus index times element size.' },
      { text: 'The array is searched from both ends at once.', correct: false, feedback: 'That would still require inspecting elements. Direct address calculation makes indexed access constant time.' },
      { text: 'Every array is sorted before it can be read.', correct: false, feedback: 'Arrays need not be sorted. Indexing works because storage is contiguous.' },
    ] },
    example: {
      problem: 'Find the maximum element in [3, 7, 2, 9, 1]',
      approach: 'Traverse once, tracking the current maximum. O(n) time, O(1) space.',
      code: `max_val = arr[0]
for num in arr:
    if num > max_val:
        max_val = num`,
    },
    complexity: {
      access: 'O(1)',
      search: 'O(n) unsorted, O(log n) sorted with binary search',
      insert: 'O(n) – must shift elements',
      delete: 'O(n) – must shift elements',
    },
    nextSteps: [
      'Visualize array traversal patterns',
      'Learn pattern recognition: when to use arrays vs other structures',
      'Practice array manipulation problems',
    ],
  },
  {
    id: 'hashing',
    title: 'Hash Tables',
    whatIsIt: 'Data structure that maps keys to values using a hash function, enabling O(1) average-case lookup, insert, and delete.',
    whyMatters: 'Hash tables turn O(n²) brute-force solutions into O(n). Essential for frequency counting, deduplication, and fast lookups.',
    whenToUse: [
      'Need to check "have I seen this before?"',
      'Count frequency of elements',
      'Find duplicates or unique elements',
      'Store key-value mappings',
      'Complement/pair finding (e.g., two sum)',
    ],
    keyIdea: 'Trade space for time. Store what you\'ve seen so you don\'t search repeatedly.',
    conceptCheck: { prompt: 'What does a seen set let a one-pass scan ask efficiently?', options: [
      { text: 'Whether the current key has appeared in the processed prefix.', correct: true, feedback: 'Correct. Membership summarizes prior keys so the scan avoids rescanning them.' },
      { text: 'Whether the input is sorted.', correct: false, feedback: 'A hash set does not establish order; it answers membership queries.' },
      { text: 'Where the current key appears in sorted order.', correct: false, feedback: 'A set stores membership, not sorted positions.' },
    ] },
    example: {
      problem: 'Check if array contains duplicates',
      approach: 'Use a set to track seen elements. If you see it again, return true.',
      code: `seen = set()
for num in arr:
    if num in seen:
        return True
    seen.add(num)
return False`,
    },
    complexity: {
      access: 'O(1) average, O(n) worst case',
      search: 'O(1) average, O(n) worst case',
      insert: 'O(1) average, O(n) worst case',
      delete: 'O(1) average, O(n) worst case',
    },
    nextSteps: [
      'Understand collision handling',
      'Learn hash table implementation patterns',
      'Practice frequency map and set problems',
    ],
  },
  {
    id: 'two-pointers',
    title: 'Two Pointers',
    whatIsIt: 'Algorithmic pattern using two indices moving through an array, often converging or expanding, to solve problems in O(n) instead of O(n²).',
    whyMatters: 'Eliminates nested loops in sorted array and string problems. Common in interviews for pair-finding and partitioning.',
    whenToUse: [
      'Input is sorted (or can be sorted)',
      'Looking for pairs or triplets that satisfy a condition',
      'Partitioning arrays (e.g., move zeros, Dutch flag)',
      'Palindrome or symmetric checks',
      'Sliding window problems (special case)',
    ],
    keyIdea: 'Move pointers toward each other based on comparison logic. Each step eliminates possibilities.',
    conceptCheck: { prompt: 'For two-sum on a sorted array, the current sum is too small. Which move can improve it?', options: [
      { text: 'Move the left pointer right to increase the sum.', correct: true, feedback: 'Correct. Sorted order means a larger left value can raise the sum.' },
      { text: 'Move the right pointer left to increase the sum.', correct: false, feedback: 'Moving the right pointer left lowers or preserves its value, so it cannot raise a too-small sum.' },
      { text: 'Move both pointers inward to keep the sum unchanged.', correct: false, feedback: 'Moving both loses candidates without using the comparison evidence.' },
    ] },
    example: {
      problem: 'Find two numbers in sorted array that sum to target',
      approach: 'Left pointer at start, right at end. If sum too small, move left++. If too large, move right--.',
      code: `left, right = 0, len(arr) - 1
while left < right:
    s = arr[left] + arr[right]
    if s == target:
        return [left, right]
    elif s < target:
        left += 1
    else:
        right -= 1`,
    },
    complexity: {
      time: 'O(n) – single pass',
      space: 'O(1) – no extra storage',
    },
    nextSteps: [
      'Visualize pointer convergence',
      'Learn pattern variants (fast/slow, same-direction)',
      'Practice two-pointer problems',
    ],
  },
  {
    id: 'binary-search',
    title: 'Binary Search',
    whatIsIt: 'Search algorithm that eliminates half the search space each iteration by comparing target to middle element of a sorted range.',
    whyMatters: 'Reduces O(n) search to O(log n). Beyond sorted arrays: applies to search-space problems, rotated arrays, peak finding.',
    whenToUse: [
      'Searching in sorted array',
      'Finding boundary (first/last occurrence)',
      'Search on answer space (binary search on result)',
      'Minimizing maximum or maximizing minimum',
    ],
    keyIdea: 'Ask: "Can I eliminate half the possibilities with one comparison?" If yes, binary search applies.',
    conceptCheck: { prompt: 'What property justifies discarding half the candidates in binary search?', options: [
      { text: 'The search range is ordered, so comparing the middle rules out one side.', correct: true, feedback: 'Correct. Order links the middle comparison to every candidate on one side.' },
      { text: 'The array has an even number of elements.', correct: false, feedback: 'Parity does not justify eliminating candidates.' },
      { text: 'The target occurs exactly once.', correct: false, feedback: 'Uniqueness is not required; ordered data is what justifies discarding a half.' },
    ] },
    example: {
      problem: 'Find target in sorted array [1, 3, 5, 7, 9, 11]',
      approach: 'Compare target to middle element. Adjust search range based on comparison.',
      code: `left, right = 0, len(arr) - 1
while left <= right:
    mid = (left + right) // 2
    if arr[mid] == target:
        return mid
    elif arr[mid] < target:
        left = mid + 1
    else:
        right = mid - 1
return -1`,
    },
    complexity: {
      time: 'O(log n)',
      space: 'O(1) iterative, O(log n) recursive',
    },
    nextSteps: [
      'Visualize search space halving',
      'Learn boundary search patterns',
      'Practice binary search variations',
    ],
  },
  {
    id: 'foundations',
    title: 'Algorithm Foundations',
    whatIsIt: 'Core principles for analyzing and solving algorithmic problems: complexity analysis, problem decomposition, and systematic thinking.',
    whyMatters: 'Understanding Big-O, time-space tradeoffs, and problem-solving frameworks lets you evaluate solutions and communicate clearly in interviews.',
    whenToUse: [
      'Always – before writing code, analyze the problem',
      'Evaluating multiple solution approaches',
      'Optimizing existing solutions',
      'Explaining your reasoning in interviews',
    ],
    keyIdea: 'Good solutions balance correctness, time complexity, space complexity, and code clarity. Optimization starts with understanding the problem.',
    conceptCheck: { prompt: 'When comparing two correct approaches, what should guide the trade-off?', options: [
      { text: 'Input constraints, time cost, and extra space together.', correct: true, feedback: 'Correct. Constraints determine whether an approach is feasible; time and space expose its trade-offs.' },
      { text: 'Choose whichever solution uses fewer lines of code.', correct: false, feedback: 'Line count does not establish correctness or scalability.' },
      { text: 'Always choose the approach with the lowest space use.', correct: false, feedback: 'Space is one constraint. A time-space trade-off may be necessary for the input size.' },
    ] },
    example: {
      problem: 'Find duplicate in array',
      approach: 'Compare brute force O(n²) vs hash set O(n) time/space vs sorting O(n log n) time.',
      code: `# O(n) time, O(n) space
seen = set()
for num in arr:
    if num in seen:
        return num
    seen.add(num)`,
    },
    complexity: {
      notation: 'O(1) < O(log n) < O(n) < O(n log n) < O(n²) < O(2ⁿ) < O(n!)',
      goal: 'Aim for O(n) or better for most interview problems',
    },
    nextSteps: [
      'Practice complexity analysis on sample problems',
      'Learn common algorithmic patterns',
      'Start with array problems',
    ],
  },
];

export const CONCEPT_MAP = Object.fromEntries(CONCEPTS.map((c) => [c.id, c]));

/** Get concept for a roadmap node */
export function getConceptForNode(nodeId) {
  return CONCEPT_MAP[nodeId] || SUPPLEMENTAL_BY_NODE[nodeId]?.concept || null;
}

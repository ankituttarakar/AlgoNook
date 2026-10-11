// Reference problem flow: a platform-style array/hash-set interview question.
// The flow is declarative so later missions can supply content without changing the renderer.
const standardOptions = (correct, distractors, correctRationale, rationales) => [
  { text: correct, correct: true, rationale: correctRationale },
  ...distractors.map((text, index) => ({ text, correct: false, rationale: rationales[index] })),
];

const flowStep = (id, section, heading, type, content, xpLabel, difficulty = 'med') => ({
  id,
  section,
  heading,
  type,
  xpLabel,
  difficulty,
  ...content,
});

export const MISSION_1_DATA = {
  id: 'arr-1',
  topic: 'arrays',
  kind: 'standard',
  title: 'CONTAINS DUPLICATE',
  skill: 'contains-duplicate',
  brief: 'Given an integer array, determine whether any value occurs more than once. Analyze the specification, choose an approach, implement it, and justify its correctness and complexity.',
  intel: [
    'Return true as soon as the requirement is met; return false only after confirming every value is distinct.',
    'The input is not guaranteed to be sorted, and values may be negative.',
    'The maximum input size makes the worst-case cost of your approach relevant.',
  ],
  learningFlow: true,
  problemFlow: {
    id: 'ARRAYS · 001',
    difficulty: 'Easy',
    title: 'Contains Duplicate',
    steps: [
      flowStep('problem', 'PROBLEM', 'Read the specification', 'problem', {
        statement: 'Given an integer array nums, return true if any value appears at least twice. Return false when every element is distinct.',
        constraints: [
          '1 ≤ nums.length ≤ 100,000',
          '−1,000,000,000 ≤ nums[i] ≤ 1,000,000,000',
          'The input may contain negative values and repeated values.',
        ],
        examples: [
          { input: 'nums = [1, 2, 3, 1]', output: 'true', explanation: 'The value 1 occurs at indices 0 and 3.' },
          { input: 'nums = [1, 2, 3, 4]', output: 'false', explanation: 'Every value occurs exactly once.' },
          { input: 'nums = [1, 1, 1, 3, 3, 4, 3, 2, 4, 2]', output: 'true', explanation: 'Several values repeat; finding any one is sufficient.' },
        ],
      }, 'PROBLEM REVIEW', 'easy'),

      flowStep('understand', 'UNDERSTAND', 'Interpret the requirement', 'choice', {
        prompt: 'Which condition exactly requires the function to return true?',
        nextLabel: 'Pattern',
        options: standardOptions(
          'There are two different indices i and j where nums[i] equals nums[j].',
          ['The array contains at least two elements.', 'A value is greater than the average of the array.'],
          '“Appears at least twice” means the same value occurs at two distinct positions; otherwise the result is false.',
          ['Array length alone does not establish a repeated value.', 'The requirement is about equality between entries, not their magnitude.'],
        ),
      }, 'UNDERSTAND INPUT', 'easy'),

      flowStep('pattern', 'PATTERN', 'Recognize the reusable pattern', 'choice', {
        prompt: 'A stream of records arrives once, in no useful order. You must detect whether the current key occurred earlier, without rescanning prior records. Which general technique fits?',
        nextLabel: 'Approach',
        options: standardOptions(
          'Maintain a set of keys already processed and query membership before insertion.',
          ['Keep only the most recent key in a queue.', 'Sort the stream, then compare adjacent keys.'],
          'This is a reusable visited-state membership pattern: retain the processed keys and check each new key against them.',
          ['A queue that keeps only one key loses older keys that may repeat later.', 'Sorting requires retaining and reordering the data, and is unavailable for a one-pass stream.'],
        ),
      }, 'PATTERN RECOGNITION'),

      flowStep('approach', 'APPROACH', 'Choose an approach', 'choice', {
        prompt: 'Before choosing code, identify the minimum useful state: at each index, what must you retain so one pass can decide whether the current value occurred earlier?',
        nextLabel: 'Complexity',
        options: standardOptions(
          'The distinct values in the prefix before the current index.',
          ['Only the previous value.', 'The indices of the minimum and maximum values.'],
          'A repeat can be arbitrarily far back, so the state must represent all values encountered so far; duplicates in that state need not be stored twice.',
          ['A repeated value can be separated from its earlier occurrence by any number of elements.', 'Minimum and maximum indices do not answer whether an arbitrary value was seen.'],
        ),
      }, 'APPROACH SELECTION'),

      flowStep('complexity', 'COMPLEXITY', 'State the trade-off', 'choice', {
        prompt: 'For the one-pass Set approach, what are the expected time and auxiliary-space complexities?',
        nextLabel: 'Pseudocode',
        options: standardOptions(
          'Expected O(n) time and O(n) auxiliary space.',
          ['O(log n) time and O(1) auxiliary space.', 'O(n²) time and O(1) auxiliary space.'],
          'Each value is processed once with average constant-time set operations; in the no-duplicate case the Set can hold n values.',
          ['The input is not sorted, and the set may grow with the number of distinct values.', 'Nested-pair comparison is quadratic; this is not the selected approach.'],
        ),
      }, 'COMPLEXITY ANALYSIS'),

      flowStep('pseudocode', 'PSEUDOCODE', 'Order the algorithm', 'order', {
        challenge: {
          q: 'Arrange the steps for the one-pass hash-set solution.',
          items: [
            'Create an empty set named seen.',
            'For each num in nums, check whether seen already contains num.',
            'If num is present, return true; otherwise add num to seen.',
            'After the loop, return false.',
          ],
          why: 'The set represents the already-processed prefix. Check before inserting so a repeated value is detected on its second occurrence.',
          hint: 'A value must be checked against the visited prefix before it is added to that prefix.',
        },
      }, 'PSEUDOCODE DESIGN'),

      flowStep('code', 'CODE', 'Implement the function', 'implementation', {
        challenge: {
          prompt: 'Write containsDuplicate(nums). Use the Set approach you selected. Check a value before recording it, and handle the no-duplicate case after the loop.',
          starter: 'function containsDuplicate(nums) {\n  // Write your implementation here\n}',
          starterCodeByLanguage: {
            cpp: '#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    bool containsDuplicate(vector<int>& nums) {\n        // Write your implementation here\n    }\n};\n',
            java: 'class Solution {\n    public boolean containsDuplicate(int[] nums) {\n        // Write your implementation here\n    }\n}\n',
            python: 'def containsDuplicate(nums: list[int]) -> bool:\n    seen = set()\n    for index, num in enumerate(nums):\n        if num in seen:\n            algonook.step("duplicate", {"array": nums, "index": index, "value": num, "seen": sorted(seen)})\n            return True\n        seen.add(num)\n        algonook.step("visit", {"array": nums, "index": index, "value": num, "seen": sorted(seen)})\n    algonook.step("complete", {"array": nums, "seen": sorted(seen)})\n    return False\n',
            javascript: 'function containsDuplicate(nums) {\n  // Write your implementation here\n}',
            c: '#include <stdbool.h>\n\nbool containsDuplicate(const int *nums, int numsSize) {\n    // Write your implementation here\n}\n',
          },
          requirements: [
            { id: 'state', label: 'Initialize a Set for previously seen values', pattern: '(?:const|let|var)\\s+seen\\s*=\\s*new\\s+Set\\s*\\(' },
            { id: 'traverse', label: 'Visit values from nums in one traversal', pattern: 'for\\s*\\([^)]*(?:\\bof\\s+nums\\b|nums\\s*\\.\\s*length)' },
            { id: 'membership', label: 'Check whether the current num is already in seen', pattern: 'seen\\s*\\.\\s*has\\s*\\(\\s*num\\s*\\)' },
            { id: 'early-return', label: 'Return true when membership reports a duplicate', pattern: 'if\\s*\\(\\s*seen\\s*\\.\\s*has\\s*\\(\\s*num\\s*\\)\\s*\\)\\s*\\{?\\s*return\\s+true' },
            { id: 'insert', label: 'Add each new num to seen', pattern: 'seen\\s*\\.\\s*add\\s*\\(\\s*num\\s*\\)' },
            { id: 'fallback', label: 'Return false after all values are processed', pattern: 'return\\s+false\\s*;?\\s*\\}' },
          ],
          ordering: { before: 'seen.has(num)', after: 'seen.add(num)', label: 'Check membership before recording the value' },
          ladder: [
            'Goal: return true as soon as a value is encountered for the second time.',
            'Observation: each current value only needs comparison with the visited prefix.',
            'Pattern: maintain a collection optimized for membership checks.',
            'Invariant: before each iteration, seen contains exactly the distinct values from earlier positions.',
            'Pseudocode: check membership; return true on a hit; otherwise insert; return false after the loop.',
            'Code structure: initialize Set, iterate, check with has, insert with add, then return false.',
          ],
        },
      }, 'IMPLEMENTATION', 'hard'),

      flowStep('test', 'TEST CASES', 'Verify edge cases', 'tests', {
        cases: [
          {
            nums: [7], prompt: 'A one-element array has no pair of positions. What should the function return?',
            options: standardOptions('false', ['true'], 'No value can appear twice in a one-element array.', ['There is only one occurrence.']),
          },
          {
            nums: [-4, 0, 9, -4], prompt: 'The repeated value is negative and occurs at the end. What is the result?',
            options: standardOptions('true', ['false'], 'Set membership is based on the value, including negative integers; the second −4 is detected.', ['The input is not sorted, and negative values do not prevent Set membership.']),
          },
          {
            nums: [2, 5, 8, 11], prompt: 'A full scan finds no repeated value. What should the function return?',
            options: standardOptions('false', ['true'], 'The loop finishes without a membership hit, so all values are distinct.', ['A duplicate is not inferred from array length alone.']),
          },
          {
            nums: [3, 1, 6, 8, 1], prompt: 'The repeated value appears well after its first occurrence. What is the result?',
            options: standardOptions('true', ['false'], 'The Set retains earlier values until the scan ends, so the later 1 is recognized.', ['A one-pass scan still detects repeats separated by other values.']),
          },
          {
            nums: [5, 1, 2, 5], inputDisplay: '[5, 1, 2, …, 5] (length = 100,000; first and last values match)', prompt: 'At the maximum allowed length, the only repeat is at the final position. What should the function return?',
            options: standardOptions('true', ['false'], 'The final value matches one in the earlier prefix. The algorithm must keep enough state through the full scan.', ['A duplicate is still present even when it occurs at the boundary of the input.']),
          },
        ],
      }, 'TEST REVIEW', 'med'),

      flowStep('explain', 'EXPLAIN', 'Justify the invariant', 'choice', {
        prompt: 'At the start of each iteration, seen contains exactly the distinct values from earlier indices. Why does this invariant prove the algorithm is correct?',
        nextLabel: 'Transfer',
        options: standardOptions(
          'A membership hit proves an equal value exists at an earlier index; if the scan ends without a hit, every value was distinct.',
          ['The invariant says seen contains the current and all future values.', 'Adding a value to seen proves it will occur again later.'],
          'The invariant ties seen to the processed prefix, so a hit identifies a prior occurrence, while no hit through the end means no pair of equal positions exists.',
          ['At the start of an iteration, seen contains only values from earlier positions.', 'Insertion records one occurrence; it cannot prove that another occurrence will follow.'],
        ),
      }, 'INVARIANT EXPLANATION'),

      flowStep('transfer', 'TRANSFER', 'Adapt the pattern', 'choice', {
        prompt: 'Transfer: now return true only if equal values occur at indices i and j with |i − j| ≤ k. For each value, what state and check are needed to enforce this new condition in one pass?',
        nextLabel: 'Finish',
        options: standardOptions(
          'Store each value’s most recent index; before updating it, check whether the index difference is at most k.',
          ['Store only whether each value has appeared, then return true for any repeat.', 'Sort nums and compare adjacent values, tracking their sorted distance.'],
          'The new requirement depends on original positions and the nearest prior occurrence. Retaining the latest index is sufficient because it is the closest earlier match.',
          ['A prior occurrence may be farther than k, so membership alone cannot decide this variant.', 'Sorted neighbors are not necessarily close in the original index order.'],
        ),
      }, 'PATTERN TRANSFER'),
    ],
  },
};

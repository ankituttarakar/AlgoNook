// Sectors 01–03: Arrays, Strings, Linked Lists
import { mc, order } from './helpers.js';
import { MISSION_1_DATA } from './mission1Data.js';

export default [
  // ───────────── 01 ARRAYS ─────────────
  {
    ...MISSION_1_DATA,
    learningFlow: true,
    challenges: [
      mc('easy', 'Why is reading a[i] from an array O(1)?', [
        ['Elements sit in contiguous memory, so index i becomes a direct address calculation', 'Correct. base + i×size is one arithmetic step — no traversal needed.', true],
        ['Because arrays are always sorted', 'Sorting is unrelated. Even a shuffled array has O(1) index access.'],
        ['Because the CPU caches the whole array', 'Caches help speed, but the O(1) guarantee comes from direct address math, not caching.'],
        ['Because arrays have a fixed size', 'Dynamic arrays also give O(1) index access. Fixed size is not the reason.'],
      ], { hint: 'Think about how the computer finds the address of element i.' }),
      order('easy', 'Insert value X at the FRONT of an array that has spare capacity. Order the operations.', [
        'Shift every existing element one slot to the right, starting from the last',
        'Write X into slot 0',
        'Increase the array\'s length counter by 1',
      ], 'Shifting must start from the LAST element, or you overwrite data. Only after the gap exists can you write X and grow the length.', { hint: 'Make room before you write.' }),
      mc('med', 'What is the final value of s?', [
        ['8', 'Correct. i takes 0, 2, 4 → a[0]+a[2]+a[4] = 4+1+3 = 8.', true],
        ['24', 'That is the sum of ALL elements. The loop steps i by 2, skipping odd indices.'],
        ['14', 'You likely added a[1] and a[3] (the skipped ones) too. i jumps 0→2→4.'],
        ['5', 'The loop adds values, not indices — 4, 1 and 3 are added, not counted.'],
      ], {
        hint: 'Track i: it starts at 0 and increases by 2 each pass.',
        code: 'const a = [4, 9, 1, 7, 3];\nlet s = 0;\nfor (let i = 0; i < a.length; i += 2) {\n  s += a[i];\n}',
      }),
    ],
  },
  {
    id: 'arr-2', topic: 'two-pointers', kind: 'standard', title: 'THE TWO-POINTER GAMBIT', skill: 'two-pointers-pair-sum', learningFlow: true,
    brief: 'Two scout drones patrol the Grid from opposite ends. Move them correctly and problems that looked quadratic collapse into a single sweep.',
    intel: [
      'Two pointers sweeping toward each other turn many O(n²) searches into O(n).',
      'In a SORTED array, the sum tells you which pointer to move.',
      'Deleting from the middle costs O(n): everything after the gap must slide left.',
    ],
    challenges: [
      mc('med', 'Sorted array a, pointers L=0 and R=end. If a[L]+a[R] is SMALLER than the target, what is the correct move?', [
        ['Move L one step right (L++)', 'Correct. Dropping the smallest available element and taking a larger one is the only way to increase the sum.', true],
        ['Move R one step left (R--)', 'That removes the largest element, making the sum even smaller — away from target.'],
        ['Move both pointers inward', 'You would skip candidate pairs without knowing which side caused the shortfall.'],
        ['Restart with L at the middle', 'The two-pointer method works because each move is decided by the current sum — restarting throws that away.'],
      ], { hint: 'The sum is too small. Which end holds the small values?' }),
      mc('med', 'Why is deleting the middle element of an n-element array O(n)?', [
        ['Every element after the gap must shift one slot left', 'Correct. Contiguous memory leaves no holes — n/2 elements move on average.', true],
        ['The array must be re-sorted afterwards', 'Deletion does not require sorting; it requires closing the gap.'],
        ['The index counter must be rebuilt from scratch', 'Only the length decreases by 1; indices of later elements shift, which IS the O(n) shift.'],
        ['Memory must be reallocated', 'Deletion usually keeps the same allocation. Shifting elements is the real cost.'],
      ], { hint: 'What fills the hole left behind?' }),
      mc('med', 'What does this code leave in a?', [
        ['[5, 4, 3, 2, 1]', 'Correct. It swaps mirrored pairs until the pointers cross — a full in-place reverse.', true],
        ['[1, 2, 3, 4, 5]', 'That would mean no swap happened. i and j swap a[i] with a[j] each pass.'],
        ['[5, 4, 3, 1, 2]', 'The middle element stays, but ALL mirrored pairs swap: (1,5) and (2,4).'],
        ['[2, 1, 4, 3, 5]', 'That swaps only neighbors. Here i moves from the left end and j from the right end.'],
      ], {
        hint: 'Pass 1 swaps a[0]↔a[4]. Pass 2 swaps a[1]↔a[3]. Then i >= j.',
        code: 'const a = [1, 2, 3, 4, 5];\nlet i = 0, j = a.length - 1;\nwhile (i < j) {\n  [a[i], a[j]] = [a[j], a[i]];\n  i++; j--;\n}',
      }),
    ],
    problemFlow: {
      id: 'TWO POINTERS · 001', difficulty: 'Easy', title: 'Two Sum in a Sorted Array',
      steps: [
        { id: 'problem', section: 'PROBLEM', heading: 'Read the contract', type: 'problem', xpLabel: 'PROBLEM REVIEW', difficulty: 'easy', statement: 'Given a non-decreasing integer array and a target, return the two distinct indices whose values sum to target. Return an empty array when no pair exists.', constraints: ['2 ≤ nums.length ≤ 100,000', 'nums is sorted in non-decreasing order', 'Return indices i < j; do not reuse an element'], examples: [{ input: 'nums = [1, 3, 5, 7, 9], target = 10', output: '[0, 4]', explanation: 'nums[0] + nums[4] = 1 + 9 = 10.' }, { input: 'nums = [1, 2, 4, 8], target = 20', output: '[]', explanation: 'The search interval narrows until no two distinct indices remain.' }] },
        { id: 'pattern', section: 'PATTERN', heading: 'Choose the pattern', type: 'choice', xpLabel: 'PATTERN SELECTION', prompt: 'Which property makes an inward-moving pair of pointers useful here?', options: [
          { text: 'Sorted order lets the current sum prove which side can be discarded.', correct: true, rationale: 'If the sum is too small, the current right value cannot pair with any smaller left-side value, so advance left.' },
          { text: 'Every pair must be checked because sorting gives no information.', correct: false, rationale: 'Sorted order is precisely the evidence that lets each move eliminate candidates.' },
          { text: 'The answer must use the two largest values.', correct: false, rationale: 'The target determines the pair; endpoints are only the first candidate.' },
        ] },
        { id: 'complexity', section: 'COMPLEXITY', heading: 'State the trade-off', type: 'choice', xpLabel: 'COMPLEXITY ANALYSIS', prompt: 'For n values, what are the costs of one inward scan?', options: [
          { text: 'O(n) time and O(1) extra space.', correct: true, rationale: 'At least one pointer moves on each iteration, so there are at most n−1 checks and only two indices are stored.' },
          { text: 'O(n²) time and O(1) extra space.', correct: false, rationale: 'That is the nested-loop baseline; the pointers eliminate one side per comparison.' },
          { text: 'O(log n) time and O(n) extra space.', correct: false, rationale: 'The scan may visit linearly many candidates; it does not halve the interval.' },
        ] },
        { id: 'algorithm', section: 'ALGORITHM', heading: 'Build the invariant-preserving scan', type: 'order', xpLabel: 'ALGORITHM DESIGN', challenge: { q: 'Arrange the pair-sum loop steps.', items: ['Initialize left = 0 and right = nums.length - 1.', 'While left < right, compute nums[left] + nums[right].', 'Return the pair if the sum equals target.', 'If sum < target, increment left; otherwise decrement right.', 'Return [] after the pointers meet or cross.'], why: 'At each comparison the sorted order proves the discarded pairs cannot be valid. The active interval contains every remaining candidate.', hint: 'Keep the candidate interval explicit; equality returns before either pointer moves.' } },
        { id: 'implementation', section: 'IMPLEMENTATION', heading: 'Implement the scan', type: 'implementation', xpLabel: 'IMPLEMENTATION', difficulty: 'hard', challenge: { problemId: 'two-sum-sorted', executionLabel: 'Two Sum in a Sorted Array', prompt: 'Implement twoSumSorted(nums, target). Return a pair of distinct indices or [] when none exists. Add algonook.step("compare" | "move-left" | "move-right" | "found" | "not-found", state) to see the state emitted by your running function.', starter: 'function twoSumSorted(nums, target) {\n  // Keep a candidate interval with two pointers\n}', starterCodeByLanguage: { python: 'def twoSumSorted(nums, target):\n    left, right = 0, len(nums) - 1\n    while left < right:\n        total = nums[left] + nums[right]\n        algonook.step("compare", {"array": nums, "left": left, "right": right, "target": target, "sum": total})\n        if total == target:\n            algonook.step("found", {"array": nums, "left": left, "right": right, "target": target, "sum": total})\n            return [left, right]\n        if total < target:\n            left += 1\n            algonook.step("move-left", {"array": nums, "left": left, "right": right, "target": target, "sum": total})\n        else:\n            right -= 1\n            algonook.step("move-right", {"array": nums, "left": left, "right": right, "target": target, "sum": total})\n    algonook.step("not-found", {"array": nums, "left": left, "right": right, "target": target})\n    return []\n' }, requirements: [
          { id: 'left', label: 'Initialize a left pointer at the start', pattern: '\\bleft\\s*=\\s*0' },
          { id: 'right', label: 'Initialize a right pointer at the final index', pattern: '\\bright\\s*=\\s*nums\\.length\\s*-\\s*1' },
          { id: 'interval', label: 'Stop when pointers meet', pattern: 'while\\s*\\(\\s*left\\s*<\\s*right\\s*\\)' },
          { id: 'sum', label: 'Compare the current values with target', pattern: 'nums\\s*\\[\\s*left\\s*\\]\\s*\\+\\s*nums\\s*\\[\\s*right\\s*\\]' },
          { id: 'move', label: 'Move a pointer based on the sum comparison', pattern: 'left\\+\\+|left\\s*\\+=\\s*1|right--|right\\s*-=' },
          { id: 'return', label: 'Return the matching indices', pattern: 'return\\s*\\[\\s*left\\s*,\\s*right\\s*\\]' },
        ], ordering: { before: 'if (sum < target)', after: 'left++', label: 'Move left only after confirming the sum is too small.' } } },
        { id: 'tests', section: 'TESTS', heading: 'Check boundaries and duplicates', type: 'tests', xpLabel: 'TEST REVIEW', cases: [
          { nums: [1, 3, 5, 7, 9], inputDisplay: 'nums = [1, 3, 5, 7, 9], target = 10', prompt: 'What should the first endpoint check return?', options: [{ text: '[0, 4]', correct: true, rationale: 'The first and last values sum to 10.' }, { text: '[1, 3]', correct: false, rationale: 'Indices 1 and 3 sum to 10 too, but the contract returns the pair found by the algorithm; the endpoint pair is already valid.' }] },
          { nums: [2, 2, 3], inputDisplay: 'nums = [2, 2, 3], target = 4', prompt: 'Can the two equal values form a valid answer?', options: [{ text: 'Yes: indices 0 and 1 are distinct.', correct: true, rationale: 'Equal values are allowed as long as the indices differ.' }, { text: 'No: values must be different.', correct: false, rationale: 'The contract requires distinct indices, not distinct values.' }] },
          { nums: [-4, -1, 2, 6], inputDisplay: 'nums = [-4, -1, 2, 6], target = 1', prompt: 'After checking -4 + 6 = 2, which pointer moves?', options: [{ text: 'Move right left, because the sum is too large.', correct: true, rationale: 'Dropping the largest endpoint can lower the sum.' }, { text: 'Move left right.', correct: false, rationale: 'That raises the current sum further.' }] },
        ] },
        { id: 'explain', section: 'EXPLAIN', heading: 'Defend the invariant', type: 'choice', xpLabel: 'INVARIANT EXPLANATION', prompt: 'Why is it safe to increment left when nums[left] + nums[right] < target?', options: [
          { text: 'With this right value and every smaller right value, the current left value cannot reach target; sorted order lets us discard those pairs.', correct: true, rationale: 'The comparison eliminates all pairs using this left index, so no valid candidate is lost.' },
          { text: 'The smallest value is never part of a solution.', correct: false, rationale: 'A smallest value may be part of a valid pair; the current comparison is what determines the safe move.' },
          { text: 'Both pointers should always move together.', correct: false, rationale: 'Moving both can skip valid pairs without evidence.' },
        ] },
        { id: 'transfer', section: 'TRANSFER', heading: 'Transfer to palindrome checking', type: 'choice', xpLabel: 'PATTERN TRANSFER', prompt: 'For a palindrome check, what changes in the invariant and pointer movement?', options: [
          { text: 'Compare mirrored values; stop on mismatch, otherwise move both pointers inward.', correct: true, rationale: 'The pair-sum comparison is replaced by an equality condition on symmetric positions.' },
          { text: 'Keep the sum comparison and move only the left pointer.', correct: false, rationale: 'Palindrome checking has no target sum or sorted-sum elimination rule.' },
          { text: 'Sort the string before comparing.', correct: false, rationale: 'Sorting destroys character order, which defines a palindrome.' },
        ] },
      ],
    },
  },
  {
    id: 'arr-3', topic: 'arrays', kind: 'boss', title: 'BREACH: THE MEMORY GRID',
    brief: 'SECTOR BOSS — the Grid defends itself with rotation ciphers and profit streams. Prove the array obeys you.',
    intel: [
      'Rotating right by k moves the last k elements to the front.',
      'Kadane\'s algorithm: carry a running sum; if it goes negative, drop it.',
      'Merging sorted arrays is linear: always take the smaller front element.',
    ],
    challenges: [
      mc('hard', 'Rotate [1, 2, 3, 4, 5] RIGHT by 2. Result?', [
        ['[4, 5, 1, 2, 3]', 'Correct. The last 2 elements (4, 5) wrap to the front, preserving order.', true],
        ['[3, 4, 5, 1, 2]', 'That is a LEFT rotation by 2 (or right by 3). Right by 2 takes the last two elements.'],
        ['[5, 4, 3, 2, 1]', 'That is a full reversal, not a rotation. Rotation preserves internal order.'],
        ['[2, 3, 4, 5, 1]', 'That is a right rotation by 1. k=2 wraps two elements.'],
      ], { hint: 'Cut the array k positions from the end and move that tail to the front.' }),
      mc('hard', 'Kadane\'s algorithm on [-2, 1, -3, 4, -1, 2, 1, -5, 4] — what is the maximum subarray sum?', [
        ['6', 'Correct. The window [4, -1, 2, 1] sums to 6. The negative streak -2,1,-3 is dropped before the 4.', true],
        ['4', 'The element 4 alone is not maximal — adding -1, 2, 1 after it still grows the total to 6.'],
        ['9', 'You likely kept the whole array after the -3. The -5 near the end must be excluded.'],
        ['1', 'Kadane resets when the running sum goes negative; the best window is far better than 1.'],
      ], { hint: 'Track running sum; restart at 4. Then ride 4, -1, 2, 1.' }),
      order('hard', 'Merge two sorted arrays A and B into one sorted array. Order the steps of the main loop.', [
        'Compare the current front element of A with the front of B',
        'Copy the smaller element into the output',
        'Advance the pointer of the array you copied from',
        'Repeat until one array is exhausted, then append the other array\'s remainder',
      ], 'Each comparison emits exactly one element, so the merge is O(n+m). The remainder is already sorted, so it appends untouched.', { hint: 'One comparison, one output, one pointer move.' }),
    ],
  },

  // ───────────── 02 STRINGS ─────────────
  {
    id: 'str-1', topic: 'strings', kind: 'standard', title: 'CHARACTERS IN A ROW',
    brief: 'The Grid speaks in strings. They look like arrays of characters — but they refuse to be rewritten in place.',
    intel: [
      'Strings in JS are immutable: you cannot change a character in place.',
      's[i] reads a character; building a new string is how you "edit".',
      'A palindrome reads identically from both ends — perfect two-pointer target.',
    ],
    challenges: [
      mc('easy', 'In JavaScript, what does this leave in s?', [
        ["Still 'BYTE' — strings are immutable", 'Correct. s[0] = "X" silently fails in non-strict mode; the original string never changes.', true],
        ["'XYTE'", 'That would require mutable characters. JS strings cannot be modified in place.'],
        ['Throws a syntax error at parse time', 'It parses fine. In sloppy mode it is a silent no-op; in strict mode a TypeError at runtime.'],
        ["'X'", 'Assignment via index never shrinks a string. To change it you must build a new string.'],
      ], {
        hint: 'Can you ever write to s[0] in JS?',
        code: 'let s = "BYTE";\ns[0] = "X";',
      }),
      mc('easy', 'What does "algonook".slice(4) return?', [
        ["'nook'", 'Correct. slice(4) takes everything from index 4 to the end: n-o-o-k.', true],
        ["'algo'", "That is slice(0, 4). slice(4) starts AT index 4, dropping 'algo'."],
        ["'nookk'", 'The string has 8 characters; from index 4 there are exactly 4: "nook".'],
        ["'n'", 'That is charAt(4)/s[4]. slice(4) takes the whole tail, not one character.'],
      ], { hint: 'slice(start) keeps everything from start onward.' }),
      order('easy', 'Check whether string s is a palindrome with two pointers. Order the loop logic.', [
        'Set L to the first index and R to the last index',
        'Compare s[L] with s[R] — if they differ, return false',
        'Move L right and R left',
        'If the pointers cross with no mismatch, return true',
      ], 'Each pass verifies one mirrored pair and shrinks the window. Crossing pointers means every pair matched — O(n) time, O(1) space.', { hint: 'Work from both ends toward the middle.' }),
    ],
  },
  {
    id: 'str-2', topic: 'strings', kind: 'standard', title: 'PATTERN SIGNALS',
    brief: 'Encrypted chatter floods the channel. Split it, flip it, fingerprint it — anagrams and reversed words hide the real orders.',
    intel: [
      'split / reverse / join chains transform strings without manual loops.',
      'Naive substring search costs O(n×m): every position, every character.',
      'Anagrams share an identical character-frequency fingerprint.',
    ],
    challenges: [
      mc('med', 'What is the result?', [
        ["'falls grid the'", 'Correct. split gives [the, grid, falls]; reverse flips the array; join stitches it with spaces.', true],
        ["'the grid falls'", 'reverse() was applied — the word order changes.'],
        ["'fallsgridthe'", 'join(" ") inserts spaces. join("") would glue them together.'],
        ['Error: strings have no reverse', 'reverse() is called on the ARRAY from split(), which does have reverse.'],
      ], {
        hint: 'split → array. reverse → array. join → string.',
        code: '"the grid falls"\n  .split(" ")\n  .reverse()\n  .join(" ")',
      }),
      mc('med', 'Why does naive substring search (needle length m in haystack length n) cost O(n×m)?', [
        ['At each of ~n starting positions it may compare up to m characters', 'Correct. Worst case (e.g. "aaaa...a" in "aaaa...a") forces the full m comparisons almost everywhere.', true],
        ['Because strings are immutable', 'Immutability affects construction cost, not the comparison count.'],
        ['Because characters must be converted to numbers first', 'No conversion is needed; characters compare directly.'],
        ['Because the haystack must be sorted first', 'Searching does not sort anything. The cost is position × per-position comparisons.'],
      ], { hint: 'Count comparisons in the worst case: positions × work per position.' }),
      mc('med', 'Fastest way to check whether two strings are anagrams (lowercase letters only)?', [
        ['Count character frequencies of both into a 26-slot table and compare — O(n)', 'Correct. One pass per string, fixed-size table: linear time, constant space.', true],
        ['Sort both strings and compare — O(n log n)', 'It works, but sorting costs n log n. Frequency counting is strictly faster asymptotically.'],
        ['For each char in s1, search for it in s2 — O(n²)', 'Correct but quadratic; repeated scans make it the slowest option here.'],
        ['Compare their lengths only', 'Equal length is necessary but nowhere near sufficient: "ab" vs "cd".'],
      ], { hint: 'Anagrams are equal as multisets of characters. How do you fingerprint a multiset?' }),
    ],
  },
  {
    id: 'str-3', topic: 'strings', kind: 'boss', title: 'CIPHER BREAK',
    brief: 'SECTOR BOSS — the final cipher resists brute force. Rolling hashes and sliding windows are your lockpicks.',
    intel: [
      'Prepending characters builds a reversed string one character at a time.',
      'Rabin–Karp replaces re-comparison with a rolling hash: O(n+m) expected.',
      'A sliding window updates incrementally: remove the left char, add the right one.',
    ],
    challenges: [
      mc('hard', 'What does r hold at the end?', [
        ["'cba'", 'Correct. Each character is PREPENDED: "a" → "ba" → "cba". Prepending reverses the read order.', true],
        ["'abc'", 'That would be appending (r = r + c). Here the new char goes in FRONT.'],
        ["'bca'", 'Trace it: c=\'a\' → "a"; c=\'b\' → "ba"; c=\'c\' → "cba".'],
        ["'cab'", 'Order of prepend: last character read ends up first. "cba" is the exact reversal.'],
      ], {
        hint: 'r = c + r puts the newest character at the front.',
        code: 'const s = "abc";\nlet r = "";\nfor (const c of s) {\n  r = c + r;\n}',
      }),
      mc('hard', 'What makes Rabin–Karp faster than naive substring search in practice?', [
        ['A rolling hash updates the window\'s fingerprint in O(1) as it slides', 'Correct. Subtract the outgoing char, shift, add the incoming char — full re-hashing is avoided, giving O(n+m) expected time.', true],
        ['It sorts the haystack first', 'Sorting destroys positions and is not part of Rabin–Karp.'],
        ['It compares characters from both ends simultaneously', 'That trick helps palindromes, not substring search.'],
        ['It skips all positions that cannot match by length', 'Length pruning is trivial and shared by naive search; the rolling hash is the real speedup.'],
      ], { hint: 'Avoid recomputing the fingerprint of the whole window each step.' }),
      order('hard', 'Maintain a character-count window of size k while sliding right by one. Order the update.', [
        'Decrement the count of the character leaving at the left edge',
        'Increment the count of the new character entering at the right edge',
        'Shift both window boundaries one step right',
        'Compare the window\'s counts against the target fingerprint',
      ], 'The window mutates in O(1) per slide instead of O(k) rebuilds — that is the entire point of the sliding-window technique.', { hint: 'Update first, then move, then test.' }),
    ],
  },

  // ───────────── 03 LINKED LISTS ─────────────
  {
    id: 'lnk-1', topic: 'linked', kind: 'standard', title: 'CHAINED NODES',
    brief: 'Beyond the Grid lie the Scatter Fields — data nodes strewn across memory, held together only by pointers. Follow the chain.',
    intel: [
      'A node = value + pointer to the next node. No contiguity required.',
      'Reaching the k-th node costs O(k): you must walk the chain.',
      'Rewiring pointers inserts/removes in O(1) — if you already hold the spot.',
    ],
    challenges: [
      mc('easy', 'What does a singly linked list node contain?', [
        ['A value and a pointer to the next node', 'Correct. That single next-pointer is the whole structure — chains form by linking nodes.', true],
        ['A value and an index number', 'Indices are array thinking. List nodes have no idea where they are.'],
        ['A value and pointers to BOTH neighbors', 'That is a DOUBLY linked list. Singly linked nodes point forward only.'],
        ['A value and a pointer to the head', 'Nodes point to their successor, not back to the head.'],
      ], { hint: 'Just enough to find the next node.' }),
      order('easy', 'Insert node N after node P in a singly linked list. Get the order RIGHT or lose the chain.', [
        'Set N.next to P.next',
        'Set P.next to N',
      ], 'Reversed, P.next = N first destroys your only reference to the rest of the chain — N.next = N would create a self-loop. Always grab the old chain BEFORE rewiring.', { hint: 'Save the link you are about to break.' }),
      mc('med', 'head points to 3→1→4→1→5. What does c become?', [
        ['5', 'Correct. The loop visits every node exactly once: 3, 1, 4, 1, 5 → c = 5.', true],
        ['4', 'The loop runs while n is truthy — the last node (5) is counted before n becomes null.'],
        ['14', 'c increments per NODE, not per value. It counts length, not sum.'],
        ['Infinite loop', 'Each step does n = n.next, and the last node\'s next is null — the walk terminates.'],
      ], {
        hint: 'One increment per node visited.',
        code: 'let c = 0;\nfor (let n = head; n; n = n.next) {\n  c++;\n}',
      }),
    ],
  },
  {
    id: 'lnk-2', topic: 'linked', kind: 'standard', title: 'THE REVERSAL PROTOCOL',
    brief: 'A corrupted data stream flows the wrong way. Reverse the chain in place, find its middle, and hunt the cycle hiding in the fields.',
    intel: [
      'Reversing a list = flipping every next-pointer, three pointers at a time.',
      'Slow/fast pointers find the middle in one pass: fast moves 2× slow.',
      'If fast ever laps slow, the list has a cycle (Floyd\'s algorithm).',
    ],
    challenges: [
      order('med', 'Reverse a linked list in place. Order one iteration of the loop (prev, curr).', [
        'Save curr.next into a temp (next)',
        'Point curr.next back at prev',
        'Advance prev to curr',
        'Advance curr to the saved next',
      ], 'Save-before-rewire again: without the temp, flipping curr.next orphans the rest of the list. Repeat until curr is null; prev is the new head.', { hint: 'Four moves: save, flip, advance, advance.' }),
      mc('med', 'Slow and fast pointers start at the head of 1→2→3→4→5. Fast moves 2 steps, slow 1. Where is slow when fast reaches the end?', [
        ['Node 3 — the middle', 'Correct. Fast covers ground twice as fast, so when fast has seen the whole list, slow has seen half.', true],
        ['Node 5', 'Slow moves one step per iteration; it reaches the end only if fast had to walk the list twice.'],
        ['Node 2', 'After 1 full iteration slow=2, but fast is only at 3 — the loop continues.'],
        ['Node 4', 'Slow lands exactly on the median of 5 nodes: position 3.'],
      ], { hint: 'When fast has travelled distance n, slow has travelled n/2.' }),
      mc('med', 'Floyd\'s cycle detection: slow and fast pointers eventually meet. What does that PROVE?', [
        ['The list contains a cycle', 'Correct. On a finite chain fast would hit null; meeting means both are trapped looping the same ring.', true],
        ['The list has no cycle', 'No cycle means fast reaches null and the loop exits — they can never meet.'],
        ['The cycle starts exactly where they met', 'The meeting point is inside the cycle but NOT its entry; finding entry needs a second phase.'],
        ['The list length is even', 'Meeting depends on the ring, not on any parity of the list.'],
      ], { hint: 'On a finite chain, could fast ever meet slow?' }),
    ],
  },
  {
    id: 'lnk-3', topic: 'linked', kind: 'boss', title: 'BREACH: POINTER HELL',
    brief: 'SECTOR BOSS — the Scatter Fields knot themselves into traps: edge cases at the head, deletions one step from the tail.',
    intel: [
      'A dummy head node makes "delete the first node" identical to any delete.',
      'To remove the n-th node from the END, park a fast pointer n steps ahead.',
      'Merging sorted lists mirrors merging sorted arrays — pointer per list.',
    ],
    challenges: [
      mc('hard', 'Why do linked-list algorithms often start with a DUMMY head node?', [
        ['It makes operations on the first real node use the same code path as any other node', 'Correct. Deleting/inserting at the head no longer needs special cases — every node has a predecessor.', true],
        ['It makes traversal O(1) faster', 'A dummy adds one node; asymptotically nothing changes. It is about code uniformity, not speed.'],
        ['It prevents memory leaks', 'The dummy is itself allocated memory; leak safety comes from correct pointer handling.'],
        ['It lets you index nodes directly', 'Lists never gain O(1) indexing — you still walk pointers.'],
      ], { hint: 'What is special about deleting the FIRST node without a dummy?' }),
      mc('hard', 'List 1→2→3→4→5, remove the 2nd node from the END. Result?', [
        ['1→2→3→5', 'Correct. Fast starts 2 ahead; when fast hits the end, slow sits just before node 4 — unlink it.', true],
        ['1→2→4→5', 'That removes the 3rd from the end. A gap of n=2 lands slow on node 3, removing its successor 4.'],
        ['1→3→4→5', 'That removes node 2, the 4th from the end. Count from the tail, not the head.'],
        ['2→3→4→5', 'That removes the head — the 5th from the end. n=2 targets node 4.'],
      ], { hint: 'The 2nd from the end of five nodes is the 4th from the front.' }),
      order('hard', 'Merge two sorted linked lists into one sorted list. Order the loop body.', [
        'Compare the current nodes of both lists',
        'Attach the smaller node to the tail of the result',
        'Advance the pointer of the list that node came from',
        'When one list is exhausted, attach the other list\'s remaining chain whole',
      ], 'Each comparison links one node — O(n+m) pointer work, no new nodes needed. The leftover chain is already sorted, so it attaches in O(1).', { hint: 'Same rhythm as merging arrays, but with links instead of copies.' }),
    ],
  },
];

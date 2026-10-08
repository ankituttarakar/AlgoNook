// Mission 1: "The Missing Package" (Linear Search in Warehouse Sector)
// Full 11-step learning loop:
// 1. Story / interaction
// 2. Concept discovery
// 3. Think challenge
// 4. Guided reasoning
// 5. Algorithm trace
// 6. Coding challenge
// 7. Explanation question
// 8. Transfer challenge
// 9. Mission result
// 10. Mastery update
// 11. Review scheduling

export const LINEAR_SEARCH_LADDER = [
  // Level 1: Goal reminder
  'GOAL: Locate the target value inside an unsorted array and return its 0-based index. If absent, return -1.',
  
  // Level 2: Attentive Observation
  'OBSERVATION: Since the items are not in sorted order, can you jump directly to any slot and know if target is to the left or right? What is the only guaranteed way to not miss it?',
  
  // Level 3: Pattern & Structure
  'PATTERN: Traversal via linear loop (for let i = 0; i < array.length; i++). Look at elements one at a time from index 0.',
  
  // Level 4: Algorithmic Invariant
  'INVARIANT: At step i, you have verified that target is NOT in array[0..i-1]. If array[i] === target, immediately terminate and return i.',
  
  // Level 5: Pseudocode
  `PSEUDOCODE:
for i from 0 to length - 1:
    if array[i] == target:
        return i
return -1`,

  // Level 6: Code Skeleton
  `SKELETON:
function linearSearch(arr, target) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === target) return i;
  }
  return -1;
}`,
];

export const MISSION_1_DATA = {
  id: 'arr-1',
  topic: 'arrays',
  kind: 'standard',
  title: 'THE MISSING PACKAGE',
  skill: 'linear-search',
  brief: 'A vital encrypted data payload has gone missing in the automated Warehouse sector. The sector slots are completely unsorted. Search through the memory bays sequentially to locate package #9 and master linear search.',
  intel: [
    'An array stores elements in contiguous memory slots accessible by index.',
    'When elements are unsorted and unpredictable, the fundamental strategy is Linear Search.',
    'Linear Search checks elements one by one from beginning to end until the target is found or all slots are exhausted.',
  ],

  // Step 1: Story / Interaction & Context
  story: {
    location: 'WAREHOUSE BAY 01 · UNSORTED CONVEYOR',
    transmission: 'ALERT: Operator, an automated transport error dropped package #9 somewhere along the unsorted transit strip. The sensors cannot perform indexed hashing because the array order was scrambled during a power surge. We must scan the crates manually.',
    target: 9,
  },

  // Step 2: Concept Discovery
  discovery: {
    target: 9,
    slots: [14, 3, 27, 8, 9, 42, 6, 19],
    storyPrompt: 'Warehouse conveyor line has 8 sealed cargo bays. We must find Package #9. Tap the crates to scan their contents and discover the search dynamics.',
  },

  // Step 3: Think Challenge (Mental prediction before coding)
  think: [
    {
      prompt: '1. In an unsorted array of items, where MUST the search begin?',
      options: [
        {
          text: 'At index 0 (the very beginning of the array)',
          correct: true,
          rationale: 'Because the data is completely unsorted, any slot could hold the target. Starting at 0 ensures a systematic scan without leaving untracked gaps.',
        },
        {
          text: 'In the middle index (length / 2)',
          correct: false,
          rationale: 'Starting in the middle is only effective for sorted data (Binary Search). In an unsorted array, checking the middle gives zero clues about whether to look left or right.',
        },
        {
          text: 'At whichever slot holds the largest number',
          correct: false,
          rationale: 'You cannot know which slot holds the largest number without scanning every slot first anyway!',
        },
      ],
    },
    {
      prompt: '2. What should happen when the current element does NOT match the target?',
      options: [
        {
          text: 'Immediately return -1 indicating failure',
          correct: false,
          rationale: 'Returning -1 on the first mismatch would abort the search prematurely after checking just one item!',
        },
        {
          text: 'Advance the pointer to the next adjacent index (i + 1)',
          correct: true,
          rationale: 'If index i does not contain the target, the loop invariant dictates checking index i+1 next.',
        },
        {
          text: 'Restart the entire search from index 0',
          correct: false,
          rationale: 'Restarting from 0 causes an infinite loop.',
        },
      ],
    },
    {
      prompt: '3. When should the search algorithm stop and return -1?',
      options: [
        {
          text: 'When we hit a number larger than the target',
          correct: false,
          rationale: 'In an unsorted array, a smaller target could easily appear AFTER a larger number.',
        },
        {
          text: 'Only after all elements have been checked without finding a match',
          correct: true,
          rationale: 'You can only conclude the item does not exist once every single index from 0 to n-1 has been inspected.',
        },
        {
          text: 'After checking exactly half the elements',
          correct: false,
          rationale: 'The target could be in the second half of the unsorted array.',
        },
      ],
    },
  ],

  // Step 4 & 5: Guided reasoning & Step-by-step Algorithm Trace
  trace: {
    array: [14, 3, 27, 8, 9, 42, 6, 19],
    target: 9,
    ladder: LINEAR_SEARCH_LADDER,
  },

  // Step 6: Code Implementation Challenge
  codeChallenge: {
    prompt: 'Synthesize the linear search function for the warehouse logistics scanner. Assemble the missing control structures.',
    ladder: LINEAR_SEARCH_LADDER,
    blanks: [
      {
        id: 'loop_init',
        label: 'Loop Header',
        correct: 'let i = 0; i < arr.length; i++',
        options: [
          'let i = 0; i < arr.length; i++',
          'let i = 1; i <= arr.length; i++',
          'let i = arr.length; i > 0; i--',
        ],
        explain: 'Array indices are 0-indexed and run up to strictly less than arr.length.',
      },
      {
        id: 'condition',
        label: 'Match Condition',
        correct: 'arr[i] === target',
        options: [
          'arr[i] === target',
          'i === target',
          'arr[i] > target',
        ],
        explain: 'We are comparing the value inside arr[i] with target, not the index i itself.',
      },
      {
        id: 'return_not_found',
        label: 'Exhausted Return',
        correct: 'return -1',
        options: [
          'return -1',
          'return null',
          'return 0',
        ],
        explain: 'In standard algorithm conventions, returning -1 indicates the element was not found in the array.',
      },
    ],
  },

  // Step 7: Explanation Question (Affects Mastery)
  explanation: {
    question: 'Why does Linear Search require O(n) time in the worst case?',
    options: [
      {
        text: 'If the target is at the very end (index n-1) or not present at all, the algorithm must perform n comparisons.',
        correct: true,
        rationale: 'Precisely. In the worst case, every single one of the n elements must be inspected, making time proportional to n.',
      },
      {
        text: 'Because accessing an array element by index takes O(n) time.',
        correct: false,
        rationale: 'Reading an array element by index is O(1) contiguous memory access, not O(n). The O(n) comes from the loop making n comparisons.',
      },
      {
        text: 'Because the array has to be sorted before linear search can execute.',
        correct: false,
        rationale: 'Linear search does NOT require sorting — that is its primary advantage over binary search.',
      },
    ],
  },

  // Step 8: Transfer Challenge (New story context testing same algorithm)
  transfer: {
    newDomainTitle: 'SECTOR ARCHIVE: ATTENDANCE LEDGER',
    scenario: 'You are transferred to the Sector Academy terminal. A paper roster contains an unsorted list of student roll numbers: [104, 218, 92, 401, 77, 305]. A student claiming roll number 77 requests building clearance.',
    problemStatement: 'How does the terminal verify whether student 77 is present on this unsorted roster, and what is the computational complexity?',
    options: [
      {
        text: 'Execute Linear Search: compare 77 against each roll number from index 0 upwards. Takes O(n) worst-case time.',
        correct: true,
        rationale: 'Correct transfer! Just like searching crates in a warehouse, an unsorted student list requires linear search with O(n) complexity.',
      },
      {
        text: 'Perform Binary Search immediately by jumping to the middle roll number (401).',
        correct: false,
        rationale: 'The roster is explicitly unsorted. Binary search fails completely on unsorted sequences.',
      },
      {
        text: 'Access index 77 directly since the student roll number is 77.',
        correct: false,
        rationale: 'Roll numbers are student IDs, not array positions. The array only has 6 students (indices 0..5). Index 77 is out of bounds.',
      },
    ],
    ladder: [
      'TRANSFER HINT 1: Is the student list sorted or unsorted?',
      'TRANSFER HINT 2: Can we assume roll 77 is at index 77 when there are only 6 students?',
      'TRANSFER HINT 3: The exact same linear search algorithm applies: inspect each roll number from start to end.',
    ],
  },
};

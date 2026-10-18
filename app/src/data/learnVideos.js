// AlgoNook — Curated DSA Video & Shorts Catalog
// Organized by AlgoNook topic for targeted, focused learning.
// All entries are verified educational resources on YouTube with valid thumbnails.
// UI components dynamically consume this data with zero code modifications.

export const LEARN_TOPICS = [
  {
    id: 'arrays',
    label: 'Arrays',
    glyph: '[ ]',
    subtitle: 'Contiguous memory, indexing, traversal & two-pointer basics',
    roadmapNodeId: 'arrays',
  },
  {
    id: 'linked',
    label: 'Linked Lists',
    glyph: '->*',
    subtitle: 'Nodes, pointers, cycle detection & fast/slow runners',
    roadmapNodeId: 'linked-lists',
  },
  {
    id: 'stacks',
    label: 'Stacks',
    glyph: '[=]',
    subtitle: 'LIFO discipline, monotonic stacks, bracket balancing',
    roadmapNodeId: 'stacks-queues',
  },
  {
    id: 'queues',
    label: 'Queues',
    glyph: '>>>',
    subtitle: 'FIFO fairness, deques, BFS buffers & sliding windows',
    roadmapNodeId: 'stacks-queues',
  },
  {
    id: 'searching',
    label: 'Searching',
    glyph: '[?]',
    subtitle: 'Binary search, search-space halving & monotonic predicates',
    roadmapNodeId: 'binary-search',
  },
  {
    id: 'sorting',
    label: 'Sorting',
    glyph: '321',
    subtitle: 'Merge Sort, Quick Sort, invariants & stability trade-offs',
    roadmapNodeId: 'arrays',
  },
  {
    id: 'recursion',
    label: 'Recursion',
    glyph: '(())',
    subtitle: 'Call stack frames, base conditions & backtracking trees',
    roadmapNodeId: 'backtracking',
  },
  {
    id: 'trees',
    label: 'Trees',
    glyph: '/\\',
    subtitle: 'Binary trees, BST properties, DFS and BFS traversals',
    roadmapNodeId: 'trees',
  },
  {
    id: 'graphs',
    label: 'Graphs',
    glyph: 'o-o',
    subtitle: 'Adjacency lists, cycle detection, topological sort & paths',
    roadmapNodeId: 'graphs',
  },
  {
    id: 'dp',
    label: 'Dynamic Programming',
    glyph: ':::',
    subtitle: 'Optimal substructure, overlapping subproblems, memo & tab',
    roadmapNodeId: 'dynamic-programming',
  },
];

export const LEARN_VIDEOS = [
  // ─── ARRAYS ─────────────────────────────────────────────────────────────
  {
    id: 'arr-vid-1',
    topicId: 'arrays',
    type: 'video',
    youtubeId: 'n60Dn0UsbEk',
    title: 'Introduction to Arrays and ArrayList in Java',
    channel: 'Kunal Kushwaha',
    duration: '10:14',
    difficulty: 'Beginner',
    summary: 'Memory management, indexing, primitives vs object arrays, and dynamic resizing in Java ArrayList.',
  },
  {
    id: 'arr-vid-2',
    topicId: 'arrays',
    type: 'video',
    youtubeId: 'AT14lCXuMKI',
    title: 'Arrays in Data Structure | Memory Representation & Traversal',
    channel: "Jenny's Lectures CS IT",
    duration: '13:45',
    difficulty: 'Beginner',
    summary: 'Declaration, contiguous memory allocation, address calculation formula base + i * size, and linear operations.',
  },
  {
    id: 'arr-short-1',
    topicId: 'arrays',
    type: 'short',
    youtubeId: 'KQGn4ZXqjbo',
    title: 'What is an Array? Types & Memory Layout',
    channel: 'Creative Notes',
    duration: '0:50',
    difficulty: 'Concept',
    summary: 'Contiguous memory allocation, 0-based indexing logic, and advantages and limitations of fixed-size arrays.',
  },
  {
    id: 'arr-short-2',
    topicId: 'arrays',
    type: 'short',
    youtubeId: 'sxKjltt02_A',
    title: 'Array Data Structure Explained in 1 Minute',
    channel: 'GeeksforGeeks',
    duration: '0:58',
    difficulty: 'Concept',
    summary: 'Quick overview of array elements, indexing, instant O(1) random access, and memory layout.',
  },

  // ─── LINKED LISTS ────────────────────────────────────────────────────────
  {
    id: 'll-vid-1',
    topicId: 'linked',
    type: 'video',
    youtubeId: 'WwfhLC16bis',
    title: 'Introduction to Linked Lists (Data Structures & Algorithms #5)',
    channel: 'CS Dojo',
    duration: '10:30',
    difficulty: 'Beginner',
    summary: 'Pointers chaining heap nodes together, singly vs doubly linked lists, and comparison with dynamic arrays.',
  },
  {
    id: 'll-vid-2',
    topicId: 'linked',
    type: 'video',
    youtubeId: 'N6dOwBde7-M',
    title: 'Learn Linked Lists in 13 Minutes 🔗',
    channel: 'Bro Code',
    duration: '13:12',
    difficulty: 'Intermediate',
    summary: 'Node anatomy, head pointers, insertions, deletions, and why pointer rewiring avoids bulk element shifting.',
  },
  {
    id: 'll-short-1',
    topicId: 'linked',
    type: 'short',
    youtubeId: 'kiwPOvCj9Go',
    title: 'Fast & Slow Pointers for Linked Lists',
    channel: 'Greg Hogg',
    duration: '0:55',
    difficulty: 'Pattern',
    summary: 'How the Floyd cycle detection algorithm uses two runners (1x and 2x speed) to detect loops in O(n) time and O(1) space.',
  },
  {
    id: 'll-short-2',
    topicId: 'linked',
    type: 'short',
    youtubeId: '46-760SslGo',
    title: 'Why Did Linked Lists Even Exist? 🤯',
    channel: "Jenny's Lectures CS IT",
    duration: '0:59',
    difficulty: 'Concept',
    summary: 'Why dynamic node chaining was invented to solve fixed array memory allocation limitations.',
  },

  // ─── STACKS ──────────────────────────────────────────────────────────────
  {
    id: 'stk-vid-1',
    topicId: 'stacks',
    type: 'video',
    youtubeId: 'I5lq6sCuABE',
    title: 'Stack Data Structure | Illustrated Data Structures',
    channel: 'the roadmap',
    duration: '5:24',
    difficulty: 'Beginner',
    summary: 'Last-In First-Out operations: push, pop, and peek in O(1) time using underlying array or list storage.',
  },
  {
    id: 'stk-vid-2',
    topicId: 'stacks',
    type: 'video',
    youtubeId: 'wjI1WNcIntg',
    title: 'Data Structures: Stacks and Queues',
    channel: 'HackerRank',
    duration: '8:45',
    difficulty: 'Intermediate',
    summary: 'Gayle Laakmann McDowell explains stack operations, recursion call frames, and queue comparisons.',
  },
  {
    id: 'stk-short-1',
    topicId: 'stacks',
    type: 'short',
    youtubeId: 'hAhlAcxN0GA',
    title: 'Stack Operations Explained: Push, Pop & Peek',
    channel: 'Qntern AI',
    duration: '0:45',
    difficulty: 'Concept',
    summary: 'Visual breakdown of the LIFO principle with stack pointers, top-element access, and overflow conditions.',
  },
  {
    id: 'stk-short-2',
    topicId: 'stacks',
    type: 'short',
    youtubeId: 'UVdvEdW6wPQ',
    title: 'Stack vs Queue Explained Visually (LIFO vs FIFO)',
    channel: 'AlgoZen',
    duration: '0:52',
    difficulty: 'Concept',
    summary: 'Direct comparison between stack top-only operations and queue two-ended enqueue/dequeue mechanics.',
  },

  // ─── QUEUES ──────────────────────────────────────────────────────────────
  {
    id: 'q-vid-1',
    topicId: 'queues',
    type: 'video',
    youtubeId: 'va_6RmSrKCg',
    title: 'Queue Data Structure | Array and Linked List Implementation',
    channel: 'Apna College',
    duration: '14:20',
    difficulty: 'Beginner',
    summary: 'First-In First-Out mechanics, circular queue implementation, and queue operations using arrays and linked lists.',
  },
  {
    id: 'q-vid-2',
    topicId: 'queues',
    type: 'video',
    youtubeId: 'zp6pBNbUB2U',
    title: 'Queue in Data Structure | Introduction & Operations',
    channel: "Jenny's Lectures CS IT",
    duration: '11:15',
    difficulty: 'Intermediate',
    summary: 'FIFO queues, front and rear pointer manipulation, enqueue, dequeue, and overflow/underflow boundary checks.',
  },
  {
    id: 'q-short-1',
    topicId: 'queues',
    type: 'short',
    youtubeId: 'Ji0kZoy9hgo',
    title: 'Queue in DSA Made EASY! FIFO Explained',
    channel: 'SF Learning Skills',
    duration: '0:48',
    difficulty: 'Concept',
    summary: 'Real-world ticketing analogy demonstrating why queue elements enter from the rear and leave from the front.',
  },
  {
    id: 'q-short-2',
    topicId: 'queues',
    type: 'short',
    youtubeId: 'xTXgpKEmCR4',
    title: 'Queue Data Structure in 60 Seconds',
    channel: 'Harsivo CareerStack',
    duration: '0:44',
    difficulty: 'Concept',
    summary: 'Linear data structures: enqueue O(1), dequeue O(1), and practical applications in CPU scheduling and buffers.',
  },

  // ─── SEARCHING ───────────────────────────────────────────────────────────
  {
    id: 'srch-vid-1',
    topicId: 'searching',
    type: 'video',
    youtubeId: 'MFhxShGxHWc',
    title: 'Binary Search Algorithm in 100 Seconds',
    channel: 'Fireship',
    duration: '2:31',
    difficulty: 'Beginner',
    summary: 'Logarithmic division: cutting the sorted search space in half with mid-pointer checks.',
  },
  {
    id: 'srch-vid-2',
    topicId: 'searching',
    type: 'video',
    youtubeId: 'V_T5NuccwRA',
    title: 'What is Binary Search | Algorithm with Example',
    channel: "Jenny's Lectures CS IT",
    duration: '12:55',
    difficulty: 'Intermediate',
    summary: 'Divide-and-conquer searching: calculating mid, adjusting left and right bounds, and edge condition handling.',
  },
  {
    id: 'srch-short-1',
    topicId: 'searching',
    type: 'short',
    youtubeId: 'TKsV628GZOI',
    title: 'Why Binary Search is O(log n)',
    channel: 'Greg Hogg',
    duration: '0:50',
    difficulty: 'Concept',
    summary: 'Intuitive proof of logarithmic growth: how repeatedly halving enables searching millions of items in ~20 steps.',
  },
  {
    id: 'srch-short-2',
    topicId: 'searching',
    type: 'short',
    youtubeId: 'uTyxscVC_-U',
    title: 'Binary Search Algorithm - Simply Explained',
    channel: 'Apna College',
    duration: '0:54',
    difficulty: 'Pattern',
    summary: 'Visual pointers (low, mid, high) navigating a sorted list to locate a target in logarithmic time.',
  },

  // ─── SORTING ─────────────────────────────────────────────────────────────
  {
    id: 'sort-vid-1',
    topicId: 'sorting',
    type: 'video',
    youtubeId: 'kPRA0W1kECg',
    title: '15 Sorting Algorithms in 6 Minutes',
    channel: 'Timo Bingmann',
    duration: '6:04',
    difficulty: 'Visual',
    summary: 'Side-by-side comparison of Bubble, Insertion, Quick, Merge, and Heap sorts in action.',
  },
  {
    id: 'sort-vid-2',
    topicId: 'sorting',
    type: 'video',
    youtubeId: 'HGk_ypEuS24',
    title: 'Sorting Algorithms | Selection, Bubble & Insertion Sort',
    channel: 'take U forward',
    duration: '14:40',
    difficulty: 'Intermediate',
    summary: 'Striver breaks down quadratic comparison sorts, loop invariants, and element swapping mechanics.',
  },
  {
    id: 'sort-short-1',
    topicId: 'sorting',
    type: 'short',
    youtubeId: 'ArmqBSGeTY0',
    title: 'Quick Sort Visualized in 30 Seconds',
    channel: 'LearnWithUK',
    duration: '0:35',
    difficulty: 'Visual',
    summary: 'Watch the pivot partitioning step partition elements smaller to the left and larger to the right.',
  },
  {
    id: 'sort-short-2',
    topicId: 'sorting',
    type: 'short',
    youtubeId: 'HBDnJJ0NBeE',
    title: 'Quick Sort in 60 Seconds',
    channel: 'OpenAMind',
    duration: '0:56',
    difficulty: 'Concept',
    summary: 'Divide-and-conquer sorting mechanics: pivot selection, partitioning, and recursive subarrays.',
  },

  // ─── RECURSION ───────────────────────────────────────────────────────────
  {
    id: 'rec-vid-1',
    topicId: 'recursion',
    type: 'video',
    youtubeId: 'ngCos392W4w',
    title: '5 Simple Steps for Solving Any Recursive Problem',
    channel: 'Reducible',
    duration: '15:20',
    difficulty: 'Beginner',
    summary: 'Systematic approach to recursion: finding base cases, identifying subproblems, and verifying recurrence relations.',
  },
  {
    id: 'rec-vid-2',
    topicId: 'recursion',
    type: 'video',
    youtubeId: 'ivl5-snqul8',
    title: 'Learn RECURSION in 5 Minutes! 😵',
    channel: 'Bro Code',
    duration: '5:32',
    difficulty: 'Beginner',
    summary: 'Self-calling functions, call stack frames, stack overflow dangers, and iterative vs recursive tradeoffs.',
  },
  {
    id: 'rec-short-1',
    topicId: 'recursion',
    type: 'short',
    youtubeId: 'ce4OP2kUr2E',
    title: 'Recursion Explained in 60 Seconds',
    channel: 'Conner Ardman',
    duration: '0:59',
    difficulty: 'Concept',
    summary: 'Breaking big problems into identical smaller chunks, base condition triggers, and stack unwinding.',
  },
  {
    id: 'rec-short-2',
    topicId: 'recursion',
    type: 'short',
    youtubeId: 'k7ATqT1BK1g',
    title: 'What is RECURSION??',
    channel: 'b001',
    duration: '0:48',
    difficulty: 'Concept',
    summary: 'Visual analogy of nesting Russian dolls illustrating recursive depth and returning values.',
  },

  // ─── TREES ───────────────────────────────────────────────────────────────
  {
    id: 'tree-vid-1',
    topicId: 'trees',
    type: 'video',
    youtubeId: 'oSWTXtMglKE',
    title: 'Data Structures: Trees',
    channel: 'HackerRank',
    duration: '10:05',
    difficulty: 'Beginner',
    summary: 'Tree terminology: root, leaf nodes, parent/child pointers, and binary search tree properties.',
  },
  {
    id: 'tree-vid-2',
    topicId: 'trees',
    type: 'video',
    youtubeId: '7vw2iIdqHlM',
    title: 'Binary Tree and Binary Search Tree in Data Structure',
    channel: 'Codearchery',
    duration: '12:15',
    difficulty: 'Intermediate',
    summary: 'Left < Root < Right ordering invariant, searching in O(h) time, insertion, and subtree structures.',
  },
  {
    id: 'tree-short-1',
    topicId: 'trees',
    type: 'short',
    youtubeId: '8ZG07luIo00',
    title: 'Tree Traversal Explained: Preorder, Inorder & Postorder',
    channel: 'code_craft',
    duration: '0:55',
    difficulty: 'Pattern',
    summary: 'Visual guide to Depth-First Search traversal orders across binary tree nodes.',
  },
  {
    id: 'tree-short-2',
    topicId: 'trees',
    type: 'short',
    youtubeId: 'fbwYNxAbnr4',
    title: 'Binary Tree Traversal: Inorder',
    channel: 'The Tech Eye',
    duration: '0:42',
    difficulty: 'Pattern',
    summary: 'Left-Root-Right traversal mechanics and why Inorder produces sorted output on a BST.',
  },

  // ─── GRAPHS ──────────────────────────────────────────────────────────────
  {
    id: 'graph-vid-1',
    topicId: 'graphs',
    type: 'video',
    youtubeId: 'pcKY4hjDrxk',
    title: '5.1 Graph Traversals - BFS & DFS (Breadth & Depth First)',
    channel: 'Abdul Bari',
    duration: '13:50',
    difficulty: 'Intermediate',
    summary: 'Abdul Bari explains BFS using queues and DFS using recursion/stacks with step-by-step state tracing.',
  },
  {
    id: 'graph-vid-2',
    topicId: 'graphs',
    type: 'video',
    youtubeId: 'tWVWeAqZ0WU',
    title: 'Graph Algorithms for Technical Interviews - Full Course',
    channel: 'freeCodeCamp.org',
    duration: '18:30',
    difficulty: 'Intermediate',
    summary: 'Adjacency list representations, node traversal order, visited sets, and shortest path fundamentals.',
  },
  {
    id: 'graph-short-1',
    topicId: 'graphs',
    type: 'short',
    youtubeId: 'n6U5kbez_WM',
    title: 'BFS vs DFS in Graph Traversal',
    channel: 'Visualcoders',
    duration: '0:45',
    difficulty: 'Pattern',
    summary: 'Side-by-side animation: level-by-level breadth exploration vs branch-deep exploration.',
  },
  {
    id: 'graph-short-2',
    topicId: 'graphs',
    type: 'short',
    youtubeId: '8kucL88Ci8E',
    title: 'Difference Between DFS and BFS',
    channel: 'MS ScholarVerse',
    duration: '0:50',
    difficulty: 'Pattern',
    summary: 'Queue-based BFS for unweighted shortest paths vs recursion-based DFS for exhaustive path search.',
  },

  // ─── DYNAMIC PROGRAMMING ─────────────────────────────────────────────────
  {
    id: 'dp-vid-1',
    topicId: 'dp',
    type: 'video',
    youtubeId: 'oBt53YbR9Kk',
    title: 'Dynamic Programming - Learn to Solve Algorithmic Problems',
    channel: 'freeCodeCamp.org',
    duration: '16:40',
    difficulty: 'Advanced',
    summary: 'Core DP framework: identifying subproblems, memoization caches, and bottom-up tabulation tables.',
  },
  {
    id: 'dp-vid-2',
    topicId: 'dp',
    type: 'video',
    youtubeId: 'Hdr64lKQ3e4',
    title: 'Mastering Dynamic Programming - Interview Strategies',
    channel: 'Tech With Nikola',
    duration: '15:10',
    difficulty: 'Advanced',
    summary: 'How to recognize overlapping subproblems and optimal substructure across classic coding challenges.',
  },
  {
    id: 'dp-short-1',
    topicId: 'dp',
    type: 'short',
    youtubeId: 'v4WjDMI11ms',
    title: 'Fibonacci Explained: Memoization vs Tabulation',
    channel: 'AlgoJS',
    duration: '0:55',
    difficulty: 'Concept',
    summary: 'Comparing top-down recursive caching vs bottom-up iterative table construction for O(n) Fibonacci.',
  },
  {
    id: 'dp-short-2',
    topicId: 'dp',
    type: 'short',
    youtubeId: 'Tx1VhORhZJ0',
    title: 'Memoization vs Tabulation in Dynamic Programming',
    channel: 'Alvin The Programmer',
    duration: '0:52',
    difficulty: 'Concept',
    summary: 'Visual explanation of cache memory trades that turn exponential O(2^n) algorithms into linear O(n) solutions.',
  },
];

/**
 * Filter videos by topic and content type.
 * @param {string} topicId
 * @param {'all' | 'video' | 'short'} [typeFilter='all']
 */
export function getLearnVideos(topicId, typeFilter = 'all') {
  return LEARN_VIDEOS.filter((item) => {
    const topicMatch = !topicId || item.topicId === topicId;
    const typeMatch = typeFilter === 'all' || item.type === typeFilter;
    return topicMatch && typeMatch;
  });
}

/**
 * Get count of videos & shorts for a specific topic.
 * @param {string} topicId
 */
export function getTopicStats(topicId) {
  const all = LEARN_VIDEOS.filter((v) => v.topicId === topicId);
  const videos = all.filter((v) => v.type === 'video').length;
  const shorts = all.filter((v) => v.type === 'short').length;
  return { total: all.length, videos, shorts };
}

/**
 * Build standard YouTube high-res thumbnail URL.
 * Falls back cleanly via browser caching.
 * @param {string} youtubeId
 */
export function getYouTubeThumbnailUrl(youtubeId) {
  return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
}

/**
 * Build secondary medium-res thumbnail URL for progressive fallback.
 * @param {string} youtubeId
 */
export function getYouTubeThumbnailFallbackUrl(youtubeId) {
  return `https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`;
}

/**
 * Build privacy-preserving YouTube embed URL.
 * @param {string} youtubeId
 * @param {boolean} [isShort=false]
 */
export function getYouTubeEmbedUrl(youtubeId, isShort = false) {
  // playsinline ensures inline playback on iOS mobile; rel=0 prevents random recommendations
  return `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1&playsinline=1${isShort ? '&loop=1' : ''}`;
}

/**
 * Direct external link to YouTube for emergency fallback.
 * @param {string} youtubeId
 * @param {'video' | 'short'} [type='video']
 */
export function getDirectYouTubeUrl(youtubeId, type = 'video') {
  return type === 'short'
    ? `https://www.youtube.com/shorts/${youtubeId}`
    : `https://www.youtube.com/watch?v=${youtubeId}`;
}

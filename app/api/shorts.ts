// AlgoNook — Server-side Shorts API
// Live DSA-only discovery endpoint with controlled topic queries, strict educational filtering,
// in-memory caching, quota protection, and resilient fallback pool.

declare const process: any;

export interface ShortItem {
  id: string;
  youtubeId: string;
  title: string;
  channel: string;
  duration?: string;
  topic: string;
  summary?: string;
  thumbnailUrl?: string;
}

export interface ShortsApiResponse {
  ok: boolean;
  topic: string;
  topicLabel: string;
  shorts: ShortItem[];
  nextPageToken?: string | null;
  source: 'live' | 'curated' | 'cache';
  error?: string;
}

export const ALLOWED_TOPICS = [
  'all',
  'arrays',
  'linked',
  'stacks',
  'queues',
  'searching',
  'sorting',
  'recursion',
  'trees',
  'graphs',
  'dp',
] as const;

export type AllowedTopic = (typeof ALLOWED_TOPICS)[number];

export const TOPIC_META: Record<AllowedTopic, { label: string; glyph: string; roadmapNodeId: string }> = {
  all: { label: 'All DSA', glyph: '⚡', roadmapNodeId: 'arrays' },
  arrays: { label: 'Arrays', glyph: '[ ]', roadmapNodeId: 'arrays' },
  linked: { label: 'Linked Lists', glyph: '->*', roadmapNodeId: 'linked-lists' },
  stacks: { label: 'Stacks', glyph: '[=]', roadmapNodeId: 'stacks-queues' },
  queues: { label: 'Queues', glyph: '>>>', roadmapNodeId: 'stacks-queues' },
  searching: { label: 'Searching', glyph: '[?]', roadmapNodeId: 'binary-search' },
  sorting: { label: 'Sorting', glyph: '321', roadmapNodeId: 'arrays' },
  recursion: { label: 'Recursion', glyph: '(())', roadmapNodeId: 'backtracking' },
  trees: { label: 'Trees', glyph: '/\\', roadmapNodeId: 'trees' },
  graphs: { label: 'Graphs', glyph: 'o-o', roadmapNodeId: 'graphs' },
  dp: { label: 'Dynamic Programming', glyph: ':::', roadmapNodeId: 'dynamic-programming' },
};

// Strict, controlled query definitions — users CANNOT supply arbitrary query strings
export const CONTROLLED_DSA_QUERIES: Record<AllowedTopic, string[]> = {
  all: [
    'dsa data structures algorithms shorts',
    'data structures in 60 seconds shorts',
    'neetcode dsa shorts',
    'coding interview algorithms shorts',
  ],
  arrays: [
    'arrays data structures shorts',
    'array interview dsa shorts',
    'static dynamic arrays dsa leetcode shorts',
    'two pointer array algorithm shorts',
  ],
  linked: [
    'linked list data structures shorts',
    'singly doubly linked list dsa shorts',
    'fast slow pointers linked list dsa shorts',
    'reverse linked list dsa shorts',
  ],
  stacks: [
    'stack data structure shorts',
    'stack lifo algorithm shorts',
    'monotonic stack dsa shorts',
    'valid parentheses stack dsa shorts',
  ],
  queues: [
    'queue data structure shorts',
    'queue fifo algorithm shorts',
    'circular queue dsa shorts',
    'priority queue binary heap dsa shorts',
  ],
  searching: [
    'binary search algorithm shorts',
    'binary search dsa shorts',
    'binary search on answers shorts',
    'two crystal balls binary search algorithm shorts',
  ],
  sorting: [
    'sorting algorithms dsa shorts',
    'quicksort mergesort algorithm shorts',
    'bubble sort vs quicksort algorithm shorts',
    'sorting algorithms visualized shorts',
  ],
  recursion: [
    'recursion data structures shorts',
    'recursion call stack dsa shorts',
    'recursion base case algorithm shorts',
    'backtracking recursion dsa shorts',
  ],
  trees: [
    'binary tree data structures shorts',
    'binary search tree bst algorithm shorts',
    'tree traversal bfs dfs algorithm shorts',
    'invert binary tree dsa algorithm shorts',
  ],
  graphs: [
    'graph algorithms dsa shorts',
    'breadth first search depth first search graph algorithm shorts',
    'graph traversal bfs dfs algorithm shorts',
    'dijkstra shortest path algorithm shorts',
  ],
  dp: [
    'dynamic programming memoization tabulation shorts',
    'dynamic programming dsa shorts',
    'dynamic programming patterns dsa interview shorts',
    'fibonacci memoization dynamic programming algorithm shorts',
  ],
};

// Educational DSA Terminology Allowlist
const DSA_MUST_MATCH_KEYWORDS = [
  'dsa', 'data structure', 'algorithm', 'array', 'arrays', 'linked list',
  'stack', 'stacks', 'queue', 'queues', 'binary search', 'search', 'sort', 'sorting',
  'quicksort', 'mergesort', 'recursion', 'recursive', 'tree', 'trees', 'bst',
  'graph', 'graphs', 'dynamic programming', 'memoization', 'tabulation',
  'leetcode', 'neetcode', 'big o', 'complexity', 'pointer', 'traversal',
  'bfs', 'dfs', 'heap', 'hash', 'coding interview'
];

// Entertainment / Non-educational Exclusion Blacklist
const DISALLOWED_KEYWORDS = [
  'vlog', 'prank', 'minecraft', 'roblox', 'fortnite', 'gameplay', 'music video',
  'trailer', 'movie', 'reaction', 'celebrity', 'cricket', 'football', 'fashion',
  'makeup', 'comedy', 'dance', 'tiktok dance', 'challenge 24 hours', 'unboxing', 'crypto',
  'gaming', 'meme', 'sports', 'politics', 'news', 'lifestyle', 'entertainment', 'song'
];

// Verified Fallback Seed Pool (Used when API key is missing or quota is exhausted)
export const VERIFIED_DSA_SHORTS_POOL: Record<AllowedTopic, ShortItem[]> = {
  all: [
    { id: 'all-1', youtubeId: 'KQGn4ZXqjbo', title: 'What is an Array? Types & Memory Layout', channel: 'Creative Notes', duration: '0:50', topic: 'arrays', summary: 'Contiguous memory layout and 0-indexing fundamentals.' },
    { id: 'all-2', youtubeId: 'kiwPOvCj9Go', title: 'Fast & Slow Pointers for Linked Lists', channel: 'Greg Hogg', duration: '0:55', topic: 'linked', summary: 'Floyd cycle detection algorithm with two pointers.' },
    { id: 'all-3', youtubeId: 'hAhlAcxN0GA', title: 'Stack Operations Explained: Push, Pop & Peek', channel: 'Qntern AI', duration: '0:45', topic: 'stacks', summary: 'LIFO discipline and top-element access.' },
    { id: 'all-4', youtubeId: 'Ji0kZoy9hgo', title: 'Queue in DSA Made EASY! FIFO Explained', channel: 'SF Learning Skills', duration: '0:48', topic: 'queues', summary: 'First-In First-Out operations and practical buffers.' },
    { id: 'all-5', youtubeId: 'TKsV628GZOI', title: 'Why Binary Search is O(log n)', channel: 'Greg Hogg', duration: '0:50', topic: 'searching', summary: 'Logarithmic search space halving intuition.' },
    { id: 'all-6', youtubeId: 'ArmqBSGeTY0', title: 'Quick Sort Visualized in 30 Seconds', channel: 'LearnWithUK', duration: '0:35', topic: 'sorting', summary: 'Partitioning step dividing elements around a pivot.' },
    { id: 'all-7', youtubeId: 'ce4OP2kUr2E', title: 'Recursion Explained in 60 Seconds', channel: 'Conner Ardman', duration: '0:59', topic: 'recursion', summary: 'Subproblems, base conditions, and stack frames.' },
    { id: 'all-8', youtubeId: '8ZG07luIo00', title: 'Tree Traversal: Preorder, Inorder & Postorder', channel: 'code_craft', duration: '0:55', topic: 'trees', summary: 'Depth-first search traversal orders on binary trees.' },
    { id: 'all-9', youtubeId: 'n6U5kbez_WM', title: 'BFS vs DFS in Graph Traversal', channel: 'Visualcoders', duration: '0:45', topic: 'graphs', summary: 'Level-by-level exploration vs depth-first path exploration.' },
    { id: 'all-10', youtubeId: 'v4WjDMI11ms', title: 'Fibonacci: Memoization vs Tabulation', channel: 'AlgoJS', duration: '0:55', topic: 'dp', summary: 'Top-down caching vs bottom-up table building in DP.' },
    { id: 'all-11', youtubeId: 'sxKjltt02_A', title: 'Array Data Structure Explained in 1 Minute', channel: 'GeeksforGeeks', duration: '0:58', topic: 'arrays', summary: 'Constant time O(1) random access by index.' },
    { id: 'all-12', youtubeId: 'UVdvEdW6wPQ', title: 'Stack vs Queue Explained Visually (LIFO vs FIFO)', channel: 'AlgoZen', duration: '0:52', topic: 'stacks', summary: 'Direct visual comparison of stack vs queue semantics.' },
    { id: 'all-13', youtubeId: 'uTyxscVC_-U', title: 'Binary Search Algorithm - Simply Explained', channel: 'Apna College', duration: '0:54', topic: 'searching', summary: 'Low, mid, high pointers navigating sorted ranges.' },
    { id: 'all-14', youtubeId: 'HBDnJJ0NBeE', title: 'Quick Sort in 60 Seconds', channel: 'OpenAMind', duration: '0:56', topic: 'sorting', summary: 'Divide-and-conquer partitioning mechanics.' },
    { id: 'all-15', youtubeId: 'k7ATqT1BK1g', title: 'What is RECURSION?? Visualized', channel: 'b001', duration: '0:48', topic: 'recursion', summary: 'Russian dolls analogy for recursive call stacks.' },
  ],
  arrays: [
    { id: 'arr-s-1', youtubeId: 'KQGn4ZXqjbo', title: 'What is an Array? Types & Memory Layout', channel: 'Creative Notes', duration: '0:50', topic: 'arrays', summary: 'Contiguous memory layout, address arithmetic, and 0-indexing.' },
    { id: 'arr-s-2', youtubeId: 'sxKjltt02_A', title: 'Array Data Structure Explained in 1 Minute', channel: 'GeeksforGeeks', duration: '0:58', topic: 'arrays', summary: 'Overview of array elements, indexing, and instant O(1) random access.' },
    { id: 'arr-s-3', youtubeId: 'M0LFxguOVVQ', title: 'Data Structures vs Algorithms Explained in 30s', channel: 'Error Makes Clever', duration: '0:35', topic: 'arrays', summary: 'Memory organization and algorithm efficiency basics.' },
    { id: 'arr-s-4', youtubeId: '0pqPalQbPdc', title: 'Dynamic Array Resizing Amortized Complexity', channel: 'NeetCodeIO', duration: '0:52', topic: 'arrays', summary: 'Why doubling capacity yields O(1) amortized insertion.' },
  ],
  linked: [
    { id: 'll-s-1', youtubeId: 'kiwPOvCj9Go', title: 'Fast & Slow Pointers for Linked Lists', channel: 'Greg Hogg', duration: '0:55', topic: 'linked', summary: 'Floyd cycle detection algorithm using two runners.' },
    { id: 'll-s-2', youtubeId: '46-760SslGo', title: 'Why Did Linked Lists Even Exist? 🤯', channel: "Jenny's Lectures CS IT", duration: '0:59', topic: 'linked', summary: 'How dynamic node pointers bypass fixed array memory allocations.' },
    { id: 'll-s-3', youtubeId: 'tieJj7mbs9w', title: 'Circular Linked Lists Explained', channel: 'PrepBytes', duration: '0:48', topic: 'linked', summary: 'Tail pointer linking directly back to the head node.' },
    { id: 'll-s-4', youtubeId: 'xO-AlVQPgm8', title: 'Singly Linked List in 30 Seconds', channel: 'DataFlair', duration: '0:30', topic: 'linked', summary: 'Node structure with value payload and next address pointer.' },
  ],
  stacks: [
    { id: 'stk-s-1', youtubeId: 'hAhlAcxN0GA', title: 'Stack Operations Explained: Push, Pop & Peek', channel: 'Qntern AI', duration: '0:45', topic: 'stacks', summary: 'LIFO principle with stack pointers and boundary checks.' },
    { id: 'stk-s-2', youtubeId: 'UVdvEdW6wPQ', title: 'Stack vs Queue Explained Visually (LIFO vs FIFO)', channel: 'AlgoZen', duration: '0:52', topic: 'stacks', summary: 'Direct comparison between stack and queue access mechanics.' },
    { id: 'stk-s-3', youtubeId: 'BARiAkDE5zk', title: 'LIFO vs FIFO in 60 Seconds', channel: 'The Knowledge Wings', duration: '0:58', topic: 'stacks', summary: 'Why call stacks and undo buffers naturally use stacks.' },
    { id: 'stk-s-4', youtubeId: 'ggogs3P73Ok', title: 'Stack Push Operation Illustrated', channel: 'Pritesh Taral', duration: '0:40', topic: 'stacks', summary: 'Pointer increment and element insertion in constant time.' },
  ],
  queues: [
    { id: 'q-s-1', youtubeId: 'Ji0kZoy9hgo', title: 'Queue in DSA Made EASY! FIFO Explained', channel: 'SF Learning Skills', duration: '0:48', topic: 'queues', summary: 'Ticketing analogy demonstrating front and rear pointer queueing.' },
    { id: 'q-s-2', youtubeId: 'xTXgpKEmCR4', title: 'Queue Data Structure in 60 Seconds', channel: 'Harsivo CareerStack', duration: '0:44', topic: 'queues', summary: 'FIFO queue operations: enqueue, dequeue, and buffer usage.' },
    { id: 'q-s-3', youtubeId: 'UVdvEdW6wPQ', title: 'Queue Mechanics vs Stacks', channel: 'AlgoZen', duration: '0:52', topic: 'queues', summary: 'Queue insertion at rear and deletion from front in O(1).' },
    { id: 'q-s-4', youtubeId: 'BARiAkDE5zk', title: 'FIFO Buffers in Data Structures', channel: 'The Knowledge Wings', duration: '0:58', topic: 'queues', summary: 'Real-world queuing disciplines in OS task scheduling.' },
  ],
  searching: [
    { id: 'srch-s-1', youtubeId: 'TKsV628GZOI', title: 'Why Binary Search is O(log n)', channel: 'Greg Hogg', duration: '0:50', topic: 'searching', summary: 'Logarithmic growth: finding targets among millions in 20 checks.' },
    { id: 'srch-s-2', youtubeId: 'uTyxscVC_-U', title: 'Binary Search Algorithm - Simply Explained', channel: 'Apna College', duration: '0:54', topic: 'searching', summary: 'Low, mid, high pointers dividing the search space.' },
    { id: 'srch-s-3', youtubeId: 'ndmhR1MLdJ8', title: 'Binary Search Algorithm Iteration', channel: "Developer's Circuit", duration: '0:48', topic: 'searching', summary: 'Step-by-step invariant checks on sorted array segments.' },
    { id: 'srch-s-4', youtubeId: 'eSbE-KAFoDE', title: 'Binary Search Explained Visually', channel: 'Qntern AI', duration: '0:56', topic: 'searching', summary: 'Why sorted data enables divide-and-conquer lookup.' },
  ],
  sorting: [
    { id: 'sort-s-1', youtubeId: 'ArmqBSGeTY0', title: 'Quick Sort Visualized in 30 Seconds', channel: 'LearnWithUK', duration: '0:35', topic: 'sorting', summary: 'Pivot partitioning step dividing smaller and larger elements.' },
    { id: 'sort-s-2', youtubeId: 'HBDnJJ0NBeE', title: 'Quick Sort in 60 Seconds', channel: 'OpenAMind', duration: '0:56', topic: 'sorting', summary: 'Divide-and-conquer sorting mechanics and recursion.' },
    { id: 'sort-s-3', youtubeId: 'MeBYqiehwyQ', title: 'Quicksort Concept Breakdown', channel: 'Hello Byte', duration: '0:58', topic: 'sorting', summary: 'In-place partitioning and recursive subproblem sorting.' },
    { id: 'sort-s-4', youtubeId: 'Iwsb1VNkKO4', title: 'Quick Sort Invariants', channel: '21st Century Pirate', duration: '0:42', topic: 'sorting', summary: 'Sorting stability, in-place swaps, and worst-case considerations.' },
  ],
  recursion: [
    { id: 'rec-s-1', youtubeId: 'ce4OP2kUr2E', title: 'Recursion Explained in 60 Seconds', channel: 'Conner Ardman', duration: '0:59', topic: 'recursion', summary: 'Subproblems, base condition triggers, and stack unwinding.' },
    { id: 'rec-s-2', youtubeId: 'k7ATqT1BK1g', title: 'What is RECURSION?? Visualized', channel: 'b001', duration: '0:48', topic: 'recursion', summary: 'Russian doll analogy demonstrating recursive depth.' },
    { id: 'rec-s-3', youtubeId: '5aJoO5rUyeQ', title: 'Recursion Explained in 1 Minute', channel: 'GeeksforGeeks', duration: '0:55', topic: 'recursion', summary: 'Function self-calls, activation frames, and base cases.' },
    { id: 'rec-s-4', youtubeId: 'UvQrt5qvcG0', title: 'What is Recursion? Interview Question', channel: 'Coding With Moji', duration: '0:30', topic: 'recursion', summary: 'Call stack frames and return value propagation.' },
  ],
  trees: [
    { id: 'tree-s-1', youtubeId: '8ZG07luIo00', title: 'Tree Traversal: Preorder, Inorder & Postorder', channel: 'code_craft', duration: '0:55', topic: 'trees', summary: 'Visual guide to Depth-First Search traversal orders.' },
    { id: 'tree-s-2', youtubeId: 'fbwYNxAbnr4', title: 'Binary Tree Traversal: Inorder', channel: 'The Tech Eye', duration: '0:42', topic: 'trees', summary: 'Left-Root-Right traversal mechanics on a BST.' },
    { id: 'tree-s-3', youtubeId: 'YsyMXZ_fjqY', title: 'Preorder Binary Tree Traversal', channel: 'BCA EXPERT', duration: '0:45', topic: 'trees', summary: 'Root-Left-Right sequence on hierarchical data.' },
    { id: 'tree-s-4', youtubeId: 'Cc5D20hCNyU', title: 'Tree Traversal Trick in 60 Seconds', channel: 'Aanchal Rawat CSIT', duration: '0:50', topic: 'trees', summary: 'Quick graphical tricks for tracing tree traversals.' },
  ],
  graphs: [
    { id: 'graph-s-1', youtubeId: 'n6U5kbez_WM', title: 'BFS vs DFS in Graph Traversal', channel: 'Visualcoders', duration: '0:45', topic: 'graphs', summary: 'Level-by-level breadth exploration vs branch-deep exploration.' },
    { id: 'graph-s-2', youtubeId: '8kucL88Ci8E', title: 'Difference Between DFS and BFS', channel: 'MS ScholarVerse', duration: '0:50', topic: 'graphs', summary: 'Queue-based BFS for shortest paths vs stack-based DFS.' },
    { id: 'graph-s-3', youtubeId: '0gdx_1NPCFA', title: 'DFS vs BFS in Data Structures', channel: 'Apni Pathashala', duration: '0:45', topic: 'graphs', summary: 'Connected components and cycle detection traversal.' },
    { id: 'graph-s-4', youtubeId: '01NdzXDPnig', title: 'DFS Graph Traversal in Detail', channel: 'Lastminute concept', duration: '0:55', topic: 'graphs', summary: 'Adjacency list traversal using visited sets.' },
  ],
  dp: [
    { id: 'dp-s-1', youtubeId: 'v4WjDMI11ms', title: 'Fibonacci: Memoization vs Tabulation', channel: 'AlgoJS', duration: '0:55', topic: 'dp', summary: 'Comparing top-down recursive caching vs bottom-up table building.' },
    { id: 'dp-s-2', youtubeId: 'Tx1VhORhZJ0', title: 'Memoization vs Tabulation in Dynamic Programming', channel: 'Alvin The Programmer', duration: '0:52', topic: 'dp', summary: 'Memory trade that converts exponential O(2^n) to linear O(n).' },
    { id: 'dp-s-3', youtubeId: 'NKSmV69wzZQ', title: 'Memoization vs Tabulation Explained Simply', channel: 'codeTips', duration: '0:48', topic: 'dp', summary: 'Overlapping subproblems and optimal substructure.' },
    { id: 'dp-s-4', youtubeId: 'zD1XVhKQs4g', title: 'Memoization vs Tabulation Visual Explanation', channel: 'Explainedbychhavi', duration: '0:50', topic: 'dp', summary: 'State transition diagrams and array table filling.' },
  ],
};

// In-memory cache for API responses (1-hour TTL per topic and pageToken)
interface CacheEntry {
  timestamp: number;
  data: ShortsApiResponse;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const searchCalls = [] as number[];
const SEARCH_CALL_WINDOW_MS = 24 * 60 * 60 * 1000;
const SEARCH_CALL_LIMIT_PER_PROCESS = 80; // leave headroom under YouTube's default 100 search.list calls/day

function reserveSearchCall(): boolean {
  const cutoff = Date.now() - SEARCH_CALL_WINDOW_MS;
  while (searchCalls.length && searchCalls[0] < cutoff) searchCalls.shift();
  if (searchCalls.length >= SEARCH_CALL_LIMIT_PER_PROCESS) return false;
  searchCalls.push(Date.now());
  return true;
}

/**
 * Parse ISO 8601 duration string (e.g. PT45S, PT1M2S) into total seconds.
 */
export function parseIsoDuration(duration: string): number {
  if (!duration) return 0;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Filter video for strict DSA relevance and educational safety.
 */
export function isEducationalDsaContent(title: string, description: string = ''): boolean {
  const combined = `${title} ${description}`.toLowerCase();

  // Must match at least one DSA educational keyword
  const hasDsaKeyword = DSA_MUST_MATCH_KEYWORDS.some((kw) => combined.includes(kw));
  if (!hasDsaKeyword) return false;

  // Must NOT match any blacklisted non-educational/entertainment keywords
  const hasDisallowed = DISALLOWED_KEYWORDS.some((kw) => combined.includes(kw));
  if (hasDisallowed) return false;

  return true;
}

const TOPIC_TERMS: Record<Exclude<AllowedTopic, 'all'>, string[]> = {
  arrays: ['array', 'arrays', 'two pointer', 'sliding window'],
  linked: ['linked list', 'linked-list', 'fast slow pointer', 'cycle detection'],
  stacks: ['stack', 'stacks', 'lifo', 'monotonic stack', 'parentheses'],
  queues: ['queue', 'queues', 'fifo', 'deque', 'breadth first'],
  searching: ['search', 'binary search', 'lower bound', 'upper bound'],
  sorting: ['sort', 'sorting', 'quicksort', 'quick sort', 'mergesort', 'merge sort'],
  recursion: ['recursion', 'recursive', 'backtracking', 'call stack'],
  trees: ['tree', 'trees', 'bst', 'binary tree', 'traversal'],
  graphs: ['graph', 'graphs', 'bfs', 'dfs', 'dijkstra', 'topological'],
  dp: ['dynamic programming', 'memoization', 'tabulation', 'dp', 'subproblem'],
};

export function isRelevantToTopic(topic: AllowedTopic, title: string, description = ''): boolean {
  if (topic === 'all') return true;
  const text = `${title} ${description}`.toLowerCase();
  return TOPIC_TERMS[topic].some((term) => text.includes(term));
}

export function isShortCandidate(topic: AllowedTopic, title: string, description: string, durationSeconds: number): boolean {
  const hasShortMarker = /#shorts?\b|\bshorts?\b/i.test(`${title} ${description}`);
  return durationSeconds > 0 && durationSeconds <= 180
    && hasShortMarker
    && isEducationalDsaContent(title, description)
    && isRelevantToTopic(topic, title, description);
}

/**
 * Handler for GET /api/shorts
 * Query parameters:
 *   - topic: AllowedTopic (defaults to 'all')
 *   - pageToken: string (optional)
 *   - limit: number (optional, default 8, max 15)
 */
export async function handleGetShorts(
  params: { topic?: string; pageToken?: string; limit?: number },
  _headers: Record<string, string | string[] | undefined> = {},
  env: Record<string, string | undefined> = (typeof process !== 'undefined' ? process.env : {})
): Promise<{ status: number; data: ShortsApiResponse }> {
  const rawTopic = (params.topic || 'all').toLowerCase();
  if (!ALLOWED_TOPICS.includes(rawTopic as AllowedTopic)) {
    return { status: 400, data: { ok: false, topic: rawTopic, topicLabel: '', shorts: [], source: 'curated', error: 'Unsupported DSA topic.' } };
  }
  const topic = rawTopic as AllowedTopic;

  const pageToken = (params.pageToken || '').trim();
  const limit = Math.min(Math.max(Number(params.limit) || 8, 4), 10);
  const topicMeta = TOPIC_META[topic];

  const cacheKey = `${topic}:${pageToken || 'first'}:${limit}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return {
      status: 200,
      data: { ...cached.data, source: 'cache' },
    };
  }

  const apiKey = env.YOUTUBE_API_KEY;

  // If YouTube API Key is available, attempt live search with strict DSA queries
  if (apiKey && reserveSearchCall()) {
    try {
      const queries = CONTROLLED_DSA_QUERIES[topic];
      // Keep each provider page token tied to the fixed topic query that created it.
      const cursor = parseSearchCursor(pageToken, queries.length);
      const controlledQuery = queries[cursor.queryIndex];

      // One search.list call per batch; YouTube currently allows 100 such calls/day by default.
      // videoDuration=short narrows candidates to videos under four minutes.
      const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
      searchUrl.searchParams.set('part', 'snippet');
      searchUrl.searchParams.set('type', 'video');
      searchUrl.searchParams.set('videoDuration', 'short');
      searchUrl.searchParams.set('maxResults', String(limit * 2)); // fetch extra to account for filtering
      searchUrl.searchParams.set('q', controlledQuery);
      searchUrl.searchParams.set('safeSearch', 'strict');
      searchUrl.searchParams.set('relevanceLanguage', 'en');
      searchUrl.searchParams.set('key', apiKey);
      if (cursor.providerToken) searchUrl.searchParams.set('pageToken', cursor.providerToken);

      const searchRes = await fetch(searchUrl.toString());
      if (searchRes.ok) {
        const searchData: any = await searchRes.json();
        const videoIds = (searchData.items || [])
          .map((item: any) => item.id?.videoId)
          .filter(Boolean);

        if (videoIds.length > 0) {
          // videos.list (1 unit) supplies duration and metadata. The Data API does not expose
          // vertical orientation, so short duration plus a Shorts marker is the best metadata proxy.
          const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
          detailsUrl.searchParams.set('part', 'contentDetails,snippet');
          detailsUrl.searchParams.set('id', videoIds.join(','));
          detailsUrl.searchParams.set('key', apiKey);

          const detailsRes = await fetch(detailsUrl.toString());
          if (detailsRes.ok) {
            const detailsData: any = await detailsRes.json();
            const filteredShorts: ShortItem[] = [];

            for (const item of detailsData.items || []) {
              const title = item.snippet?.title || '';
              const desc = item.snippet?.description || '';
              const durationSec = parseIsoDuration(item.contentDetails?.duration || '');

              if (isShortCandidate(topic, title, desc, durationSec)) {
                const mins = Math.floor(durationSec / 60);
                const secs = durationSec % 60;
                const formattedDuration = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

                filteredShorts.push({
                  id: `yt-${item.id}`,
                  youtubeId: item.id,
                  title: title.replace(/#shorts?/gi, '').trim(),
                  channel: item.snippet?.channelTitle || 'Educator',
                  duration: formattedDuration,
                  topic: topic === 'all' ? inferTopic(title, desc) : topic,
                  summary: desc ? desc.slice(0, 140) + '...' : undefined,
                  thumbnailUrl: item.snippet?.thumbnails?.high?.url,
                });
              }

              if (filteredShorts.length >= limit) break;
            }

            if (filteredShorts.length > 0) {
              const responseData: ShortsApiResponse = {
                ok: true,
                topic,
                topicLabel: topicMeta.label,
                shorts: filteredShorts,
                nextPageToken: createSearchCursor(
                  searchData.nextPageToken ? cursor.queryIndex : (cursor.queryIndex + 1) % queries.length,
                  searchData.nextPageToken || ''
                ),
                source: 'live',
              };

              cache.set(cacheKey, { timestamp: Date.now(), data: responseData });
              return { status: 200, data: responseData };
            }
          }
        }
      } else {
        const errorText = await searchRes.text();
        console.warn(`YouTube API returned status ${searchRes.status}: ${errorText.slice(0, 200)}. Falling back to curated pool.`);
      }
    } catch (err: any) {
      console.warn('YouTube live discovery error, using verified curated pool:', err?.message);
    }
  }

  // Resilient Curated Fallback Pool (Guarantees zero-failure infinite operation)
  const pool = VERIFIED_DSA_SHORTS_POOL[topic] || VERIFIED_DSA_SHORTS_POOL.all;
  const pageIndex = pageToken && pageToken.startsWith('curated-')
    ? parseInt(pageToken.replace('curated-', ''), 10) || 0
    : 0;

  const startIndex = (pageIndex * limit) % pool.length;
  const pagedShorts: ShortItem[] = [];

  for (let i = 0; i < limit; i++) {
    const item = pool[(startIndex + i) % pool.length];
    // Attach index to ID for unique react keys during infinite loop
    pagedShorts.push({
      ...item,
      id: `${item.id}-p${pageIndex}-${i}`,
    });
  }

  const nextPageToken = `curated-${pageIndex + 1}`;

  const responseData: ShortsApiResponse = {
    ok: true,
    topic,
    topicLabel: topicMeta.label,
    shorts: pagedShorts,
    nextPageToken,
    source: 'curated',
  };

  cache.set(cacheKey, { timestamp: Date.now(), data: responseData });
  return { status: 200, data: responseData };
}

function inferTopic(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();
  const topic = (Object.keys(TOPIC_TERMS) as Exclude<AllowedTopic, 'all'>[])
    .find((candidate) => TOPIC_TERMS[candidate].some((term) => text.includes(term)));
  return topic || 'arrays';
}

function parseSearchCursor(token: string, queryCount: number): { queryIndex: number; providerToken: string } {
  if (!token.startsWith('yt1:')) return { queryIndex: 0, providerToken: '' };
  const [, rawIndex, encodedToken = ''] = token.split(':', 3);
  const queryIndex = Number(rawIndex);
  if (!Number.isInteger(queryIndex) || queryIndex < 0 || queryIndex >= queryCount) return { queryIndex: 0, providerToken: '' };
  try { return { queryIndex, providerToken: decodeURIComponent(encodedToken) }; }
  catch { return { queryIndex: 0, providerToken: '' }; }
}

function createSearchCursor(queryIndex: number, providerToken: string): string {
  return `yt1:${queryIndex}:${encodeURIComponent(providerToken)}`;
}

const requestWindows = new Map<string, { startedAt: number; count: number }>();

/** Vercel serverless entry point. API key and YouTube requests stay server-side. */
export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ ok: false, error: 'Method Not Allowed.' });
    return;
  }

  const clientKey = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const window = requestWindows.get(clientKey);
  if (window && now - window.startedAt < 60_000 && window.count >= 12) {
    res.setHeader('Retry-After', '60');
    res.status(429).json({ ok: false, error: 'Shorts are loading too quickly. Try again in a minute.' });
    return;
  }
  if (!window || now - window.startedAt >= 60_000) requestWindows.set(clientKey, { startedAt: now, count: 1 });
  else window.count += 1;

  const result = await handleGetShorts({
    topic: typeof req.query?.topic === 'string' ? req.query.topic : 'all',
    pageToken: typeof req.query?.pageToken === 'string' ? req.query.pageToken : '',
    limit: Number(req.query?.limit) || 8,
  }, req.headers, process.env);
  res.status(result.status).json(result.data);
}

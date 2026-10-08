// AlgoNook — Learning Roadmap Data
// Each node defines a DSA topic with prerequisites, description, and learning stages.
// The UI reads this to render the connected roadmap path.
// To add a new topic: add a node here. No UI changes needed.

import { missionsOfTopic } from './missions/index.js';

/**
 * Node status values (computed at runtime from GameContext):
 *   LOCKED       – prerequisite chapter proofs are incomplete
 *   AVAILABLE    – prerequisites met, not started
 *   IN_PROGRESS  – at least one problem attempted
 *   MASTERED     – skill mastery reached independent or retained
 *   REVIEW_DUE   – mastery acquired but spaced-review is due
 */

export const ROADMAP_NODES = [
  {
    id: 'foundations',
    topicId: null,           // concept-only node; content and skill map by node id
    label: 'Foundations',
    subtitle: 'Complexity, Big-O, problem-solving mindset',
    description: 'Understand how to measure algorithm performance. Learn Big-O notation, time vs space trade-offs, and how to approach any DSA problem systematically.',
    icon: '◎',
    color: 'cyan',
    prerequisites: [],        // first node — always unlocked
    learningStages: ['concept', 'visualize', 'complexity', 'game', 'practice'],
    estimatedTime: '1–2 h',
  },
  {
    id: 'arrays',
    topicId: 'arrays',
    label: 'Arrays',
    subtitle: 'Indexing, traversal, in-place manipulation',
    description: 'Master contiguous memory. Learn indexing, multi-pass traversal, in-place mutations, prefix sums, and the most common array patterns used in interviews.',
    icon: '[ ]',
    color: 'green',
    prerequisites: ['foundations'],
    learningStages: ['concept', 'visualize', 'game', 'patterns', 'practice', 'problems'],
    estimatedTime: '3–5 h',
  },
  {
    id: 'hashing',
    topicId: 'hashing',
    label: 'Hashing',
    subtitle: 'O(1) lookup, frequency maps, deduplication',
    description: 'Hash maps give O(1) average lookup. Understand how hash functions work, handle collisions, and apply frequency counting and deduplication patterns.',
    icon: '#::',
    color: 'green',
    prerequisites: ['arrays'],
    learningStages: ['concept', 'visualize', 'game', 'patterns', 'practice', 'problems'],
    estimatedTime: '2–3 h',
  },
  {
    id: 'two-pointers',
    topicId: 'two-pointers',
    label: 'Two Pointers',
    subtitle: 'Left/right convergence, fast/slow runners',
    description: 'Use two indices moving toward or away from each other to solve array and string problems in O(n) instead of O(n²). A critical interview pattern.',
    icon: '↔',
    color: 'amber',
    prerequisites: ['arrays', 'hashing'],
    learningStages: ['concept', 'visualize', 'game', 'patterns', 'practice', 'problems'],
    estimatedTime: '2–3 h',
  },
  {
    id: 'binary-search',
    topicId: 'searching',
    label: 'Binary Search',
    subtitle: 'Search-space halving, rotated arrays',
    description: 'Eliminate half the search space every step. Binary search applies far beyond sorted arrays — learn to search on answers and handle edge cases.',
    icon: '⟨/⟩',
    color: 'amber',
    prerequisites: ['two-pointers'],
    learningStages: ['concept', 'visualize', 'game', 'patterns', 'practice', 'problems'],
    estimatedTime: '2–3 h',
  },
  {
    id: 'sliding-window',
    topicId: 'arrays',
    label: 'Sliding Window',
    subtitle: 'Variable/fixed windows, substring problems',
    description: 'Maintain a dynamic window of elements as you traverse an array or string. Eliminates nested loops for contiguous-subarray problems.',
    icon: '▭',
    color: 'amber',
    prerequisites: ['binary-search'],
    missionTopics: ['sliding-window'],
    learningStages: ['concept', 'visualize', 'game', 'patterns', 'practice'],
    estimatedTime: '2–3 h',
  },
  {
    id: 'stacks-queues',
    topicId: 'stacks',
    label: 'Stacks & Queues',
    subtitle: 'LIFO/FIFO, monotonic stacks, BFS/DFS prep',
    description: 'Stack and queue are the backbone of many algorithmic patterns. Understand LIFO/FIFO, monotonic stack problems, and prepare for graph traversal.',
    icon: '[=]',
    color: 'cyan',
    prerequisites: ['sliding-window'],
    missionTopics: ['stacks', 'queues'],
    learningStages: ['concept', 'visualize', 'game', 'patterns', 'practice', 'problems'],
    estimatedTime: '2–3 h',
  },
  {
    id: 'linked-lists',
    topicId: 'linked',
    label: 'Linked Lists',
    subtitle: 'Node traversal, pointer manipulation, cycles',
    description: 'Work directly with pointer-linked nodes. Learn reversal, cycle detection, merge operations, and how LL differs from arrays in memory.',
    icon: '→*',
    color: 'green',
    prerequisites: ['stacks-queues'],
    missionTopics: ['linked'],
    learningStages: ['concept', 'visualize', 'game', 'patterns', 'practice', 'problems'],
    estimatedTime: '2–4 h',
  },
  {
    id: 'trees',
    topicId: 'trees',
    label: 'Trees',
    subtitle: 'DFS/BFS traversal, BST, recursion patterns',
    description: 'Binary trees, BSTs, and N-ary trees. Master recursive thinking: pre/in/post-order traversal, tree height, diameter, lowest common ancestor.',
    icon: '/\\',
    color: 'green',
    prerequisites: ['linked-lists', 'binary-search'],
    missionTopics: ['trees', 'bst'],
    learningStages: ['concept', 'visualize', 'game', 'patterns', 'practice', 'problems'],
    estimatedTime: '4–6 h',
  },
  {
    id: 'heaps',
    topicId: 'heaps',
    label: 'Heaps / Priority Queues',
    subtitle: 'Min/max heaps, K-th element problems',
    description: 'Priority queues powered by heap data structures. Learn to efficiently find minimums/maximums, solve K-th largest, and merge sorted streams.',
    icon: '⋀',
    color: 'cyan',
    prerequisites: ['trees'],
    learningStages: ['concept', 'visualize', 'game', 'patterns', 'practice', 'problems'],
    estimatedTime: '2–3 h',
  },
  {
    id: 'graphs',
    topicId: 'graphs',
    label: 'Graphs',
    subtitle: 'BFS, DFS, topological sort, shortest paths',
    description: 'Generalization of trees. Learn BFS and DFS traversal, detect cycles, find connected components, and apply topological sort for dependency problems.',
    icon: 'o—o',
    color: 'amber',
    prerequisites: ['heaps'],
    learningStages: ['concept', 'visualize', 'game', 'patterns', 'practice', 'problems'],
    estimatedTime: '5–8 h',
  },
  {
    id: 'backtracking',
    topicId: 'recursion',
    label: 'Backtracking',
    subtitle: 'State-space search, pruning, combinatorics',
    description: 'Systematically explore all possible solutions by building candidates and abandoning dead ends. Essential for permutations, combinations, and Sudoku-like problems.',
    icon: '↩',
    color: 'green',
    prerequisites: ['graphs'],
    learningStages: ['concept', 'visualize', 'game', 'patterns', 'practice', 'problems'],
    estimatedTime: '3–5 h',
  },
  {
    id: 'dynamic-programming',
    topicId: 'dp',
    label: 'Dynamic Programming',
    subtitle: 'Memoization, tabulation, state transitions',
    description: 'Never solve the same sub-problem twice. Learn top-down (memo) and bottom-up (tabulation) DP. Apply to knapsack, LCS, edit distance, and coin change.',
    icon: '::',
    color: 'amber',
    prerequisites: ['backtracking'],
    learningStages: ['concept', 'visualize', 'game', 'patterns', 'practice', 'problems'],
    estimatedTime: '6–10 h',
  },
  {
    id: 'interview-patterns',
    topicId: null,           // synthesis chapter; no topic-scoped mission group
    label: 'Interview Patterns',
    subtitle: 'Meta-patterns, time management, system design intro',
    description: 'Recognize which pattern to apply in an interview setting. Fast pattern matching, edge-case awareness, communication strategies, and common interview archetypes.',
    icon: '⬡',
    color: 'cyan',
    prerequisites: ['dynamic-programming'],
    learningStages: ['patterns', 'practice'],
    estimatedTime: '3–5 h',
  },
];

/** Fast lookup by node id */
export const ROADMAP_NODE_MAP = Object.fromEntries(
  ROADMAP_NODES.map((n) => [n.id, n])
);

/**
 * Compute visual state for a roadmap node given cleared missions + skill records.
 * Returns: 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'MASTERED' | 'REVIEW_DUE'
 */
function isChapterComplete(node, cleared, topics) {
  if (!node || !topics) return false;
  return (node.learningStages || []).every((stage) => {
    if (stage === 'problems') {
      const topicIds = node.missionTopics || (node.topicId ? [node.topicId] : []);
      const missions = topicIds.flatMap(missionsOfTopic);
      return missions.length > 0 && missions.every((mission) => !!cleared[mission.id]);
    }
    const key = stage === 'patterns' ? 'pattern' : stage;
    return !!topics[node.id]?.stages?.[key];
  });
}

export function computeNodeState(nodeId, cleared, skills, topics) {
  const node = ROADMAP_NODE_MAP[nodeId];
  if (!node) return 'LOCKED';

  // A chapter becomes available after every prerequisite has persisted its
  // learning proofs. Merely visiting or opening a prerequisite is not enough.
  const prereqsMet = node.prerequisites.every((prereqId) => {
    const prerequisite = ROADMAP_NODE_MAP[prereqId];
    return isChapterComplete(prerequisite, cleared, topics);
  });

  if (!prereqsMet) return 'LOCKED';

  // Check mastery/skill record if this node maps to a topic
  if (node.topicId) {
    // Find skills that belong to this topic
    const topicSkills = Object.entries(skills || {}).filter(
      ([skillId]) => skillId.startsWith(node.topicId) || skillId.includes(node.topicId)
    );

    if (topicSkills.length > 0) {
      const hasRetained = topicSkills.some(([, rec]) => rec.masteryLevel === 'retained');
      const hasIndependent = topicSkills.some(([, rec]) => rec.masteryLevel === 'independent');
      const hasReviewDue = topicSkills.some(
        ([, rec]) => rec.reviewDue && Date.now() >= rec.reviewDue
      );

      if (hasRetained || hasIndependent) {
        if (hasReviewDue) return 'REVIEW_DUE';
        return 'MASTERED';
      }

      return 'IN_PROGRESS';
    }
  }

  return 'AVAILABLE';
}

/** Returns true if the node is clickable (not locked) */
export function isNodeAccessible(nodeId, cleared, skills, topics) {
  const state = computeNodeState(nodeId, cleared, skills, topics);
  return state !== 'LOCKED';
}

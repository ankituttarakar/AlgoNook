// Sectors 10–11: Heaps, Graphs
import { mc, order } from './helpers.js';

export default [
  // ───────────── 10 HEAPS ─────────────
  {
    id: 'heap-1', topic: 'heaps', kind: 'standard', title: 'THE PRIORITY ENGINE',
    brief: 'The Priority Engine always serves the most urgent signal first — no sorting, no scanning. A heap keeps the extreme value one step away.',
    intel: [
      'A min-heap: every parent ≤ its children. The root is always the minimum.',
      'Stored in an array: children of index i live at 2i+1 and 2i+2.',
      'It is a PARTIAL order — fast extremes, no full sorting.',
    ],
    challenges: [
      mc('easy', 'In a MIN-heap, the minimum element is always:', [
        ['At the root (index 0)', 'Correct. The heap invariant forces every parent ≤ children, so nothing can be smaller than the root.', true],
        ['At the last leaf', 'That position holds whatever was inserted last — no ordering promise.'],
        ['At the leftmost leaf', 'Leaves are mutually unordered; the min is never guaranteed there.'],
        ['Somewhere you must search for', 'Search defeats the purpose: the root IS the answer, O(1).'],
      ], { hint: 'What does the parent≤child rule force at the very top?' }),
      mc('easy', 'In an array-based heap, the children of index i live at:', [
        ['2i + 1 and 2i + 2', 'Correct. And the parent of i is ⌊(i−1)/2⌋. Pure index arithmetic — no pointers.', true],
        ['i + 1 and i + 2', 'That is just the next two slots; heap children double the index, skipping ahead.'],
        ['2i and 2i + 1', 'That is 1-based indexing. With 0-based arrays the children are 2i+1 and 2i+2.'],
        ['i − 1 and i + 1', 'Neighbors in the array are not heap relatives.'],
      ], { hint: 'Root 0 → children 1, 2. Node 1 → children 3, 4. See the doubling?' }),
      mc('easy', 'Min-heap stored as [2, 5, 3, 8, 7]. What is the minimum, and at what cost to read it?', [
        ['2, in O(1)', 'Correct. The root (index 0) always holds the min — a plain array read.', true],
        ['2, in O(log n)', 'EXTRACTING it costs O(log n) (sift-down after removal). Merely reading is O(1).'],
        ['3, in O(1)', '3 is the smaller of the right subtree — but the global min sits at the root: 2.'],
        ['5, in O(1)', '5 is just the second array slot; slot order is not sorted order. The root is 2.'],
      ], { hint: 'Peek ≠ pop. Only one of them disturbs the heap.' }),
    ],
  },
  {
    id: 'heap-2', topic: 'heaps', kind: 'standard', title: 'SIFT AND SWIM',
    brief: 'Insertions bubble up. Extractions sink down. Two movements — sift-up and sift-down — keep the Engine\'s invariant unbreakable.',
    intel: [
      'Insert: append at the end, then swap upward while smaller than parent.',
      'Extract-min: move the LAST element to the root, then sift down.',
      'Both operations travel one root-to-leaf path: O(log n).',
    ],
    challenges: [
      order('med', 'Insert X into a min-heap. Order the steps.', [
        'Append X at the next free array slot (a new leaf)',
        'Compare X with its parent',
        'While X is smaller than its parent, swap them upward',
        'Stop when X reaches the root or its parent is smaller',
      ], 'Appending keeps the tree complete; sift-up restores the invariant along a single path — O(log n) swaps at most.', { hint: 'New elements enter at the BOTTOM and swim up.' }),
      mc('med', 'Min-heap [2, 5, 3]. Insert 1. The heap becomes:', [
        ['[1, 2, 3, 5]', 'Correct. Append → [2,5,3,1]; 1 swaps with parent 5 → [2,1,3,5]; 1 swaps with 2 → [1,2,3,5].', true],
        ['[1, 5, 3, 2]', 'That order violates the invariant: 5\'s child 2 is smaller than 5.'],
        ['[2, 1, 3, 5]', '1 rose only one level; it must also pass 2, since a parent must be ≤ its children.'],
        ['[1, 2, 5, 3]', 'After the swaps, 5 ends as the child of 2, and 3 stays right child of 1: [1,2,3,5].'],
      ], { hint: 'Append at the end, then keep swapping with smaller parents.' }),
      mc('med', 'Extract-min from a heap: after removing the root, what happens next?', [
        ['Move the LAST element to the root, then sift it down', 'Correct. The last leaf fills the hole (keeping the tree complete), then sinks until the invariant holds — O(log n).', true],
        ['Promote the smaller child to the root directly', 'Tempting, but it leaves a hole that cascades; the last-element swap keeps the array compact.'],
        ['Rebuild the heap from scratch', 'Rebuild is O(n); the last-element trick does it in O(log n).'],
        ['Shift all array elements left', 'That is O(n) and breaks the index math. Heaps never shift.'],
      ], { hint: 'The array must stay compact — which element can move without leaving a gap?' }),
    ],
  },
  {
    id: 'heap-3', topic: 'heaps', kind: 'boss', title: 'BREACH: THE K-BARRIER',
    brief: 'SECTOR BOSS — the Engine must build itself from raw chaos and then hold back a flood, admitting only the K largest signals.',
    intel: [
      'Heapify (build-heap) runs in O(n) — faster than n inserts at O(n log n).',
      'Top-K of a stream: keep a MIN-heap of size K; evict when a newcomer beats the root.',
      'Heapsort: repeated extract-min sorts in O(n log n) with O(1) extra space.',
    ],
    challenges: [
      mc('hard', 'Building a heap from an unsorted array of n elements (heapify) costs:', [
        ['O(n) — sift-downs from the bottom up telescope into linear time', 'Correct. Most nodes sit near the leaves and sift barely any levels; the math sums to O(n).', true],
        ['O(n log n) — n elements × log n depth', 'That bound is true but LOOSE for heapify (it is tight for n repeated inserts). Bottom-up heapify is provably linear.'],
        ['O(n²)', 'No pairwise comparisons happen; sift-down touches one path per node.'],
        ['O(log n)', 'Every element must at least be examined — n is the floor.'],
      ], { hint: 'Half the nodes are leaves and sift zero levels.' }),
      mc('hard', 'Streaming data, keep the K LARGEST values seen so far. The classic structure is:', [
        ['A MIN-heap of size K — a newcomer larger than the root evicts it', 'Correct. The root is the weakest of the current top-K; anything bigger replaces it in O(log k).', true],
        ['A MAX-heap of all n values', 'Works but wastes memory: O(n) space instead of O(k).'],
        ['A fully sorted array of size K', 'Insertion into sorted order is O(k) per element; the heap does O(log k).'],
        ['A hash set of the top K', 'A set answers membership, not "which is the current weakest" — you cannot decide what to evict.'],
      ], { hint: 'Which of the current top-K should leave when a bigger value arrives?' }),
      mc('hard', 'Min-heapify the array [4, 2, 7, 1] (sift down from index 1, then 0). Result?', [
        ['[1, 2, 7, 4]', 'Correct. Index 1: 2 sinks below child 1 → [4,1,7,2]. Index 0: 4 sinks below min-child 1 → [1,4,7,2], then sinks again below 2 → [1,2,7,4]. Every parent ≤ children.', true],
        ['[1, 4, 7, 2]', 'One step short: after [1,4,7,2], node 4 still violates its child 2 and must sink once more.'],
        ['[1, 2, 4, 7]', 'That is the SORTED array. Heaps are only partially ordered — 7 stays above 4 legitimately.'],
        ['[2, 1, 7, 4]', 'The root must be the global minimum: 1. This still violates the root.'],
      ], { hint: 'Process parents from the LAST one upward; each sifts until satisfied.' }),
    ],
  },

  // ───────────── 11 GRAPHS ─────────────
  {
    id: 'grf-1', topic: 'graphs', kind: 'standard', title: 'THE WEB',
    brief: 'Beyond hierarchy lies the Web: nodes connected any way they please, cycles and all. Trees were just the polite special case.',
    intel: [
      'A graph = vertices + edges, directed or undirected, weighted or not.',
      'Adjacency LIST: O(1) neighbor iteration, sparse-friendly.',
      'Adjacency MATRIX: O(1) "are these two connected?" but O(n²) space.',
    ],
    challenges: [
      mc('easy', 'When is an adjacency MATRIX the better graph representation?', [
        ['Dense graphs, or when edge-existence queries must be O(1)', 'Correct. matrix[u][v] answers instantly — worth the n² space when most edges exist.', true],
        ['Sparse graphs with millions of vertices', 'A million² matrix is impossible; sparse graphs belong in adjacency lists.'],
        ['When you iterate neighbors constantly', 'Neighbor iteration in a matrix scans a whole row: O(n) even for one neighbor. Lists win there.'],
        ['Whenever the graph is directed', 'Direction is orthogonal — both representations handle directed edges.'],
      ], { hint: 'What does each representation optimize?' }),
      mc('easy', 'Undirected graph: edges (A,B), (A,C), (B,C), (C,D). Degree of C is:', [
        ['3', 'Correct. C touches A, B, and D — three incident edges.', true],
        ['2', 'Count every edge touching C: (A,C), (B,C), (C,D) — that is three.'],
        ['4', 'There are only 4 edges total, and (A,B) does not touch C.'],
        ['1', 'C is the busiest vertex here, not the quietest.'],
      ], { hint: 'Degree = number of edges touching the vertex.' }),
      order('easy', 'BFS from a start vertex S. Order the algorithm.', [
        'Mark S visited and enqueue it',
        'Dequeue a vertex and process it',
        'Enqueue every UNVISITED neighbor, marking each as visited when enqueued',
        'Repeat until the queue is empty',
      ], 'Marking at ENQUEUE time (not dequeue) prevents the same vertex entering the queue twice — the classic BFS bug.', { hint: 'When exactly should a neighbor be marked visited?' }),
    ],
  },
  {
    id: 'grf-2', topic: 'graphs', kind: 'standard', title: 'TWO EXPEDITIONS',
    brief: 'Two ways to cross the Web: the wavefront (BFS) that expands evenly, and the deep dive (DFS) that commits to a path until it dies.',
    intel: [
      'BFS = queue = level by level = shortest path in UNWEIGHTED graphs.',
      'DFS = stack/recursion = plunge deep, backtrack on dead ends.',
      'Both are O(V + E): every vertex and edge is touched once.',
    ],
    challenges: [
      mc('med', 'Graph: A connects to B and C; B connects to D. BFS from A (neighbors alphabetically) visits:', [
        ['A, B, C, D', 'Correct. A first; its neighbors B, C enqueue; B dequeues and adds D. Level order: A / B,C / D.', true],
        ['A, B, D, C', 'That is DFS — diving into B\'s child before visiting A\'s other neighbor C.'],
        ['A, C, B, D', 'Alphabetical neighbor order enqueues B before C, so B is served first.'],
        ['A, D, B, C', 'D is two edges away; BFS never visits depth 2 before finishing depth 1.'],
      ], { hint: 'FIFO: who was enqueued second?' }),
      mc('med', 'Which guarantee does BFS give in an UNWEIGHTED graph?', [
        ['The first time a vertex is reached, the path used is a shortest path (fewest edges)', 'Correct. BFS expands by distance layers; first contact = minimum edge count.', true],
        ['It visits vertices in alphabetical order', 'Order depends on neighbor iteration, not names.'],
        ['It finds the cheapest weighted path', 'Weighted shortest paths need Dijkstra; BFS ignores weights.'],
        ['It detects cycles faster than DFS', 'Both detect cycles in O(V+E); neither is asymptotically faster.'],
      ], { hint: 'What does the "level" of a vertex in BFS mean?' }),
      mc('med', 'DFS on a graph is naturally implemented with:', [
        ['A stack — usually the call stack via recursion', 'Correct. Dive, and when the path dies, the stack unwinds you back to the last branch point.', true],
        ['A queue', 'A queue produces BFS order, not deep-diving.'],
        ['A priority queue', 'That is Dijkstra/best-first territory, not plain DFS.'],
        ['A hash table only', 'A set tracks visited vertices, but something must order the exploration — the stack.'],
      ], { hint: 'What structure unwinds you back to the last fork?' }),
    ],
  },
  {
    id: 'grf-3', topic: 'graphs', kind: 'boss', title: 'BREACH: THE WEIGHTED WEB',
    brief: 'SECTOR BOSS — the Web grows weights, and BFS\'s promise dies. Only Dijkstra\'s greedy frontier finds the cheapest route now.',
    intel: [
      'Dijkstra: always expand the unsettled vertex with the smallest tentative distance.',
      'It requires NON-NEGATIVE weights — a negative edge breaks the greedy proof.',
      'Relaxation: if dist[u] + w(u,v) < dist[v], improve dist[v].',
    ],
    challenges: [
      order('hard', 'Dijkstra\'s algorithm from source S. Order one round.', [
        'Pick the unvisited vertex with the smallest tentative distance',
        'Mark it visited — its distance is now final',
        'For each neighbor, relax: if dist through this vertex is shorter, update it',
        'Repeat until all reachable vertices are visited',
      ], 'Greedy correctness: with non-negative weights, the smallest tentative distance can never be improved later — so finalizing it is safe.', { hint: 'Which vertex is SAFE to finalize next?' }),
      mc('hard', 'Why does Dijkstra FAIL with negative edge weights?', [
        ['A "finalized" distance could later be improved through a negative edge, breaking the greedy assumption', 'Correct. Example: S→A cost 5 finalized, then S→B(2)→A(−5) yields 0 < 5 — but A was already settled. Use Bellman–Ford instead.', true],
        ['Negative weights create cycles', 'Negative CYCLES are a separate problem; even acyclic graphs with one negative edge can break Dijkstra.'],
        ['The priority queue rejects negative numbers', 'The queue handles any numbers fine; the ALGORITHM\'s proof is what breaks.'],
        ['Distances become negative', 'Distances can be negative legitimately. The failure is finalizing too early, not negative values themselves.'],
      ], { hint: 'What does "visited = final" assume about future improvements?' }),
      mc('hard', 'Edges: S→A 1, S→B 4, A→B 2, B→T 1, A→T 5. Shortest S→T distance?', [
        ['4', 'Correct. S→A(1) → B(2) → T(1) = 4. The direct-looking S→B→T costs 5, and S→A→T costs 6.', true],
        ['5', 'S→B→T = 4+1 = 5 looks short, but routing through A first (1+2) reaches B cheaper.'],
        ['6', 'S→A→T = 1+5 = 6 ignores the A→B shortcut.'],
        ['3', 'No combination sums to 3: the cheapest legs are 1+2+1 = 4.'],
      ], { hint: 'Relax S→A first, then check whether A improves the route to B.' }),
    ],
  },
];

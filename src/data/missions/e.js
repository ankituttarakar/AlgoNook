// Sectors 12–14: Sorting, Searching, Dynamic Programming
import { mc, order } from './helpers.js';

export default [
  // ───────────── 12 SORTING ─────────────
  {
    id: 'srt-1', topic: 'sorting', kind: 'standard', title: 'ORDER OUT OF CHAOS',
    brief: 'The Archive is a shuffled mess. The simple sorts are slow but honest — watch the heavy records bubble to the top.',
    intel: [
      'Bubble sort: swap adjacent out-of-order pairs; the largest "bubbles" to the end each pass.',
      'Insertion sort: grow a sorted prefix, sliding each new element into place.',
      'Both are O(n²) — fine for tiny or nearly-sorted data.',
    ],
    challenges: [
      mc('easy', 'After ONE full bubble-sort pass over [5, 1, 4, 2], what is guaranteed?', [
        ['The largest element (5) sits at the last position', 'Correct. Every comparison pushes the bigger value right, so the max reaches the end in one pass.', true],
        ['The array is fully sorted', 'One pass guarantees only the maximum\'s final seat: [1,4,2,5] still needs more passes.'],
        ['The smallest element sits first', 'Bubbling pushes LARGE values right; the minimum drifts left only one slot per pass.'],
        ['No more swaps will ever be needed', '[1,4,2,5] still has an inversion (4,2) — more passes are required.'],
      ], { hint: 'What does one pass push all the way to the right?' }),
      order('easy', 'Insertion sort: insert element X into the sorted prefix. Order the steps.', [
        'Take X, the first element after the sorted prefix',
        'Compare X with the last element of the prefix',
        'Shift larger prefix elements one slot right',
        'Place X into the gap where shifting stopped',
      ], 'Shifting opens exactly one gap — X lands where the first smaller-or-equal element stops it. The prefix stays sorted, growing by one.', { hint: 'Think of sorting a hand of cards.' }),
      mc('easy', 'Insertion sort on nearly-sorted data runs close to:', [
        ['O(n)', 'Correct. With few inversions, each element shifts at most a couple of slots — adaptive sorts love almost-sorted input.', true],
        ['O(n²)', 'That is the WORST case (reverse-sorted). Nearly-sorted data has almost no shifting to do.'],
        ['O(log n)', 'Every element must still be examined once — linear is the floor.'],
        ['O(n log n)', 'Insertion sort has no divide-and-conquer structure to earn the log factor.'],
      ], { hint: 'How much shifting happens if nothing is far from home?' }),
    ],
  },
  {
    id: 'srt-2', topic: 'sorting', kind: 'standard', title: 'DIVIDE AND CONQUER',
    brief: 'The Archive splits itself in half, and halves of halves, until sorting becomes trivial — then the merges stitch order back together.',
    intel: [
      'Merge sort: split in half, sort each half, merge — O(n log n) always, and STABLE.',
      'Merging two sorted runs is O(n): always take the smaller front.',
      'Quicksort partitions around a pivot: smaller left, larger right.',
    ],
    challenges: [
      mc('med', 'Merge sort\'s time complexity — best, average, worst:', [
        ['O(n log n) for all three', 'Correct. The split depth is always log n and merging always costs n per level — input order does not matter.', true],
        ['O(n²) worst case', 'That is quicksort\'s worst case. Merge sort never degenerates.'],
        ['O(n) best case', 'Even on sorted input, merge sort still splits and merges everything.'],
        ['O(log n) average', 'log n levels × n work per level = n log n, not log n.'],
      ], { hint: 'Does the input order change how deep it splits?' }),
      order('med', 'Merge the sorted runs [1, 3, 5] and [2, 4, 6]. Order the merge loop.', [
        'Compare the fronts: 1 vs 2 — emit 1',
        'Compare 3 vs 2 — emit 2',
        'Compare 3 vs 4 — emit 3, then 4 vs 5 — emit 4',
        'Emit 5, then append the exhausted run\'s remainder: 6',
      ], 'Each step emits the smaller front: 1,2,3,4,5,6. Six emissions, five real comparisons — merging is linear.', { hint: 'The smaller front always leaves next.' }),
      mc('med', 'Quicksort partition: pivot 4 over [7, 2, 8, 1, 4, 9]. After partitioning, the guarantee is:', [
        ['Everything left of 4 is smaller, everything right is larger — 4 is in its FINAL position', 'Correct. Partitioning fully places the pivot; only the two sides still need sorting (recursively).', true],
        ['The whole array is sorted', 'Only the pivot is guaranteed placed; [2,1] and [7,8,9] still need work.'],
        ['Each side is individually sorted', 'Sides are partitioned by value, not sorted internally.'],
        ['The pivot is the median', 'The pivot is whatever you picked — 4 here is not the median of the array.'],
      ], { hint: 'What does partitioning promise about the PIVOT itself?' }),
    ],
  },
  {
    id: 'srt-3', topic: 'sorting', kind: 'boss', title: 'BREACH: THE WORST CASE',
    brief: 'SECTOR BOSS — the Archive\'s quicksort has been poisoned: adversarial input forces its O(n²) collapse. Diagnose it and choose the cure.',
    intel: [
      'Quicksort worst case O(n²): pivot is always the min or max (e.g. sorted input, first-element pivot).',
      'Randomized pivots make the worst case astronomically unlikely.',
      'Counting sort: O(n+k) when values live in a small range — no comparisons.',
    ],
    challenges: [
      mc('hard', 'Quicksort with FIRST-ELEMENT pivot hits its O(n²) worst case when the input is:', [
        ['Already sorted (or reverse sorted)', 'Correct. Every pivot is an extreme, so partitions split 0 vs n−1 — depth n instead of log n.', true],
        ['Perfectly random', 'Random input gives balanced splits on average: O(n log n).'],
        ['All elements equal', 'Equal elements are actually handled well by 3-way partition schemes; sorted order is the classic killer.'],
        ['Guaranteed — quicksort is always O(n²)', 'Average case is O(n log n); worst case needs adversarial pivot choices.'],
      ], { hint: 'Which input makes every pivot an extreme value?' }),
      mc('hard', 'The standard FIX for quicksort\'s adversarial worst case is:', [
        ['Choose the pivot at RANDOM (or median-of-three)', 'Correct. Randomness makes consistently-bad splits astronomically unlikely — expected O(n log n) regardless of input.', true],
        ['Switch to bubble sort for small arrays', 'Small-array cutoffs help constants, not the asymptotic worst case.'],
        ['Sort the input first', 'That defeats the purpose — and sorted input IS the worst case.'],
        ['Use a larger stack', 'Stack size treats a symptom (recursion depth), not the unbalanced splits.'],
      ], { hint: 'The enemy chooses bad pivots via the INPUT. Remove their control.' }),
      mc('hard', 'Counting sort of [3, 1, 2, 3, 1] (values 1..3). The count array before output is:', [
        ['[2, 1, 2]', 'Correct. Two 1s, one 2, two 3s → counts [2,1,2], then output expands them: 1,1,2,3,3.', true],
        ['[1, 2, 3]', 'Those are the distinct VALUES, not their frequencies.'],
        ['[3, 3, 3]', 'Counts are frequencies per value: |1s|=2, |2s|=1, |3s|=2.'],
        ['[5, 0, 0]', 'The total (5) belongs nowhere in a per-value count array.'],
      ], { hint: 'counts[v] = how many times v appears.' }),
    ],
  },

  // ───────────── 13 SEARCHING ─────────────
  {
    id: 'sea-1', topic: 'searching', kind: 'standard', title: 'THE HALVING BLADE',
    brief: 'Somewhere in a sorted vault lies one record. Scan it linearly and age — or halve the search space with every question.',
    intel: [
      'Linear search: O(n), works on anything.',
      'Binary search: sorted data only, discards HALF each step — O(log n).',
      'mid = lo + (hi − lo) / 2 avoids index overflow in fixed-width ints.',
    ],
    challenges: [
      mc('easy', 'Binary search for 7 in [1, 3, 5, 7, 9]. How many probes?', [
        ['2', 'Correct. Probe mid=5 (too small → go right), probe 7 → found. Two probes.', true],
        ['1', 'The middle element is 5, not 7 — the first probe misses.'],
        ['3', 'After probing 5, the range is [7,9] with mid 7 — found on probe 2.'],
        ['5', 'That is linear-search pacing. Each binary-search probe halves the range.'],
      ], { hint: 'First probe is the middle element.' }),
      order('easy', 'Binary search for target T. Order one iteration.', [
        'Compute mid between lo and hi',
        'Compare a[mid] with T',
        'If a[mid] < T, discard the left half: lo = mid + 1',
        'If a[mid] > T, discard the right half: hi = mid − 1',
      ], 'Each probe kills half the candidates. Equality ends the search; lo crossing hi means T is absent.', { hint: 'The comparison tells you WHICH half dies.' }),
      mc('easy', 'Binary search REQUIRES the data to be:', [
        ['Sorted', 'Correct. The discard-half logic only works because order tells you which side can hold the target.', true],
        ['Small', 'Size is irrelevant — binary search scales to billions.'],
        ['Stored in a linked list', 'Lists kill it: no O(1) mid access. You need random access (array).'],
        ['Free of duplicates', 'Duplicates are fine — you may just land on any one of them.'],
      ], { hint: 'What justifies throwing half the data away?' }),
    ],
  },
  {
    id: 'sea-2', topic: 'searching', kind: 'standard', title: 'BOUNDARY CONDITIONS',
    brief: 'The Blade\'s kills are made at the edges: off-by-one errors, missing targets, duplicate walls. Precision or death.',
    intel: [
      'Search ends when lo > hi — the target is absent; boundaries say where it WOULD go.',
      'First-occurrence search: on a hit, record it and keep going LEFT.',
      'The insertion point of a missing value falls out of the final lo.',
    ],
    challenges: [
      mc('med', 'Binary search for 4 in [1, 3, 5] (lo/hi inclusive). What happens?', [
        ['Probes 3 then 5, ends with lo=2, hi=1: absent — insertion point is index 2', 'Correct. 3<4 pushes lo right; 5>4 pulls hi left; lo crosses hi exactly where 4 belongs.', true],
        ['Probes 3 then 5 and finds 4', '4 is not in the array — every probe misses.'],
        ['Infinite loop', 'Each probe strictly moves lo up or hi down, so the range always shrinks.'],
        ['Ends with lo = hi = 0', 'The final lo marks the insertion point: 4 belongs after 3, at index 2.'],
      ], { hint: 'Watch where lo and hi cross.' }),
      mc('med', 'To find the FIRST occurrence of a duplicated target, on a match at mid you should:', [
        ['Record mid, then keep searching the LEFT half (hi = mid − 1)', 'Correct. A match is a candidate; an earlier equal element may still hide to the left.', true],
        ['Return mid immediately', 'Any equal match works only if duplicates do not exist; the first occurrence may be further left.'],
        ['Search the RIGHT half', 'Earlier duplicates live LEFT of mid, never right.'],
        ['Restart from the beginning', 'The halves logic still applies — you just bias left after recording.'],
      ], { hint: 'A match narrows, but does not end, the hunt for the FIRST.' }),
      mc('med', 'Why write mid = lo + floor((hi − lo) / 2) instead of floor((lo + hi) / 2)?', [
        ['lo + hi can overflow fixed-width integers in languages like C/Java', 'Correct. The rewritten form never exceeds hi — same math, no overflow. (JS floats forgive, but the habit matters.)', true],
        ['It is faster arithmetic', 'One extra subtraction is not a speed win; it is an overflow guard.'],
        ['It rounds more accurately', 'Both forms compute the same floor value when no overflow occurs.'],
        ['It handles negative indices', 'Indices are never negative in a valid search range.'],
      ], { hint: 'What happens to lo + hi near 2³¹?' }),
    ],
  },
  {
    id: 'sea-3', topic: 'searching', kind: 'boss', title: 'BREACH: SEARCH THE ANSWER',
    brief: 'SECTOR BOSS — the target is no longer in the array; it IS the answer. Binary-search the solution space itself.',
    intel: [
      '"Binary search on answer": when feasibility is monotone, search the VALUE.',
      'Rotated sorted array: at least one half is always properly sorted.',
      'Peak finding: move toward the larger neighbor — a peak is guaranteed.',
    ],
    challenges: [
      mc('hard', 'Find the smallest integer x with x² ≥ 30 by binary search on [1, 30]. Result?', [
        ['6', 'Correct. Feasibility (x² ≥ 30) is monotone: false,false,false,false,true... — search finds the first true: 6 (36 ≥ 30, while 5² = 25 < 30).', true],
        ['5', '5² = 25 < 30, so 5 is infeasible; the search pushes past it.'],
        ['8', '8 is feasible but not the SMALLEST — binary search keeps pulling left while feasible.'],
        ['30', 'The search halves the range each probe; it never needs to reach the end.'],
      ], { hint: 'Feasible values form one contiguous true-region — find its left edge.' }),
      mc('hard', 'Binary search in a ROTATED sorted array (e.g. [4,5,6,7,0,1,2]) works because:', [
        ['At every mid, at least one half is normally sorted — check which, then decide if the target lies inside it', 'Correct. The sorted half gives a clean range test; if the target is outside it, search the other half. O(log n) survives the rotation.', true],
        ['You must first find and undo the rotation', 'Finding the pivot is optional; the sorted-half test handles it inline.'],
        ['Rotation does not affect sortedness', 'Rotation breaks global sortedness — a naive mid test can discard the wrong half.'],
        ['You search both halves every time', 'That degrades to O(n). The point is discarding one half safely.'],
      ], { hint: 'Is [4,5,6,7] sorted? What about [7,0,1,2]?' }),
      mc('hard', 'Peak finding (a[i] greater than both neighbors) in O(log n): the key move is:', [
        ['Probe mid; if a[mid] < a[mid+1], a peak MUST exist on the right — go right; else go left', 'Correct. A rising slope guarantees a peak ahead (the array boundary counts as −∞), so half the array is provably dead.', true],
        ['Check every element until one qualifies', 'That is O(n). The slope argument kills half the array per probe.'],
        ['Sort first, then take the maximum', 'The max is A peak, but sorting costs O(n log n) and is unnecessary.'],
        ['Binary search only works on sorted arrays, so this is impossible', 'The slope creates the monotonic information binary search needs — sortedness is not required.'],
      ], { hint: 'If the ground rises to your right, must a peak exist over there?' }),
    ],
  },

  // ───────────── 14 DYNAMIC PROGRAMMING ─────────────
  {
    id: 'dp-1', topic: 'dp', kind: 'standard', title: 'THE MEMORY VAULT',
    brief: 'The final sector. The Vault remembers every answer ever computed — overlapping subproblems die here, solved exactly once.',
    intel: [
      'DP needs: overlapping subproblems + optimal substructure.',
      'Memoization (top-down): cache each computed result.',
      'Tabulation (bottom-up): fill a table from smallest subproblem up.',
    ],
    challenges: [
      mc('easy', 'Dynamic programming applies when a problem has:', [
        ['Overlapping subproblems and optimal substructure', 'Correct. Overlap makes caching pay off; optimal substructure lets small answers compose into big ones.', true],
        ['Sorted input', 'Sorting matters to searching and some greedy methods, not to DP.'],
        ['A recursive solution with no repeated work', 'No repetition means nothing to cache — plain divide and conquer suffices.'],
        ['Constant memory requirements', 'DP usually TRADES memory (the table) for time.'],
      ], { hint: 'What makes remembering old answers profitable?' }),
      mc('easy', 'fib(5) with fib(0)=0, fib(1)=1 — computed via memoized DP:', [
        ['5', 'Correct. 0,1,1,2,3,5 — and with memoization each value is computed exactly once: O(n) instead of O(2ⁿ).', true],
        ['8', 'That is fib(6). Index carefully from fib(0).'],
        ['3', 'That is fib(4). The chain continues: fib(5) = 3 + 2.'],
        ['120', 'That multiplies (factorial). Fibonacci ADDS the two previous terms.'],
      ], { hint: 'Each new value is the sum of the previous two.' }),
      order('easy', 'Memoized recursion for solve(state). Order the logic.', [
        'Check the cache: if state was solved, return the stored answer',
        'Compute the answer recursively from smaller states',
        'Store the answer in the cache',
        'Return the answer',
      ], 'Cache-check first, store before returning. Store BEFORE the return, or nothing is ever remembered and you are back to exponential.', { hint: 'The cache is checked on entry and written on exit.' }),
    ],
  },
  {
    id: 'dp-2', topic: 'dp', kind: 'standard', title: 'CLIMBING THE STAIRS',
    brief: 'Every staircase, every coin pouch, every path count — the same skeleton: small answers welded into bigger ones.',
    intel: [
      'Climbing stairs: ways(n) = ways(n−1) + ways(n−2) — Fibonacci in disguise.',
      'Coin change: for each amount, try every coin and take the best.',
      'Bottom-up tables fill from amount 0 upward — no recursion needed.',
    ],
    challenges: [
      mc('med', 'Climbing stairs, 1 or 2 steps at a time: ways(5) = ?', [
        ['8', 'Correct. ways: 1,1,2,3,5,8 — each count sums the two before it.', true],
        ['5', 'That would count only step-size choices, not their orderings. (1,1,2) and (2,1,1) are different climbs.'],
        ['13', 'That is ways(6) — one staircase too far.'],
        ['6', 'Enumerate from the base: ways(0)=1, ways(1)=1, then add pairs: 2, 3, 5, 8.'],
      ], { hint: 'ways(n) = ways(n−1) + ways(n−2).' }),
      mc('med', 'Minimum coins for amount 6 using coins [1, 3, 4]:', [
        ['2 coins (3 + 3)', 'Correct. Greedy (4+1+1) gives 3 coins, but DP tries every coin per amount and finds 3+3.', true],
        ['3 coins (4 + 1 + 1)', 'That is the GREEDY trap: taking the biggest coin first is not always optimal.'],
        ['6 coins (1 × 6)', 'All-ones is the worst valid answer, not the minimum.'],
        ['Impossible', 'Coin 1 always makes every amount reachable.'],
      ], { hint: 'Greed is not proof. Compare 4+1+1 against other combos.' }),
      mc('med', 'Top-down memoization vs bottom-up tabulation:', [
        ['Same asymptotics; memo computes only needed states, tabulation avoids recursion overhead', 'Correct. Both are O(states × work-per-state). The trade-off is laziness+recursion vs full-table+iteration.', true],
        ['Tabulation is exponentially faster', 'Identical big-O. The difference is engineering, not complexity class.'],
        ['Memoization uses no extra memory', 'Both store the same table; memoization ADDS call-stack memory.'],
        ['Tabulation works without a recurrence', 'Both are driven by the exact same recurrence relation.'],
      ], { hint: 'Do they solve different subproblems, or just in a different order?' }),
    ],
  },
  {
    id: 'dp-3', topic: 'dp', kind: 'boss', title: 'BREACH: THE FINAL VAULT',
    brief: 'FINAL BOSS — the Vault seals itself behind the longest rising sequence and the knapsack\'s cruel arithmetic. Finish this, and the mainframe is yours.',
    intel: [
      'LIS: dp[i] = longest increasing subsequence ENDING at i.',
      'dp[i] = 1 + max(dp[j]) over all j < i with a[j] < a[i].',
      'Knapsack: dp[w] = best value with capacity w; iterate items, update capacities.',
    ],
    challenges: [
      mc('hard', 'Longest INCREASING subsequence of [3, 1, 4, 1, 5, 9, 2, 6]:', [
        ['Length 4 — e.g. [1, 4, 5, 9] or [1, 4, 5, 6]', 'Correct. dp fills: 1,1,2,1,3,4,2,4 — max is 4. No increasing run of 5 exists.', true],
        ['Length 3', 'Underestimate: [1,4,5,9] alone already reaches 4.'],
        ['Length 5', 'Try to build 5 increasing values: after 9 nothing larger exists, and before 1 nothing smaller — 4 is the ceiling.'],
        ['Length 8', 'A subsequence must be strictly increasing; equal 1s and the late 2 break long runs.'],
      ], { hint: 'dp[i] = best length ENDING at i. Fill left to right.' }),
      mc('hard', 'Why does GREEDY fail for coin change with arbitrary coins like [1, 3, 4]?', [
        ['Locally largest coins can block the globally best combination (6 = 3+3 beats 4+1+1)', 'Correct. Greedy commits to 4 and is forced into ones; DP considers every coin at every sub-amount, so it sees 3+3.', true],
        ['Greedy runs out of memory', 'Greedy uses LESS memory than DP; optimality, not resources, is the failure.'],
        ['Coin systems are never sortable', 'Sorting is trivial and irrelevant — the flaw is in the commitment strategy.'],
        ['Greedy cannot handle coin 1', 'Coin 1 is actually what saves greedy from being stuck; it still yields a suboptimal count.'],
      ], { hint: 'Replay amount 6 with both strategies.' }),
      order('hard', '0/1 knapsack: update the dp table for one item (weight w, value v). Order the logic.', [
        'Consider capacity C from the maximum DOWN to w',
        'Compare dp[C] against dp[C − w] + v',
        'Keep the better of the two in dp[C]',
        'After all items, dp[maxCapacity] holds the answer',
      ], 'Descending capacity is the whole trick: it guarantees the item is used at most once (dp[C−w] still refers to the PREVIOUS item\'s table). Ascending would allow unlimited reuse — that is the unbounded knapsack.', { hint: 'Why must capacity iterate DOWNWARD for a 0/1 item?' }),
    ],
  },
];

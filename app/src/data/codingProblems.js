// Executable, Python-backed chapter problems. The same contracts feed the
// learner flow and the authenticated trusted runner; Python is the only runtime
// currently implemented by that runner.
const q = (text, correct, rationale, wrong) => ({
  prompt: text,
  options: [
    { text: correct, correct: true, rationale },
    ...wrong.map(([text, rationale]) => ({ text, correct: false, rationale })),
  ],
});

function makePredictionCases(problem) {
  return problem.cases.slice(0, 3).map((test) => {
    const input = Object.fromEntries(problem.args.map((key) => [key, test[key]]));
    const expected = test.expected;
    let alternate;
    if (typeof expected === 'boolean') alternate = !expected;
    else if (typeof expected === 'number') alternate = expected + 1;
    else if (Array.isArray(expected)) alternate = expected.length ? [] : [0];
    else alternate = {};
    const expectedText = JSON.stringify(expected);
    const alternateText = JSON.stringify(alternate);
    return {
      nums: [],
      inputDisplay: JSON.stringify(input),
      prompt: 'What result follows from the contract for this input?',
      options: [
        { text: expectedText, correct: true, rationale: 'This matches the specified behavior for the edge case shown.' },
        { text: alternateText, correct: false, rationale: 'Check the boundary condition and the meaning of the maintained state against the contract.' },
      ],
    };
  });
}

export const CODING_PROBLEMS = [
  {
    id: 'max-profit', topic: 'arrays', chapter: 'arrays', skill: 'arrays-max-profit', title: 'Best Time to Buy and Sell', pattern: 'Prefix minimum', complexity: 'O(n) time · O(1) extra space',
    statement: 'Given daily prices, choose one day to buy and a later day to sell. Return the maximum profit; return 0 if no profitable trade exists.',
    constraints: ['1 ≤ prices.length ≤ 100,000', '0 ≤ prices[i] ≤ 10,000'],
    examples: [{ input: 'prices = [7, 1, 5, 3, 6, 4]', output: '5', explanation: 'Buy at 1, then sell later at 6.' }],
    args: ['prices'], cases: [{ id: 'later-peak', prices: [7, 1, 5, 3, 6, 4], expected: 5 }, { id: 'falling-prices', prices: [7, 6, 4, 3, 1], expected: 0 }, { id: 'one-rise', prices: [2, 4], expected: 2 }],
    starter: 'def maxProfit(prices):\n    # Track the cheapest earlier price and best profit so far\n    pass\n',
    prompt: 'Implement maxProfit(prices). Update the best profit using only a price seen before the current day.',
    intuition: 'At each sell day, the best legal buy is the minimum price in the prefix before it. Keep that minimum as the scan advances.',
    explain: q('Before processing day i, what should the running minimum represent?', 'The lowest price among days before i.', 'That ensures a candidate trade always buys before it sells.', [['The lowest price from all days, including future days.', 'A future price cannot be used as a past buy.'], ['The current best profit.', 'Profit and the prefix minimum are separate state.']]),
    transfer: q('Transfer: for each day, return the best profit achievable by selling on that day.', 'Keep the same prefix minimum and append the best profit at each day.', 'The invariant still summarizes all legal earlier buy days.', [['Compare every pair of days independently.', 'That abandons the reusable prefix state and costs O(n²).'], ['Sort prices before scanning.', 'Sorting destroys the time order that defines a legal trade.']]),
  },
  {
    id: 'binary-search-first', topic: 'searching', chapter: 'binary-search', skill: 'binary-search-boundary', title: 'First Position at Least Target', pattern: 'Lower bound / search-space reduction', complexity: 'O(log n) time · O(1) extra space',
    statement: 'Given a sorted integer array and target, return the first index whose value is at least target. Return the array length if no such index exists.',
    constraints: ['0 ≤ nums.length ≤ 100,000', 'nums is sorted in non-decreasing order'],
    examples: [{ input: 'nums = [1, 2, 2, 4], target = 2', output: '1', explanation: 'Index 1 is the first position whose value is at least 2.' }],
    args: ['nums', 'target'], cases: [{ id: 'duplicate-boundary', nums: [1, 2, 2, 4], target: 2, expected: 1 }, { id: 'between-values', nums: [1, 3, 5], target: 4, expected: 2 }, { id: 'past-end', nums: [1, 3], target: 8, expected: 2 }, { id: 'empty', nums: [], target: 0, expected: 0 }],
    starter: 'def lowerBound(nums, target):\n    # Keep the first possible valid index in the search interval\n    pass\n',
    prompt: 'Implement lowerBound(nums, target) in O(log n). Preserve a half-open interval [left, right).',
    intuition: 'If mid is already valid, the answer may be mid or earlier, so keep the left half including mid. Otherwise discard through mid.',
    explain: q('When nums[mid] >= target, why does right become mid?', 'mid is valid, but an earlier valid position may exist.', 'Keeping mid preserves the first-answer candidate while shrinking the interval.', [['mid must be the final answer.', 'A duplicate or earlier qualifying value may precede it.'], ['The target is absent.', 'A lower-bound query returns an insertion position even when absent.']]),
    transfer: q('Transfer: find the first index whose value is strictly greater than target.', 'Keep the same invariant, but treat nums[mid] > target as the valid condition.', 'Only the predicate changes; interval reduction stays the same.', [['Scan from index zero until a match.', 'This loses logarithmic search-space reduction.'], ['Return the last equal index.', 'That is an upper-bound boundary, not the lower-bound result requested.']]),
  },
  {
    id: 'window-max-sum', topic: 'arrays', chapter: 'sliding-window', skill: 'sliding-window-fixed', title: 'Maximum Sum Window', pattern: 'Fixed-size sliding window', complexity: 'O(n) time · O(1) extra space',
    statement: 'Given integers nums and a valid window size k, return the largest sum of any contiguous subarray of exactly k elements.',
    constraints: ['1 ≤ k ≤ nums.length ≤ 100,000', '−10,000 ≤ nums[i] ≤ 10,000'],
    examples: [{ input: 'nums = [2, 1, 5, 1, 3, 2], k = 3', output: '9', explanation: 'The window [5, 1, 3] has the largest sum.' }],
    args: ['nums', 'k'], cases: [{ id: 'mixed-values', nums: [2, 1, 5, 1, 3, 2], k: 3, expected: 9 }, { id: 'negative-values', nums: [-4, -2, -7], k: 2, expected: -6 }, { id: 'whole-array', nums: [3, -1, 2], k: 3, expected: 4 }],
    starter: 'def maxWindowSum(nums, k):\n    # Build the first window, then slide it one position at a time\n    pass\n',
    prompt: 'Implement maxWindowSum(nums, k) in O(n), updating the sum by removing the outgoing value and adding the incoming value.',
    intuition: 'Neighboring windows share k−1 values. Recompute once, then update from the two values that changed.',
    explain: q('After sliding one position, what does the running sum represent?', 'The sum of exactly the current k-element window.', 'That invariant lets each next window be computed with two updates.', [['The sum of all values seen so far.', 'That is a prefix total, not the current fixed window.'], ['The largest individual value in the window.', 'The state is the window sum, which can include several values.']]),
    transfer: q('Transfer: find the minimum sum among all contiguous windows of size k.', 'Track the same rolling window sum and keep its minimum instead of maximum.', 'The window invariant and O(n) updates are unchanged.', [['Sort the array and sum the first k values.', 'Sorting changes which values are contiguous.'], ['Recompute every window from scratch.', 'It works but costs O(nk) instead of reusing overlap.']]),
  },
  {
    id: 'valid-parentheses', topic: 'stacks', chapter: 'stacks-queues', skill: 'stacks-bracket-matching', title: 'Balanced Brackets', pattern: 'Stack / last opened, first closed', complexity: 'O(n) time · O(n) worst-case stack space',
    statement: 'Given a string containing only (), [], and {}, return whether every opening bracket is closed by the correct type and in the correct order.',
    constraints: ['0 ≤ s.length ≤ 100,000', 's contains only bracket characters'],
    examples: [{ input: 's = "{[()]}"', output: 'true', explanation: 'Each closer matches the most recent unmatched opener.' }],
    args: ['s'], cases: [{ id: 'nested', s: '{[()]}', expected: true }, { id: 'wrong-order', s: '([)]', expected: false }, { id: 'early-closer', s: '())', expected: false }, { id: 'empty', s: '', expected: true }],
    starter: 'def isValidBrackets(s):\n    # Store unmatched openers; each closer must match the top\n    pass\n',
    prompt: 'Implement isValidBrackets(s) with a stack. Reject a closer when the stack is empty or its top has another type.',
    intuition: 'Nested brackets close in reverse order from how they opened. The most recent opener is the only valid match.',
    explain: q('Why must a closing bracket match the stack top?', 'It is the most recent unmatched opener, so nesting requires it to close first.', 'This is exactly the last-in, first-out rule.', [['It is the oldest opener.', 'That would incorrectly allow crossing pairs.'], ['Any opener of the same type can close.', 'Skipping a newer unmatched opener violates bracket order.']]),
    transfer: q('Transfer: determine whether HTML-like tags are properly nested.', 'Push opening tags and require each closing tag to match the most recent unmatched opener.', 'The same LIFO nesting invariant applies to named delimiters.', [['Track only how many tags are open.', 'A count cannot detect mismatched nesting order.'], ['Use a queue of opening tags.', 'FIFO closes the oldest opener first, which breaks nesting.']]),
  },
  {
    id: 'reverse-linked-values', topic: 'linked', chapter: 'linked-lists', skill: 'linked-list-reversal', title: 'Reverse a Linked Chain', pattern: 'Pointer rewiring', complexity: 'O(n) time · O(1) pointer space',
    statement: 'A linked list is represented as an array of node values from head to tail. Return the values in reverse order, modeling the result of reversing the links in place.',
    constraints: ['0 ≤ node count ≤ 100,000', 'Node values are integers'],
    examples: [{ input: 'head = [1, 2, 3]', output: '[3, 2, 1]', explanation: 'Each next link points to the previous node after reversal.' }],
    args: ['values'], cases: [{ id: 'three-nodes', values: [1, 2, 3], expected: [3, 2, 1] }, { id: 'empty', values: [], expected: [] }, { id: 'single', values: [9], expected: [9] }],
    starter: 'def reverseValues(values):\n    # Return the reversed chain values\n    pass\n',
    prompt: 'Implement reverseValues(values) and return the reversed list. Think of saving the next node before rewiring a pointer.',
    intuition: 'For real nodes, keep previous, current, and next. Save next before redirecting current.next to previous; then advance both pointers.',
    explain: q('What must be saved before changing current.next?', 'The original next node, so traversal can continue.', 'Rewiring otherwise loses access to the rest of the chain.', [['The list length.', 'Length does not preserve the next pointer.'], ['The tail value only.', 'One value cannot recover the unvisited chain.']]),
    transfer: q('Transfer: reverse only the links from position m through n.', 'Walk to the segment, then reverse links inside it while reconnecting both boundaries.', 'The same save-next-before-rewire operation is applied to a subchain.', [['Swap the endpoint values only.', 'That does not reverse interior links or values.'], ['Rebuild the entire list by sorting.', 'Ordering is unrelated; the task is local pointer reversal.']]),
  },
  {
    id: 'tree-max-depth', topic: 'trees', chapter: 'trees', skill: 'trees-max-depth', title: 'Measure Tree Depth', pattern: 'Recursive tree traversal', complexity: 'O(n) time · O(h) recursion space',
    statement: 'A binary tree is encoded in level order using integers and null for missing children. Return its maximum depth (number of nodes on the longest root-to-leaf path).',
    constraints: ['0 ≤ node count ≤ 10,000', 'Input is a valid level-order encoding'],
    examples: [{ input: 'root = [3, 9, 20, null, null, 15, 7]', output: '3', explanation: 'The longest path contains the root, 20, and one child.' }],
    args: ['level'], cases: [{ id: 'balanced', level: [3, 9, 20, null, null, 15, 7], expected: 3 }, { id: 'empty', level: [], expected: 0 }, { id: 'single', level: [1], expected: 1 }],
    starter: 'def maxDepth(level):\n    # Convert level-order nodes into a tree, then recurse\n    pass\n',
    prompt: 'Implement maxDepth(level). The input is level-order data. Build child relationships by array positions (2i+1, 2i+2), then use depth(null)=0 and 1+max(left,right).',
    intuition: 'A node contributes one level; its deepest path continues through whichever child is deeper. Missing children are the base case.',
    explain: q('Why is depth(node) = 1 + max(depth(left), depth(right))?', 'Every path through the node adds one level, then follows its deeper child.', 'The recurrence mirrors the definition of a longest root-to-leaf path.', [['Add the two child depths.', 'A path chooses one branch; it does not visit both branches sequentially.'], ['Return the smaller depth.', 'That would measure the shallowest branch, not maximum depth.']]),
    transfer: q('Transfer: compute the minimum depth to a leaf.', 'Use a traversal that handles a missing child carefully and chooses the shortest actual root-to-leaf path.', 'It uses the same recursive decomposition but has a different base condition when only one child exists.', [['Replace max with min for every node, including missing children.', 'A missing child is not a leaf path and must not make the answer zero.'], ['Count nodes in level order.', 'Breadth-first depth needs to stop at the first leaf, not count all nodes.']]),
  },
  {
    id: 'kth-largest', topic: 'heaps', chapter: 'heaps', skill: 'heaps-kth-largest', title: 'Find the Kth Largest', pattern: 'Bounded min-heap', complexity: 'O(n log k) time · O(k) heap space',
    statement: 'Given an integer list and k, return the kth largest value. Duplicates count as separate positions.',
    constraints: ['1 ≤ k ≤ values.length ≤ 100,000'],
    examples: [{ input: 'values = [3, 2, 1, 5, 6, 4], k = 2', output: '5', explanation: 'The sorted order is [6, 5, 4, 3, 2, 1].' }],
    args: ['values', 'k'], cases: [{ id: 'distinct', values: [3, 2, 1, 5, 6, 4], k: 2, expected: 5 }, { id: 'duplicates-count', values: [4, 4, 1, 2], k: 2, expected: 4 }, { id: 'largest', values: [8, 3, 7], k: 1, expected: 8 }],
    starter: 'def kthLargest(values, k):\n    import heapq\n    # Keep only the k largest values in a min-heap\n    pass\n',
    prompt: 'Implement kthLargest(values, k) with a min-heap of size at most k. The heap root is the kth-largest boundary.',
    intuition: 'Keep the largest k values seen. When the heap grows past k, remove its smallest value; the remaining root is the answer.',
    explain: q('After processing a prefix, what does a size-k min-heap retain?', 'The k largest values in that prefix, with the smallest of them at the root.', 'Values below the root cannot belong to the final top k once displaced.', [['The k smallest values.', 'A min-heap alone would need the largest-root boundary for that choice.'], ['Every value sorted in ascending order.', 'A heap is only partially ordered and stores at most k values.']]),
    transfer: q('Transfer: maintain the kth-largest value as a stream arrives.', 'Keep a size-k min-heap and read its root once k values have arrived.', 'The bounded heap summarizes the current top k without sorting the full stream.', [['Keep all values and sort after every insertion.', 'This repeats work and uses O(n) storage.'], ['Use a max-heap of only one value.', 'That returns the maximum, not the kth-largest boundary.']]),
  },
  {
    id: 'reachable-nodes', topic: 'graphs', chapter: 'graphs', skill: 'graphs-bfs-reachability', title: 'Count Reachable Nodes', pattern: 'BFS / visited state', complexity: 'O(V + E) time · O(V) space',
    statement: 'Given an undirected graph as an adjacency list and a valid start node, return the number of nodes reachable from start.',
    constraints: ['1 ≤ node count ≤ 10,000', 'Each edge appears in both adjacency lists'],
    examples: [{ input: 'graph = [[1], [0, 2], [1], []], start = 0', output: '3', explanation: 'Nodes 0, 1, and 2 are connected; node 3 is isolated.' }],
    args: ['graph', 'start'], cases: [{ id: 'disconnected', graph: [[1], [0, 2], [1], []], start: 0, expected: 3 }, { id: 'isolated-start', graph: [[], []], start: 1, expected: 1 }, { id: 'cycle', graph: [[1, 2], [0, 2], [0, 1]], start: 0, expected: 3 }],
    starter: 'def reachableCount(graph, start):\n    from collections import deque\n    # Mark nodes when enqueuing to prevent duplicate work\n    pass\n',
    prompt: 'Implement reachableCount(graph, start) with BFS. Mark a node visited when enqueuing it, not when later dequeued.',
    intuition: 'A queue explores nodes in layers. A visited set ensures cycles and multiple incoming edges do not enqueue a node repeatedly.',
    explain: q('Why mark a neighbor visited when it is enqueued?', 'It prevents another edge from adding the same node to the queue again.', 'Each reachable node is then processed at most once.', [['Only after all its neighbors are visited.', 'Cycles could enqueue it many times before then.'], ['Never; the queue itself is enough.', 'A node can enter the queue from multiple neighbors.']]),
    transfer: q('Transfer: find the shortest number of edges from start to every reachable node.', 'Store a distance when first discovering each node during BFS.', 'BFS visits nodes in nondecreasing distance order, so first discovery is shortest.', [['Use DFS and record the first path found.', 'DFS may first reach a node by a longer route.'], ['Sort adjacency lists by node id.', 'Neighbor order does not determine shortest path length.']]),
  },
  {
    id: 'subsets', topic: 'recursion', chapter: 'backtracking', skill: 'backtracking-subsets', title: 'Generate Every Subset', pattern: 'Backtracking / include-or-skip', complexity: 'O(n · 2ⁿ) time including output · O(n) recursion space',
    statement: 'Given a list of distinct integers, return every subset exactly once. The order of subsets does not matter.',
    constraints: ['0 ≤ nums.length ≤ 10', 'All values are distinct'],
    examples: [{ input: 'nums = [1, 2]', output: '[[], [1], [2], [1, 2]]', explanation: 'Each value is either included or skipped.' }],
    args: ['nums'], cases: [{ id: 'two-values', nums: [1, 2], expected: [[], [1], [2], [1, 2]] }, { id: 'empty', nums: [], expected: [[]] }, { id: 'one-value', nums: [7], expected: [[], [7]] }],
    starter: 'def subsets(nums):\n    # Explore include and skip choices, recording a copy at each leaf\n    pass\n',
    prompt: 'Implement subsets(nums) using recursive backtracking. Return each generated subset once; traversal order is not graded.',
    intuition: 'At every index, branch into two choices: include the value or leave it out. After all decisions, one subset is complete.',
    explain: q('Why are there 2^n subsets?', 'Each of n values independently has two choices: included or excluded.', 'The recursion tree has one binary decision per input position.', [['There are n! permutations.', 'Subsets do not order their values, so permutations are not distinct choices.'], ['There are n² pairs.', 'Subsets can have any size, not only two elements.']]),
    transfer: q('Transfer: generate subsets whose values sum to target.', 'Keep a running sum and prune a branch when its remaining choices cannot meet the target.', 'The include/skip tree remains; state and safe pruning narrow the search.', [['Sort and return one contiguous window.', 'A subset need not be contiguous.'], ['Use a visited set to avoid all recursive calls.', 'Visited membership does not represent include/skip choices.']]),
  },
  {
    id: 'climb-stairs', topic: 'dp', chapter: 'dynamic-programming', skill: 'dp-climb-stairs', title: 'Count Staircase Routes', pattern: 'Dynamic programming / overlapping subproblems', complexity: 'O(n) time · O(1) extra space',
    statement: 'You can climb 1 or 2 steps at a time. Given n steps, return the number of distinct ways to reach the top.',
    constraints: ['1 ≤ n ≤ 45'],
    examples: [{ input: 'n = 4', output: '5', explanation: 'The sequences are 1+1+1+1, 1+1+2, 1+2+1, 2+1+1, and 2+2.' }],
    args: ['n'], cases: [{ id: 'one-step', n: 1, expected: 1 }, { id: 'four-steps', n: 4, expected: 5 }, { id: 'ten-steps', n: 10, expected: 89 }],
    starter: 'def climbStairs(n):\n    # Reuse the counts for the two previous step totals\n    pass\n',
    prompt: 'Implement climbStairs(n) in O(n) time and O(1) extra space using the two previous subproblem results.',
    intuition: 'The final move came from step n−1 or n−2. Add those counts; values are reused rather than recomputed recursively.',
    explain: q('What is the transition for ways[i]?', 'ways[i] = ways[i − 1] + ways[i − 2].', 'Every route ends with exactly one of the allowed final jumps.', [['ways[i] = ways[i − 1] × ways[i − 2].', 'The route sets are disjoint alternatives, so counts add.'], ['ways[i] = i.', 'The number of routes grows by combining earlier route counts.']]),
    transfer: q('Transfer: count ways when you may climb 1, 2, or 3 steps.', 'Use three base counts and add the previous three states for each next step.', 'The DP state is still routes to a step; the allowed final moves define the transition.', [['Keep only the previous one state.', 'A three-step move depends on i−3 as well.'], ['Multiply the previous counts.', 'Each last-jump choice is an alternative, so counts are summed.']]),
  },
];

export function makeCodingMission(problem) {
  const choice = (id, section, heading, content) => ({ id, section, heading, type: 'choice', xpLabel: section, nextLabel: 'Next', ...content });
  return {
    id: `code-${problem.id}`, topic: problem.topic, chapter: problem.chapter || problem.topic, codingProblem: true, kind: 'standard', title: problem.title.toUpperCase(), skill: problem.skill,
    brief: `Learn the ${problem.pattern} pattern, implement it, and justify the state that makes it correct.`, learningFlow: true,
    problemFlow: {
      id: `${problem.topic.toUpperCase()} · CODE`, difficulty: 'Easy', title: problem.title,
      steps: [
        { id: 'problem', section: 'PROBLEM', heading: 'Read the specification', type: 'problem', xpLabel: 'PROBLEM REVIEW', difficulty: 'easy', statement: problem.statement, constraints: problem.constraints, examples: problem.examples, complexity: problem.complexity },
        choice('pattern', 'PATTERN', 'Recognize the reusable pattern', { prompt: `Which pattern is central to this problem?`, options: [{ text: problem.pattern, correct: true, rationale: problem.intuition }, { text: 'Sort the input and rescan it repeatedly', correct: false, rationale: 'This does not use the structural invariant described by the problem.' }, { text: 'Try every possible pair of states', correct: false, rationale: 'That usually repeats work and misses the intended scalable pattern.' }] }),
        choice('approach', 'APPROACH', 'Choose the maintained state', { prompt: problem.intuition, options: [{ text: 'Maintain only the state needed to extend a valid partial solution.', correct: true, rationale: 'The state summarizes prior decisions so each step can make progress without restarting.' }, { text: 'Discard all information after each iteration.', correct: false, rationale: 'The algorithm needs a compact invariant to avoid repeating work.' }, { text: 'Store every possible full solution before processing input.', correct: false, rationale: 'That can use unnecessary time and memory.' }] }),
        { id: 'implementation', section: 'IMPLEMENTATION', heading: 'Implement and run', type: 'implementation', xpLabel: 'CODING', difficulty: 'hard', challenge: { problemId: problem.id, executionLabel: problem.title, prompt: problem.prompt, starter: problem.starter, starterCodeByLanguage: { python: problem.starter }, requirements: [], supportedLanguages: ['python'], ladder: [problem.intuition, 'Identify what the current prefix, window, node, or decision path must summarize.', 'Choose the update that preserves that state after one step.', `Implement the ${problem.pattern} and check empty, boundary, and repeated-state cases.`] } },
        { id: 'tests', section: 'TESTS', heading: 'Predict the edge cases', type: 'tests', xpLabel: 'TEST REVIEW', difficulty: 'easy', cases: makePredictionCases(problem) },
        choice('explain', 'EXPLAIN', 'Explain why the state works', { prompt: `Which explanation best justifies the ${problem.pattern} solution?`, options: [{ text: problem.explain.options[0].text, correct: true, rationale: problem.explain.options[0].rationale }, ...problem.explain.options.slice(1)] }),
        choice('transfer', 'TRANSFER', 'Transfer the pattern', { prompt: problem.transfer.prompt, options: problem.transfer.options }),
      ],
    },
  };
}

// Sectors 07–09: Recursion, Trees, Binary Search Trees
import { mc, order } from './helpers.js';

export default [
  // ───────────── 07 RECURSION ─────────────
  {
    id: 'rec-1', topic: 'recursion', kind: 'standard', title: 'THE MIRROR ROOM',
    brief: 'A corridor of mirrors, each showing a smaller you. Walk in far enough and one mirror finally shows... nothing. That is your base case.',
    intel: [
      'A recursive function calls itself on a SMALLER input.',
      'The base case stops the chain — without it, infinite descent.',
      'Each call waits on the call stack until deeper calls return.',
    ],
    challenges: [
      mc('easy', 'What does EVERY correct recursive function need?', [
        ['A base case, and progress toward it in every recursive call', 'Correct. No base case → infinite recursion → stack overflow. No progress → the base case is never reached.', true],
        ['A loop as a backup plan', 'Recursion replaces the loop; no backup is required.'],
        ['Global variables to track depth', 'Depth lives naturally on the call stack; globals are unnecessary and error-prone.'],
        ['At least two recursive calls', 'Many recursions call themselves once (factorial, list length). What matters is termination.'],
      ], { hint: 'Why doesn\'t the function call itself forever?' }),
      mc('easy', 'factorial(4) — what value returns?', [
        ['24', 'Correct. 4×3×2×1 = 24. Each call multiplies n by factorial(n−1) down to the base case factorial(0)=1.', true],
        ['10', 'That would be 4+3+2+1. Factorial MULTIPLIES.'],
        ['4', 'The recursive calls contribute the rest: factorial(4) = 4 × factorial(3).'],
        ['16', 'That is 4×4. The chain runs all the way down to 1.'],
      ], {
        hint: 'factorial(n) = n × factorial(n−1).',
        code: 'function factorial(n) {\n  if (n === 0) return 1;\n  return n * factorial(n - 1);\n}',
      }),
      order('easy', 'Trace the call stack for countdown(3) printing 3, 2, 1. Order the events.', [
        'countdown(3) is called and prints 3, then waits',
        'countdown(2) is called and prints 2, then waits',
        'countdown(1) hits the base case and prints 1',
        'The waiting calls return and pop off the stack, deepest first',
      ], 'Calls push onto the stack going down and pop off coming back — LIFO. The base case is where the descent ends and the unwinding begins.', { hint: 'Push on the way down, pop on the way up.' }),
    ],
  },
  {
    id: 'rec-2', topic: 'recursion', kind: 'standard', title: 'CLONE CASCADE',
    brief: 'One signal splits into two, two into four. The Fibonacci cascade is beautiful — and exponentially wasteful.',
    intel: [
      'fib(n) = fib(n−1) + fib(n−2): 0, 1, 1, 2, 3, 5, 8...',
      'Naive fib re-computes the same values exponentially many times.',
      'Recursion splits problems; identical subproblems beg for caching (DP soon).',
    ],
    challenges: [
      mc('med', 'fib(6) with fib(0)=0, fib(1)=1 equals:', [
        ['8', 'Correct. Chain: 0,1,1,2,3,5,8 — the 6th index is 8.', true],
        ['5', 'That is fib(5). Keep going one more: fib(6) = fib(5) + fib(4) = 5 + 3.'],
        ['13', 'That is fib(7). Count the sequence carefully from fib(0)=0.'],
        ['6', 'Fibonacci adds the two previous values; it does not return its input.'],
      ], { hint: 'Write the sequence out from 0.' }),
      mc('med', 'Why is naive recursive fib(n) roughly O(2ⁿ)?', [
        ['Both branches re-compute the same sub-fibs exponentially many times', 'Correct. fib(n−2) is recomputed inside fib(n−1), and the overlap explodes downward.', true],
        ['Because it uses two recursive calls instead of one', 'Two calls alone give 2ⁿ only because of overlap; with memoization the same two calls cost O(n).'],
        ['Because the call stack has n levels', 'Depth n would be linear cost. The EXPLOSION comes from branching, not depth.'],
        ['Because addition is expensive on large numbers', 'The cost is the number of calls, not the arithmetic.'],
      ], { hint: 'Draw the call tree for fib(5) and count repeated subtrees.' }),
      mc('med', 'sum([4, 1, 5]) via this recursion returns:', [
        ['10', 'Correct. 4 + sum([1,5]) = 4 + 1 + sum([5]) = 4 + 1 + 5 = 10.', true],
        ['5', 'That is only the last element. Each call adds its head to the recursive result.'],
        ['9', 'Check the additions: 4+1+5. The base case contributes 0.'],
        ['Error: infinite recursion', 'a.slice(1) shrinks the array every call, so the base case (empty) is reached.'],
      ], {
        hint: 'Each call adds a[0] to the sum of the rest.',
        code: 'function sum(a) {\n  if (a.length === 0) return 0;\n  return a[0] + sum(a.slice(1));\n}',
      }),
    ],
  },
  {
    id: 'rec-3', topic: 'recursion', kind: 'boss', title: 'BREACH: INFINITE DESCENT',
    brief: 'SECTOR BOSS — a recursive process has run away, chewing the call stack alive. Read the descent, predict the unwinding, and survive backtracking.',
    intel: [
      'Digit tricks: n % 10 peels the last digit; floor(n/10) removes it.',
      'Stack depth is limited (~10⁴ frames) — deep recursion overflows.',
      'Backtracking = choose, recurse, unchoose. Explore every branch safely.',
    ],
    challenges: [
      mc('hard', 'What does f(1234) return?', [
        ['10', 'Correct. 1234%10=4, then 3, 2, 1 as the number shrinks: 4+3+2+1 = 10.', true],
        ['1234', 'Each call strips one digit and adds it — digits are summed, not preserved.'],
        ['4', 'Only the first digit-peel. The recursion continues on floor(1234/10)=123.'],
        ['24', 'That would multiply the digits. The code ADDS n%10 at each level.'],
      ], {
        hint: 'Sum of the digits of 1234.',
        code: 'function f(n) {\n  if (n === 0) return 0;\n  return (n % 10) + f(Math.floor(n / 10));\n}',
      }),
      mc('hard', 'A "stack overflow" from recursion means:', [
        ['The recursion never reached a base case (or went too deep), exhausting call-stack memory', 'Correct. Every pending call holds a stack frame; too many frames and the runtime kills the process.', true],
        ['The heap ran out of objects', 'Heap exhaustion is a different failure; recursion depth burns the CALL stack.'],
        ['A local variable grew too large', 'Frame COUNT, not variable size, overflows the stack.'],
        ['Two functions called each other by mistake', 'Mutual recursion is legal — and terminates fine if it progresses to a base case.'],
      ], { hint: 'Where do unfinished function calls wait?' }),
      order('hard', 'Backtracking template (e.g. placing queens row by row). Order one step.', [
        'Make a choice from the available options',
        'Recurse to explore the consequences of that choice',
        'Undo the choice, restoring the previous state',
        'Move on to the next option and repeat',
      ], 'Choose → explore → unchoose. Undoing restores the shared state so the next option starts clean — the loop tries every branch exactly once.', { hint: 'What must happen before trying the NEXT option?' }),
    ],
  },

  // ───────────── 08 TREES ─────────────
  {
    id: 'tre-1', topic: 'trees', kind: 'standard', title: 'THE HIERARCHY',
    brief: 'Past the Fields rises the Hierarchy — one root, branching downward, no cycles allowed. Everything above a node is its ancestry.',
    intel: [
      'A tree: one root, each node has children, NO cycles.',
      'Height = longest root-to-leaf path. A leaf has no children.',
      'A tree with n nodes always has exactly n−1 edges.',
    ],
    challenges: [
      mc('easy', 'In a tree, a LEAF is:', [
        ['A node with no children', 'Correct. Leaves are the endpoints of every root-to-leaf path.', true],
        ['The topmost node', 'That is the ROOT. Leaves are at the bottom fringe.'],
        ['A node with exactly one child', 'One child makes it an internal node; leaves have zero.'],
        ['Any node on the lowest level', 'Most leaves sit low, but a node high up with no children is also a leaf.'],
      ], { hint: 'Think of where a path ends.' }),
      order('easy', 'PREORDER traversal of a tree. Order the visit logic for a node.', [
        'Visit the node itself',
        'Recurse into the left subtree',
        'Recurse into the right subtree',
      ], 'Preorder = root BEFORE children. Memorize the trio: pre (root first), in (root between), post (root last).', { hint: 'The name says when the root is visited.' }),
      mc('easy', 'A tree has 10 nodes. How many EDGES does it have?', [
        ['9', 'Correct. Every node except the root has exactly one parent edge: n−1 = 9.', true],
        ['10', 'The root has no incoming edge, so edges are one fewer than nodes.'],
        ['11', 'An extra edge would create a cycle — and a cycle means it is no longer a tree.'],
        ['Depends on the shape', 'Shape changes the height, never the edge count: always n−1.'],
      ], { hint: 'Each node except one has exactly one parent.' }),
    ],
  },
  {
    id: 'tre-2', topic: 'trees', kind: 'standard', title: 'THREE WAYS DOWN',
    brief: 'The Hierarchy reveals its secrets in three orders — preorder, inorder, postorder — and one wave: level by level.',
    intel: [
      'Inorder: left, root, right. Preorder: root first. Postorder: root last.',
      'Level-order (BFS) visits a whole depth before going deeper — with a queue.',
      'The same tree reads completely differently under each order.',
    ],
    challenges: [
      mc('med', 'Tree: root 2, left child 1, right child 3. INORDER traversal gives:', [
        ['1, 2, 3', 'Correct. Left subtree (1), then root (2), then right (3) — inorder.', true],
        ['2, 1, 3', 'That is PREORDER: root first, then children.'],
        ['1, 3, 2', 'That is POSTORDER: children first, root last.'],
        ['2, 3, 1', 'Root-first AND right-before-left matches no standard traversal.'],
      ], { hint: 'INorder = root IN the middle.' }),
      mc('med', 'Which traversal uses a QUEUE?', [
        ['Level-order (BFS)', 'Correct. Enqueue the root; each dequeued node enqueues its children — level by level, oldest first.', true],
        ['Preorder (DFS)', 'Depth-first orders dive with a stack (or recursion), not a queue.'],
        ['Inorder (DFS)', 'Inorder is depth-first — recursion/stack.'],
        ['Postorder (DFS)', 'Postorder is also depth-first. Only level-order needs FIFO.'],
      ], { hint: 'Which one must serve nodes in arrival order?' }),
      mc('med', 'Tree: 4 has children 2 and 6; 2 has child 1. What does POSTORDER print?', [
        ['1, 2, 6, 4', 'Correct. Fully finish each subtree before the root: left (2→with 1), right (6), then 4.', true],
        ['4, 2, 1, 6', 'That is PREORDER (root first).'],
        ['1, 2, 4, 6', 'That is INORDER on this tree.'],
        ['4, 6, 2, 1', 'Root appears last in postorder — it can never lead.'],
      ], { hint: 'POSTorder = root goes POST (after) its children.' }),
    ],
  },
  {
    id: 'tre-3', topic: 'trees', kind: 'boss', title: 'BREACH: THE SKEWED SPIRE',
    brief: 'SECTOR BOSS — part of the Hierarchy has collapsed into a leaning spire. Height determines everything: balance it or watch O(log n) rot into O(n).',
    intel: [
      'Height of a node = 1 + max(height of children); a null child is −1 or 0 by convention.',
      'A balanced tree on n nodes has height ≈ log₂ n.',
      'A degenerate (fully skewed) tree is a linked list in disguise: height n.',
    ],
    challenges: [
      mc('hard', 'Height (edges, root-to-leaf longest path) of: root A with child B, B with child C, C with child D?', [
        ['3', 'Correct. A→B→C→D crosses 3 edges. Four nodes in a chain: height 3, and it is fully skewed.', true],
        ['4', 'That counts NODES on the path. Height in edges is nodes−1.'],
        ['2', 'log₂(4) = 2 would be the height if BALANCED. This chain is maximally unbalanced.'],
        ['1', 'Each descent adds an edge: A→B is 1, B→C another, C→D a third.'],
      ], { hint: 'Count edges, not nodes.' }),
      mc('hard', 'Why does a DEGENERATE tree (every node has one child) destroy tree performance?', [
        ['It becomes a linked list: height n, so search/insert degrade from O(log n) to O(n)', 'Correct. Every tree guarantee rests on height ≈ log n. Skew erases it — this is why self-balancing trees (AVL, red-black) exist.', true],
        ['It uses twice the memory', 'Same nodes, same edges — memory is unchanged. Height is the casualty.'],
        ['Traversal orders stop working', 'Traversals still work; they just walk a long chain.'],
        ['The tree gains a cycle', 'A chain has no cycle — it is still a tree, just a useless one.'],
      ], { hint: 'What is the height of a chain of n nodes?' }),
      order('hard', 'Evaluate an expression tree where leaves are numbers and internal nodes are operators. Order the evaluation.', [
        'Recursively evaluate the left subtree',
        'Recursively evaluate the right subtree',
        'Apply this node\'s operator to the two results',
        'Return the value upward',
      ], 'Expression evaluation is POSTORDER: both operands must be known before the operator applies. The recursion bottoms out at number leaves.', { hint: 'An operator cannot fire before its operands exist.' }),
    ],
  },

  // ───────────── 09 BINARY SEARCH TREES ─────────────
  {
    id: 'bst-1', topic: 'bst', kind: 'standard', title: 'ORDERED HIERARCHY',
    brief: 'This wing of the Hierarchy follows iron law: everything left of a node is smaller, everything right is larger. Order is power.',
    intel: [
      'BST invariant: left subtree < node < right subtree (recursively).',
      'Search discards half the remaining tree at each step — like binary search.',
      'Insert follows the search path down to an empty slot.',
    ],
    challenges: [
      mc('easy', 'The BST property states that for every node:', [
        ['All values in its left subtree are smaller, and all in its right subtree are larger', 'Correct. And it holds RECURSIVELY for every subtree — that is what makes search work.', true],
        ['Its left child is smaller and right child larger — only the direct children matter', 'Checking only children is the classic bug: a node deep in the left subtree can still violate the grandparent\'s bound.'],
        ['Left and right subtrees have equal height', 'That is an AVL balance rule, not the BST property.'],
        ['Smaller values sit closer to the root', 'Depth has nothing to do with value order in a BST.'],
      ], { hint: 'Does the rule stop at the immediate children?' }),
      order('easy', 'Insert value X into a BST. Order the descent.', [
        'Start at the root',
        'If X is smaller go left, if larger go right',
        'Repeat until you reach an empty slot',
        'Attach X as a new leaf at that slot',
      ], 'Insert = a failed search. The empty slot where the search dies is exactly where X belongs — preserving the invariant.', { hint: 'Search for X; insert where the search falls off.' }),
      mc('easy', 'BST: root 8, left 3, right 10. Searching for 6 goes:', [
        ['8 → 3 → right (empty): not present', 'Correct. 6 < 8 so left; 6 > 3 so right; 3 has no right child — 6 is absent.', true],
        ['8 → 10 → left: not present', '6 < 8, so the search must go LEFT at the root — 10\'s subtree can never hold 6.'],
        ['8 → 3 → found at 3', '3 ≠ 6, and the comparison continues right from 3 into emptiness.'],
        ['8 → 10 → 3: found', 'BST search never visits both subtrees — each comparison picks ONE side.'],
      ], { hint: 'At each node ask: smaller or larger?' }),
    ],
  },
  {
    id: 'bst-2', topic: 'bst', kind: 'standard', title: 'SORTED SECRETS',
    brief: 'Walk the Ordered Hierarchy in the right order and it reads out every value already sorted. The tree was hiding a sorted array all along.',
    intel: [
      'INORDER traversal of a BST visits values in ascending order.',
      'Minimum = leftmost node; maximum = rightmost.',
      'Insertion order shapes the tree: sorted input builds a chain.',
    ],
    challenges: [
      mc('med', 'Which traversal prints a BST\'s values in ascending sorted order?', [
        ['Inorder (left, root, right)', 'Correct. Left subtree (all smaller), then node, then right (all larger) — recursion yields full sorted order.', true],
        ['Preorder (root, left, right)', 'Preorder leads with the root — the root is rarely the smallest value.'],
        ['Postorder (left, right, root)', 'Postorder ends with the root — again breaking sorted output.'],
        ['Level-order', 'Level-order groups by depth, not by value.'],
      ], { hint: 'Where must the root appear relative to smaller and larger values?' }),
      mc('med', 'Insert 1, 2, 3, 4, 5 (in that order) into an empty BST. The result is:', [
        ['A right-leaning chain of height 4 — every insert goes right', 'Correct. Each new value is larger than all before it, so it becomes the rightmost node. Search is now O(n): the BST degenerated.', true],
        ['A balanced tree of height 2', 'Balance requires rebalancing logic (AVL/red-black). A plain BST never rearranges existing nodes.'],
        ['A left-leaning chain', 'Each value is LARGER than the last, so every descent goes right, not left.'],
        ['A tree with 5 at the root', 'The first insert becomes the root: 1 sits on top forever.'],
      ], { hint: 'Where does each new (largest-so-far) value land?' }),
      mc('med', 'How do you find the MINIMUM value in a BST?', [
        ['Follow left children until a node has no left child', 'Correct. Smaller is always left, so the leftmost node is the global minimum — O(height).', true],
        ['Follow right children to the end', 'That finds the MAXIMUM.'],
        ['Check every leaf', 'Unnecessary — the invariant points a straight path to the min.'],
        ['It is always the root', 'The root is only the min if it has no left subtree at all.'],
      ], { hint: 'Which direction are the smaller values?' }),
    ],
  },
  {
    id: 'bst-3', topic: 'bst', kind: 'boss', title: 'BREACH: THE FALSE TREE',
    brief: 'SECTOR BOSS — a tree claims to be ordered, but a saboteur hid violations deep in the subtrees. Only rigorous bounds expose the lie.',
    intel: [
      'Validating a BST needs a (min, max) range passed down, not child checks.',
      'Deleting a node with two children: replace with its inorder successor.',
      'The inorder successor of a node = minimum of its right subtree.',
    ],
    challenges: [
      mc('hard', 'Why is "every node: left < node < right" (checking only direct children) NOT enough to validate a BST?', [
        ['A node deep in the left subtree can exceed an ancestor\'s bound without violating its own parent', 'Correct. Example: root 10, left child 5, and 5\'s RIGHT child 12 — locally fine, but 12 > 10 breaks the BST. Validation must pass a (min,max) window down the recursion.', true],
        ['Because duplicate values exist', 'Duplicates are a separate policy question, not the flaw in child-checking.'],
        ['Because the tree might be unbalanced', 'Balance affects performance, not validity. A skewed tree can be a perfectly valid BST.'],
        ['Because children can be null', 'Null children are normal; they simply impose no constraint.'],
      ], { hint: 'Can a value be valid vs its parent but invalid vs its grandparent?' }),
      order('hard', 'Delete node X that has TWO children. Order the standard algorithm.', [
        'Find X\'s inorder successor: the minimum node in X\'s right subtree',
        'Copy the successor\'s value into X\'s position',
        'Recursively delete the successor node (which has at most one child)',
      ], 'The successor is the smallest value larger than X, so swapping it in preserves the BST invariant — and being the minimum of a subtree, it has no left child, making its own deletion trivial.', { hint: 'Which value can take X\'s place without breaking the order?' }),
      mc('hard', 'Insert order [5, 3, 8, 1, 4] into an empty BST. What does INORDER traversal print?', [
        ['1, 3, 4, 5, 8', 'Correct. Whatever the insertion order or shape, inorder on a valid BST always emits ascending order.', true],
        ['5, 3, 1, 4, 8', 'That is PREORDER (root 5 first). Inorder is shape-independent and sorted.'],
        ['1, 4, 3, 8, 5', 'That is POSTORDER on this tree.'],
        ['Depends on the tree\'s shape', 'Shape changes pre/post/level order — but inorder is ALWAYS sorted on a BST.'],
      ], { hint: 'Inorder output depends on the VALUES, not the shape.' }),
    ],
  },
];

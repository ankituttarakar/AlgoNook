// Sectors 04–06: Stacks, Queues, Hashing
import { mc, order, mach } from './helpers.js';

export default [
  // ───────────── 04 STACKS ─────────────
  {
    id: 'stk-1', topic: 'stacks', kind: 'standard', title: 'PUSH IT DOWN',
    brief: 'You found the Recycler — a machine that only remembers the last thing fed to it. Learn its discipline: Last In, First Out.',
    intel: [
      'A stack exposes two moves: push (add on top) and pop (remove the top).',
      'Whatever went in LAST comes out FIRST — order is reversed.',
      'Your own code runs on one: the call stack.',
    ],
    challenges: [
      mach('easy', 'stack', [1, 2, 3], [3, 2, 1],
        'Push 1, 2, 3 (stack bottom→top: 1,2,3), then pop three times: 3, 2, 1. A stack fully reversed the input — that is LIFO.',
        { hint: 'Load everything, then unload.' }),
      mc('easy', 'Which real system behaves like a stack?', [
        ['The browser\'s back-button history', 'Correct. The last page visited is the first you return to — LIFO.', true],
        ['A supermarket checkout line', 'That is first-come-first-served — a QUEUE, not a stack.'],
        ['A print spooler processing jobs in submission order', 'Submission order = FIFO = queue. A stack would print the newest job first.'],
        ['A round-robin CPU scheduler', 'Round-robin cycles in arrival order — queue behavior.'],
      ], { hint: 'Which one undoes the MOST RECENT action first?' }),
      mc('easy', 'What is on TOP of the stack at the end?', [
        ['9', 'Correct. Push 5, push 7, pop removes 7, push 9 → top is 9.', true],
        ['7', 'The pop() removed 7 before 9 was pushed.'],
        ['5', '5 is at the BOTTOM. After the pop and the final push, 9 sits above it.'],
        ['Empty', 'Two pushes survive: 5 and 9 remain on the stack.'],
      ], {
        hint: 'Trace it: [5] → [5,7] → [5] → [5,9].',
        code: 'const s = [];\ns.push(5);\ns.push(7);\ns.pop();\ns.push(9);',
      }),
    ],
  },
  {
    id: 'stk-2', topic: 'stacks', kind: 'standard', title: 'BALANCED SIGNALS',
    brief: 'Corrupted brackets are crashing the parser. A stack is the only tool that can match every opener with its closer.',
    intel: [
      'Push every opening bracket; every closer must match the top of stack.',
      'A closer on an empty stack, or leftovers at the end, means invalid.',
      'Interleaving pushes and pops lets stacks reorder sequences.',
    ],
    challenges: [
      order('med', 'Validate a bracket string with a stack. Order the scan logic.', [
        'Read the next character',
        'If it is an opener, push it',
        'If it is a closer, fail if the stack is empty, else pop and check the pair matches',
        'At the end, the string is valid only if the stack is empty',
      ], 'The stack remembers the most recent unmatched opener — exactly what a closer must match. Empty stack at the end = nothing left dangling.', { hint: 'Openers wait on the stack for their closer.' }),
      mach('med', 'stack', [1, 2, 3], [2, 1, 3],
        'Push 1, push 2, pop→2, pop→1, push 3, pop→3. Interleaving push/pop is what lets a stack emit 2 before 1.',
        { hint: 'You need 2 out before 1 — so 1 must enter and wait.' }),
      mc('med', 'What does out become?', [
        ["'ba'", 'Correct. Pushed a then b; pops come off in reverse: b first, then a.', true],
        ["'ab'", 'That would be queue (FIFO) behavior. Stacks reverse the order.'],
        ["'b'", 'The while loop runs until the stack is EMPTY — both characters are popped.'],
        ['Error', 'push/pop on an array is perfectly valid stack usage in JS.'],
      ], {
        hint: 'Stack order: a goes in first, b on top.',
        code: 'const s = [];\nfor (const c of "ab") s.push(c);\nlet out = "";\nwhile (s.length) out += s.pop();',
      }),
    ],
  },
  {
    id: 'stk-3', topic: 'stacks', kind: 'boss', title: 'BREACH: THE UNDO PROTOCOL',
    brief: 'SECTOR BOSS — the machine demands an exact output sequence, and the calculator speaks only postfix. No room for wasted moves.',
    intel: [
      'Not every permutation is stack-reachable — plan which items must wait.',
      'A second "minimums" stack gives O(1) getMin without rescanning.',
      'Postfix evaluation: numbers push, operators pop two and push the result.',
    ],
    challenges: [
      mach('hard', 'stack', [1, 2, 3, 4], [2, 4, 3, 1],
        'Push 1, push 2, pop→2; push 3, push 4, pop→4, pop→3; finally pop→1. Item 1 waited at the bottom the whole time — LIFO made it last.',
        { hint: '2 must leave first, so 1 goes in and stays buried until the end.' }),
      mc('hard', 'How does a MinStack return the minimum in O(1)?', [
        ['Keep a second stack holding the minimum at each depth', 'Correct. Each push records the min-so-far; pops unwind it. Constant time, O(n) extra space.', true],
        ['Scan the whole stack on every getMin call', 'That is O(n) per query — the entire point of the design is avoiding the scan.'],
        ['Keep the stack sorted at all times', 'Sorting destroys LIFO order; a stack cannot stay both sorted and a stack.'],
        ['Store one global minimum variable', 'One variable cannot recover the previous minimum after it is popped. The stack of minimums can.'],
      ], { hint: 'What happens to the old minimum when the current one is popped?' }),
      mc('hard', 'Evaluate the postfix expression: 2 3 * 4 +', [
        ['10', 'Correct. 2,3 push; * pops 3 and 2 → 6; 4 pushes; + pops 4 and 6 → 10.', true],
        ['24', 'That reads it as 2×3×4. Postfix evaluates strictly left to right with the stack.'],
        ['9', 'You likely did 2×3 first then... check: after * the stack holds [6], then 4 pushes, then + gives 10.'],
        ['14', 'Watch operator order: * applies to 2 and 3 before 4 ever enters.'],
      ], {
        hint: 'Stack: [2,3] → [6] → [6,4] → [10].',
        code: '// tokens: 2  3  *  4  +\n// push numbers; on operator,\n// pop b, pop a, push a OP b',
      }),
    ],
  },

  // ───────────── 05 QUEUES ─────────────
  {
    id: 'que-1', topic: 'queues', kind: 'standard', title: 'LINE FORMS HERE',
    brief: 'The Dispatch Core processes signals strictly in arrival order. No cutting the line: First In, First Out.',
    intel: [
      'A queue enqueues at the rear and dequeues from the front.',
      'Order is preserved: what arrives first leaves first.',
      'Fairness is the point — schedulers, buffers, and BFS all rely on it.',
    ],
    challenges: [
      mc('easy', 'Enqueue 1, 2, 3 into an empty queue. What does the first dequeue return?', [
        ['1', 'Correct. FIFO: the first element enqueued is the first dequeued.', true],
        ['3', 'That is stack (LIFO) behavior. A queue preserves arrival order.'],
        ['2', 'Dequeue always takes the FRONT — the oldest element, which is 1.'],
        ['Whichever is smallest', 'Queues do not compare values — that would be a priority queue.'],
      ], { hint: 'Which element has been waiting the longest?' }),
      mach('easy', 'queue', [7, 8, 9], [7, 8, 9],
        'Enqueue and dequeue in any rhythm — a queue always emits 7, 8, 9. Order is never reversed; that is the whole difference from a stack.',
        { hint: 'With a queue, the output order is fixed. Just move the items through.' }),
      mc('easy', 'q = []. push(5); push(3); shift(); push(8); shift() — what does the second shift() return?', [
        ['3', 'Correct. First shift removed 5 (oldest), leaving [3]; push 8 → [3,8]; next shift takes 3.', true],
        ['5', '5 left on the FIRST shift — queues serve oldest first.'],
        ['8', '8 was enqueued last, so it is served last. It is still waiting.'],
        ['undefined', 'The queue still holds [3, 8] at the second shift — plenty to serve.'],
      ], { hint: 'push = enqueue at rear, shift = dequeue from front.' }),
    ],
  },
  {
    id: 'que-2', topic: 'queues', kind: 'standard', title: 'ROUND ROBIN',
    brief: 'The Core schedules a million tasks without starving a single one. Ring buffers and two-stack tricks keep the line moving in O(1).',
    intel: [
      'BFS explores level by level BECAUSE a queue serves oldest first.',
      'Two stacks simulate a queue: pour inbox into outbox to reverse order.',
      'A ring buffer wraps front/rear indices with modulo — no shifting.',
    ],
    challenges: [
      mc('med', 'Why does breadth-first search use a queue instead of a stack?', [
        ['The queue serves nodes in arrival order, so all of level k is processed before level k+1', 'Correct. Oldest-first guarantees the wavefront expands evenly — the definition of BFS.', true],
        ['Queues use less memory than stacks', 'Both hold the same frontier; memory is not the reason.'],
        ['Stacks cannot store graph nodes', 'Stacks store anything — and DFS literally uses one. Order of service is the issue.'],
        ['Queues are faster per operation', 'Both are O(1) per op. The traversal ORDER is what differs.'],
      ], { hint: 'What happens to level order if the newest node is served first?' }),
      mc('med', 'A queue built from two stacks (inbox, outbox) dequeues by:', [
        ['If outbox is empty, pour ALL of inbox into outbox, then pop outbox', 'Correct. Pouring reverses order once; pops then come out FIFO. Amortized O(1) — each element moves twice in its life.', true],
        ['Popping inbox directly', 'Inbox pops give LIFO order — that is just a stack, not a queue.'],
        ['Sorting both stacks first', 'Sorting would destroy arrival order entirely.'],
        ['Pushing everything back into inbox each time', 'Re-pouring every operation makes it O(n) per dequeue; the trick is pouring only when outbox is empty.'],
      ], { hint: 'Each element should cross between stacks only once in its lifetime.' }),
      order('med', 'Enqueue X into a circular (ring) buffer. Order the steps.', [
        'Check the buffer is not full',
        'Write X at the rear index',
        'Set rear = (rear + 1) % capacity',
        'Increment the size counter',
      ], 'Modulo wraps the rear pointer back to slot 0, so the array never shifts. Enqueue and dequeue stay O(1) forever.', { hint: 'Write first, then wrap the pointer.' }),
    ],
  },
  {
    id: 'que-3', topic: 'queues', kind: 'boss', title: 'BREACH: PRIORITY OVERRIDE',
    brief: 'SECTOR BOSS — the Core\'s naive array queue is buckling under load, and a sliding-window alarm needs a monotonic queue to survive.',
    intel: [
      'Array.shift() is O(n): every remaining element slides one slot left.',
      'Real queues track a head index (or ring) — dequeue without moving memory.',
      'A monotonic deque keeps window candidates in decreasing order: max in O(1).',
    ],
    challenges: [
      mc('hard', 'Why is using array.shift() as a queue dequeue a performance trap in JavaScript?', [
        ['Every shift moves all remaining elements one slot left — O(n) per dequeue', 'Correct. n dequeues cost O(n²) total. A head pointer or ring buffer makes it O(1).', true],
        ['shift() reallocates the entire array', 'Usually no reallocation happens; the cost is the element copy, not allocation.'],
        ['shift() only works on sorted arrays', 'shift works on any array — the problem is its hidden linear cost.'],
        ['Arrays cannot be used as queues at all', 'They can, and for small data it is fine. The trap appears at scale.'],
      ], { hint: 'Think about what happens to memory after index 0 is removed.' }),
      mc('hard', 'Sliding-window maximum: how does a MONOTONIC queue keep each window\'s max in O(1) amortized?', [
        ['It stores indices in decreasing value order and discards elements that can never be max again', 'Correct. A new element evicts all smaller predecessors (they lose forever), and expired indices drop off the front. Each element enters and leaves once: O(n) total.', true],
        ['It re-sorts the window on every slide', 'Sorting per window is O(k log k) — exactly what the technique avoids.'],
        ['It keeps a second copy of the whole array', 'Copies do not help find a max faster; structure and eviction rules do.'],
        ['It binary-searches the window', 'The window is unsorted, so binary search has nothing to stand on.'],
      ], { hint: 'If a bigger, newer element arrives, can an older smaller one ever win again?' }),
      mc('hard', 'What does s become?', [
        ['123', 'Correct. Dequeues come out FIFO: 1, then 2, then 3 — building s = 1 → 12 → 123.', true],
        ['321', 'That would be LIFO (stack) order. shift() takes the FRONT.'],
        ['6', 's accumulates digits (s*10 + x), it does not sum them.'],
        ['132', 'FIFO order is exactly 1, 2, 3 — no reordering happens.'],
      ], {
        hint: 's = s*10 + digit builds a number from the dequeue order.',
        code: 'const q = [1, 2, 3];\nlet s = 0;\nwhile (q.length) {\n  s = s * 10 + q.shift();\n}',
      }),
    ],
  },

  // ───────────── 06 HASHING ─────────────
  {
    id: 'hsh-1', topic: 'hashing', kind: 'standard', title: 'THE INSTANT LOOKUP',
    brief: 'The Index Vault answers any name in a single step. Its secret: a hash function that turns keys into addresses.',
    intel: [
      'A hash function maps any key to a slot index.',
      'Average lookup/insert: O(1) — no scanning, no comparisons chain.',
      'When two keys land on the same slot: collision. Plan for it.',
    ],
    challenges: [
      mc('easy', 'A hash table finds a value in O(1) on average because:', [
        ['The hash function computes the slot directly from the key', 'Correct. Key → hash → index → read. No searching through other entries.', true],
        ['It keeps all keys sorted', 'Hash tables are unordered by design; sorting would give O(log n) lookup, not O(1).'],
        ['It stores data in a balanced tree', 'That describes a tree map. Hash tables trade ordering for direct addressing.'],
        ['It caches recent lookups', 'Caching helps repeats; the O(1) comes from computing the address, not remembering it.'],
      ], { hint: 'No traversal happens at all — how is the slot found?' }),
      mc('easy', 'A COLLISION is when:', [
        ['Two different keys hash to the same slot', 'Correct. The table must resolve it — by chaining (lists per slot) or probing (open addressing).', true],
        ['A key hashes outside the array', 'The modulo keeps indices in range; out-of-range is not a collision.'],
        ['The table runs out of memory', 'Fullness raises collision RATE but is not itself a collision.'],
        ['Two keys have equal values', 'Values are irrelevant to placement; only keys are hashed.'],
      ], { hint: 'More keys than slots — what must eventually happen?' }),
      mc('easy', 'Using hash(s) = s.length % 5 — what is hash("bound")?', [
        ['0', 'Correct. "bound".length = 5, and 5 % 5 = 0.', true],
        ['1', 'The remainder of 5 divided by 5 is 0, not 1.'],
        ['5', 'Indices run 0–4 after % 5 — 5 is never a valid result.'],
        ['4', 'That would be hash("byte") (length 4). "bound" has length 5.'],
      ], { hint: 'Count the characters, then take modulo 5.' }),
    ],
  },
  {
    id: 'hsh-2', topic: 'hashing', kind: 'standard', title: 'SEEN BEFORE',
    brief: 'Duplicate signals jam the Vault. A hash set remembers everything you have seen — answer "have we met?" in one step.',
    intel: [
      'Two-sum in one pass: for x, check if target−x is already in the set.',
      'Chaining: each slot holds a small list of colliding entries.',
      'Group anagrams by a canonical key — e.g. the sorted letters.',
    ],
    challenges: [
      mc('med', 'Two-sum, one pass with a hash set: when processing element x, you check the set for:', [
        ['target − x', 'Correct. If the complement was seen earlier, the pair is found — O(n) total instead of O(n²).', true],
        ['x itself', 'Finding x tells you nothing about a partner; you need the complement.'],
        ['target + x', 'The pair must SUM to target: partner = target − x.'],
        ['The largest element seen so far', 'Maximums are irrelevant — only exact complements complete a pair.'],
      ], { hint: 'What partner would complete the sum?' }),
      mc('med', 'In CHAINING, each hash-table slot holds:', [
        ['A small list of every entry whose key hashed to that slot', 'Correct. Collisions share a slot via a linked list; lookup scans only that list.', true],
        ['The next free slot index', 'That is open addressing with probing — a different strategy.'],
        ['A backup hash function', 'Secondary hashes belong to double hashing, not chaining.'],
        ['Nothing — collisions are forbidden', 'Collisions are unavoidable (pigeonhole); chaining embraces them.'],
      ], { hint: 'Two keys, one slot — where does the second entry live?' }),
      order('med', 'Group anagrams from a word list using a hash map. Order the pipeline.', [
        'For each word, sort its letters to build a canonical key',
        'Look the key up in the map, creating an empty group if absent',
        'Append the original word to that group',
        'Return all groups collected in the map',
      ], 'Sorted letters are identical for anagrams ("eat"→"aet", "tea"→"aet"), so the map key clusters them automatically — O(n·k log k) total.', { hint: 'What string is shared by every anagram in a group?' }),
    ],
  },
  {
    id: 'hsh-3', topic: 'hashing', kind: 'boss', title: 'BREACH: VAULT OVERLOAD',
    brief: 'SECTOR BOSS — too many keys, too few slots. The Vault\'s chains are lengthening. Understand load factor, or lookup slows to a crawl.',
    intel: [
      'Load factor = entries / slots. Past ~0.7, tables grow and rehash.',
      'Rehashing: allocate a bigger table, re-insert EVERY key.',
      'Worst case (all keys in one slot) degrades lookup to O(n).',
    ],
    challenges: [
      mc('hard', 'Why does a hash table REHASH when its load factor gets high?', [
        ['More entries per slot lengthen collision chains, eroding the O(1) guarantee', 'Correct. Doubling the slots and re-inserting all keys shortens chains again — amortized O(1) per insert.', true],
        ['The hash function stops working at high load', 'The function is fine; the TABLE gets crowded.'],
        ['Rehashing sorts the keys for faster search', 'Hash tables never sort; rehashing redistributes keys across more slots.'],
        ['Old keys expire and must be refreshed', 'Keys do not expire. Growth is purely about chain length.'],
      ], { hint: 'What does O(1) on average depend on?' }),
      mc('hard', 'Scan "algonook" left→right tracking seen characters. What is the FIRST character that repeats?', [
        ["'o'", 'Correct. Positions: a(0), l(1), g(2), o(3), n(4), o(5) — the second \'o\' at index 5 is the first repeat.', true],
        ["'a'", "'a' appears only once in \"algonook\"."],
        ["'k'", "'k' appears only once at the end."],
        ["'n'", "'n' appears once. The set flags 'o' at index 5 first."],
      ], { hint: 'Add each char to a set; first one already inside wins.' }),
      mc('hard', 'What is the WORST-case lookup time in a hash table, and when does it happen?', [
        ['O(n) — when many keys collide into one slot and the chain must be scanned', 'Correct. A bad hash or adversarial keys can pile everything into one chain.', true],
        ['O(1) always — hashing is magic', 'O(1) is the AVERAGE. Nothing prevents catastrophic collision piles.'],
        ['O(log n) — like binary search', 'There is no ordering to binary-search; a degenerate table is a linked list.'],
        ['O(n log n)', 'Sorting costs do not apply here; a full collision scan is linear.'],
      ], { hint: 'Imagine every key hashing to slot 0.' }),
    ],
  },
];

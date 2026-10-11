// Guidebook-only additions for the chapters with existing lesson content.
// The definition and code examples remain sourced from concepts.js.
export const CORE_GUIDE_NOTES = {
  foundations: {
    whenNotToUse: ['Big-O compares growth, not exact wall-clock time for tiny inputs.', 'Do not optimize before correctness and input constraints are understood.'],
    coreOperations: ['Count loop iterations', 'Compare growth rates', 'Track auxiliary space', 'State assumptions and edge cases'],
    patterns: ['Brute force → optimize', 'Constraint-driven complexity', 'Invariant-first explanation'],
    commonMistakes: ['Dropping constants before identifying the dominant term.', 'Counting nested loops as additive when they multiply.', 'Ignoring recursion stack or auxiliary collections.'],
    interviewClues: ['Large n rules out quadratic work', 'Memory limits constrain state', 'Explain time and space separately'],
  },
  arrays: {
    whenNotToUse: ['Frequent middle insertions with large shifts favor a linked structure.', 'Membership-heavy tasks may need a set or map.', 'A sorted requirement must be explicit before using binary search.'],
    coreOperations: ['Index read/write O(1)', 'Unsorted search O(n)', 'Middle insert/delete O(n) shifts', 'Append amortized O(1) for dynamic arrays'],
    patterns: ['Traversal', 'In-place read/write pointers', 'Prefix sums', 'Sorting then scanning', 'Sliding window'],
    commonMistakes: ['Off-by-one bounds', 'Mutating while iterating without tracking write index', 'Using a range window when the answer is non-contiguous'],
    interviewClues: ['contiguous sequence', 'in-place', 'subarray / range', 'index distance'],
  },
  hashing: {
    whenNotToUse: ['Need stable sorted iteration or range queries.', 'Memory is tightly constrained and sorting is acceptable.', 'Worst-case guarantees matter and average-case hashing is insufficient.'],
    coreOperations: ['Insert key/value', 'Lookup membership/value', 'Update frequency', 'Delete key'],
    patterns: ['Seen set', 'Frequency map', 'Complement lookup', 'Group by canonical key'],
    commonMistakes: ['Check after inserting and match the current item with itself.', 'Assume iteration order is sorted.', 'Claim worst-case O(1) without qualification.'],
    interviewClues: ['seen before?', 'count occurrences', 'pair complement', 'group equivalent values'],
  },
  'two-pointers': {
    whenNotToUse: ['Input is unsorted and sorting would destroy required original-index semantics.', 'No invariant lets a pointer move eliminate candidates.', 'A non-contiguous selection is required.'],
    coreOperations: ['Compare endpoints', 'Advance left / retreat right', 'Maintain read/write boundary', 'Fast/slow traversal'],
    patterns: ['Opposite ends on sorted data', 'Same-direction read/write', 'Fast and slow runners', 'Partition'],
    commonMistakes: ['Move both pointers without proof.', 'Forget duplicate-skip rules in unique-output problems.', 'Assume a pointer movement is safe on unsorted input.'],
    interviewClues: ['sorted pair / triplet', 'palindrome', 'remove duplicates in place', 'cycle or middle node'],
  },
  'binary-search': {
    whenNotToUse: ['No ordering or monotonic predicate justifies eliminating half.', 'The data structure cannot access its midpoint efficiently.', 'A single linear scan is simpler and input size is small.'],
    coreOperations: ['Maintain inclusive or half-open bounds', 'Probe midpoint', 'Discard a proven half', 'Return boundary'],
    patterns: ['Exact search', 'First/last boundary', 'Rotated sorted array', 'Binary search on answer'],
    commonMistakes: ['Mix inclusive and half-open bounds.', 'Overflow in lo + hi midpoint calculation in fixed-width languages.', 'Skip the final one-element range.', 'Use a non-monotone feasibility predicate.'],
    interviewClues: ['sorted data', 'first/last occurrence', 'minimum feasible value', 'monotone yes/no check'],
  },
};

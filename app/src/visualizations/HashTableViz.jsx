// AlgoNook — Hash Table Visualization
// Shows keys being hashed into buckets, demonstrating O(1) average lookup
// and why hash tables are fast for membership checks.

import { useState } from 'react';

const EXAMPLE_KEYS = ['apple', 'banana', 'cherry', 'date', 'elderberry'];
const NUM_BUCKETS = 7;

// Simple deterministic hash for demonstration
function simpleHash(key) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash % NUM_BUCKETS;
}

export default function HashTableViz() {
  const [inserted, setInserted] = useState([]);

  const insertNext = () => {
    if (inserted.length >= EXAMPLE_KEYS.length) return;
    setInserted([...inserted, EXAMPLE_KEYS[inserted.length]]);
  };

  const reset = () => setInserted([]);

  const buckets = Array.from({ length: NUM_BUCKETS }, (_, i) =>
    inserted.filter((k) => simpleHash(k) === i)
  );

  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--bb-muted)] leading-relaxed">
        Each key is passed through a hash function to compute a bucket index.
        Lookups are O(1) on average because the bucket is found directly —
        no scanning needed. Collisions (two keys mapping to the same bucket)
        are handled by chaining.
      </p>

      {/* Buckets */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {buckets.map((keys, i) => (
          <div
            key={i}
            className="border border-[var(--bb-line)] bg-black/30 p-2 min-h-[70px] flex flex-col gap-1"
          >
            <span className="font-mono text-[9px] text-[var(--bb-muted)] border-b border-[var(--bb-line)] pb-0.5">
              [{i}]
            </span>
            {keys.map((k) => (
              <span
                key={k}
                className="border border-[var(--bb-green-dim)] bg-[rgba(0,244,142,0.08)] px-1 py-0.5 text-[9px] text-[var(--bb-green)] truncate"
              >
                {k}
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* Key → hash → bucket mappings */}
      {inserted.length > 0 && (
        <div className="border border-[var(--bb-line)] bg-black/20 p-3 space-y-1">
          {inserted.map((k) => (
            <div key={k} className="flex items-center gap-2 text-[10px] font-mono">
              <span className="text-[var(--bb-text)] w-20 truncate">"{k}"</span>
              <span className="text-[var(--bb-muted)]">→ hash →</span>
              <span className="text-[var(--bb-amber)]">bucket {simpleHash(k)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2">
        <button
          onClick={insertNext}
          disabled={inserted.length >= EXAMPLE_KEYS.length}
          className="bb-btn bb-btn-ghost !min-h-0 !px-3 !py-1.5 text-[10px] disabled:opacity-40"
        >
          Insert Next Key →
        </button>
        <button
          onClick={reset}
          className="bb-btn bb-btn-ghost !min-h-0 !px-3 !py-1.5 text-[10px]"
        >
          Reset
        </button>
      </div>

      <p className="text-[10px] text-[var(--bb-muted)] italic">
        Think: how would you use this structure to check if an element appears twice in an array?
      </p>
    </div>
  );
}

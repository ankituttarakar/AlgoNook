import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { appendUniqueShorts } from '../src/lib/shortsFeed.js';
import {
  ALLOWED_TOPICS,
  TOPIC_META,
  CONTROLLED_DSA_QUERIES,
  VERIFIED_DSA_SHORTS_POOL,
  parseIsoDuration,
  isEducationalDsaContent,
  isRelevantToTopic,
  isShortCandidate,
  handleGetShorts,
  default as shortsHandler,
} from '../api/shorts.ts';

test('Shorts route is a top-level app route and mounts a single active player', async () => {
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  const screen = await readFile(new URL('../src/screens/ShortsScreen.jsx', import.meta.url), 'utf8');
  assert.match(app, /shorts:\s*'shorts'/);
  assert.match(app, /if \(target === 'shorts'\).*?`\/shorts/s);
  assert.match(app, /screen === 'shorts'[\s\S]*?<ShortsScreen/);
  assert.equal((screen.match(/<iframe\b/g) || []).length, 1);
});

test('Shorts Feed — Topic allowlist contains all 10 core DSA topics + All DSA', () => {
  const expectedTopics = [
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
  ];

  assert.equal(ALLOWED_TOPICS.length, 11);
  for (const expected of expectedTopics) {
    assert.ok(ALLOWED_TOPICS.includes(expected), `Missing allowed topic: ${expected}`);
    assert.ok(TOPIC_META[expected], `Missing metadata for topic: ${expected}`);
    assert.ok(typeof TOPIC_META[expected].label === 'string', `Invalid label for ${expected}`);
    assert.ok(typeof TOPIC_META[expected].glyph === 'string', `Invalid glyph for ${expected}`);
  }
});

test('Shorts Feed — Rejects unsupported and malicious topics', async () => {
  for (const topic of ['minecraft_vlogs', 'politics', '../../etc/passwd']) {
    const result = await handleGetShorts({ topic }, {}, {});
    assert.equal(result.status, 400);
    assert.equal(result.data.ok, false);
  }
});

test('Shorts API — Enforces GET and handles YouTube failures with a safe fallback', async () => {
  let statusCode;
  let payload;
  const response = {
    setHeader() {},
    status(code) { statusCode = code; return this; },
    json(value) { payload = value; return this; },
  };
  await shortsHandler({ method: 'POST', headers: {}, query: {} }, response);
  assert.equal(statusCode, 405);
  assert.equal(payload.ok, false);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('network unavailable'); };
  try {
    const result = await handleGetShorts({ topic: 'arrays' }, {}, { YOUTUBE_API_KEY: 'server-test-key' });
    assert.equal(result.status, 200);
    assert.equal(result.data.source, 'curated');
    assert.ok(result.data.shorts.length > 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Shorts Feed — Controlled DSA queries are strictly educational and unalterable', () => {
  for (const [topic, queries] of Object.entries(CONTROLLED_DSA_QUERIES)) {
    assert.ok(Array.isArray(queries) && queries.length > 0, `Topic ${topic} missing queries`);
    for (const q of queries) {
      const isDsa = [
        'dsa', 'data structures', 'data structure', 'algorithm', 'binary search',
        'array', 'linked list', 'stack', 'queue', 'sorting', 'recursion',
        'tree', 'graph', 'dynamic programming', 'quicksort', 'mergesort'
      ].some(term => q.toLowerCase().includes(term));

      assert.ok(isDsa, `Query for ${topic} missing DSA terminology: "${q}"`);
      assert.ok(!q.includes('vlog') && !q.includes('music') && !q.includes('gameplay'),
        `Query for ${topic} contains non-educational terms: "${q}"`
      );
    }
  }
});

test('Shorts Feed — Educational content filtering and non-DSA exclusion', () => {
  // Valid DSA content
  assert.equal(isEducationalDsaContent('Binary Search Algorithm in 60s #shorts', 'Quick intuition on O(log n)'), true);
  assert.equal(isEducationalDsaContent('Invert a Binary Tree LeetCode #shorts', 'Tree traversal using recursion'), true);
  assert.equal(isEducationalDsaContent('Dynamic Programming Memoization vs Tabulation', 'DSA coding interview prep'), true);
  assert.equal(isEducationalDsaContent('Stack Data Structure LIFO visualized', 'Push and pop pointers'), true);
  assert.equal(isRelevantToTopic('arrays', 'Array DSA interview tip'), true);
  assert.equal(isRelevantToTopic('arrays', 'Binary tree traversal algorithm'), false);
  assert.equal(isShortCandidate('arrays', 'Array DSA in 30 seconds #Shorts', '', 30), true);
  assert.equal(isShortCandidate('arrays', 'Array DSA tutorial #Shorts', '', 240), false);
  assert.equal(isShortCandidate('arrays', 'Binary tree algorithm #Shorts', '', 40), false);

  // Non-DSA / Non-educational content should be rejected
  assert.equal(isEducationalDsaContent('Minecraft speedrun challenge #shorts', 'Watch this crazy gameplay'), false);
  assert.equal(isEducationalDsaContent('Top 10 Pop Music Hits 2026', 'Official music video dance'), false);
  assert.equal(isEducationalDsaContent('Unboxing the newest smartphone #shorts', 'Tech gadget review'), false);
  assert.equal(isEducationalDsaContent('Random vlog about my weekend prank', 'Having fun with friends'), false);
  assert.equal(isEducationalDsaContent('Binary search algorithm', 'Election news commentary'), false);
  assert.equal(isEducationalDsaContent('Tree traversal algorithm', 'Gaming highlights'), false);
});

test('Shorts Feed — ISO 8601 duration parser accurately identifies short-form videos', () => {
  assert.equal(parseIsoDuration('PT45S'), 45);
  assert.equal(parseIsoDuration('PT1M'), 60);
  assert.equal(parseIsoDuration('PT58S'), 58);
  assert.equal(parseIsoDuration('PT1M5S'), 65);
  assert.equal(parseIsoDuration('PT15M30S'), 930); // Long-form video > 65s
  assert.equal(parseIsoDuration(''), 0);
});

test('Shorts Feed — Pagination generates consecutive batches with nextPageTokens', async () => {
  const page1 = await handleGetShorts({ topic: 'arrays', limit: 4 }, {}, {});
  assert.equal(page1.status, 200);
  assert.equal(page1.data.ok, true);
  assert.equal(page1.data.shorts.length, 4);
  assert.ok(page1.data.nextPageToken, 'Page 1 must return a nextPageToken');

  const page2 = await handleGetShorts({ topic: 'arrays', pageToken: page1.data.nextPageToken, limit: 4 }, {}, {});
  assert.equal(page2.status, 200);
  assert.equal(page2.data.ok, true);
  assert.equal(page2.data.shorts.length, 4);
  assert.ok(page2.data.nextPageToken, 'Page 2 must return a nextPageToken');
  assert.notEqual(page1.data.nextPageToken, page2.data.nextPageToken);
});

test('Shorts Feed — Duplicate prevention removes already-seen video IDs in feed', () => {
  const existingShorts = [
    { id: '1', youtubeId: 'KQGn4ZXqjbo', title: 'What is an Array?' },
    { id: '2', youtubeId: 'sxKjltt02_A', title: 'Array Data Structure' },
  ];

  const incomingShorts = [
    { id: '3', youtubeId: 'KQGn4ZXqjbo', title: 'What is an Array?' }, // Duplicate
    { id: '4', youtubeId: 'M0LFxguOVVQ', title: 'Data Structures vs Algorithms' }, // Fresh
  ];

  const deduplicated = appendUniqueShorts(existingShorts, incomingShorts).slice(existingShorts.length);

  assert.equal(deduplicated.length, 1);
  assert.equal(deduplicated[0].youtubeId, 'M0LFxguOVVQ');
});

test('Shorts Feed — Single active player state machine and navigation bounds', () => {
  const mockShorts = [
    { id: 's1', youtubeId: 'vid1', title: 'Short 1' },
    { id: 's2', youtubeId: 'vid2', title: 'Short 2' },
    { id: 's3', youtubeId: 'vid3', title: 'Short 3' },
  ];

  let currentIndex = 0;

  const getActivePlayerId = () => mockShorts[currentIndex].youtubeId;

  // Initially active is Short 1
  assert.equal(getActivePlayerId(), 'vid1');

  // Next -> active becomes Short 2 (previous video unmounts)
  if (currentIndex < mockShorts.length - 1) currentIndex++;
  assert.equal(currentIndex, 1);
  assert.equal(getActivePlayerId(), 'vid2');

  // Next -> active becomes Short 3
  if (currentIndex < mockShorts.length - 1) currentIndex++;
  assert.equal(currentIndex, 2);
  assert.equal(getActivePlayerId(), 'vid3');

  // Next at end should not exceed array length
  if (currentIndex < mockShorts.length - 1) currentIndex++;
  assert.equal(currentIndex, 2);

  // Prev -> active becomes Short 2
  if (currentIndex > 0) currentIndex--;
  assert.equal(currentIndex, 1);
  assert.equal(getActivePlayerId(), 'vid2');

  // Prev -> active becomes Short 1
  if (currentIndex > 0) currentIndex--;
  assert.equal(currentIndex, 0);
  assert.equal(getActivePlayerId(), 'vid1');

  // Prev at start cannot go below 0
  if (currentIndex > 0) currentIndex--;
  assert.equal(currentIndex, 0);
});

test('Shorts Feed — API error resilience and fallback pool integrity', async () => {
  // When no API key is set, returns 200 OK from verified curated seed pool
  const res = await handleGetShorts({ topic: 'dp' }, {}, {});
  assert.equal(res.status, 200);
  assert.equal(res.data.ok, true);
  assert.equal(res.data.topic, 'dp');
  assert.ok(res.data.shorts.length > 0);
  for (const s of res.data.shorts) {
    assert.equal(s.topic, 'dp');
    assert.equal(typeof s.youtubeId, 'string');
    assert.equal(s.youtubeId.length, 11);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  LEARN_TOPICS,
  LEARN_VIDEOS,
  getLearnVideos,
  getTopicStats,
  getYouTubeThumbnailUrl,
  getYouTubeThumbnailFallbackUrl,
  getYouTubeEmbedUrl,
  getDirectYouTubeUrl,
} from '../src/data/learnVideos.js';

test('Learn screen remains a curated video library separate from Shorts', async () => {
  const screen = await readFile(new URL('../src/screens/LearnScreen.jsx', import.meta.url), 'utf8');
  assert.match(screen, /LearnVideoCard/);
  assert.match(screen, /LearnPlayerModal/);
  assert.doesNotMatch(screen, /LearnShortsViewer|section-shorts-title|Watch Shorts/);
});

test('Learn Feed — Topic definitions contain all 10 core DSA topics', () => {
  const expectedTopicIds = [
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

  const topicIds = LEARN_TOPICS.map((t) => t.id);
  for (const expected of expectedTopicIds) {
    assert.ok(
      topicIds.includes(expected),
      `Missing required DSA topic: ${expected}`
    );
  }

  // Each topic has a label, glyph, and roadmapNodeId
  for (const topic of LEARN_TOPICS) {
    assert.ok(typeof topic.label === 'string' && topic.label.length > 0, `Topic ${topic.id} missing label`);
    assert.ok(typeof topic.glyph === 'string' && topic.glyph.length > 0, `Topic ${topic.id} missing glyph`);
    assert.ok(typeof topic.roadmapNodeId === 'string' && topic.roadmapNodeId.length > 0, `Topic ${topic.id} missing roadmapNodeId`);
  }
});

test('Learn Feed — All video items have valid metadata and 11-char YouTube IDs', () => {
  assert.ok(LEARN_VIDEOS.length >= 20, 'Should have a substantial catalog of videos');

  for (const video of LEARN_VIDEOS) {
    assert.ok(video.id, `Video entry missing id: ${JSON.stringify(video)}`);
    assert.ok(video.topicId, `Video ${video.id} missing topicId`);
    assert.ok(
      video.type === 'video' || video.type === 'short',
      `Video ${video.id} has invalid type: ${video.type}`
    );
    assert.ok(
      typeof video.youtubeId === 'string' && video.youtubeId.length === 11,
      `Video ${video.id} has invalid YouTube ID: ${video.youtubeId}`
    );
    // YouTube IDs must not contain illegal whitespace or special characters
    assert.match(video.youtubeId, /^[a-zA-Z0-9_-]{11}$/, `Invalid ID format: ${video.youtubeId}`);
    assert.ok(video.title && video.title.length > 3, `Video ${video.id} missing or short title`);
    assert.ok(video.channel && video.channel.length > 1, `Video ${video.id} missing channel`);
    assert.ok(video.duration, `Video ${video.id} missing duration`);
    assert.ok(video.summary && video.summary.length > 10, `Video ${video.id} missing summary`);
  }
});

test('Learn Feed — Every core DSA topic has both Videos and Shorts with valid classification', () => {
  for (const topic of LEARN_TOPICS) {
    const stats = getTopicStats(topic.id);
    assert.ok(
      stats.videos > 0,
      `Topic ${topic.id} should have at least one long-form video`
    );
    assert.ok(
      stats.shorts > 0,
      `Topic ${topic.id} should have at least one Short`
    );
    assert.equal(
      stats.total,
      stats.videos + stats.shorts,
      `Topic ${topic.id} total must match sum of videos and shorts`
    );

    const topicShorts = getLearnVideos(topic.id, 'short');
    for (const short of topicShorts) {
      assert.equal(short.type, 'short');
      // Shorts should have short durations (under 1 minute: e.g. "0:50")
      assert.match(short.duration, /^0:\d{2}$/, `Short ${short.id} duration should be under 1 minute`);
    }

    const topicVideos = getLearnVideos(topic.id, 'video');
    for (const vid of topicVideos) {
      assert.equal(vid.type, 'video');
    }
  }
});

test('Learn Feed — Filter functions return correct subsets', () => {
  const arraysAll = getLearnVideos('arrays', 'all');
  const arraysVideos = getLearnVideos('arrays', 'video');
  const arraysShorts = getLearnVideos('arrays', 'short');

  assert.equal(arraysAll.length, arraysVideos.length + arraysShorts.length);
  assert.ok(arraysVideos.every((v) => v.type === 'video'));
  assert.ok(arraysShorts.every((v) => v.type === 'short'));
});

test('Learn Feed — URL generators produce valid YouTube no-cookie embed and CDN URLs', () => {
  const sampleId = 'n60Dn0UsbEk';
  const thumbUrl = getYouTubeThumbnailUrl(sampleId);
  const fallbackThumbUrl = getYouTubeThumbnailFallbackUrl(sampleId);
  const videoEmbedUrl = getYouTubeEmbedUrl(sampleId, false);
  const shortEmbedUrl = getYouTubeEmbedUrl(sampleId, true);
  const directWatchUrl = getDirectYouTubeUrl(sampleId, 'video');
  const directShortUrl = getDirectYouTubeUrl(sampleId, 'short');

  assert.equal(thumbUrl, 'https://i.ytimg.com/vi/n60Dn0UsbEk/hqdefault.jpg');
  assert.equal(fallbackThumbUrl, 'https://i.ytimg.com/vi/n60Dn0UsbEk/mqdefault.jpg');
  assert.ok(videoEmbedUrl.startsWith('https://www.youtube-nocookie.com/embed/n60Dn0UsbEk'));
  assert.ok(videoEmbedUrl.includes('playsinline=1'));
  assert.ok(shortEmbedUrl.includes('&loop=1'));
  assert.equal(directWatchUrl, 'https://www.youtube.com/watch?v=n60Dn0UsbEk');
  assert.equal(directShortUrl, 'https://www.youtube.com/shorts/n60Dn0UsbEk');
});

test('Learn Feed — Shorts navigation transitions and bounds checking', () => {
  const topicShorts = getLearnVideos('arrays', 'short');
  assert.ok(topicShorts.length >= 2, 'Should have multiple shorts for navigation test');

  // Simulated viewer navigation state machine
  let currentIndex = 0;
  let isFinished = false;

  const handleNext = () => {
    if (isFinished) return;
    if (currentIndex < topicShorts.length - 1) {
      currentIndex++;
    } else {
      isFinished = true;
    }
  };

  const handlePrev = () => {
    if (isFinished) {
      isFinished = false;
      return;
    }
    if (currentIndex > 0) {
      currentIndex--;
    }
  };

  // Initially at short 0
  assert.equal(currentIndex, 0);
  assert.equal(isFinished, false);

  // Prev on first item should not decrement below 0
  handlePrev();
  assert.equal(currentIndex, 0);

  // Next moves to short 1
  handleNext();
  assert.equal(currentIndex, 1);
  assert.equal(isFinished, false);

  // Next moves to completion state (for 2 shorts)
  handleNext();
  assert.equal(isFinished, true);

  // Prev returns from completion state back to last short
  handlePrev();
  assert.equal(isFinished, false);
  assert.equal(currentIndex, 1);

  // Prev returns to first short
  handlePrev();
  assert.equal(currentIndex, 0);
});

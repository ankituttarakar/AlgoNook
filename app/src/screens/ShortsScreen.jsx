// AlgoNook — ShortsScreen
// Dedicated infinite DSA-only vertical Shorts feed.
// Features:
// - Infinite pagination / lazy-loading batches from /api/shorts
// - Strict DSA-only topic filter bar (All DSA + 10 core DSA topics)
// - 9:16 vertical player with only ONE active iframe mounted at any time
// - Desktop wheel/trackpad vertical scrolling with debouncing
// - Mobile touch swipe navigation (swipe up = next, swipe down = prev)
// - Keyboard navigation: ArrowDown/Up, PageDown/Up, Space, Escape
// - Contextual "Practice [Topic] →" transition to AlgoNook practice challenges
// - Clean loading, error, and empty states

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { LEARN_TOPICS, getYouTubeEmbedUrl, getDirectYouTubeUrl } from '../data/learnVideos.js';
import { sfx } from '../game/sfx.js';
import { appendUniqueShorts } from '../lib/shortsFeed.js';

const ALLOWED_TOPICS = ['all', ...LEARN_TOPICS.map((topic) => topic.id)];
const TOPIC_META = Object.fromEntries([
  ['all', { label: 'All DSA', glyph: '⚡', roadmapNodeId: 'arrays' }],
  ...LEARN_TOPICS.map((topic) => [topic.id, topic]),
]);

export default function ShortsScreen({
  initialTopic = 'all',
  onPracticeTopic,
  onBackToLearn,
  onBackToRoadmap,
}) {
  const [selectedTopic, setSelectedTopic] = useState(() => {
    const normalized = (initialTopic || 'all').toLowerCase();
    if (ALLOWED_TOPICS.includes(normalized)) return normalized;
    return LEARN_TOPICS.find((topic) => topic.roadmapNodeId === normalized)?.id || 'all';
  });

  const [shorts, setShorts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const wheelCooldown = useRef(false);
  const touchStartY = useRef(null);
  const containerRef = useRef(null);
  const requestId = useRef(0);
  const loadingMoreRef = useRef(false);

  const currentTopicMeta = TOPIC_META[selectedTopic] || TOPIC_META.all;
  const currentShort = shorts[currentIndex] || null;

  // Fetch initial batch of shorts when topic changes
  const fetchShorts = useCallback(async (topicToFetch) => {
    const request = ++requestId.current;
    setIsLoading(true);
    setError(null);
    setCurrentIndex(0);

    try {
      const res = await fetch(`/api/shorts?topic=${encodeURIComponent(topicToFetch)}&limit=8`);
      if (!res.ok) {
        throw new Error(`Failed to load Shorts (status ${res.status})`);
      }
      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.error || 'Unable to retrieve DSA Shorts');
      }

      if (request !== requestId.current) return;

      setShorts(data.shorts || []);
      setNextPageToken(data.nextPageToken || null);
    } catch (err) {
      if (request !== requestId.current) return;
      console.error('shorts_fetch_error:', err);
      setError(err instanceof Error ? err.message : 'Error fetching DSA Shorts');
    } finally {
      if (request === requestId.current) setIsLoading(false);
    }
  }, []);

  // Fetch next batch in the background (infinite scroll)
  const fetchMoreShorts = useCallback(async () => {
    if (loadingMoreRef.current || !nextPageToken) return;

    loadingMoreRef.current = true;
    setIsLoadingMore(true);
    try {
      const res = await fetch(
        `/api/shorts?topic=${encodeURIComponent(selectedTopic)}&pageToken=${encodeURIComponent(nextPageToken)}&limit=8`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.shorts)) {
          setShorts((prev) => appendUniqueShorts(prev, data.shorts));
          setNextPageToken(data.nextPageToken || null);
        }
      }
    } catch (err) {
      console.warn('shorts_fetch_more_error:', err);
    } finally {
      loadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [selectedTopic, nextPageToken]);

  // Trigger initial fetch
  useEffect(() => {
    fetchShorts(selectedTopic);
  }, [selectedTopic, fetchShorts]);

  // Pre-fetch next batch when approaching end of loaded array
  useEffect(() => {
    if (shorts.length > 0 && currentIndex >= shorts.length - 3 && nextPageToken && !isLoadingMore) {
      fetchMoreShorts();
    }
  }, [currentIndex, shorts.length, nextPageToken, isLoadingMore, fetchMoreShorts]);

  // Next Short action
  const handleNext = useCallback(() => {
    try { sfx.select(); } catch {}
    if (currentIndex < shorts.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else if (nextPageToken && !isLoadingMore) {
      fetchMoreShorts();
    }
  }, [currentIndex, shorts.length, nextPageToken, isLoadingMore, fetchMoreShorts]);

  // Previous Short action
  const handlePrev = useCallback(() => {
    try { sfx.select(); } catch {}
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  // Topic selector change
  const handleSelectTopic = (topicId) => {
    try { sfx.select(); } catch {}
    setSelectedTopic(topicId);
    // Update browser URL query param cleanly without reload
    const url = new URL(window.location.href);
    if (topicId === 'all') {
      url.searchParams.delete('topic');
    } else {
      url.searchParams.set('topic', topicId);
    }
    window.history.replaceState({}, '', url.pathname + url.search);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (onBackToLearn) onBackToLearn();
        else if (onBackToRoadmap) onBackToRoadmap();
      } else if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, onBackToLearn, onBackToRoadmap]);

  // Desktop mouse wheel / trackpad scroll handler
  const handleWheel = (e) => {
    if (wheelCooldown.current) return;

    if (e.deltaY > 35) {
      wheelCooldown.current = true;
      handleNext();
      setTimeout(() => {
        wheelCooldown.current = false;
      }, 420);
    } else if (e.deltaY < -35) {
      wheelCooldown.current = true;
      handlePrev();
      setTimeout(() => {
        wheelCooldown.current = false;
      }, 420);
    }
  };

  // Mobile touch swipe handling
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartY.current === null) return;
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY.current - touchEndY;
    touchStartY.current = null;

    if (diff > 45) {
      // Swiped UP -> Next Short
      handleNext();
    } else if (diff < -45) {
      // Swiped DOWN -> Previous Short
      handlePrev();
    }
  };

  const handlePractice = () => {
    try { sfx.select(); } catch {}
    const topicToPractice = currentShort?.topic || (selectedTopic !== 'all' ? selectedTopic : 'arrays');
    if (onPracticeTopic) {
      onPracticeTopic(topicToPractice);
    }
  };

  return (
    <main
      ref={containerRef}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="shorts-screen mx-auto max-w-6xl px-3 sm:px-4 pt-3 sm:pt-5 pb-20 select-none anim-rise flex flex-col min-h-[calc(100vh-70px)]"
      aria-label="AlgoNook Infinite Shorts Feed"
    >
      {/* ── Top Header & Exit Navigation ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              try { sfx.select(); } catch {}
              if (onBackToLearn) onBackToLearn();
              else if (onBackToRoadmap) onBackToRoadmap();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--bb-line)] bg-[var(--bb-panel)] text-xs font-mono text-[var(--bb-muted)] hover:text-[var(--bb-text)] hover:border-[var(--bb-green)] transition-all"
            aria-label="Back to Learn Feed"
          >
            <span>←</span>
            <span>Learn Feed</span>
          </button>

          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-extrabold text-[var(--bb-text)] tracking-tight flex items-center gap-1.5">
              <span className="text-[var(--bb-amber)]">⚡</span>
              <span>AlgoNook Shorts</span>
            </h1>
            <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[9px] font-mono bg-[var(--bb-amber)]/10 text-[var(--bb-amber)] border border-[var(--bb-amber)]/30 font-bold uppercase">
              Infinite DSA Feed
            </span>
          </div>
        </div>

        {/* Counter indicator */}
        <div className="flex items-center gap-2 text-xs font-mono text-[var(--bb-muted)]">
          {!isLoading && shorts.length > 0 && (
            <span>
              Short <strong className="text-[var(--bb-amber)]">{currentIndex + 1}</strong> of {shorts.length}
              {isLoadingMore && <span className="ml-1 text-[var(--bb-cyan)] animate-pulse">…</span>}
            </span>
          )}
        </div>
      </div>

      {/* ── Controlled DSA Topic Selector Bar ── */}
      <section className="mb-4" aria-label="Shorts Topic Filter">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {ALLOWED_TOPICS.map((topicId) => {
            const meta = TOPIC_META[topicId];
            const isSelected = topicId === selectedTopic;
            return (
              <button
                key={topicId}
                onClick={() => handleSelectTopic(topicId)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-all border whitespace-nowrap ${
                  isSelected
                    ? 'border-[var(--bb-amber)] bg-[var(--bb-amber)]/15 text-[var(--bb-amber)] font-bold shadow-sm'
                    : 'border-[var(--bb-line)] bg-[var(--bb-panel)] text-[var(--bb-muted)] hover:text-[var(--bb-text)] hover:border-[var(--bb-line)]/80'
                }`}
              >
                <span className="text-[10px] opacity-80">{meta.glyph}</span>
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Main Shorts Stage ── */}
      <div className="flex-1 flex flex-col items-center justify-center relative min-h-[480px]">
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-[70vh] aspect-[9/16] w-full max-w-[390px] rounded-2xl border border-[var(--bb-line)] bg-black/60 p-6 text-center shadow-xl">
            <div className="w-12 h-12 rounded-full border-2 border-[var(--bb-amber)] border-t-transparent animate-spin mb-4" />
            <p className="font-mono text-sm text-[var(--bb-text)] font-semibold">
              Loading {currentTopicMeta.label} Shorts…
            </p>
            <p className="mt-1 text-xs text-[var(--bb-muted)]">
              Fetching verified bite-sized DSA concepts
            </p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="flex flex-col items-center justify-center h-[70vh] aspect-[9/16] w-full max-w-[390px] rounded-2xl border border-[var(--bb-red)]/50 bg-[var(--bb-panel)] p-6 text-center shadow-xl">
            <div className="text-3xl mb-3">⚠️</div>
            <p className="text-sm font-bold text-[var(--bb-red)]">
              Unable to load Shorts
            </p>
            <p className="mt-1 text-xs text-[var(--bb-muted)] max-w-xs leading-relaxed">
              {error}
            </p>
            <button
              onClick={() => fetchShorts(selectedTopic)}
              className="mt-5 bb-btn bb-btn-green text-xs !min-h-0 !py-2 !px-4"
            >
              Retry Loading
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && shorts.length === 0 && (
          <div className="flex flex-col items-center justify-center h-[70vh] aspect-[9/16] w-full max-w-[390px] rounded-2xl border border-dashed border-[var(--bb-line)] bg-[var(--bb-panel)] p-6 text-center shadow-xl">
            <div className="text-3xl mb-3">⚡</div>
            <p className="text-sm font-bold text-[var(--bb-text)]">
              No Shorts found for {currentTopicMeta.label}
            </p>
            <p className="mt-1 text-xs text-[var(--bb-muted)] max-w-xs">
              Try selecting "All DSA" or another core topic above.
            </p>
            <button
              onClick={() => handleSelectTopic('all')}
              className="mt-4 bb-btn bb-btn-ghost text-xs !min-h-0 !py-2 !px-4"
            >
              Show All DSA Shorts
            </button>
          </div>
        )}

        {/* ── Active Vertical 9:16 Short Player ── */}
        {!isLoading && !error && currentShort && (
          <div className="relative flex items-center justify-center w-full">
            {/* Center Phone Container (9:16 ratio) */}
            <div className="relative flex flex-col items-center justify-center h-[70vh] sm:h-[76vh] max-h-[760px] aspect-[9/16] w-auto max-w-[420px] rounded-2xl overflow-hidden shadow-2xl border-2 border-[var(--bb-line)] bg-black">
              {/* EXACTLY ONE active iframe is mounted */}
              <iframe
                key={currentShort.youtubeId}
                src={getYouTubeEmbedUrl(currentShort.youtubeId, true)}
                title={currentShort.title}
                className="h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />

              {/* Bottom Scrim with Metadata */}
              <div className="absolute inset-x-0 bottom-0 pointer-events-none bg-gradient-to-t from-black/95 via-black/60 to-transparent p-4 pt-12 flex flex-col gap-1.5 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--bb-green)] font-semibold">
                    {currentShort.channel}
                  </span>
                  {currentShort.topic && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/70 text-[var(--bb-amber)] border border-[var(--bb-amber)]/30 uppercase font-bold">
                      {TOPIC_META[currentShort.topic]?.label || currentShort.topic}
                    </span>
                  )}
                  {currentShort.duration && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/70 text-[var(--bb-muted)] border border-white/10">
                      {currentShort.duration}
                    </span>
                  )}
                </div>

                <h2 className="text-sm font-bold text-white line-clamp-2 leading-snug drop-shadow-sm">
                  {currentShort.title}
                </h2>

                {currentShort.summary && (
                  <p className="text-[11px] text-[var(--bb-muted)] line-clamp-2 leading-normal">
                    {currentShort.summary}
                  </p>
                )}
              </div>
            </div>

            {/* ── Side Floating Navigation Controls for Desktop ── */}
            <div className="hidden sm:flex flex-col items-center gap-3 ml-4 z-20">
              {/* Previous Short Button */}
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className={`h-11 w-11 rounded-full border border-white/20 bg-black/70 flex items-center justify-center text-base transition-all ${
                  currentIndex === 0
                    ? 'opacity-30 cursor-not-allowed'
                    : 'hover:bg-[var(--bb-panel)] hover:border-white text-white hover:scale-105 active:scale-95 shadow-md'
                }`}
                title="Previous Short (Arrow Up / Scroll Up)"
                aria-label="Previous Short"
              >
                ↑
              </button>

              {/* Next Short Button */}
              <button
                onClick={handleNext}
                className="h-12 w-12 rounded-full border border-[var(--bb-amber)] bg-[var(--bb-amber)]/20 text-[var(--bb-amber)] flex items-center justify-center text-lg font-bold transition-all hover:bg-[var(--bb-amber)] hover:text-black hover:scale-105 active:scale-95 shadow-lg shadow-[rgba(251,191,36,0.2)]"
                title="Next Short (Arrow Down / Scroll Down / Swipe Up)"
                aria-label="Next Short"
              >
                ↓
              </button>

              {/* Watch on YouTube External Fallback */}
              <a
                href={getDirectYouTubeUrl(currentShort.youtubeId, 'short')}
                target="_blank"
                rel="noopener noreferrer"
                className="h-9 w-9 rounded-full border border-white/10 bg-black/50 flex items-center justify-center text-xs text-[var(--bb-muted)] hover:text-[var(--bb-cyan)] hover:border-[var(--bb-cyan)] transition-colors mt-2"
                title="Watch on YouTube"
                aria-label="Watch on YouTube"
              >
                ↗
              </a>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Action Strip ── */}
      <footer className="mt-4 pt-3 border-t border-[var(--bb-line)]/70 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-mono text-[var(--bb-muted)]">
          <span className="hidden sm:inline">
            Scroll or use <kbd className="px-1.5 py-0.5 rounded bg-[var(--bb-panel2)] border border-[var(--bb-line)] text-white text-[10px]">↑</kbd> <kbd className="px-1.5 py-0.5 rounded bg-[var(--bb-panel2)] border border-[var(--bb-line)] text-white text-[10px]">↓</kbd> keys
          </span>
          <span className="sm:hidden">
            Swipe up for next short
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePractice}
            className="bb-btn bb-btn-green text-xs !min-h-0 !py-2 !px-4 font-semibold shadow-sm"
          >
            Practice {currentShort?.topic ? TOPIC_META[currentShort.topic]?.label : currentTopicMeta.label} →
          </button>
        </div>
      </footer>
    </main>
  );
}

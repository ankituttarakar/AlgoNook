// AlgoNook — LearnShortsViewer
// Dedicated vertical Shorts viewer inspired by YouTube Shorts.
// Features:
// - One Short visible at a time (9:16 ratio)
// - Vertical mouse wheel/trackpad scrolling
// - Mobile touch swipe navigation
// - Keyboard arrow navigation (ArrowDown/Up, PageDown/Up, Escape)
// - Only the active Short iframe is mounted (previous Short immediately stops)
// - Topic-bounded curated playlist (NOT infinite)
// - Clean end-of-shorts celebration card with Practice CTA
// - Responsive desktop and mobile layouts

import { useState, useEffect, useRef, useCallback } from 'react';
import { getYouTubeEmbedUrl, getDirectYouTubeUrl } from '../data/learnVideos.js';
import { sfx } from '../game/sfx.js';

export default function LearnShortsViewer({
  shorts = [],
  topic,
  initialIndex = 0,
  onClose,
  onPracticeTopic,
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isFinished, setIsFinished] = useState(false);
  const touchStartY = useRef(null);
  const wheelCooldown = useRef(false);
  const containerRef = useRef(null);

  const total = shorts.length;
  const currentShort = shorts[currentIndex];

  // Go to next short or trigger finished screen
  const handleNext = useCallback(() => {
    if (isFinished) return;
    try { sfx.select(); } catch {}
    if (currentIndex < total - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsFinished(true);
    }
  }, [currentIndex, total, isFinished]);

  // Go to previous short
  const handlePrev = useCallback(() => {
    try { sfx.select(); } catch {}
    if (isFinished) {
      setIsFinished(false);
      return;
    }
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex, isFinished]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
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
  }, [handleNext, handlePrev, onClose]);

  // Handle desktop mouse wheel / trackpad scrolling with debounced cooldown
  const handleWheel = (e) => {
    if (wheelCooldown.current) return;

    if (e.deltaY > 35) {
      wheelCooldown.current = true;
      handleNext();
      setTimeout(() => {
        wheelCooldown.current = false;
      }, 450);
    } else if (e.deltaY < -35) {
      wheelCooldown.current = true;
      handlePrev();
      setTimeout(() => {
        wheelCooldown.current = false;
      }, 450);
    }
  };

  // Handle mobile touch swipe
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartY.current === null) return;
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY.current - touchEndY;
    touchStartY.current = null;

    if (diff > 50) {
      // Swiped UP -> Next Short
      handleNext();
    } else if (diff < -50) {
      // Swiped DOWN -> Previous Short
      handlePrev();
    }
  };

  const handlePractice = () => {
    try { sfx.select(); } catch {}
    onClose();
    if (onPracticeTopic) {
      onPracticeTopic(topic.id);
    }
  };

  if (!shorts || shorts.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 text-center">
        <div className="max-w-md p-6 border border-[var(--bb-line)] bg-[var(--bb-panel)] rounded-xl">
          <p className="text-sm text-[var(--bb-muted)]">No Shorts available for {topic?.label || 'this topic'}.</p>
          <button onClick={onClose} className="mt-4 bb-btn bb-btn-green text-xs">
            Back to Learn
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black/95 text-white select-none overflow-hidden backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={`${topic?.label || ''} Shorts Viewer`}
    >
      {/* ── Top Header Controls ── */}
      <header className="w-full max-w-lg px-4 pt-3 pb-2 flex flex-col gap-2 z-20 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                try { sfx.select(); } catch {}
                onClose();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--bb-line)] bg-[var(--bb-panel)]/80 text-xs font-mono text-[var(--bb-muted)] hover:text-white hover:border-[var(--bb-green)] transition-all"
              aria-label="Back to Learn Feed"
            >
              <span>←</span>
              <span>Back to Learn</span>
            </button>
            <span className="text-[11px] font-mono font-bold text-[var(--bb-amber)] px-2 py-0.5 rounded bg-[var(--bb-amber)]/10 border border-[var(--bb-amber)]/30">
              ⚡ Shorts
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-[var(--bb-muted)]">
              {topic?.label} · {!isFinished ? `${currentIndex + 1}/${total}` : 'Complete'}
            </span>
            <button
              onClick={() => {
                try { sfx.select(); } catch {}
                onClose();
              }}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-[var(--bb-line)] bg-[var(--bb-panel)] text-sm text-[var(--bb-muted)] hover:text-white transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Stories-style Segmented Progress Bar */}
        <div className="grid grid-flow-col gap-1 w-full h-1 mt-1">
          {shorts.map((_, idx) => (
            <div
              key={idx}
              className={`h-full rounded-full transition-colors duration-200 ${
                isFinished || idx <= currentIndex
                  ? 'bg-[var(--bb-amber)]'
                  : 'bg-white/20'
              }`}
            />
          ))}
        </div>
      </header>

      {/* ── Center Stage: Active Short or Completion Card ── */}
      <div className="relative flex-1 flex items-center justify-center w-full px-2 sm:px-4 py-1 min-h-0">
        {!isFinished && currentShort ? (
          <div className="relative flex flex-col items-center justify-center h-full max-h-[76vh] sm:max-h-[82vh] aspect-[9/16] w-auto max-w-[420px] rounded-2xl overflow-hidden shadow-2xl border border-[var(--bb-line)] bg-black">
            {/* ONLY active Short iframe mounted */}
            <iframe
              key={currentShort.youtubeId}
              src={getYouTubeEmbedUrl(currentShort.youtubeId, true)}
              title={currentShort.title}
              className="h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />

            {/* Bottom info scrim */}
            <div className="absolute inset-x-0 bottom-0 pointer-events-none bg-gradient-to-t from-black/95 via-black/60 to-transparent p-4 pt-12 flex flex-col gap-1.5 text-left">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--bb-green)] font-semibold">
                  {currentShort.channel}
                </span>
                {currentShort.difficulty && (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-black/70 text-[var(--bb-muted)] border border-white/10">
                    {currentShort.difficulty}
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-white line-clamp-2 leading-snug drop-shadow-sm">
                {currentShort.title}
              </h3>
              {currentShort.summary && (
                <p className="text-[11px] text-[var(--bb-muted)] line-clamp-2 leading-normal">
                  {currentShort.summary}
                </p>
              )}
            </div>
          </div>
        ) : (
          /* ── Curated Shorts End Card ── */
          <div className="flex flex-col items-center justify-center h-full max-h-[76vh] sm:max-h-[82vh] aspect-[9/16] w-auto max-w-[420px] rounded-2xl border border-[var(--bb-green)]/40 bg-[var(--bb-panel)] p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden">
            <div className="w-16 h-16 rounded-full bg-[var(--bb-green)]/15 border border-[var(--bb-green)] flex items-center justify-center text-3xl mb-4">
              ⚡
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              All {topic?.label} Shorts Watched!
            </h2>
            <p className="text-xs text-[var(--bb-muted)] max-w-xs leading-relaxed mb-6">
              You reviewed all {total} curated bite-sized DSA concepts for{' '}
              <span className="text-[var(--bb-green)] font-semibold">{topic?.label}</span>. Put your reasoning to the test!
            </p>

            <div className="flex flex-col gap-2.5 w-full max-w-xs">
              <button
                onClick={handlePractice}
                className="bb-btn bb-btn-green text-xs !min-h-0 !py-3 w-full font-bold shadow-lg shadow-[rgba(200,244,124,0.15)]"
              >
                Practice {topic?.label} Now →
              </button>

              <button
                onClick={() => {
                  try { sfx.select(); } catch {}
                  setIsFinished(false);
                  setCurrentIndex(0);
                }}
                className="bb-btn bb-btn-ghost text-xs !min-h-0 !py-2.5 w-full text-[var(--bb-muted)] hover:text-white"
              >
                ↺ Replay Shorts
              </button>

              <button
                onClick={() => {
                  try { sfx.select(); } catch {}
                  onClose();
                }}
                className="text-[11px] font-mono text-[var(--bb-muted)] hover:text-white transition-colors pt-2"
              >
                Back to Feed
              </button>
            </div>

            {/* Ambient glow decoration */}
            <div
              aria-hidden="true"
              className="absolute -bottom-20 -right-20 w-48 h-48 rounded-full bg-[radial-gradient(circle,rgba(200,244,124,0.12)_0%,transparent_70%)] pointer-events-none"
            />
          </div>
        )}

        {/* ── Side Floating Quick Controls for Desktop ── */}
        <div className="hidden sm:flex flex-col items-center gap-3 ml-4 z-20">
          {/* Previous Short Button */}
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0 && !isFinished}
            className={`h-11 w-11 rounded-full border border-white/20 bg-black/60 flex items-center justify-center text-base transition-all ${
              currentIndex === 0 && !isFinished
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
            disabled={isFinished}
            className={`h-11 w-11 rounded-full border border-[var(--bb-green)] bg-[var(--bb-green)]/15 text-[var(--bb-green)] flex items-center justify-center text-base transition-all ${
              isFinished
                ? 'opacity-30 cursor-not-allowed border-white/20 bg-black/60 text-white'
                : 'hover:bg-[var(--bb-green)] hover:text-black hover:scale-105 active:scale-95 shadow-lg shadow-[rgba(200,244,124,0.2)]'
            }`}
            title={isFinished ? 'Completed' : 'Next Short (Arrow Down / Scroll Down)'}
            aria-label="Next Short"
          >
            ↓
          </button>

          {!isFinished && currentShort && (
            <a
              href={getDirectYouTubeUrl(currentShort.youtubeId, 'short')}
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 w-9 rounded-full border border-white/10 bg-black/40 flex items-center justify-center text-xs text-[var(--bb-muted)] hover:text-[var(--bb-cyan)] hover:border-[var(--bb-cyan)] transition-colors mt-2"
              title="Watch on YouTube"
              aria-label="Watch on YouTube"
            >
              ↗
            </a>
          )}
        </div>
      </div>

      {/* ── Bottom Action Strip ── */}
      <footer className="w-full max-w-lg px-4 py-3 flex items-center justify-between border-t border-white/10 z-20 shrink-0 bg-black/60 sm:bg-transparent">
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-block text-[11px] font-mono text-[var(--bb-muted)]">
            Swipe or use <kbd className="px-1 py-0.5 rounded bg-white/10 text-white text-[10px]">↑</kbd> <kbd className="px-1 py-0.5 rounded bg-white/10 text-white text-[10px]">↓</kbd>
          </span>
          <span className="sm:hidden text-[11px] font-mono text-[var(--bb-muted)]">
            Swipe up for next short
          </span>
        </div>

        <button
          onClick={handlePractice}
          className="bb-btn bb-btn-green text-xs !min-h-0 !py-2 !px-4 font-semibold"
        >
          Practice {topic?.label} →
        </button>
      </footer>
    </div>
  );
}

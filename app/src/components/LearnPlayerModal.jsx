// AlgoNook — LearnPlayerModal
// Plays YouTube videos and Shorts inside AlgoNook with zero distractions.
// Provides a clean transition back to AlgoNook practice challenges.

import { useEffect, useRef } from 'react';
import { getYouTubeEmbedUrl, getDirectYouTubeUrl } from '../data/learnVideos.js';
import { sfx } from '../game/sfx.js';

export default function LearnPlayerModal({ video, onClose, onPracticeTopic }) {
  const modalRef = useRef(null);
  const isShort = video?.type === 'short';

  // Handle ESC key to close
  useEffect(() => {
    if (!video) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [video, onClose]);

  if (!video) return null;

  const handleClose = () => {
    try {
      sfx.select();
    } catch {
      // safe fallback
    }
    onClose();
  };

  const handlePractice = () => {
    try {
      sfx.select();
    } catch {
      // safe fallback
    }
    onPracticeTopic?.(video.topicId);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={video.title}
    >
      <div
        ref={modalRef}
        className={`relative flex flex-col w-full overflow-hidden border border-[var(--bb-line)] bg-[var(--bb-panel)] rounded-2xl shadow-2xl ${
          isShort ? 'max-w-md' : 'max-w-4xl'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--bb-line)] px-4 py-3 bg-[var(--bb-panel2)]/70">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <span
              className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                isShort
                  ? 'bg-[var(--bb-amber)] text-black'
                  : 'bg-[var(--bb-cyan)] text-black'
              }`}
            >
              {isShort ? '⚡ Short' : '🎬 Video'}
            </span>
            <span className="truncate text-xs font-mono text-[var(--bb-green)]">
              {video.channel}
            </span>
          </div>

          <button
            onClick={handleClose}
            className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--bb-line)] text-sm text-[var(--bb-muted)] hover:text-[var(--bb-text)] hover:border-[var(--bb-text)] transition-colors"
            aria-label="Close video player"
          >
            ✕
          </button>
        </div>

        {/* Video Player Area */}
        <div className="relative w-full bg-black flex items-center justify-center">
          <div
            className={`w-full ${
              isShort
                ? 'aspect-[9/16] max-h-[68vh]'
                : 'aspect-video max-h-[68vh]'
            }`}
          >
            <iframe
              src={getYouTubeEmbedUrl(video.youtubeId)}
              title={video.title}
              className="h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        </div>

        {/* Video Info & Action Bar */}
        <div className="p-4 sm:p-5 flex flex-col gap-3 bg-[var(--bb-panel)]">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[var(--bb-text)] leading-snug">
              {video.title}
            </h2>
            {video.summary && (
              <p className="mt-1 text-xs text-[var(--bb-muted)] leading-relaxed">
                {video.summary}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--bb-line)]">
            <a
              href={getDirectYouTubeUrl(video.youtubeId, video.type)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[var(--bb-muted)] hover:text-[var(--bb-cyan)] transition-colors font-mono"
            >
              Watch on YouTube <span aria-hidden="true">↗</span>
            </a>

            <div className="flex items-center gap-2">
              <button
                onClick={handleClose}
                className="bb-btn bb-btn-ghost text-xs !min-h-0 !py-2 !px-3"
              >
                Back to Feed
              </button>
              <button
                onClick={handlePractice}
                className="bb-btn bb-btn-green text-xs !min-h-0 !py-2 !px-4"
              >
                Practice This Topic →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// AlgoNook — LearnVideoCard
// Displays a curated educational video or Short with thumbnail, duration,
// topic/channel metadata, and watch trigger.

import { useState } from 'react';
import { getYouTubeThumbnailUrl, getYouTubeThumbnailFallbackUrl } from '../data/learnVideos.js';
import { sfx } from '../game/sfx.js';

export default function LearnVideoCard({ video, onSelect }) {
  const [imgStage, setImgStage] = useState('hq'); // 'hq' | 'mq' | 'fallback'
  const isShort = video.type === 'short';

  const handleImgError = () => {
    if (imgStage === 'hq') {
      setImgStage('mq');
    } else {
      setImgStage('fallback');
    }
  };

  const imgSrc = imgStage === 'hq'
    ? getYouTubeThumbnailUrl(video.youtubeId)
    : getYouTubeThumbnailFallbackUrl(video.youtubeId);

  const handleClick = () => {
    try {
      sfx.select();
    } catch {
      // safe fallback if audio context not available
    }
    onSelect?.(video);
  };

  return (
    <article
      onClick={handleClick}
      className={`group relative flex flex-col justify-between overflow-hidden border border-[var(--bb-line)] bg-[var(--bb-panel)] rounded-xl transition-all duration-200 hover:-translate-y-1 hover:border-[var(--bb-green)] hover:shadow-lg hover:shadow-[rgba(200,244,124,0.06)] cursor-pointer select-none ${
        isShort ? 'border-l-2 border-l-[var(--bb-amber)]' : 'border-l-2 border-l-[var(--bb-cyan)]'
      }`}
    >
      {/* Thumbnail container */}
      <div className="relative aspect-video w-full overflow-hidden bg-black/60">
        {imgStage !== 'fallback' ? (
          <img
            src={imgSrc}
            alt={video.title}
            loading="lazy"
            onError={handleImgError}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-[var(--bb-panel2)] p-4 text-center">
            <span className="font-mono text-2xl text-[var(--bb-green)]">▶</span>
            <span className="mt-1 font-mono text-[10px] text-[var(--bb-muted)] uppercase tracking-wider">{video.channel}</span>
          </div>
        )}

        {/* Video vs Short Indicator Badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase backdrop-blur-md shadow-sm ${
              isShort
                ? 'bg-[var(--bb-amber)]/90 text-black'
                : 'bg-[var(--bb-cyan)]/90 text-black'
            }`}
          >
            {isShort ? (
              <>
                <span aria-hidden="true">⚡</span> SHORT
              </>
            ) : (
              <>
                <span aria-hidden="true">🎬</span> VIDEO
              </>
            )}
          </span>
          {video.difficulty && (
            <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded text-[9px] font-mono bg-black/70 text-[var(--bb-muted)] border border-[var(--bb-line)]">
              {video.difficulty}
            </span>
          )}
        </div>

        {/* Duration badge */}
        {video.duration && (
          <div className="absolute bottom-2 right-2 rounded bg-black/85 px-1.5 py-0.5 font-mono text-[10px] text-white/90 font-medium backdrop-blur-xs">
            {video.duration}
          </div>
        )}

        {/* Hover play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--bb-green)] text-black font-bold shadow-md transform transition-transform group-hover:scale-110">
            <span className="ml-0.5 text-base leading-none">▶</span>
          </div>
        </div>
      </div>

      {/* Content body */}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2 text-[10px] text-[var(--bb-muted)] mb-1.5 font-mono">
          <span className="truncate text-[var(--bb-green-dim)] font-medium">
            {video.channel}
          </span>
        </div>

        <h3 className="line-clamp-2 text-sm font-semibold text-[var(--bb-text)] leading-snug group-hover:text-[var(--bb-green)] transition-colors">
          {video.title}
        </h3>

        {video.summary && (
          <p className="mt-2 line-clamp-2 text-xs text-[var(--bb-muted)] leading-relaxed">
            {video.summary}
          </p>
        )}

        <div className="mt-auto pt-4 flex items-center justify-between border-t border-[var(--bb-line)]/50">
          <span className="text-[10px] font-mono text-[var(--bb-muted)]">
            YouTube Embed
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--bb-green)] group-hover:translate-x-0.5 transition-transform">
            Watch <span aria-hidden="true">→</span>
          </span>
        </div>
      </div>
    </article>
  );
}

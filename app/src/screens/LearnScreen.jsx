// AlgoNook — LearnScreen
// Educational YouTube video and dedicated Shorts experience organized by DSA topic.
// Separates long-form deep-dive videos from high-energy bite-sized Shorts.

import { useState, useMemo } from 'react';
import { LEARN_TOPICS, getLearnVideos } from '../data/learnVideos.js';
import LearnVideoCard from '../components/LearnVideoCard.jsx';
import LearnPlayerModal from '../components/LearnPlayerModal.jsx';
import { sfx } from '../game/sfx.js';

export default function LearnScreen({
  initialTopicId = 'arrays',
  onPracticeTopic,
  onBackToRoadmap,
}) {
  const [selectedTopicId, setSelectedTopicId] = useState(() => {
    const directMatch = LEARN_TOPICS.find((t) => t.id === initialTopicId);
    if (directMatch) return directMatch.id;
    const roadmapMatch = LEARN_TOPICS.find((t) => t.roadmapNodeId === initialTopicId);
    if (roadmapMatch) return roadmapMatch.id;
    return 'arrays';
  });

  const [activeVideo, setActiveVideo] = useState(null);
  const [hasError, setHasError] = useState(false);

  // Active topic object
  const currentTopic = useMemo(() => {
    return LEARN_TOPICS.find((t) => t.id === selectedTopicId) || LEARN_TOPICS[0];
  }, [selectedTopicId]);

  // Long-form videos only (Shorts are rendered in their own dedicated section)
  const videos = useMemo(() => {
    try {
      return getLearnVideos(selectedTopicId, 'video');
    } catch (err) {
      console.error('learn_feed_videos: failed to get videos:', err);
      setHasError(true);
      return [];
    }
  }, [selectedTopicId]);

  const handleSelectTopic = (topicId) => {
    try {
      sfx.select();
    } catch {
      // safe fallback
    }
    setSelectedTopicId(topicId);
    setHasError(false);
  };

  const handlePractice = () => {
    try {
      sfx.select();
    } catch {
      // safe fallback
    }
    if (onPracticeTopic) {
      onPracticeTopic(selectedTopicId);
    }
  };

  return (
    <main className="learn-feed mx-auto max-w-6xl px-4 pt-6 pb-24 anim-rise">
      {/* Top back navigation breadcrumb */}
      {onBackToRoadmap && (
        <div className="mb-4">
          <button
            onClick={() => {
              try { sfx.select(); } catch {}
              onBackToRoadmap();
            }}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[var(--bb-muted)] hover:text-[var(--bb-text)] transition-colors"
          >
            ← Learning Roadmap
          </button>
        </div>
      )}

      {/* Hero Header */}
      <div className="border border-[var(--bb-line)] bg-[var(--bb-panel)] p-5 sm:p-7 rounded-2xl mb-8 relative overflow-hidden shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="eyebrow">CURATED VIDEO LEARNING</span>
              <span className="h-1 w-1 rounded-full bg-[var(--bb-green)]" />
              <span className="font-mono text-[9px] text-[var(--bb-cyan)] uppercase">
                Zero Distractions
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--bb-text)] tracking-tight">
              Learn <em className="text-[var(--bb-green)] not-italic">{currentTopic.label}</em> with Videos
            </h1>

            <p className="mt-2 text-xs sm:text-sm text-[var(--bb-muted)] leading-relaxed">
              {currentTopic.subtitle}. Watch verified explanations, understand the core mechanics, and jump straight into AlgoNook practice.
            </p>
          </div>

          {/* Quick Action: Practice CTA */}
          <div className="shrink-0 flex items-center gap-3">
            <button
              onClick={handlePractice}
              className="bb-btn bb-btn-green text-xs !min-h-0 !py-3 !px-5 whitespace-nowrap"
            >
              Practice {currentTopic.label} →
            </button>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div
          aria-hidden="true"
          className="absolute -right-12 -bottom-16 w-64 h-64 rounded-full bg-[radial-gradient(circle,rgba(200,244,124,0.08)_0%,transparent_70%)] pointer-events-none"
        />
      </div>

      {/* DSA Topic Selector Bar */}
      <section className="mb-8" aria-label="DSA Topics">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--bb-muted)]">
            SELECT A DSA TOPIC
          </h2>
          <span className="text-[10px] font-mono text-[var(--bb-muted)]">
            {LEARN_TOPICS.length} Topics Available
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {LEARN_TOPICS.map((topic) => {
            const isSelected = topic.id === selectedTopicId;
            return (
              <button
                key={topic.id}
                onClick={() => handleSelectTopic(topic.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'border-[var(--bb-green)] bg-[var(--bb-green)]/15 text-[var(--bb-green)] font-semibold shadow-sm'
                    : 'border-[var(--bb-line)] bg-[var(--bb-panel)] text-[var(--bb-muted)] hover:text-[var(--bb-text)] hover:border-[var(--bb-line)]/80'
                }`}
              >
                <span className="font-mono text-[10px] opacity-75">{topic.glyph}</span>
                <span>{topic.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Error State */}
      {hasError && (
        <div className="border border-[var(--bb-red)]/50 bg-[var(--bb-panel)] p-6 rounded-xl text-center my-8">
          <p className="text-sm font-semibold text-[var(--bb-red)]">
            Unable to load educational videos.
          </p>
          <p className="mt-1 text-xs text-[var(--bb-muted)]">
            An unexpected error occurred while parsing the video catalog.
          </p>
          <button
            onClick={() => setHasError(false)}
            className="mt-4 bb-btn bb-btn-ghost text-xs !min-h-0 !py-1.5 !px-3"
          >
            Retry
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: 🎬 Videos
          Educational deep-dive videos for this topic
          ───────────────────────────────────────────────────────────── */}
      <section className="mb-12" aria-labelledby="section-videos-title">
        <div className="flex items-center justify-between border-b border-[var(--bb-line)]/70 pb-3 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base">🎬</span>
              <h2 id="section-videos-title" className="text-lg font-bold text-[var(--bb-text)]">
                Videos
              </h2>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[var(--bb-cyan)]/15 text-[var(--bb-cyan)] border border-[var(--bb-cyan)]/30 font-semibold">
                {videos.length} Available
              </span>
            </div>
            <p className="text-xs text-[var(--bb-muted)] mt-0.5">
              Educational videos for {currentTopic.label}
            </p>
          </div>

          <span className="text-[11px] font-mono text-[var(--bb-muted)] hidden sm:inline">
            Deep Dives & Concepts
          </span>
        </div>

        {/* Video Cards Grid */}
        {videos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {videos.map((video) => (
              <LearnVideoCard
                key={video.id}
                video={video}
                onSelect={(v) => setActiveVideo(v)}
              />
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-[var(--bb-line)] bg-[var(--bb-panel)]/40 p-8 rounded-xl text-center">
            <p className="text-xs text-[var(--bb-muted)]">
              No long-form videos registered for {currentTopic.label} yet.
            </p>
          </div>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────────
          Standard 16:9 YouTube Video Player Modal
          ───────────────────────────────────────────────────────────── */}
      <LearnPlayerModal
        video={activeVideo}
        onClose={() => setActiveVideo(null)}
        onPracticeTopic={(topicId) => {
          setActiveVideo(null);
          if (onPracticeTopic) {
            onPracticeTopic(topicId);
          }
        }}
      />

    </main>
  );
}

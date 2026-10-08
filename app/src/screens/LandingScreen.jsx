// AlgoNook — Landing Page (v2)
// Serious DSA learning platform pitch. Clean, technical, modern.
// Auth: Clerk SignIn / SignUp modals.

import { SignInButton, SignUpButton } from '@clerk/react';
import { sfx } from '../game/sfx.js';

const FEATURES = [
  {
    icon: '◉',
    title: 'Visual Roadmap',
    body: 'Follow a structured path from Foundations through Dynamic Programming. See exactly where you are and what comes next.',
    color: 'cyan',
  },
  {
    icon: '▶',
    title: 'Interactive Visualizations',
    body: 'Watch algorithms execute step-by-step. Understand pointer movement, state changes, and search-space elimination.',
    color: 'green',
  },
  {
    icon: '⬡',
    title: 'Guided Problem Solving',
    body: 'Multi-stage learning flow: concept → visualization → trace → code → review. Each stage builds on the last.',
    color: 'amber',
  },
  {
    icon: '⊛',
    title: 'Spaced Repetition Mastery',
    body: 'Skills are tracked through five mastery tiers. Automated review scheduling ensures long-term retention.',
    color: 'green',
  },
  {
    icon: '⟨/⟩',
    title: 'Real Code Execution',
    body: 'Write Python in a secure sandboxed environment. Run against trusted test harnesses. See exactly what passes and fails.',
    color: 'amber',
  },
  {
    icon: '≡',
    title: 'Interview-Ready',
    body: 'Aligned to LeetCode patterns, HackerRank topics, and real technical interview structures. Complexity analysis included.',
    color: 'cyan',
  },
];

const TOPICS_PREVIEW = [
  'Foundations', 'Arrays', 'Hashing', 'Two Pointers',
  'Sliding Window', 'Stacks & Queues', 'Linked Lists', 'Binary Search',
  'Trees', 'Heaps', 'Graphs', 'Backtracking', 'Dynamic Programming', 'Interview Patterns',
];

const COLOR_CLASSES = {
  cyan:  { icon: 'text-cyan-400', border: 'border-cyan-800/40' },
  green: { icon: 'text-[var(--bb-green)]', border: 'border-[var(--bb-green-dim)]/40' },
  amber: { icon: 'text-[var(--bb-amber)]', border: 'border-[var(--bb-amber)]/30' },
};

export default function LandingScreen() {
  return (
    <div className="min-h-dvh">
      {/* Nav bar */}
      <nav className="sticky top-0 z-40 border-b border-[var(--bb-line)] bg-[rgba(6,8,7,0.93)] backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg font-bold text-[var(--bb-green)]" style={{ textShadow: '0 0 8px rgba(0,244,142,0.4)' }}>
              AlgoNook
            </span>
            <span className="hidden text-[10px] uppercase tracking-widest text-[var(--bb-muted)] sm:inline">
              / DSA Learning Platform
            </span>
          </div>
          <div className="flex items-center gap-2">
            <SignInButton mode="modal">
              <button
                onClick={() => sfx.select()}
                className="bb-btn bb-btn-ghost !min-h-0 !px-3 !py-1.5 text-xs"
              >
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button
                onClick={() => sfx.select()}
                className="bb-btn bb-btn-green !min-h-0 !px-3 !py-1.5 text-xs"
              >
                Get started
              </button>
            </SignUpButton>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-4 pt-20 pb-16 text-center">
        <div className="mb-6 inline-block border border-[var(--bb-green-dim)]/50 bg-[rgba(0,244,142,0.04)] px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[var(--bb-green)]">
          DSA · Algorithms · Interview Preparation
        </div>

        <h1 className="text-4xl font-bold leading-tight text-[var(--bb-text)] sm:text-5xl lg:text-6xl">
          Learn DSA the way your{' '}
          <span className="text-[var(--bb-green)]" style={{ textShadow: '0 0 20px rgba(0,244,142,0.3)' }}>
            brain actually remembers
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[var(--bb-muted)] sm:text-lg">
          AlgoNook teaches algorithms through interactive visualizations, structured learning paths,
          and guided problem-solving — not memorization. Built for placement prep, LeetCode, and technical interviews.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <SignUpButton mode="modal">
            <button
              onClick={() => sfx.select()}
              className="bb-btn bb-btn-green w-full sm:w-auto sm:min-w-[200px] text-sm"
            >
              Start Learning Free →
            </button>
          </SignUpButton>
          <SignInButton mode="modal">
            <button
              onClick={() => sfx.select()}
              className="bb-btn bb-btn-ghost w-full sm:w-auto sm:min-w-[140px] text-sm"
            >
              Sign in
            </button>
          </SignInButton>
        </div>

        {/* Topics preview */}
        <div className="mt-12 flex flex-wrap justify-center gap-2">
          {TOPICS_PREVIEW.map((t, i) => (
            <span
              key={t}
              className="border border-[var(--bb-line)] px-2.5 py-1 text-[11px] text-[var(--bb-muted)] transition-colors hover:border-[var(--bb-green-dim)] hover:text-[var(--bb-text)]"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section className="mx-auto max-w-5xl px-4 pb-20">
        <div className="mb-10 text-center">
          <h2 className="text-xl font-bold text-[var(--bb-text)]">
            Everything you need to prepare
          </h2>
          <p className="mt-2 text-sm text-[var(--bb-muted)]">
            A complete learning system from first principles to interview-ready fluency.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feat) => {
            const cc = COLOR_CLASSES[feat.color] || COLOR_CLASSES.green;
            return (
              <div
                key={feat.title}
                className={`border ${cc.border} bg-[var(--bb-panel)] p-5 transition-all hover:border-opacity-80`}
              >
                <div className={`mb-3 font-mono text-2xl leading-none ${cc.icon}`}>
                  {feat.icon}
                </div>
                <h3 className="mb-2 text-sm font-semibold text-[var(--bb-text)]">{feat.title}</h3>
                <p className="text-xs leading-relaxed text-[var(--bb-muted)]">{feat.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Learning path preview */}
      <section className="border-t border-[var(--bb-line)] bg-[var(--bb-panel)] py-16">
        <div className="mx-auto max-w-4xl px-4">
          <div className="text-center mb-10">
            <h2 className="text-xl font-bold text-[var(--bb-text)]">A structured path, not a dumping ground</h2>
            <p className="mt-2 text-sm text-[var(--bb-muted)]">
              Each topic unlocks prerequisites. You always know where you are and what to learn next.
            </p>
          </div>

          {/* Simplified path visualization */}
          <div className="flex items-center justify-center">
            <div className="space-y-0 w-full max-w-sm">
              {['Foundations', 'Arrays', 'Hashing + Two Pointers', 'Trees + Graphs', 'Dynamic Programming', 'Interview Patterns'].map((step, i, arr) => (
                <div key={step}>
                  <div className={`border px-4 py-3 text-center text-sm transition-colors ${
                    i === 0 ? 'border-cyan-700 text-cyan-400 bg-cyan-950/20' :
                    i === arr.length - 1 ? 'border-[var(--bb-amber)] text-[var(--bb-amber)] bg-[rgba(255,176,0,0.06)]' :
                    'border-[var(--bb-line)] text-[var(--bb-text)]'
                  }`}>
                    {step}
                  </div>
                  {i < arr.length - 1 && (
                    <div className="flex justify-center">
                      <div className="w-px h-5 bg-[var(--bb-line)]" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA footer */}
      <section className="border-t border-[var(--bb-line)] py-16 text-center">
        <div className="mx-auto max-w-xl px-4">
          <h2 className="text-2xl font-bold text-[var(--bb-text)] mb-4">
            Ready to master DSA?
          </h2>
          <p className="text-sm text-[var(--bb-muted)] mb-8">
            Free to start. Track your progress, earn XP, and advance through the roadmap at your own pace.
          </p>
          <SignUpButton mode="modal">
            <button
              onClick={() => sfx.select()}
              className="bb-btn bb-btn-green text-sm min-w-[200px]"
            >
              Create free account →
            </button>
          </SignUpButton>
          <p className="mt-4 text-[10px] text-[var(--bb-muted)]">
            {TOPICS_PREVIEW.length} topics · 200+ problems · spaced repetition · live code execution
          </p>
        </div>
      </section>
    </div>
  );
}

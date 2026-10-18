// AlgoNook — Landing Page (v2)
// Serious DSA learning platform pitch. Clean, technical, modern.
// Auth: Clerk SignIn / SignUp modals.

import { SignInButton, SignUpButton } from '@clerk/react';
import { Link } from 'react-router';
import { sfx } from '../game/sfx.js';
import AlgorithmField from '../components/AlgorithmField.jsx';

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
    <div className="landing-page">
      <nav className="landing-nav" aria-label="Public navigation">
        <div className="landing-nav-inner">
          <Link to="/" className="landing-brand" aria-label="AlgoNook home">
            <span className="brand-symbol" aria-hidden="true">a<span>n</span></span>
            <span className="landing-brand-copy">AlgoNook<small>LEARN BY DOING</small></span>
          </Link>
          <div className="landing-nav-actions">
            <SignInButton mode="modal"><button onClick={() => sfx.select()} className="landing-signin">Sign in</button></SignInButton>
            <SignUpButton mode="modal"><button onClick={() => sfx.select()} className="bb-btn bb-btn-green landing-nav-join">Get started <span aria-hidden="true">↗</span></button></SignUpButton>
          </div>
        </div>
      </nav>

      <main>
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-hero-glow" aria-hidden="true" />
          <div className="landing-hero-inner">
            <div className="landing-hero-copy">
              <p className="landing-eyebrow"><span aria-hidden="true" /> ALGONOOK / LEARN BY DOING</p>
              <h1 id="landing-title">Master DSA.<br /><span>One mission at a time.</span></h1>
              <p className="landing-lede">Turn data structures and algorithms into hands-on missions, visual learning, and coding challenges.</p>
              <div className="landing-actions">
                <SignUpButton mode="modal">
                  <button onClick={() => sfx.select()} className="bb-btn bb-btn-green landing-primary-action">Start learning <span aria-hidden="true">→</span></button>
                </SignUpButton>
                <Link to="/roadmap" className="bb-btn bb-btn-ghost landing-roadmap-action" aria-label="Explore the AlgoNook roadmap">
                  Explore the roadmap <span aria-hidden="true">↗</span>
                </Link>
              </div>
              <p className="landing-route-note">Your roadmap opens after sign-in and onboarding.</p>
              <ul className="landing-benefits" aria-label="How AlgoNook helps you learn">
                <li><span aria-hidden="true">◇</span> Learn by doing</li>
                <li><span aria-hidden="true">⌁</span> Visualize concepts</li>
                <li><span aria-hidden="true">↗</span> Track your progress</li>
              </ul>
            </div>
            <div className="landing-art-wrap"><AlgorithmField /></div>
            <div className="landing-art-caption" aria-hidden="true"><span>LEARNING PATH</span><b>01 — EXPLORE</b></div>
          </div>
          <div className="landing-hero-foot" aria-hidden="true"><span>CONCEPT</span><i /><span>TRACE</span><i /><span>PROVE</span></div>
        </section>

      {/* Features grid */}
      <section className="landing-section landing-features" aria-labelledby="landing-features-title">
        <div className="landing-section-heading">
          <p className="eyebrow">A SYSTEM FOR UNDERSTANDING</p>
          <h2 id="landing-features-title">
            Everything you need to prepare
          </h2>
          <p>
            A complete learning system from first principles to interview-ready fluency.
          </p>
        </div>

        <div className="landing-feature-grid">
          {FEATURES.map((feat) => {
            const cc = COLOR_CLASSES[feat.color] || COLOR_CLASSES.green;
            return (
              <div
                key={feat.title}
                className={`landing-feature-card ${cc.border}`}
              >
                <div className={`mb-3 font-mono text-2xl leading-none ${cc.icon}`}>
                  {feat.icon}
                </div>
                <h3>{feat.title}</h3>
                <p>{feat.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Learning path preview */}
      <section className="landing-roadmap-section" aria-labelledby="landing-roadmap-title">
        <div className="landing-section landing-roadmap-inner">
          <div className="landing-roadmap-copy">
            <p className="eyebrow">FOLLOW THE SIGNAL</p>
            <h2 id="landing-roadmap-title">A structured path, not a dumping ground</h2>
            <p>
              Each topic unlocks prerequisites. You always know where you are and what to learn next.
            </p>
            <Link to="/roadmap" className="landing-inline-link">Explore the roadmap <span aria-hidden="true">→</span></Link>
          </div>

          {/* Simplified path visualization */}
          <div className="landing-roadmap-visual">
            <ol className="landing-roadmap-list" aria-label="Roadmap topic sequence">
              {['Foundations', 'Arrays', 'Hashing + Two Pointers', 'Trees + Graphs', 'Dynamic Programming', 'Interview Patterns'].map((step, i, arr) => (
                <li key={step} className={`landing-roadmap-step landing-roadmap-step-${i}`}>
                  <div className={
                    i === 0 ? 'border-cyan-700 text-cyan-400 bg-cyan-950/20' :
                    i === arr.length - 1 ? 'border-[var(--bb-amber)] text-[var(--bb-amber)] bg-[rgba(255,176,0,0.06)]' :
                    'border-[var(--bb-line)] text-[var(--bb-text)]'
                  }>
                    {step}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* CTA footer */}
      <section className="landing-final-cta" aria-labelledby="landing-final-title">
        <div>
          <p className="eyebrow">YOUR NEXT IDEA IS WAITING</p>
          <h2 id="landing-final-title">
            Ready to master DSA?
          </h2>
          <p>
            Free to start. Track your progress, earn XP, and advance through the roadmap at your own pace.
          </p>
          <SignUpButton mode="modal">
            <button onClick={() => sfx.select()} className="bb-btn bb-btn-green landing-final-button">
              Create free account <span aria-hidden="true">→</span>
            </button>
          </SignUpButton>
          <p className="landing-facts">
            {TOPICS_PREVIEW.length} topics · structured learning · spaced repetition · live code execution
          </p>
        </div>
      </section>
      </main>
    </div>
  );
}

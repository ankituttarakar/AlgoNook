// AlgoNook — Visualization Learning Screen
// Dedicated screen for interactive visualizations in the learning flow.
// Connects existing VisualizationPlayer to the educational journey.

import { vizForTopic } from '../data/visualizations.js';
import { ROADMAP_NODE_MAP } from '../data/roadmap.js';
import VisualizationPlayer from '../components/VisualizationPlayer.jsx';
import { sfx } from '../game/sfx.js';
import { useState } from 'react';

export default function VisualizationScreen({ nodeId, onContinue, onBack, continueLabel }) {
  const [interacted, setInteracted] = useState(false);
  const node = ROADMAP_NODE_MAP[nodeId];
  const vizList = vizForTopic(nodeId);

  if (!node) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-8 pb-24">
        <button onClick={onBack} className="bb-btn bb-btn-ghost text-xs mb-4">
          ← Back
        </button>
        <p className="text-sm text-[var(--bb-muted)]">Topic not found.</p>
      </div>
    );
  }

  if (vizList.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-8 pb-24">
        <button
          onClick={() => { sfx.select(); onBack(); }}
          className="mb-5 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[var(--bb-muted)] hover:text-[var(--bb-text)] transition-colors"
        >
          ← Back
        </button>

        <div className="border border-[var(--bb-line)] bg-black/20 p-6 text-center">
          <p className="text-sm text-[var(--bb-muted)] mb-4">
            No interactive visualization is registered for <strong className="text-[var(--bb-text)]">{node.label}</strong> yet.
          </p>
          <p className="text-xs text-[var(--bb-muted)]">Return to the topic hub to continue when this visualization is available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-24">
      {/* Header */}
      <button
        onClick={() => { sfx.select(); onBack(); }}
        className="mb-5 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[var(--bb-muted)] hover:text-[var(--bb-text)] transition-colors"
      >
        ← Back to Concept
      </button>

      <div className="border border-[var(--bb-green-dim)] bg-[var(--bb-panel)] p-5 sm:p-6 mb-6">
        <div className="flex items-start gap-4 mb-3">
          <span className="font-mono text-3xl text-[var(--bb-green)] leading-none mt-1">
            {node.icon}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--bb-muted)] mb-1">
              Interactive Visualization
            </p>
            <h1 className="text-2xl font-bold text-[var(--bb-text)] leading-tight">
              {node.label} in Action
            </h1>
          </div>
          <span className="text-[9px] uppercase tracking-widest border border-[var(--bb-green-dim)] px-2 py-1 text-[var(--bb-green)] font-mono shrink-0">
            Step 2
          </span>
        </div>
        <p className="text-xs text-[var(--bb-muted)]">
          Watch how the algorithm works step-by-step. Understanding the mechanics builds intuition for problem-solving.
        </p>
      </div>

      {/* Visualizations */}
      <div className="space-y-6 mb-8">
        {vizList.map((viz) => (
          <VisualizationPlayer key={viz.id} vizId={viz.id} onInteraction={() => setInteracted(true)} />
        ))}
      </div>

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => { sfx.select(); onBack(); }}
          className="bb-btn bb-btn-ghost text-xs"
        >
          ← Back to Concept
        </button>
        <button
          onClick={() => { sfx.select(); onContinue(); }}
          disabled={!interacted}
          className="bb-btn bb-btn-green text-xs flex-1 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {interacted ? (continueLabel || 'Continue to Pattern Recognition →') : 'Use a visualization control to continue'}
        </button>
      </div>
    </div>
  );
}

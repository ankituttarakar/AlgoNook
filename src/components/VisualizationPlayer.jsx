// AlgoNook — Reusable Visualization Player
// Wraps any visualization component with a consistent frame.
// Add new visualizations by registering them in src/data/visualizations.js
// and creating a file in src/visualizations/.

import { lazy, Suspense } from 'react';
import { VIZ_MAP } from '../data/visualizations.js';

// Lazy-load each visualization to keep initial bundle small
const VIZ_COMPONENTS = {
  ArrayTraversalViz: lazy(() => import('../visualizations/ArrayTraversalViz.jsx')),
  TwoPointersViz:    lazy(() => import('../visualizations/TwoPointersViz.jsx')),
  BinarySearchViz:   lazy(() => import('../visualizations/BinarySearchViz.jsx')),
  HashTableViz:      lazy(() => import('../visualizations/HashTableViz.jsx')),
  ComplexityGrowthViz: lazy(() => import('../visualizations/ComplexityGrowthViz.jsx')),
  ChapterModelViz: lazy(() => import('../visualizations/ChapterModelViz.jsx')),
};

function VizSkeleton() {
  return (
    <div className="flex h-48 items-center justify-center border border-[var(--bb-line)] bg-black/20">
      <span className="text-xs text-[var(--bb-muted)]">Loading visualization…</span>
    </div>
  );
}

/**
 * Props:
 *   vizId   — string from VISUALIZATIONS registry
 *   compact — boolean, reduces padding for inline use
 */
export default function VisualizationPlayer({ vizId, compact = false, onInteraction }) {
  const meta = VIZ_MAP[vizId];
  if (!meta) {
    return (
      <div className="border border-[var(--bb-line)] bg-black/20 p-4 text-xs text-[var(--bb-muted)]">
        Visualization "{vizId}" not found.
      </div>
    );
  }

  const VizComponent = VIZ_COMPONENTS[meta.component];
  if (!VizComponent) {
    return (
      <div className="border border-[var(--bb-line)] bg-black/20 p-4 text-xs text-[var(--bb-muted)]">
        Visualization component "{meta.component}" not implemented yet.
      </div>
    );
  }

  return (
    <div className={compact ? '' : 'space-y-3'}>
      {!compact && (
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-[var(--bb-text)]">{meta.title}</h4>
            <p className="text-xs text-[var(--bb-muted)] mt-0.5">{meta.description}</p>
          </div>
          <span className="border border-[var(--bb-green-dim)] px-2 py-0.5 text-[9px] uppercase tracking-widest text-[var(--bb-green)]">
            Interactive
          </span>
        </div>
      )}

      {meta.concept && !compact && (
        <div className="border-l-2 border-[var(--bb-green-dim)] pl-3 text-xs text-[var(--bb-muted)] italic">
          {meta.concept}
        </div>
      )}

      <div
        onClickCapture={(event) => {
          if (event.target.closest('button,input,select')) onInteraction?.();
        }}
        onChangeCapture={(event) => {
          if (event.target.closest('input,select,textarea')) onInteraction?.();
        }}
        className={`border border-[var(--bb-line)] bg-[var(--bb-panel)] ${compact ? 'p-3' : 'p-4 sm:p-5'}`}
      >
        <Suspense fallback={<VizSkeleton />}>
          <VizComponent nodeId={meta.topicId} />
        </Suspense>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { SUPPLEMENTAL_BY_NODE } from '../data/supplementalCurriculum.js';

const TREE_POSITIONS = [{ x: 180, y: 34 }, { x: 105, y: 100 }, { x: 255, y: 100 }];
const GRAPH_POSITIONS = [{ x: 70, y: 62 }, { x: 165, y: 34 }, { x: 165, y: 112 }, { x: 265, y: 62 }];

function StructureDiagram({ nodeId, step }) {
  if (nodeId === 'trees') return <svg viewBox="0 0 360 145" role="img" aria-label="Binary tree traversal model" className="chapter-model-svg">
    <path d="M180 45 105 93M180 45 255 93" />
    {TREE_POSITIONS.map((point, index) => <g key={index} className={step.active === index ? 'is-active' : ''}><circle cx={point.x} cy={point.y} r="21" /><text x={point.x} y={point.y + 4} textAnchor="middle">{['A', 'B', 'C'][index]}</text></g>)}
  </svg>;
  if (nodeId === 'graphs') return <svg viewBox="0 0 335 145" role="img" aria-label="Connected graph traversal model" className="chapter-model-svg">
    <path d="M70 62 165 34M70 62 165 112M165 34 265 62M165 112 265 62" />
    {GRAPH_POSITIONS.map((point, index) => <g key={index} className={step.active === index ? 'is-active' : ''}><circle cx={point.x} cy={point.y} r="21" /><text x={point.x} y={point.y + 4} textAnchor="middle">{['A', 'B', 'C', 'D'][index]}</text></g>)}
  </svg>;
  return <div className={`chapter-model-values ${nodeId === 'dynamic-programming' ? 'is-table' : ''} ${nodeId === 'heaps' ? 'is-heap' : ''}`} role="img" aria-label={`${nodeId} state at step ${step.title}`}>
    {step.values.map((value, index) => <span key={`${index}-${value}`} className={`${step.active === index ? 'is-active' : ''} ${nodeId === 'sliding-window' && index >= step.start && index <= step.end ? 'in-window' : ''}`}>{value}<small>{nodeId === 'sliding-window' ? index : nodeId === 'dynamic-programming' ? `dp[${index}]` : ''}</small></span>)}
  </div>;
}

export default function ChapterModelViz({ nodeId }) {
  const model = SUPPLEMENTAL_BY_NODE[nodeId]?.visual;
  const [stepIndex, setStepIndex] = useState(0);
  if (!model) return <p className="text-xs text-[var(--bb-muted)]">This model is unavailable.</p>;
  const step = model.steps[stepIndex];
  const goTo = (next) => setStepIndex((current) => Math.max(0, Math.min(model.steps.length - 1, current + next)));

  return <section className="chapter-model-viz" aria-label={model.title}>
    <div className="chapter-model-frame"><StructureDiagram nodeId={nodeId} step={step} /></div>
    <div className="chapter-model-caption" aria-live="polite"><span>STEP {stepIndex + 1} / {model.steps.length}</span><strong>{step.title}</strong><p>{step.note}</p></div>
    <div className="chapter-model-controls">
      <button type="button" className="bb-btn bb-btn-ghost text-xs" onClick={() => goTo(-1)} disabled={stepIndex === 0}>← Previous</button>
      <div className="chapter-model-dots" aria-hidden="true">{model.steps.map((item, index) => <i key={item.title} className={index === stepIndex ? 'is-current' : ''} />)}</div>
      <button type="button" className="bb-btn bb-btn-green text-xs" onClick={() => goTo(1)} disabled={stepIndex === model.steps.length - 1}>Next state →</button>
    </div>
  </section>;
}

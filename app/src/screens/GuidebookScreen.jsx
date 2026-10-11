import { useState } from 'react';
import { ROADMAP_NODES } from '../data/roadmap.js';
import { SUPPLEMENTAL_BY_NODE } from '../data/supplementalCurriculum.js';
import { getConceptForNode } from '../data/concepts.js';
import { getPatternForNode } from '../data/patterns.js';
import { PATTERN_ATLAS } from '../data/patternAtlas.js';
import { CORE_GUIDE_NOTES } from '../data/coreGuideNotes.js';

const REFERENCE_READINGS = {
  default: [{ label: 'NeetCode DSA roadmap', href: 'https://neetcode.io/roadmap' }],
  arrays: [{ label: 'NeetCode DSA roadmap', href: 'https://neetcode.io/roadmap' }],
  hashing: [{ label: 'NeetCode HashMap reference', href: 'https://neetcode.io/cheatsheets/hashmap-crash-course' }],
  'binary-search': [{ label: 'CP-Algorithms: Binary Search', href: 'https://cp-algorithms.com/num_methods/binary_search.html' }],
  graphs: [{ label: 'CP-Algorithms: Breadth-First Search', href: 'https://cp-algorithms.com/graph/breadth-first-search.html' }, { label: 'NeetCode DSA roadmap', href: 'https://neetcode.io/roadmap' }],
};

function guideFor(node) {
  const supplemental = SUPPLEMENTAL_BY_NODE[node.id]?.notes;
  const coreNotes = CORE_GUIDE_NOTES[node.id];
  const concept = getConceptForNode(node.id);
  const pattern = getPatternForNode(node.id);
  if (!concept && !supplemental) return null;
  return {
    definition: supplemental?.definition || concept?.whatIsIt,
    intuition: supplemental?.intuition || concept?.keyIdea,
    whenToUse: supplemental?.whenToUse || concept?.whenToUse || [],
    whenNotToUse: supplemental?.whenNotToUse || coreNotes?.whenNotToUse || pattern?.antipatterns || [],
    operations: supplemental?.coreOperations || coreNotes?.coreOperations || [],
    patterns: supplemental?.patterns || coreNotes?.patterns || [pattern?.title].filter(Boolean),
    complexity: supplemental?.complexity || concept?.complexity || {},
    template: supplemental?.template || concept?.example?.code,
    mistakes: supplemental?.commonMistakes || coreNotes?.commonMistakes || [],
    clues: supplemental?.interviewClues || coreNotes?.interviewClues || pattern?.signals || [],
    related: supplemental?.relatedPatterns || pattern?.examples || [],
    examples: supplemental?.exampleProblems || concept?.example?.problem || pattern?.examples || [],
    references: REFERENCE_READINGS[node.id] || REFERENCE_READINGS.default,
  };
}

function NoteList({ items }) {
  if (!items?.length) return <p className="guidebook-muted">No separate items recorded for this section.</p>;
  return <ul className="guidebook-list">{items.map((item) => <li key={item}>{item}</li>)}</ul>;
}

export default function GuidebookScreen({ initialNodeId, onBack }) {
  const [selectedId, setSelectedId] = useState(initialNodeId || 'arrays');
  const [selectedPatternId, setSelectedPatternId] = useState(null);
  const node = ROADMAP_NODES.find((item) => item.id === selectedId) || ROADMAP_NODES[0];
  const guide = guideFor(node);
  const selectedPattern = PATTERN_ATLAS.find((item) => item.id === selectedPatternId);
  const selectChapter = (id) => { setSelectedId(id); setSelectedPatternId(null); };
  const selectPattern = (id) => setSelectedPatternId(id);
  return <main className="guidebook-shell">
    <button onClick={onBack} className="bb-btn bb-btn-ghost mb-5 text-xs">← Back to learning world</button>
    <header className="guidebook-hero floating-panel">
      <p className="eyebrow">ALGO NOOK / FIELD NOTES</p>
      <h1>DSA <em>Guidebook</em></h1>
      <p>Concise revision notes from the same chapter material you learn and practice. Pick a topic, retrieve the pattern, then check its limits.</p>
    </header>
    <p className="guidebook-section-label">CHAPTER NOTES</p><nav className="guidebook-topics" aria-label="Guidebook chapters">
      {ROADMAP_NODES.map((item, index) => <button key={item.id} type="button" className={!selectedPattern && selectedId === item.id ? 'is-selected' : ''} aria-pressed={!selectedPattern && selectedId === item.id} onClick={() => selectChapter(item.id)}><small>{String(index + 1).padStart(2, '0')}</small>{item.label}</button>)}
    </nav>
    <p className="guidebook-section-label">INTERVIEW PATTERN ATLAS</p><nav className="guidebook-topics" aria-label="Advanced interview patterns">
      {PATTERN_ATLAS.map((item, index) => <button key={item.id} type="button" className={selectedPatternId === item.id ? 'is-selected' : ''} aria-pressed={selectedPatternId === item.id} onClick={() => selectPattern(item.id)}><small>P{String(index + 1).padStart(2, '0')}</small>{item.title}</button>)}
    </nav>
    {selectedPattern ? <article className="guidebook-entry" key={selectedPattern.id}>
      <div className="guidebook-entry-heading"><span>⌘</span><div><small>INTERVIEW PATTERN</small><h2>{selectedPattern.title}</h2><p>Recognition and revision card</p></div></div>
      <div className="guidebook-grid">
        <section><h3>Definition</h3><p>{selectedPattern.definition}</p></section>
        <section><h3>Invariant / proof idea</h3><p>{selectedPattern.invariant}</p></section>
        <section><h3>When to use</h3><NoteList items={selectedPattern.signals} /></section>
        <section><h3>Complexity</h3><p>{selectedPattern.complexity}</p></section>
        <section className="guidebook-code"><h3>Implementation sketch</h3><pre><code>{selectedPattern.template}</code></pre></section>
        <section><h3>Common pitfall</h3><p>{selectedPattern.pitfall}</p></section>
        <section><h3>Example problems</h3><NoteList items={selectedPattern.examples} /></section>
      </div>
    </article> : guide ? <article className="guidebook-entry" key={node.id}>
      <div className="guidebook-entry-heading"><span>{node.icon}</span><div><small>CHAPTER NOTES</small><h2>{node.label}</h2><p>{node.subtitle}</p></div></div>
      <div className="guidebook-grid">
        <section><h3>Definition</h3><p>{guide.definition}</p></section>
        <section><h3>Intuition</h3><p>{guide.intuition}</p></section>
        <section><h3>When to use</h3><NoteList items={guide.whenToUse} /></section>
        <section><h3>When not to use</h3><NoteList items={guide.whenNotToUse} /></section>
        <section><h3>Core operations</h3><NoteList items={guide.operations} /></section>
        <section><h3>Common patterns</h3><NoteList items={guide.patterns} /></section>
        <section><h3>Complexity</h3><dl className="guidebook-complexity">{Object.entries(guide.complexity).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></section>
        {guide.template && <section className="guidebook-code"><h3>Implementation sketch</h3><pre><code>{guide.template}</code></pre></section>}
        <section><h3>Common mistakes</h3><NoteList items={guide.mistakes} /></section>
        <section><h3>Interview clues</h3><NoteList items={guide.clues} /></section>
        <section><h3>Related patterns</h3><NoteList items={guide.related} /></section>
        <section><h3>Example problems</h3><NoteList items={Array.isArray(guide.examples) ? guide.examples : [guide.examples]} /></section>
        <section><h3>Further reading</h3><ul className="guidebook-list">{guide.references.map((source) => <li key={source.href}><a href={source.href} target="_blank" rel="noreferrer">{source.label} ↗</a></li>)}</ul><p className="guidebook-muted mt-2">External references support these original AlgoNook revision notes; learning progress is shown separately in Review.</p></section>
      </div>
    </article> : <p role="status">Chapter notes are not available.</p>}
  </main>;
}

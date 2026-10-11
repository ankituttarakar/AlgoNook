// AlgoNook — Visualization Registry
// To add a new visualization:
//   1. Create a file in src/visualizations/<name>.jsx
//   2. Add an entry to VISUALIZATIONS below
//   3. The VisualizationPlayer component reads this registry — no other changes needed.

/**
 * Each entry defines a visualization that can be embedded in topic/concept pages.
 * id         — unique key used in roadmap node data and URLs
 * topicId    — which roadmap topic this visualization belongs to
 * title      — display name shown in the learning page
 * description — one-sentence summary
 * component  — lazy-loaded React component path (relative to src/visualizations/)
 */
import { SUPPLEMENTAL_CURRICULUM } from './supplementalCurriculum.js';
export const VISUALIZATIONS = [
  {
    id: 'complexity-growth',
    topicId: 'foundations',
    title: 'Compare Growth Rates',
    description: 'Change the input size and compare representative operation counts across common complexity classes.',
    concept: 'The logarithmic vertical scale keeps both slow and fast growth visible; counts are illustrative, not wall-clock timings.',
    component: 'ComplexityGrowthViz',
  },
  {
    id: 'array-traversal',
    topicId: 'arrays',
    title: 'Array Traversal',
    description: 'Watch a pointer move through an array, reading each element in order.',
    concept: 'Understand index-based access and O(n) linear traversal.',
    component: 'ArrayTraversalViz',
  },
  {
    id: 'two-pointers',
    topicId: 'two-pointers',
    title: 'Two Pointers',
    description: 'See left and right pointers converge on a sorted array to find a target sum.',
    concept: 'Two opposite-moving indices eliminate O(n²) brute force.',
    component: 'TwoPointersViz',
  },
  {
    id: 'hash-table',
    topicId: 'hashing',
    title: 'Hash Table Lookup',
    description: 'See how keys hash into buckets for O(1) average lookup.',
    concept: 'A hash function maps keys directly to buckets — no scanning needed.',
    component: 'HashTableViz',
  },
  {
    id: 'binary-search',
    topicId: 'binary-search',
    title: 'Binary Search',
    description: 'Watch lo/mid/hi pointers narrow the search space by half each step.',
    concept: 'O(log n) search: halve the search space at every decision.',
    component: 'BinarySearchViz',
  },
  ...SUPPLEMENTAL_CURRICULUM.map((chapter) => ({
    id: chapter.visual.id,
    topicId: chapter.id,
    title: chapter.visual.title,
    description: chapter.visual.description,
    concept: chapter.visual.concept,
    component: 'ChapterModelViz',
  })),
];

export const VIZ_MAP = Object.fromEntries(VISUALIZATIONS.map((v) => [v.id, v]));

/** Get all visualizations for a given topic */
export function vizForTopic(topicId) {
  return VISUALIZATIONS.filter((v) => v.topicId === topicId);
}

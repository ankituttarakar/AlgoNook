import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  getGuideKeyboardAction,
  getResumeDestination,
  GUIDE_ROUTE_FEATURES,
  guidePanelReducer,
  isGuideActionAllowed,
  matchGuideQuery,
} from '../src/lib/guideAssistant.js';

const appSource = () => readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
const componentSource = () => readFile(new URL('../src/components/AlgoNookGuide.jsx', import.meta.url), 'utf8');
const helperSource = () => readFile(new URL('../src/lib/guideAssistant.js', import.meta.url), 'utf8');

test('Guide route registry uses only existing main app destinations', async () => {
  assert.deepEqual(GUIDE_ROUTE_FEATURES.map(({ id }) => id), [
    'learn', 'shorts', 'notes', 'practice', 'challenges', 'arena', 'leaderboard', 'review', 'roadmap', 'profile',
  ]);
  const source = await appSource();
  for (const route of ['learn', 'shorts', 'guidebook', 'practice', 'challenges', 'arena', 'leaderboard', 'review', 'roadmap', 'profile']) {
    assert.ok(source.includes(`'${route}'`), `Expected existing app route: ${route}`);
  }
});

test('feature synonyms and ordinary navigation requests resolve locally', () => {
  const cases = [
    ['where are my videos', 'learn'],
    ['open the dsa short videos', 'shorts'],
    ['take me to revision notes', 'guidebook'],
    ['find training exercises', 'practice-hub'],
    ['show missions', 'challenges'],
    ['open rankings', 'leaderboard'],
    ['show spaced review', 'review'],
    ['go to my account', 'profile'],
  ];
  for (const [query, target] of cases) {
    const response = matchGuideQuery(query);
    assert.equal(response.kind, 'results', query);
    assert.equal(response.results[0].target, target, query);
  }
});

test('topic synonyms and natural language return existing topic destinations', () => {
  const cases = [
    ['show me linked list videos', 'learn', 'linked'],
    ['where can I practice FIFO', 'practice', 'stacks-queues'],
    ['find binary-search notes', 'guidebook', 'binary-search'],
    ['shorts about quick sort', 'shorts', 'sorting'],
    ['I want to learn recursion', 'learn', 'recursion'],
    ['show me binary trees', 'topic', 'trees'],
    ['videos for graph theory', 'learn', 'graphs'],
    ['where can I study memoization', 'learn', 'dp'],
  ];
  for (const [query, target, nodeId] of cases) {
    const response = matchGuideQuery(query);
    assert.equal(response.kind, 'results', query);
    assert.equal(response.results[0].target, target, query);
    assert.equal(response.results[0].nodeId, nodeId, query);
  }
  const typo = matchGuideQuery('find linked lisk');
  assert.ok(typo.results.some((result) => result.nodeId === 'linked'));
});

test('topic-only requests offer real choices; multiple topics ask for clarification', () => {
  const oneTopic = matchGuideQuery('arrays');
  assert.equal(oneTopic.kind, 'results');
  assert.deepEqual(oneTopic.results.map((result) => result.target), ['topic', 'learn', 'shorts', 'guidebook', 'practice']);
  const ambiguous = matchGuideQuery('trees and graphs');
  assert.equal(ambiguous.kind, 'clarify');
  assert.deepEqual(new Set(ambiguous.results.map((result) => result.nodeId)), new Set(['trees', 'graphs']));
  const featureAmbiguity = matchGuideQuery('Learn and Notes');
  assert.equal(featureAmbiguity.kind, 'clarify');
  assert.deepEqual(new Set(featureAmbiguity.results.map((result) => result.target)), new Set(['learn', 'guidebook']));
});

test('built-in FAQ explains verified app features and unsupported requests stay scoped', () => {
  assert.match(matchGuideQuery('What are Notes?').text, /chapter revision notes/i);
  assert.match(matchGuideQuery('What is Learn?').text, /curated video library/i);
  assert.match(matchGuideQuery('What are Shorts?').text, /separate DSA discovery feed/i);
  assert.match(matchGuideQuery('solve two sum for me').text, /Guide is for navigating AlgoNook, not solving/i);
  assert.equal(matchGuideQuery('book a flight').kind, 'unsupported');
});

test('navigation actions reject unknown routes, IDs, URLs, and extra parameters', () => {
  assert.equal(isGuideActionAllowed({ target: 'shorts', label: 'Arrays Shorts', nodeId: 'arrays' }), true);
  assert.equal(isGuideActionAllowed({ target: 'guidebook', label: 'Notes' }), true);
  assert.equal(isGuideActionAllowed({ target: 'javascript:', label: 'Go' }), false);
  assert.equal(isGuideActionAllowed({ target: 'topic', label: 'External', nodeId: 'https://example.com' }), false);
  assert.equal(isGuideActionAllowed({ target: 'learn', label: 'Anything', nodeId: 'unknown-topic' }), false);
  assert.equal(isGuideActionAllowed({ target: 'arena', label: 'Arena', href: 'https://example.com' }), false);
});

test('resume suggestion uses only the latest unfinished hydrated topic and does not mutate progress', () => {
  const save = { topics: {
    arrays: { startedAt: 10, completedAt: null, stages: { concept: true } },
    trees: { startedAt: 20, completedAt: null, stages: { concept: true } },
    graphs: { startedAt: 30, completedAt: 31, stages: { concept: true } },
  } };
  const before = structuredClone(save);
  assert.deepEqual(getResumeDestination(save), { target: 'topic', label: 'Continue Trees', nodeId: 'trees' });
  assert.deepEqual(save, before);
  assert.equal(getResumeDestination({ topics: {} }), null);
  assert.equal(matchGuideQuery('continue my current path', save).results[0].nodeId, 'trees');
});

test('keyboard handling and panel visibility state support submit, Escape, and close', async () => {
  assert.equal(getGuideKeyboardAction({ key: 'Enter' }), 'submit');
  assert.equal(getGuideKeyboardAction({ key: 'Enter', shiftKey: true }), null);
  assert.equal(getGuideKeyboardAction({ key: 'Enter', isComposing: true }), null);
  assert.equal(getGuideKeyboardAction({ key: 'Escape' }), 'close');
  assert.equal(guidePanelReducer(false, 'OPEN'), true);
  assert.equal(guidePanelReducer(true, 'ESCAPE'), false);
  assert.equal(guidePanelReducer(true, 'CLOSE'), false);

  const source = await componentSource();
  assert.match(source, /\{isOpen && \(/);
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-expanded=\{isOpen\}/);
  assert.match(source, /aria-label="Close AlgoNook Guide"/);
  assert.match(source, /onKeyDown=\{handleInputKeyDown\}/);
  assert.match(source, /dispatchPanel\('ESCAPE'\)/);
  assert.match(source, /<form className="guide-composer" onSubmit=/);
});

test('Guide mounts in the authenticated progress-hydrated shell and uses app navigation', async () => {
  const [source, component] = await Promise.all([appSource(), componentSource()]);
  assert.match(source, /import AlgoNookGuide from '\.\/components\/AlgoNookGuide\.jsx'/);
  assert.match(source, /<HydrationGate>[\s\S]*?<AlgoNookGuide onNavigate=\{navigate\} \/>/);
  assert.match(source, /if \(target === 'topic'\) return `\/topic\/\$\{encodeURIComponent\(nodeId\)\}`/);
  assert.match(source, /if \(\['concept', 'visualize', 'complexity', 'pattern', 'practice', 'game'\]\.includes\(target\)\)/);
  assert.ok(component.indexOf('if (!isGuideActionAllowed(destination)) return;') < component.indexOf('onNavigate(destination.target'));
});

test('matching stays local, does not persist chats, and adds no AI/API calls', async () => {
  const [helper, component] = await Promise.all([helperSource(), componentSource()]);
  assert.doesNotMatch(helper, /fetch\s*\(|XMLHttpRequest|\/api\/|OpenAI|Gemini|OpenRouter|import\.meta\.env/);
  assert.doesNotMatch(component, /fetch\s*\(|localStorage|sessionStorage|indexedDB|\/api\//);
});

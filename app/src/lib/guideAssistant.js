import { LEARN_TOPICS } from '../data/learnVideos.js';
import { ROADMAP_NODES } from '../data/roadmap.js';

const ROUTE_FEATURES = [
  { id: 'learn', label: 'Learn', target: 'learn', aliases: ['learn', 'study', 'study materials', 'courses', 'videos', 'video library', 'tutorials', 'lessons'] },
  { id: 'shorts', label: 'Shorts', target: 'shorts', aliases: ['shorts', 'dsa shorts', 'short videos'] },
  { id: 'notes', label: 'Notes', target: 'guidebook', aliases: ['notes', 'guidebook', 'revision notes', 'chapter notes'] },
  { id: 'practice', label: 'Practice', target: 'practice-hub', aliases: ['practice', 'practice hub', 'training', 'exercises'] },
  { id: 'challenges', label: 'Challenges', target: 'challenges', aliases: ['challenges', 'challenge', 'missions'] },
  { id: 'arena', label: 'Arena', target: 'arena', aliases: ['arena', 'battle arena'] },
  { id: 'leaderboard', label: 'Leaderboard', target: 'leaderboard', aliases: ['leaderboard', 'rankings', 'scores'] },
  { id: 'review', label: 'Review', target: 'review', aliases: ['review', 'mastery', 'spaced review'] },
  { id: 'roadmap', label: 'Roadmap', target: 'roadmap', aliases: ['roadmap', 'learning path', 'learning roadmap'] },
  { id: 'profile', label: 'Profile', target: 'profile', aliases: ['profile', 'account', 'player profile'] },
];

const TOPIC_ALIASES = {
  arrays: ['array', 'arrays', 'array data structure'],
  linked: ['linked list', 'linked lists', 'link list', 'linked-list', 'll'],
  stacks: ['stack', 'stacks', 'lifo'],
  queues: ['queue', 'queues', 'fifo'],
  searching: ['search', 'searching', 'binary search'],
  sorting: ['sort', 'sorting', 'merge sort', 'quick sort', 'quicksort'],
  recursion: ['recursion', 'recursive', 'backtracking'],
  trees: ['tree', 'trees', 'binary tree', 'binary trees', 'bst'],
  graphs: ['graph', 'graphs', 'graph theory'],
  dp: ['dp', 'dynamic programming', 'memoization', 'tabulation'],
};

const TOPICS = LEARN_TOPICS.map((topic) => {
  const node = ROADMAP_NODES.find((item) => item.id === topic.roadmapNodeId);
  return node ? {
    id: topic.id,
    label: topic.label,
    nodeId: node.id,
    nodeLabel: node.label,
    aliases: TOPIC_ALIASES[topic.id] || [topic.label.toLowerCase()],
  } : null;
}).filter(Boolean);

const APP_FAQ = [
  { id: 'learn', aliases: ['learn'], answer: 'Learn is AlgoNook’s curated video library. Choose a DSA topic to browse its learning videos.' },
  { id: 'shorts', aliases: ['shorts'], answer: 'Shorts is a separate DSA discovery feed. You can filter it by topic and open videos in the Shorts viewer.' },
  { id: 'notes', aliases: ['notes', 'guidebook'], answer: 'Notes opens the DSA Guidebook: chapter revision notes, interview patterns, complexity, and implementation sketches.' },
  { id: 'practice', aliases: ['practice'], answer: 'Practice opens the training hub, where you can use recommendations or choose a chapter.' },
  { id: 'review', aliases: ['review'], answer: 'Review shows your mastery and skills that are due for spaced review.' },
  { id: 'progress', aliases: ['progress', 'xp', 'mastery'], answer: 'Your learning progress is loaded for your signed-in account. Guide only reads the progress already available in this app and never changes it.' },
  { id: 'guide', aliases: ['guide', 'assistant', 'algo nook guide'], answer: 'AlgoNook Guide matches your message locally to app sections and topics. It does not use an AI service or save chat history.' },
];

const STOP_WORDS = new Set(['a', 'an', 'and', 'are', 'at', 'can', 'do', 'for', 'find', 'get', 'go', 'help', 'i', 'in', 'is', 'me', 'my', 'of', 'on', 'open', 'please', 'show', 'take', 'tell', 'the', 'to', 'where', 'with']);
const ALLOWED_TOP_LEVEL_TARGETS = new Set(['home', 'roadmap', 'learn', 'shorts', 'guidebook', 'practice-hub', 'challenges', 'arena', 'leaderboard', 'review', 'profile']);
const ROADMAP_NODE_IDS = new Set(ROADMAP_NODES.map((node) => node.id));
const LEARN_TOPIC_IDS = new Set(LEARN_TOPICS.map((topic) => topic.id));

function normalizeText(value) {
  return String(value || '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function editDistance(left, right) {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const above = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (left[i - 1] === right[j - 1] ? 0 : 1));
      previous = above;
    }
  }
  return row[right.length];
}

function aliasScore(text, alias) {
  const normalizedAlias = normalizeText(alias);
  if (!normalizedAlias) return 0;
  if (` ${text} `.includes(` ${normalizedAlias} `)) return 20 + normalizedAlias.split(' ').length;
  const aliasTokens = normalizedAlias.split(' ');
  const queryTokens = text.split(' ').filter((token) => !STOP_WORDS.has(token));
  if (aliasTokens.every((aliasToken) => queryTokens.some((token) => token === aliasToken
    || (aliasToken.length >= 4 && token.length >= 4 && editDistance(token, aliasToken) === 1)))) return 8;
  return 0;
}

function bestAliasScore(text, aliases) {
  return aliases.reduce((best, alias) => Math.max(best, aliasScore(text, alias)), 0);
}

function matchesFor(text, items) {
  return items
    .map((item) => ({ item, score: bestAliasScore(text, item.aliases) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);
}

function mostSpecificMatches(text, items) {
  const matches = matchesFor(text, items);
  if (!matches.length) return [];
  const highestScore = matches[0].score;
  return matches.filter(({ score }) => score === highestScore).map(({ item }) => item);
}

function action(target, label, nodeId) {
  return nodeId ? { target, label, nodeId } : { target, label };
}

export function isGuideActionAllowed(candidate) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return false;
  if (Object.keys(candidate).some((key) => !['target', 'label', 'nodeId'].includes(key))) return false;
  if (typeof candidate.label !== 'string' || candidate.label.length > 80) return false;
  if (candidate.target === 'topic' || candidate.target === 'practice') {
    return typeof candidate.nodeId === 'string' && ROADMAP_NODE_IDS.has(candidate.nodeId);
  }
  if (candidate.target === 'guidebook') {
    return candidate.nodeId === undefined || ROADMAP_NODE_IDS.has(candidate.nodeId);
  }
  if (candidate.target === 'learn' || candidate.target === 'shorts') {
    return candidate.nodeId === undefined || LEARN_TOPIC_IDS.has(candidate.nodeId);
  }
  return ALLOWED_TOP_LEVEL_TARGETS.has(candidate.target) && candidate.nodeId === undefined;
}

function safeAction(target, label, nodeId) {
  const candidate = action(target, label, nodeId);
  return isGuideActionAllowed(candidate) ? candidate : null;
}

function topicDestinations(topic, preferredFeature) {
  const topicPage = safeAction('topic', `${topic.nodeLabel} roadmap chapter`, topic.nodeId);
  const learn = safeAction('learn', `${topic.label} videos`, topic.id);
  const shorts = safeAction('shorts', `${topic.label} Shorts`, topic.id);
  const notes = safeAction('guidebook', `${topic.nodeLabel} notes`, topic.nodeId);
  const practice = safeAction('practice', `${topic.nodeLabel} practice`, topic.nodeId);
  const byFeature = { learn, shorts, notes, practice, roadmap: topicPage };
  if (preferredFeature && byFeature[preferredFeature]) return [byFeature[preferredFeature]].filter(Boolean);
  return [topicPage, learn, shorts, notes, practice].filter(Boolean);
}

function featureAction(feature) {
  return safeAction(feature.target, feature.label);
}

function findFaq(text, features, topics) {
  const asksAboutApp = /\b(what|how|where|tell|explain|about|does|do)\b/.test(text);
  if (!asksAboutApp || topics.length) return null;
  const matches = matchesFor(text, APP_FAQ);
  const faq = matches[0]?.item;
  if (!faq) return null;
  const relatedFeature = features.find((feature) => feature.id === faq.id);
  const destination = relatedFeature ? featureAction(relatedFeature) : null;
  return {
    kind: 'answer',
    text: faq.answer,
    results: destination ? [destination] : [],
  };
}

export function getResumeDestination(save) {
  const progress = save?.topics && typeof save.topics === 'object' ? save.topics : {};
  const candidates = ROADMAP_NODES
    .map((node) => ({ node, progress: progress[node.id] }))
    .filter(({ progress: topicProgress }) => topicProgress?.startedAt && !topicProgress?.completedAt)
    .sort((a, b) => Number(b.progress.startedAt) - Number(a.progress.startedAt));
  const candidate = candidates[0];
  return candidate ? safeAction('topic', `Continue ${candidate.node.label}`, candidate.node.id) : null;
}

export function getGuideKeyboardAction({ key, shiftKey = false, isComposing = false } = {}) {
  if (key === 'Escape') return 'close';
  if (key === 'Enter' && !shiftKey && !isComposing) return 'submit';
  return null;
}

export function guidePanelReducer(isOpen, event) {
  if (event === 'OPEN') return true;
  if (event === 'CLOSE' || event === 'ESCAPE') return false;
  return isOpen;
}

export function matchGuideQuery(query, save) {
  const text = normalizeText(query);
  if (!text) return { kind: 'unsupported', text: 'Type a section or DSA topic and I’ll point you to the right place.' };

  const resumeIntent = /\b(resume|continue|pick up|where i left off|my current path)\b/.test(text);
  if (resumeIntent) {
    const destination = getResumeDestination(save);
    return destination
      ? { kind: 'results', text: 'Your latest unfinished roadmap chapter is here:', results: [destination] }
      : { kind: 'answer', text: 'I don’t see an unfinished roadmap chapter in the progress currently available to me. You can open the Roadmap and choose a chapter.', results: [safeAction('roadmap', 'Open Roadmap')] };
  }

  const features = mostSpecificMatches(text, ROUTE_FEATURES);
  const topics = mostSpecificMatches(text, TOPICS);
  const faq = findFaq(text, features, topics);
  if (faq) return faq;

  const asksDsaQuestion = /\b(solve|write|implement|debug)\b/.test(text)
    || (/\b(explain|what is|how does)\b/.test(text) && topics.length > 0);
  if (asksDsaQuestion) {
    const topic = topics[0];
    if (!topic) {
      return { kind: 'unsupported', text: 'Guide is for navigating AlgoNook, not solving DSA questions. Ask me to find a topic, learning resource, or app feature.' };
    }
    return {
      kind: 'results',
      text: `I can help you find AlgoNook resources for ${topic.label}, but Guide is for app navigation rather than solving DSA questions.`,
      results: topicDestinations(topic),
    };
  }

  if (features.length > 1) {
    return {
      kind: 'clarify',
      text: 'Which part would you like to open?',
      results: [...new Map(features.map((feature) => [feature.id, featureAction(feature)])).values()].filter(Boolean),
    };
  }

  if (features.length === 1 && topics.length > 1) {
    return {
      kind: 'clarify',
      text: `Which topic should I use for ${features[0].label}?`,
      results: topics.slice(0, 5).map((topic) => topicDestinations(topic, features[0].id)).flat().filter(Boolean),
    };
  }

  if (features.length === 1 && topics.length === 1) {
    const feature = features[0];
    const topic = topics[0];
    const destination = topicDestinations(topic, feature.id)[0] || featureAction(feature);
    return { kind: 'results', text: `Here’s ${feature.label} for ${topic.label}:`, results: [destination].filter(Boolean) };
  }

  if (features.length === 1) {
    const feature = features[0];
    const destination = featureAction(feature);
    return { kind: 'results', text: `You can open ${feature.label} here:`, results: destination ? [destination] : [] };
  }

  if (topics.length > 1) {
    return {
      kind: 'clarify',
      text: 'I found a few topics. Which one are you looking for?',
      results: topics.slice(0, 5).map((topic) => safeAction('topic', `${topic.label} roadmap chapter`, topic.nodeId)).filter(Boolean),
    };
  }

  if (topics.length === 1) {
    return { kind: 'results', text: `Here are places to learn ${topics[0].label}:`, results: topicDestinations(topics[0]) };
  }

  return {
    kind: 'unsupported',
    text: 'I can help locate app sections and supported DSA topics. Try “find Learn,” “notes on trees,” or “practice arrays.”',
  };
}

export const GUIDE_SUGGESTED_PROMPTS = [
  'Find Learn videos',
  'Shorts for Arrays',
  'What are Notes?',
  'Find practice for trees',
];

export const GUIDE_ROUTE_FEATURES = ROUTE_FEATURES;

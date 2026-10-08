// AlgoNook — world sectors (DSA topics), in progression order

export const TOPICS = [
  { id: 'arrays',   sec: '01', name: 'ARRAYS',             glyph: '[ ]', tag: 'Contiguous memory. The first weapon.' },
  { id: 'strings',  sec: '02', name: 'STRINGS',            glyph: '" "', tag: 'Text is just arrays in a trench coat.' },
  { id: 'linked',   sec: '03', name: 'LINKED LISTS',       glyph: '->*', tag: 'Nodes chained through the void.' },
  { id: 'stacks',   sec: '04', name: 'STACKS',             glyph: '[=]', tag: 'Last in, first out. Discipline.' },
  { id: 'queues',   sec: '05', name: 'QUEUES',             glyph: '>>>', tag: 'First in, first out. Fairness.' },
  { id: 'hashing',  sec: '06', name: 'HASHING',            glyph: '#::', tag: 'Instant lookup, at a price.' },
  { id: 'recursion',sec: '07', name: 'RECURSION',          glyph: '(())', tag: 'To understand it, understand it.' },
  { id: 'trees',    sec: '08', name: 'TREES',              glyph: '/\\', tag: 'Hierarchy grows downward here.' },
  { id: 'bst',      sec: '09', name: 'BINARY SEARCH TREES',glyph: '</>', tag: 'Order inside the hierarchy.' },
  { id: 'heaps',    sec: '10', name: 'HEAPS',              glyph: '_/\\_', tag: 'The priority never sleeps.' },
  { id: 'graphs',   sec: '11', name: 'GRAPHS',             glyph: 'o-o', tag: 'Everything is connected.' },
  { id: 'sorting',  sec: '12', name: 'SORTING',            glyph: '321', tag: 'Chaos in. Order out.' },
  { id: 'searching',sec: '13', name: 'SEARCHING',          glyph: '[?]', tag: 'Find the needle. Fast.' },
  { id: 'dp',       sec: '14', name: 'DYNAMIC PROGRAMMING',glyph: ':::', tag: 'Never solve the same thing twice.' },
];

export const TOPIC_MAP = Object.fromEntries(TOPICS.map((t) => [t.id, t]));

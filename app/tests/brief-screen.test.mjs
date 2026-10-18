import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { MISSIONS, MISSION_MAP } from '../src/data/missions/index.js';
import { TOPIC_MAP } from '../src/data/topics.js';

const vite = await createServer({
  configFile: './vite.config.ts',
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
});

let BriefScreen;
try {
  ({ default: BriefScreen } = await vite.ssrLoadModule('/src/screens/BriefScreen.jsx'));
} catch (error) {
  await vite.close();
  throw error;
}

test.after(async () => vite.close());

function renderBrief(mission) {
  return renderToStaticMarkup(createElement(BriefScreen, {
    mission,
    cleared: {},
    onDeploy() {},
    onBack() {},
  }));
}

function escapeHtml(text) {
  return text.replaceAll('&', '&amp;').replaceAll("'", '&#x27;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

test('every registered mission has accurate, renderable intel notes and a valid topic', () => {
  assert.ok(MISSIONS.length > 0);
  for (const mission of MISSIONS) {
    assert.ok(Array.isArray(mission.intel), `${mission.id} must define intel as an array`);
    assert.ok(mission.intel.length > 0, `${mission.id} must include at least one intel note`);
    assert.ok(mission.intel.every((line) => typeof line === 'string' && line.trim()), `${mission.id} has invalid intel notes`);
    assert.ok(TOPIC_MAP[mission.topic], `${mission.id} has unknown topic ${mission.topic}`);
  }
});

test('a mission with absent or malformed optional intel renders a graceful fallback', () => {
  const mission = MISSION_MAP['code-max-profit'];
  for (const intel of [undefined, null, 'not an array', [null, 42]]) {
    const html = renderBrief({ ...mission, intel });
    assert.match(html, /No intel notes are available for this mission\./);
    assert.match(html, /Start problem-solving exercise/);
  }
});

test('existing mission intel, topic metadata, challenge metadata, and launch action render', () => {
  const mission = MISSION_MAP['arr-3'];
  const html = renderBrief(mission);
  assert.match(html, new RegExp(`SEC-${TOPIC_MAP[mission.topic].sec} · ${TOPIC_MAP[mission.topic].name}`));
  assert.match(html, /SECTOR BOSS/);
  for (const note of mission.intel) assert.ok(html.includes(escapeHtml(note)), `missing mission note: ${note}`);
  assert.match(html, /OBJECTIVES:/);
  assert.match(html, /Deploy/);
});

test('coding-problem brief renders verified notes and launches the existing problem workflow', () => {
  const mission = MISSION_MAP['code-max-profit'];
  const html = renderBrief(mission);
  for (const note of mission.intel) assert.ok(html.includes(escapeHtml(note)));
  assert.match(html, /SEC-01 · ARRAYS/);
  assert.match(html, /DSA PROBLEM WORKFLOW/);
  assert.match(html, /Start problem-solving exercise/);
});

test('an invalid topic is reported as invalid mission data instead of an undefined-field crash', () => {
  assert.throws(
    () => renderBrief({ ...MISSION_MAP['arr-1'], topic: 'missing-topic' }),
    /references unknown topic "missing-topic"/,
  );
});

test('invalid required challenge metadata is reported clearly', () => {
  assert.throws(
    () => renderBrief({ ...MISSION_MAP['arr-1'], challenges: {} }),
    /has invalid challenge metadata; expected an array/,
  );
  assert.throws(
    () => renderBrief({ ...MISSION_MAP['arr-1'], challenges: [{ d: 'unknown' }] }),
    /has invalid challenge difficulty metadata/,
  );
});

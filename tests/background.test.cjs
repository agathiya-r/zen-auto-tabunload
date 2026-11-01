const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..', 'extension');

function harness() {
  let now = 1_000_000;
  const event = () => { const listeners = []; return { addListener(fn) { listeners.push(fn); }, emit(...args) { for (const fn of listeners) fn(...args); }, listeners }; };
  const tabs = [
    { id: 1, windowId: 1, active: true, status: 'complete', lastAccessed: now },
    { id: 2, windowId: 1, active: false, pinned: true, status: 'complete', lastAccessed: now },
  ];
  let discards = [];
  let frames = [{ playing: false, complete: true }];
  let probeError = false;
  let essential = false;
  const browser = {
    tabs: {
      onActivated: event(), onUpdated: event(), onCreated: event(), onRemoved: event(), onDetached: event(), onAttached: event(),
      async query() { return tabs.map(t => ({ ...t })); }, async get(id) { return { ...tabs.find(t => t.id === id) }; },
      async executeScript() { if (probeError) throw Error('unreadable'); return frames; },
    },
    windows: { onRemoved: event() },
    storage: { local: { async get() { return { settings: { enabled: true, idleMinutes: 1 } }; }, async set() {} } },
    alarms: { create() {}, onAlarm: event() },
    runtime: { id: 'test', getURL: p => 'moz-extension://test/' + p, onMessage: event() },
    zenTabs: { async list() { return tabs.map(t => ({ ...t })); },
      async inspect(id) { return { reason: essential && id === 2 ? 'essential' : null, documentId: '1', lastAccessed: tabs.find(t => t.id === id).lastAccessed }; },
      async discard(id) { discards.push(id); return true; } },
  };
  const ctx = vm.createContext({ browser, Date: class extends Date { static now() { return now; } }, console });
  for (const file of ['policy.js', 'background.js']) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx);
  const send = message => browser.runtime.onMessage.listeners[0](message, { id: 'test', url: 'moz-extension://test/options.html', tab: { id: 1 } });
  return { browser, tabs, send, advance: ms => { now += ms; }, discards: () => discards, reset: () => { discards = []; }, frames: f => { frames = f; }, failProbe: () => { probeError = true; }, essential: () => { essential = true; } };
}

test('startup grace, exact timeout, and settings-page messaging', async () => {
  const h = harness();
  await h.send({ type: 'status' });
  h.advance(59999); await h.send({ type: 'sweep' }); assert.deepEqual(h.discards(), []);
  h.advance(1); await h.send({ type: 'sweep' }); assert.deepEqual(h.discards(), [2]);
});
test('leaving a long-active tab starts a full new timeout', async () => {
  const h = harness(); await h.send({ type: 'status' });
  h.advance(3_600_000);
  h.tabs[0].active = false; h.tabs[1].active = true;
  h.browser.tabs.onActivated.emit({ tabId: 2, windowId: 1 });
  await h.send({ type: 'sweep' }); assert.deepEqual(h.discards(), []);
  h.advance(60000); await h.send({ type: 'sweep' }); assert.deepEqual(h.discards(), [1]);
});
test('playing media, unreadable frames, and Essentials remain loaded', async () => {
  for (const mode of ['media', 'unreadable', 'essential']) {
    const h = harness(); await h.send({ type: 'status' });h.advance(60000);
    if (mode === 'media') h.frames([{ playing: true, complete: true }]);
    if (mode === 'unreadable') h.failProbe();
    if (mode === 'essential') h.essential();
    await h.send({ type: 'sweep' });assert.deepEqual(h.discards(), [], mode);
  }
});
test('pausing from the settings page prevents unloading', async () => {
  const h = harness();await h.send({ type: 'status' });h.advance(60000);
  await h.send({ type: 'save', settings: { enabled: false, idleMinutes: 1 } });
  await h.send({ type: 'sweep' });assert.deepEqual(h.discards(), []);
});
test('inactive-space tabs omitted by standard query are still checked in every window', async () => {
  const h = harness();
  // Simulate Zen: standard query can see only the current space's active tab.
  h.browser.tabs.query = async () => [{ ...h.tabs[0] }];
  h.tabs.push({ id: 3, windowId: 1, active: false, hidden: true, status: 'complete', lastAccessed: 1000000 });
  h.tabs.push({ id: 4, windowId: 2, active: false, hidden: true, status: 'complete', lastAccessed: 1000000 });
  await h.send({ type: 'status' });h.advance(60000);
  await h.send({ type: 'sweep' });
  assert.deepEqual(h.discards(), [2, 3, 4]);
});

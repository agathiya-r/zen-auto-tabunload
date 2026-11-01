const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..', 'extension');
const code = file => fs.readFileSync(path.join(root, file), 'utf8');
const policyContext = vm.createContext({});
vm.runInContext(code('policy.js'), policyContext);
const policy = policyContext.IdlePolicy;
const now = 2_000_000;
const eligible = { active: false, discarded: false, status: 'complete', audible: false };
const settings = { enabled: true, idleMinutes: 10 };

test('ordinary pinned and bookmarked pages remain eligible; exact timeout boundary', () => {
  assert.equal(policy.reason({ ...eligible, pinned: true, bookmarked: true }, {}, now - 600000, now, settings), null);
  assert.equal(policy.reason(eligible, {}, now - 599999, now, settings), 'recent');
});
test('active tabs, Essentials, media, discarded tabs and disabled state are protected', () => {
  for (const [change, native, expected] of [
    [{ active: true }, {}, 'active'], [{ audible: true }, {}, 'media'],
    [{ discarded: true }, {}, 'already-unloaded'], [{ status: 'loading' }, {}, 'loading'],
    [{ incognito: true }, {}, 'private'], [{}, { reason: 'essential' }, 'essential'],
    [{}, { reason: 'media' }, 'media'], [{}, { reason: 'unknown-media-state' }, 'unknown-media-state'],
  ]) assert.equal(policy.reason({ ...eligible, ...change }, native, 0, now, settings), expected);
  assert.equal(policy.reason(eligible, {}, 0, now, { ...settings, enabled: false }), 'paused');
});
test('invalid timeouts cannot enable immediate unloading', () => {
  for (const idleMinutes of [0, -1, 10081, 1.5, NaN, 'oops']) assert.equal(policy.settings({ idleMinutes }).idleMinutes, 30);
  assert.equal(policy.settings({ idleMinutes: 1 }).idleMinutes, 1);
  assert.equal(policy.settings({ idleMinutes: 10080 }).idleMinutes, 10080);
});

function nativeHarness(prepare = async () => {}) {
  const attrs = new Set();
  const browser = { isConnected: true, isRemoteBrowser: true, browsingContext: {
    mediaController: { isPlaying: false }, currentWindowGlobal: { innerWindowId: 10, hasActivePeerConnections: () => false },
  } };
  let discards = 0;
  const gb = { selectedTabs: [], prepareDiscardBrowser: prepare, discardBrowser: () => { discards++; return true; } };
  const win = { gZenWorkspaces: { allStoredTabs: [] }, gBrowser: gb };
  const tab = { documentGlobal: win, linkedBrowser: browser, isConnected: true, lastAccessed: 100, hasAttribute: name => attrs.has(name) };
  const windows = [win];
  const extension = {
    tabManager: {
      get: () => ({ nativeTab: tab }),
      canAccessTab: native => !native.denied,
      getWrapper: native => ({ convert: () => ({ id: native.testId }) }),
    },
    canAccessWindow: window => !window.denied,
  };
  const context = vm.createContext({
    ExtensionAPI: class {},
    Services: { wm: { getEnumerator: () => windows } },
    ChromeUtils: { importESModule: uri => uri.includes('PrivateBrowsingUtils')
      ? { PrivateBrowsingUtils: { isWindowPrivate: window => Boolean(window.isPrivate) } }
      : { webrtcUI: { browserHasStreams: () => false } } },
  });
  vm.runInContext(code('experiments/zenTabs/api.js'), context);
  const api = new context.zenTabs().getAPI({ extension }).zenTabs;
  return { api, tab, attrs, browser, gb, win, windows, discards: () => discards };
}
test('native enumeration includes all stored spaces and windows, deduplicates, and respects access', async () => {
  const h = nativeHarness();
  const a = { testId: 1 }, b = { testId: 2 }, denied = { testId: 9, denied: true };
  h.gb.tabs = [a];
  h.win.gZenWorkspaces.allStoredTabs = [a, b, a, denied];
  h.windows.push({ gZenWorkspaces: { allStoredTabs: [{ testId: 3 }] } });
  h.windows.push({ gZenWorkspaces: { allStoredTabs: [{ testId: 4 }] }, isPrivate: true });
  h.windows.push({ gZenWorkspaces: { allStoredTabs: [{ testId: 5 }] }, denied: true });
  h.windows.push({ gZenWorkspaces: { allStoredTabs: [{ testId: 6 }] }, gBrowserInit: { isAdoptingTab: () => true } });
  h.windows.push({ gBrowser: { tabs: [{ testId: 7 }] } });
  assert.deepEqual(Array.from(await h.api.list(), tab => tab.id), [1, 2, 3]);
});
test('native bridge unloads eligible tabs but never closes them', async () => {
  const h = nativeHarness();
  assert.equal((await h.api.inspect(1)).reason, null);
  assert.equal(await h.api.discard(1, '10', 100), true);
  assert.equal(h.discards(), 1);
});
test('native bridge rechecks activation, Essentials, media, navigation and last access after preparation', async () => {
  for (const change of [
    h => h.attrs.add('zen-essential'), h => { h.tab.selected = true; },
    h => { h.browser.browsingContext.mediaController.isPlaying = true; },
    h => { h.browser.browsingContext.currentWindowGlobal.innerWindowId++; },
    h => { h.tab.lastAccessed++; }, h => { h.tab.pictureinpicture = true; },
  ]) {
    const h = nativeHarness(async () => change(h));
    assert.equal(await h.api.discard(1, '10', 100), false);
    assert.equal(h.discards(), 0);
  }
});
test('native bridge fails closed for unknown media state or unsupported browser', async () => {
  const h = nativeHarness();
  h.browser.browsingContext.mediaController = null;
  assert.equal((await h.api.inspect(1)).reason, 'unknown-media-state');
  assert.equal(await h.api.discard(1, '10', 100), false);
  h.win.gZenWorkspaces = undefined;
  assert.equal((await h.api.inspect(1)).reason, 'unsupported-window');
});
test('muted media and media inside an open shadow root block unloading; paused media does not', () => {
  function run(media, shadow = null) {
    const doc = { readyState: 'complete', querySelectorAll: selector => selector === 'audio, video' ? media : shadow ? [{ shadowRoot: shadow }] : [] };
    return vm.runInNewContext(code('media-probe.js'), { document: doc });
  }
  const playing = { paused: false, ended: false, error: null, muted: true };
  assert.equal(run([playing]).playing, true);
  assert.equal(run([{ ...playing, paused: true }]).playing, false);
  assert.equal(run([], { querySelectorAll: selector => selector === 'audio, video' ? [playing] : [] }).playing, true);
});

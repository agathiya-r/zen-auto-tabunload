/* global browser, IdlePolicy */
const ALARM = "idle-sweep";
let settings = { ...IdlePolicy.defaults };
const lastUse = new Map();
const activeByWindow = new Map();
let running = null;
let lastResult = null;
let revision = 0;
const touch = id => { if (Number.isInteger(id)) lastUse.set(id, Date.now()); };

browser.tabs.onActivated.addListener(({ tabId, windowId }) => {
  // Reset the tab being left, even if it was continuously active for hours.
  touch(activeByWindow.get(windowId));
  touch(tabId);
  activeByWindow.set(windowId, tabId);
});
browser.tabs.onUpdated.addListener((id, change, tab) => {
  if (change.status || change.url || "audible" in change || tab.active) touch(id);
});
browser.tabs.onCreated.addListener(tab => touch(tab.id));
browser.tabs.onRemoved.addListener(id => lastUse.delete(id));
browser.tabs.onDetached.addListener(id => touch(id));
browser.tabs.onAttached.addListener(id => touch(id));
browser.windows.onRemoved.addListener(id => activeByWindow.delete(id));

const ready = (async () => {
  settings = IdlePolicy.settings((await browser.storage.local.get("settings")).settings);
  // A fresh full timeout after installation, browser restart or extension reload.
  // Tab IDs are deliberately never persisted across sessions.
  for (const tab of await browser.tabs.query({})) {
    touch(tab.id);
    if (tab.active) activeByWindow.set(tab.windowId, tab.id);
  }
  browser.alarms.create(ALARM, { delayInMinutes: 1, periodInMinutes: 1 });
})();

async function sweep() {
  await ready;
  const result = { at: Date.now(), unloaded: 0, skipped: {}, errors: 0 };
  const skip = reason => { result.skipped[reason] = (result.skipped[reason] || 0) + 1; };
  const initialRevision = revision;
  if (!settings.enabled) { skip("paused"); lastResult = result; return result; }
  if (!browser.zenTabs) throw new Error("Zen experimental API unavailable. See README installation steps.");
  for (const candidate of await browser.tabs.query({})) {
    if (!settings.enabled || initialRevision !== revision) break;
    try {
      // Fresh reads are required: the query is a snapshot and other tabs can change.
      const tab = await browser.tabs.get(candidate.id);
      if (!lastUse.has(tab.id)) touch(tab.id);
      if (tab.active || tab.audible || tab.status === "loading") touch(tab.id);
      const native = await browser.zenTabs.inspect(tab.id);
      if (["media", "picture-in-picture", "active", "call-or-capture", "essential"].includes(native.reason)) touch(tab.id);
      const used = Math.max(lastUse.get(tab.id), tab.lastAccessed || 0, native.lastAccessed || 0);
      const reason = IdlePolicy.reason(tab, native, used, Date.now(), settings);
      if (reason) { skip(reason); continue; }
      // Injection is transient, not a content script polling in every tab.
      // Restricted pages / a failed probe are left loaded.
      const frames = await browser.tabs.executeScript(tab.id, {
        file: "media-probe.js", allFrames: true, matchAboutBlank: true,
      });
      if (!frames.length || frames.some(frame => !frame || !frame.complete)) { skip("unknown-media-state"); continue; }
      if (frames.some(frame => frame.playing)) { touch(tab.id); skip("media"); continue; }
      // A popup pause, settings edit, activation or navigation during the probe
      // cancels this attempt. The bridge repeats native guards after preparation.
      if (!settings.enabled || initialRevision !== revision) break;
      if (Date.now() - lastUse.get(tab.id) < settings.idleMinutes * 60000) { skip("recent"); continue; }
      if (await browser.zenTabs.discard(tab.id, native.documentId, native.lastAccessed)) result.unloaded++;
      else skip("browser-declined");
    } catch (error) {
      result.errors++;
      // No page URLs, titles, browsing history, or raw error text are persisted.
      console.debug("Zen Idle Unloader: skipped a tab after a failed safety check.");
    }
  }
  lastResult = result;
  return result;
}

function runSweep() {
  if (!running) running = sweep().finally(() => { running = null; });
  return running;
}
browser.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === ALARM) runSweep().catch(error => console.error(error));
});
browser.runtime.onMessage.addListener(async (message, sender) => {
  if (sender.id !== browser.runtime.id || !sender.url?.startsWith(browser.runtime.getURL(""))) return undefined;
  await ready;
  if (message?.type === "status") return { settings, lastResult, running: Boolean(running) };
  if (message?.type === "save") {
    settings = IdlePolicy.settings(message.settings);
    revision++;
    await browser.storage.local.set({ settings });
    return { settings };
  }
  if (message?.type === "sweep") return runSweep();
  return undefined;
});

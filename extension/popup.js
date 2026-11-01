/* global browser */
const state = document.getElementById("state");
const result = document.getElementById("result");
const toggle = document.getElementById("toggle");
const sweep = document.getElementById("sweep");
let settings;
async function refresh() {
  const status = await browser.runtime.sendMessage({ type: "status" });
  settings = status.settings;
  state.textContent = settings.enabled ? `Unloading after ${settings.idleMinutes} idle minutes.` : "Automatic unloading is paused.";
  toggle.textContent = settings.enabled ? "Pause unloading" : "Resume unloading";
  toggle.disabled = false;
  sweep.disabled = !settings.enabled || status.running;
  if (status.lastResult) {
    const r = status.lastResult;
    result.textContent = `Last check: ${new Date(r.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}. ${r.unloaded} tab${r.unloaded === 1 ? "" : "s"} unloaded.${r.errors ? ` ${r.errors} could not be checked and stayed loaded.` : ""}`;
  }
}
toggle.addEventListener("click", async () => {
  try {
    toggle.disabled = true;
    await browser.runtime.sendMessage({ type: "save", settings: { ...settings, enabled: !settings.enabled } });
    await refresh();
  } catch { state.textContent = "Could not update settings."; toggle.disabled = false; }
});
sweep.addEventListener("click", async () => {
  sweep.disabled = true;
  result.textContent = "Checking idle tabs…";
  try { await browser.runtime.sendMessage({ type: "sweep" }); await refresh(); }
  catch (error) { result.textContent = error.message; sweep.disabled = false; }
});
document.getElementById("options").addEventListener("click", () => browser.runtime.openOptionsPage());
refresh().catch(() => { state.textContent = "Extension could not start. See the installation guide."; });

/* global browser */
const form = document.getElementById("settings-form");
const feedback = document.getElementById("feedback");
browser.runtime.sendMessage({ type: "status" }).then(({ settings }) => {
  document.getElementById("enabled").checked = settings.enabled;
  document.getElementById("idle-minutes").value = settings.idleMinutes;
}).catch(() => { feedback.textContent = "Could not load settings. Check the extension background console."; });
form.addEventListener("submit", async event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  try {
    await browser.runtime.sendMessage({ type: "save", settings: {
      enabled: document.getElementById("enabled").checked,
      idleMinutes: Number(document.getElementById("idle-minutes").value),
    } });
    feedback.textContent = "Settings saved.";
  } catch { feedback.textContent = "Could not save settings."; }
});

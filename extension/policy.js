/* Shared deterministic policy; no browser or DOM access. */
globalThis.IdlePolicy = Object.freeze({
  defaults: Object.freeze({ enabled: true, idleMinutes: 30 }),
  settings(value = {}) {
    value = value && typeof value === "object" ? value : {};
    const minutes = Number(value.idleMinutes);
    return {
      enabled: typeof value.enabled === "boolean" ? value.enabled : true,
      idleMinutes: Number.isInteger(minutes) && minutes >= 1 && minutes <= 10080
        ? minutes : 30,
    };
  },
  reason(tab, native, lastUse, now, settings) {
    if (!settings.enabled) return "paused";
    if (tab.active) return "active";
    if (tab.incognito) return "private";
    if (tab.discarded) return "already-unloaded";
    if (tab.status !== "complete") return "loading";
    if (tab.audible) return "media";
    if (native.reason) return native.reason;
    // Bookmarks and ordinary pinned tabs deliberately have no exemption.
    if (!Number.isFinite(lastUse) || now - lastUse < settings.idleMinutes * 60000) {
      return "recent";
    }
    return null;
  },
});

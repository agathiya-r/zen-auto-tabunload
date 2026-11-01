(() => {
  // Executed only just before unloading, in every accessible frame. Muted and
  // silent video still counts; Firefox also exposes closed shadow roots to
  // extension content scripts through openOrClosedShadowRoot.
  function playingIn(root) {
    for (const media of root.querySelectorAll("audio, video")) {
      if (!media.paused && !media.ended && media.error === null) return true;
    }
    for (const node of root.querySelectorAll("*")) {
      const shadow = node.openOrClosedShadowRoot || node.shadowRoot;
      if (shadow && playingIn(shadow)) return true;
    }
    return false;
  }
  return { playing: playingIn(document), complete: document.readyState === "complete" };
})();

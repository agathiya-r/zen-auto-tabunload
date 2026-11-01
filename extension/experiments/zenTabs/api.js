/* global ExtensionAPI, ChromeUtils */
// The bridge only reads native safety state and calls the same discard path as
// Firefox's tabs.discard(). It never removes, moves, replaces, or hides a tab.
var zenTabs = class extends ExtensionAPI {
  getAPI(context) {
    const { PrivateBrowsingUtils } = ChromeUtils.importESModule(
      "resource://gre/modules/PrivateBrowsingUtils.sys.mjs"
    );
    const { webrtcUI } = ChromeUtils.importESModule("resource:///modules/webrtcUI.sys.mjs");
    const getTab = id => context.extension.tabManager.get(id).nativeTab;

    function inspectNative(tab) {
      const win = tab.documentGlobal || tab.ownerGlobal;
      const gb = win?.gBrowser;
      const browser = tab.linkedBrowser;
      const bc = browser?.browsingContext;
      let reason = null;
      // Fail closed if this is not a supported Zen browser window.
      if (!win?.gZenWorkspaces || !gb || !context.extension.canAccessWindow(win)) reason = "unsupported-window";
      else if (PrivateBrowsingUtils.isWindowPrivate(win)) reason = "private";
      else if (tab.hasAttribute("zen-essential")) reason = "essential";
      else if (tab.selected || tab.zenModeActive || gb.selectedTab === tab || gb.selectedTabs?.includes(tab)) reason = "active";
      else if (tab.closing || !tab.isConnected || !browser?.isConnected) reason = "unavailable";
      else if (tab.hasAttribute("pending") || !browser.isRemoteBrowser) reason = "unloaded-or-internal";
      else if (tab.undiscardable || tab.hasAttribute("busy")) reason = "busy";
      else if (tab.pictureinpicture || tab.hasAttribute("pictureinpicture")) reason = "picture-in-picture";
      else if (!bc?.currentWindowGlobal || !bc.mediaController) reason = "unknown-media-state";
      else if (tab.soundPlaying || tab.hasAttribute("soundplaying") || bc.mediaController.isPlaying) reason = "media";
      else if (webrtcUI.browserHasStreams(browser) || bc.currentWindowGlobal.hasActivePeerConnections()) reason = "call-or-capture";
      return {
        reason,
        documentId: String(bc?.currentWindowGlobal?.innerWindowId ?? ""),
        lastAccessed: Number(tab.lastAccessed) || 0,
      };
    }

    return {
      zenTabs: {
        async inspect(tabId) { return inspectNative(getTab(tabId)); },
        async discard(tabId, documentId, lastAccessed) {
          const tab = getTab(tabId);
          const unchanged = () => {
            const state = inspectNative(tab);
            return !state.reason && state.documentId === documentId && state.lastAccessed === lastAccessed;
          };
          if (!unchanged()) return false;
          const gb = (tab.documentGlobal || tab.ownerGlobal).gBrowser;
          // Preparation preserves session state and honors beforeunload safeguards.
          // It is asynchronous, so recheck Essentials, media and activation AFTER it.
          await gb.prepareDiscardBrowser(tab);
          if (!unchanged()) return false;
          return Boolean(gb.discardBrowser(tab));
        },
      },
    };
  }
};

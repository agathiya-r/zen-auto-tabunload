# Zen Idle Unloader

A small Zen extension that unloads idle tabs **without closing them**.

## Behavior

- Default timeout: **30 minutes**, configurable from 1 minute to 7 days.
- Scans every Zen space and accessible non-private browser window using native `allStoredTabs`, including inactive spaces.
- Checks once a minute. An eligible tab normally unloads within a minute after its timeout.
- Ordinary tabs, bookmarked pages, and ordinary Zen pinned tabs are eligible.
- **Zen Essentials are always excluded by their native `zen-essential` attribute.**
- Active tabs, playing audio/video (including muted video), picture-in-picture, and detected calls/capture remain loaded.
- Media is checked in accessible frames, including cross-origin frames and Firefox open/closed shadow roots.
- Already unloaded, private, internal and inaccessible pages are skipped. A failed safety check keeps the tab loaded.
- Leaving a tab starts its inactivity countdown. Loading/navigation and audio changes reset it. Browser restart or extension reload gives existing tabs a fresh full timeout.
- Selecting an unloaded tab reloads it in place. Its tab identity and browser session history remain; arbitrary JavaScript state and unsaved in-page work may not survive unloading. The browser's normal before-unload safeguards still apply.

The toolbar popup provides pause/resume, a check-now button that still honors the timeout, and a settings link.

## Installation in Zen

This is an **unsigned experimental extension**, tested on **Zen 1.24b / Gecko 159 on macOS**. Exact Essentials detection uses browser internals that the standard WebExtension tabs API does not expose. It cannot go through the ordinary Mozilla Add-ons signing pipeline as written. See [Mozilla's experimental API documentation](https://firefox-source-docs.mozilla.org/toolkit/components/extensions/webextensions/basics.html#adding-experimental-apis-in-privileged-extensions).

### Try it temporarily

1. In Zen, open `about:config`, find `extensions.experiments.enabled`, and set it to `true`.
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on…** and select `zen-idle-unloader-0.1.1.xpi`, or the extracted source's `extension/manifest.json`.
4. Open the extension's toolbar popup, then **Settings**, to choose your timeout.

A temporary installation is removed when Zen exits. This extension does not alter browser preferences itself.

### Keep it installed across restarts

On the tested Zen build, persistent installation works with:

```text
extensions.experiments.enabled = true
xpinstall.signatures.required = false
```

These preferences allow experimental and unsigned add-ons, which reduces the browser's normal add-on installation protections. Record their original values before changing them.

1. Set those preferences in `about:config`.
2. Open `about:addons` → gear menu → **Install Add-on From File…**.
3. Select `zen-idle-unloader-0.1.1.xpi` and accept its installation prompt.
4. Configure the timeout in the extension's options. The initial setting is 30 minutes.

Persistent installation and activation after restart were verified in a separate test profile. Other Zen builds may restrict experiments or unsigned installs differently. This package is intended for Zen; ordinary Firefox windows fail the Zen safety check and are not unloaded.

To remove it, use `about:addons`. Restore the preferences to their recorded values if you no longer need them for other extensions. Tabs that are already unloaded stay open and reload when selected.

## Permissions and privacy

- `tabs`: tab state, activation, navigation, and transient tab IDs.
- `alarms`: a once-per-minute background check.
- `storage`: enabled state and the chosen timeout, stored locally.
- `<all_urls>`: a transient media inspection immediately before unloading an eligible tab. This is needed for silent/muted video and embedded media that do not show an audible indicator. Browser-restricted pages are skipped.
- An experimental parent API reads native Essentials/media state and calls Zen's existing session-preserving discard path. Experimental APIs run with browser privileges, beyond ordinary extension permissions.

No analytics, external services, network requests, page modifications, bookmarks permission, saved browsing history, or persistent tab-ID records. The extension never calls a tab-closing API. Its media check is injected only when needed; it does not install a polling script into every page.

## Source and development

No dependencies or build system are required to load `extension/manifest.json` temporarily.

```sh
npm test
npm run check
npm run build
```

`npm run build` uses Python 3's standard library and writes `dist/zen-idle-unloader-0.1.1.xpi` inside this project directory. No signing or publishing is performed.

Files:

- `extension/background.js`: inactivity tracking, minute alarm, and safety checks.
- `extension/policy.js`: settings validation and eligibility policy.
- `extension/media-probe.js`: playback inspection in each accessible frame and shadow tree.
- `extension/experiments/zenTabs/`: native Essentials/media checks and guarded discard.
- `extension/options.*`, `extension/popup.*`, `extension/ui.css`: settings and toolbar UI.
- `tests/`: policy, timing, playback, and asynchronous safety regression tests.

The native bridge uses `prepareDiscardBrowser()` followed by `discardBrowser()` without forcing a discard, matching the browser's `tabs.discard()` implementation. It repeats native safety checks after asynchronous preparation and rejects a changed document or changed last-access timestamp. Tab selection, Essentials changes, navigation, or playback can cancel an unloading attempt.

Browser internals can change in a Zen update. Failures keep affected tabs loaded; check the background console through `about:debugging` if a future version stops unloading.

## Verification and limits

See `TESTING.md` for the tests performed. No claim is made about a specific number of megabytes saved: actual RAM reduction depends on pages, shared processes, and browser memory behavior. Unloading reduces the work and memory associated with eligible pages; it does not impose a browser-wide RAM limit.

Reference: [Mozilla's tab discard behavior](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/discard), [Firefox access to closed shadow roots](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/dom/openOrClosedShadowRoot), and [Zen's Essentials implementation](https://github.com/zen-browser/desktop/blob/dev/src/zen/tabs/ZenPinnedTabManager.mjs).

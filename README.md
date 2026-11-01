# Zen Auto Tab Unload

Automatically unload idle Zen tabs to reduce the memory used by inactive pages. **Tabs stay open and reload in place when selected.**

The extension appears in Zen as **Zen Idle Unloader**.

## Download and install

**[Download v0.1.1 (.xpi)](https://github.com/agathiya-r/zen-auto-tabunload/raw/refs/heads/main/dist/zen-idle-unloader-0.1.1.xpi)** · **[Installation guide](docs/INSTALLATION.md)**

This is an **unsigned experimental extension**. Exact Essentials detection needs a privileged API that ordinary WebExtensions do not expose. Persistent installation requires enabling experimental add-ons and allowing unsigned add-ons; read the installation guide before installing. Tested on Zen 1.24b / Gecko 159 on macOS.

## Features

- Check **all Zen spaces and browser windows**, including spaces you are not currently viewing.
- Unload tabs after a configurable idle timeout: **30 minutes by default**, from 1 minute to 7 days.
- Include ordinary tabs, bookmarked pages, and ordinary pinned tabs.
- Keep **Essentials**, active tabs, and playing audio/video loaded, including **muted video**.
- Inspect embedded media in accessible frames and Firefox open/closed shadow roots.
- Protect picture-in-picture and detected calls or screen capture.
- Pause/resume from the toolbar; check idle tabs immediately while still respecting the timeout.
- Keep inaccessible, private, internal, and already unloaded tabs untouched.
- Store settings locally, without analytics or external services.

Checks run once a minute. A fresh full timeout begins after browser startup or extension reload. Leaving an active tab starts its idle countdown; navigation and audio-state changes reset it. Failed safety checks keep the affected tab loaded.

Unloading retains the tab and supported browser session state. Arbitrary JavaScript state or unsaved work inside a page may not survive its next reload. The browser's normal before-unload safeguards remain in effect.

## How it works

The background script tracks tab activity and checks idle candidates from Zen’s native `allStoredTabs` collection in every accessible non-private browser window. This includes inactive spaces; Zen’s standard `tabs.query()` can otherwise return only the current space. A transient page probe detects HTML audio/video in accessible frames and shadow roots, without continuously running scripts in every page. A small experimental API reads Zen's native Essentials and media state and uses the same session-preserving discard path as the browser's tab-discard API. It checks again after asynchronous preparation to reject newly protected tabs or a changed document.

The extension never calls a tab-closing API. It also does not change Zen's own automatic memory-pressure unloading rules.

## Permissions

| Permission | Purpose |
| --- | --- |
| `tabs` | Read tab state and track activation/navigation |
| `alarms` | Run the once-per-minute idle check |
| `storage` | Save enabled state and timeout locally |
| `<all_urls>` | Inspect playing media, including silent video and cross-origin frames, immediately before unloading |
| Experimental parent API | Read native Essentials/media state and request guarded unloading |

The experiment runs with browser privileges beyond ordinary extension permissions. No browsing history, page contents, or tab IDs are persistently recorded. No bookmarks permission is required: bookmarked pages are simply eligible under the same rules as ordinary pages.

## Development

Requires Node.js 20+ for tests and Python 3 for packaging. There are no package dependencies.

```sh
git clone https://github.com/agathiya-r/zen-auto-tabunload.git
cd zen-auto-tabunload
npm test
npm run check
npm run build
```

The reproducible build writes `dist/zen-idle-unloader-0.1.1.xpi`. Load `extension/manifest.json` through `about:debugging` while developing. See [development details](DEVELOPMENT.md), [verification results](TESTING.md), and [release notes](CHANGELOG.md).

Future changes to this extension belong in this repository. Its [agent instructions](AGENTS.md) record the requirements and commit workflow.

## Compatibility and limitations

Native Zen internals can change between browser versions; a failed check keeps the tab loaded. Media detection covers browser native state and accessible HTML media, with no claim of compatibility with every site or player. Inactive spaces were verified in a live three-space browser test. Multiple-window enumeration has automated coverage. Calls, picture-in-picture, and split views have code guards but have not all been exhaustively tested live. See [test coverage](TESTING.md).

Actual RAM savings depend on the pages and browser processes. This extension unloads eligible pages; it does not impose a browser-wide memory limit.

References: [Mozilla tab discarding](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/discard), [experimental API installation and signing](https://firefox-source-docs.mozilla.org/toolkit/components/extensions/webextensions/basics.html#adding-experimental-apis-in-privileged-extensions), [closed shadow roots](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/dom/openOrClosedShadowRoot), and [Zen Essentials](https://github.com/zen-browser/desktop/blob/dev/src/zen/tabs/ZenPinnedTabManager.mjs).

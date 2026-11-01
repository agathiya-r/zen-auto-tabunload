# Verification

Tested on November 1, 2026 using the installed Zen 1.24b application, Gecko 159, build 20261029123729, in a separate headless profile. The normal browser profile and its settings were not modified.

## Automated checks

`npm test`: **11 passing tests**.

- Timeout boundary and startup grace.
- A tab active for a long time gets a full timeout after it is left.
- Bookmarked and ordinary pinned tabs remain eligible.
- Essentials, active tabs, private tabs, already unloaded tabs, and media are protected.
- A failed media probe leaves a tab loaded.
- Settings messages work from the actual options-page context; pausing prevents unloading.
- Invalid timeout values cannot trigger immediate unloading.
- Native guards are repeated after asynchronous session-state preparation: changing selection, Essentials status, media, document identity, or last access cancels the attempt.
- Unknown native media state and unsupported browser windows are protected.
- Muted playback and media nested in a shadow root are detected.

`npm run check`: all six runtime JavaScript files pass syntax checks.

## Actual Zen behavior

Local HTTP test pages were opened in the separate profile. The timeout was set to one minute and a real minute elapsed before the check. Playback was verified before waiting; background autoplay restrictions were adjusted only in this test profile so the fixtures actually played.

| Test page | Result |
| --- | --- |
| Ordinary inactive tab | Unloaded, tab remained open |
| Page actually saved in bookmarks | Unloaded, bookmark and tab remained |
| Ordinary Zen pinned tab | Unloaded, remained pinned |
| Paused media | Unloaded, tab remained open |
| Native Zen Essential | Stayed loaded |
| Audible looping audio | Stayed loaded |
| Playing muted WebM video | Stayed loaded |
| Playing muted video in a cross-origin iframe | Stayed loaded |

All eight test tabs remained open. Selecting the unloaded ordinary tab restored the same tab and URL. A separate final check confirmed that a real playing muted video inside a **closed shadow root** is detected by the packaged media probe.

The options page rendered successfully and was visually inspected. The packaged XPI installed in the test profile with experiments enabled and signature enforcement disabled, and was confirmed **active and non-temporary after a browser restart**. The isolated browser was shut down after testing.

## Remaining coverage

- Live calls, capture, picture-in-picture, split views, multiple windows, inactive Zen workspaces, and before-unload prompts have code guards but were not exhaustively exercised in live browser tests.
- No site-wide compatibility claim is made for every player or live stream. Browser native state and accessible HTML media are checked; denied inspections leave the tab loaded.
- Playback checks and discarding cross process boundaries. Native guards are repeated, but no browser extension can provide a transaction spanning arbitrary website code and the browser's process lifecycle.
- RAM savings were not benchmarked. The live test verifies the browser's `discarded` state and restoration, not a particular RAM reduction.

## Manual smoke test

1. Load the extension in a disposable Zen profile and choose a one-minute timeout.
2. Open an ordinary page, bookmark one page, pin another, and put a fourth in Essentials.
3. Play audio, muted video, and an embedded video in separate tabs. Leave another video's playback paused.
4. Select a different tab and wait at least two minutes.
5. Confirm the ordinary/bookmarked/pinned/paused tabs unload and every tab remains present. Verify the Essential and playing media remain loaded.
6. Select an unloaded tab; confirm it reloads in place.
7. Pause the extension and verify later checks do not unload further tabs.

Restore the default or preferred timeout after testing.

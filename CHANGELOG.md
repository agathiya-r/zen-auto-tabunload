# Changelog

## 0.1.1 — 2026-11-01

- Fix idle unloading in inactive Zen spaces: use native `allStoredTabs` in every accessible non-private browser window instead of the current-space-only standard tab query.
- Keep Essentials, playing media, active tabs, and existing safeguards protected across spaces.
- Clarify the all-spaces scope in the toolbar popup and settings page.
- Add regression coverage for inactive-space candidates, multiple windows, deduplication, and access restrictions.

## 0.1.0 — 2026-11-01

- Initial experimental Zen extension with a configurable idle timeout and one-minute checks.
- Unload ordinary, bookmarked, and ordinary pinned tabs without closing them.
- Protect Essentials, active tabs, playing audio/video, picture-in-picture, and detected calls/capture.
- Inspect muted video, cross-origin frames, and open/closed shadow roots before unloading.
- Add pause/resume, a timeout-respecting manual check, local settings, and startup grace.
- Include automated safety tests, documented live Zen verification, installation instructions, and a reproducible XPI build.

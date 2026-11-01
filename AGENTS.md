# Repository instructions

- Canonical repository: `https://github.com/agathiya-r/zen-auto-tabunload`.
- The user explicitly requests that future changes to this extension be committed and published here. Preserve existing remote changes; never overwrite history or another contributor's work.
- Keep `zen-idle-unloader@local` as the extension ID so installed copies can update in place.
- Core requirements: unload idle tabs across all Zen spaces and non-private windows without closing them; include bookmarked and ordinary pinned tabs; exclude native Zen Essentials and actively playing audio/video, including muted video.
- Keep failed or unknown safety checks conservative: leave the tab loaded.
- Do not replace native Essentials detection with excluding all pinned tabs.
- Validate changes with `npm test`, `npm run check`, and `npm run build`. Keep the tracked `dist/` package synchronized with runtime source.
- Update README, installation instructions, test coverage, and changelog when behavior or setup changes. Do not claim live test coverage or measured RAM savings that were not verified.
- Never commit browser profiles, personal browsing data, secrets, local automation ports, or machine-specific installation backups.

- Do not use standard `browser.tabs.query()` to enumerate unload candidates: Zen scopes it to the current space. Use `browser.zenTabs.list()` backed by native `allStoredTabs`.

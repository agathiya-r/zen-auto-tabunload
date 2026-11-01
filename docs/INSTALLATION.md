# Installation

Download [Zen Idle Unloader v0.1.0](https://github.com/agathiya-r/zen-auto-tabunload/raw/refs/heads/main/dist/zen-idle-unloader-0.1.0.xpi), or build it from source with `npm run build`.

## Keep it installed across browser restarts

1. In **Zen**, open `about:config` and continue to the preferences list.
2. Find each preference below. Record its original value, then set:

   ```text
   extensions.experiments.enabled = true
   xpinstall.signatures.required = false
   ```

3. Open `about:addons`.
4. Click the gear menu, then **Install Add-on From File…**.
5. Select the downloaded `.xpi` and accept the installation prompt.
6. Open **Zen Idle Unloader** from the extensions menu. Choose **Settings** to set the timeout.

The default is **30 minutes**. Checks run every minute; tabs get a fresh full timeout after browser startup. No browser restart is normally required to install.

These two preferences allow experimental and unsigned add-ons, reducing Zen's normal add-on installation protections. The extension needs an experimental API to distinguish Essentials from ordinary pinned tabs. Experimental parent APIs have browser privileges. Inspect the source before installing; this build is not signed by Mozilla Add-ons.

Persistent installation and activation after a restart were verified on Zen 1.24b / Gecko 159 for macOS. Other Zen builds may handle unsigned or experimental add-ons differently.

## Temporary developer installation

1. Enable `extensions.experiments.enabled` in `about:config`.
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on…**.
4. Select the packaged `.xpi`, or `extension/manifest.json` from an extracted checkout.

A temporary installation is removed when Zen exits. Use the persistent procedure above for daily use.

## Configure and use

- Open the toolbar popup → **Settings** to set the timeout from 1 minute to 10,080 minutes.
- **Pause unloading** stops further automatic checks. **Resume unloading** enables them again.
- **Check idle tabs now** honors the configured timeout and all protection rules.
- Select an unloaded tab to reload it in place.

Essentials, active tabs, playing media, picture-in-picture, and detected calls/capture stay loaded. Bookmarked pages and ordinary pinned tabs remain eligible. Internal, private and inaccessible pages are skipped.

## Updating

Install a newer `.xpi` from this same repository using **Install Add-on From File…**. Keep the extension ID `zen-idle-unloader@local` unchanged so Zen can treat future builds as updates and retain settings. A new extension load gives existing tabs a full timeout.

## Remove or roll back

1. Open `about:addons`, find **Zen Idle Unloader**, and choose **Remove**.
2. In `about:config`, restore the two preferences to the original values you recorded, if they are not needed by other add-ons.

Tabs remain open. Any tab already unloaded reloads when selected. To roll back a release, remove the current build and install a known previous package from the repository's history, then restore your desired timeout.

## Troubleshooting

- **Corrupt, unsigned, or incompatible add-on:** confirm both preferences and use a Zen build that supports experimental add-ons. Renaming an `.xpi` does not sign it.
- **Temporary add-on vanished after restart:** use the persistent procedure.
- **Tabs do not unload immediately:** allow the full timeout, plus up to a minute for the next check. Startup and navigation reset timers.
- **A tab remains loaded:** it may be protected or inaccessible. A failed safety check intentionally leaves it loaded.
- **After a Zen update:** inspect the extension's background console through `about:debugging`; native APIs may have changed. Report the Zen version and error without including private browsing data.

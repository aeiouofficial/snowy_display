# Android theme and slider causality fix — 2026-10-16

Branch: `feat/android-native-overlay-mobile-layout`.

## Root causes

- The Android foreground service can start asynchronously; the JS `overlayRunning` flag was still `false` immediately after `startForegroundService`. The preview updated but `scheduleOverlayUpdate` refused to send new scene and slider values to the already active native renderer. This is a status cache synchronization defect, not a permissions issue.
- The native particle count multiplied every ambient theme by the `snowfall` control. Thus disabling snowfall also disabled non-snow modes (blossoms, leaves, stars, bats, fireflies). These options must be independent.
- At default decoration density `.72`, integer truncation of `(2 * density)` allowed only **one** ambient feature, leaving distinct seasonal modes nearly indistinguishable in the transparent cross-app overlay. The native renderer now allows up to five lightweight accents, normally three at the default density, based on each theme's own motifs. Plain snow still has no trees or unrelated holiday objects.

## Implementation contract

- Scene and slider edits coalesce through a serialized native IPC path regardless of the JS cache of the Android service state. The returned native state reconciles controls. A second delayed status refresh accommodates the asynchronous start.
- Snow and rain rates follow the precipitation setting; non-precipitation themes use their own intensity and decoration density. No snow accumulation occurs for non-snow themes.
- Android native diagnostic lines `SnowyOverlaySettings` report the applied theme ID, particle type, snowfall, density, gravity, plow state and quality **when a setting is applied**, not every frame.
- Scene illustrations are lightweight transparent overlay accents. The Android OS restricts inspecting other apps' private surfaces, so phone overlays do **not** claim desktop window-edge snow physics or cross-app touch gestures.

## Tests and handoff

- Targeted new regressions: `tests/android-native-theme-controls.test.ts` (RED before / GREEN after).
- Existing `android-perf-layout-regressions.test.ts` updated to check bounded themed accents without replacing natural snow with pine trees.
- Run `npm run check`, `npm run build:web`, Android mobile Tauri bridge browser test; compile Kotlin through GitHub Android APK workflow; update APK **in place** signed with existing project-local development keystore; inspect `SnowyOverlaySettings` log lines via ADB for distinct theme IDs and slider values. UI screenshots and user visual approval remain required for aesthetic fidelity.

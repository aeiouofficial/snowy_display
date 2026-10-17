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

## Additional physical slider / preview corrections

- On Android the .studio-panel is vertically pannable. Horizontal native range controls now explicitly use touch-action:none so WebView does not reinterpret thumb drags as scrolling. Physical pointer/touch behavior must be tested; synthetic fill() alone is insufficient.
- Mobile WebView preview ambient scenes use their own particle intensity and scenery density, independent of the snowfall setting, mirroring the native Android overlay. Snow/rain remain controlled by precipitation.
- Preview particle budget now honors the requested 64-particle limit rather than silently clamping to 100 (desktop budget remains unchanged).

## Final Android safe-area and interactive regression (October 16)

- Android WebView can report a zero CSS `safe-area-inset-top` even when Xiaomi's status bar overlays its content. The non-scrolling root now reserves `max(28px, safe-area-inset-top)` above the header and `max(17px, safe-area-inset-bottom)` below the bottom navigation; desktop behavior is unchanged.
- The header and preview are siblings of independently scrollable settings panels. The bottom tab bar never belongs to the panel. At a simulated 393 × 851 Android viewport: header y=28, bottom navigation y=766, scrolling a panel by 1822 pixels leaves both stationary; all four SVG navigation icons render.
- `npm run check` **99/99 PASS**, `npm run build:web` PASS. Real Chromium mobile-layout test PASS, and all **38 theme IDs** reach the mocked Tauri Android native update bridge with their individual particle/color/intensity metadata. Gravity, snowplow interval, reduced motion and native clear also pass. The bridge intentionally batches changes by about 180 ms; the E2E test waits until the batch is due.
- These automated checks are not proof of physical Redmi overlay appearance. The updated signed APK must be installed in place on the Redmi, followed by an actual on-device layout, native log and scene comparison test before claiming hardware acceptance.

# Snowy Display Android hardware QA — 2026-10-17

Scope: Redmi Note 10 5G (`M2103K19G`), Android 13 / MIUI 14, local workspace `S:\snowy_display`, branch `feat/android-native-overlay-mobile-layout`. Do not merge to `main` without explicit user hardware sign-off.

## Verified on the previously installed `0235b09` APK

The first scroll screenshot was invalid because a different app took the foreground. A repeated focus-guarded test kept Snowy Display foreground throughout and measured:

| Region | Mean RGB difference after catalog swipe |
| --- | ---: |
| Header | 0.000 |
| Category/search toolbar | 0.188 |
| Bottom navigation | 0.000 |
| Scrolling theme catalog | 19.288 |

All four tabs (Scenes, Physics, Activity, System) were accessed and captured while Snowy Display remained foreground. Android battery level was 100% and temperature was 40.0 °C before/after that test. The prior foreground app was restored.

Evidence: `.tmp/snowy_live_hardware_20261017/report.json` and accompanying PNG files.

## Native overlay before and after the corrective patch

The physical phone confirmed that the native Android service rendered Halloween bats and decorations over the MIUI launcher, hid the system-wide canvas over Snowy Display's own controls, and restored the prior foreground app after stopping the overlay.

Baseline, with Halloween Night selected, visual profile High, and the same dark launcher: mean screenshot difference with/without overlay **0.333**. Native logcat contained `theme=halloween-bats mode=bats rate=0.35 density=0.8 gravity=0.75 autoPlows=false quality=high`, followed by the expected visibility transitions.

**Defects established in source and actual screenshots:**
- Native particles ignored the existing `visualScale` setting; it affected only static decorations.
- Bat polygons were tiny and too dark to read over a dark background; fireflies had no ambient glow.
- The Android UI displayed desktop FPS claims (24/36/60 FPS) even though native caps were **8/12/20 FPS**, falling to four FPS under power constraints.
- Physics/Activity/System contained incorrect desktop-specific promises (exposed window edges, mouse, autonomous vehicles on window ledges, ALL MONITORS) despite Android's documented bottom-edge-only and click-through limitations.

**Patch:**
- Apply visual scale consistently across all native particle shapes, enlarge/lighten the bats, add low-alpha firefly halos.
- Preserve the **existing five-decorative-motif cap** to avoid battery/performance regression.
- Android-only wording describes supported interactions and screen-bottom accumulation accurately; the separate desktop copy remains unchanged.
- Correct Android FPS labels to 8/12/20.
- Added `tests/android-live-regression.test.ts`.

After building/installing the patch, the same live Halloween overlay comparison measured mean screenshot difference **0.515** — approximately **55% higher mean pixel difference** than baseline (not photorealistic quality certification). Native theme/visibility logs remained correct; no fatal crash was seen. The foreground app was restored and weather stopped. Battery after this short check: 100%, 37.7 °C.

Evidence: `.tmp/snowy_live_overlay_20261017/report.json`, `.tmp/snowy_live_overlay_after_20261017/report.json` and PNG captures in those directories.

## Engineering gates

- `npm run check`: **116/116 PASS**.
- `npm run build:web`: PASS.
- ARM64 Rust library rebuilt, SHA-256 `7dbedbcbe845c342a4093d66272e24efa535a1f852517654f2337f4f870479ce`.
- Direct Android Gradle release packaging: **BUILD SUCCESSFUL in 2m40s**, 86 actionable tasks (12 executed, 74 up-to-date), including native Kotlin compile. Tauri's final symlink fails on S: (`os error 1`); verified JNI copy and direct Gradle path used.
- Signed using the preserved developer keystore; signer certificate SHA-256 `20840608f8edba886c508312b8ba17f37df269fefbbebcff74fee212f0bdc805`.
- **Installed in place, without user-data wipe**. Android returned `Success`; `adb shell sha256sum` for the installed APK matched the signed APK:
  `30fd42256d629ca925ab922817685920fc3bdda9b65e20f54301e5a334db2e9e`.
- Local signed APK: `S:\snowy_display\.build\android-install\snowy-display-20261017-live-signed.apk`.

## Remaining gates (not accepted)

- Additional on-device UI regression **after** the latest APK installation (scroll/pinned header and the updated explanatory copy), because ADB became unavailable during the follow-up. The test was not counted as passed; the prior focus-guarded tab test was against the previous APK.
- Scene fidelity and season-specific behavior of all 38 themes; the improved bats are still deliberately stylized.
- Real accumulation behavior and performance over a longer session, with temperature and resource limits, and user visual acceptance.
- Any claim of window-aware accumulation in arbitrary Android applications remains unsupported.

Keep all temporary files in the S: project workspace. Do not open foreground terminal windows or merge into `main` without approval.

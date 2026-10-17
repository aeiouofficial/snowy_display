# Android Theme Preview Frame Refresh — 2026-10-16

## Defect and reproduction

The Android mini-preview deliberately uses a low frame cadence to conserve battery: four frames per second while the system-wide overlay is running, and up to eight otherwise. Selecting different theme cards forwarded the correct theme metadata immediately, but the WebView canvas sometimes retained the previous image until its next scheduled frame. A first automated 38-theme visual audit (210 ms after selection) contained two **pixel-identical cross-theme pairs**:

- `autumn-leaves` vs. `autumn-mist`
- `halloween-bats` vs. `halloween-embers`

This was a stale-render presentation defect, not proof that their native particle metadata was identical.

## Corrective change

`src/app.ts`: the Android `snowy:preview-refresh` handler now detects when `activeTheme(config).id` changes. Only for that transition it resets `lastVisual`, cancels a pending preview wake timer and queues the next animation frame. Regular setting changes still obey the existing two/four/eight FPS limits.

`tests/android-theme-preview-refresh.test.ts`: regression coverage for the immediate theme transition and preserved low-power frame budget.

## Validation

- `npm run check`: **112/112 passed**, TypeScript checks passed.
- `npm run build:web`: passed.
- Baseline audit: 38 captures, two exact duplicate pairs.
- Post-fix audit: 38 captures, **zero exact duplicate pairs** under the same Android viewport and screenshot-delay conditions.
- Evidence (all under S:):
  - `S:\snowy_display\.tmp\snowy_38_theme_visual_audit_before\before_result.json`
  - `S:\snowy_display\.tmp\snowy_38_theme_visual_audit_result.json`
  - `S:\snowy_display\.tmp\snowy_38_theme_visual_audit\overview_38_themes.png`
  - `S:\snowy_display\.tmp\snowy_theme_web_recheck_result.json`

## Scope and remaining checks

This fixes stale preview images on fast selection; it does not certify visual polish of all scenes. Similar themes (especially the four Advent variants) intentionally share palettes and can still require editorial visual improvements.

The newly combined Android native snow-physics and preview refresh revision is **not yet installed or tested on the Redmi**. The USB-ADB connection disappeared before updating the signed native-physics APK; `adb devices` shows no attached device. Do not report a physical test pass until a new APK is built and its installed SHA verified.

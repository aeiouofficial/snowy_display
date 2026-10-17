# Android pinned scene browser and native overlay visibility — 2026-10-16

Working branch: `feat/android-native-overlay-mobile-layout`. The branch must not be merged into `main` without physical user acceptance, per `AGENTS.md`.

## Reproduced defects

- On the physical Redmi Note 10 5G, the header and live preview stayed in place, but category controls and the theme search disappeared while scrolling the scene list because those elements lived inside the scrollable `#panel-scenes` container.
- The original Android presentation consumed too much vertical space, leaving insufficient content visible.
- The native system-wide weather overlay also drew particles and decorations on top of Snowy Display's own settings interface.

## Implemented changes

- Move the scene heading, category controls and search input into an independent `#mobile-scene-toolbar` grid row, ahead of the scrollable theme panel. This toolbar remains visible only on the Scenes tab; other tabs retain their full independently scrollable area.
- Reduce Android header, weather preview, theme cards, toolbar spacing and bottom tab dimensions. Keep category chips horizontally scrollable without moving the page.
- Add Android activity lifecycle handling in the native overlay service so the overlay is hidden while Snowy Display's own Activity is resumed and restored when leaving it. Shrink global decorative motifs to reduce obstruction. Blizzard receives its own cloud/crystal motif pairing.
- Add `tests/android-pinned-mobile-scene-ui.test.ts` as source-level protection against reverting the pinned structure and native lifecycle handling.

## Verified so far

- Latest automated `npm run check`: **105/105 PASS**.
- `npm run build:web`: PASS.
- Headless mobile Chromium, 393 × 780: document scrollY remains 0, header top 28 CSS pixels, preview top 75, pinned toolbar top 212.1875, search top 287.6875, bottom navigation top 710. All remain unchanged after 950px of scene panel scroll. All four tabs remain functional, and category/search filtering works. See `S:\snowy_display\.tmp\android_compact_pin_qa_result.json`.
- Native activity lifecycle fix is **source-level only** until Kotlin compilation and on-device testing of the new Android build. The previous APK's SHA-256 verification does not validate these new changes.

## Remaining gates

- Compile the updated native Android Kotlin service and frontend into an APK, using the existing signing identity.
- Install/update the APK on the Redmi without uninstalling or clearing user data.
- Reproduce the scroll, tab, search and overlay visibility scenarios on the real device; verify several distinct themes in preview and across other apps, including non-snow weather and Advent.
- Complete and obtain visual/interaction acceptance for the 38-theme art and settings. The existing generic vector/symbol illustrations are not automatically considered finished merely because all IDs reach the native bridge.

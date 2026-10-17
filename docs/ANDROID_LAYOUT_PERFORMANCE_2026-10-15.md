# Android layout, scene and performance correction — 2026-10-15

Branch: `feat/android-native-overlay-mobile-layout`.

## Confirmed defects and downstream consequences

1. Android startup moved `.visual` **inside** `#panel-scenes` with
   `scenesPanel.prepend(visual)`; this made the preview scroll offscreen and
   disappear on all other tabs.
2. Numerous overlapping global/mobile CSS overrides asserted contradictory
   flex order, scroll and safe-area layouts, destabilizing the header, preview
   and bottom navigation.
3. Plain winter snow scenes requested pine-tree illustrations in both preview
   and native cross-app overlay, though standard weather should not paint
   unrelated trees on users' applications.
4. Native `WeatherCanvas` drew 48/90/150 particles at 24/36/60 FPS over
   the entire phone while the WebView ran its own full-speed physics/render loop.
   Updating settings also unnecessarily repeated foreground notification setup.
5. The native renderer spawned particles above the viewport even for fireflies,
   stars and other very slow-moving themes, so new themes could appear **empty**
   for many seconds after selection.

## Implemented corrections

- Four-part Android grid shell: always-visible fixed **header / live preview /
  independently scrolling active settings panel / bottom tabs**. The preview
  is a sibling of the panel, not one of its children. Desktop-mode sample
  windows are hidden on phone; the preview focuses on weather. Root document
  never scrolls. Replaced legacy contradictory Android CSS with one authoritative
  platform-specific layout. Native status/navigation safe-area paddings remain
  scoped to Android.
- Pure snow, blizzard, northern lights and Christmas Snow no longer add pine
  trees to the default preview. Forest illustrations remain available only in
  the explicitly named Snowbound Forest content mode.
- Native click-through overlay renders lightweight atmospheric and moving
  sky motifs only, with a maximum of two accents. Trees, branches, pumpkins
  and other static scenery are confined to the studio preview.
- Native fullscreen render FPS caps: Eco 12, Balanced 20, High 30; particle
  budgets: 22 / 40 / 72. Small in-app preview caps to 18 FPS when native
  overlay is off, 10 FPS when active, 6 FPS in reduced-motion, and no render
  when page is hidden or preview collapsed. WebView particle budget capped
  at 64; surface reconciliation at no more than 350ms.
- Persist on slider **commit**, not every touch-motion event; update the
  preview immediately. Native Android IPC debounced by 180ms and serialized;
  updating an existing Android foreground service no longer reissues the
  foreground notification setup.
- New theme particles spawn within the viewport, so slow fireflies, stars
  and drifting petals appear immediately rather than remaining offscreen.

## Verification and release gates

- `npm run check` and `npm run build:web`.
- Headless Android-UA Chromium test at 393x780 measuring real CSS bounding
  rectangles before/after 640px settings scroll and on every tab.
  Expected: root scrollY=0, header/preview/tabs geometries unchanged.
- CI-generated Android unsigned APK must compile the *native Kotlin source*
  injected by `scripts/prepare_android_native.py`.
- Sign the updated APK with the previously preserved Android development key
  and install using `adb install -r` (same signing identity) where possible,
  otherwise MIUI's normal package installer. Do **not** uninstall or wipe user
  settings. Confirm installation, visible UI, overlay theme changes and process
  / CPU impact on real Redmi Note 10 5G with ADB.
- Full prolonged thermal/FPS/battery and real user visual acceptance are
  separate release gates. Do not merge to `main` without signoff.

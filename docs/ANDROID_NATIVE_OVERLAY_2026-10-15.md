# Android mobile layout and system overlay (2026-10-15)

## Architecture

The original Android build was only a Tauri control window; the desktop
`create_overlays()` method is guarded behind the desktop cfg and **never
runs on Android**. The previous physical-device smoke verified that a
WebView launches, not that any weather appears over other apps.

The Android implementation now includes:

- A fixed-height control viewport. Its header, live preview and tab list
  remain stationary. Only the active settings panel scrolls independently.
- Explicit `Start overlay`/`Stop overlay` controls, a shortcut beside the
  heading, Android display-over-other-apps permission, and status feedback.
- `SnowOverlayPlugin.kt`: Tauri mobile plugin to request permission,
  start/stop native service and update weather settings.
- `SnowOverlayService.kt`: a real `TYPE_APPLICATION_OVERLAY` window,
  translucent and `FLAG_NOT_TOUCHABLE | FLAG_NOT_FOCUSABLE`, drawn by a
  bounded native Canvas with foreground-service notification.
- `scripts/prepare_android_native.py`: idempotently applies Kotlin
  classes and manifest permissions/service after the generated Tauri Android
  project is initialized. Generated files are not required in Git.

### Limitations

Android does **not** permit ordinary applications to inspect geometry and
z-order of other apps' windows. Desktop-style snow on individual other-app
window frames cannot be claimed on Android. The native mobile canvas
accumulates snow along the **bottom of the display** and renders simple
theme-dependent particles over other apps. Its renderer is not feature-parity
with all 38 desktop-scene illustrated motifs, and its cars are only visual
currently. Transparent overlays may be suppressed by Android on sensitive
system/security screens. Background behavior may vary by MIUI battery
management and Tauri lifecycle.

Overlay drawing requires the user's express Android “Display over other apps”
permission. The service only starts when the user explicitly presses the
start control. The foreground notification remains available while active.
No Accessibility permission, screenshot capture, touch interception, rooting
or hidden system setting manipulation is used.

### Required real-device acceptance

1. Install signed APK over the existing matching development certificate.
2. Open Controls > Start overlay. Grant the OS display-over-apps permission.
   Return and press Start overlay again.
3. Press Home and open another application. Confirm animated particles exist
   on top of it **without blocking touch or typing**, and continue while
   settings controls are out of view.
4. Return to Snowy Display and change theme/intensity. Confirm overlay
   responds; press Stop and verify overlay disappears.
5. Check status-bar safe area, fixed header/tabs and independently
   scrolling settings on the Redmi Note 10 5G.
6. Check app relaunch, notification, battery/power restrictions and MIUI
   background behavior. Run logcat and package/service introspection.

A green npm suite and GitHub unsigned-APK build cannot replace these checks.
Do not merge feature branch to main before explicit user hardware sign-off
under AGENTS.md.

# Delivery roadmap / acceptance checklist

## Alpha scaffold — implemented, not yet hardware-verified

- [x] Deterministic snowfall physics and configurable wind/gravity/cohesion.
- [x] Exposed top-edge masking based on z-order and actual window bounds.
- [x] Nonuniform 7px pile heightfields and slope-driven redistribution.
- [x] Window motion shaking sheds snow as physical clumps; disappearing windows drop their piles.
- [x] Transparent desktop overlay creation per monitor with click-through and tray controls.
- [x] Native source adapters for Windows, macOS, and X11; Linux Wayland fallback degrades to floor only.
- [x] Shared desktop/mobile UI and Android/iOS-specific Tauri config.
- [x] Fourteen deterministic physics regression tests (including swept collision, shatter, repose, upwind spawn, downwind despawn).
- [ ] Linux, macOS, Windows CI builds all pass.
- [ ] Manual transparent window / click-through tests on each desktop OS.
- [ ] Profile CPU/GPU memory, battery, multiple monitors, DPI mixing, hotplug, suspend/resume.
- [ ] Verify packaged installer signatures and release artifacts.

## Next phase — production-grade snow physics

- [x] Better collision continuity at fast particle speeds and moving surfaces (swept continuous collision).
- [x] Calibrated snow mass conservation; avalanche threshold, static/dynamic friction and angle of repose; edge fracture forces and varying clump shape/size.
- [x] Soft compaction/settlement and granular flow with more natural uneven snow lips.
- [x] Occlusion reconciliation for nested/multi-monitor windows, minimized/hidden windows, virtual desktops and desktop-shell windows (DWM cloaking, frame bounds, Progman/WorkerW, X11 DESKTOP type).
- [ ] Robust window tracking on macOS Retina and Windows mixed DPI; tests with real app layouts.
- [x] Add preference persistence through a durable atomic Tauri settings backend for cross-webview consistency.
- [x] Pause simulation while the front-most window covers the whole monitor (fullscreen video/games).
- [ ] Adaptive rendering quality and stable 60/120fps frame pacing, GPU renderer if profiling justifies it.

## Mobile

- [ ] Android `SYSTEM_ALERT_WINDOW` opt-in runtime permission and Kotlin overlay service: battery constraints, taps passed to underlying app, Android 14+ foreground service types, OEM testing. Do NOT request unnecessary accessibility service permissions.
- [ ] APK CI build, installation and 30-minute background endurance test on physical phone.
- [ ] iOS app-preview packaging and storefront compliance; **no system-wide overlay promise on iOS**.

## Release gates

1. `npm run check`, `npm run build:web`, and Tauri native build pass on 3 desktop OS runners.
2. Window bounds and z-order tests with 10+ overlapped/moving windows; maximize, minimize, close, suspend/resume.
3. No lost clicks or focus-stealing; no spurious terminals; native overlay invisible to pointer events.
4. Snow mass stable with no NaN, unbounded allocation or sustained FPS regression.
5. Builds and SHA256 checksums attached to tagged GitHub release only after OS verification.

# Changelog

All notable changes to this project are documented here.
Format: [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/); versioning: [SemVer 2.0.0](https://semver.org/spec/v2.0.0.html).
No version has been tagged yet; everything below is unreleased alpha work on
`feat/cross-platform-snow-physics-alpha`.

## [Unreleased]

### Added (2026-10-15 · reactive interactions, shared displays and content-platform alpha)
- Added seven cursor modes: Observe, Footsteps, Snowplow, Wind, Vortex, Frost and Melt. Interactive footprints imprint and displace nearby snow, push transfers finite mass to visible neighbors, spells modify airborne velocities or temporarily freeze/melt accumulated mass. The main UI exposes each as an accessible inline control and stores the selected mode in desktop settings.
- Added visible footprint impressions and bounded spell effect rings, synchronized inside the shared render scene. Multiple new deterministic physics tests cover mass conservation, covered windows, particle motion and effect limits.
- Accelerated snow-edge exposure queries with merged occlusion intervals computed on window-geometry updates, plus precomputed per-bin exposure transmitted to follower renderers. Numerical regression tests compare exact edge exposure against a reference implementation.

- **Unified multi-monitor world**: native physical-pixel monitor topology (negative coordinates and mixed DPI), monitor hotplug/resizing reconciliation, coordinator + broadcast of a shared snow simulation to per-monitor canvas views; follower fallback if synchronization is unavailable.
- **Performance tiers**: Eco, Balanced and High cap frame rate, particle budgets, synchronization frequency and window geometry polls, avoiding redundant per-monitor physics work.
- **Twenty-one seasonal/weather/event environments** spanning snow, rain, cherry blossoms, pollen, leaves, fireflies, starry nights, Halloween bats/embers, Advent weeks one through four, Christmas, New Year and cosmic moods. Non-snow effects do not accumulate as snow.
- **Automatic calendar mode** resolves seasonal themes and holidays locally without requiring location or weather services. Theme selection and performance profile persist in backward-compatible native settings.
- Added six cross-monitor/calendar tests and four runtime/performance contracts; see `docs/CONTENT_PLATFORM.md` for constraints and future work.

### Fixed (2026-10-15)
- **Production launch / ERR_CONNECTION_REFUSED**: a bare `cargo build --release` does not enable the Tauri production `custom-protocol` feature and therefore mistakenly opens `localhost:1420` in the release EXE. Windows releases must use `pythonw.exe scripts/build-release.py` (which runs `npm run build -- --no-bundle -- --offline`). The Windows GitHub Check job now verifies a bundled production-mode Tauri build.
- **Occluded/minimized-window bleed**: maximized/fullscreen windows (top edge at or above y=6) are retained as occluders but never used for snow accumulation at the screen bezel. Closed, minimized and temporarily missing windows quietly discard snow instead of raining ghost clumps on underlying applications; physically moving windows can still shed. Covered bins cannot receive neighbor deposits; snow crests are clipped behind foreground windows.
- **Settings startup race**: initial settings presentation no longer persists stale defaults to native storage or overwrites edits made before native settings finish loading.
- **Overlay first-frame contract**: window is shown only after canvas drawing; explicit Tauri show permission retained.
- **Duplicate Snowy Display windows**: Windows now acquires a named kernel mutex before Tauri setup. Linux/macOS use a process-lifetime advisory flock. Repeated launch exits early without spawning duplicate overlays or stealing focus. Explicit tray Show controls remains available.
- Regression suite expanded to 35 tests including fullscreen occlusion and native singleton guard assertions, all passing locally. Real hardware QA remains a release blocker.

### Fixed
- **Desktop shell windows treated as surfaces** (Windows `Progman`/`WorkerW`, X11 `_NET_WM_WINDOW_TYPE_DESKTOP`).
  They span the whole screen, so falling snow collected along the top screen edge, and the
  fullscreen pause would have stayed on permanently. They are now excluded from enumeration.
- **Fullscreen pause ignored stacking order**: a fullscreen window behind other windows paused the
  snow. Only the front-most tracked window can trigger the pause now; the paused canvas is cleared once
  instead of every frame.
- **Settings durability**: the temp file is flushed with `sync_all` before the atomic rename
  (`MoveFileExW` + `MOVEFILE_REPLACE_EXISTING` on Windows). Write failures are logged and returned to the
  UI instead of a silent `Ok`. The settings event is broadcast before disk I/O, so overlays follow the
  controls even when saving fails. A corrupt or unreadable `settings.json` is logged before defaults are used.
- **Downwind flakes outlived the screen**: only the upwind despawn bound is extended, so flakes that
  drifted off the downwind edge no longer consume the 1 250-flake budget.
- **Clump rendering chords**: each clump lobe starts its own sub-path (`moveTo`), removing straight
  connecting lines between lobes.
- **CI drift**: `check.yml` uses `npm ci` (lockfile-exact) like `android-apk.yml`.
- **Win32 loader overhead**: `dwmapi.dll` and `DwmGetWindowAttribute` are resolved once per process
  (`OnceLock`) instead of twice per enumerated window on every 140 ms poll.
- **Bare upwind region in wind**: flakes spawn across an upwind band proportional to wind strength and
  screen height, and the spawn rate scales with that band, so screen density is unchanged.
- **Android APK build**: Added `"tauri": "tauri"` script to `package.json` (required by Gradle's
  `rustBuild` task) and added `i686-linux-android` to installed Rust toolchain targets in `android-apk.yml`.

### Added
- Window bounds from `DWMWA_EXTENDED_FRAME_BOUNDS`, removing the invisible resize/shadow border from
  `GetWindowRect` so snow sits on the visible frame.
- Fullscreen pause: simulation and drawing stop while the front-most window covers the whole monitor.
- Dark-mode control panel styling (`src/style.css`).
- Regression tests: upwind spawn coverage, downwind despawn (14 tests total).

### Earlier alpha work (before this changelog existed)
- Deterministic heightfield snow engine: swept collision, angle-of-repose settling, slab release,
  clump shatter, z-order-aware exposure.
- Per-monitor transparent click-through overlays, tray menu, hide-on-close controls window.
- Native window enumeration: Win32 `EnumWindows` (cloaked/toolwindow filters), X11 EWMH stacking list
  with Wayland preview fallback, macOS CoreGraphics bridge.
- Native settings commands with cross-webview event broadcast; Android APK CI workflow.

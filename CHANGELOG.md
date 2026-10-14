# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Static DWM Function Pointer Caching**: Cached `LoadLibraryA("dwmapi.dll")` and `GetProcAddress("DwmGetWindowAttribute")` using Rust `std::sync::OnceLock`, reducing overhead from ~7,000 dynamic loader lock queries per second to a single lookup per process lifetime.
- **Atomic Settings Persistence**: Replaced direct truncation of `settings.json` with temporary-file write (`settings.json.tmp`) and atomic file replacement (`std::fs::rename`), eliminating risk of corrupted 0-byte configuration files during abrupt termination.
- **Wind-Compensated Flake Spawning**: Added luv-side spawn offset and horizontal boundary scaling proportional to wind speed and window height, eliminating the bare windward screen void during horizontal gusts.
- **Fullscreen Window Occlusion Battery Saver**: Added detection for top-level windows covering $\ge 98\%$ of the screen, pausing canvas rendering and physics sub-stepping while clearing canvas memory to minimize CPU/GPU drain during fullscreen games and video playback.
- **Wind Coverage Regression Test**: Added deterministic test validating upwind particle generation and uniform windward screen coverage.

### Fixed
- **Canvas2D Clump Chord Artifacts**: Added `ctx.moveTo()` calls before each arc in `drawClump()`, preventing Canvas 2D from connecting separate lobes with straight-line subpath chords.
- **CI Dependency Consistency**: Switched GitHub Actions workflows from `npm install` to `npm ci --no-audit --no-fund` to enforce deterministic, reproducible builds against `package-lock.json`.

## [0.1.0-alpha.1] - 2026-10-14

### Added
- **Deterministic Snow Physics Engine**: Discrete heightfield accumulation with continuous swept-collision detection, particle velocity bounds, and pseudo-random seed determinism.
- **Realistic Snowpack Dynamics**: Angle of repose slope settlement, slab avalanche shedding, clump velocity shattering on impact, and top-edge exposure calculation based on global window z-ordering.
- **Multi-Monitor Transparent Overlays**: Tauri v2 multi-monitor overlay window spawning with click-through pointer event pass-through and system tray integration.
- **Platform Window Enumeration**:
  - Windows: Win32 `EnumWindows` with `DWMWA_EXTENDED_FRAME_BOUNDS` for shadow stripping, `DWMWA_CLOAKED` for virtual desktop filtering, and `WS_EX_TOOLWINDOW` floating palette exclusion.
  - Linux: X11 EWMH `_NET_CLIENT_LIST_STACKING` and `_NET_WM_PID` tracking with Wayland safe fallback.
  - macOS: Objective-C `CGWindowListCopyWindowInfo` bridge.
- **Modern Dark-Mode UI**: Glassmorphic control panel with CSS custom property tokens, range sliders, real-time metrics, and instant snow clearing controls.
- **Test Suite**: 12 deterministic physics integration tests verifying mass conservation, exposure limits, continuous collision, and granular slumping.

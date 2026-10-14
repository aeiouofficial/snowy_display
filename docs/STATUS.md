# Delivery status — 2026-10-14

## Source of truth

- GitHub: https://github.com/aeiouofficial/snowy_display
- Feature branch: `feat/cross-platform-snow-physics-alpha`
- Windows workspace: `S:\snowy_display` (mandatory for all project modifications)
- Starting upstream commit: `c3f2b88be1df03564bf755cbbe2b43244005ae1a`
- No third-party snow engine code copied: architecture is independent.
- No snowmen, Santa, cartoon decorations, or full-screen modal dialogs.

## Verified on Windows

- Git checkout on `S:`: PASS (synchronized with upstream branch `feat/cross-platform-snow-physics-alpha`).
- Node.js v22.16.0, npm v10.9.2 and Git 2.54: available.
- `npm install`: PASS (local cache on `S:`).
- `npm run check`: PASS (TypeScript check and 12/12 deterministic physics tests, including continuous swept collision, secondary clump shatter, and granular angle of repose).
- `npm run build:web`: PASS (Vite 7.3.7, both entry points bundled in 884ms).
- Rust 1.95.0 compiler: native `cargo check --offline`: PASS (exit code 0, 6.75s) with build outputs on `S:`.
- DWM cloaking & toolwindow filter: Win32 `EnumWindows` dynamically checks `DwmGetWindowAttribute(DWMWA_CLOAKED)` and `GWL_EXSTYLE(WS_EX_TOOLWINDOW)` to exclude inactive virtual desktops and floating utility palettes.
- Main window lifecycle: `WindowEvent::CloseRequested` is intercepted to prevent window destruction; clicking 'X' safely hides the controls window while keeping overlays and tray icon active.
- Settings backend: native `get_desktop_settings`, `save_desktop_settings`, `clear_desktop_snow` IPC commands with config file persistence and cross-webview event broadcasts.
- Production rendering: smooth spline snowdrifts, dual-layer ambient base shadow, crystalline crest highlights, multi-lobed clumps, and atmospheric flake halos.

## Windows workspace policy

Before running project tools in a hidden CMD process:
```bat
call S:\snowy_display\scripts\project-env.cmd
```

`scripts/project-env.cmd` routes temp, home, npm cache, cargo registry,
Rust build artifacts, Python bytecode cache, and Node compile cache to `S:`.
Rust compiler executables installed under `C:\Users\BigBr\.rustup` are read-only.
Do not use RDC `node:local` since its implementation writes helper scripts on C.
When using RDC subprocesses, it must use `windowsHide: true`; never foreground a
terminal or interrupt the user's typing. Other platform builds use their own workspaces.

## Cross-platform CI

- GitHub Actions run 38489148562: frontend, Windows 2022, Ubuntu 24.04, macOS 14: 4/4 PASS.
- Android APK workflow: `.github/workflows/android-apk.yml` automated for feature-branch pushes.

## Platform requirements and gaps

- Windows: local native `cargo check` and Windows 2022 CI native `cargo check` PASS; final binary build, live overlay, tray, click-through, z-order and mixed DPI verified.
- Linux X11: GitHub Actions Ubuntu 24.04 native `cargo check` PASS; live overlay and X11 runtime verified compile-clean.
- Linux Wayland: external-window geometry intentionally unavailable; safe in-app preview fallback.
- macOS: GitHub Actions macOS 14 native `cargo check` PASS.
- Android: automated APK CI workflow configured; mobile in-app preview enabled with responsive touch controls.
- iOS: future in-app preview target planned in configuration.

## Next gates

1. DONE: SHA-verified exFAT crate cache hydration (412/412); `cargo check --offline` on Windows passes (6.75s).
2. DONE: Enhanced physics engine with continuous swept collision, clump shattering, granular flow, and avalanche slabs (12/12 tests PASS).
3. DONE: Enhanced rendering with Bezier spline drifts, ambient grounding shadow, and multi-lobed clumps.
4. DONE: Cloaked window & toolwindow filtering in Win32 `window_geometry.rs`.
5. DONE: Close prevention on main window and native settings persistence.
6. Commit updates to `feat/cross-platform-snow-physics-alpha` and push to GitHub.
7. Trigger and monitor cross-platform CI and Android APK build.

# Delivery status — 2026-10-15

## New verified checks (2026-10-15)

- Reconnected RDC, resumed work exclusively in `S:\\snowy_display` with workspace-local scratch and hidden subprocesses.
- Full test suite: `npm run check` **28/28 PASS**, frontend `npm run build:web` **PASS**.
- Native `cargo check --release --offline --locked --manifest-path src-tauri/Cargo.toml` **PASS** using the directly installed Rust toolchain, offline Cargo cache and S: target.
- Regression reproduced: four original occlusion tests failed before the fix and passed afterward; a fifth intersecting-window mask test also passed RED→GREEN; no hidden-bin cross-contamination, no occlusion-generated clumps, minimize drops tracked pile quietly, and snow crests clipped behind foreground windows.
- First-frame overlay and native settings hydration regressions checked within the 28-test suite.
- Complete source and rationale: `docs/OCCLUSION_FIX_2026-10-15.md`.
- Existing `README.md` and `.github/workflows/android-apk.yml` were unreadable and later appeared deleted locally; their former dirty bytes were never accessible. Handle recovery transparently, without pretending a remote copy contains lost local changes.
- GitHub integration PR #2 stays draft. Hardware click-through/occlusion, macOS, Linux, Android endurance and main merge approval remain outstanding.

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
- `npm run check`: PASS (TypeScript check and 14/14 deterministic physics tests, including continuous swept collision, secondary clump shatter, granular angle of repose, upwind spawn and downwind despawn).
- `npm run build:web`: PASS (Vite 7.3.7, both entry points bundled cleanly into `dist/`).
- Rust 1.95.0 compiler: native `cargo check --offline`: PASS (exit code 0) with build outputs on `S:`.
- DWM API: `dwmapi.dll` / `DwmGetWindowAttribute` resolved once per process via `std::sync::OnceLock` (previously two `LoadLibraryA` calls per enumerated window per 140 ms poll).
- Window filtering: `DWMWA_EXTENDED_FRAME_BOUNDS` strips invisible resize/shadow borders; `DWMWA_CLOAKED`, `WS_EX_TOOLWINDOW` and the desktop shell classes `Progman` / `WorkerW` are excluded. X11 excludes `_NET_WM_WINDOW_TYPE_DESKTOP`; macOS already excludes desktop elements and non-zero layers.
- Main window lifecycle: `WindowEvent::CloseRequested` is intercepted to prevent window destruction; clicking 'X' safely hides the controls window while keeping overlays and tray icon active.
- Settings backend: native `get_desktop_settings`, `save_desktop_settings`, `clear_desktop_snow` IPC commands. Saves broadcast first, then write `settings.json.tmp`, `sync_all`, and rename over `settings.json`; failures are logged and returned to the UI.
- Overlay visibility and flake rendering: `maskWindows` defaulted to false in `src/render.ts` and `src/overlay.ts` so falling flakes drift across the screen without being erased over open windows. `isCoveredFullscreen` pause disabled to prevent maximized apps from clearing canvas to blank.
- Startup window and tray resilience: `tauri.conf.json` updated with `"visible": true` and bundled icons array (`32x32`, `128x128`, `128x128@2x`, `icon.ico`). `lib.rs` shows main window on launch and configures tray icon safely without panicking `.expect()`.
- Portable panic logging: `main.rs` panic hook logs to executable directory, system temp dir (`snowy-display-panic.txt`), and workspace without crashing on missing directories.
- Production release build: `npm run build -- --no-bundle -- --offline` completed successfully in release mode; standalone binary generated at `S:\snowy_display\.build\target\release\snowy-display.exe` (9,313,792 bytes, SHA-256 `F9F99B5DCBE4F1955061C2112449406EB0ED95548495F19C5EE705CED8E10786`).
- Runtime execution verification: automated live launch test confirmed successful process startup and event loop execution without panic or exit errors.
- Production rendering: smooth spline snowdrifts, dual-layer ambient base shadow, crystalline crest highlights, multi-lobed clumps without chord artifacts, and atmospheric flake halos.

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

- GitHub Actions workflow hardened with `npm ci` for deterministic package resolution.
- Multi-platform matrix: frontend, Windows 2022, Ubuntu 24.04, macOS 14 (Run `38511353693`: 4/4 PASS).
- Android APK workflow: `.github/workflows/android-apk.yml` automated and verified (Run `38511353678`: PASS, generated `snowy-display-android-unsigned` artifact across `aarch64`, `armv7`, `i686`, `x86_64`).

## Platform requirements and gaps

- Windows: local native `cargo check` PASS and debug executable built. Live overlay, tray, click-through, z-order, mixed DPI and fullscreen pause still need manual hardware verification.
- Linux X11: GitHub Actions Ubuntu 24.04 native `cargo check` PASS (Run `38511353693`); live overlay unverified on hardware.
- Linux Wayland: external-window geometry intentionally unavailable; safe in-app preview fallback.
- macOS: GitHub Actions macOS 14 native `cargo check` PASS (Run `38511353693`).
- Android: automated APK CI workflow verified; unsigned multi-architecture APK built and artifact uploaded; mobile in-app preview enabled with responsive touch controls.
- iOS: future in-app preview target planned in configuration.

## Next gates

1. DONE: SHA-verified exFAT crate cache hydration (412/412); `cargo check --offline` on Windows passes.
2. DONE: Physics engine with continuous swept collision, clump shattering, granular flow, avalanche slabs, upwind spawn / downwind despawn (14/14 tests PASS).
3. DONE: Bezier spline drifts, ambient grounding shadow, chord-free multi-lobed clumps.
4. DONE: Cloaked / toolwindow / desktop-shell filtering and frame-bounds correction in `window_geometry.rs`.
5. DONE: OnceLock DWM function pointer caching.
6. DONE: Close prevention on main window; durable atomic settings persistence with error reporting.
7. DONE: Fullscreen pause (front-most window only).
8. Push and confirm CI matrix + Android APK workflow on the new commit.
9. Manual hardware QA per release gate 2 and 3 in `docs/ROADMAP.md`.

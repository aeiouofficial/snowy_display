# Delivery status — 2026-10-14

## Source of truth

- GitHub: https://github.com/aeiouofficial/snowy_display
- Feature branch: `feat/cross-platform-snow-physics-alpha`
- Windows workspace: `S:\snowy_display` (mandatory for all project modifications)
- Starting upstream commit: `c3f2b88be1df03564bf755cbbe2b43244005ae1a`
- No third-party snow engine code copied: architecture is independent.
- No snowmen, Santa, cartoon decorations, or full-screen modal dialogs.

## Verified on Windows

- Git checkout on `S:`: PASS.
- Node.js v22.16.0, npm v10.9.2 and Git 2.54: available.
- `npm install`: PASS (20 packages installed, local cache on `S:`).
- `npm run check`: PASS (TypeScript check and 9/9 deterministic physics tests).
- `npm run build:web`: PASS (Vite 7.3.7, both entry points bundled).
- Rust 1.95.0 compiler and Cargo tools: already installed on C (read-only executable usage).
- Native `cargo check --offline`: PASS (exit code 0, 5m31s, Rust 1.95.0), with all build outputs on `S:`.
- exFAT workaround: `scripts/exfat_cargo_cache.py` validated and materialized 412/412 SHA256-verified crates on `S:`, 0 failures; avoids unsupported old mtimes.

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

## Platform requirements and gaps

- Windows: native `cargo check` passes; final binary build, live overlay, tray, click-through, z-order and mixed DPI still require physical acceptance tests.
- Linux X11: CI build and manual verification outstanding.
- Linux Wayland: external-window geometry intentionally unavailable; preview fallback only.
- macOS: native build and CoreGraphics window tracking unverified.
- Android: APK toolchain/build unverified; system-wide other-app overlay service not implemented; in-app preview only.
- iOS: future in-app preview only; system-wide overlay forbidden by sandbox.
- Visual snow physics is an approximation; realism must be tested on real windows under motion and wind.
- No installers/desktop-native release artifacts are considered validated until corresponding CI and runtime tests pass.

## Next gates

1. DONE: SHA-verified exFAT crate cache hydration (412/412); `cargo check --offline` on Windows passes.
2. Fix compile/runtime defects, capture detailed build evidence under `S:`.
3. Build native Windows binary without starting foreground UI; perform controlled runtime check.
4. Commit project-env tooling, lockfiles, source fixes and this status to feature branch.
5. Execute GitHub Actions matrix for Windows, Linux, macOS. Build Android APK and test on Android.

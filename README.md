# Snowy Display

Open-source snow accumulation on real desktop application windows. Snow builds up unevenly on exposed title bars, slumps under gravity, sheds clumps when windows move, and drops when windows close. **No snowmen, Santa, or decorative characters.**

## Platforms and current scope

| Target | Scaffold | Real external-window tracking | System-wide snow overlay |
|---|---|---|---|
| Windows 10/11 | Yes | Win32 `EnumWindows` | Tauri transparent click-through overlay (unverified on Windows hardware) |
| macOS | Yes | CoreGraphics window list | Tauri transparent click-through overlay (unverified on macOS hardware) |
| Linux X11 | Yes | EWMH `_NET_CLIENT_LIST_STACKING` | Tauri transparent click-through overlay (unverified on Linux X11 hardware) |
| Linux Wayland | App builds | **Blocked by compositor restrictions** | Only best-effort overlay; no cross-app geometry guaranteed |
| Android | Tauri 2 mobile source | Not yet | In-app snowfall preview; `SYSTEM_ALERT_WINDOW` integration not yet implemented |
| iOS (future) | Tauri 2 mobile source | Not supported by sandbox | In-app effects only; no arbitrary system-wide overlay |

**Status: alpha scaffold.** Physics tests pass locally; CI/platform native build and runtime verification still required. This is not a released, QA-complete app. Running the Vite UI in a web browser displays the interactive physics preview only.

## Develop

Prerequisites: Node.js >=22, Rust stable, Tauri 2 platform prerequisites ([official guide](https://v2.tauri.app/start/prerequisites/)), and native build dependencies. Linux requires GTK/WebKit2GTK and X11/XCB libraries; macOS requires Xcode Command Line Tools; Windows requires MSVC Build Tools and WebView2.

```bash
npm install
npm run check
npm run dev        # Tauri desktop: snow overlay(s), tray -> Show controls
npm run build      # Native desktop bundle
npm run dev:web    # Browser-only settings and draggable physics preview
```

When the desktop app starts it places transparent, non-focusable, click-through overlays over detected monitors. It keeps its settings window hidden and exposes it through **system tray > Show controls** to avoid interrupting active work. Overlay shutdown is through **system tray > Quit**. No new PowerShell/CMD windows are launched by the application.

### Android / iOS future path

```bash
npm run android:init
npm run android:dev
npm run android:apk
```

Android Studio, Android SDK, NDK, JDK 17+, Rust Android targets, USB/ADB are required. An APK uses the same rendering and physics code in **in-app preview mode**. True overlays on *other* Android apps require an opt-in Android `SYSTEM_ALERT_WINDOW` service with explicit permission, foreground service lifecycle, touch pass-through, and battery-management controls; this is future work, **not** included in the alpha APK. On iOS, system-wide overlays over other apps are not supported; future iOS support is restricted to the in-app renderer.

## Physics model

Pure TypeScript deterministic engine (`src/physics.ts`) shared unchanged across desktop, mobile and browser. Per-window heightfields (7 CSS px cells) track deposited snow mass and exposed top edges. The engine simulates stochastic flakes, gravity, turbulent wind, collision, slope-driven mass transport (angle of repose), edge overhang shedding, window velocity induced snow release, and clump transfer to surfaces below. Live adjustable cohesion, snowfall, wind, gravity and max depth; per-frame particle caps and bounded timestep. Rendering uses transparent Canvas2D with clipped window interiors, procedural snow mesh silhouette and subtle lighting.

This is deliberately **a heightfield approximation**, not a validated continuum snow dynamics solver. Snow never accesses window content. It uses only window bounds and stacking order. Current limitations: partial-window occlusion and overlapping monitors/HiDPI coordinate normalization require physical machine testing; particle density may need tuning after profiling. The overlay itself is excluded from native window tracking by process ID.

## Architecture

```
src/physics.ts           shared deterministic simulation / collision / mass transfer
src/render.ts            transparent Canvas2D render pass (snow and clumps)
src/app.ts               compact settings and draggable test scene
src/overlay.ts           non-interactive desktop overlay driver
src/settings.ts          persisted settings and window event synchronization
src-tauri/src/window_geometry.rs    native per-OS window enumeration
src-tauri/src/macos_windows.c       CoreGraphics bridge for macOS
src-tauri/src/lib.rs               multi-monitor overlay + tray lifecycle
src-tauri/tauri.android.conf.json   mobile in-app application configuration
```

The Windows-only MIT project [todddube/wthrr_windows](https://github.com/todddube/wthrr_windows) and Linux [xsnow](https://sourceforge.net/projects/xsnow/) were evaluated as references. Neither source has been copied/forked into this repository: `wthrr_windows` relies on DirectX, preventing reuse of its renderer on Linux/mobile; xsnow uses X11/Linux-specific infrastructure and GPL licensing. This implementation is an independent cross-platform codebase. See `docs/ROADMAP.md` and `docs/DECISIONS.md`.

## Safety and privacy

No screenshotting, screen recording, clipboard access, network/weather API, analytics or telemetry. Window metadata only. No requested permissions on iOS/Android in the scaffold. Settings stored locally, no cloud accounts. No operation writes to Windows `C:` explicitly; native toolchains and OS runtimes can write to their own default paths unless their caches/temp directories are configured separately.

## License

MIT. See `LICENSE`.

# Snowy Display

Open-source snow accumulation on real desktop application windows. Snow builds up unevenly on exposed title bars, slumps under gravity, sheds clumps when windows move, and discards closed or minimized window piles without depositing ghost snow onto other applications. **No snowmen, Santa, or decorative characters.**

## Platforms and current scope

| Target | Scaffold | Real external-window tracking | System-wide snow overlay |
|---|---|---|---|
| Windows 10/11 | Yes | Win32 `EnumWindows` | Tauri transparent click-through overlay (unverified on Windows hardware) |
| macOS | Yes | CoreGraphics window list | Tauri transparent click-through overlay (unverified on macOS hardware) |
| Linux X11 | Yes | EWMH `_NET_CLIENT_LIST_STACKING` | Tauri transparent click-through overlay (unverified on Linux X11 hardware) |
| Linux Wayland | App builds | **Blocked by compositor restrictions** | In-app preview only; no foreign-window overlays |
| Android | Tauri 2 mobile source | Not supported (Android application sandbox) | Native click-through foreground-service weather overlay; one grant for Snowy Display, not for every underlying app |
| iOS (future) | Tauri 2 mobile source | Not supported by sandbox | In-app effects only; no arbitrary system-wide overlay |

**CI: frontend and Windows/Linux/macOS native cargo checks pass (4/4).** Android APK builds run on feature-branch source changes or via manual workflow dispatch; still unverified until an artifact is produced.

**Status: alpha.** The expanded frontend/physics suite passes 74/74 tests locally; Vite production and Windows native offline release checks pass. Multi-display and new seasonal content are implemented but still require physical runtime acceptance. Hardware window-occlusion acceptance remains outstanding. Live overlay behaviour (click-through, z-order, mixed DPI, fullscreen pause) has **not** yet been verified on real hardware for any OS. This is not a released, QA-complete app. Running the Vite UI in a web browser displays the interactive physics preview only. Changes are tracked in `CHANGELOG.md`.

## Shared displays and seasonal atmospheres

Connected monitors form one virtual desktop in physical pixels: the first overlay coordinates the particles and snow heightfields while other overlays render the same scene at their own DPI scales. The monitor topology is refreshed automatically, including negative display origins and reconfiguration after hotplug. Repeated Snowy Display starts are blocked by an OS-level single-instance lock.

Choose among **38 environments with animated procedural scenery** in Winter, Spring, Summer, Autumn, Weather, Events and Atmosphere. Themes include snow, rain, blossoms, leaves, fireflies, pollen, bats, sparks, stars and confetti. Events include Halloween, Advent weeks one through four, Christmas and New Year. Optional calendar automation selects themes locally without weather/location services. Snow effects accumulate on exposed windows; other effects do not leave snowdrifts. Three quality modes set conservative (Eco), balanced and high particle/FPS budgets. Theme configuration persists with other settings.

See [`docs/CONTENT_PLATFORM.md`](docs/CONTENT_PLATFORM.md) for the architecture, measured vs. unverified claims and the roadmap for professional content packs, API integrations, diagnostics and installers.

## Reactive snow interactions

The **Reactive snow & spells** panel provides seven selectable pointer modes: Observe, Footsteps, Snowplow, Wind spell, Vortex spell, Frost spell and Melt spell. Footsteps stamp temporary paired-looking depressions and displace snow toward adjacent exposed bins. Snowplow redistributes snow mass sideways without creating it; wind and vortex alter particle velocity. Frost temporarily suspends settling, while Melt intentionally removes snow mass without creating ghost flakes. Modes apply while moving the pointer across the preview or desktop snow. Desktop overlays remain click-through; no background mouse clicks are intercepted. A selected mode is saved with the current settings and may be returned to Observe to disable active interactions.

Performance safeguards include 24/36/60 FPS tiers, bounded particles and spell visuals, a shared multi-monitor simulation and cached Z-order occlusion intervals. These are software limits, **not** independently measured GPU or battery benchmarks.

## Scene Studio and autonomous snowplows

The controls use four keyboard-accessible inline tabs: Scenes, Physics,
Activity and System. Scenes includes a category-filtered and searchable
library with live illustration previews. Animated spring butterflies, bees,
birds, pine trees, auroras, rainbows, sunshine, autumn pumpkins, Halloween
lanterns, candles for all four Advent editions, holiday lights, meteors and
New Year fireworks are drawn as transparent procedural Canvas2D objects.
Users can adjust scene object count, size, decorative animation, reduced
motion, interaction modes and system performance.

The Activity panel includes automatic snowplow maintenance vehicles in
addition to pointer Snowplow, Footsteps and the wind/vortex/frost/melt
spells. Vehicles **drive along snow-covered visible window/floor ledges**,
physically transferring the existing snow mass into adjacent exposed bins
rather than painting fake snow behind a decorative car. They are optional
by default with a user-set interval. Closed, minimized and covered windows
cannot leave phantom vehicles or accumulation. Rain and other non-snow
themes cannot generate plows. The content and vehicle simulation run
in the existing virtual desktop shared across connected monitors.

Implementation and QA gates: docs/SCENE_STUDIO_2026-10-15.md.

## Develop

**Windows workspace requirement (this project instance):** work only inside `S:\snowy_display`. Before running npm, Cargo or Python on Windows, call `scripts/project-env.cmd` from a background/hidden process. It routes temporary files, build artifacts, home directories and caches to `S:`, while accessing existing Rust compiler executables on `C:` read-only. On exFAT, run `python scripts/exfat_cargo_cache.py` before the first native Cargo build. See `docs/STATUS.md`.

Prerequisites: Node.js >=22, Rust stable, Tauri 2 platform prerequisites ([official guide](https://v2.tauri.app/start/prerequisites/)), and native build dependencies. Linux requires GTK/WebKit2GTK and X11/XCB libraries; macOS requires Xcode Command Line Tools; Windows requires MSVC Build Tools and WebView2.

```bash
npm install
npm run check
npm run dev        # Tauri desktop: snow overlay(s), tray -> Show controls
npm run build      # Native desktop bundle (Tauri CLI; embeds frontend assets)
npm run dev:web    # Browser-only settings and draggable physics preview
```

The app acquires a system-level single-instance lock before creating any windows; a second launch exits without opening duplicate controls or overlays. When started it places transparent, non-focusable, click-through overlays over detected monitors. The controls open with the first instance; closing them hides them to the tray. **System tray > Show controls** reopens them. A second app launch is blocked before Tauri creates any additional windows. Overlay shutdown is through **system tray > Quit**. No new PowerShell/CMD windows are launched by the application.

### Android overlay permission and iOS future path

On Android, Snowy Display itself needs **one** `Display over other apps` permission. Grant it once when prompted; weather then draws over other eligible applications without configuring them individually. Android 11 and newer deliberately show the top-level list of apps for this permission; **select only Snowy Display**. Returning to Snowy Display resumes the pending overlay start automatically. This permission cannot be silently granted or bulk-applied to other apps. Secure system screens may still restrict third-party overlays. The Android renderer draws scenery and screen-bottom accumulation; unlike desktop builds, it cannot inspect or accumulate on foreign applications' window frames.

The in-app preview is accessible without granting this permission. For development and installation, see the Android build workflow and signing instructions below.


```bash
npm run android:init
npm run android:dev
npm run android:apk
```

Android Studio, Android SDK, NDK, JDK 17+, Rust Android targets, USB/ADB are required. An APK uses the same rendering and physics code in **in-app preview mode**. True overlays on *other* Android apps require an opt-in Android `SYSTEM_ALERT_WINDOW` service with explicit permission, foreground service lifecycle, touch pass-through, and battery-management controls; this is future work, **not** included in the alpha APK. On iOS, system-wide overlays over other apps are not supported; future iOS support is restricted to the in-app renderer.

## Physics model

Pure TypeScript deterministic engine (`src/physics.ts`) shared across desktop, mobile and browser. Seasonal particle modes extend the snow-specific heightfield solver. Per-window heightfields (7 CSS px cells) track deposited snow mass and exposed top edges. The engine simulates stochastic flakes, gravity, turbulent wind, collision, slope-driven mass transport (angle of repose), edge overhang shedding, window velocity induced snow release, and clump transfer to surfaces below. Live adjustable cohesion, snowfall, wind, gravity and max depth; per-frame particle caps and bounded timestep. Rendering uses transparent Canvas2D with clipped window interiors, procedural snow mesh silhouette and subtle lighting.

This is deliberately **a heightfield approximation**, not a validated continuum snow dynamics solver. Snow never accesses window content. It uses only window bounds and stacking order. Current limitations: partial-window occlusion and overlapping monitors/HiDPI coordinate normalization require physical machine testing; particle density may need tuning after profiling. The overlay itself is excluded from native window tracking by process ID.

## Architecture

```
src/physics.ts           shared deterministic simulation / collision / mass transfer / plow vehicles
src/seasonal-content.ts  procedural motif placement and animation schedule
src/seasonal-render.ts   transparent scene/object & vehicle Canvas2D drawing
src/studio-ui.ts          category/search library, tab keyboard controls, settings bindings
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

No screenshotting, screen recording, clipboard access, network/weather API, analytics or telemetry. Window metadata only. No requested permissions on iOS/Android in the scaffold. Settings stored locally, no cloud accounts. Native build tools must use `scripts/project-env.cmd` on the Windows development machine so all project, temp and cache writes target `S:`. Third-party agent diagnostics are a separate tool-level concern.

## License

MIT. See `LICENSE`.

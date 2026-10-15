# Snowy Display — cross-monitor content architecture and release gates

Date: 2026-10-15. Feature branch: `feat/cross-platform-snow-physics-alpha`.

## Platform direction

Snowy Display is a procedural desktop ambiance app, not exclusively a snow toy. An
effect pack describes particle shape, color, dynamics and whether accumulation is
physically meaningful. All interactive content is generated locally; no copyrighted
seasonal artwork or unnecessary image downloads are bundled.

### Shipped in this development iteration (source implementation)

- Reactive snow tools: pointer footprints, sidewise snowplow, gust, vortex, three-second frost and melt. Each mode is independently selected and persisted; no global mouse hook intercepts clicks. Footprints and pushing displace heightfield mass rather than creating snow, while melting intentionally destroys material. Surface geometry and z-order are respected; non-snow themes never create snow piles.
- Footprint indentation stamps and bounded transient magic pulse render overlays, carried within the shared world snapshots for all monitors. Upper-window clips still apply to the original snow pile and impressions.
- Cached per-surface merged X-interval occlusion masks, rather than O(number of windows) visibility testing on each bin every frame. Per-bin exposure masks are included in scene snapshots so follower views can render covered sections without repeated window scans.


- Shared physical-pixel virtual desktop, including negative screen origins,
  vertically offset monitors and mixed DPI; all screens render cropped views
  from one world rather than instantiating independent physics simulations.
- One coordinator WebView polls native geometry and simulates physics; follower
  overlays consume `BroadcastChannel` snapshots. If the coordinator fails,
  followers can temporarily simulate locally instead of going blank.
- Native display metadata command, monitor-list refresh and overlay reconfiguration
  every three seconds for added, removed or resized displays.
- Adaptive work tiers: Eco (24 FPS, 300 particles, 350 ms window polling),
  Balanced (36 FPS, 650 particles, 220 ms polling), High (60 FPS, 1,150
  particles, 140 ms polling). Each is a user-selectable limit, not a claimed
  measured frame rate.
- Twenty-one built-in effect themes in six collections: Winter, Spring, Summer,
  Autumn, Events, Atmosphere. Rain, pollen, petals, leaves, fireflies, sparks,
  stars, confetti and bats do **not** falsely accumulate as snow. Winter and
  Christmas snow can physically accumulate.
- Auto-calendar: seasons, Halloween, all four Advent Sundays, Christmas and
  New Year. No remote service or location data required. Manual themes remain
  available, plus physics presets and live intensity controls.
- Desktop settings use backward-compatible optional fields. Manual choices
  and quality presets are persisted through Tauri's atomic settings path.
- Retained previous hardening: one process lock, top-edge occluders, covered
  snow heightfield clipping and no ghost clumps on minimize/close.

## Coordinated desktop mechanics

Coordinate system: native global **physical pixels**, with origin at the minimum
monitor X/Y across all attached screens. World surface coordinates are shifted
only once. Each monitor viewport uses a physical-to-CSS transform and its
corresponding monitor scale factor. Native Win32, X11 monitor/window topology
sources are reused. macOS CoreGraphics logical-point conversion requires an
explicit mixed-DPI hardware validation.

The leader is initially `snow-overlay-0`. Each overlay is bound to its monitor's
viewport. One leader publishes a scene snapshot over a same-origin
`BroadcastChannel`; followers render only. There is no independent per-screen
respawn that would break particle trajectories at display edges. BroadcastChannel
operation across each target platform's Tauri origin must be proven in real
multi-monitor testing; fallback physics is fail-safe, not seamless synchronization.

## QA expectations

- Unit/integration contracts for monitor boundaries, viewport origins, window
  crossings, theme uniqueness, calendar selection, particle budget, accumulation
  rules and single-coordinator role.
- Production Windows release **must** be created with the Tauri CLI, not bare
  `cargo build --release` (which previously yielded localhost errors).
- On real desktops: confirm visible effects on both screens, independent DPI
  scaling, visual continuity at boundaries, multiple monitor arrangements,
  moving windows across the seam, hotplug, standby/resume, fast z-order changes,
  maximized coverage, background fullscreen apps, click-through and no
  keyboard-focus interruption.
- Benchmark Windows 1/2/3 monitors under all quality profiles: p50/p95 frame
  latency, CPU/GPU load, memory usage, bandwidth per BroadcastChannel message,
  idle/disconnected coordinator recovery and battery effects.
- Linux Wayland continues to use in-app preview, as standard Wayland security
  prevents inspecting and overlaying arbitrary external windows.

## Next product increments — NOT yet claimed implemented or verified

1. Pack editor + manifest validation, versioning, content ratings and safe
   declarative export/import; trusted app-bundled assets, no arbitrary executable
   script packs.
2. Weather-service optional integration with explicit user consent, region-less
   presets when offline, timezone-aware forecast conditions, privacy controls.
3. Rich event packs: candle-style Advent decoration progression, Halloween
   atmospheric variations, Christmas lights, lunar events and user-scheduled
   scenes. Automatic season switching should support hemisphere selection.
4. A live diagnostics page with FPS percentiles, particle counters, per-display
   status, auto quality scaling, device battery policy, GPU memory & reduced-
   motion accessibility presets.
5. Animated preview accessibility (keyboard navigation, screen reader labels,
   localization, reduced-motion compliance), translations and pack metadata.
6. Official signed installers/update channels, documented support matrix,
   crash opt-in reporting, release artifact checksums and reproducible builds.

All target platforms require real-device acceptance before merging `main`,
per project `AGENTS.md`.

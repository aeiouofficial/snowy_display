# Architecture decision record (2026-10-14)

## ADR-001: Cross-platform Tauri 2 host, single TypeScript snow engine

**Choice:** Tauri 2 desktop/mobile shell; deterministic pure TypeScript per-window heightfield physics and Canvas2D render. Desktop geometry APIs are native Rust/C behind a Tauri command, consumed by a click-through overlay. The same renderer runs in an in-app mobile preview.

**Why:** The evaluated `wthrr_windows` is DirectX/Windows-only; copying it would require replacement of both rendering and OS infrastructure for every other target. xsnow is X11/GTK and GPL. A shared platform-neutral physics/rendering layer minimizes costly rewrites and supports Android APK immediately after Tauri native initialization.

**Tradeoffs:** JS/Canvas2D will require performance profiling for high refresh rates and 4K/multi-monitor setups; a future renderer backend may use WebGPU while preserving physics API. Desktop window enumeration has compositor-specific restrictions. The prototype physics mass model is phenomenological, not physically calibrated.

**Security:** Do not capture contents of other windows. Only enumerate geometry and z-order. No remote service. No accessibility or screen-recording permissions by default. Android external overlays should be permission opt-in only.

**Upstream credits:** [todddube/wthrr_windows (MIT)](https://github.com/todddube/wthrr_windows), [xsnow (GPLv3)](https://sourceforge.net/projects/xsnow/), [Weatherling behavior reference](https://www.weatherling.app/). No source was copied from these projects.

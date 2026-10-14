# Occlusion regression and reconciliation — 2026-10-15

## Confirmed failure
- At the boundary of an exposed rear window edge, `SnowEngine.deposit` populated neighboring bins even when the neighbor's center was covered by a higher-z window. This produced apparently misplaced snow.
- Occluding an existing pile called `releaseBin` for its hidden bins and generated falling clumps, which could settle on unrelated foreground or lower windows.
- `drawSnow` skipped masked top-edge bins but did not clip a tall snowy crest against an overlapping foreground window.
- `EnumWindows` dropped minimized Win32 windows entirely, so disappearance was indistinguishable from a closed window and could shed the pile.

## Changes
- `src/physics.ts`: extend Surface with optional `hidden`, ignore explicitly hidden surfaces, discard their piles without shedding. Preserve covered piles and block mass diffusion and cursor carving into covered bins. Preserve physical shed for actual closing/moving.
- `src/render.ts`: exclude foreground window rectangles from pile drawing using sequential even-odd canvas clip intersections, not a single even-odd path (which XORs overlapping foreground rectangles). Particle rendering remains separate.
- `src-tauri/src/window_geometry.rs`: send minimized Windows hwnd identifiers as `hidden: true`; leave normal surface serialization unchanged.
- `src/overlay.ts`: propagate hidden surface events to the engine instead of filtering them out.
- `tests/occlusion.test.ts`: five new tests; original RED 0/4 and GREEN 4/4, plus a second RED→GREEN test for intersecting foreground-window masks.
- `tests/physics.test.ts`: replaced prior assertion requiring ghost snow on occlusion with preservation assertion.
- `src/settings.ts`, `src/app.ts`, `tests/settings.test.ts`: startup settings hydration protects native settings from overwritten stale preview defaults.

## Fresh automated evidence
- `npm run check`: 28 passed, 0 failed (2026-10-15).
- `npm run build:web`: exit 0 (2026-10-15).
- `cargo check --release --offline --locked --manifest-path src-tauri/Cargo.toml`: exit 0 using installed toolchain cargo executable, S: target and offline Cargo cache. Rustup shim fails without a configured default under the portable workspace HOME; no global rustup state changed.
- `.build/target/debug` deleted in previous cleanup, 5,218 regenerable files, 5.96 GB free space reclaimed; release and offline caches retained.

## Still requiring physical verification
- Real visible overlap, minimize/restore, snap/maximize, mixed DPI, monitor hotplug, click-through, no focus stealing.
- macOS/Linux live overlays, Android endurance, installer/release signing.
- Older PR #1 unique commit reconciliation.
- Local `README.md` and Android workflow transitioned from access denied to missing; do not report their previous uncommitted bytes as verified or recovered. Restore committed versions only if confirmed absent and record that original inaccessible deltas cannot be reconstructed.

## Release policy
- Per `AGENTS.md`, do not merge or deploy to `main` without explicit confirmation of real-hardware acceptance.

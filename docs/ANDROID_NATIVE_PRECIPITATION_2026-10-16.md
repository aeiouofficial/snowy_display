# Android native precipitation and snow accumulation — 2026-10-16

Feature branch: `feat/android-native-overlay-mobile-layout`.

## Root causes found in the previous Android renderer

1. The native snow canvas deposited additional snow **every frame** while a particle remained close to the display bottom. This was not collision-based accumulation.
2. Accumulation was represented by one independent filled rectangle per fourteen-pixel bin, yielding a disconnected and unnatural snow profile.
3. All non-rain particles largely shared snow-like downward movement. In particular, bats fell vertically and fireflies drifted downward.

## Implemented changes

- Collision detection now compares each snow particle's prior vertical coordinate to its updated coordinate. Deposition occurs only when the particle crosses the virtual bottom surface.
- Each impact spreads material through adjacent width-relative bins with normalized kernel weights. This no longer assumes an exact fourteen-pixel sampling width on every display.
- A time-limited relaxation step moves excess height from steep bins to their lower adjacent neighbors. The transfer is bounded and reduces unsupported vertical cliffs.
- The accumulated snow surface is now drawn as one antialiased filled contour with a subtle outline, rather than separate rectangles.
- Distinct movement families: rain accelerates downward; petals and leaves sway; fireflies hover; bats traverse horizontally and undulate; stars twinkle without falling; embers rise.
- New regression file: `tests/android-snow-collision-regression.test.ts`.

## Known limitations and acceptance

- Android's system-wide overlay does not know the geometry of other apps' window widgets. This change targets **bottom-edge accumulation**, not unsupported claims about snow on each window edge.
- These changes do not establish photorealistic snow or completed visual art for all 38 themes; source-level coverage is not visual quality.
- Physical device testing must verify that the changed Kotlin code is included in a signed APK, the installed APK SHA-256 matches, and touch/UI behavior is unchanged. Do not treat the earlier `b2e8c4f` device tests as verification of this later patch.
- Avoid benchmarking an unsupported long-running overlay atop sensitive applications. Keep foreground restoration and power constraints.

## Evidence and project filesystem

All builds, caches, temporary files and captures are under `S:\snowy_display`. Source backup: `S:\snowy_display\.tmp\SnowOverlayService.kt.pre-physics-20261016T232311`. Test and Gradle evidence: `S:\snowy_display\.tmp\snowy_physics_v2_build_result.json`. Signed installation and device evidence must be added separately only after successful execution.

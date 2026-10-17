# Individuelle Theme-Effects – Render Engine Revamp (2026-10-17)

## Implemented

All 38 catalog entries now have their own exact-ID visual grammar rather than being painted through one of nine generic particle forms. The TypeScript preview/desktop and Android native overlay both use explicit per-ID glyph choices, theme-dependent trajectory and ambient accents. The shared shape primitives avoid 38 copies of low-level Canvas drawing code, but the composed effects and signatures are all different.

### Behavior and engine design

- `src/theme-effects.ts`: 38 explicit typed `THEME_EFFECTS` profiles and Canvas2D painter, named shapes including maple leaf silhouettes, petal Bézier paths, butterfly wings, bee stripes, meteor tails, fog wisps, lightning forks, ribbon gusts, bats, flames, glowing fireflies, eggs, hearts, candle flames, gifts, cosmic arcs and crystalline snowflakes.
- `src/render.ts`: genuinely routes every weather particle through `paintThemeParticle` and scene-level `paintThemeAtmosphere`, removing the old shared particle-type paint routine. The scenery toggle remains functional; reduced motion freezes the atmosphere; `visualScale` applies to particles.
- `src-tauri/android-native/SnowOverlayService.kt`: same 38 exact scene IDs mapped to individual composed foreground glyphs; native theme-specific movement, wind and rise/fall behavior, atmospheric layers. Keeps the existing compositing budgets (up to 40 particles at high quality, 20 FPS max, battery-constrained 4 FPS). Native shape lookup runs once per frame, not once per particle. Snow accumulation remains only for snow scenes.
- Regression coverage: `tests/theme-effects-38.test.ts` asserts catalog parity, distinct signatures, exact-ID native mappings and non-snow no-accumulation rules. Pre-existing regression tests have been updated to assert the replacement implementation rather than the removed generic method.
- Images: `S:\snowy_display\.tmp\snowy_unique_38_visual_audit\overview_38_themes.png`; matching per-scene PNGs and result JSON at `.tmp\snowy_unique_38_visual_audit_result.json`. This automated Android-size WebView preview pass rendered 38/38 scenes with zero runtime exceptions and zero near-duplicate image pairs at the tool's configured comparison threshold.

### All 38 concrete visual signatures

| Theme | Signature glyph | Ambient accent | Motion | Atmosphere |
|---|---|---|---|---|
| Natural Snow (`winter-snow`) | flake | ice-star | fall | snow-haze |
| Arctic Blizzard (`winter-blizzard`) | snow-streak | ice-shard | blizzard | whiteout |
| Quiet Frost (`winter-frost`) | ice-star | ice-shard | still | frost |
| Cherry Blossom (`spring-petals`) | petal | seed | swing | petal-haze |
| Spring Rain (`spring-rain`) | rain | prism | fall | rain-haze |
| Golden Pollen (`spring-pollen`) | pollen | seed | hover | pollen-glow |
| Firefly Evening (`summer-fireflies`) | firefly | pollen | orbit | twilight |
| Warm Downpour (`summer-showers`) | downpour | rain | fall | storm |
| Starlit Night (`summer-stargaze`) | star | meteor | still | constellation |
| Autumn Canopy (`autumn-leaves`) | maple | needle | swing | canopy |
| Harvest Glow (`autumn-mist`) | leaf-fog | grain | float | harvest |
| Halloween Night (`halloween-bats`) | bat | wisp | sweep | halloween |
| Haunted Lanterns (`halloween-embers`) | wisp | lantern | rise | haunted |
| Advent · Candle One (`advent-1`) | candle | sparkler | rise | advent-1 |
| Advent · Candle Two (`advent-2`) | sparkler | candle | rise | advent-2 |
| Advent · Candle Three (`advent-3`) | candle | heart | hover | advent-3 |
| Advent · Candle Four (`advent-4`) | star | candle | rise | advent-4 |
| Christmas Eve (`christmas-snow`) | gift | flake | fall | christmas |
| New Year Celebration (`newyear-confetti`) | confetti | sparkler | blizzard | fireworks |
| Campfire Sparks (`ambient-embers`) | flame | sparkler | rise | campfire |
| Cosmic Dust (`ambient-cosmos`) | galaxy | meteor | orbit | nebula |
| Northern Lights (`winter-northernlights`) | ice-shard | star | hover | aurora |
| Snowbound Forest (`winter-forest`) | needle | flake | fall | forest |
| Butterfly Garden (`spring-butterflies`) | butterfly | petal | orbit | meadow |
| Blooming Meadow (`spring-meadow`) | seed | pollen | rise | meadow |
| After the Rain (`spring-rainbow`) | prism | rain | float | rainbow |
| Summer Apiary (`summer-bees`) | bee | pollen | orbit | apiary |
| Breezy Afternoon (`summer-kite`) | ribbon | seed | sweep | breeze |
| Golden Hour (`summer-goldenhour`) | sun-dust | seed | hover | sunset |
| Harvest Lanterns (`autumn-harvest`) | lantern | grain | swing | harvest |
| Migration (`autumn-migration`) | bird | maple | sweep | migration |
| Thunderstorm (`weather-thunder`) | lightning | downpour | blizzard | thunder |
| Morning Fog (`weather-fog`) | fog | leaf-fog | float | fogbank |
| Light Drizzle (`weather-drizzle`) | drizzle | prism | fall | mist-rain |
| Windy Day (`weather-windy`) | gust | maple | sweep | windbands |
| Spring Celebration (`event-easter`) | egg | butterfly | float | spring-party |
| Valentine Night (`event-valentine`) | heart | sparkler | rise | romance |
| Silver Moonlight (`ambient-moonlight`) | crescent | star | float | moonlight |

### Honest platform limitations

This is a scene-by-scene effect renderer implementation, not a claim of individually hand-painted cinematic assets or fully approved physical-device fidelity. Real screenshot, motion, battery, touch-through, and contrast on phone must be checked after installing the new APK. Android's system overlay still cannot inspect other apps' window geometry, so snow physically accumulates only at the simulated display bottom, not arbitrary app window edges. Scene particle generation and legacy world physics are shared infrastructure; only the visual effect composition and native motion are per theme.

The future iOS port should reuse the typed theme profiles and port shape primitives to its native compositor rather than copying Android's overlay APIs. Avoid foreground terminal windows or writes outside the S: workspace.

# Snowy Display — Scene Studio, animated seasons and snowplows

Date: 2026-10-15. Project workspace: `S:\snowy_display`.
Branch: `feat/cross-platform-snow-physics-alpha`.

## Delivered source implementation

### Interface overhaul

The control window now uses four **inline** tabs, never screen-covering dialogs:

- **Scenes** — searchable/filterable library across Winter, Spring, Summer,
  Autumn, Weather, Events and Atmosphere. Cards show the selected theme. The
  original accessible native selection control remains in the DOM as a fallback.
  Local automatic calendar mode takes precedence until a card is clicked.
  Seasonal scenery, ambient animation, illustration density and illustration
  size can be configured independently.
- **Physics** — enabled switch, five named presets, intensity/wind/gravity/
  cohesion/height sliders and occlusion behavior.
- **Activity** — seven pointer tools/spells, autonomous plow toggle and the
  interval between plow visits.
- **System** — Eco/Balanced/High budgets, reduced ambient motion, automatic
  multi-monitor description, local settings, clear snow and reset.

Tabs use keyboard arrows, Home/End, `role=tablist`, proper tabpanel ownership,
focus-visible outlines, labelled inputs and `aria-pressed` selection state.
A persistent live preview shows content immediately without interrupting
desktop use. The content library supports desktop and narrow window widths,
with nonmodal controls and scrolling confined to the library panel.

### Built-in content

38 procedural atmospheres in seven groups, including:

- Winter: Natural Snow, Blizzard, Frost, Northern Lights, Snowbound Forest
- Spring: Cherry Blossom, Rain, Golden Pollen, Butterfly Garden, Blooming
  Meadow, Rainbow
- Summer: Firefly Evening, Downpour, Starlit Night, Apiary, Kite, Golden Hour
- Autumn: Autumn Canopy, Harvest Glow, Harvest Lanterns, Migration
- Weather: Thunderstorm, Morning Fog, Light Drizzle, Windy Day
- Events: two Halloween environments, **four distinct Advent editions with
  one to four actual illustrated candles**, Christmas, New Year, Easter,
  Valentine Night
- Atmosphere: Campfire, Cosmic Dust, Moonlight

Scenes are not simply snowfall recolors. Their moving transparent Canvas 2D
decoration layers include botanical branches, butterfly wingbeats, bees,
bird migration, spruces, icicles, auroras, moons, suns, lanterns, pumpkins,
kites, decorative lights, fireworks, meteors, rainbows, mist, clouds, lightning
and candle flames. Density and global scale are bounded. No snowmen or
full-screen opaque sprites were introduced.

`src/seasonal-content.ts` generates deterministic global coordinates (one
shared world across connected displays); `src/seasonal-render.ts` renders the
objects into the existing transparent WebView canvases. It does not load
third-party content, fetch location information or send telemetry.

### Automated plow vehicles

The snow engine owns optional `PlowVehicle` objects. A vehicle appears
after the configured interval only on a sufficiently wide *exposed* snowy
window/floor ledge. Its steel blade travels along the ledge and physically
moves snow mass into exposed bins ahead, respecting both z-order and
`maxDepth`. There is no fabricated extra snow; if recipient bins cannot
accept mass, the original bin keeps it. Vehicles despawn if their surface
disappears, when changing away from snow, or if plows are disabled.
The feature defaults to **off** for conservative desktop behavior and is
enabled in Activity. Existing pointer push/footprint modes remain separate.

### Settings persistence and compatibility

Native Tauri settings use backward-compatible `serde(default)` fields for
animation, scene density, illustration size, reduced motion, scenery on/off,
autonomous plows and plow interval. Browser fallback settings validate
ranges. The old saved format remains readable, and all new inputs have
working event handlers. Slider input previews changes immediately; slider
change commits them. Startup hydration avoids overwriting user edits.

### Performance

- Global virtual desktop and one coordinator for physics/window tracking.
- Eco/Balanced/High budget of 24/36/60 FPS (desired caps), with bounded
  decorative objects, plows, particles and spell pulse visual effects.
- Existing sorted occlusion masks reused for snow accumulation.
- Animated illustrations use procedural geometry, not expensive full-screen
  bitmaps or large asynchronous texture pipelines.
- No claim that actual WebView2 GPU frame times or battery use were benchmarked;
  a dedicated hardware profile across all monitors remains necessary.

## Verification gates

Use these acceptance gates in addition to `npm run check`,
`npm run build:web`, native Cargo release checking and
`pythonw.exe scripts/build-release.py`:

1. Launch standalone Windows release with no Vite server and verify the scene
   library and all four tabs on the real control window.
2. Select each season, Halloween, Advent one through four, New Year and
   Weather. Confirm visually distinct moving scene objects; verify the
   animation/density/scale/reduced-motion controls.
3. Enable plows with a snowy scene; allow accumulation on a wide exposed
   ledge; confirm a vehicle moves and **snow shifts** behind its blade.
4. Repeat with a minimized/covered surface and a rain scene; verify no
   phantom plows, snow or drifting artifact.
5. Connect two monitors of different scaling; verify one global path for
   floating particles and decorations, no duplicate independent physics.
6. Restart the app; verify restored theme, animation preferences, snowplow
   options, FPS profile and singleton guard.
7. Check software focus behavior, window clicks, pointer tools, keyboard
   navigation, accessible labels and reduced-motion semantics.
8. Perform real macOS, Linux X11/Wayland-limited preview and Android
   testing before claiming cross-platform hardware parity.

A compiler, automated tests, headless process smoke or window enumeration
are not substitutes for the user's **real on-screen** acceptance under
`AGENTS.md`. Keep `main` untouched until explicitly approved.

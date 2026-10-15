# Android mobile UI and native theme-parity remediation (2026-10-15)

Branch: `feat/android-native-overlay-mobile-layout` — **not approved for main**.

## Verified original defects

1. Native Android `SnowOverlayService.type()` guessed particle modes from theme ID substrings. `summer-showers` selected fireflies instead of rain, and many non-winter scenes silently rendered snow.
2. The native overlay accepted only snowfall, wind, enable, generic theme, quality and plow toggle. It ignored animations, colors, max depth, gravity, density, scale, reduced motion and other real user controls; snowplow cars were decorative rectangles and never moved snow.
3. The mobile WebView layout pinned tabs incorrectly above the scrolling scenes panel, not as a native-style bottom bar. The scene preview had been moved inside the scenes panel without a stable bottom navigation viewport. Android system status/navbar safe insets were inconsistently applied, and Unicode icons depended on fallback fonts.
4. The Android UI incorrectly claimed desktop-window interaction parity. Android security APIs do not provide other applications' private window geometry or taps. Snowy Display requires only its own one overlay permission; users never need to grant permissions to other applications individually.

## Implementation

- Mobile app shell: fixed full-viewport layout, explicit Android system-bar safety offsets, non-scrolling header, **scrollable active tab panel only**, fixed independent bottom navigation (four evenly sized SVG icons, selection underline below labels), keyboard/focus navigation preserved. Preview belongs to the Scenes panel only and remains interactive.
- Themes: controls pass `themeId`, explicit `particleType`, `primaryColor`, `secondaryColor`, `intensity` and `accumulating` to the native overlay through Rust's JSON-value Tauri command; no fragile substring inference. All **38 environments** have native illustrated motifs and particle behavior: snow, rain, petals, leaves, bats, fireflies, embers, confetti, stars, auroras, butterflies, bees, kites, clouds, Halloween, Christmas and progressively one-to-four Advent candles.
- Native overlay receives all applicable user adjustments: enable, snowfall, wind, gravity, cohesion, maximum pile depth, autonomous plows and interval, illustration visibility/scale/density, animations/reduced motion, performance budget and scene metadata. Non-snow themes cannot form snowdrifts. Snowplows physically transfer finite snow heightfield mass to adjacent non-full bins. Mobile Clear Snow now resets the native overlay as well as the preview.
- Android permission: one app-specific `SYSTEM_ALERT_WINDOW` grant; the overlay is transparent and click-through. App activity tools (footsteps, spells, push) remain interactive **within the preview**, not as cross-app touch capture.
- Settings persist via existing Rust/JavaScript settings store and are forwarded to the running service on update.

## Verification gates

1. `npm run check` and `npm run build:web` pass with no exceptions.
2. Browser mobile viewport 393 × 851: app does not page-scroll; header stays below status bar; switching all four bottom tabs never moves the header/navigation; only the current tab panel scrolls. Test each of 38 scene cards and at least one example from each category.
3. Android GitHub CI compiles Kotlin service and produces APK. **A passing web build is not enough.**
4. Re-sign the APK using the existing project-local signing keystore. Do not uninstall existing app or replace key; update via Android Package Installer or supported ADB path.
5. On the physical Redmi: verify status bar safe inset, native bottom bar, scrolling, accessibility, distinct scene changes in both app preview and system overlay; test stored settings, plows, non-snow no piles, overlay one-time permission, process stability.
6. Do not merge to main without the user's explicit real-hardware signoff required by `AGENTS.md`.

The previous APK `0.1.0` remains installed until the new native build is verified and upgraded.

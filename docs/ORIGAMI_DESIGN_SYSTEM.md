# Origami-inspired design system — Snowy Display

Source of visual inspiration: [hazymorning/origami](https://github.com/hazymorning/origami), a Home Assistant dashboard theme (AGPL-3.0). Reviewed October 18, 2026 against its `main` theme and Bubble Card modules.

## Compatibility and licensing

Origami itself is a Home Assistant dashboard, **not** a cross-platform UI component library. Its YAML expects Lovelace, HACS, Bubble Card, Paper Buttons Row and other Home Assistant integrations. Those components do not run unchanged inside Tauri, Vite, Android WebView, native Android views or iOS.

The Snowy Display implementation here is an **independently written CSS/TypeScript skin** inspired by the appearance and interaction principles of Origami; it does **not** bundle or copy the project's AGPL-licensed YAML, Javascript modules, card assets or fonts. The source is credited here. If actual Origami project code is copied or adapted into another distributable app, review and comply with the AGPL-3.0 obligations before release.

## Implemented in Snowy Display

- `src/origami-surface.css`: a standalone presentation layer imported **after** the existing layout stylesheet. Provides accessible light and dark palettes, low-contrast separators, warm flat surfaces, subtle card shadows, rounded controls, semantic status colors, selected button states, and focus treatment.
- `src/origami-appearance.ts`: applies `data-origami-mode="dark|light"`, remembers the user's choice under `snowy-display:origami-mode` in local storage, updates the system theme color, and works without storage permissions.
- `src/app.ts`: Appearance control on **System** tab. Default mode is **dark**; light is explicitly selectable. Appearance does not modify `AppSettings`, scene IDs, particle geometry, animation timing, overlay permissions, or desktop-native APIs.
- All existing major UI components are included in the skin: header/branding, real-time status, preview framing, fixed bottom tabs, scene categories/search, scene cards, settings panels, action buttons, switches, slider accent, quality selections, and interactions.
- Responsive Android treatment overrides *only presentation properties*. It leaves `position`, `overflow`, touch handling, panel scrolling, frame budget and geometry to `src/style.css`. The header, category/search toolbar and bottom navigation remain fixed while active panels scroll.
- Focus-visible outlines and reduced-motion support are retained. No window-level modal/dialog was introduced.

## Visual language for other webapps and APKs

The generalizable approach is a small original token vocabulary rather than copied Lovelace YAML:

| Design role | Dark | Light |
| --- | --- | --- |
| App background | warm charcoal `#181715` | warm cream `#f6f5f3` |
| Card | `#2f2d2a` | `#ffffff` |
| Text | `#e5e3dd` | `#4f4c49` |
| Active accent | muted sage | deep sage |
| Selection | soft sage wash | soft sage wash |
| Destructive | desaturated red | deeper muted red |
| Controls | 13px corner radius | 13px corner radius |
| Cards | 20px corner radius | 20px corner radius |

When applying this to other Vite/React/Tauri sites, extract the variable block into a shared source package, map each app's semantic controls to tokens, and retain each app's existing layout. For Android and iOS, a WebView-based UI can consume the same CSS; genuine native Android Compose/XML or SwiftUI screens require equivalent native theme tokens instead of injecting Home Assistant modules.

**Do not** auto-convert other unrelated user repos without separately inspecting their actual UI and existing behavior. A skin does not replace component logic, accessibility semantics, screenshots, responsiveness or platform QA.

## Evidence and acceptance

Run `npm run check` and `npm run build:web`. Visual regression entrypoint (workspace-only, headless Edge): `S:\snowy_display\.tmp\origami_ui_verify.py`; result `S:\snowy_display\.tmp\origami_qa_result.json`, screenshots in `.tmp\origami_qa_20261018`. The report checks actual computed card colors, light/dark toggles, persistence across reload, and Android's pinned header/toolbar/bottom-nav coordinates after inner-panel scrolling.

**Release gate:** source tests and rendered screenshot inspection first; native Android signed APK and user-led visual acceptance next. Avoid replacing the already installed APK automatically. Keep `main` untouched until approved.

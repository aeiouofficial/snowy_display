# Android energy safety — 2026-10-16

## Evidence and cause
A physical Redmi Note 10 5G (Android 13, MIUI 14) reported **12% battery and
44.8°C battery temperature** at the diagnostic snapshot. At that time the
Snowy Display package and its overlay service were **not running**, so this is
not a controlled before/after CPU or power-consumption measurement and does not
by itself attribute the temperature to Snowy Display.

Source inspection independently confirmed the risk: the native Android
`WeatherCanvas` kept scheduling fullscreen redraws at up to 30 FPS as long
as the overlay setting was enabled, with no display-off or thermal pause.
The WebView control preview also requested animation frames continuously
even when only drawing at a lower capped frequency.

## Corrections
- Native overlay registers system broadcasts for display ON/OFF, battery
  updates, and system power-saver changes, unregistering its receiver on
  service destruction.
- Fullscreen rendering is **suspended** with the screen off, battery at or
  below 7%, or battery temperature at/above 43°C. Thermal rendering resumes
  only once temperature falls to 41°C or below, avoiding threshold chatter.
- When battery is 20% or lower or Android Battery Saver is on, the fullscreen
  renderer is capped at **4 FPS**. Otherwise Eco/Balanced/High caps are
  **8/12/20 FPS** instead of 12/20/30 FPS.
- The native fullscreen particle limits drop to **12/24/40** instead of
  22/40/72; this avoids excessive per-frame Canvas/particle operations.
- Native overlay exposes a `powerSuspended` status; controls distinguish
  weather actively drawing from temporary thermal/power pause.
- Mobile WebView preview no longer schedules an infinite 60 Hz RAF loop.
  It schedules delayed callbacks at up to 8 FPS without the overlay,
  4 FPS with it, 2 FPS for reduced-motion, and does not schedule while
  its UI is hidden, the preview is collapsed or weather is disabled.
- Desktop rendering budgets and behavior remain unchanged.

## Verification and release gate
Run `npm run check`, `npm run build:web` and the native Android
Kotlin/Gradle APK CI. Sign the new APK with the *existing* local Android
signing identity and update in place without clearing data. Check:
screen ON/OFF, low-charge and Battery Saver transitions, actual heat
suspension, overlay user-visible scene/theme changes, settings persistence,
Android scrolling/header/tab alignment, app foreground/background behavior,
ADB CPU samples and battery temperature trend. Do not deliberately overheat
the phone to test the cutoff. Automated Kotlin/source tests are not a
replacement for measured device battery life or user visual acceptance.

This change is committed to the Android feature branch only. No merge to
`main` or claim of completed real-device QA without the user's sign-off.

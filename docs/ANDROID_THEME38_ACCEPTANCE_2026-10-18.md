# Snowy Display · Android-Abnahme der 38 Einzel-Effects

**Stand:** 18. Oktober 2026 · Arbeitsbranch: `feat/android-native-overlay-mobile-layout` · kein Merge nach `main` ohne ausdrückliche Freigabe.

## Artefakt, Verbindung und Installation

- Signierte ARM64-APK: `S:\snowy_display\.build\android-install\snowy-display-theme38-signed.apk`
- Erwartete SHA-256: `c71a4a9f2371d6b388b594c0088a80606642ab6c90c9639c465dd81224afdd13`
- Vorhandenes Entwicklerzertifikat: SHA-256 `20840608f8edba886c508312b8ba17f37df269fefbbebcff74fee212f0bdc805`.
- Die APK wurde bereits signiert, mittels `apksigner` verifiziert und sowohl lokal (Gradle) als auch über den GitHub-APK-Workflow erfolgreich gebaut.
- `scripts/android_theme38_update.py` ist standardmäßig ein **reiner Diagnosebefehl**. Er prüft die signierte Datei, den ADB-Transport und die Geräteidentität. Eine Installation erfolgt **ausschließlich mit dem ausdrücklich gesetzten Argument `--install`** und dann nur als In-place-Update mittels `adb install -r`, niemals durch Uninstall, Zurücksetzen, Löschen oder Entsperren.
- Die Prüfung vom 18. Oktober um 00:47 hat die APK-Prüfsumme bestätigt. ADB lieferte zu diesem Zeitpunkt eine leere Transportliste, weshalb **keine Installation auf dem Redmi durchgeführt wurde**. Dies beweist nicht, dass ein Kabel abgezogen ist oder dass der Nutzer das Gerät nicht angeschlossen hat.
- Preflight-Evidenz: `S:\snowy_display\.tmp\snowy_theme38_device_preflight.json`. Der Installationshelfer darf beim späteren Vorhandensein eines autorisierten ADB-Transports erneut ausgeführt werden; er startet **keinen** Hintergrund-Watcher.

## Dynamische und statische Browser-QA

Ausführbare Tests mit Android-Viewport und Headless Edge (alle temporären Daten unter `S:\snowy_display\.tmp`):

- `scripts/qa_theme38_still.py`: genau 38 eindeutig benannte Theme-Bilder. Ein Testlauf schlägt fehl, falls weniger als 38 Themes vorliegen, JavaScript-Fehler entstehen oder unterhalb eines mittleren Farbkanal-Deltas von 7,5 nahe identische Bildpaare auftreten. Befund: **38/38, keine Near-Duplicates**.
- `scripts/qa_theme38_motion.py`: rendert 38 Themes im vergrößerten 393 × 310 Pixel Canvas, nimmt zwei Frames im zeitlichen Abstand und wertet mittlere Pixeländerung sowie Anteil veränderter Pixel aus. Ein Theme unterhalb von 0,15 mittlerer Pixeländerung wird als Bewegungsregression gewertet.
- Letzter gemessener Lauf: **38/38 mit Bewegung**, Minimum „Starlit Night“ **0,444**, „Natural Snow“ **0,458**, Maximum „Campfire Sparks“ **6,427** mittlere RGB-Pixeländerung. Kein JavaScript-Fehler.
- `tests/theme38-qa-gates.test.ts` kontrolliert, dass die Testwerkzeuge und der Installer ihre Sicherheitsgates nicht verlieren. Die reguläre Suite beträgt **127/127 PASS**.
- Statische Bildserie: `.tmp\snowy_theme38_still_audit\overview_38_themes.png`.
- Bewegungsbericht und zwei PNG-Dateien je Theme: `.tmp\snowy_theme38_motion_audit_result.json` und `.tmp\snowy_theme38_motion_audit\`.

## Offene reale Gerätetests

Der Browser-Nachweis ist **kein Ersatz** für die hardwareseitige Renderprüfung unter MIUI. Sobald ADB den erwarteten Redmi Note 10 5G wieder als autorisiert auflistet:

1. `scripts/android_theme38_update.py` zunächst ohne Argumente ausführen und Bericht prüfen. Mit `--install` nur die verifizierte APK im bestehenden Package installieren, **keine App-Daten löschen**. Prüfen, dass der Geräte-`base.apk`-Hash exakt dem signierten Paket entspricht.
2. Sichtbarkeit prüfen: Im Snowy-Steuerfenster dürfen Wetterpartikel die eigenen Buttons nicht übermalen. Bei laufendem Effekt muss das Overlay außerhalb der App erscheinen, ohne Touch-Ereignisse anderer Apps abzufangen.
3. Durch die 38 Theme-Namen navigieren. **Niemals feste Bildschirm-Koordinaten für die Theme-Auswahl verwenden**, da die Szenenliste ihre Scrollposition behalten kann. Im Zweifel erst Suchfeld filtern, exakten Namen sowie native `SnowyOverlaySettings theme=...`-Logs abgleichen, dann Screenshot aufnehmen.
4. Pro Theme mindestens zehn Sekunden Bewegungsverlauf inklusive Touch-through und Sichtbarkeit mitnehmen. Für Winter: Frost vs. Natural Snow vs. Blizzard vs. Northern Lights auf Schneeakkumulation, Windböen, Kristalle und Lichtbänder prüfen. Für Spring: Blütenblätter, Schmetterlinge, Blütenstaub, Regen, Wiese und Regenbogen separat vergleichen. Für Summer: Glühwürmchen, Sturzregen, Sterne, Bienen, Wind und Golden Hour. Für Autumn: Blattflug, Nebel, Laternen, Vogelmigration. Für Weather: Gewitter/Blitz, Nebel, Nieselregen, Wind. Für Events: Fledermäuse, Irrlichter, vier unterschiedliche Adventsstufen, Christmas Eve, Konfetti, Ostern, Herzen. Für Atmosphere: Glut, Kosmos, Mondlicht.
5. Ein längerer Batterie-/Temperaturtest folgt erst nach Sichtprüfung; Abbruch bei erkennbarer thermischer Belastung oder Launcher-/UI-Abstürzen. Kein Test darf bei gesperrtem oder schlafendem Display als visuelle Effektfreigabe gewertet werden. Originales Theme und aktive App nach den Tests wiederherstellen, soweit eindeutig feststellbar.
6. **Bewertung ausdrücklich offen:** Stilqualität, Animationstiefe und natürliche Akkumulation benötigen tatsächliche Nutzer-Abnahme. Android kann nicht die Fensterkanten beliebiger fremder Apps auslesen; daher kann Snowy Display die originale Desktop-Fensterakkumulation nicht auf andere Android-App-Fenster übertragen.

## Speicher und Prozessdisziplin

Alle erstellten Logs, Browserprofile, temporären Dateien, Downloads und Build-Artefakte bleiben auf `S:\snowy_display`. Keine neuen sichtbaren PowerShell-/CMD-Fenster; keine Fokusübernahme für Build- oder Diagnoseprozesse. Kein stilles oder automatisches Geräte-Update im Hintergrund.

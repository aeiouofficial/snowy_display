# Snowy Display · Android-Abnahme der 38 Einzel-Effects

**Stand:** 18. Oktober 2026 · Arbeitsbranch: `feat/android-native-overlay-mobile-layout` · kein Merge nach `main` ohne ausdrückliche Freigabe.

## Artefakt, Verbindung und Installation

- Signierte ARM64-APK: `S:\snowy_display\.build\android-install\snowy-display-theme38-signed.apk`
- Erwartete SHA-256: `c71a4a9f2371d6b388b594c0088a80606642ab6c90c9639c465dd81224afdd13`
- Vorhandenes Entwicklerzertifikat: SHA-256 `20840608f8edba886c508312b8ba17f37df269fefbbebcff74fee212f0bdc805`.
- Die APK wurde bereits signiert, mittels `apksigner` verifiziert und sowohl lokal (Gradle) als auch über den GitHub-APK-Workflow erfolgreich gebaut.
- `scripts/android_theme38_update.py` ist standardmäßig ein **reiner Diagnosebefehl**. Er prüft die signierte Datei, den ADB-Transport und die Geräteidentität. Eine Installation erfolgt **ausschließlich mit dem ausdrücklich gesetzten Argument `--install`** und dann nur als In-place-Update mittels `adb install -r`, niemals durch Uninstall, Zurücksetzen, Löschen oder Entsperren.
- Der erste Preflight um 00:47 zeigte noch keinen ADB-Transport. **Um 00:57 wurde genau diese signierte Fassung als In-place-Update auf das reale Redmi installiert**: ADB meldete `Success`, und der SHA-256-Hash der tatsächlich installierten `base.apk` war exakt `c71a4a9f2371d6b388b594c0088a80606642ab6c90c9639c465dd81224afdd13`. App-Daten wurden nicht gelöscht. Der Preflight-Bericht wurde entsprechend aktualisiert.
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


## Hardwareprüfung 18. Oktober 2026 (01:03–01:12)

- Ein kurzer realer Test von `Natural Snow` wurde vollständig bestanden: per Android-Accessibility anhand der sichtbaren Theme-Karte ausgewählt, Native-Log `theme=winter-snow mode=snow`, sichtbares Overlay auf dem MIUI-Launcher, zwei Screenshots mit mittlerem Bilddelta 0,5503. Wetterdienst gestoppt, anfängliches Theme `Butterfly Garden` und `Music Sort` wiederhergestellt. Batterie 50%, Temperatur 36,0→36,5 °C. Evidenz `.tmp/snowy_theme38_native_hw_20261018/result.json`.
- Anschließend wurden sechs weitere exemplarische Kategorien auf echter Hardware bestätigt: `winter-blizzard` (0,322), `spring-petals` (0,294), `summer-fireflies` (0,692), `autumn-leaves` (1,020), `weather-thunder` (0,600), `halloween-bats` (1,509). Zahlen sind mittlere Screenshot-Pixeldifferenzen zum gleichen leeren Startbildschirm, kein fotorealistischer Qualitätswert. **6/6 ausgewählte Native-Logs passten exakt zur jeweiligen Theme-ID.**
- `ambient-cosmos` wurde in dieser Runde **nicht geprüft**, weil die automatisierte UI-Bedienung die unter einer alten Scrollposition liegende Theme-Karte nicht zuverlässig erreichen konnte. Das ist kein bestätigter Cosmos-Rendererfehler. Der Test stoppte den Overlay-Dienst und stellte Music Sort wieder in den Vordergrund; Batterie 50 %, Temperatur 35,8→36,1 °C.
- Der Versuch, danach die ursprüngliche Theme-Auswahl `Butterfly Garden` zurückzusetzen, schlug im automatisierten Test zunächst fehl. Anschließend wurden Spring, Butterfly Garden und All über die tatsächlich durch Android Accessibility ermittelten Positionen betätigt. Die nachfolgende Kontrollaufnahme scheiterte wegen eines kurzzeitig fehlenden ADB-Transports. **Die Theme-Wiederherstellung ist deshalb noch nicht bestätigt.** Der zuletzt verifizierte Wetterdienststatus lautet gestoppt.
- Echte Native-Screenshots zeigten konkrete verbleibende Schwächen: Einzelne Blüten und Herbstformen wirkten auf 1080 Pixel breiten Displays noch wie kleine Punkte, obwohl die Szenen im Browser bereits verschieden aussehen. Deshalb ist in der **nachfolgenden, noch nicht auf das Gerät installierten Quellcode-Iteration** eine themenspezifische Vergrößerung von Blüten, Blättern, Insekten und Glühpartikeln sowie organisches Flutter-Rotieren eingeführt worden. Partikel-/FPS-Grenzen blieben unverändert.
- Der Test legte zusätzlich einen UI-Bug offen: Bei Kategorie- oder Suchwechsel blieb das innere Scenes-Panel an seiner bisherigen Scrollposition. `src/studio-ui.ts` setzt jetzt nur dessen `scrollTop` zurück. Headless Android-Browserprüfung: Kategorie **1220→0 Pixel**, Suche **308→0 Pixel**, `window.scrollY=0`; kein JavaScript-Fehler.
- Alle **130/130** Tests und Web-Produktionsbuild bestanden; native Kotlin ARM64 Release-Kompilierung bestanden. Diese Tests verifizieren die **noch zu installierende Korrekturversion**, nicht ihren Geräte-Status.

Evidenz: `.tmp/snowy_theme38_native_category_20261018/result.json`, Screenshot pro getesteter Kategorie in demselben Ordner, `.tmp/snowy_theme38_filter_scroll_result.json`, `.tmp/snowy_unique_kotlin_compile_result.json`. Nächste Gates: korrigierte APK vollständig bauen/signieren, auf demselben Redmi in place installieren, organische Motivgröße live abnehmen, `Butterfly Garden` überprüfen, Gerät/Focus anschließend wiederherstellen.

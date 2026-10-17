#!/usr/bin/env python3
"""Inject native Android system-overlay service into the generated Tauri Android app.

The generated src-tauri/gen/android directory is deliberately not committed.
Run after 'tauri android init', before 'tauri android build'. Idempotent.
"""
from pathlib import Path
import shutil
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
ANDROID = ROOT / "src-tauri" / "gen" / "android" / "app" / "src" / "main"
SOURCE = ROOT / "src-tauri" / "android-native"
JAVA = ANDROID / "java" / "io" / "aeiouofficial" / "snowydisplay"
MANIFEST = ANDROID / "AndroidManifest.xml"
NS = "http://schemas.android.com/apk/res/android"


def prepare() -> None:
    if not MANIFEST.is_file():
        raise RuntimeError("Tauri Android project is not initialized: " + str(MANIFEST))
    JAVA.mkdir(parents=True, exist_ok=True)
    for name in ("SnowOverlayPlugin.kt", "SnowOverlayService.kt"):
        shutil.copy2(SOURCE / name, JAVA / name)
    ET.register_namespace("android", NS)
    document = ET.parse(MANIFEST)
    root = document.getroot()
    if root.tag != "manifest":
        raise RuntimeError("Unexpected Android manifest root")
    for permission in (
        "android.permission.SYSTEM_ALERT_WINDOW",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.FOREGROUND_SERVICE_SPECIAL_USE",
        "android.permission.POST_NOTIFICATIONS",
    ):
        if not any(p.attrib.get("{" + NS + "}name") == permission
                   for p in root.findall("uses-permission")):
            ET.SubElement(root, "uses-permission", {"{" + NS + "}name": permission})
    app = root.find("application")
    if app is None:
        raise RuntimeError("No Android application element")
    service = next((s for s in app.findall("service") if
        s.attrib.get("{" + NS + "}name") == ".SnowOverlayService"), None)
    if service is None:
        service = ET.SubElement(app, "service")
    service.set("{" + NS + "}name", ".SnowOverlayService")
    service.set("{" + NS + "}exported", "false")
    service.set("{" + NS + "}foregroundServiceType", "specialUse")
    property_el = next((p for p in service.findall("property") if
        p.attrib.get("{" + NS + "}name") == "android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE"), None)
    if property_el is None:
        property_el = ET.SubElement(service, "property")
    property_el.set("{" + NS + "}name", "android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE")
    property_el.set("{" + NS + "}value", "User-activated visual weather overlay above other apps")
    document.write(MANIFEST, encoding="utf-8", xml_declaration=True)
    print("Android weather overlay service and permissions injected: " + str(MANIFEST))


if __name__ == "__main__":
    prepare()

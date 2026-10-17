#!/usr/bin/env python3
"""Non-destructive device preflight/install for Snowy Display's 38-theme Android release.

Default: diagnostics only. Never starts an ADB pairing flow, foreground window,
weather service, screen unlock, or an unrelated app. Explicit --install is
required to update the APK in place; no uninstall or user-data wipe is used.
All reports/temp files are restricted to the project's S: workspace.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
TMP = ROOT / ".tmp"
APK = ROOT / ".build/android-install/snowy-display-theme38-signed.apk"
ADB_FALLBACK = Path(r"D:\music sort webapp\.local-tools\platform-tools\adb.exe")
SERIAL = "jjy5ssnviz45d6k7"
PACKAGE = "io.aeiouofficial.snowydisplay"
EXPECTED_SHA256 = "c71a4a9f2371d6b388b594c0088a80606642ab6c90c9639c465dd81224afdd13"
EXPECTED_CERT_SHA256 = "20840608f8edba886c508312b8ba17f37df269fefbbebcff74fee212f0bdc805"
REPORT = TMP / "snowy_theme38_device_preflight.json"

def env_for_child() -> dict[str, str]:
    e = os.environ.copy()
    home = ROOT / ".home"
    for key, value in {
        "TEMP": TMP, "TMP": TMP, "TMPDIR": TMP,
        "HOME": home, "USERPROFILE": home,
        "HOMEDRIVE": "S:", "HOMEPATH": r"\snowy_display\.home",
        "ANDROID_USER_HOME": home / ".android",
    }.items():
        e[key] = str(value)
    return e

def adb_path() -> Path:
    override = os.environ.get("SNOWY_ADB_PATH")
    if override:
        return Path(override)
    if ADB_FALLBACK.is_file():
        return ADB_FALLBACK
    found = shutil.which("adb")
    if not found:
        raise RuntimeError("ADB executable not found")
    return Path(found)

def invoke(args: list[str], timeout: int = 35) -> subprocess.CompletedProcess[str]:
    startup = None
    flags = 0
    if sys.platform == "win32":
        flags = subprocess.CREATE_NO_WINDOW
        startup = subprocess.STARTUPINFO()
        startup.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        startup.wShowWindow = subprocess.SW_HIDE
    return subprocess.run([str(adb_path()), *args], cwd=ROOT,
        env=env_for_child(), stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        encoding="utf-8", errors="replace", timeout=timeout,
        creationflags=flags, startupinfo=startup)

def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def require_success(args: list[str], timeout: int = 35) -> str:
    result = invoke(args, timeout=timeout)
    if result.returncode != 0:
        raise RuntimeError(f"ADB command failed, code {result.returncode}: {result.stderr[-400:]}")
    return result.stdout.strip()

def device_state() -> tuple[str, list[dict[str, str]]]:
    result = invoke(["devices", "-l"])
    if result.returncode:
        raise RuntimeError(f"ADB inventory error: {result.stderr[-300:]}")
    transports: list[dict[str, str]] = []
    for line in result.stdout.splitlines()[1:]:
        columns = line.split()
        if len(columns) > 1:
            transports.append({"serial": columns[0], "state": columns[1]})
    matches = [d for d in transports if d["serial"] == SERIAL]
    if not matches:
        return "adb-transport-not-enumerated", transports
    return matches[0]["state"], transports

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--install", action="store_true", help="In-place signed update only, never uninstall")
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()
    TMP.mkdir(parents=True, exist_ok=True)
    report: dict[str, object] = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "project": str(ROOT),
        "serial": SERIAL,
        "package": PACKAGE,
        "requested_install": args.install,
        "status": "not-started",
    }
    try:
        if not APK.is_file():
            raise RuntimeError("Verified APK does not exist at " + str(APK))
        digest = sha256(APK)
        report.update({"apk": str(APK), "apk_bytes": APK.stat().st_size,
            "local_sha256": digest, "expected_sha256": EXPECTED_SHA256,
            "expected_signer_sha256": EXPECTED_CERT_SHA256})
        if digest != EXPECTED_SHA256:
            raise RuntimeError("Unexpected APK checksum: refusing device update")
        state, transports = device_state()
        report["adb_transport"] = state
        report["adb_inventory"] = transports
        if state != "device":
            report["status"] = "deferred-no-authorized-adb-transport"
            return 2
        prefix = ["-s", SERIAL]
        model = require_success([*prefix, "shell", "getprop", "ro.product.model"])
        product = require_success([*prefix, "shell", "getprop", "ro.product.device"])
        report["device_model"] = model
        report["device_product"] = product
        if not any(q in (model + " " + product).lower() for q in ("redmi", "camellian", "camellia")):
            raise RuntimeError("Unexpected device model: refusing install")
        package_path = require_success([*prefix, "shell", "pm", "path", PACKAGE])
        if not package_path.startswith("package:"):
            raise RuntimeError("Expected Snowy Display package is not installed")
        path = package_path.splitlines()[0].removeprefix("package:")
        installed_sha = require_success([*prefix, "shell", "sha256sum", path]).split()[0]
        report["installed_sha256_before"] = installed_sha
        if not args.install:
            report["status"] = "already-current" if installed_sha == digest else "signed-update-ready"
            return 0
        if installed_sha == digest:
            report["status"] = "already-current"
            return 0
        report["install_output"] = require_success([*prefix, "install", "--no-incremental", "-r", str(APK)], timeout=180)
        if "Success" not in str(report["install_output"]):
            raise RuntimeError("ADB did not report successful installation")
        package_path = require_success([*prefix, "shell", "pm", "path", PACKAGE])
        if not package_path.startswith("package:"):
            raise RuntimeError("Package missing after install")
        path = package_path.splitlines()[0].removeprefix("package:")
        installed_sha = require_success([*prefix, "shell", "sha256sum", path]).split()[0]
        report["installed_sha256_after"] = installed_sha
        if installed_sha != digest:
            raise RuntimeError("On-device APK checksum differs from signed release")
        report["status"] = "installed-and-device-hash-verified"
        return 0
    except (RuntimeError, OSError, subprocess.TimeoutExpired) as exc:
        report.update({"status": "failed", "error": str(exc)})
        return 1
    finally:
        REPORT.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        if not args.quiet:
            print(json.dumps(report, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    raise SystemExit(main())

"""Build a real Tauri production EXE without writing project caches on C:.

Run with pythonw.exe to avoid foreground terminals on the user's desktop.
Bare cargo build --release is intentionally NOT used: it runs Tauri in devUrl mode.
"""
from __future__ import annotations
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import time
import traceback

ROOT = Path(__file__).resolve().parent.parent
TEMP = ROOT / '.tmp'
EXE = ROOT / '.build' / 'target' / 'release' / 'snowy-display.exe'
REPORT = TEMP / 'production_build_result.json'
LOG = TEMP / 'production_build.log'
TOOLCHAIN = Path(r'C:\Users\BigBr\.rustup\toolchains\stable-x86_64-pc-windows-msvc\bin')


def main() -> None:
    TEMP.mkdir(parents=True, exist_ok=True)
    report: dict = {'started': time.strftime('%Y-%m-%dT%H:%M:%S'), 'status': 'starting'}
    def save() -> None:
        REPORT.write_text(json.dumps(report, indent=2), encoding='utf-8')
    save()
    try:
        assert (ROOT / '.git').is_dir(), 'Expected S: project checkout'
        assert TOOLCHAIN.joinpath('cargo.exe').is_file(), 'Installed Rust toolchain not found'
        assert shutil.disk_usage(ROOT).free > 1024 * 1024 * 1024, 'Insufficient S: free space'
        env = os.environ.copy()
        dirs = {
            'TEMP': TEMP, 'TMP': TEMP, 'TMPDIR': TEMP,
            'HOME': ROOT / '.home', 'USERPROFILE': ROOT / '.home',
            'APPDATA': ROOT / '.home' / 'AppData' / 'Roaming',
            'LOCALAPPDATA': ROOT / '.home' / 'AppData' / 'Local',
            'XDG_CACHE_HOME': ROOT / '.cache', 'XDG_CONFIG_HOME': ROOT / '.home' / 'config',
            'CARGO_HOME': ROOT / '.cache' / 'cargo',
            'CARGO_TARGET_DIR': ROOT / '.build' / 'target',
            'NPM_CONFIG_CACHE': ROOT / '.cache' / 'npm',
            'PYTHONPYCACHEPREFIX': ROOT / '.cache' / 'python',
            'NODE_COMPILE_CACHE': ROOT / '.cache' / 'node-compile',
            'GIT_CONFIG_GLOBAL': ROOT / '.home' / '.gitconfig',
        }
        for key, value in dirs.items():
            env[key] = str(value)
        env['PATH'] = str(TOOLCHAIN) + os.pathsep + env['PATH']
        env['RUSTC'] = str(TOOLCHAIN / 'rustc.exe')
        env['RUSTDOC'] = str(TOOLCHAIN / 'rustdoc.exe')
        env['CARGO_NET_OFFLINE'] = 'true'
        env['CARGO_BUILD_JOBS'] = '2'
        startup = subprocess.STARTUPINFO()
        startup.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        startup.wShowWindow = subprocess.SW_HIDE
        before = EXE.stat().st_mtime_ns if EXE.exists() else 0
        report['status'] = 'building'
        report['before_mtime_ns'] = before
        save()
        # Tauri CLI turns on tauri/custom-protocol and embeds frontendDist.
        cmd = ['npm.cmd', 'run', 'build', '--', '--no-bundle', '--', '--offline']
        with LOG.open('wb') as log:
            build = subprocess.run(cmd, cwd=ROOT, env=env, stdin=subprocess.DEVNULL,
                                   stdout=log, stderr=subprocess.STDOUT, timeout=720,
                                   creationflags=subprocess.CREATE_NO_WINDOW, startupinfo=startup)
        report['exit'] = build.returncode
        report['exe_exists'] = EXE.is_file()
        if build.returncode != 0:
            raise RuntimeError('Tauri CLI production build failed (see production_build.log)')
        if not EXE.is_file() or EXE.stat().st_size < 1_000_000 or EXE.stat().st_mtime_ns <= before:
            raise RuntimeError('Native executable was not freshly generated')
        report['size_bytes'] = EXE.stat().st_size
        report['mtime_ns'] = EXE.stat().st_mtime_ns
        report['sha256'] = hashlib.sha256(EXE.read_bytes()).hexdigest()
        report['status'] = 'success'
    except Exception:
        report['status'] = 'failed'
        report['error'] = traceback.format_exc()[-5000:]
    finally:
        save()


if __name__ == '__main__':
    main()

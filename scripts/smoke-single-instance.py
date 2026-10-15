"""Native Windows single-instance smoke check, with hidden process creation.
Run as pythonw.exe from the workspace after a successful Tauri production build.
"""
import csv
import io
import json
import os
from pathlib import Path
import subprocess
import time
import traceback

ROOT = Path(__file__).resolve().parent.parent
TEMP = ROOT / '.tmp'
EXE = ROOT / '.build' / 'target' / 'release' / 'snowy-display.exe'
LOG = TEMP / 'single_instance_smoke.json'
E = os.environ.copy()
for name, path in {
    'TEMP': TEMP, 'TMP': TEMP, 'TMPDIR': TEMP,
    'HOME': ROOT / '.home', 'USERPROFILE': ROOT / '.home',
    'APPDATA': ROOT / '.home' / 'AppData' / 'Roaming',
    'LOCALAPPDATA': ROOT / '.home' / 'AppData' / 'Local',
    'XDG_CACHE_HOME': ROOT / '.cache',
}.items(): E[name] = str(path)
st = subprocess.STARTUPINFO()
st.dwFlags |= subprocess.STARTF_USESHOWWINDOW
st.wShowWindow = subprocess.SW_HIDE
flags = subprocess.CREATE_NO_WINDOW
result = {'start': time.strftime('%Y-%m-%dT%H:%M:%S')}

def running_ids():
    p = subprocess.run(['tasklist.exe','/FO','CSV','/NH','/FI','IMAGENAME eq snowy-display.exe'],
                       cwd=ROOT, env=E, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                       creationflags=flags, startupinfo=st, timeout=12)
    decoded = p.stdout.decode('utf-8-sig', 'replace')
    return [int(row[1]) for row in csv.reader(io.StringIO(decoded))
            if len(row)>1 and row[0].casefold()=='snowy-display.exe' and row[1].isdigit()]

def launch():
    return subprocess.Popen([str(EXE)], cwd=ROOT, env=E,
                            stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                            stderr=subprocess.DEVNULL, creationflags=flags, startupinfo=st)

first = None
try:
    assert EXE.is_file() and EXE.stat().st_size > 1_000_000
    before = running_ids()
    result['existing_pids'] = before
    if before:
        raise RuntimeError('Existing Snowy Display is running; do not disrupt the user or claim a clean singleton test')
    first = launch()
    result['primary_pid'] = first.pid
    time.sleep(4)
    assert first.poll() is None, 'first instance exited before secondary startup'
    second = launch()
    try: second.wait(timeout=6)
    except subprocess.TimeoutExpired:
        result['secondary_remained_alive'] = True
        second.terminate()
        second.wait(timeout=4)
        raise RuntimeError('second instance was not blocked')
    result['second_exit'] = second.returncode
    third = launch()
    try: third.wait(timeout=6)
    except subprocess.TimeoutExpired:
        third.terminate(); third.wait(timeout=4)
        raise RuntimeError('third instance was not blocked')
    result['third_exit'] = third.returncode
    result['after_pids'] = running_ids()
    result['first_still_alive'] = first.poll() is None
    result['success'] = (result['first_still_alive'] and
                         second.returncode == 0 and third.returncode == 0 and
                         result['after_pids'] == [first.pid])
except Exception:
    result['success'] = False
    result['error'] = traceback.format_exc()[-2500:]
finally:
    # Keep the one genuine instance active for user inspection if it started.
    LOG.write_text(json.dumps(result, indent=2), encoding='utf-8')

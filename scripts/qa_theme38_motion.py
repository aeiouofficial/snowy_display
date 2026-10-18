#!/usr/bin/env python3
"""Visual and temporal regression QA for all 38 Snowy Display effect profiles.

Uses the production Vite build with a mocked Tauri bridge and an Android-size
headless Chromium viewport. Captures each theme at two times and compares
foreground canvas deltas; no Android device required. All output remains on S:.
"""
from __future__ import annotations
import json
import os
from pathlib import Path
import re
import threading
import time
import traceback
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from PIL import Image, ImageChops, ImageStat
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
TMP=ROOT/".tmp"
OUT=TMP/"snowy_theme38_motion_audit"
RESULT=TMP/"snowy_theme38_motion_audit_result.json"
for name,value in {"TMP":TMP,"TEMP":TMP,"TMPDIR":TMP,"HOME":ROOT/".home",
 "USERPROFILE":ROOT/".home","APPDATA":ROOT/".home"/"AppData"/"Roaming",
 "LOCALAPPDATA":ROOT/".home"/"AppData"/"Local"}.items():
 os.environ[name]=str(value)
OUT.mkdir(parents=True,exist_ok=True)
report={"started":time.strftime("%Y-%m-%dT%H:%M:%S"),"samples":[],
 "page_errors":[],"success":False,"expected_themes":38}
server=None

class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kw):super().__init__(*args,directory=str(ROOT/"dist"),**kw)
 def log_message(self,*args):pass

def delta(path1:Path,path2:Path)->tuple[float,float]:
 with Image.open(path1) as x,Image.open(path2) as y:
  a,b=x.convert("RGB"),y.convert("RGB")
  if a.size!=b.size:raise AssertionError(f"Canvas resized between frames: {a.size} {b.size}")
  z=ImageChops.difference(a,b)
  diff=sum(ImageStat.Stat(z).mean)/3
  changed=sum(1 for rgb in z.getdata() if max(rgb)>18)/(z.width*z.height)
  return round(diff,3),round(changed,5)

try:
 assert (ROOT/"dist/index.html").is_file(),"Run npm run build:web first"
 server=ThreadingHTTPServer(("127.0.0.1",0),Handler)
 threading.Thread(target=server.serve_forever,daemon=True).start()
 with sync_playwright() as playwright:
  context=playwright.chromium.launch_persistent_context(
   user_data_dir=str(OUT/"edge-profile"),
   executable_path=r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
   headless=True,viewport={"width":393,"height":780},is_mobile=True,
   has_touch=True,device_scale_factor=1,
   user_agent="Mozilla/5.0 (Linux; Android 13; M2103K19G) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36",
   args=["--disable-extensions","--no-first-run"])
  page=context.pages[0] if context.pages else context.new_page()
  page.add_init_script("""(()=> {
   window.__TAURI_INTERNALS__={invoke:async(cmd,args)=>{
    if(cmd==='get_desktop_settings')throw new Error('Headless QA: native state intentionally not connected');
    if(cmd==='control')return {granted:true,running:true};
    return null;
   }};
  })();""")
  page.on("pageerror",lambda err:report["page_errors"].append(str(err)))
  page.goto(f"http://127.0.0.1:{server.server_port}/index.html",wait_until="domcontentloaded")
  page.wait_for_timeout(300)
  page.locator("#scene").evaluate("""el => {
    el.style.setProperty('height','310px','important');
    el.style.setProperty('min-height','310px','important');
    el.style.setProperty('max-height','310px','important');
  }""")
  page.wait_for_timeout(450)
  canvas=page.locator("#preview")
  dims=canvas.bounding_box()
  report["preview_dimensions"]=dims
  assert dims and dims["height"]>=220,dims
  found=set()
  for category in ("Winter","Spring","Summer","Autumn","Weather","Events","Atmosphere"):
   page.get_by_role("button",name=category,exact=True).click()
   cards=page.locator(".scene-card")
   for n in range(cards.count()):
    card=cards.nth(n)
    theme=card.get_attribute("data-id")
    assert theme and re.fullmatch("[a-z0-9-]+",theme)
    assert theme not in found,theme
    found.add(theme)
    card.click()
    page.wait_for_timeout(120)
    first=OUT/f"{theme}__t0.png"
    canvas.screenshot(path=str(first),animations="disabled")
    page.wait_for_timeout(530)
    second=OUT/f"{theme}__t1.png"
    canvas.screenshot(path=str(second),animations="disabled")
    mean,fraction=delta(first,second)
    report["samples"].append({"theme":theme,"category":category,
      "pixel_delta":mean,"changed_fraction":fraction,
      "frame_0":str(first),"frame_1":str(second)})
  context.close()
 assert len(found)==38,len(found)
 assert not report["page_errors"],report["page_errors"]
 report["motion_sorted"]=sorted(
  [{"theme":x["theme"],"delta":x["pixel_delta"],"changed_fraction":x["changed_fraction"]}
   for x in report["samples"]],key=lambda x:x["delta"])
 report["no_observable_change"]=[x["theme"] for x in report["samples"] if x["pixel_delta"]<0.15]
 assert not report["no_observable_change"],"Non-animated theme(s): "+", ".join(report["no_observable_change"])
 report["success"]=True
except Exception:
 report["error"]=traceback.format_exc()[-4500:]
finally:
 if server:server.shutdown()
 RESULT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

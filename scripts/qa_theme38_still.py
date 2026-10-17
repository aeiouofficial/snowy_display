from pathlib import Path
import os,time,json,traceback,threading,re
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from PIL import Image,ImageDraw,ImageFont,ImageChops,ImageStat
R=Path(__file__).resolve().parents[1];T=R/".tmp"
OUT=T/"snowy_theme38_still_audit";OUT.mkdir(parents=True,exist_ok=True)
for k,v in {"TEMP":T,"TMP":T,"TMPDIR":T,"HOME":R/".home","USERPROFILE":R/".home","APPDATA":R/".home"/"AppData"/"Roaming","LOCALAPPDATA":R/".home"/"AppData"/"Local"}.items(): os.environ[k]=str(v)
report={"started":time.strftime("%Y-%m-%dT%H:%M:%S"),"themes":[],"errors":[],"passed":False}
server=None
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(R/"dist"),**kwargs)
 def log_message(self,*a):pass
try:
 from playwright.sync_api import sync_playwright
 server=ThreadingHTTPServer(("127.0.0.1",0),Handler)
 threading.Thread(target=server.serve_forever,daemon=True).start()
 with sync_playwright() as playwright:
  context=playwright.chromium.launch_persistent_context(str(OUT/"profile"),
   executable_path=r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
   headless=True,viewport={"width":393,"height":780},is_mobile=True,has_touch=True,
   device_scale_factor=1,user_agent="Mozilla/5.0 (Linux; Android 13; M2103K19G) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36",
   args=["--no-first-run","--disable-extensions"])
  page=context.pages[0] if context.pages else context.new_page()
  page.add_init_script("""(() => {
   window.__TAURI_INTERNALS__={invoke:async(cmd,args)=> {
    if(cmd==='get_desktop_settings')throw new Error('Headless independent visual QA');
    if(cmd==='control')return {granted:true,running:true};
    return null;
   }};
  })();""")
  page.on("pageerror",lambda e:report["errors"].append(str(e)))
  page.goto(f"http://127.0.0.1:{server.server_port}/index.html",wait_until="domcontentloaded")
  page.wait_for_timeout(350)
  scene=page.locator(".visual .scene")
  assert scene.count()==1,"Missing scene preview"
  for category in ("Winter","Spring","Summer","Autumn","Weather","Events","Atmosphere"):
   page.get_by_role("button",name=category,exact=True).click()
   cards=page.locator(".scene-card")
   size=cards.count()
   for n in range(size):
    card=cards.nth(n)
    id=card.get_attribute("data-id")
    assert id and re.fullmatch("[a-z0-9-]+",id),id
    card.click()
    page.wait_for_timeout(210)
    imgpath=OUT/f"{id}.png"
    scene.screenshot(path=str(imgpath),animations="disabled")
    with Image.open(imgpath) as img:
     rgb=img.convert("RGB")
     sample=rgb.resize((160,70))
     bands=ImageStat.Stat(sample).mean
     report["themes"].append({"id":id,"category":category,"image":str(imgpath),"size":list(rgb.size),"mean_rgb":[round(v,1) for v in bands]})
  assert len(report["themes"])==38,len(report["themes"])
  assert not report["errors"],report["errors"]
  context.close()
 # Compare structurally distinct pictures after normalizing screenshot dimensions.
 byid={x["id"]:Image.open(x["image"]).convert("RGB").resize((280,112)) for x in report["themes"]}
 pairwise=[]
 for a,ia in byid.items():
  for b,ib in byid.items():
   if a>=b:continue
   difference=round(sum(ImageStat.Stat(ImageChops.difference(ia,ib)).mean)/3,2)
   if difference<7.5:pairwise.append({"a":a,"b":b,"average_difference":difference})
 report["potential_near_duplicates"]=sorted(pairwise,key=lambda p:p["average_difference"])[:40]
 CELL_W=310;CELL_H=145;COLS=4
 montage=Image.new("RGB",(COLS*CELL_W,((len(report["themes"])+COLS-1)//COLS)*CELL_H),(12,19,30))
 draw=ImageDraw.Draw(montage);font=ImageFont.load_default()
 for i,item in enumerate(report["themes"]):
  x=(i%COLS)*CELL_W;y=(i//COLS)*CELL_H
  pic=byid[item["id"]].resize((300,105))
  montage.paste(pic,(x+5,y+30))
  draw.text((x+7,y+8),f"{i+1:02d} {item['id']}",font=font,fill=(224,237,244))
 imgpath=OUT/"overview_38_themes.png"
 montage.save(imgpath)
 report["montage"]=str(imgpath)
 assert not report["potential_near_duplicates"],report["potential_near_duplicates"]
 report["passed"]=True
except Exception:report["error"]=traceback.format_exc()[-4200:]
finally:
 if server:server.shutdown()
 (T/"snowy_theme38_still_audit_result.json").write_text(json.dumps(report,indent=2),encoding="utf-8")

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { SnowEngine, type Surface } from './physics.ts';
import { drawScene, fitCanvas, type SnowScene } from './render.ts';
import { normalizeDesktop, localViewport, worldSurfaces, PERFORMANCE,
  resolvePerformance, type Display, type DesktopWorld, type Viewport } from './desktop-world.ts';
import { activeTheme, loadSettings, fetchSettings, SETTINGS_EVENT, CLEAR_EVENT, type AppSettings } from './settings.ts';
import { INTERACTION_TOOLS, normalizeTool } from './interactions.ts';

const canvas=document.querySelector<HTMLCanvasElement>('#snow');
if(!canvas) throw new Error('[snowy] no transparent overlay canvas');
let ctx=fitCanvas(canvas,innerWidth,innerHeight);
const ownWindow=getCurrentWindow();
const isCoordinator=ownWindow.label==='snow-overlay-0';
const myDisplayIndex=Number(ownWindow.label.slice('snow-overlay-'.length))||0;
const engine=new SnowEngine(1,1);
let config:AppSettings=loadSettings();
let theme=activeTheme(config);
let desktop:DesktopWorld={x:0,y:0,width:innerWidth,height:innerHeight};
let displays:Display[]=[];
let viewport:Viewport={x:0,y:0,width:innerWidth,height:innerHeight,scaleFactor:1};
let sharedScene:SnowScene|null=null;
let sharedAt=-10000;
let lastPoll=0,lastLayout=0,lastFrame=performance.now(),lastRender=0,lastSend=0;
let lastCalendarDay=new Date().getDate();
let requestingGeometry=false,requestingLayout=false,shown=false,staleLogged=false;
let lastErrorLog=0;
const channel=typeof BroadcastChannel!=='undefined' ?
  new BroadcastChannel('snowy-display/world-v1') : null;

interface ScenePacket {
  type:'scene';
  world:DesktopWorld;
  scene:SnowScene;
  themeId:string;
  sentAt:number;
}
if(channel && !isCoordinator) {
  channel.onmessage=(event:MessageEvent<ScenePacket>)=>{
    const packet=event.data;
    if(!packet||packet.type!=='scene'||!packet.scene||!packet.world)return;
    sharedScene=packet.scene;
    sharedAt=performance.now();
    // Independent render viewports are remapped into the SAME physical world.
    desktop=packet.world;
    const display=displays[myDisplayIndex];
    if(display)viewport=localViewport(desktop,display);
    staleLogged=false;
  };
}
function apply(next:AppSettings):void {
  config=next;
  theme=activeTheme(config);
  engine.configure(config);
  engine.setTheme(theme.id);
  engine.setParticleLimit(PERFORMANCE[resolvePerformance(config.performanceMode)].particles);
  engine.configureActors({autoPlows:config.autoPlows,plowInterval:config.plowInterval});
}
apply(config);
void fetchSettings().then(apply).catch(error=>console.warn('[snowy] settings hydrate',error));
void listen<AppSettings>(SETTINGS_EVENT,event=>apply(event.payload)).catch(error=>console.warn('[snowy] settings listener',error));
void listen(CLEAR_EVENT,()=>{engine.clear();sharedScene=null;}).catch(()=>{});
window.addEventListener('storage',event=>{if(event.key)apply(loadSettings());});
window.addEventListener('resize',()=>{
  ctx=fitCanvas(canvas,innerWidth,innerHeight);
  void refreshMonitors();
});

function monitorFloor(d:Display,index:number):Surface {
  return {id:`monitor-floor-${index}`,x:d.x-desktop.x,y:d.y-desktop.y+d.height-2,
    width:d.width,height:5,z:-10000};
}
async function refreshMonitors():Promise<void> {
  if(requestingLayout)return;
  requestingLayout=true;
  try {
    const [layout,position,scale]=await Promise.all([
      invoke<Display[]>('desktop_monitors'),ownWindow.outerPosition(),ownWindow.scaleFactor(),
    ]);
    const usable=layout.filter(m=>m.width>0&&m.height>0&&Number.isFinite(m.x+m.y+m.width+m.height));
    if(usable.length) {
      const old=desktop;
      displays=usable;
      const next=normalizeDesktop(usable);
      desktop=next;
      const display=usable[myDisplayIndex]??usable.find(d=>d.x===position.x&&d.y===position.y)
        ??{id:'current',x:position.x,y:position.y,width:Math.round(innerWidth*scale),
           height:Math.round(innerHeight*scale),scaleFactor:scale};
      viewport=localViewport(next,display);
      if(isCoordinator) {
        if(old.x!==next.x||old.y!==next.y) engine.clear();
        engine.resize(next.width,next.height);
      }
    }
  } catch(error) {
    if(performance.now()-lastErrorLog>30000) {
      console.warn('[snowy] monitor enumeration failed',error);lastErrorLog=performance.now();
    }
  } finally {requestingLayout=false;}
}
async function refreshSurfaces():Promise<void> {
  if(requestingGeometry)return;
  requestingGeometry=true;
  try {
    const rects=await invoke<Surface[]>('desktop_snapshot');
    // Windows and X11 give physical desktop coordinates. On macOS the native
    // CoreGraphics adapter currently supplies logical points (mixed-DPI TODO).
    const mapped=worldSurfaces(rects,desktop,displays);
    const floors=displays.map(monitorFloor);
    engine.setSurfaces([...mapped,...floors],performance.now()/1000);
  } catch(error) {
    if(performance.now()-lastErrorLog>30000) {
      console.warn('[snowy] window geometry unavailable',error);lastErrorLog=performance.now();
    }
  } finally {requestingGeometry=false;}
}
// Cursor information is global physical desktop position. Only the coordinator
// receives/uses it: listeners in follower WebViews cannot perturb the physics.
if(isCoordinator) {
  let lastToolAt=0,lastToolX=-10000,lastToolY=-10000;
  void listen<[number,number]>('cursor-move',event=>{
    const [x,y]=event.payload;
    const localX=x-desktop.x, localY=y-desktop.y, now=performance.now();
    engine.interactMouse(localX,localY,now/1000);
    const tool=normalizeTool(config.interactionMode);
    if(tool==='none'||!config.enabled)return;
    const spec=INTERACTION_TOOLS.find(item=>item.id===tool)!;
    if(now-lastToolAt<spec.intervalMs ||
      Math.hypot(localX-lastToolX,localY-lastToolY)<12)return;
    if(engine.applyTool(tool,localX,localY,now/1000)) {
      lastToolAt=now;lastToolX=localX;lastToolY=localY;
    }
  }).catch(error=>console.warn('[snowy] cursor interaction event failed',error));
}
let lastScene:SnowScene=engine.snapshot();
async function initialize():Promise<void>{
  await refreshMonitors();
  if(isCoordinator)await refreshSurfaces();
}
void initialize();

function frame(now:number):void {
  requestAnimationFrame(frame);
  const profile=PERFORMANCE[resolvePerformance(config.performanceMode)];
  if(now-lastRender<1000/profile.fps)return;
  const elapsed=Math.min(.1,Math.max(0,(now-lastFrame)/1000));
  lastFrame=now;lastRender=now;
  if(config.automaticTheme) {
    const day=new Date().getDate();
    if(day!==lastCalendarDay){lastCalendarDay=day;apply(config);}
  }
  if(now-lastLayout>3000){lastLayout=now;void refreshMonitors();}
  if(!config.enabled) {
    ctx.clearRect(0,0,innerWidth,innerHeight);
    return;
  }
  const dataFresh=sharedScene!==null&&now-sharedAt<1800;
  // Every monitor draws the same world snapshot; only one WebView calculates
  // particles, collisions, DWM geometry and pile accumulation.
  if(isCoordinator||!dataFresh) {
    if(!isCoordinator && !staleLogged && now>2500) {
      console.warn('[snowy] coordinator unavailable; local fallback until it returns');
      staleLogged=true;
    }
    if(now-lastPoll>=profile.pollMs){
      lastPoll=now;
      void refreshSurfaces();
    }
    const substeps=Math.min(4,Math.max(1,Math.ceil(elapsed/(1/60))));
    for(let i=0;i<substeps;i++)engine.step(elapsed/substeps);
    lastScene=engine.snapshot();
    if(isCoordinator&&channel&&now-lastSend>=1000/profile.syncFps) {
      lastSend=now;
      const packet:ScenePacket={type:'scene',world:desktop,scene:lastScene,
        themeId:theme.id,sentAt:Date.now()};
      channel.postMessage(packet);
    }
  } else {
    lastScene=sharedScene!;
  }
  const sourceWorld=desktop;
  const display=displays[myDisplayIndex];
  if(display)viewport=localViewport(sourceWorld,display);
  ctx.save();
  // Independent DPI is a *draw transform*, not a separate physics grid.
  ctx.scale(innerWidth/viewport.width,innerHeight/viewport.height);
  ctx.translate(-viewport.x,-viewport.y);
  drawScene(ctx,lastScene,sourceWorld.width,sourceWorld.height,theme,viewport,false,config);
  ctx.restore();
  if(!shown) {
    shown=true;
    void ownWindow.show().catch(error=>{shown=false;console.warn('[snowy] show overlay failed',error);});
  }
}
requestAnimationFrame(frame);

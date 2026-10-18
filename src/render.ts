import type { Particle, SnowEngine, Surface } from './physics.ts';
import { resolveTheme, type WeatherTheme } from './themes.ts';
import type { Viewport } from './desktop-world.ts';
import {renderSeasonalScenery,drawSnowplow,type SceneVisualOptions} from './seasonal-render.ts';
import {paintThemeParticle,paintThemeAtmosphere,paintThemeFeaturedEffects} from './theme-effects.ts';

export type SnowScene = ReturnType<SnowEngine['snapshot']>;
export function drawSnow(ctx:CanvasRenderingContext2D, engine:SnowEngine, maskWindows=false, themeId='winter-snow',
  visuals:Partial<SceneVisualOptions>={}):void {
  drawScene(ctx,engine.snapshot(),engine.width,engine.height,resolveTheme(themeId),undefined,maskWindows,visuals);
}
/** Paint only the monitor's viewport of ONE shared desktop simulation. Coordinates are physical. */
export function drawScene(ctx:CanvasRenderingContext2D, scene:SnowScene, width:number,height:number,
  theme:WeatherTheme, viewport?:Viewport, maskWindows=false,
  visuals:Partial<SceneVisualOptions>={}):void {
  ctx.clearRect(0,0,width,height);
  const visible=(x:number,y:number,r=8) => !viewport ||
    x+r>=viewport.x && x-r<=viewport.x+viewport.width &&
    y+r>=viewport.y && y-r<=viewport.y+viewport.height;
  if(visuals.showSceneObjects!==false && (visuals.decorationDensity??.72)>0)
    paintThemeAtmosphere(ctx,theme.id,width,height,visuals.reduceMotion===true||visuals.animationsEnabled===false?0:scene.time);
  renderSeasonalScenery(ctx,theme.id,width,height,scene.time,visuals,viewport);
  for(const p of scene.flakes) if(visible(p.x,p.y,p.radius*2)) paintThemeParticle(ctx,p,theme,scene.time,width,height,visuals.visualScale??1);
  // These are actual, animated theme actors, not glowing placeholder circles.
  // Keep several recognizable silhouettes in every small preview regardless
  // of the shared physics engine's instantaneous particle radius distribution.
  paintThemeFeaturedEffects(ctx,theme,
    visuals.reduceMotion===true||visuals.animationsEnabled===false?0:scene.time,
    width,height,visuals.visualScale??1);
  if(theme.accumulating) {
    for(const p of scene.clumps) if(visible(p.x,p.y,p.radius*3)) drawClump(ctx,p);
    if(maskWindows) for(const s of scene.surfaces) ctx.clearRect(s.x,s.y+2,s.width,s.height-2);
    for (const pile of scene.piles) {
      const {surface:s,bins}=pile;
      if(s.y<=6 || (viewport && (s.x>viewport.x+viewport.width+16 ||
        s.x+s.width<viewport.x-16 || s.y<viewport.y-130 ||
        s.y>viewport.y+viewport.height+16))) continue;
      const higher=scene.surfaces.filter(other=>other.id!==s.id && other.z>s.z &&
        other.x<s.x+s.width && other.x+other.width>s.x &&
        other.y<s.y && other.y+other.height>s.y-140);
      ctx.save();
      // Even-odd clips MUST be applied separately: one combined path would XOR
      // overlapping foreground windows and reveal buried snow at intersections.
      for(const other of higher) {
        ctx.beginPath();ctx.rect(0,0,width,height);
        ctx.rect(other.x,other.y,other.width,other.height);
        ctx.clip('evenodd');
      }
      const exposed=(x:number) => {
        const i=Math.floor((x-s.x)/7);
        return pile.exposed&&i>=0&&i<pile.exposed.length?
          pile.exposed[i] :
          !scene.surfaces.some(other=>other.id!==s.id && other.z>s.z &&
            x>=other.x && x<other.x+other.width && other.y<=s.y && other.y+other.height>s.y);
      };
      for(let i=0;i<bins.length;) {
        while(i<bins.length && (!exposed(s.x+(i+.5)*7)||bins[i]<.09))i++;
        if(i>=bins.length)break;
        const start=i;
        while(i<bins.length&&exposed(s.x+(i+.5)*7)&&bins[i]>=.09)i++;
        snowSection(ctx,s,bins,start,i,theme);
      }
      // Impressions are associated with their OWN snow-bearing surface.
      // Existing per-pile clipping excludes any newly covering foreground.
      for(const stamp of scene.imprints) {
        if(stamp.surfaceId!==s.id||!exposed(stamp.x))continue;
        const age=Math.max(0,scene.time-stamp.at);
        const x=stamp.x, y=s.y-2;
        ctx.save();
        ctx.globalAlpha=Math.max(0,1-age/48);
        ctx.fillStyle=stamp.type==='footprint'?'rgba(66,111,145,.25)':'rgba(66,111,145,.19)';
        ctx.strokeStyle='rgba(225,241,255,.28)';
        const radius=stamp.radius;
        ctx.beginPath();
        ctx.ellipse(x,y-2,radius*.75,Math.max(2,radius*.26),0,0,Math.PI*2);
        ctx.fill();ctx.stroke();
        if(stamp.type==='footprint'){
          ctx.beginPath();ctx.ellipse(x+4,y+1,radius*.55,Math.max(1.4,radius*.22),-.25,0,Math.PI*2);
          ctx.fill();
        }
        ctx.restore();
      }
      for(const vehicle of scene.vehicles) {
        if(vehicle.surfaceId!==s.id || !visible(vehicle.x,vehicle.y,vehicle.size*2) ||
          !exposed(vehicle.x+vehicle.size*.4))continue;
        drawSnowplow(ctx,vehicle,visuals.animationsEnabled!==false&&visuals.reduceMotion!==true);
      }
      ctx.restore();
    }
  }
  // Localized magic effect rings fade out deterministically and are transmitted
  // in the shared scene packet, so multi-monitor transitions stay continuous.
  for(const pulse of scene.pulses) {
    if(!visible(pulse.x,pulse.y,pulse.radius))continue;
    const progress=Math.min(1,Math.max(0,(scene.time-pulse.at)/1.25));
    ctx.save();
    ctx.globalAlpha=Math.max(0,1-progress);
    const tint=pulse.type==='melt'?'rgba(255,183,93,.48)':
      pulse.type==='freeze'?'rgba(153,233,255,.48)':
      pulse.type==='vortex'?'rgba(200,164,255,.38)':'rgba(210,235,255,.38)';
    ctx.strokeStyle=tint;
    ctx.lineWidth=pulse.type==='freeze'?2:1.5;
    ctx.beginPath();
    ctx.arc(pulse.x,pulse.y,pulse.radius*(.15+.85*progress),0,Math.PI*2);
    ctx.stroke();
    ctx.restore();
  }
}
function drawClump(ctx: CanvasRenderingContext2D, p: Particle): void {
  const r=p.radius;ctx.save();ctx.translate(p.x,p.y);
  ctx.fillStyle=`rgba(246, 252, 255, ${p.opacity.toFixed(2)})`;
  ctx.beginPath();ctx.arc(0,0,r*.85,0,Math.PI*2);
  ctx.moveTo(-r*.35+r*.52,-r*.22);ctx.arc(-r*.35,-r*.22,r*.52,0,Math.PI*2);
  ctx.moveTo(r*.33+r*.5,-r*.18);ctx.arc(r*.33,-r*.18,r*.5,0,Math.PI*2);
  ctx.moveTo(r*.48,r*.3);ctx.arc(0,r*.3,r*.48,0,Math.PI*2);
  ctx.fill();ctx.restore();
}
function snowSection(ctx:CanvasRenderingContext2D,s:Surface,bins:readonly number[],start:number,end:number,t:WeatherTheme):void {
  const x1=s.x+start*7,x2=Math.min(s.x+s.width,s.x+end*7);
  let top=s.y;
  const pts:{x:number;y:number}[]=[{x:x1,y:s.y+.5}];
  for(let i=start;i<end;i++){
    const x=Math.min(s.x+s.width,s.x+(i+.5)*7);
    const y=s.y-bins[i]*1.15-.35*Math.sin(i*2.39);
    top=Math.min(top,y);pts.push({x,y});
  }
  pts.push({x:x2,y:s.y+.5});
  const path=new Path2D();path.moveTo(pts[0].x,pts[0].y);
  if(pts.length<=3){for(let i=1;i<pts.length;i++)path.lineTo(pts[i].x,pts[i].y);}
  else{for(let i=1;i<pts.length-1;i++){
    path.quadraticCurveTo(pts[i].x,pts[i].y,(pts[i].x+pts[i+1].x)/2,(pts[i].y+pts[i+1].y)/2);
  }path.lineTo(pts[pts.length-1].x,pts[pts.length-1].y);}
  path.lineTo(x2,s.y+2);path.lineTo(x1,s.y+2);path.closePath();
  ctx.save();ctx.shadowColor='rgba(120,168,212,.42)';
  ctx.shadowBlur=8;ctx.shadowOffsetY=2;
  const fill=ctx.createLinearGradient(0,top-2,0,s.y+2);
  fill.addColorStop(0,t.color);fill.addColorStop(.25,'#f5faff');
  fill.addColorStop(.68,'#d8eaf8');fill.addColorStop(1,'#98bada');
  ctx.fillStyle=fill;ctx.fill(path);
  ctx.shadowBlur=0;ctx.strokeStyle='rgba(255,255,255,.88)';ctx.lineWidth=.8;
  ctx.stroke(path);ctx.restore();
}
export function fitCanvas(canvas:HTMLCanvasElement,width:number,height:number):CanvasRenderingContext2D {
  const scale=Math.min(window.devicePixelRatio||1,2);
  canvas.width=Math.max(1,Math.round(width*scale));
  canvas.height=Math.max(1,Math.round(height*scale));
  const ctx=canvas.getContext('2d',{alpha:true});
  if(!ctx)throw new Error('2D canvas unavailable');
  ctx.setTransform(scale,0,0,scale,0,0);
  return ctx;
}

import type { PlowVehicle } from './physics.ts';
import type { Viewport } from './desktop-world.ts';
import { sceneMotifs, type SceneMotif } from './seasonal-content.ts';
import { resolveTheme } from './themes.ts';

export interface SceneVisualOptions {
  animationsEnabled:boolean; decorationDensity:number; visualScale:number; reduceMotion:boolean; showSceneObjects:boolean;
}
export const DEFAULT_VISUALS:SceneVisualOptions={
  animationsEnabled:true,decorationDensity:.72,visualScale:1,reduceMotion:false,showSceneObjects:true,
};
const PI=Math.PI,TAU=2*PI;
function circle(c:CanvasRenderingContext2D,x:number,y:number,r:number,fill:string):void {
  c.fillStyle=fill;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();
}
function line(c:CanvasRenderingContext2D,color:string,width:number,pts:readonly number[]):void {
  c.beginPath();c.moveTo(pts[0],pts[1]);
  for(let j=2;j<pts.length;j+=2)c.lineTo(pts[j],pts[j+1]);
  c.lineWidth=width;c.strokeStyle=color;c.stroke();
}
function ellipse(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,fill:string):void {
  c.beginPath();c.ellipse(x,y,w,h,0,0,TAU);c.fillStyle=fill;c.fill();
}
export function paintMotif(c:CanvasRenderingContext2D,m:SceneMotif,accent:string,animated=true):void {
  const {kind,size,variant}=m;
  const t=animated?m.phase:0;
  c.save();c.translate(m.x,m.y);c.rotate(animated?m.angle:0);
  c.lineCap='round';c.lineJoin='round';
  switch(kind){
    case 'pine':{
      line(c,'#6f7e73',3,[0,2,0,-size*1.4]);
      for(let j=0;j<3;j++){
        const y=-size*1.25+j*size*.32;
        c.beginPath();c.moveTo(0,y-size*.31);c.lineTo(-size*(.41+j*.11),y+size*.38);
        c.lineTo(size*(.41+j*.11),y+size*.38);c.closePath();
        c.fillStyle=j===0?'#2c756c':j===1?'#255c59':'#244b55';c.fill();
        if(j<2)line(c,'rgba(244,252,255,.9)',1.6,[-size*(.35+j*.09),y+size*.3,0,y-size*.22,size*(.35+j*.09),y+size*.3]);
      }
      break;
    }
    case 'icicle':
      c.fillStyle='#bfeaff';c.globalAlpha=.7;
      for(let k=0;k<4;k++){
        c.beginPath();const x=(k-1.5)*size*.3;
        c.moveTo(x-size*.14,0);c.lineTo(x+size*.14,0);
        c.lineTo(x+Math.sin(k*9)*2,size*(.7+(k%3)*.22));c.closePath();c.fill();
      }break;
    case 'aurora':{
      c.globalAlpha=.3;c.lineWidth=size*.18;
      const grad=c.createLinearGradient(-size,0,size,0);
      grad.addColorStop(0,'rgba(64,241,195,0)');grad.addColorStop(.5,'#48f4bb');grad.addColorStop(1,'rgba(114,90,246,0)');
      c.strokeStyle=grad;c.beginPath();
      for(let i=0;i<=12;i++) {
        const x=(i/12-.5)*size*3,y=Math.sin(i*.43+t*.85)*size*.31;
        if(i===0)c.moveTo(x,y);else c.lineTo(x,y);
      }c.stroke();break;
    }
    case 'moon':
      circle(c,0,0,size*.56,'#f5efcf');
      circle(c,size*.18,-size*.09,size*.5,'rgba(19,31,53,.97)');
      break;
    case 'sun':{
      c.globalAlpha=.76;
      for(let k=0;k<10;k++){
        const a=k*TAU/10;
        line(c,'#ffe3a8',1.5,[Math.cos(a)*size*.7,Math.sin(a)*size*.7,
          Math.cos(a)*size*.98,Math.sin(a)*size*.98]);
      }
      circle(c,0,0,size*.52,'#ffe2a1');break;
    }
    case 'snowflake':
    case 'star':
      for(let k=0;k<(kind==='star'?4:6);k++){
        const a=k*PI/(kind==='star'?4:6);
        line(c,kind==='star'?'#fbeacf':'#d7efff',1.4,
          [-Math.cos(a)*size*.55,-Math.sin(a)*size*.55,Math.cos(a)*size*.55,Math.sin(a)*size*.55]);
      }break;
    case 'branch':{
      line(c,'#8e6e68',2.3,[-size*.9,0,size*.9,-size*.47]);
      for(let k=0;k<4;k++){
        const x=-size*.56+k*size*.35;
        line(c,'#91685b',1.2,[x,-size*.12,x+size*.1,-size*.5]);
        circle(c,x+size*.14,-size*.47,size*.095,variant%2?'#e3ab69':'#f3bcd7');
      }break;
    }
    case 'flower':
      for(let k=0;k<5;k++){
        const a=k*TAU/5;
        ellipse(c,Math.cos(a)*size*.22,Math.sin(a)*size*.22,
          size*.16,size*.22,variant%2?'#ffc8d9':'#d8aafa');
      }
      circle(c,0,0,size*.1,'#ffdd7e');break;
    case 'butterfly':{
      const flap=.5+.5*Math.cos(t*6.5+variant);
      ellipse(c,-size*.3,0,size*.42*Math.max(.17,flap),size*.49,'#f4a5d3');
      ellipse(c,size*.3,0,size*.42*Math.max(.17,flap),size*.49,'#e9c2f9');
      ellipse(c,-size*.19,size*.24,size*.24*Math.max(.2,flap),size*.23,'#e68cbf');
      ellipse(c,size*.19,size*.24,size*.24*Math.max(.2,flap),size*.23,'#bc9de4');
      line(c,'#624b79',1,[0,-size*.33,0,size*.35]);break;
    }
    case 'bird':{
      const wing=Math.sin(t*4.5)*size*.26;
      line(c,'#b9c8de',2,[-size*.95,wing,0,-size*.12,size*.95,wing]);
      line(c,'#9baec5',.8,[-size*.45,wing*.45,0,0,size*.45,wing*.45]);break;
    }
    case 'bee':{
      ellipse(c,-size*.12,-size*.31,size*.29,size*.28,'rgba(210,243,255,.5)');
      ellipse(c,size*.1,-size*.35,size*.29,size*.28,'rgba(210,243,255,.45)');
      ellipse(c,0,0,size*.4,size*.25,'#f9cd51');
      line(c,'#624d2e',size*.14,[-size*.14,-size*.22,-size*.14,size*.22]);
      line(c,'#624d2e',size*.11,[size*.1,-size*.21,size*.1,size*.2]);break;
    }
    case 'kite':
      c.fillStyle=variant%2?'#d990d7':'#ffbd69';c.beginPath();
      c.moveTo(0,-size*.85);c.lineTo(size*.45,0);c.lineTo(0,size*.7);c.lineTo(-size*.45,0);c.closePath();c.fill();
      line(c,'#bed6e9',1,[0,size*.7,size*.17,size*1.45,0,size*1.9]);break;
    case 'cloud':{
      c.globalAlpha=.48;
      ellipse(c,-size*.39,2,size*.41,size*.19,'#b4c1d0');
      ellipse(c,0,-size*.14,size*.46,size*.32,'#c6d6df');
      ellipse(c,size*.37,1,size*.43,size*.21,'#b4c1d0');break;
    }
    case 'rainbow':{
      for(let k=0;k<5;k++){
        c.beginPath();c.arc(0,size*.15,size*(.65-k*.075),PI,TAU);
        c.strokeStyle=['#ed9cb8','#efcd82','#a5daa6','#8eccec','#d1adf1'][k];
        c.lineWidth=size*.055;c.globalAlpha=.6;c.stroke();
      }break;
    }
    case 'acorn':
      ellipse(c,0,size*.12,size*.23,size*.3,'#be8155');
      ellipse(c,0,-size*.11,size*.27,size*.12,'#704c33');break;
    case 'pumpkin':
      for(let k=-2;k<=2;k++)ellipse(c,k*size*.13,0,size*.22,size*.37,k%2?'#da742f':'#ed853c');
      line(c,'#60804d',2,[0,-size*.27,size*.08,-size*.49]);break;
    case 'lantern':{
      c.shadowColor='#ffa94c';c.shadowBlur=animated?6+4*Math.sin(t*3):7;
      c.fillStyle='#df8a49';c.fillRect(-size*.25,-size*.24,size*.5,size*.5);
      c.fillStyle='#ffde96';c.fillRect(-size*.13,-size*.15,size*.26,size*.33);
      c.shadowBlur=0;line(c,'#78624f',2,[-size*.24,-size*.23,-size*.16,-size*.37,size*.16,-size*.37,size*.24,-size*.23]);
      break;
    }
    case 'bat':{
      const flap=(Math.sin(t*5+variant)+1)*size*.14;
      c.beginPath();c.moveTo(-size,0);
      c.quadraticCurveTo(-size*.6,-size*.52-flap,0,-size*.08);
      c.quadraticCurveTo(size*.6,-size*.52-flap,size,0);
      c.quadraticCurveTo(size*.46,size*.3,0,size*.11);
      c.quadraticCurveTo(-size*.46,size*.3,-size,0);
      c.fillStyle='#706480';c.fill();break;
    }
    case 'candle':{
      c.fillStyle=variant===2?'#f4adc8':'#ddbc9d';
      c.fillRect(-size*.24,-size*.8,size*.48,size*.87);
      c.fillStyle='#fbe3c7';c.fillRect(-size*.13,-size*.78,size*.26,size*.64);
      const flameX=animated?Math.sin(t*2)*size*.07:0;
      c.shadowColor='#ffba66';c.shadowBlur=12;
      ellipse(c,flameX,-size*1.06,size*.11,size*.28,'#ffd38a');c.shadowBlur=0;
      line(c,'#8c7d77',1,[0,-size*.83,0,-size*.93]);break;
    }
    case 'fairylight':
      line(c,'rgba(167,181,170,.65)',1,[-size,0,size,0]);
      for(let k=0;k<5;k++){
        const x=(k-2)*size*.4;
        const color=['#fad78a','#f09ea4','#b8e4d8','#adc9fa'][((k+variant)%4)];
        c.shadowColor=color;c.shadowBlur=animated?7+2*Math.sin(t*3+k):5;
        circle(c,x,2+Math.sin(k*1.3)*size*.08,size*.08,color);
      }c.shadowBlur=0;break;
    case 'firework':{
      const radius=size*(.45+.36*(.5+.5*Math.sin(t*1.6+variant)));
      const color=variant%2?'#f8badd':'#ffe3a0';
      for(let k=0;k<10;k++){
        const a=k*TAU/10+t*.2;
        line(c,color,1,[Math.cos(a)*radius*.45,Math.sin(a)*radius*.45,
          Math.cos(a)*radius,Math.sin(a)*radius]);
      }break;
    }
    case 'meteor':
      line(c,'rgba(196,215,255,.7)',1.7,[-size*1.9,-size*.83,0,0]);
      circle(c,0,0,size*.14,'#f8ebff');break;
    case 'lightning':
      line(c,'rgba(221,230,255,.8)',2,[0,-size,-size*.21,-size*.23,
        size*.16,-size*.27,-size*.23,size]);break;
    case 'mist':{
      c.globalAlpha=.2;
      for(let k=0;k<3;k++)ellipse(c,(k-1)*size*.6,Math.sin(t*.42+k)*7,size*.67,size*.13,'#ccdce5');
      break;
    }
    case 'firefly':
      c.shadowColor='#e6ff9b';c.shadowBlur=7;
      circle(c,0,0,size*.16,'#d6f3b9');c.shadowBlur=0;break;
    case 'heart':{
      c.fillStyle='#f7a9c7';c.beginPath();c.moveTo(0,size*.5);
      c.bezierCurveTo(-size*1.15,-size*.15,-size*.45,-size*.64,0,-size*.3);
      c.bezierCurveTo(size*.45,-size*.64,size*1.15,-size*.15,0,size*.5);
      c.fill();break;
    }
  }
  c.restore();
}
export function renderSeasonalScenery(
  ctx:CanvasRenderingContext2D,
  themeId:string,width:number,height:number,time:number,
  options:Partial<SceneVisualOptions>={},
  viewport?:Viewport,
):void {
  const o={...DEFAULT_VISUALS,...options};
  if(!o.showSceneObjects||o.decorationDensity<=0)return;
  const active=o.animationsEnabled&&!o.reduceMotion;
  const motifs=sceneMotifs(themeId,width,height,active?time:0,
    Math.min(1,Math.max(0,o.decorationDensity)));
  const theme=resolveTheme(themeId);
  for(const m of motifs){
    if(viewport&&(m.x+m.size*3<viewport.x||m.x-m.size*3>viewport.x+viewport.width||
      m.y+m.size*3<viewport.y||m.y-m.size*3>viewport.y+viewport.height))continue;
    ctx.save();ctx.translate(m.x,m.y);ctx.scale(o.visualScale,o.visualScale);
    ctx.translate(-m.x,-m.y);
    paintMotif(ctx,m,theme.accent,active);ctx.restore();
  }
}
export function drawSnowplow(ctx:CanvasRenderingContext2D,v:PlowVehicle,active=true):void {
  const s=v.size;
  ctx.save();ctx.translate(v.x,v.y);ctx.scale(v.direction,1);
  ctx.globalAlpha=.94;
  // Compact animated maintenance plow, not a cartoon or character.
  ctx.fillStyle='#243950';ctx.beginPath();ctx.roundRect(-s*.55,-s*.31,s*.84,s*.4,3);ctx.fill();
  ctx.fillStyle='#e8a84d';ctx.beginPath();ctx.roundRect(-s*.25,-s*.56,s*.43,s*.29,3);ctx.fill();
  ctx.fillStyle='#97d7ef';ctx.fillRect(-s*.19,-s*.51,s*.22,s*.18);
  ctx.fillStyle='#1e2b36';for(const x of [-s*.38,s*.13])circle(ctx,x,s*.1,s*.13,'#1e2b36');
  ctx.fillStyle='#a7c0c8';ctx.beginPath();ctx.moveTo(s*.28,-s*.21);
  ctx.lineTo(s*.62,-s*.33);ctx.lineTo(s*.7,s*.09);ctx.lineTo(s*.41,s*.13);ctx.closePath();ctx.fill();
  line(ctx,'#f5b96a',1.3,[s*.63,-s*.3,s*.7,s*.08]);
  const t=active?v.phase:0;
  if(Math.sin(t*3)>0)circle(ctx,-s*.16,-s*.62,s*.085,'#f2c363');
  ctx.restore();
}

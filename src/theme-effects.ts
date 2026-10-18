/** Per-scene visual grammar for the canvas preview and desktop renderer.
 * Identity is selected by the exact theme ID, never by generic particle kind.
 * Decorative atmospheres are translucent and preserve window readability.
 */
import type {Particle} from './physics.ts';
import type {WeatherTheme} from './themes.ts';

export type Glyph =
  'flake'|'ice-shard'|'snow-streak'|'needle'|'petal'|'rain'|'pollen'|'butterfly'|
  'seed'|'prism'|'firefly'|'downpour'|'meteor'|'bee'|'ribbon'|'sun-dust'|
  'maple'|'grain'|'leaf-fog'|'bird'|'lightning'|'fog'|'drizzle'|'gust'|'bat'|
  'wisp'|'gift'|'confetti'|'flame'|'galaxy'|'crescent'|'egg'|'heart'|'candle'|
  'sparkler'|'lantern'|'star'|'ice-star';
export type Drift = 'fall'|'blizzard'|'hover'|'rise'|'swing'|'sweep'|'orbit'|'float'|'still'|'dive';
export type Atmosphere =
  'none'|'snow-haze'|'whiteout'|'frost'|'aurora'|'forest'|'petal-haze'|
  'rain-haze'|'pollen-glow'|'meadow'|'rainbow'|'twilight'|'storm'|'constellation'|
  'apiary'|'breeze'|'sunset'|'canopy'|'harvest'|'migration'|'thunder'|'fogbank'|
  'mist-rain'|'windbands'|'halloween'|'haunted'|'christmas'|'fireworks'|'campfire'|
  'nebula'|'moonlight'|'spring-party'|'romance'|'advent-1'|'advent-2'|'advent-3'|'advent-4';

export interface ThemeEffect {
  readonly glyph:Glyph;
  readonly companion:Glyph;
  readonly drift:Drift;
  readonly atmosphere:Atmosphere;
  readonly glow:number;
  readonly trail:number;
  readonly speed:number;
  readonly amplitude:number;
  readonly frequency:number;
  readonly skew:number;
}

/** Exactly one independently specified effect signature for every catalog item. */
export const THEME_EFFECTS:Readonly<Record<string,ThemeEffect>>={
  'winter-snow':        {glyph:'flake',companion:'ice-star',drift:'fall',atmosphere:'snow-haze',glow:.12,trail:0,speed:.55,amplitude:7,frequency:.8,skew:0},
  'winter-blizzard':    {glyph:'snow-streak',companion:'ice-shard',drift:'blizzard',atmosphere:'whiteout',glow:0,trail:12,speed:2.7,amplitude:22,frequency:2.4,skew:-18},
  'winter-frost':       {glyph:'ice-star',companion:'ice-shard',drift:'still',atmosphere:'frost',glow:.42,trail:0,speed:.04,amplitude:2,frequency:.24,skew:0},
  'winter-northernlights':{glyph:'ice-shard',companion:'star',drift:'hover',atmosphere:'aurora',glow:.25,trail:0,speed:.16,amplitude:13,frequency:.8,skew:0},
  'winter-forest':      {glyph:'needle',companion:'flake',drift:'fall',atmosphere:'forest',glow:0,trail:0,speed:.36,amplitude:4,frequency:.64,skew:0},
  'spring-petals':      {glyph:'petal',companion:'seed',drift:'swing',atmosphere:'petal-haze',glow:0,trail:0,speed:.38,amplitude:16,frequency:1.7,skew:0},
  'spring-rain':        {glyph:'rain',companion:'prism',drift:'fall',atmosphere:'rain-haze',glow:0,trail:14,speed:1.4,amplitude:2,frequency:.5,skew:-5},
  'spring-pollen':      {glyph:'pollen',companion:'seed',drift:'hover',atmosphere:'pollen-glow',glow:.24,trail:0,speed:.10,amplitude:20,frequency:1.3,skew:0},
  'spring-butterflies': {glyph:'butterfly',companion:'petal',drift:'orbit',atmosphere:'meadow',glow:0,trail:0,speed:.12,amplitude:22,frequency:2.2,skew:0},
  'spring-meadow':      {glyph:'seed',companion:'pollen',drift:'rise',atmosphere:'meadow',glow:.1,trail:0,speed:.12,amplitude:13,frequency:1.4,skew:0},
  'spring-rainbow':     {glyph:'prism',companion:'rain',drift:'float',atmosphere:'rainbow',glow:.3,trail:2,speed:.06,amplitude:8,frequency:.36,skew:0},
  'summer-fireflies':   {glyph:'firefly',companion:'pollen',drift:'orbit',atmosphere:'twilight',glow:1,trail:0,speed:.08,amplitude:21,frequency:1.8,skew:0},
  'summer-showers':     {glyph:'downpour',companion:'rain',drift:'fall',atmosphere:'storm',glow:0,trail:24,speed:2.5,amplitude:6,frequency:.85,skew:-8},
  'summer-stargaze':    {glyph:'star',companion:'meteor',drift:'still',atmosphere:'constellation',glow:.75,trail:24,speed:.02,amplitude:1,frequency:.25,skew:0},
  'summer-bees':        {glyph:'bee',companion:'pollen',drift:'orbit',atmosphere:'apiary',glow:0,trail:0,speed:.15,amplitude:26,frequency:3.8,skew:0},
  'summer-kite':        {glyph:'ribbon',companion:'seed',drift:'sweep',atmosphere:'breeze',glow:0,trail:8,speed:.22,amplitude:32,frequency:.9,skew:0},
  'summer-goldenhour':  {glyph:'sun-dust',companion:'seed',drift:'hover',atmosphere:'sunset',glow:.65,trail:0,speed:.08,amplitude:9,frequency:.4,skew:0},
  'autumn-leaves':      {glyph:'maple',companion:'needle',drift:'swing',atmosphere:'canopy',glow:0,trail:0,speed:.46,amplitude:23,frequency:1.7,skew:0},
  'autumn-mist':        {glyph:'leaf-fog',companion:'grain',drift:'float',atmosphere:'harvest',glow:.22,trail:0,speed:.08,amplitude:17,frequency:.6,skew:0},
  'autumn-harvest':     {glyph:'lantern',companion:'grain',drift:'swing',atmosphere:'harvest',glow:.72,trail:0,speed:.21,amplitude:11,frequency:.8,skew:0},
  'autumn-migration':   {glyph:'bird',companion:'maple',drift:'sweep',atmosphere:'migration',glow:0,trail:0,speed:.13,amplitude:6,frequency:1.1,skew:0},
  'weather-thunder':    {glyph:'lightning',companion:'downpour',drift:'blizzard',atmosphere:'thunder',glow:.65,trail:26,speed:2.5,amplitude:17,frequency:2,skew:-12},
  'weather-fog':        {glyph:'fog',companion:'leaf-fog',drift:'float',atmosphere:'fogbank',glow:0,trail:0,speed:.03,amplitude:28,frequency:.45,skew:0},
  'weather-drizzle':    {glyph:'drizzle',companion:'prism',drift:'fall',atmosphere:'mist-rain',glow:0,trail:7,speed:.82,amplitude:2,frequency:.8,skew:-2},
  'weather-windy':      {glyph:'gust',companion:'maple',drift:'sweep',atmosphere:'windbands',glow:0,trail:18,speed:.7,amplitude:27,frequency:2.4,skew:0},
  'halloween-bats':     {glyph:'bat',companion:'wisp',drift:'sweep',atmosphere:'halloween',glow:.1,trail:0,speed:.45,amplitude:19,frequency:3.8,skew:0},
  'halloween-embers':   {glyph:'wisp',companion:'lantern',drift:'rise',atmosphere:'haunted',glow:.95,trail:10,speed:.15,amplitude:20,frequency:.7,skew:0},
  'advent-1':          {glyph:'candle',companion:'sparkler',drift:'rise',atmosphere:'advent-1',glow:.85,trail:4,speed:.06,amplitude:3,frequency:1.1,skew:0},
  'advent-2':          {glyph:'sparkler',companion:'candle',drift:'rise',atmosphere:'advent-2',glow:.9,trail:9,speed:.08,amplitude:4,frequency:1.6,skew:0},
  'advent-3':          {glyph:'candle',companion:'heart',drift:'hover',atmosphere:'advent-3',glow:.95,trail:6,speed:.07,amplitude:5,frequency:1.4,skew:0},
  'advent-4':          {glyph:'star',companion:'candle',drift:'rise',atmosphere:'advent-4',glow:1,trail:14,speed:.09,amplitude:8,frequency:2,skew:0},
  'christmas-snow':    {glyph:'gift',companion:'flake',drift:'fall',atmosphere:'christmas',glow:.36,trail:0,speed:.26,amplitude:5,frequency:.8,skew:0},
  'newyear-confetti':  {glyph:'confetti',companion:'sparkler',drift:'blizzard',atmosphere:'fireworks',glow:.25,trail:13,speed:1,amplitude:30,frequency:2.3,skew:0},
  'event-easter':      {glyph:'egg',companion:'butterfly',drift:'float',atmosphere:'spring-party',glow:.12,trail:0,speed:.11,amplitude:19,frequency:1.6,skew:0},
  'event-valentine':   {glyph:'heart',companion:'sparkler',drift:'rise',atmosphere:'romance',glow:.48,trail:4,speed:.12,amplitude:15,frequency:1.2,skew:0},
  'ambient-embers':    {glyph:'flame',companion:'sparkler',drift:'rise',atmosphere:'campfire',glow:.92,trail:13,speed:.5,amplitude:9,frequency:2,skew:0},
  'ambient-cosmos':    {glyph:'galaxy',companion:'meteor',drift:'orbit',atmosphere:'nebula',glow:.8,trail:20,speed:.045,amplitude:18,frequency:.22,skew:0},
  'ambient-moonlight': {glyph:'crescent',companion:'star',drift:'float',atmosphere:'moonlight',glow:.35,trail:0,speed:.035,amplitude:13,frequency:.5,skew:0}
};

export function effectFor(id:string):ThemeEffect {
  const effect=THEME_EFFECTS[id];
  if(!effect)throw new Error('Missing independent theme visual: '+id);
  return effect;
}

const TAU=Math.PI*2;
const fract=(x:number):number=>x-Math.floor(x);
const hash=(x:number):number=>fract(Math.sin(x*127.1+78.233)*43758.5453);
const polar=(a:number,r:number):[number,number]=>[Math.cos(a)*r,Math.sin(a)*r];

function polygon(c:CanvasRenderingContext2D,points:readonly number[]):void {
  c.beginPath();
  for(let i=0;i<points.length;i+=2){if(!i)c.moveTo(points[i],points[i+1]);else c.lineTo(points[i],points[i+1]);}
  c.closePath();c.fill();
}
function star(c:CanvasRenderingContext2D,r:number,arms=5):void {
  c.beginPath();
  for(let i=0;i<arms*2;i++){const a=i*Math.PI/arms-Math.PI/2,z=(i%2?r*.38:r);
    const [x,y]=polar(a,z);if(!i)c.moveTo(x,y);else c.lineTo(x,y);
  }
  c.closePath();c.fill();
}
function streak(c:CanvasRenderingContext2D,len:number,skew=0):void {
  c.beginPath();c.moveTo(-skew*.5,-len*.5);c.lineTo(skew*.5,len*.5);c.stroke();
}
function petal(c:CanvasRenderingContext2D,r:number):void {
  c.beginPath();c.moveTo(0,-r);c.bezierCurveTo(r*.94,-r*.87,r*.95,r*.5,0,r);
  c.bezierCurveTo(-r*.95,r*.5,-r*.94,-r*.87,0,-r);c.fill();
  c.strokeStyle='rgba(255,255,255,.2)';c.lineWidth=.5;c.beginPath();c.moveTo(0,-r*.65);c.lineTo(0,r*.65);c.stroke();
}
function maple(c:CanvasRenderingContext2D,r:number):void {
  polygon(c,[0,-r,-r*.22,-r*.46,-r*.72,-r*.74,-r*.59,-r*.19,-r,r*.1,
    -r*.43,r*.29,-r*.3,r*.69,0,r*.52,r*.3,r*.69,r*.43,r*.29,r,r*.1,
    r*.59,-r*.19,r*.72,-r*.74,r*.22,-r*.46]);
  c.lineWidth=.7;c.strokeStyle='rgba(58,28,17,.45)';
  c.beginPath();c.moveTo(0,-r*.7);c.lineTo(0,r*.95);c.stroke();
}
function butterfly(c:CanvasRenderingContext2D,r:number,t:number):void {
  const flap=.35+.65*Math.abs(Math.sin(t*5));
  c.save();c.scale(flap,1);
  c.beginPath();c.ellipse(-r*.56,-r*.24,r*.56,r*.7,-.3,0,TAU);
  c.ellipse(r*.56,-r*.24,r*.56,r*.7,.3,0,TAU);c.fill();
  c.beginPath();c.ellipse(-r*.38,r*.43,r*.37,r*.42,0,0,TAU);
  c.ellipse(r*.38,r*.43,r*.37,r*.42,0,0,TAU);c.fill();c.restore();
  c.fillStyle='rgba(59,48,83,.82)';c.fillRect(-r*.07,-r*.48,r*.14,r*1.15);
}
function bird(c:CanvasRenderingContext2D,r:number,t:number):void {
  c.lineWidth=Math.max(.9,r*.17);c.lineCap='round';
  c.beginPath();c.moveTo(-r*1.2,Math.sin(t*4)*r*.3);c.quadraticCurveTo(-r*.35,-r*.85,0,0);
  c.quadraticCurveTo(r*.35,-r*.85,r*1.2,Math.sin(t*4)*r*.3);c.stroke();
}
function bat(c:CanvasRenderingContext2D,r:number,t:number):void {
  const f=Math.sin(t*8)*r*.46;
  polygon(c,[-r*1.7,-r*.12,-r*.9,-r*.98-f,-r*.2,-r*.35,0,-r*.15,
    r*.2,-r*.35,r*.9,-r*.98-f,r*1.7,-r*.12,r*.94,r*.26,r*.52,r*.09,
    r*.16,r*.38,0,r*.22,-r*.16,r*.38,-r*.52,r*.09,-r*.94,r*.26]);
}
function heart(c:CanvasRenderingContext2D,r:number):void {
  c.beginPath();c.moveTo(0,r*.92);c.bezierCurveTo(-r*1.5,0,-r*1.15,-r,0,-r*.39);
  c.bezierCurveTo(r*1.15,-r,r*1.5,0,0,r*.92);c.fill();
}
function glow(c:CanvasRenderingContext2D,color:string,r:number,strength:number):void {
  c.save();c.globalAlpha=Math.min(.85,strength*.4);
  const g=c.createRadialGradient(0,0,0,0,0,Math.max(1,r));
  g.addColorStop(0,color);g.addColorStop(1,'rgba(0,0,0,0)');
  c.fillStyle=g;c.beginPath();c.arc(0,0,r,0,TAU);c.fill();c.restore();
}

const VISIBLE_SILHOUETTES:ReadonlySet<Glyph>=new Set<Glyph>([
  'petal','maple','butterfly','bee','bird','bat','heart','egg','gift',
  'lantern','flame','wisp','candle','crescent','galaxy','prism','confetti'
]);
const FINE_PARTICLES:ReadonlySet<Glyph>=new Set<Glyph>([
  'drizzle','rain','downpour','snow-streak','firefly','sun-dust','pollen'
]);

/** Distinct trajectory and shape. Called for every visual particle; no generic color-only fallback. */
export function paintThemeParticle(c:CanvasRenderingContext2D,p:Particle,theme:WeatherTheme,
  time:number,width:number,height:number,visualScale=1,forcedGlyph?:Glyph,lockedPosition=false):void {
  const fx=effectFor(theme.id);
  const seed=p.mass*12.31+p.radius*15.47;
  const h=hash(seed);
  const secondary=h>.73;
  const glyph=forcedGlyph??(secondary?fx.companion:fx.glyph);
  const phase=time*fx.frequency+seed*1.3;
  const amount=p.radius*visualScale*(glyph==='bat'||glyph==='butterfly'||glyph==='bee'?2.6:2);
  const sway=Math.sin(phase)*fx.amplitude;
  const motion=fx.drift;
  const speed=fx.speed;
  // Floaters rise or hover; wind-driven motifs traverse the display independently of snow physics.
  let x=p.x+(motion==='sweep'||motion==='blizzard'?time*speed*27:0)+sway;
  let y=p.y+(motion==='rise'?-time*speed*18:motion==='still'?0:motion==='hover'?Math.sin(phase*1.3)*9:0);
  if(motion==='orbit'){x+=Math.cos(phase)*fx.amplitude;y+=Math.sin(phase)*fx.amplitude*.75;}
  if(motion==='swing'){y+=Math.cos(phase*.8)*fx.amplitude*.35;}
  if(motion==='dive'){y+=Math.cos(phase)*fx.amplitude;}
  if(motion==='float'){y+=Math.sin(phase*.75)*fx.amplitude*.32;}
  if(lockedPosition){x=p.x;y=p.y;}
  else{
    x=((x+40)%(width+80)+(width+80))%(width+80)-40;
    y=((y+35)%(height+70)+(height+70))%(height+70)-35;
  }
  // This icon-scale floor prevents leaves, bats and petals becoming glow dots.
  // Actual rain and natural fireflies remain appropriately fine-grained.
  const silhouettes=VISIBLE_SILHOUETTES;
  const fine=FINE_PARTICLES;
  const minimum=fine.has(glyph)?2.2:silhouettes.has(glyph)?9:5;
  const maximum=fine.has(glyph)?11:25;
  const r=Math.min(maximum,Math.max(minimum,amount*(glyph==='star'?.65:1)));
  c.save();c.translate(x,y);
  c.globalAlpha=Math.min(1,Math.max(.14,p.opacity));
  c.rotate(lockedPosition?0:(motion==='swing'||motion==='blizzard'?phase*.47:motion==='orbit'?phase*.1:0)+fx.skew*Math.PI/180);
  c.fillStyle=secondary?theme.secondary:theme.color;
  c.strokeStyle=secondary?theme.secondary:theme.color;
  c.lineWidth=Math.max(.7,r*.13);
  c.lineCap='round';
  if(fx.glow>.3 && (glyph==='firefly'||glyph==='sun-dust'||glyph==='flame'||glyph==='wisp'||glyph==='galaxy'||glyph==='candle'||glyph==='star'))
    glow(c,theme.color,r*3,fx.glow);
  switch(glyph){
    case 'flake':case 'ice-star':
      for(let k=0;k<(glyph==='flake'?6:4);k++){const a=k*Math.PI/(glyph==='flake'?3:4);const [xx,yy]=polar(a,r);
        c.beginPath();c.moveTo(-xx,-yy);c.lineTo(xx,yy);c.stroke();
        if(glyph==='flake'){const [ax,ay]=polar(a,r*.54);c.beginPath();c.moveTo(ax,ay);c.lineTo(ax-yy*.15,ay+xx*.15);c.stroke();}
      }break;
    case 'snow-streak':case 'rain':case 'downpour':case 'drizzle':
      c.lineWidth=glyph==='drizzle'?.65:glyph==='downpour'?1.7:1;
      streak(c,glyph==='drizzle'?r*2:glyph==='downpour'?r*9:r*5,fx.skew*.35);
      if(glyph==='downpour'||glyph==='rain'){c.beginPath();c.ellipse(r*.5,r*3,r*.65,r*.18,0,0,TAU);c.stroke();}
      break;
    case 'ice-shard':polygon(c,[0,-r*.9,r*.4,0,0,r,-r*.3,0]);break;
    case 'needle':polygon(c,[-r*.2,-r,r*.2,-r*.7,r*.35,r,-r*.12,r*.8]);break;
    case 'petal':petal(c,r);break;
    case 'pollen':for(let k=0;k<4;k++){const [a,b]=polar(k*TAU/4+phase*.17,r*.45);c.beginPath();c.arc(a,b,r*.19,0,TAU);c.fill();}break;
    case 'seed':c.beginPath();c.ellipse(0,0,r*.25,r*.65,.3,0,TAU);c.fill();streak(c,r*1.5,.3);break;
    case 'butterfly':butterfly(c,r,phase);break;
    case 'prism':c.beginPath();c.arc(0,0,r*.7,0,TAU);c.stroke();polygon(c,[0,-r*.7,r*.38,r*.4,-r*.38,r*.4]);break;
    case 'firefly':glow(c,theme.color,r*3.4,.95);c.beginPath();c.arc(0,0,r*.45,0,TAU);c.fill();break;
    case 'meteor':case 'sparkler':
      streak(c,r*4,r*3);star(c,r*.7,4);break;
    case 'bee':
      c.fillStyle='#ffe39e';c.beginPath();c.ellipse(0,0,r*.78,r*.45,0,0,TAU);c.fill();
      c.strokeStyle='#4d3740';for(let k of [-.3,.3]){c.beginPath();c.moveTo(r*k,-r*.38);c.lineTo(r*k,r*.38);c.stroke();}
      c.fillStyle='rgba(228,244,255,.7)';c.beginPath();c.ellipse(-r*.3,-r*.58,r*.36,r*.35,-.5,0,TAU);
      c.ellipse(r*.3,-r*.58,r*.36,r*.35,.5,0,TAU);c.fill();break;
    case 'ribbon':c.lineWidth=Math.max(1,r*.24);c.beginPath();c.moveTo(-r*1.7,r);c.bezierCurveTo(-r,-r,r*.2,r,r*1.6,-r);c.stroke();break;
    case 'sun-dust':glow(c,theme.color,r*3,.65);star(c,r*.65,4);break;
    case 'maple':maple(c,r);break;
    case 'grain':polygon(c,[0,-r,r*.27,-r*.2,r*.15,r*.9,-r*.15,r*.9,-r*.27,-r*.2]);break;
    case 'leaf-fog':c.globalAlpha*=.3;c.beginPath();c.ellipse(0,0,r*2,r*.4,-.2,0,TAU);c.fill();break;
    case 'bird':bird(c,r,phase);break;
    case 'lightning':polygon(c,[-r*.2,-r,r*.4,-r*.25,0,-r*.2,r*.35,r,-r*.4,r*.06,0,0]);break;
    case 'fog':c.globalAlpha*=.16;c.beginPath();c.ellipse(0,0,r*3.5,r*.65,0,0,TAU);c.fill();break;
    case 'gust':c.beginPath();c.moveTo(-r*2,0);c.bezierCurveTo(-r,-r,r,-r,r*1.1,0);c.bezierCurveTo(r*1.5,r*.7,r*.1,r*.6,r*.5,r*.2);c.stroke();break;
    case 'bat':bat(c,r,phase);break;
    case 'wisp':glow(c,theme.color,r*3,.9);petal(c,r*.8);streak(c,r*2,-r*.4);break;
    case 'gift':c.fillRect(-r*.55,-r*.55,r*1.1,r*1.1);c.fillStyle=theme.secondary;c.fillRect(-r*.12,-r*.57,r*.24,r*1.12);c.fillRect(-r*.56,-r*.1,r*1.12,r*.2);break;
    case 'confetti':c.fillRect(-r*.5,-r,r,r*1.7);break;
    case 'flame':glow(c,theme.color,r*2.7,.8);polygon(c,[0,-r*1.5,r*.55,-r*.3,r*.55,r*.5,0,r,-r*.55,r*.5,-r*.55,-r*.3]);break;
    case 'galaxy':glow(c,theme.color,r*3,.65);c.beginPath();c.ellipse(0,0,r*1.3,r*.46,.55,0,TAU);c.stroke();star(c,r*.4,5);break;
    case 'crescent':c.beginPath();c.arc(0,0,r,Math.PI*.18,Math.PI*1.83);c.arc(r*.34,-r*.16,r*.76,Math.PI*1.78,Math.PI*.22,true);c.closePath();c.fill();break;
    case 'egg':c.beginPath();c.ellipse(0,0,r*.66,r,.1,0,TAU);c.fill();c.strokeStyle=theme.secondary;streak(c,r*.75,1);break;
    case 'heart':heart(c,r);break;
    case 'candle':glow(c,theme.color,r*3,.55);petal(c,r*.7);break;
    case 'lantern':glow(c,theme.color,r*2.7,.6);c.fillRect(-r*.45,-r*.8,r*.9,r*1.55);c.strokeRect(-r*.48,-r*.82,r*.96,r*1.64);break;
    case 'star':star(c,r,5);break;
    default:{const never:never=glyph;throw new Error('Unimplemented glyph '+never);}
  }
  c.restore();
}

/** Actual theme-specific icon art in every catalog card; no shared category emoji. */
export function paintThemeThumbnail(canvas:HTMLCanvasElement,theme:WeatherTheme):void {
  canvas.width=72;
  canvas.height=64;
  const ctx=canvas.getContext('2d',{alpha:true});
  if(!ctx)return;
  const {glyph,companion}=effectFor(theme.id);
  const particle=(x:number,y:number,radius:number):Particle=>({
    x,y,radius,opacity:1,mass:1.4,vx:0,vy:0
  });
  ctx.clearRect(0,0,72,64);
  // Companion behind the primary helps identify visually adjacent effects.
  paintThemeParticle(ctx,particle(56,17,3.6),theme,0,72,64,.85,companion,true);
  paintThemeParticle(ctx,particle(34,34,6.7),theme,0,72,64,1.3,glyph,true);
}

/** Low-cost atmospheric signature layer drawn once per frame, not per particle. */
export function paintThemeAtmosphere(c:CanvasRenderingContext2D,themeId:string,w:number,h:number,t:number):void {
  const a=effectFor(themeId).atmosphere;
  const frame=(y:number,col:string|CanvasGradient,alpha:number,height:number)=>{
    c.save();c.globalAlpha=alpha;c.fillStyle=col;c.fillRect(0,y,w,height);c.restore();
  };
  c.save();
  if(['fogbank','harvest','snow-haze','whiteout','rain-haze','mist-rain','frost'].includes(a)){
    const bands=a==='fogbank'?4:a==='whiteout'?3:2;
    for(let i=0;i<bands;i++){
      const y=h*(.2+i*.22)+Math.sin(t*.24+i)*12;
      const grad=c.createLinearGradient(0,y-55,0,y+65);
      grad.addColorStop(0,'rgba(219,235,246,0)');
      grad.addColorStop(.5,a==='harvest'?'rgba(255,190,96,.14)':'rgba(207,230,240,.13)');
      grad.addColorStop(1,'rgba(219,235,246,0)');
      frame(y-55,grad,1,120);
    }
  }
  if(a==='aurora'||a==='nebula'||a==='moonlight'||a==='sunset'){
    const tint=a==='aurora'?'rgba(81,240,177,.12)':a==='nebula'?'rgba(125,92,233,.09)':a==='sunset'?'rgba(250,158,67,.12)':'rgba(145,184,245,.08)';
    for(let i=0;i<4;i++){
      c.strokeStyle=tint;c.lineWidth=14+i*6;c.beginPath();
      const y=h*(.08+i*.065);
      for(let k=0;k<=12;k++){const x=w*k/12,dy=Math.sin(t*.25+k*.55+i)*18;if(!k)c.moveTo(x,y+dy);else c.lineTo(x,y+dy);}
      c.stroke();
    }
  }
  if(a==='thunder'&&Math.sin(t*1.6)>.982)frame(0,'#d7e5ff',.16,h);
  if(a==='sunset'||a==='pollen-glow'||a==='twilight'||a==='romance'){
    const color=a==='twilight'?'rgba(170,207,98,.065)':a==='romance'?'rgba(255,110,172,.05)':'rgba(249,171,79,.085)';
    frame(h*.65,color,1,h*.35);
  }
  if(a==='fireworks' || a==='spring-party'){
    c.globalAlpha=.15;c.strokeStyle=a==='fireworks'?'#a7c8f7':'#f8c4dc';
    for(let i=0;i<3;i++){const x=w*(i+1)/4,y=h*(.12+i*.15);c.beginPath();c.arc(x,y,9+(t*18+i*13)%35,0,TAU);c.stroke();}
  }
  if(a.startsWith('advent-')){
    const count=Number(a.slice(-1));
    for(let i=0;i<count;i++){
      const x=w*.5+(i-(count-1)/2)*22;
      const y=h*.92;c.fillStyle='rgba(243,175,101,.10)';c.beginPath();c.arc(x,y,15+Math.sin(t*2+i)*4,0,TAU);c.fill();
    }
  }
  c.restore();
}

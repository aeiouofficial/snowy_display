import { resolveTheme } from './themes.ts';

export type MotifKind =
  | 'pine' | 'icicle' | 'aurora' | 'moon' | 'snowflake' | 'branch'
  | 'butterfly' | 'bird' | 'bee' | 'sun' | 'kite' | 'cloud'
  | 'acorn' | 'pumpkin' | 'lantern' | 'bat' | 'candle'
  | 'fairylight' | 'firework' | 'meteor' | 'lightning' | 'rainbow'
  | 'firefly' | 'flower' | 'mist' | 'star' | 'heart';
export interface SceneMotif {
  kind: MotifKind; x: number; y: number; size: number;
  angle: number; phase: number; variant: number;
}
/** Actual illustrated/animated scenery, independent of the precipitation renderer.
 * Virtual desktop coordinates are used for all screens, not per-monitor seeds.
 */
const FEATURES:Record<string,readonly MotifKind[]>={
  'winter-snow':['snowflake'],
  'winter-blizzard':['snowflake','cloud'],
  'winter-frost':['icicle','snowflake','moon'],
  'winter-northernlights':['aurora','moon'],
  'winter-forest':['pine','bird','snowflake'],
  'spring-petals':['branch','butterfly','flower'],
  'spring-rain':['cloud','flower'],
  'spring-pollen':['bee','branch','flower'],
  'spring-butterflies':['butterfly','flower','bird'],
  'spring-meadow':['bee','butterfly','flower'],
  'spring-rainbow':['rainbow','cloud','bird'],
  'summer-fireflies':['firefly','moon','pine'],
  'summer-showers':['cloud','flower'],
  'summer-stargaze':['meteor','moon','star'],
  'summer-bees':['bee','flower','sun'],
  'summer-kite':['kite','sun','cloud'],
  'summer-goldenhour':['sun','bird','cloud'],
  'autumn-leaves':['branch','acorn','bird'],
  'autumn-mist':['mist','acorn'],
  'autumn-harvest':['pumpkin','acorn','lantern'],
  'autumn-migration':['bird','cloud'],
  'halloween-bats':['bat','moon','pumpkin','lantern'],
  'halloween-embers':['lantern','mist','pumpkin'],
  'christmas-snow':['fairylight','snowflake'],
  'newyear-confetti':['firework','star','fairylight'],
  'ambient-embers':['lantern','star'],
  'ambient-cosmos':['meteor','moon','star'],
  'ambient-moonlight':['moon','star','cloud'],
  'weather-thunder':['cloud','lightning'],
  'weather-fog':['mist','cloud','pine'],
  'weather-drizzle':['cloud','mist'],
  'weather-windy':['kite','cloud','bird'],
  'event-easter':['flower','butterfly','sun'],
  'event-valentine':['heart','star','flower'],
};

export function sceneFeatures(id:string):readonly MotifKind[] {
  if(/^advent-[1-4]$/.test(id))return ['candle','star','fairylight'];
  return FEATURES[id]??FEATURES[resolveTheme(id).id]??['star'];
}

function seeded(v:number):number {
  const n=Math.sin(v*127.1+78.233)*43758.5453123;
  return n-Math.floor(n);
}
/** Stable animation: identical inputs produce identical world-space motific coordinates. */
export function sceneMotifs(
  themeId:string,width:number,height:number,time:number,density=1,
):SceneMotif[] {
  if(!(width>0&&height>0)||!Number.isFinite(time)||density<=0)return [];
  const id=resolveTheme(themeId).id;
  const motifs=sceneFeatures(id);
  const factor=Math.min(1,Math.max(0,density));
  const count=Math.max(1,Math.min(19,Math.round(4+Math.sqrt(width/160)*2.25)));
  const out:SceneMotif[]=[];
  const isAdvent=/^advent-[1-4]$/.test(id);
  if(isAdvent){
    const candles=Number(id.charAt(id.length-1));
    for(let i=0;i<candles;i++) {
      out.push({kind:'candle',x:width*.5+(i-(candles-1)/2)*33,
        y:height-27,size:22,angle:0,phase:time*3+i*.5,variant:i});
    }
  }
  // Restrained scenes: detail is peripheral, never a full opaque overlay.
  const extra=count*(motifs.length>2?1:1.15);
  const allowed=Math.floor(extra*factor);
  const countByKind=new Map<MotifKind,number>();
  const motifCaps:Partial<Record<MotifKind,number>>={
    rainbow:1,moon:1,sun:1,aurora:1,kite:1,firework:3,lightning:2,
  };
  for(let i=0;i<allowed;i++){
    const kind=motifs[(i*7+Math.floor(i/3))%motifs.length];
    if(isAdvent && kind==='candle')continue;
    if((countByKind.get(kind)||0)>=(motifCaps[kind]??99))continue;
    countByKind.set(kind,(countByKind.get(kind)||0)+1);
    const f=seeded(i+id.length*19),g=seeded(i*1.67+id.length*7);
    const widthPad=22;
    let x=widthPad+f*(width-widthPad*2);
    let y=17+g*(height-40);
    const phase=i*1.81+g*7;
    const size=kind==='pine'?28+f*22:
      kind==='rainbow'?48+f*40:
      kind==='sun'||kind==='moon'?25+f*12:
      kind==='firework'?27+f*22:
      kind==='cloud'?30+f*28:
      kind==='branch'?36+f*20:
      kind==='mist'||kind==='aurora'?55+f*36:
      kind==='kite'?17+f*10:9+f*16;
    if(['pine','flower','pumpkin','acorn','branch','lantern','icicle'].includes(kind))
      y=kind==='icicle'?8+g*22:height-12-g*25;
    if(['moon','sun','aurora','rainbow','fairylight','cloud'].includes(kind))
      y=12+g*height*.27;
    if(['bat','butterfly','bird','bee','kite','meteor','firefly','heart'].includes(kind)){
      // Airborne objects loop through the whole shared desktop at a slow rate.
      x=(x+time*(kind==='bat'?19:kind==='bird'?11:kind==='meteor'?24:7))%(width+50)-25;
      y+=Math.sin(time*(kind==='butterfly'?3.7:1.4)+phase)*11;
    }
    if(kind==='firework')y=height*.22+g*height*.3;
    if(kind==='lightning')y=14+g*height*.24;
    x=Math.max(-40,Math.min(width+40,x));
    out.push({kind,x,y,size,angle:Math.sin(time*.8+phase)*.2,phase:time+phase,variant:i%4});
  }
  return out;
}

/** Reproducible simulation-only performance profile; GPU rendering not measured. */
import { performance } from 'node:perf_hooks';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SnowEngine, type Surface } from '../src/physics.ts';
import { PERFORMANCE, type PerformanceMode } from '../src/desktop-world.ts';

const WINCOUNT = 42, WIDTH = 4096, HEIGHT = 1080;
function surfaces(): Surface[] {
  return Array.from({length:WINCOUNT},(_,i)=>({
    id:`win-${i}`, x:(i*171)%3800,y:55+(i*73)%670,
    width:270+(i%5)*80,height:170+(i%4)*50,z:i,
  }));
}
const windows=surfaces();
const samples:Record<PerformanceMode,{p50ms:number;p95ms:number;averageMs:number;particles:number;windows:number;frames:number}> = {} as any;
for(const mode of ['eco','balanced','high'] as PerformanceMode[]) {
  const engine=new SnowEngine(WIDTH,HEIGHT,0x5e78);
  engine.setParticleLimit(PERFORMANCE[mode].particles);
  engine.setSurfaces(windows,0);
  // Warm-up each mode before timing; clamp outliers from cold JIT.
  for(let frame=0;frame<25;frame++)engine.step(1/PERFORMANCE[mode].fps);
  const times:number[]=[];
  for(let frame=0;frame<240;frame++) {
    const t0=performance.now();
    if(frame%8===0)engine.setSurfaces(windows,frame/24);
    engine.step(1/PERFORMANCE[mode].fps);
    if(frame%3===0)engine.snapshot();
    times.push(performance.now()-t0);
  }
  times.sort((a,b)=>a-b);
  samples[mode]={
    p50ms:Number(times[Math.floor(times.length*.5)].toFixed(3)),
    p95ms:Number(times[Math.floor(times.length*.95)].toFixed(3)),
    averageMs:Number((times.reduce((a,b)=>a+b,0)/times.length).toFixed(3)),
    particles:engine.snapshot().flakes.length,windows:WINCOUNT,frames:times.length,
  };
}
const output={date:new Date().toISOString(),notes:'Node simulation + periodic snapshot only; excludes WebView drawing, OS polling, IPC and GPU costs',samples};
writeFileSync(join(process.cwd(),'.tmp','physics_benchmark.json'),JSON.stringify(output,null,2));
console.log(JSON.stringify(output));

/** Screen coordinates are in CSS pixels; higher z means closer to the user. */
export interface Surface { id: string; x: number; y: number; width: number; height: number; z: number; hidden?: boolean; noAccumulation?: boolean }
export interface Settings { snowfall: number; wind: number; gravity: number; cohesion: number; maxDepth: number }
export interface Particle { x: number; y: number; vx: number; vy: number; radius: number; opacity: number; mass: number }
export interface Pile { surface: Surface; bins: number[]; exposed?: boolean[] }
export interface PlowVehicle {surfaceId:string;x:number;y:number;direction:1|-1;phase:number;size:number}
export interface SnowImprint {x:number;y:number;surfaceId:string;type:'footprint'|'push';at:number;radius:number}
export interface SpellPulse {x:number;y:number;type:'gust'|'vortex'|'freeze'|'melt';at:number;radius:number}
interface InternalPile { surface: Surface; bins: Float32Array; lastSeen: number }
export const DEFAULT_SETTINGS: Settings = { snowfall: 0.67, wind: 0.2, gravity: 1, cohesion: 0.48, maxDepth: 34 };
import { resolveTheme, type ParticleKind } from './themes.ts';
import { normalizeTool, type InteractionTool } from './interactions.ts';
const CELL = 7;
const MAX_FLAKES = 1250;
const MAX_CLUMPS = 220;
const finite = (n: number) => Number.isFinite(n);
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

/** Computes shortest distance squared and closest point from point P to line segment AB */
function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): { distSq: number; qx: number; qy: number; t: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  if (l2 < 0.001) {
    const rx = px - x1;
    const ry = py - y1;
    return { distSq: rx * rx + ry * ry, qx: x1, qy: y1, t: 0 };
  }
  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = clamp(t, 0, 1);
  const qx = x1 + t * dx;
  const qy = y1 + t * dy;
  const rx = px - qx;
  const ry = py - qy;
  return { distSq: rx * rx + ry * ry, qx, qy, t };
}

export class SnowEngine {
  private randomState: number;
  private particleMode: ParticleKind = 'snow';
  private themeDensity = 1;
  private particleLimit = MAX_FLAKES;
  private flakes: Particle[] = [];
  private clumps: Particle[] = [];
  private piles = new Map<string, InternalPile>();
  private surfaces: Surface[] = [];
  /** Sorted and merged top-edge occlusion intervals, recomputed only on geometry polls. */
  private coveredBy = new Map<string, readonly {left:number;right:number}[]>();
  private spawnRemainder = 0;
  private time = 0;
  private imprints:SnowImprint[]=[];
  private pulses:SpellPulse[]=[];
  private frozenUntil=0;
  private vehicles:PlowVehicle[]=[];
  private autoPlows=false;
  private plowInterval=20;
  private lastPlowTime=0;
  private footprintParity=0;
  private previousSurfaceUpdate = 0;
  private mouseX = -9999;
  private mouseY = -9999;
  private prevMouseX = -9999;
  private prevMouseY = -9999;
  private mouseVx = 0;
  private mouseVy = 0;
  private lastMouseTime = 0;
  private mouseActive = false;
  public settings: Settings = { ...DEFAULT_SETTINGS };
  public width: number;
  public height: number;
  constructor(width: number, height: number, seed = 0x51f15) {
    this.width = width; this.height = height;
    this.randomState = (seed >>> 0) || 1;
  }
  setTheme(id: string): void {
    const t=resolveTheme(id);
    if(this.particleMode===t.particle && this.themeDensity===t.intensity) return;
    this.particleMode=t.particle;
    this.themeDensity=t.intensity;
    this.imprints=[];
    this.pulses=[];
    this.vehicles=[];
    this.frozenUntil=0;
    for(const pile of this.piles.values()) pile.bins.fill(0);
  }
  configureActors(options:{autoPlows:boolean;plowInterval:number}):void {
    const enable=options.autoPlows===true;
    if(!enable)this.vehicles=[];
    if(enable&&!this.autoPlows)this.lastPlowTime=this.time;
    this.autoPlows=enable;
    this.plowInterval=clamp(Number.isFinite(options.plowInterval)?options.plowInterval:20,7,180);
  }
  setParticleLimit(count: number): void {
    this.particleLimit=clamp(Math.floor(count),16,MAX_FLAKES);
    if(this.flakes.length>this.particleLimit) this.flakes.length=this.particleLimit;
  }
  private rand(): number {
    let t = this.randomState += 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  resize(width: number, height: number): void {
    if (finite(width) && finite(height) && width > 0 && height > 0) { this.width = width; this.height = height; }
  }
  configure(next: Partial<Settings>): void {
    const merged = { ...this.settings, ...next };
    for (const [key, low, high] of [
      ['snowfall', 0, 1], ['wind', -1, 1], ['gravity', 0.2, 3],
      ['cohesion', 0, 1], ['maxDepth', 3, 120],
    ] as const) {
      const v = merged[key];
      if (!finite(v)) throw new RangeError(`Invalid ${key}`);
      merged[key] = clamp(v, low, high);
    }
    this.settings = merged;
  }
  /** Supply ALL visible windows, front-to-back or in any order, with stable IDs. */
  setSurfaces(surfaces: Surface[], atSeconds = this.time): void {
    const clean = surfaces.filter(s => !s.hidden && s.id && [s.x, s.y, s.width, s.height, s.z].every(finite) && s.width > 1 && s.height > 0);
    const ordered = [...clean].sort((a, b) => b.z - a.z);
    // Maximized windows with top y <= 6 still OCCLUDE every window behind
    // them; only their own top bezel is ineligible for snow deposits.
    const eligible = ordered.filter(s => s.y > 6 && !s.noAccumulation);
    const stepSeconds = Math.max(0.05, Math.min(2, atSeconds - this.previousSurfaceUpdate));
    for (const s of eligible) {
      const old = this.piles.get(s.id);
      const targetCount = Math.max(1, Math.ceil(s.width / CELL));
      if (!old) {
        this.piles.set(s.id, { surface: s, bins: new Float32Array(targetCount), lastSeen: atSeconds });
        continue;
      }
      const dx = s.x - old.surface.x;
      const dy = s.y - old.surface.y;
      if (Math.abs(dx) > 10 || Math.abs(dy) > 14) {
        const shear = clamp(Math.hypot(dx, dy) / (Math.max(50, stepSeconds * 600)) * (1.3 - this.settings.cohesion), 0, 0.88);
        if (shear > 0.015) this.shed(old, shear, dx / stepSeconds);
      }
      if (old.bins.length !== targetCount) {
        const resized = new Float32Array(targetCount);
        for (let i = 0; i < targetCount; i++) {
          resized[i] = old.bins[Math.min(old.bins.length - 1, Math.floor(i * old.bins.length / targetCount))];
        }
        old.bins = resized;
      }
      old.surface = s;
      old.lastSeen = atSeconds;
    }
    const ids = new Set(eligible.map(s => s.id));
    for (const [id, pile] of this.piles) {
      if (!ids.has(id)) {
        // A window can disappear because it closed, minimized, became
        // temporarily unobservable or maximized to the bezel. None of these
        // transitions creates physical falling snow on other applications.
        this.piles.delete(id);
        this.imprints=this.imprints.filter(stamp=>stamp.surfaceId!==id);
      }
    }
    this.surfaces = ordered;
    this.vehicles=this.vehicles.filter(vehicle=>this.piles.has(vehicle.surfaceId));
    this.coveredBy.clear();
    for(const surface of ordered) {
      const intervals=ordered.filter(upper=>upper.z>surface.z &&
        upper.y<=surface.y && upper.y+upper.height>surface.y &&
        upper.x<surface.x+surface.width && upper.x+upper.width>surface.x)
        .map(upper=>({left:Math.max(surface.x,upper.x),
                     right:Math.min(surface.x+surface.width,upper.x+upper.width)}))
        .sort((a,b)=>a.left-b.left);
      const merged:{left:number;right:number}[]=[];
      for(const interval of intervals){
        const last=merged[merged.length-1];
        if(last&&interval.left<=last.right)last.right=Math.max(last.right,interval.right);
        else merged.push({...interval});
      }
      this.coveredBy.set(surface.id,merged);
    }
    // Covered regions retain their previous snow without receiving new mass;
    // drawing masks them until exposed again. Occlusion itself cannot shed snow.
    this.previousSurfaceUpdate = atSeconds;
  }
  /** Is this coordinate on the exposed top of this surface? */
  isExposed(surface: Surface, x: number): boolean {
    if (x < surface.x || x >= surface.x + surface.width) return false;
    const intervals=this.coveredBy.get(surface.id);
    if(!intervals)return !this.surfaces.some(other => other.z>surface.z &&
      x>=other.x&&x<other.x+other.width&&
      other.y<=surface.y&&other.y+other.height>surface.y);
    let lo=0,hi=intervals.length-1;
    while(lo<=hi){
      const mid=(lo+hi)>>1,span=intervals[mid];
      if(x<span.left)hi=mid-1;
      else if(x>=span.right)lo=mid+1;
      else return false;
    }
    return true;
  }
  private flake(): Particle {
    const upward=this.particleMode==='embers'||this.particleMode==='fireflies';
    const radius = this.particleMode==='rain' ? 0.6+this.rand()*0.65 :
      this.particleMode==='snow' ? 0.65+this.rand()*2.15 : 1.2+this.rand()*3.4;
    const windSpan = this.settings.wind * Math.max(120, this.height * 0.75);
    const minX = windSpan > 0 ? -windSpan - 16 : -16;
    const maxX = windSpan < 0 ? this.width - windSpan + 16 : this.width + 16;
    const span = maxX - minX;
    return { x: minX + this.rand() * span,
      y: upward ? this.height + 8 + this.rand()*45 : -8 - this.rand()*55,
      vx: this.rand() * 18 - 9,
      vy: upward ? -22-this.rand()*31 : this.particleMode==='rain' ? 180+this.rand()*125 : 21+this.rand()*34,
      radius,
      opacity: 0.45 + this.rand() * 0.5, mass: 0.4 + radius * 0.25 };
  }
  /** Add snow mass to a bin; used by deterministic integration tests too. */
  deposit(id: string, x: number, mass: number): boolean {
    const pile = this.piles.get(id);
    if (!pile || !finite(mass) || mass <= 0 || !this.isExposed(pile.surface, x)) return false;
    const i = clamp(Math.floor((x - pile.surface.x) / CELL), 0, pile.bins.length - 1);
    const radius = pile.bins.length;
    const addVisible = (bin: number, amount: number) => {
      const binX = pile.surface.x + Math.min(pile.surface.width - 0.5, (bin + 0.5) * CELL);
      if (this.isExposed(pile.surface, binX)) {
        pile.bins[bin] = Math.min(this.settings.maxDepth, pile.bins[bin] + amount);
      }
    };
    addVisible(i, mass * 0.58);
    if (i > 0) addVisible(i - 1, mass * 0.13);
    if (i + 1 < radius) addVisible(i + 1, mass * 0.13);
    return true;
  }
  /**
   * Footprint/push footprints displace real heightfield mass, respecting visible
   * target bins and maximum depth. Melt is the only tool that destroys mass.
   * Pointer gestures target exposed pile edges, never covered window interiors.
   */
  applyTool(raw:InteractionTool,x:number,y:number,atSeconds=this.time):boolean {
    const tool=normalizeTool(raw);
    if(tool==='none'||!finite(x)||!finite(y)||!finite(atSeconds))return false;
    const snow=this.particleMode==='snow';
    if(!snow && (tool==='footprint'||tool==='push'||tool==='freeze'||tool==='melt'))return false;
    if(tool==='gust'||tool==='vortex') {
      const range=tool==='gust'?155:190;
      for(const p of [...this.flakes,...this.clumps]) {
        const dx=p.x-x,dy=p.y-y,dist=Math.hypot(dx,dy);
        if(dist>range)continue;
        const attenuation=Math.max(0,1-dist/range);
        if(tool==='gust') {
          p.vx=clamp(p.vx+attenuation*160,-450,450);
          p.vy=clamp(p.vy-attenuation*72,-320,440);
        } else {
          const d=Math.max(1,dist);
          p.vx=clamp(p.vx-dy/d*attenuation*160,-450,450);
          p.vy=clamp(p.vy+dx/d*attenuation*160,-320,440);
        }
      }
      this.addPulse({x,y,type:tool,at:this.time,radius:range});
      return true;
    }
    let changed=false;
    for(const pile of this.piles.values()) {
      const s=pile.surface;
      if(y<s.y-Math.max(24,this.settings.maxDepth+10)||y>s.y+20 ||
         x<s.x-20||x>s.x+s.width+20)continue;
      const center=clamp(Math.floor((x-s.x)/CELL),0,pile.bins.length-1);
      const range=tool==='freeze'?11:tool==='melt'?7:3;
      for(let i=Math.max(0,center-range);i<=Math.min(pile.bins.length-1,center+range);i++) {
        const binX=s.x+(i+.5)*CELL;
        if(!this.isExposed(s,binX))continue;
        const old=pile.bins[i];
        if(old<=.08)continue;
        if(tool==='melt') {
          const weight=1-Math.abs(center-i)/(range+1);
          pile.bins[i]=Math.max(0,old-weight*2.8);
          changed=true;
        } else if(tool==='footprint'||tool==='push') {
          const fromCenter=Math.abs(i-center);
          if(fromCenter>1 && tool==='footprint')continue;
          const fraction=tool==='footprint'?.72:.44;
          let remaining=old*fraction;
          const targets=tool==='footprint'
            ? [i-3,i+3,i-4,i+4]
            : [i+3,i+4,i+2];
          for(const target of targets) {
            if(target<0||target>=pile.bins.length)continue;
            const tx=s.x+Math.min(s.width-.5,(target+.5)*CELL);
            if(!this.isExposed(s,tx))continue;
            const capacity=Math.max(0,this.settings.maxDepth-pile.bins[target]);
            const moved=Math.min(remaining,capacity);
            pile.bins[target]+=moved;
            pile.bins[i]-=moved;
            remaining-=moved;
            if(remaining<=.0001)break;
          }
          if(remaining<old*fraction-.02)changed=true;
        } else if(tool==='freeze')changed=true;
      }
      if(changed && (tool==='footprint'||tool==='push')) {
        if(this.imprints.length>=160)this.imprints.shift();
        const side=tool==='footprint'?(this.footprintParity++%2===0?-1:1):0;
        this.imprints.push({x:x+side*5,y:s.y-4,surfaceId:s.id,
          type:tool,at:this.time,radius:tool==='footprint'?9:13});
      }
    }
    if(changed && tool==='freeze')this.frozenUntil=Math.max(this.frozenUntil,this.time+3);
    if(changed && (tool==='melt'||tool==='freeze'))this.addPulse({x,y,type:tool,at:this.time,radius:tool==='melt'?75:120});
    return changed;
  }
  private addPulse(pulse:SpellPulse):void {
    if(this.pulses.length>=40)this.pulses.shift();
    this.pulses.push(pulse);
  }
  private releaseBin(pile: InternalPile, i: number, fraction: number, velocity: number): void {
    const amount = pile.bins[i] * fraction;
    if (amount < 0.08) return;
    pile.bins[i] -= amount;
    if (this.clumps.length >= MAX_CLUMPS) return;
    this.clumps.push({ x: pile.surface.x + i * CELL + CELL / 2,
      y: pile.surface.y - pile.bins[i], vx: clamp(velocity * 0.36, -190, 190) + (this.rand() - 0.5) * 25,
      vy: 10 + this.rand() * 28, radius: clamp(Math.sqrt(amount) * 1.65, 1.2, 9),
      opacity: 0.92, mass: amount * 0.78 });
  }
  private shed(pile: InternalPile, fraction: number, velocity: number): void {
    for (let i = 0; i < pile.bins.length; i++) this.releaseBin(pile, i, fraction, velocity);
  }
  private hit(fromX: number, fromY: number, toX: number, toY: number): { pile: InternalPile; impactX: number } | null {
    let candidate: { pile: InternalPile; impactX: number } | null = null;
    let highest = Infinity;
    for (const s of this.surfaces) {
      const pile = this.piles.get(s.id);
      if (!pile) continue;
      const dy = toY - fromY;
      const t = dy > 0.0001 ? clamp((s.y - fromY) / dy, 0, 1) : 1;
      const x = fromX + t * (toX - fromX);
      if (x < s.x || x >= s.x + s.width || !this.isExposed(s, x)) continue;
      const i = clamp(Math.floor((x - s.x) / CELL), 0, pile.bins.length - 1);
      const topY = s.y - pile.bins[i];
      if (fromY <= topY && toY >= topY && topY < highest) {
        candidate = { pile, impactX: x };
        highest = topY;
      }
    }
    return candidate;
  }
  private updateParticles(array: Particle[], dt: number, clump: boolean): void {
    const wind = this.settings.wind * 60 + Math.sin(this.time * 0.58) * 17 + Math.sin(this.time * 1.9) * 8;
    const windSpan = Math.abs(this.settings.wind) * Math.max(120, this.height * 0.75);
    // Only the upwind side is extended: flakes there are still drifting onto the screen.
    const minBound = this.settings.wind > 0 ? -windSpan - 45 : -45;
    const maxBound = this.settings.wind < 0 ? this.width + windSpan + 45 : this.width + 45;
    for (let i = array.length - 1; i >= 0; i--) {
      const p = array[i];
      const fromX = p.x;
      const fromY = p.y;
      const turbulence = Math.sin(this.time * 1.7 + p.x * 0.023 + p.y * 0.015) * 8;
      if (!clump && this.particleMode!=='snow') {
        const kind=this.particleMode;
        const flutter=(kind==='leaves'||kind==='petals'||kind==='bats') ? 42 : 9;
        const targetVx=wind*0.45+Math.sin(this.time*2.3+p.y*.024+p.x*.01)*flutter;
        p.vx+=(targetVx-p.vx)*Math.min(1,dt*1.5);
        if(kind==='embers'||kind==='fireflies') p.vy=Math.max(-85,p.vy-8*dt);
        else if(kind==='rain') p.vy=Math.min(420,p.vy+40*dt);
        else p.vy=Math.min(120,p.vy+(kind==='stars'?3:11)*dt*this.settings.gravity);
      } else {
        p.vx += ((wind + turbulence - p.vx) * (clump ? 0.23 : 0.75)) * dt;
        p.vy += (clump ? 420 : 14) * this.settings.gravity * dt;
        p.vy = Math.min(p.vy, clump ? 430 : 90 * this.settings.gravity);
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < minBound || p.x > maxBound || p.y > this.height + 55 || p.y < -70) { array.splice(i, 1); continue; }
      const impact = (this.particleMode==='snow'||clump) ? this.hit(fromX, fromY, p.x, p.y):null;
      if (impact) {
        if (clump && (p.mass > 1.3 || p.vy > 90) && this.flakes.length < MAX_FLAKES - 4) {
          // Hard clump impact: deposit bulk mass, splatter secondary micro-flakes
          this.deposit(impact.pile.surface.id, impact.impactX, p.mass * 0.74);
          const splatters = Math.min(3, Math.max(1, Math.floor(p.mass * 1.4)));
          for (let k = 0; k < splatters; k++) {
            const spread = (this.rand() - 0.5) * 45;
            this.flakes.push({
              x: clamp(impact.impactX + (this.rand() - 0.5) * 5, 0, this.width),
              y: impact.pile.surface.y - 1.5,
              vx: spread + wind * 0.2,
              vy: -12 - this.rand() * 18,
              radius: 0.8 + this.rand() * 0.7,
              opacity: 0.78,
              mass: 0.08,
            });
          }
        } else {
          this.deposit(impact.pile.surface.id, impact.impactX, p.mass);
        }
        array.splice(i, 1);
      }
    }
  }
  private settle(dt: number): void {
    const repose = 1.1 + this.settings.cohesion * 3.8;
    const criticalSlab = this.settings.maxDepth * (0.7 + this.settings.cohesion * 0.3);
    for (const pile of this.piles.values()) {
      const b = pile.bins;
      for (let i = 0; i < b.length; i++) {
        if (!this.isExposed(pile.surface, pile.surface.x + i * CELL + CELL / 2)) continue;
        if (i + 1 < b.length && this.isExposed(pile.surface,
          pile.surface.x + Math.min(pile.surface.width - 0.5, (i + 1.5) * CELL))) {
          const diff = b[i] - b[i + 1];
          if (Math.abs(diff) > repose) {
            const amount = Math.min(Math.abs(diff) * 0.5, Math.max(0, Math.abs(diff) - repose) * dt * 3.8);
            if (diff > 0) { b[i] -= amount; b[i + 1] += amount; }
            else { b[i] += amount; b[i + 1] -= amount; }
          }
        }
        if ((i === 0 || i === b.length - 1) && b[i] > repose * 1.3) {
          const amount = Math.min(b[i] * dt * 0.7, 2.8 * dt);
          b[i] -= amount;
          if (this.clumps.length < MAX_CLUMPS && amount > 0.01) this.clumps.push({
            x: pile.surface.x + i * CELL + CELL / 2, y: pile.surface.y - b[i],
            vx: (i === 0 ? -1 : 1) * (35 + this.rand() * 35), vy: 8,
            radius: 1.3 + amount, opacity: 0.95, mass: amount,
          });
        }
        if (b[i] > criticalSlab && this.clumps.length < MAX_CLUMPS && this.rand() < dt * 0.3) {
          const slab = Math.min(b[i] * 0.28, 3.2);
          b[i] -= slab;
          this.clumps.push({
            x: pile.surface.x + i * CELL + CELL / 2,
            y: pile.surface.y - b[i],
            vx: (this.rand() - 0.5) * 36,
            vy: 12 + this.rand() * 16,
            radius: clamp(Math.sqrt(slab) * 1.6, 1.2, 7),
            opacity: 0.94,
            mass: slab * 0.75,
          });
        }
      }
    }
  }
  /** Tiny automated snowplow follows an exposed ledge and conserves snow mass. */
  private advancePlows(dt:number):void {
    if(!this.autoPlows||this.particleMode!=='snow'){
      this.vehicles=[];return;
    }
    if(!this.vehicles.length&&this.time-this.lastPlowTime>=this.plowInterval){
      const pile=[...this.piles.values()].filter(p=>p.surface.width>=170 &&
        p.surface.y>15 && p.bins.some((v,i)=>v>.25 &&
          this.isExposed(p.surface,p.surface.x+Math.min(p.surface.width-.5,(i+.5)*CELL))))
        .sort((a,b)=>b.surface.width-a.surface.width)[0];
      this.lastPlowTime=this.time;
      if(pile)this.vehicles=[{surfaceId:pile.surface.id,x:pile.surface.x-18,
        y:pile.surface.y-13,direction:1,phase:0,size:26}];
    }
    for(const vehicle of this.vehicles){
      const pile=this.piles.get(vehicle.surfaceId);
      if(!pile)continue;
      vehicle.x+=35*dt*vehicle.direction;
      vehicle.y=pile.surface.y-13;
      vehicle.phase+=dt*8;
      const i=Math.floor((vehicle.x+vehicle.size*.6-pile.surface.x)/CELL);
      if(i<0||i>=pile.bins.length)continue;
      const at=pile.surface.x+Math.min(pile.surface.width-.5,(i+.5)*CELL);
      if(!this.isExposed(pile.surface,at))continue;
      const available=pile.bins[i]*Math.min(1,dt*3.6);
      if(available<=.002)continue;
      let remainder=available;
      for(const next of [i+3,i+4,i+5,i+6]){
        if(next>=pile.bins.length)break;
        const dest=pile.surface.x+Math.min(pile.surface.width-.5,(next+.5)*CELL);
        if(!this.isExposed(pile.surface,dest))continue;
        const transferred=Math.min(remainder,Math.max(0,this.settings.maxDepth-pile.bins[next]));
        pile.bins[next]+=transferred;
        pile.bins[i]-=transferred;
        remainder-=transferred;
        if(remainder<=.0001)break;
      }
    }
    this.vehicles=this.vehicles.filter(v=>{
      const p=this.piles.get(v.surfaceId);
      return p&&v.x<=p.surface.x+p.surface.width+v.size;
    });
  }
  step(dtSeconds: number): void {
    if (!finite(dtSeconds) || dtSeconds <= 0) return;
    const dt = Math.min(1 / 30, dtSeconds);
    this.time += dt;
    if(this.imprints.length)this.imprints=this.imprints.filter(v=>this.time-v.at<48 && this.piles.has(v.surfaceId));
    if(this.pulses.length)this.pulses=this.pulses.filter(v=>this.time-v.at<1.25);
    const windSpan = Math.abs(this.settings.wind) * Math.max(120, this.height * 0.75);
    const rate = this.settings.snowfall * (16 + (this.width + windSpan) / 4.5)
      * (this.particleMode==='snow'?1:this.themeDensity);
    this.spawnRemainder += rate * dt;
    while (this.spawnRemainder >= 1) {
      this.spawnRemainder--;
      if (this.flakes.length < this.particleLimit) this.flakes.push(this.flake());
    }
    this.updateParticles(this.flakes, dt, false);
    this.updateParticles(this.clumps, dt, true);
    this.applyContinuousMouse(dt);
    if(this.particleMode==='snow' && this.time>=this.frozenUntil)this.settle(dt);
    this.advancePlows(dt);
  }
  snapshot(): { flakes: readonly Particle[]; clumps: readonly Particle[]; piles: Pile[];
    surfaces: readonly Surface[]; imprints: readonly SnowImprint[]; pulses: readonly SpellPulse[];
    frozenUntil:number; time:number; vehicles:readonly PlowVehicle[] } {
    return { flakes: this.flakes, clumps: this.clumps, surfaces: this.surfaces,
      imprints:this.imprints,pulses:this.pulses,frozenUntil:this.frozenUntil,time:this.time,
      vehicles:this.vehicles,
      piles: Array.from(this.piles.values(), p => ({
        surface:p.surface,bins:Array.from(p.bins),
        exposed:Array.from(p.bins,(_,i)=>this.isExposed(p.surface,
          p.surface.x+Math.min(p.surface.width-.5,(i+.5)*CELL))),
      })) };
  }
  /** Persistent aerodynamic deflector and physical obstacle applied every frame (moving or stationary) */
  private applyContinuousMouse(dt: number): void {
    if (!this.mouseActive) return;
    if (this.mouseX < -80 || this.mouseX > this.width + 80 || this.mouseY < -80 || this.mouseY > this.height + 80) return;

    // Smoothly decay velocity when mouse halts
    const decay = Math.exp(-dt * 5.0);
    this.mouseVx *= decay;
    this.mouseVy *= decay;

    const speed = Math.hypot(this.mouseVx, this.mouseVy);
    // Tight radius matching the actual Windows cursor arrow (11px base, max 18px at high speed)
    const radius = Math.min(18, 11 + speed * 0.012);
    const radiusSq = radius * radius;
    const mX = this.mouseX;
    const mY = this.mouseY;

    // 1. Gentle aerodynamic deflection & slipstream parting for falling flakes
    for (const flake of this.flakes) {
      const dx = flake.x - mX;
      const dy = flake.y - mY;
      const dSq = dx * dx + dy * dy;
      if (dSq < radiusSq && dSq > 0.001) {
        const dist = Math.sqrt(dSq);
        const norm = 1 - dist / radius;

        // Subtle radial nudge away from cursor tip
        const push = norm * 35 * dt;
        flake.vx += (dx / dist) * push;
        flake.vy += (dy / dist) * push;

        // Gentle parting: flakes right on the pointer tip flutter laterally
        if (dy < 6 && flake.vy > 0) {
          const lateralSign = dx >= 0 ? 1 : -1;
          flake.vx += lateralSign * norm * 30 * dt;
          flake.vy *= Math.max(0.65, 1 - norm * 0.4 * dt);
        }

        // Very subtle velocity wake
        if (speed > 10) {
          flake.vx += this.mouseVx * norm * 0.12 * dt * 30;
          flake.vy += this.mouseVy * norm * 0.12 * dt * 30;
        }
      }
    }

    // 2. Subtle deflection for clumps
    for (const clump of this.clumps) {
      const dx = clump.x - mX;
      const dy = clump.y - mY;
      const dSq = dx * dx + dy * dy;
      if (dSq < radiusSq * 0.8 && dSq > 0.001) {
        const dist = Math.sqrt(dSq);
        const norm = 1 - dist / radius;
        clump.vx += (dx / dist) * norm * 25 * dt;
        clump.vy += (dy / dist) * norm * 25 * dt;
      }
    }

    // 3. Stationary cursor lightly settles on touching snow piles
    for (const pile of this.piles.values()) {
      const s = pile.surface;
      if (mX >= s.x - 4 && mX <= s.x + s.width + 4 && Math.abs(mY - s.y) < 10) {
        const centerBin = Math.floor((mX - s.x) / CELL);
        const hoverRadius = 1;
        for (let b = Math.max(0, centerBin - hoverRadius); b <= Math.min(pile.bins.length - 1, centerBin + hoverRadius); b++) {
          const binX = s.x + (b + 0.5) * CELL;
          const dist = Math.abs(mX - binX);
          if (dist < radius && this.isExposed(s, binX)) {
            const indent = (1 - dist / radius) * 0.6 * dt;
            pile.bins[b] = Math.max(0, pile.bins[b] - indent);
          }
        }
      }
    }
  }
  /** Swept continuous mouse interaction: gentle deflection strictly along the cursor path */
  interactMouse(mouseX: number, mouseY: number, atSeconds = this.time): void {
    if (!finite(mouseX) || !finite(mouseY)) return;

    const dt = Math.max(0.008, Math.min(0.1, atSeconds - this.lastMouseTime));
    const prevX = this.prevMouseX > -9000 ? this.prevMouseX : mouseX;
    const prevY = this.prevMouseY > -9000 ? this.prevMouseY : mouseY;

    const instantVx = (mouseX - prevX) / dt;
    const instantVy = (mouseY - prevY) / dt;
    this.mouseVx = this.mouseVx * 0.35 + instantVx * 0.65;
    this.mouseVy = this.mouseVy * 0.35 + instantVy * 0.65;

    this.prevMouseX = this.mouseX > -9000 ? this.mouseX : mouseX;
    this.prevMouseY = this.mouseY > -9000 ? this.mouseY : mouseY;
    this.mouseX = mouseX;
    this.mouseY = mouseY;
    this.lastMouseTime = atSeconds;
    this.mouseActive = true;

    const x1 = prevX;
    const y1 = prevY;
    const x2 = mouseX;
    const y2 = mouseY;

    const speed = Math.hypot(this.mouseVx, this.mouseVy);
    // Subtle, tight radius matching the pointer body (12px base, max 20px)
    const radius = Math.min(20, 12 + speed * 0.012);
    const radiusSq = radius * radius;

    const minX = Math.min(x1, x2) - radius;
    const maxX = Math.max(x1, x2) + radius;
    const minY = Math.min(y1, y2) - radius;
    const maxY = Math.max(y1, y2) + radius;

    // 1. Swept gentle deflection for falling flakes
    for (const flake of this.flakes) {
      if (flake.x < minX || flake.x > maxX || flake.y < minY || flake.y > maxY) continue;
      const { distSq, qx, qy } = distToSegment(flake.x, flake.y, x1, y1, x2, y2);
      if (distSq < radiusSq) {
        const dist = Math.max(0.001, Math.sqrt(distSq));
        const norm = 1 - dist / radius;
        // Natural, gentle push impulse
        const pushMag = norm * (24 + Math.min(speed * 0.08, 38));

        const nx = (flake.x - qx) / dist;
        const ny = (flake.y - qy) / dist;

        flake.vx += nx * pushMag + this.mouseVx * norm * 0.15;
        flake.vy += ny * pushMag + this.mouseVy * norm * 0.15;

        // Subtle micro-swirl
        const swirl = (this.mouseVx * (-ny) + this.mouseVy * nx) * 0.06;
        flake.vx += -ny * swirl;
        flake.vy += nx * swirl;
      }
    }

    // 2. Swept gentle deflection for clumps
    for (const clump of this.clumps) {
      if (clump.x < minX || clump.x > maxX || clump.y < minY || clump.y > maxY) continue;
      const { distSq, qx, qy } = distToSegment(clump.x, clump.y, x1, y1, x2, y2);
      if (distSq < radiusSq * 0.8) {
        const dist = Math.max(0.001, Math.sqrt(distSq));
        const norm = 1 - dist / radius;
        const nx = (clump.x - qx) / dist;
        const ny = (clump.y - qy) / dist;
        clump.vx += nx * norm * 20 + this.mouseVx * 0.1;
        clump.vy += ny * norm * 20 + this.mouseVy * 0.1;
      }
    }

    // 3. Precise snow pile carving strictly when cursor tip touches the pile
    for (const pile of this.piles.values()) {
      const s = pile.surface;
      if (minY <= s.y + 12 && maxY >= s.y - 12) {
        const spanMinX = Math.max(s.x, minX);
        const spanMaxX = Math.min(s.x + s.width, maxX);
        if (spanMinX <= spanMaxX) {
          const bStart = clamp(Math.floor((spanMinX - s.x) / CELL), 0, pile.bins.length - 1);
          const bEnd = clamp(Math.ceil((spanMaxX - s.x) / CELL), 0, pile.bins.length - 1);
          for (let b = bStart; b <= bEnd; b++) {
            const binX = s.x + (b + 0.5) * CELL;
            const binY = s.y - pile.bins[b] * 0.5;
            const { distSq } = distToSegment(binX, binY, x1, y1, x2, y2);
            if (distSq < radiusSq && this.isExposed(s, binX)) {
              const dist = Math.sqrt(distSq);
              const currentDepth = pile.bins[b];
              if (currentDepth > 0.08) {
                const norm = 1 - dist / radius;
                const removeFraction = Math.min(0.5, norm * 0.35 * (1.2 - this.settings.cohesion));
                const removedMass = currentDepth * removeFraction;
                if (removedMass > 0.08) {
                  pile.bins[b] = Math.max(0, currentDepth - removedMass);
                  if (this.clumps.length < MAX_CLUMPS) {
                    this.clumps.push({
                      x: binX,
                      y: s.y - currentDepth * 0.8,
                      vx: this.mouseVx * 0.15 + (this.rand() * 20 - 10),
                      vy: Math.min(-6, this.mouseVy * 0.15) - this.rand() * 14,
                      radius: clamp(Math.sqrt(removedMass) * 1.3, 1.1, 4),
                      opacity: 0.88,
                      mass: removedMass,
                    });
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  clear(): void {
    this.vehicles=[];
    this.lastPlowTime=this.time;
    this.imprints=[];
    this.pulses=[];
    this.frozenUntil=0;
    this.flakes = [];
    this.clumps = [];
    this.piles.clear();
    this.coveredBy.clear();
    this.surfaces = [];
    this.spawnRemainder = 0;
    this.prevMouseX = -9999;
    this.prevMouseY = -9999;
    this.mouseX = -9999;
    this.mouseY = -9999;
    this.mouseActive = false;
  }
}

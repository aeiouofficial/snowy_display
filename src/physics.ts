/** Screen coordinates are in CSS pixels; higher z means closer to the user. */
export interface Surface { id: string; x: number; y: number; width: number; height: number; z: number }
export interface Settings { snowfall: number; wind: number; gravity: number; cohesion: number; maxDepth: number }
export interface Particle { x: number; y: number; vx: number; vy: number; radius: number; opacity: number; mass: number }
export interface Pile { surface: Surface; bins: number[] }
interface InternalPile { surface: Surface; bins: Float32Array; lastSeen: number }
export const DEFAULT_SETTINGS: Settings = { snowfall: 0.67, wind: 0.2, gravity: 1, cohesion: 0.48, maxDepth: 34 };
const CELL = 7;
const MAX_FLAKES = 1250;
const MAX_CLUMPS = 220;
const finite = (n: number) => Number.isFinite(n);
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
export class SnowEngine {
  private randomState: number;
  private flakes: Particle[] = [];
  private clumps: Particle[] = [];
  private piles = new Map<string, InternalPile>();
  private surfaces: Surface[] = [];
  private spawnRemainder = 0;
  private time = 0;
  private previousSurfaceUpdate = 0;
  public settings: Settings = { ...DEFAULT_SETTINGS };
  public width: number;
  public height: number;
  constructor(width: number, height: number, seed = 0x51f15) {
    this.width = width; this.height = height;
    this.randomState = (seed >>> 0) || 1;
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
    const clean = surfaces.filter(s => s.id && [s.x, s.y, s.width, s.height, s.z].every(finite) && s.width > 1 && s.height > 0);
    const ordered = [...clean].sort((a, b) => b.z - a.z);
    const stepSeconds = Math.max(0.05, Math.min(2, atSeconds - this.previousSurfaceUpdate));
    for (const s of ordered) {
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
    const ids = new Set(ordered.map(s => s.id));
    for (const [id, pile] of this.piles) {
      if (!ids.has(id)) {
        this.shed(pile, 1, 0);
        this.piles.delete(id);
      }
    }
    this.surfaces = ordered;
    for (const pile of this.piles.values()) {
      for (let i = 0; i < pile.bins.length; i++) {
        const x = pile.surface.x + Math.min(pile.surface.width - 0.5, (i + 0.5) * CELL);
        if (!this.isExposed(pile.surface, x) && pile.bins[i] > 0.08) {
          this.releaseBin(pile, i, 1, 0);
        }
      }
    }
    this.previousSurfaceUpdate = atSeconds;
  }
  /** Is this coordinate on the exposed top of this surface? */
  isExposed(surface: Surface, x: number): boolean {
    if (x < surface.x || x >= surface.x + surface.width) return false;
    return !this.surfaces.some(other => other.z > surface.z &&
      x >= other.x && x < other.x + other.width &&
      other.y <= surface.y && other.y + other.height > surface.y);
  }
  private flake(): Particle {
    const radius = 0.65 + this.rand() * 2.15;
    return { x: this.rand() * (this.width + 32) - 16, y: -8 - this.rand() * 55,
      vx: this.rand() * 18 - 9, vy: 21 + this.rand() * 34, radius,
      opacity: 0.45 + this.rand() * 0.5, mass: 0.4 + radius * 0.25 };
  }
  /** Add snow mass to a bin; used by deterministic integration tests too. */
  deposit(id: string, x: number, mass: number): boolean {
    const pile = this.piles.get(id);
    if (!pile || !finite(mass) || mass <= 0 || !this.isExposed(pile.surface, x)) return false;
    const i = clamp(Math.floor((x - pile.surface.x) / CELL), 0, pile.bins.length - 1);
    const radius = pile.bins.length;
    pile.bins[i] = Math.min(this.settings.maxDepth, pile.bins[i] + mass * 0.58);
    if (i > 0) pile.bins[i - 1] = Math.min(this.settings.maxDepth, pile.bins[i - 1] + mass * 0.13);
    if (i + 1 < radius) pile.bins[i + 1] = Math.min(this.settings.maxDepth, pile.bins[i + 1] + mass * 0.13);
    return true;
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
  private hit(x: number, fromY: number, toY: number): InternalPile | null {
    let candidate: InternalPile | null = null;
    let highest = Infinity;
    for (const s of this.surfaces) {
      const pile = this.piles.get(s.id);
      if (!pile || !this.isExposed(s, x)) continue;
      const i = clamp(Math.floor((x - s.x) / CELL), 0, pile.bins.length - 1);
      const topY = s.y - pile.bins[i];
      if (fromY <= topY && toY >= topY && topY < highest) { candidate = pile; highest = topY; }
    }
    return candidate;
  }
  private updateParticles(array: Particle[], dt: number, clump: boolean): void {
    const wind = this.settings.wind * 60 + Math.sin(this.time * 0.58) * 17 + Math.sin(this.time * 1.9) * 8;
    for (let i = array.length - 1; i >= 0; i--) {
      const p = array[i];
      const fromY = p.y;
      const turbulence = Math.sin(this.time * 1.7 + p.x * 0.023 + p.y * 0.015) * 8;
      p.vx += ((wind + turbulence - p.vx) * (clump ? 0.23 : 0.75)) * dt;
      p.vy += (clump ? 420 : 14) * this.settings.gravity * dt;
      p.vy = Math.min(p.vy, clump ? 430 : 90 * this.settings.gravity);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < -45 || p.x > this.width + 45 || p.y > this.height + 22) { array.splice(i, 1); continue; }
      const impact = this.hit(p.x, fromY, p.y);
      if (impact) { this.deposit(impact.surface.id, p.x, p.mass); array.splice(i, 1); }
    }
  }
  private settle(dt: number): void {
    const repose = 1.1 + this.settings.cohesion * 3.8;
    for (const pile of this.piles.values()) {
      const b = pile.bins;
      for (let i = 0; i < b.length; i++) {
        if (!this.isExposed(pile.surface, pile.surface.x + i * CELL + CELL / 2)) continue;
        if (i + 1 < b.length) {
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
      }
    }
  }
  step(dtSeconds: number): void {
    if (!finite(dtSeconds) || dtSeconds <= 0) return;
    const dt = Math.min(1 / 30, dtSeconds);
    this.time += dt;
    const rate = this.settings.snowfall * (16 + this.width / 4.5);
    this.spawnRemainder += rate * dt;
    while (this.spawnRemainder >= 1) {
      this.spawnRemainder--;
      if (this.flakes.length < MAX_FLAKES) this.flakes.push(this.flake());
    }
    this.updateParticles(this.flakes, dt, false);
    this.updateParticles(this.clumps, dt, true);
    this.settle(dt);
  }
  snapshot(): { flakes: readonly Particle[]; clumps: readonly Particle[]; piles: Pile[]; surfaces: readonly Surface[] } {
    return { flakes: this.flakes, clumps: this.clumps, surfaces: this.surfaces,
      piles: Array.from(this.piles.values(), p => ({ surface: p.surface, bins: Array.from(p.bins) })) };
  }
  clear(): void { this.flakes = []; this.clumps = []; this.piles.clear(); this.surfaces = []; this.spawnRemainder = 0; }
}

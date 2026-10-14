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
  private flakes: Particle[] = [];
  private clumps: Particle[] = [];
  private piles = new Map<string, InternalPile>();
  private surfaces: Surface[] = [];
  private spawnRemainder = 0;
  private time = 0;
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
    const clean = surfaces.filter(s => s.id && [s.x, s.y, s.width, s.height, s.z].every(finite) && s.width > 1 && s.height > 0 && s.y > 6);
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
    const windSpan = this.settings.wind * Math.max(120, this.height * 0.75);
    const minX = windSpan > 0 ? -windSpan - 16 : -16;
    const maxX = windSpan < 0 ? this.width - windSpan + 16 : this.width + 16;
    const span = maxX - minX;
    return { x: minX + this.rand() * span, y: -8 - this.rand() * 55,
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
      p.vx += ((wind + turbulence - p.vx) * (clump ? 0.23 : 0.75)) * dt;
      p.vy += (clump ? 420 : 14) * this.settings.gravity * dt;
      p.vy = Math.min(p.vy, clump ? 430 : 90 * this.settings.gravity);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < minBound || p.x > maxBound || p.y > this.height + 22) { array.splice(i, 1); continue; }
      const impact = this.hit(fromX, fromY, p.x, p.y);
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
  step(dtSeconds: number): void {
    if (!finite(dtSeconds) || dtSeconds <= 0) return;
    const dt = Math.min(1 / 30, dtSeconds);
    this.time += dt;
    const windSpan = Math.abs(this.settings.wind) * Math.max(120, this.height * 0.75);
    const rate = this.settings.snowfall * (16 + (this.width + windSpan) / 4.5);
    this.spawnRemainder += rate * dt;
    while (this.spawnRemainder >= 1) {
      this.spawnRemainder--;
      if (this.flakes.length < MAX_FLAKES) this.flakes.push(this.flake());
    }
    this.updateParticles(this.flakes, dt, false);
    this.updateParticles(this.clumps, dt, true);
    this.applyContinuousMouse(dt);
    this.settle(dt);
  }
  snapshot(): { flakes: readonly Particle[]; clumps: readonly Particle[]; piles: Pile[]; surfaces: readonly Surface[] } {
    return { flakes: this.flakes, clumps: this.clumps, surfaces: this.surfaces,
      piles: Array.from(this.piles.values(), p => ({ surface: p.surface, bins: Array.from(p.bins) })) };
  }
  /** Persistent aerodynamic deflector and physical obstacle applied every frame (moving or stationary) */
  private applyContinuousMouse(dt: number): void {
    if (!this.mouseActive) return;
    if (this.mouseX < -80 || this.mouseX > this.width + 80 || this.mouseY < -80 || this.mouseY > this.height + 80) return;

    // Smoothly decay velocity when mouse halts
    const decay = Math.exp(-dt * 4.5);
    this.mouseVx *= decay;
    this.mouseVy *= decay;

    const speed = Math.hypot(this.mouseVx, this.mouseVy);
    const radius = Math.min(110, 38 + speed * 0.045);
    const radiusSq = radius * radius;
    const mX = this.mouseX;
    const mY = this.mouseY;

    // 1. Continuous aerodynamic deflection & umbrella parting for falling flakes
    for (const flake of this.flakes) {
      const dx = flake.x - mX;
      const dy = flake.y - mY;
      const dSq = dx * dx + dy * dy;
      if (dSq < radiusSq && dSq > 0.001) {
        const dist = Math.sqrt(dSq);
        const norm = 1 - dist / radius;

        // Radial repulsion pushes flakes away from the cursor core
        const push = norm * norm * 180 * dt;
        flake.vx += (dx / dist) * push;
        flake.vy += (dy / dist) * push;

        // Aerodynamic bow wave / umbrella effect: flakes directly above split laterally
        if (dy < 12 && flake.vy > 0) {
          const lateralSign = dx >= 0 ? 1 : -1;
          const lateralPush = lateralSign * (1 - Math.abs(dx) / radius) * 160 * dt;
          flake.vx += lateralPush;
          flake.vy *= Math.max(0.15, 1 - norm * 1.8 * dt);
        }

        // Velocity wake transfer
        if (speed > 5) {
          flake.vx += this.mouseVx * norm * 0.5 * dt * 30;
          flake.vy += this.mouseVy * norm * 0.5 * dt * 30;
        }
      }
    }

    // 2. Continuous deflection for clumps
    for (const clump of this.clumps) {
      const dx = clump.x - mX;
      const dy = clump.y - mY;
      const dSq = dx * dx + dy * dy;
      if (dSq < radiusSq * 0.72 && dSq > 0.001) {
        const dist = Math.sqrt(dSq);
        const norm = 1 - dist / (radius * 0.85);
        clump.vx += (dx / dist) * norm * 120 * dt;
        clump.vy += (dy / dist) * norm * 120 * dt;
        if (speed > 5) {
          clump.vx += this.mouseVx * norm * 0.3 * dt * 30;
          clump.vy += this.mouseVy * norm * 0.3 * dt * 30;
        }
      }
    }

    // 3. Stationary / slow cursor indents touching snow piles
    for (const pile of this.piles.values()) {
      const s = pile.surface;
      if (mX >= s.x - 8 && mX <= s.x + s.width + 8 && Math.abs(mY - s.y) < 20) {
        const centerBin = Math.floor((mX - s.x) / CELL);
        const hoverRadius = Math.max(1, Math.ceil(radius / (CELL * 3)));
        for (let b = Math.max(0, centerBin - hoverRadius); b <= Math.min(pile.bins.length - 1, centerBin + hoverRadius); b++) {
          const binX = s.x + (b + 0.5) * CELL;
          const dist = Math.abs(mX - binX);
          if (dist < radius * 0.75) {
            const indent = (1 - dist / (radius * 0.75)) * 1.8 * dt;
            pile.bins[b] = Math.max(0, pile.bins[b] - indent);
          }
        }
      }
    }
  }
  /** Swept continuous mouse interaction: deflects flakes and carves snow piles along the full stroke vector */
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
    const radius = Math.min(115, 42 + speed * 0.05);
    const radiusSq = radius * radius;

    const minX = Math.min(x1, x2) - radius;
    const maxX = Math.max(x1, x2) + radius;
    const minY = Math.min(y1, y2) - radius;
    const maxY = Math.max(y1, y2) + radius;

    // 1. Swept anti-tunneling deflection for falling flakes
    for (const flake of this.flakes) {
      if (flake.x < minX || flake.x > maxX || flake.y < minY || flake.y > maxY) continue;
      const { distSq, qx, qy } = distToSegment(flake.x, flake.y, x1, y1, x2, y2);
      if (distSq < radiusSq) {
        const dist = Math.max(0.001, Math.sqrt(distSq));
        const norm = 1 - dist / radius;
        const pushMag = norm * norm * (140 + speed * 0.38);

        const nx = (flake.x - qx) / dist;
        const ny = (flake.y - qy) / dist;

        flake.vx += nx * pushMag + this.mouseVx * norm * 0.42;
        flake.vy += ny * pushMag + this.mouseVy * norm * 0.42;

        // Wake vortex swirl perpendicular to stroke direction
        const swirl = (this.mouseVx * (-ny) + this.mouseVy * nx) * 0.22;
        flake.vx += -ny * swirl;
        flake.vy += nx * swirl;
      }
    }

    // 2. Swept deflection for clumps
    for (const clump of this.clumps) {
      if (clump.x < minX || clump.x > maxX || clump.y < minY || clump.y > maxY) continue;
      const { distSq, qx, qy } = distToSegment(clump.x, clump.y, x1, y1, x2, y2);
      if (distSq < radiusSq * 0.72) {
        const dist = Math.max(0.001, Math.sqrt(distSq));
        const norm = 1 - dist / (radius * 0.85);
        const nx = (clump.x - qx) / dist;
        const ny = (clump.y - qy) / dist;
        clump.vx += nx * norm * 95 + this.mouseVx * 0.25;
        clump.vy += ny * norm * 95 + this.mouseVy * 0.25;
      }
    }

    // 3. Swept pile plowing and snow carving
    for (const pile of this.piles.values()) {
      const s = pile.surface;
      if (minY <= s.y + 24 && maxY >= s.y - 24) {
        const spanMinX = Math.max(s.x, minX);
        const spanMaxX = Math.min(s.x + s.width, maxX);
        if (spanMinX <= spanMaxX) {
          const bStart = clamp(Math.floor((spanMinX - s.x) / CELL), 0, pile.bins.length - 1);
          const bEnd = clamp(Math.ceil((spanMaxX - s.x) / CELL), 0, pile.bins.length - 1);
          for (let b = bStart; b <= bEnd; b++) {
            const binX = s.x + (b + 0.5) * CELL;
            const binY = s.y - pile.bins[b] * 0.5;
            const { distSq } = distToSegment(binX, binY, x1, y1, x2, y2);
            if (distSq < radiusSq) {
              const dist = Math.sqrt(distSq);
              const currentDepth = pile.bins[b];
              if (currentDepth > 0.08) {
                const norm = 1 - dist / radius;
                const removeFraction = Math.min(0.9, norm * 0.65 * (1.25 - this.settings.cohesion));
                const removedMass = currentDepth * removeFraction;
                if (removedMass > 0.15) {
                  pile.bins[b] = Math.max(0, currentDepth - removedMass);
                  if (this.clumps.length < MAX_CLUMPS) {
                    this.clumps.push({
                      x: binX,
                      y: s.y - currentDepth * 0.8,
                      vx: this.mouseVx * 0.32 + (this.rand() * 44 - 22),
                      vy: Math.min(-12, this.mouseVy * 0.3) - this.rand() * 32,
                      radius: clamp(Math.sqrt(removedMass) * 1.7, 1.4, 7),
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
    this.flakes = [];
    this.clumps = [];
    this.piles.clear();
    this.surfaces = [];
    this.spawnRemainder = 0;
    this.prevMouseX = -9999;
    this.prevMouseY = -9999;
    this.mouseX = -9999;
    this.mouseY = -9999;
    this.mouseActive = false;
  }
}

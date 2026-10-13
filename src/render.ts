import type { Particle, SnowEngine, Surface } from './physics.ts';

export function drawSnow(ctx: CanvasRenderingContext2D, engine: SnowEngine, maskWindows = true): void {
  const { width, height } = engine;
  ctx.clearRect(0, 0, width, height);
  const scene = engine.snapshot();
  const flakes = [...scene.flakes, ...scene.clumps];
  for (const p of flakes) particle(ctx, p);
  // Only the exposed top edge may be coated. Content under windows stays unobstructed.
  if (maskWindows) {
    for (const s of scene.surfaces) ctx.clearRect(s.x, s.y + 2, s.width, s.height - 2);
  }
  for (const pile of scene.piles) {
    const { surface: s, bins } = pile;
    for (let i = 0; i < bins.length; ) {
      while (i < bins.length && (!engine.isExposed(s, s.x + (i + 0.5) * 7) || bins[i] < 0.09)) i++;
      if (i >= bins.length) break;
      const start = i;
      while (i < bins.length && engine.isExposed(s, s.x + (i + 0.5) * 7) && bins[i] >= 0.09) i++;
      snowSection(ctx, s, bins, start, i);
    }
  }
}
function particle(ctx: CanvasRenderingContext2D, p: Particle): void {
  ctx.fillStyle = `rgba(238,248,255,${p.opacity.toFixed(2)})`;
  ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
}
function snowSection(ctx: CanvasRenderingContext2D, s: Surface, bins: number[], start: number, end: number): void {
  const x1 = s.x + start * 7;
  const x2 = Math.min(s.x + s.width, s.x + end * 7);
  let top = s.y;
  const path = new Path2D();
  path.moveTo(x1, s.y + 1);
  for (let i = start; i < end; i++) {
    const x = Math.min(s.x + s.width, s.x + (i + 0.5) * 7);
    const y = s.y - bins[i] * 1.1 - 0.4 * Math.sin(i * 2.39);
    top = Math.min(top, y);
    path.lineTo(x, y);
  }
  path.lineTo(x2, s.y + 1);
  path.closePath();
  ctx.save();
  ctx.shadowColor = 'rgba(153,195,232,.4)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
  const fill = ctx.createLinearGradient(0, top, 0, s.y + 2);
  fill.addColorStop(0, '#f9fdff'); fill.addColorStop(0.45, '#e1f0ff'); fill.addColorStop(1, '#a7c6e5');
  ctx.fillStyle = fill; ctx.fill(path);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,.72)'; ctx.lineWidth = 0.65;
  ctx.stroke(path);
  ctx.restore();
}
export function fitCanvas(canvas: HTMLCanvasElement, width: number, height: number): CanvasRenderingContext2D {
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) throw new Error('2D canvas unavailable');
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  return ctx;
}

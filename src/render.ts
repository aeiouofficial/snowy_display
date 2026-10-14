import type { Particle, SnowEngine, Surface } from './physics.ts';

export function drawSnow(ctx: CanvasRenderingContext2D, engine: SnowEngine, maskWindows = false): void {
  const { width, height } = engine;
  ctx.clearRect(0, 0, width, height);
  const scene = engine.snapshot();
  for (const p of scene.flakes) drawFlake(ctx, p);
  for (const c of scene.clumps) drawClump(ctx, c);
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
function drawFlake(ctx: CanvasRenderingContext2D, p: Particle): void {
  if (p.radius > 1.9) {
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 1.5);
    grad.addColorStop(0, `rgba(255, 255, 255, ${p.opacity.toFixed(2)})`);
    grad.addColorStop(0.55, `rgba(235, 246, 255, ${(p.opacity * 0.72).toFixed(2)})`);
    grad.addColorStop(1, 'rgba(220, 240, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * 1.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = `rgba(240, 249, 255, ${p.opacity.toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
function drawClump(ctx: CanvasRenderingContext2D, p: Particle): void {
  const r = p.radius;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = `rgba(246, 252, 255, ${p.opacity.toFixed(2)})`;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
  ctx.moveTo(-r * 0.35 + r * 0.52, -r * 0.22);
  ctx.arc(-r * 0.35, -r * 0.22, r * 0.52, 0, Math.PI * 2);
  ctx.moveTo(r * 0.33 + r * 0.5, -r * 0.18);
  ctx.arc(r * 0.33, -r * 0.18, r * 0.5, 0, Math.PI * 2);
  ctx.moveTo(r * 0.48, r * 0.3);
  ctx.arc(0, r * 0.3, r * 0.48, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
function snowSection(ctx: CanvasRenderingContext2D, s: Surface, bins: number[], start: number, end: number): void {
  const x1 = s.x + start * 7;
  const x2 = Math.min(s.x + s.width, s.x + end * 7);
  let top = s.y;

  const pts: { x: number; y: number }[] = [];
  pts.push({ x: x1, y: s.y + 0.5 });
  for (let i = start; i < end; i++) {
    const x = Math.min(s.x + s.width, s.x + (i + 0.5) * 7);
    const y = s.y - bins[i] * 1.15 - 0.35 * Math.sin(i * 2.39);
    top = Math.min(top, y);
    pts.push({ x, y });
  }
  pts.push({ x: x2, y: s.y + 0.5 });

  const path = new Path2D();
  path.moveTo(pts[0].x, pts[0].y);
  if (pts.length <= 3) {
    for (let i = 1; i < pts.length; i++) path.lineTo(pts[i].x, pts[i].y);
  } else {
    for (let i = 1; i < pts.length - 1; i++) {
      const xc = (pts[i].x + pts[i + 1].x) / 2;
      const yc = (pts[i].y + pts[i + 1].y) / 2;
      path.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
    }
    path.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
  }
  path.lineTo(x2, s.y + 2);
  path.lineTo(x1, s.y + 2);
  path.closePath();

  ctx.save();
  ctx.shadowColor = 'rgba(120, 168, 212, 0.42)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;

  const fill = ctx.createLinearGradient(0, top - 2, 0, s.y + 2);
  fill.addColorStop(0, '#ffffff');
  fill.addColorStop(0.25, '#f5faff');
  fill.addColorStop(0.68, '#d8eaf8');
  fill.addColorStop(1, '#98bada');
  ctx.fillStyle = fill;
  ctx.fill(path);

  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.lineWidth = 0.8;
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

import type { Surface } from './physics.ts';

export interface Display { id: string; x: number; y: number; width: number; height: number; scaleFactor: number }
export interface DesktopWorld { x: number; y: number; width: number; height: number }
export interface Viewport { x:number; y:number; width:number; height:number; scaleFactor:number }

/** World coordinates are PHYSICAL desktop pixels, not per-window CSS pixels.
 *  No screen-edge respawn: the virtual desktop's bounds span all monitors.
 */
export function normalizeDesktop(displays: readonly Display[]): DesktopWorld {
  const valid = displays.filter(s => Number.isFinite(s.x+s.y+s.width+s.height) && s.width>0 && s.height>0);
  if (!valid.length) return {x:0,y:0,width:1,height:1};
  const x=Math.min(...valid.map(s=>s.x));
  const y=Math.min(...valid.map(s=>s.y));
  return {x,y,width:Math.max(...valid.map(s=>s.x+s.width))-x,
    height:Math.max(...valid.map(s=>s.y+s.height))-y};
}
export function localViewport(world: DesktopWorld, display: Display): Viewport {
  return {x:display.x-world.x,y:display.y-world.y,width:display.width,height:display.height,scaleFactor:display.scaleFactor};
}
export function worldSurfaces(surfaces:readonly Surface[],world:DesktopWorld,displays:readonly Display[]):Surface[] {
  return surfaces.map(s => {
    const atBezel=displays.some(d=>
      s.y <= d.y+6 && s.y+s.height>d.y+6 &&
      s.x < d.x+d.width && s.x+s.width>d.x);
    return {...s,x:s.x-world.x,y:s.y-world.y,
      noAccumulation: !!s.noAccumulation||atBezel};
  });
}
export function viewportIntersects(view:Viewport,x:number,y:number,width:number,height:number):boolean {
  return x+width>=view.x && x<=view.x+view.width &&
    y+height>=view.y && y<=view.y+view.height;
}

/** Performance modes apply to ALL monitors; only the coordinator simulates. */
export type PerformanceMode = 'eco' | 'balanced' | 'high';
export const PERFORMANCE:Record<PerformanceMode,{fps:number;particles:number;syncFps:number;pollMs:number}> = {
  eco: {fps:24,particles:300,syncFps:20,pollMs:350},
  balanced: {fps:36,particles:650,syncFps:30,pollMs:220},
  high: {fps:60,particles:1150,syncFps:45,pollMs:140},
};
export function resolvePerformance(value:unknown):PerformanceMode {
  return value === 'eco' || value === 'high' ? value:'balanced';
}

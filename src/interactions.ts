export type InteractionTool = 'none' | 'footprint' | 'push' | 'gust' | 'vortex' | 'freeze' | 'melt';
export interface InteractionDescriptor {
  id:InteractionTool; label:string; details:string; icon:string;
  strength:number; intervalMs:number; snowOnly:boolean;
}
export const INTERACTION_TOOLS:readonly InteractionDescriptor[]=[
 {id:'none',label:'Observe',details:'Natural snow responds gently to the mouse',icon:'◌',strength:0,intervalMs:0,snowOnly:false},
 {id:'footprint',label:'Footsteps',details:'Stamp paired tracks and displace the snow',icon:'♧',strength:0.72,intervalMs:140,snowOnly:true},
 {id:'push',label:'Snowplow',details:'Push powder sideways into uneven drifts',icon:'➜',strength:0.85,intervalMs:75,snowOnly:true},
 {id:'gust',label:'Wind spell',details:'Blow snowflakes and loose particles away',icon:'〰',strength:0.9,intervalMs:220,snowOnly:false},
 {id:'vortex',label:'Vortex spell',details:'Spin falling particles into a moving whirl',icon:'◎',strength:1,intervalMs:240,snowOnly:false},
 {id:'freeze',label:'Frost spell',details:'Temporarily freeze and settle snow',icon:'❄',strength:0.9,intervalMs:1800,snowOnly:true},
 {id:'melt',label:'Melt spell',details:'Melt nearby snow without phantom particles',icon:'☀',strength:0.8,intervalMs:220,snowOnly:true},
] as const;
export function normalizeTool(value:unknown):InteractionTool {
 return INTERACTION_TOOLS.find(t=>t.id===value)?.id??'none';
}
export const INTERACTION_EVENT='snowy-display:interaction';

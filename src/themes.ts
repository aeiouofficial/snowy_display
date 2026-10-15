/** Extensible content catalog: seasonal ambience is separate from snow physics. */
export type ParticleKind = 'snow' | 'rain' | 'petals' | 'leaves' | 'fireflies' | 'embers' | 'confetti' | 'stars' | 'bats';
export type ThemeCategory = 'Winter' | 'Spring' | 'Summer' | 'Autumn' | 'Events' | 'Atmosphere';
export interface WeatherTheme {
  id: string;
  name: string;
  category: ThemeCategory;
  description: string;
  particle: ParticleKind;
  color: string;
  secondary: string;
  accumulating: boolean;
  accent: string;
  intensity: number;
}
export const THEMES: readonly WeatherTheme[] = [
  {id:'winter-snow',name:'Natural Snow',category:'Winter',description:'Real snowdrifts and gentle snowfall',particle:'snow',color:'#f2faff',secondary:'#b9ddff',accumulating:true,accent:'#a8d9ff',intensity:0.65},
  {id:'winter-blizzard',name:'Arctic Blizzard',category:'Winter',description:'Denser snow and brisk wind',particle:'snow',color:'#eff9ff',secondary:'#8ac8ff',accumulating:true,accent:'#80b8eb',intensity:1},
  {id:'winter-frost',name:'Quiet Frost',category:'Winter',description:'Sparse fine crystal snow',particle:'snow',color:'#ffffff',secondary:'#d2efff',accumulating:true,accent:'#d4efff',intensity:0.24},
  {id:'spring-petals',name:'Cherry Blossom',category:'Spring',description:'Floating pink petals, no buildup',particle:'petals',color:'#ffc6d8',secondary:'#ed82ad',accumulating:false,accent:'#f5a5c2',intensity:0.47},
  {id:'spring-rain',name:'Spring Rain',category:'Spring',description:'Fine silver-blue rainfall',particle:'rain',color:'#acd3ff',secondary:'#80b9e0',accumulating:false,accent:'#86bfe7',intensity:0.7},
  {id:'spring-pollen',name:'Golden Pollen',category:'Spring',description:'Warm drifting pollen motes',particle:'fireflies',color:'#ffe4a1',secondary:'#ffd36b',accumulating:false,accent:'#f5d078',intensity:0.38},
  {id:'summer-fireflies',name:'Firefly Evening',category:'Summer',description:'Glowing fireflies and dusk air',particle:'fireflies',color:'#d5ff9d',secondary:'#ffeb8c',accumulating:false,accent:'#cee878',intensity:0.42},
  {id:'summer-showers',name:'Warm Downpour',category:'Summer',description:'Fast summer rain',particle:'rain',color:'#ccf0ff',secondary:'#74c6df',accumulating:false,accent:'#8bcad7',intensity:0.98},
  {id:'summer-stargaze',name:'Starlit Night',category:'Summer',description:'Subtle falling and twinkling stars',particle:'stars',color:'#fbf0c4',secondary:'#bfd7ff',accumulating:false,accent:'#d4c7ff',intensity:0.3},
  {id:'autumn-leaves',name:'Autumn Canopy',category:'Autumn',description:'Rustling copper and amber leaves',particle:'leaves',color:'#e6a04b',secondary:'#b85c38',accumulating:false,accent:'#e6ac67',intensity:0.64},
  {id:'autumn-mist',name:'Harvest Glow',category:'Autumn',description:'Soft drifting golden motes',particle:'fireflies',color:'#ffdca3',secondary:'#e9a260',accumulating:false,accent:'#dab581',intensity:0.35},
  {id:'halloween-bats',name:'Halloween Night',category:'Events',description:'Moonlit bats and eerie sparks',particle:'bats',color:'#9a8ac7',secondary:'#f59e52',accumulating:false,accent:'#ca85fc',intensity:0.55},
  {id:'halloween-embers',name:'Haunted Lanterns',category:'Events',description:'Floating ember sparks',particle:'embers',color:'#ffba55',secondary:'#f06b3a',accumulating:false,accent:'#ee8a43',intensity:0.54},
  {id:'advent-1',name:'Advent · Candle One',category:'Events',description:'One golden candle-like sparkle',particle:'stars',color:'#fff1c5',secondary:'#f1c578',accumulating:false,accent:'#eac58f',intensity:0.35},
  {id:'advent-2',name:'Advent · Candle Two',category:'Events',description:'Two warm star streams',particle:'stars',color:'#ffe8aa',secondary:'#eec37a',accumulating:false,accent:'#ebbc78',intensity:0.42},
  {id:'advent-3',name:'Advent · Candle Three',category:'Events',description:'Rosy and gold festive sparkle',particle:'stars',color:'#ffd0d9',secondary:'#ffd37a',accumulating:false,accent:'#f2a5c1',intensity:0.5},
  {id:'advent-4',name:'Advent · Candle Four',category:'Events',description:'Bright festive winter starlight',particle:'stars',color:'#ffffff',secondary:'#ffd78d',accumulating:false,accent:'#f2e1b5',intensity:0.6},
  {id:'christmas-snow',name:'Christmas Eve',category:'Events',description:'Winter snow with warm festive light',particle:'snow',color:'#fffefa',secondary:'#d6f1eb',accumulating:true,accent:'#eacb99',intensity:0.62},
  {id:'newyear-confetti',name:'New Year Celebration',category:'Events',description:'Colored festive confetti',particle:'confetti',color:'#ffce7c',secondary:'#8dcdfb',accumulating:false,accent:'#dec3f4',intensity:0.9},
  {id:'ambient-embers',name:'Campfire Sparks',category:'Atmosphere',description:'Soft upward floating embers',particle:'embers',color:'#ffcd80',secondary:'#ff804c',accumulating:false,accent:'#ff9b66',intensity:0.48},
  {id:'ambient-cosmos',name:'Cosmic Dust',category:'Atmosphere',description:'Quiet shimmering star particles',particle:'stars',color:'#cbc4ff',secondary:'#9fcaff',accumulating:false,accent:'#b8b0f1',intensity:0.36},
] as const;
export const DEFAULT_THEME = 'winter-snow';
const THEMES_BY_ID = new Map(THEMES.map(t => [t.id, t]));
export function resolveTheme(id: unknown): WeatherTheme { return THEMES_BY_ID.get(typeof id==='string'?id:'') ?? THEMES[0]; }
export function seasonsTheme(month: number): string {
  return month <= 2 || month === 12 ? DEFAULT_THEME :
    month <= 5 ? 'spring-petals' : month <= 8 ? 'summer-fireflies' : 'autumn-leaves';
}
export function adventWeek(date: Date): number {
  const year = date.getFullYear();
  const christmas = new Date(year, 11, 25);
  const lastSunday = new Date(year, 11, 24);
  lastSunday.setDate(24 - lastSunday.getDay());
  const firstSunday = new Date(lastSunday);
  firstSunday.setDate(lastSunday.getDate()-21);
  const day = new Date(year,date.getMonth(),date.getDate());
  const weeks = Math.floor((day.getTime()-firstSunday.getTime()) / 604800000);
  return day < christmas && weeks >= 0 && weeks < 4 ? weeks + 1 : 0;
}
export function calendarTheme(date: Date): string {
  const month=date.getMonth()+1, day=date.getDate();
  if (month===10 && day>=24 || month===11 && day<=1) return 'halloween-bats';
  if (month===12 && day>=24 && day<=26) return 'christmas-snow';
  if (month===12 && day===31 || month===1 && day===1) return 'newyear-confetti';
  const advent=adventWeek(date);
  if(advent) return `advent-${advent}`;
  return seasonsTheme(month);
}

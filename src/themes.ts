/** Extensible content catalog: seasonal ambience is separate from snow physics. */
export type ParticleKind = 'snow' | 'rain' | 'petals' | 'leaves' | 'fireflies' | 'embers' | 'confetti' | 'stars' | 'bats';
export type ThemeCategory = 'Winter' | 'Spring' | 'Summer' | 'Autumn' | 'Weather' | 'Events' | 'Atmosphere';
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
  {id:'winter-northernlights',name:'Northern Lights',category:'Winter',description:'Snowfall and flowing boreal aurora',particle:'snow',color:'#d3f9ff',secondary:'#70e6ca',accumulating:true,accent:'#63dfcc',intensity:0.37},
  {id:'winter-forest',name:'Snowbound Forest',category:'Winter',description:'Slow forest snow, distant birds and firs',particle:'snow',color:'#f5faff',secondary:'#b3dfea',accumulating:true,accent:'#91c4ca',intensity:0.45},
  {id:'spring-butterflies',name:'Butterfly Garden',category:'Spring',description:'Animated wingbeats over spring blossoms',particle:'petals',color:'#ffe2f4',secondary:'#eeadd7',accumulating:false,accent:'#eba6cd',intensity:0.53},
  {id:'spring-meadow',name:'Blooming Meadow',category:'Spring',description:'Wildflowers and roaming pollinators',particle:'petals',color:'#f8c2d6',secondary:'#dfad83',accumulating:false,accent:'#a8da8d',intensity:0.38},
  {id:'spring-rainbow',name:'After the Rain',category:'Spring',description:'Rainbow arcs under soft passing clouds',particle:'rain',color:'#b9d5fc',secondary:'#e4edff',accumulating:false,accent:'#a6c0fa',intensity:0.28},
  {id:'summer-bees',name:'Summer Apiary',category:'Summer',description:'Bees, blooms and golden midday light',particle:'fireflies',color:'#ffe194',secondary:'#ffbe55',accumulating:false,accent:'#f1cd68',intensity:0.31},
  {id:'summer-kite',name:'Breezy Afternoon',category:'Summer',description:'A kite sailing between passing clouds',particle:'fireflies',color:'#ccf2ff',secondary:'#91dde8',accumulating:false,accent:'#95dada',intensity:0.19},
  {id:'summer-goldenhour',name:'Golden Hour',category:'Summer',description:'Low sun and birds in amber light',particle:'stars',color:'#ffe5b8',secondary:'#ffc08c',accumulating:false,accent:'#e7b477',intensity:0.19},
  {id:'autumn-harvest',name:'Harvest Lanterns',category:'Autumn',description:'Pumpkins, acorns and windblown leaves',particle:'leaves',color:'#e7ac5d',secondary:'#b66b36',accumulating:false,accent:'#d48b53',intensity:0.58},
  {id:'autumn-migration',name:'Migration',category:'Autumn',description:'Migrating birds and a copper canopy',particle:'leaves',color:'#edbd83',secondary:'#d5805c',accumulating:false,accent:'#c99367',intensity:0.29},
  {id:'weather-thunder',name:'Thunderstorm',category:'Weather',description:'Rain with restrained animated lightning',particle:'rain',color:'#b0c9f8',secondary:'#8f9fb9',accumulating:false,accent:'#91add4',intensity:0.94},
  {id:'weather-fog',name:'Morning Fog',category:'Weather',description:'Transparent drifting mist banks',particle:'fireflies',color:'#d3e4e8',secondary:'#b3c4cb',accumulating:false,accent:'#b6d3d3',intensity:0.12},
  {id:'weather-drizzle',name:'Light Drizzle',category:'Weather',description:'Fine rain and subtle cloudbanks',particle:'rain',color:'#c1dcf2',secondary:'#99bdd7',accumulating:false,accent:'#a5c4df',intensity:0.35},
  {id:'weather-windy',name:'Windy Day',category:'Weather',description:'Rushing leaves and a windborne kite',particle:'leaves',color:'#e6c799',secondary:'#b7a56f',accumulating:false,accent:'#c8c1a2',intensity:0.62},
  {id:'event-easter',name:'Spring Celebration',category:'Events',description:'Blooming flowers and playful butterflies',particle:'petals',color:'#ffe3f4',secondary:'#a4eec0',accumulating:false,accent:'#d5c7f1',intensity:0.54},
  {id:'event-valentine',name:'Valentine Night',category:'Events',description:'Soft floating hearts and sparkling light',particle:'petals',color:'#ffd2e7',secondary:'#fa9db7',accumulating:false,accent:'#f3a6c4',intensity:0.34},
  {id:'ambient-moonlight',name:'Silver Moonlight',category:'Atmosphere',description:'Crescent moon and moving silhouettes',particle:'stars',color:'#eff3ff',secondary:'#b9caff',accumulating:false,accent:'#b5c7ee',intensity:0.21},
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

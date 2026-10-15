import { THEMES, type WeatherTheme } from './themes.ts';
import type { AppSettings } from './settings.ts';

type Patch=(next:Partial<AppSettings>,persist?:boolean)=>void;
const groups=['All','Winter','Spring','Summer','Autumn','Weather','Events','Atmosphere'];
const symbols:Record<string,string>={
 Winter:'❄',Spring:'✿',Summer:'☀',Autumn:'❧',
 Weather:'☁',Events:'✦',Atmosphere:'◌',
};
const byId=(id:string)=>document.getElementById(id)!;
export function installStudioUI(patch:Patch): (settings:AppSettings,theme:WeatherTheme)=>void{
 const gallery=byId('theme-gallery');
 const filters=byId('category-filters');
 const search=byId('theme-search') as HTMLInputElement;
 const tabs=[...document.querySelectorAll<HTMLButtonElement>('#studio-tabs [data-tab]')];
 let category='All',query='';
 let lastTheme='',lastAuto=false;
 function setTab(id:string):void{
  tabs.forEach((tab)=>{
   const active=tab.dataset.tab===id;
   tab.setAttribute('aria-selected',String(active));
   tab.tabIndex=active?0:-1;
   const panel=byId('panel-'+tab.dataset.tab);
   panel.hidden=!active;
  });
 }
 tabs.forEach((tab,index)=>{
  tab.addEventListener('click',()=>setTab(tab.dataset.tab||'scenes'));
  tab.addEventListener('keydown',event=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
   event.preventDefault();
   const indexNext=event.key==='Home'?0:event.key==='End'?tabs.length-1:
    (index+tabs.length+(event.key==='ArrowRight'?1:-1))%tabs.length;
   setTab(tabs[indexNext].dataset.tab||'scenes');
   tabs[indexNext].focus();
  });
 });
 setTab('scenes');

 function drawCards():void {
  const current=lastTheme;
  gallery.replaceChildren();
  for(const theme of THEMES){
   if(category!=='All'&&theme.category!==category)continue;
   if(query&&!(theme.name+' '+theme.category+' '+theme.description).toLowerCase().includes(query))continue;
   const card=document.createElement('button');card.type='button';
   card.className='scene-card';card.dataset.id=theme.id;
   card.setAttribute('aria-pressed',String(theme.id===current));
   if(theme.id===current)card.classList.add('selected');
   const art=document.createElement('span');art.className='scene-art';
   art.dataset.category=theme.category.toLowerCase();
   art.style.setProperty('--scene-accent',theme.accent);
   const symbol=document.createElement('span');symbol.textContent=symbols[theme.category]||'✧';
   art.appendChild(symbol);
   const details=document.createElement('span');details.className='scene-card-copy';
   const title=document.createElement('strong');title.textContent=theme.name;
   const sub=document.createElement('small');sub.textContent=theme.category;
   details.append(title,sub);
   const indicator=document.createElement('span');indicator.className='selected-tick';indicator.textContent='✓';
   card.append(art,details,indicator);
   card.title=theme.description;
   card.addEventListener('click',()=>{
     patch({themeId:theme.id,automaticTheme:false});
     syncSelection(theme.id);
   });
   gallery.appendChild(card);
  }
  if(!gallery.childElementCount){
   const empty=document.createElement('p');empty.className='empty-scenes';
   empty.textContent='No environments match the current filter.';gallery.appendChild(empty);
  }
  byId('theme-count').textContent=gallery.querySelectorAll('.scene-card').length+' / '+THEMES.length;
 }
 function syncSelection(id:string):void {
  for(const card of gallery.querySelectorAll<HTMLButtonElement>('.scene-card')){
   const selected=card.dataset.id===id;
   card.classList.toggle('selected',selected);
   card.setAttribute('aria-pressed',String(selected));
  }
 }
 for(const label of groups){
  const btn=document.createElement('button');btn.type='button';
  btn.className='category-chip';btn.dataset.category=label;btn.textContent=label;
  btn.addEventListener('click',()=>{
   category=label;
   filters.querySelectorAll<HTMLButtonElement>('button').forEach(x=>{
    const active=x===btn;x.classList.toggle('selected',active);
    x.setAttribute('aria-pressed',String(active));
   });
   drawCards();
  });
  filters.appendChild(btn);
 }
 filters.querySelector<HTMLButtonElement>('button')!.classList.add('selected');
 filters.querySelector<HTMLButtonElement>('button')!.setAttribute('aria-pressed','true');
 search.addEventListener('input',()=>{query=search.value.toLowerCase().trim();drawCards();});
 function toggle(id:string,key:keyof AppSettings):void{
  (byId(id) as HTMLInputElement).addEventListener('change',event=>{
   patch({[key]:(event.target as HTMLInputElement).checked} as Partial<AppSettings>);
  });
 }
 toggle('scene-objects','showSceneObjects');
 toggle('scene-animations','animationsEnabled');
 toggle('auto-plows','autoPlows');
 toggle('reduced-motion','reduceMotion');
 function slider(parent:string,id:string,label:string,description:string,
   low:number,high:number,step:number,unit:string,key:keyof AppSettings):void {
  const row=document.createElement('label');row.className='fine-row';
  const header=document.createElement('span');header.className='fine-top';
  const name=document.createElement('strong');name.textContent=label;
  const value=document.createElement('output');value.id='out-'+id;
  header.append(name,value);
  const detail=document.createElement('small');detail.textContent=description;
  const input=document.createElement('input');input.id=id;input.type='range';
  input.min=String(low);input.max=String(high);input.step=String(step);
  input.addEventListener('input',()=>{
   value.textContent=input.value+unit;
   patch({[key]:Number(input.value)} as Partial<AppSettings>,false);
  });
  input.addEventListener('change',()=>patch({[key]:Number(input.value)} as Partial<AppSettings>));
  row.append(header,detail,input);
  byId(parent).appendChild(row);
 }
 slider('scenery-sliders','decoration-density','Scenery density','Number of illustrated objects',0,1,.05,'','decorationDensity');
 slider('scenery-sliders','visual-scale','Object size','Visual scale, independent of physics',.5,2,.05,'×','visualScale');
 slider('plow-sliders','plow-interval','Snowplow frequency','Seconds between vehicle visits',7,120,1,' s','plowInterval');
 const quality=byId('quality-options');
 for(const mode of ['eco','balanced','high'] as const){
  const button=document.createElement('button');button.type='button';
  button.className='quality-card';button.dataset.quality=mode;
  const head=document.createElement('strong');head.textContent=mode==='eco'?'Eco':mode==='balanced'?'Balanced':'High';
  const hint=document.createElement('small');hint.textContent=mode==='eco'?'24 FPS · lighter load':
    mode==='balanced'?'36 FPS · optimized':'60 FPS · full detail';
  button.append(head,hint);
  button.addEventListener('click',()=>patch({performanceMode:mode}));
  quality.appendChild(button);
 }
 drawCards();
 return function sync(settings:AppSettings,theme:WeatherTheme):void {
  if(theme.id!==lastTheme||settings.automaticTheme!==lastAuto){
   lastTheme=theme.id;lastAuto=settings.automaticTheme;syncSelection(lastTheme);
  }
  for(const [id,key] of [
   ['scene-objects','showSceneObjects'],['scene-animations','animationsEnabled'],
   ['auto-plows','autoPlows'],['reduced-motion','reduceMotion'],
  ] as const)(byId(id) as HTMLInputElement).checked=settings[key];
  for(const [id,key,formatter] of [
   ['decoration-density','decorationDensity',(n:number)=>Math.round(n*100)+'%'],
   ['visual-scale','visualScale',(n:number)=>Math.round(n*100)+'%'],
   ['plow-interval','plowInterval',(n:number)=>Math.round(n)+' s'],
  ] as const){
   const field=byId(id) as HTMLInputElement;
   field.value=String(settings[key]);
   byId('out-'+id).textContent=formatter(settings[key]);
  }
  (byId('plow-interval') as HTMLInputElement).disabled=!settings.autoPlows;
  for(const button of quality.querySelectorAll<HTMLButtonElement>('button')){
   const selected=button.dataset.quality===settings.performanceMode;
   button.classList.toggle('selected',selected);
   button.setAttribute('aria-pressed',String(selected));
  }
  byId('scene-name').textContent=theme.name;
  byId('scene-category').textContent=theme.category.toUpperCase()+' COLLECTION';
  byId('scene-description').textContent=theme.description;
  byId('scene-running').textContent=settings.enabled?'ACTIVE':'PAUSED';
  byId('runtime-status').textContent=settings.enabled?'LIVE':'PAUSED';
  byId('scene-running').classList.toggle('paused',!settings.enabled);
 }
}

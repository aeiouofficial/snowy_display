/** Portable Origami-inspired appearance controller for Tauri and Android WebView.
 * Intentionally independent of Home Assistant/Bubble Card components.
 * Appearance is device-local UI state, never part of physics or overlay settings.
 */
export type AppearanceMode='dark'|'light';
export const APPEARANCE_STORAGE_KEY='snowy-display:origami-mode';
const valid=(mode:string|null|undefined):mode is AppearanceMode=>mode==='dark'||mode==='light';

export function applyOrigamiAppearance(mode:AppearanceMode,root:HTMLElement=document.documentElement):void {
 root.dataset.origamiMode=mode;
 root.style.colorScheme=mode;
 const themeColor=document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
 if(themeColor)themeColor.content=mode==='dark'?'#181715':'#f2f0eb';
 document.querySelectorAll<HTMLButtonElement>('[data-origami-mode-option]').forEach((button)=>{
  const pressed=button.dataset.origamiModeOption===mode;
  button.setAttribute('aria-pressed',String(pressed));
 });
}

export function bootstrapOrigamiAppearance():AppearanceMode {
 let mode:AppearanceMode='dark';
 try {
  const saved=localStorage.getItem(APPEARANCE_STORAGE_KEY);
  if(valid(saved))mode=saved;
 } catch { /* Restricted browser storage: honor the dark default. */ }
 applyOrigamiAppearance(mode);
 return mode;
}

export function bindOrigamiAppearance():void {
 const buttons=document.querySelectorAll<HTMLButtonElement>('[data-origami-mode-option]');
 for(const button of buttons){
  button.addEventListener('click',()=>{
   const requested=button.dataset.origamiModeOption??'';
   if(!valid(requested))return;
   applyOrigamiAppearance(requested);
   try {localStorage.setItem(APPEARANCE_STORAGE_KEY,requested);}
   catch { /* The UI still responds with private storage disabled. */ }
  });
 }
 const selected=document.documentElement.dataset.origamiMode;
 if(valid(selected))applyOrigamiAppearance(selected);
}

import { DEFAULT_THEME, THEME_STORAGE_KEY } from '@/lib/theme';

/**
 * Inline script ejecutado antes del paint para evitar FOUC.
 * Lee localStorage y setea data-theme en <html> de forma sincrónica.
 */
export function ThemeScript() {
  const code = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var v=['light-azul','light-verde','dark-cobalto','dark-esmeralda'];if(!t||v.indexOf(t)===-1)t=${JSON.stringify(DEFAULT_THEME)};document.documentElement.setAttribute('data-theme',t);if(t.indexOf('dark')===0)document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark');}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

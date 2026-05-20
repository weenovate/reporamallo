export const THEMES = [
  { id: 'light-azul', label: 'Claro · Azul', mode: 'light' as const },
  { id: 'light-verde', label: 'Claro · Verde', mode: 'light' as const },
  { id: 'dark-cobalto', label: 'Oscuro · Cobalto', mode: 'dark' as const },
  { id: 'dark-esmeralda', label: 'Oscuro · Esmeralda', mode: 'dark' as const },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];
export const DEFAULT_THEME: ThemeId = 'light-azul';
export const THEME_STORAGE_KEY = 'reporamallo:theme';

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && THEMES.some((t) => t.id === value);
}

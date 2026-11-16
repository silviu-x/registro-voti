/** Gestione centralizzata del tema, persistente tra le visite. */
const THEME_KEY = 'registro-voti-theme';
let activeTheme = 'dark';

export function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch (error) { /* Tema predefinito se lo storage è bloccato. */ }
  activeTheme = saved === 'light' || saved === 'dark' ? saved : 'dark';
  document.documentElement.dataset.theme = activeTheme;
  updateThemeColor();
  return activeTheme;
}

export function setTheme(theme) {
  if (theme !== 'light' && theme !== 'dark') return activeTheme;
  activeTheme = theme;
  document.documentElement.dataset.theme = theme;
  updateThemeColor();
  try { localStorage.setItem(THEME_KEY, theme); } catch (error) { /* La UI resta utilizzabile anche senza storage. */ }
  return activeTheme;
}

function updateThemeColor() {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = activeTheme === 'light' ? '#f3f5fa' : '#0c111c';
}

export function getTheme() {
  return activeTheme;
}

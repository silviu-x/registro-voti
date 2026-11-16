/** Utility condivise: DOM, formattazione, date e identificativi. */
export const MONTHS = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
export const DAY = 864e5;

export function $(selector, root) {
  return (root || document).querySelector(selector);
}

export function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character];
  });
}

const numberFormat = new Intl.NumberFormat('it-IT', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export function f2(value) {
  return value == null || Number.isNaN(value) ? '–' : numberFormat.format(value);
}

export function sgn(value) {
  return (value >= 0 ? '+' : '−') + f2(Math.abs(value));
}

export function cls(value) {
  return value < 5 ? 'bad' : value < 6 ? 'warn' : 'ok';
}

export function dShort(isoDate) {
  return (+isoDate.slice(8)) + ' ' + MONTHS[+isoDate.slice(5, 7) - 1];
}

export function dLong(isoDate) {
  return dShort(isoDate) + ' ' + isoDate.slice(0, 4);
}

export function todayISO() {
  const date = new Date();
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

export function newId() {
  return 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** Modello e normalizzazione dei dati dell'applicazione. */
import {parseGrade} from './calculations.js';
import {newId} from './utils.js';

export const TYPES = ['Scritto','Orale','Pratico','Laboratorio'];
export const DEFAULT_SUBJECTS = ['Italiano','Storia','Inglese','Matematica','Informatica','Sistemi e reti','TPSIT','Telecomunicazioni','Scienze motorie'];

export function demoGrades(){
  var rows=[
    ['2026-09-29','Matematica','6+','Scritto','Disequazioni'],
    ['2026-09-30','Italiano','7','Orale','Verga'],
    ['2026-10-02','Informatica','8','Pratico','Database SQL'],
    ['2026-10-05','Inglese','6½','Scritto','Present perfect'],
    ['2026-10-06','Sistemi e reti','7','Scritto','Modello ISO/OSI'],
    ['2026-10-08','Storia','6','Orale','Prima guerra mondiale'],
    ['2026-10-09','TPSIT','7+','Laboratorio','Socket TCP'],
    ['2026-10-12','Matematica','5½','Orale','Funzioni'],
    ['2026-10-13','Scienze motorie','8','Pratico',''],
    ['2026-10-15','Telecomunicazioni','6','Scritto','Segnali analogici'],
    ['2026-10-16','Italiano','6½','Scritto','Analisi del testo'],
    ['2026-10-19','Informatica','8½','Laboratorio','Query con JOIN'],
    ['2026-10-21','Inglese','7','Orale',''],
    ['2026-10-22','Sistemi e reti','6-','Orale','Subnetting'],
    ['2026-10-26','Matematica','6½','Scritto','Derivate'],
    ['2026-10-27','Storia','7','Scritto',''],
    ['2026-10-29','TPSIT','8','Pratico','Client e server'],
    ['2026-10-30','Telecomunicazioni','5+','Orale',''],
    ['2026-11-03','Italiano','7-','Orale','Pirandello'],
    ['2026-11-04','Sistemi e reti','7½','Laboratorio','Configurazione router'],
    ['2026-11-05','Informatica','9','Scritto','Normalizzazione'],
    ['2026-11-09','Inglese','7½','Scritto',''],
    ['2026-11-10','Matematica','7','Scritto','Limiti'],
    ['2026-11-11','Telecomunicazioni','6½','Scritto',''],
    ['2026-11-12','Storia','6½','Orale','Primo dopoguerra'],
    ['2026-11-13','TPSIT','7','Scritto','Thread']
  ];
  return rows.map(function(r,i){
    var p=parseGrade(r[2]);
    return {id:'d'+i,subject:r[1],value:p.value,label:p.label,date:r[0],type:r[3],note:r[4],ts:i,demo:true};
  });
}

export function defaultState() {
  const date = new Date();
  const year = date.getMonth() >= 8 ? date.getFullYear() : date.getFullYear() - 1;
  return {v: 1, savedAt: 0, demo: true, subjects: DEFAULT_SUBJECTS.slice(), grades: demoGrades(), settings: {cutoff: (year + 1) + '-01-31', mode: 'subjects'}};
}

export function normalize(data) {
  const base = defaultState();
  if (!data || typeof data !== 'object') return base;
  const result = {
    v: 1,
    savedAt: +data.savedAt || 0,
    demo: !!data.demo,
    subjects: Array.isArray(data.subjects) ? data.subjects.filter(item => typeof item === 'string' && item) : base.subjects,
    grades: [],
    settings: {
      cutoff: (data.settings && data.settings.cutoff) || base.settings.cutoff,
      mode: (data.settings && data.settings.mode === 'all') ? 'all' : 'subjects'
    }
  };
  (Array.isArray(data.grades) ? data.grades : []).forEach(function (grade) {
    if (grade && typeof grade.subject === 'string' && typeof grade.value === 'number' && typeof grade.date === 'string') {
      result.grades.push({
        id: String(grade.id || newId()), subject: grade.subject, value: grade.value,
        label: String(grade.label || grade.value), date: grade.date,
        type: TYPES.indexOf(grade.type) >= 0 ? grade.type : 'Scritto',
        note: String(grade.note || ''), ts: +grade.ts || 0, demo: !!grade.demo
      });
      if (result.subjects.indexOf(grade.subject) < 0) result.subjects.push(grade.subject);
    }
  });
  return result;
}

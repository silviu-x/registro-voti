/** Funzioni pure per voti, medie e simulazioni. */
export function parseGrade(raw) {
  const value = String(raw == null ? '' : raw).trim().replace(/\s+/g, '').replace(',', '.').replace(/[−–]/g, '-');
  if (!value) return null;

  let match = value.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (match) {
    const first = +match[1], second = +match[2];
    if (Math.abs(first - second) !== 1) return null;
    const grade = (first + second) / 2;
    if (grade < 2 || grade > 10) return null;
    return {value: grade, label: Math.min(first, second) + '/' + Math.max(first, second)};
  }

  match = value.match(/^(\d{1,2})(?:\.(\d{1,2}))?(\+|-|½)?$/);
  if (!match || (match[2] && match[3])) return null;
  let grade = match[2] ? parseFloat(match[1] + '.' + match[2]) : +match[1];
  if (match[3] === '+') grade += 0.25;
  else if (match[3] === '-') grade -= 0.25;
  else if (match[3] === '½') grade += 0.5;
  if (grade < 2 || grade > 10) return null;

  let label = value.replace('.', ',');
  if (!match[3] && match[2] && grade % 1 === 0.5) label = Math.floor(grade) + '½';
  return {value: grade, label: label};
}

export function fmtGrade(value) {
  const quarter = Math.ceil(value * 4 - 1e-9) / 4;
  const integer = Math.floor(quarter + 1e-9);
  const fraction = Math.round((quarter - integer) * 4);
  if (fraction === 0) return String(integer);
  if (fraction === 1) return integer + '+';
  if (fraction === 2) return integer + '½';
  return (integer + 1) + '-';
}

export function cmp(first, second) {
  return first.date < second.date ? -1 : first.date > second.date ? 1 : ((first.ts || 0) - (second.ts || 0));
}

export function ts(date) {
  return Date.parse(date + 'T12:00:00');
}

export function bySubject(grades) {
  const map = new Map();
  grades.forEach(function (grade) {
    let entry = map.get(grade.subject);
    if (!entry) {
      entry = {n: 0, sum: 0, list: []};
      map.set(grade.subject, entry);
    }
    entry.n++;
    entry.sum += grade.value;
    entry.list.push(grade);
  });
  map.forEach(function (entry) { entry.avg = entry.sum / entry.n; });
  return map;
}

/** mode='all': tutti i voti pesano uguale; mode='subjects': ogni materia pesa uguale. */
export function generalAvg(grades, mode) {
  if (!grades.length) return null;
  if (mode === 'all') return grades.reduce((sum, grade) => sum + grade.value, 0) / grades.length;
  const subjects = bySubject(grades);
  let sum = 0;
  subjects.forEach(entry => { sum += entry.avg; });
  return sum / subjects.size;
}

export function generalSeries(grades, mode) {
  const sorted = grades.slice().sort(cmp);
  const output = [], sums = new Map();
  let total = 0, count = 0;
  for (let index = 0; index < sorted.length; index++) {
    const grade = sorted[index];
    const entry = sums.get(grade.subject) || {n: 0, sum: 0};
    entry.n++;
    entry.sum += grade.value;
    sums.set(grade.subject, entry);
    total += grade.value;
    count++;
    const next = sorted[index + 1];
    if (next && next.date === grade.date) continue;

    let average;
    if (mode === 'all') average = total / count;
    else {
      let sum = 0;
      sums.forEach(item => { sum += item.sum / item.n; });
      average = sum / sums.size;
    }
    output.push({t: ts(grade.date), v: average, date: grade.date, day: sorted.filter(item => item.date === grade.date)});
  }
  return output;
}

export function withGrades(grades, subject, value, count) {
  const output = grades.slice();
  for (let index = 0; index < count; index++) {
    output.push({subject: subject, value: value, date: '9999-12-31', ts: index});
  }
  return output;
}

export function neededGrade(grades, mode, goal, subject, target, count) {
  const subjects = bySubject(grades);
  const current = subjects.get(subject) || {n: 0, sum: 0, avg: 0};
  if (goal === 'subject') return (target * (current.n + count) - current.sum) / count;
  if (mode === 'all') {
    const sum = grades.reduce((total, grade) => total + grade.value, 0);
    return (target * (grades.length + count) - sum) / count;
  }
  let otherAverageSum = 0;
  subjects.forEach((entry, name) => { if (name !== subject) otherAverageSum += entry.avg; });
  const subjectCount = subjects.size + (current.n > 0 ? 0 : 1);
  const requiredTotal = target * subjectCount - otherAverageSum;
  return (requiredTotal * (current.n + count) - current.sum) / count;
}

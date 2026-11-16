import {store} from './store.js';
import {TYPES} from './data.js';
import {MONTHS, DAY, esc, f2, sgn, cls, dShort, dLong, $} from './utils.js';
import {bySubject, generalAvg, generalSeries, cmp, ts, neededGrade, fmtGrade, parseGrade} from './calculations.js';
import {drawChart} from './charts.js';
import {preferenceControls} from './preferences.js';
import {getTheme} from './theme.js';

const PERIOD_LABEL = {all:"tutto l'anno", q1:'1° quadrimestre', q2:'2° quadrimestre'};
function mode(){ return store.state.settings.mode; }
function gradesP(){ return store.state.grades.filter(function(grade){
  if(store.ui.period==='all') return true;
  return store.ui.period==='q1' ? grade.date<=store.state.settings.cutoff : grade.date>store.state.settings.cutoff;
}); }

/* ---------- Viste ---------- */
export function emptyCard(title,text,btn){
  return '<section class="card empty"><h2>'+esc(title)+'</h2><p>'+esc(text)+'</p>'+(btn||'<button class="btn-primary" type="button" data-a="add">＋ Aggiungi un voto</button>')+'</section>';
}
export function rowHTML(g,showSubject){
  var ask=store.ui.confirmDel===g.id;
  return '<div class="row"><div class="r-date">'+dShort(g.date)+'</div>'+
    '<div class="r-main">'+(showSubject?'<b>'+esc(g.subject)+'</b>':'')+'<span class="tag">'+esc(g.type)+'</span>'+(g.note?'<div class="r-note">'+esc(g.note)+'</div>':'')+'</div>'+
    '<div class="pill '+cls(g.value)+'" title="'+f2(g.value)+'">'+esc(g.label)+'</div>'+
    '<div class="acts">'+(ask?'<span>Eliminare?</span><button class="lnk bad" type="button" data-a="delyes" data-id="'+esc(g.id)+'">Sì</button><button class="lnk" type="button" data-a="delno">No</button>':'<button class="lnk" type="button" data-a="edit" data-id="'+esc(g.id)+'">Modifica</button><button class="lnk" type="button" data-a="del" data-id="'+esc(g.id)+'">Elimina</button>')+'</div></div>';
}

export function viewOverview(){
  var gs=gradesP();
  if(!store.state.grades.length) return emptyCard('Ancora nessun voto','Inserisci il primo voto e qui compaiono la media generale, l\'andamento e le medie per materia.');
  if(!gs.length) return emptyCard('Nessun voto in questo periodo','Per '+PERIOD_LABEL[store.ui.period]+' non c\'è ancora nessun voto.');
  var subj=bySubject(gs), gen=generalAvg(gs,mode()), sorted=gs.slice().sort(cmp), last=sorted[sorted.length-1];
  var low=[], best=null;
  subj.forEach(function(o,n){ if(o.avg<6) low.push(n); if(!best||o.avg>best.o.avg) best={n:n,o:o}; });
  var series=generalSeries(gs,mode()), delta=null;
  if(series.length>1){
    var lt=series[series.length-1], rf=null;
    for(var i=series.length-1;i>=0;i--){ if(series[i].t<=lt.t-14*DAY){ rf=series[i]; break; } }
    if(rf) delta=lt.v-rf.v;
  }
  const segments = Array.from({length:10}, (_, i) =>
    '<rect x="9" y="89" width="29" height="16" rx="5" transform="rotate('+((i+.5)*18)+' 105 105)" style="--i:'+i+'" fill="'+(i<Math.round(gen)?'var(--accent)':'var(--surface-2)')+'"/>'
  ).join('');
  var h='<div class="stack overview"><section class="card dial"><div class="eyebrow">Media generale · '+PERIOD_LABEL[store.ui.period]+'</div>'+
    '<div class="meter"><svg viewBox="0 0 210 110" aria-hidden="true">'+segments+'</svg><strong>'+f2(gen)+'</strong></div>'+
    '<p>'+gs.length+' voti · '+subj.size+' materie</p>'+
    (delta!=null?'<p>'+sgn(delta)+' rispetto a due settimane fa</p>':'')+
    '<button class="btn-primary" data-a="add">＋ Aggiungi voto</button></section>'+
    '<section class="card"><h2>Andamento della media</h2><div id="chTotal"></div></section>';
  const recent=gs.slice().reverse().sort((a,b)=>(b.ts||0)-(a.ts||0)).slice(0,4);
  h+='<section class="card recent"><h2>Ultimi voti inseriti</h2>'+recent.map(g=>rowHTML(g,true)).join('')+'</section>';
  var all=bySubject(gs), q1=bySubject(store.state.grades.filter(function(g){return g.date<=store.state.settings.cutoff;})), q2=bySubject(store.state.grades.filter(function(g){return g.date>store.state.settings.cutoff;}));
  var rows=store.state.subjects.map(function(n){return {n:n,o:all.get(n)};}).sort(function(a,b){return (b.o?b.o.avg:-1)-(a.o?a.o.avg:-1);});
  h+='<section class="card"><h2>Medie per materia</h2><p class="sub">Tocca una materia per vedere il suo andamento.'+(store.ui.period==='all'?' Sotto il nome trovi la media di ogni quadrimestre.':'')+'</p>';
  rows.forEach(function(r){
    var o=r.o, c=o?cls(o.avg):'none';
    var meta=o?(o.n+(o.n===1?' voto':' voti')):'nessun voto';
    if(store.ui.period==='all'&&o){ meta+=' · 1° '+(q1.get(r.n)?f2(q1.get(r.n).avg):'–')+' · 2° '+(q2.get(r.n)?f2(q2.get(r.n).avg):'–'); }
    h+='<button class="subj" type="button" data-a="opensubj" data-s="'+esc(r.n)+'"><span class="s-name"><b>'+esc(r.n)+'</b><small>'+meta+'</small></span>'+
      '<span class="track">'+(o?'<span class="fill '+c+'" style="display:block;width:'+Math.max(2,o.avg*10)+'%"></span>':'')+'<span class="mark6"></span></span>'+
      '<span class="s-avg '+c+'">'+(o?f2(o.avg):'–')+'</span></button>';
  });
  h+='</section></div>';
  return h;
}
export function afterOverview(){
  var gs=gradesP(); if(!gs.length) return;
  var series=generalSeries(gs,mode());
  drawChart($('#chTotal'),{label:'Andamento della media generale',lines:[{pts:series.map(function(p){return {t:p.t,v:p.v};}),area:true}],
    cutoffT:store.ui.period==='all'?ts(store.state.settings.cutoff):null,
    hover:series.map(function(p){return {t:p.t,v:p.v,html:'<b>'+dLong(p.date)+'</b><br>Media <b>'+f2(p.v)+'</b><br><span class="m">'+p.day.map(function(g){return esc(g.subject)+' '+esc(g.label);}).join(', ')+'</span>'};})});
}

export function viewSubject(){
  var gs=gradesP(), m=bySubject(gs);
  if(!store.state.grades.length) return emptyCard('Ancora nessun voto','Quando inserisci i voti puoi guardare ogni materia una per una.');
  if(!store.ui.subject||store.state.subjects.indexOf(store.ui.subject)<0){
    store.ui.subject=store.state.subjects.filter(function(n){return m.has(n);})[0]||store.state.subjects[0];
  }
  var h='<div class="chips" role="group" aria-label="Materia">';
  store.state.subjects.forEach(function(n){
    h+='<button class="chip" type="button" data-a="selsubj" data-s="'+esc(n)+'" aria-pressed="'+(n===store.ui.subject)+'">'+esc(n)+(m.has(n)?'<b>'+f2(m.get(n).avg)+'</b>':'')+'</button>';
  });
  h+='</div>';
  var o=m.get(store.ui.subject);
  if(!o){
    return h+emptyCard('Nessun voto in '+store.ui.subject,'Per '+PERIOD_LABEL[store.ui.period]+' non hai ancora voti in questa materia.','<button class="btn-primary" type="button" data-a="addfor" data-s="'+esc(store.ui.subject)+'">＋ Aggiungi un voto in '+esc(store.ui.subject)+'</button>');
  }
  var list=o.list.slice().sort(cmp), vals=list.map(function(g){return g.value;});
  var mx=Math.max.apply(null,vals), mn=Math.min.apply(null,vals), l3=list.slice(-3), l3avg=l3.reduce(function(a,g){return a+g.value;},0)/l3.length;
  h+='<div class="stats">'+
    '<div class="stat"><span>Media</span><b class="'+cls(o.avg)+'">'+f2(o.avg)+'</b></div>'+
    '<div class="stat"><span>Voti</span><b>'+o.n+'</b></div>'+
    '<div class="stat"><span>Migliore</span><b>'+f2(mx)+'</b></div>'+
    '<div class="stat"><span>Peggiore</span><b class="'+(mn<6?cls(mn):'')+'">'+f2(mn)+'</b></div>'+
    '<div class="stat"><span>Ultimi '+l3.length+(l3.length===1?' voto':' voti')+'</span><b class="'+cls(l3avg)+'">'+f2(l3avg)+'</b></div></div>';
  h+='<div class="stack"><section class="card"><h2>Andamento in '+esc(store.ui.subject)+'</h2><p class="sub">I punti sono i voti, la linea è la media progressiva. La linea tratteggiata indica il 6.</p><div id="chSubj"></div></section>';
  var tp=TYPES.map(function(t){
    var x=list.filter(function(g){return g.type===t;}); if(!x.length) return '';
    return '<span>'+t+' <b>'+f2(x.reduce(function(a,g){return a+g.value;},0)/x.length)+'</b> ('+x.length+')</span>';
  }).filter(Boolean).join('');
  if(tp) h+='<section class="card"><h2>Per tipo di prova</h2><p class="sub">Dove vai meglio: scritto, orale, pratico o laboratorio.</p><p class="types">'+tp+'</p></section>';
  h+='<section class="card"><h2>Tutti i voti</h2><div style="margin-top:8px">'+list.slice().reverse().map(function(g){return rowHTML(g,false);}).join('')+'</div></section></div>';
  return h;
}
export function afterSubject(){
  var gs=gradesP(), m=bySubject(gs), o=m.get(store.ui.subject); if(!o) return;
  var list=o.list.slice().sort(cmp), sum=0, line=[], dots=[], hover=[];
  list.forEach(function(g,i){
    sum+=g.value; var avg=sum/(i+1), t=ts(g.date);
    line.push({t:t,v:avg}); dots.push({t:t,v:g.value,c:cls(g.value)});
    hover.push({t:t,v:g.value,html:'<b>'+dLong(g.date)+'</b><br>Voto <b>'+esc(g.label)+'</b> · '+esc(g.type)+'<br>Media dopo: <b>'+f2(avg)+'</b>'+(g.note?'<br><span class="m">'+esc(g.note)+'</span>':'')});
  });
  const required = neededGrade(list, 'subjects', 'subject', store.ui.subject, 6, 1);
  let message;
  if (required <= 2) message = 'Sufficienza già raggiunta: anche un 2 manterrebbe la media almeno a 6.';
  else if (required > 10) message = 'Con una sola verifica non basta: nemmeno un 10 porterebbe la media a 6.';
  else message = 'Per arrivare a una media di 6 con la prossima verifica, serve almeno ' + fmtGrade(required) + '.';
  drawChart($('#chSubj'),{label:'Andamento in '+store.ui.subject,lines:[{pts:line,area:false}],dots:dots,hover:hover,cutoffT:store.ui.period==='all'?ts(store.state.settings.cutoff):null,annotation:message});
}

export function viewGrades(){
  if(!store.state.grades.length) return emptyCard('Ancora nessun voto','L\'elenco si riempie man mano che aggiungi i voti.');
  var gs=gradesP().filter(function(g){return (!store.ui.fSubject||g.subject===store.ui.fSubject)&&(!store.ui.fType||g.type===store.ui.fType);}).sort(cmp).reverse();
  var h='<section class="card"><div class="filters"><div class="field"><label for="fSubject">Materia</label><select id="fSubject"><option value="">Tutte</option>'+
    store.state.subjects.map(function(n){return '<option value="'+esc(n)+'"'+(n===store.ui.fSubject?' selected':'')+'>'+esc(n)+'</option>';}).join('')+'</select></div>'+
    '<div class="field"><label for="fType">Prova</label><select id="fType"><option value="">Tutte</option>'+
    TYPES.map(function(t){return '<option'+(t===store.ui.fType?' selected':'')+'>'+t+'</option>';}).join('')+'</select></div></div>'+
    '<p class="sub">'+gs.length+(gs.length===1?' voto':' voti')+' · '+PERIOD_LABEL[store.ui.period]+'</p>';
  h+=gs.length?gs.map(function(g){return rowHTML(g,true);}).join(''):'<p class="sub" style="padding:14px 0">Nessun voto con questi filtri.</p>';
  return h+'</section>';
}

export function viewSim(){
  if(!store.state.grades.length) return emptyCard('Ancora nessun voto','Il simulatore calcola che voto ti serve partendo dai voti che hai già inseriti.');
  var m=bySubject(gradesP());
  if(!store.ui.simSubject||store.state.subjects.indexOf(store.ui.simSubject)<0) store.ui.simSubject=store.state.subjects.filter(function(n){return m.has(n);})[0]||store.state.subjects[0];
  if(!store.ui.wiSubject||store.state.subjects.indexOf(store.ui.wiSubject)<0) store.ui.wiSubject=store.ui.simSubject;
  var opts=function(sel){ return store.state.subjects.map(function(n){return '<option value="'+esc(n)+'"'+(n===sel?' selected':'')+'>'+esc(n)+'</option>';}).join(''); };
  return '<div class="stack"><section class="card"><h2>Che voto mi serve?</h2><p class="sub">Calcolato sui voti di '+PERIOD_LABEL[store.ui.period]+'. Scegli il periodo in alto a destra.</p>'+
    '<div class="form-grid"><div class="field"><label for="simGoal">Obiettivo</label><select id="simGoal"><option value="subject"'+(store.ui.simGoal==='subject'?' selected':'')+'>Media di una materia</option><option value="general"'+(store.ui.simGoal==='general'?' selected':'')+'>Media generale</option></select></div>'+
    '<div class="field"><label for="simSubject">'+(store.ui.simGoal==='general'?'Materia in cui prendo i voti':'Materia')+'</label><select id="simSubject">'+opts(store.ui.simSubject)+'</select></div>'+
    '<div class="field"><label for="simTarget">Media da raggiungere</label><input id="simTarget" type="number" inputmode="decimal" min="2" max="10" step="0.1" value="'+store.ui.simTarget+'"></div></div>'+
    '<div id="simOut"></div></section>'+
    '<section class="card"><h2>E se prendo…</h2><p class="sub">Prova un voto prima che arrivi e guarda come cambiano le medie.</p>'+
    '<div class="form-grid"><div class="field"><label for="wiSubject">Materia</label><select id="wiSubject">'+opts(store.ui.wiSubject)+'</select></div>'+
    '<div class="field"><label for="wiGrade">Voto <span class="hint">es. 7, 6½, 5+</span></label><input id="wiGrade" type="text" autocomplete="off" maxlength="6" value="'+esc(store.ui.wiGrade)+'"></div></div>'+
    '<div id="wiOut"></div></section></div>';
}
export function simOut(){
  var el=$('#simOut'); if(!el) return;
  var gs=gradesP(), T=store.ui.simTarget, sub=store.ui.simSubject;
  if(!(T>=2&&T<=10)){ el.innerHTML='<p class="err">Inserisci una media tra 2 e 10.</p>'; return; }
  var cur=store.ui.simGoal==='subject'?(bySubject(gs).get(sub)?bySubject(gs).get(sub).avg:null):generalAvg(gs,mode());
  var cnt=bySubject(gs).get(sub)?bySubject(gs).get(sub).n:0;
  var h='<p class="now">'+(store.ui.simGoal==='subject'?'Ora in '+esc(sub)+': '+(cur==null?'nessun voto':'media <b class="num">'+f2(cur)+'</b> su '+cnt+(cnt===1?' voto':' voti')):'Ora: media generale <b class="num">'+f2(cur)+'</b>')+' · obiettivo <b class="num">'+f2(T)+'</b></p><div class="sim-grid">';
  [1,2,3].forEach(function(n){
    var x=neededGrade(gs,mode(),store.ui.simGoal,sub,T,n), t=n===1?'Con 1 voto':'Con '+n+' voti uguali';
    if(x<=2+1e-9){ h+='<div class="sim"><span>'+t+'</span><b class="ok">Già ok</b><small>con il voto minimo raggiungi almeno '+f2(T)+'</small></div>'; }
    else if(x>10+1e-9){
      var best=store.ui.simGoal==='subject'?generalAvg(withGrades(gs.filter(function(g){return g.subject===sub;}),sub,10,n),'all'):generalAvg(withGrades(gs,sub,10,n),mode());
      h+='<div class="sim"><span>'+t+'</span><b class="bad">Non basta</b><small>con '+(n===1?'un 10':n+' dieci')+' arrivi a '+f2(best)+'</small></div>';
    } else {
      h+='<div class="sim"><span>'+t+'</span><b class="'+(x<=6.5?'ok':x<=8.5?'warn':'bad')+'">'+fmtGrade(x)+'</b><small>serve almeno '+f2(x)+(n>1?' in ognuno':'')+'</small></div>';
    }
  });
  el.innerHTML=h+'</div>';
}
export function wiOut(){
  var el=$('#wiOut'); if(!el) return;
  var p=parseGrade(store.ui.wiGrade);
  if(!p){ el.innerHTML='<p class="sub" style="margin-top:12px">Scrivi un voto da 2 a 10, per esempio 7, 6½ o 5+.</p>'; return; }
  var gs=gradesP(), sub=store.ui.wiSubject, h2=withGrades(gs,sub,p.value,1);
  var s0=bySubject(gs).get(sub), s1=bySubject(h2).get(sub), g0=generalAvg(gs,mode()), g1=generalAvg(h2,mode());
  function line(name,a,b){
    var d=a==null?null:b-a;
    return '<div><span>'+name+'</span><span>'+(a==null?'–':'<b class="num">'+f2(a)+'</b>')+' → <b class="num">'+f2(b)+'</b>'+(d==null?'':' <span class="'+(d>=0?'up':'down')+'">('+sgn(d)+')</span>')+'</span></div>';
  }
  el.innerHTML='<div class="wi">'+line('Media '+esc(sub),s0?s0.avg:null,s1.avg)+line('Media generale',g0,g1)+'</div>';
}

/**
 * Pagella: confronto fra primo quadrimestre, secondo quadrimestre e intero anno.
 * Il voto proposto è la media della materia arrotondata all'intero più vicino.
 */
export function viewReportCard(){
  if (!store.state.grades.length) return emptyCard('Nessun voto ancora', 'Aggiungi alcuni voti per vedere una stima della tua pagella.');

  const cutoff = store.state.settings.cutoff;
  const first = store.state.grades.filter(grade => grade.date <= cutoff);
  const second = store.state.grades.filter(grade => grade.date > cutoff);
  const all = store.state.grades.slice();
  const averages = [
    {label: '1° quadrimestre', grades: first},
    {label: '2° quadrimestre', grades: second},
    {label: 'Anno completo', grades: all}
  ];

  let html = '<div class="stack report-page">';
  html += '<section class="card"><div class="section-heading"><div><h2>Riepilogo generale</h2><p class="sub">Medie calcolate con il criterio selezionato nelle impostazioni.</p></div></div><div class="report-summary">';
  averages.forEach(function (period) {
    const average = generalAvg(period.grades, mode());
    html += '<div class="report-summary-item"><span>' + period.label + '</span><strong class="' + (average == null ? '' : cls(average)) + '">' + f2(average) + '</strong></div>';
  });
  html += '</div></section>';

  html += '<section class="card"><h2>Voti per materia</h2><p class="sub">Ogni cella mostra la media e il voto intero suggerito. La Pagella presenta tutti e tre i periodi insieme.</p>';
  html += '<div class="report-table" role="table" aria-label="Stima della pagella">';
  html += '<div class="report-head" role="row"><div role="columnheader">Materia</div>' + averages.map(p => '<div role="columnheader">' + p.label + '</div>').join('') + '</div>';

  store.state.subjects.forEach(function (subject) {
    const cells = averages.map(function (period) {
      const entry = bySubject(period.grades).get(subject);
      if (!entry) return '<div class="report-cell report-empty" role="cell" data-label="' + period.label + '"><span>—</span><small>Nessun voto</small></div>';
      return '<div class="report-cell" role="cell" data-label="' + period.label + '"><strong class="' + cls(entry.avg) + '">' + f2(entry.avg) + '</strong><small>Voto suggerito <b>' + Math.round(entry.avg) + '</b></small></div>';
    }).join('');
    html += '<div class="report-row" role="row"><div class="report-subject" role="rowheader">' + esc(subject) + '</div>' + cells + '</div>';
  });

  html += '</div><p class="report-disclaimer">Stima indicativa: il voto effettivo in pagella dipende anche dalla valutazione del docente e non è determinato automaticamente dalla sola media aritmetica.</p></section></div>';
  return html;
}

export function viewSettings(){
  var cnt=bySubject(store.state.grades), h='<div class="grid2">';
  h+='<section class="card wide"><h2>Grafica</h2><p class="sub">Scegli il tema dell&#39;applicazione. La preferenza viene salvata su questo dispositivo.</p><div class="theme-options"><button class="theme-option" type="button" data-a="theme" data-theme="dark" aria-pressed="'+(getTheme()==='dark')+'"><span class="theme-swatch theme-dark"></span><span>Scuro</span></button><button class="theme-option" type="button" data-a="theme" data-theme="light" aria-pressed="'+(getTheme()==='light')+'"><span class="theme-swatch theme-light"></span><span>Chiaro</span></button></div>'+preferenceControls()+'</section>';
  h+='<h2 class="settings-group">Scuola</h2><section class="card"><h2>Quadrimestri</h2><p class="sub">I voti fino a questa data (compresa) vanno nel 1° quadrimestre, gli altri nel 2°.</p><div class="field"><label for="setCut">Il 1° quadrimestre finisce il</label><input id="setCut" type="date" value="'+esc(store.state.settings.cutoff)+'"></div></section>';
  h+='<section class="card"><h2>Media generale</h2><p class="sub">Come viene calcolato il numero grande in Panoramica.</p>'+
    '<label class="radio"><input type="radio" name="gmode" value="subjects"'+(mode()==='subjects'?' checked':'')+'><span>Media delle medie di materia<small>Come in pagella: ogni materia pesa uguale.</small></span></label>'+
    '<label class="radio"><input type="radio" name="gmode" value="all"'+(mode()==='all'?' checked':'')+'><span>Media di tutti i voti<small>Le materie con più voti pesano di più.</small></span></label></section>';
  h+='<section class="card wide"><h2>Materie</h2><p class="sub">Puoi togliere una materia solo se non ha voti.</p>';
  store.state.subjects.forEach(function(n){
    var c=cnt.get(n)?cnt.get(n).n:0;
    h+='<div class="srow"><span>'+esc(n)+' <small>'+(c?c+(c===1?' voto':' voti'):'nessun voto')+'</small></span>'+(c?'<span></span>':'<button class="lnk bad" type="button" data-a="subjdel" data-s="'+esc(n)+'">Rimuovi</button>')+'</div>';
  });
  h+='<div class="addrow"><input id="setNewSubj" type="text" maxlength="40" placeholder="Nuova materia" aria-label="Nome della nuova materia" autocomplete="off"><button class="btn" type="button" data-a="subjadd">Aggiungi</button></div></section>';
  h+='<h2 class="settings-group">Dati e account</h2><section class="card wide"><h2>I tuoi dati</h2><p class="sub" id="storageNote">'+store.storageText()+'</p>'+
    '<div class="panel-actions" style="margin:0 0 14px"><button class="btn" type="button" data-a="exportjson">Scarica una copia (JSON)</button><button class="btn" type="button" data-a="importpick">Carica da un file</button><input id="impFile" type="file" accept="application/json,.json" hidden></div>'+
    (store.ui.pendingImport?'<p style="margin:0 0 10px">Il file contiene <b>'+store.ui.pendingImport.grades.length+'</b> voti. Sostituire i dati attuali?</p><div class="panel-actions" style="margin:0 0 14px"><button class="btn-primary" type="button" data-a="importyes">Sì, sostituisci</button><button class="btn" type="button" data-a="importno">Annulla</button></div>':'')+
    (store.ui.confirmClear?'<p style="margin:0 0 10px">Eliminare tutti i voti? Non si può annullare.</p><button class="btn btn-danger" type="button" data-a="clearyes">Sì, elimina tutto</button> <button class="btn" type="button" data-a="clearno">Annulla</button>':'<button class="btn btn-danger" type="button" data-a="clearask">Elimina tutti i voti</button>')+'</section>';
  h+='<section class="card wide danger-zone"><h2>Account e privacy</h2><button class="btn" data-a="privacy">Privacy e copyright</button>';
  if (store.user) {
    h+='<p class="sub">Account collegato: <b>' + esc(store.user.email || 'Google') + '</b>. Eliminando l&#39;account verrà eliminato anche il documento dei voti dal database Firebase. L&#39;operazione non si può annullare.</p>';
    h+=store.ui.confirmAccountDelete ? '<div class="confirm-box"><p><strong>Confermi l&#39;eliminazione definitiva?</strong> '+(store.user.providerData.some(p=>p.providerId==='password')?'<label>Password attuale <input type="password" id="confirmPassword" autocomplete="current-password"></label>':'')+' Dovrai autenticarti nuovamente per continuare. Tutti i voti sincronizzati verranno cancellati.</p><button class="btn-danger btn" type="button" data-a="accountdeleteyes">Conferma eliminazione</button> <button class="btn" type="button" data-a="accountdeleteno">Annulla</button></div>' : '<button class="btn btn-danger" type="button" data-a="accountdeleteask">Elimina account e dati</button>';
  } else {
    h+='<p class="sub">Accedi al tuo account per poter eliminare l&#39;account e i dati associati al database.</p>';
  }
  h+='</section>';
  return h+'</div>';
}


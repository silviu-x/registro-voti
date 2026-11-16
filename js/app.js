/** Avvio dell'app: stato, coordinamento schermate, form ed eventi UI. */
import {FIREBASE_CONFIG, FB_VERSION} from './firebase-config.js';
import {TYPES, defaultState, normalize} from './data.js';
import {parseGrade} from './calculations.js';
import {newId, $, esc, f2, cls, todayISO} from './utils.js';
import {store} from './store.js';
import {drawChart, resetCharts} from './charts.js';
import {setTheme, initTheme} from './theme.js';
import {initializeFirebase, isFirebaseReady, signInWithGoogle, signOutCurrentUser, saveUserData, deleteCurrentAccount, isDeletingAccount, wasDocumentDeletedOnLastAttempt} from './firebase.js';
import {emptyCard, rowHTML, viewOverview, afterOverview, viewSubject, afterSubject, viewGrades, viewSim, simOut, wiOut, viewSettings, viewReportCard} from './pages.js';

const LS_KEY = 'registro-voti-v1';
const FB_VER = FB_VERSION;
const TABS = [['panoramica','Panoramica'],['materie','Materie'],['voti','Voti'],['pagella','Pagella'],['simulatore','Simulatore'],['impostazioni','Impostazioni']];
const PERIODS = [['all','Anno'],['q1','1° quadr.'],['q2','2° quadr.']];
const PERIOD_LABEL = {all:"tutto l'anno", q1:'1° quadrimestre', q2:'2° quadrimestre'};

// Stato locale separato per ospite e per UID: un account non può ritrovarsi
// sullo schermo la cache locale lasciata da un altro account Google.
let currentStorageKey = LS_KEY + ':guest';
function localLoad() {
  try { const raw = localStorage.getItem(currentStorageKey); return raw ? JSON.parse(raw) : null; }
  catch (error) { return null; }
}
function localSave() {
  try { localStorage.setItem(currentStorageKey, JSON.stringify(state)); }
  catch (error) { /* Lo spazio locale può essere disabilitato: il cloud continua a funzionare. */ }
}
function replaceState(nextState) {
  Object.keys(state).forEach(key => { delete state[key]; });
  Object.assign(state, nextState);
  store.state = state;
}
const initialState = localLoad();
const state = initialState ? normalize(initialState) : defaultState();
store.state = state;

let saving = false;
let pending = false;
let saveTimer = null;
let syncTimer = null;
let syncMode = 'connecting';
let user = null;
let deletingLocally = false;

function setSync(mode) {
  syncMode = mode;
  const element = $('#sync');
  if (!element) return;
  const labels = {
    connecting: ['busy','Connessione…'], busy: ['busy','Salvataggio…'],
    ok: ['ok','Sincronizzato con il tuo account'],
    signedout: ['','Non sincronizzato: accedi per salvare online'],
    nofb: ['','Modalità locale: Firebase non configurato'],
    local: ['','Salvato solo su questo dispositivo'],
    late: ['busy','Server non raggiungibile: voti salvati su questo dispositivo'],
    err: ['err','Salvataggio online non riuscito, riprovo al prossimo voto']
  };
  const label = labels[mode] || labels.local;
  element.className = 'sync ' + label[0];
  element.lastElementChild.textContent = label[1];
  const note = $('#storageNote');
  if (note) note.textContent = storageText();
}

function storageText() {
  if (syncMode === 'ok' || syncMode === 'busy') return 'I voti sono salvati online nel tuo account Google, privati, e si sincronizzano su tutti i dispositivi dove accedi.';
  if (syncMode === 'signedout') return 'Per ora i voti sono solo su questo dispositivo. Accedi con Google per salvarli online e ritrovarli sull’altro dispositivo.';
  if (syncMode === 'nofb') return 'Firebase non è ancora configurato: i voti restano solo su questo browser. Segui la guida README.md per attivare la sincronizzazione.';
  return 'Per ora i voti sono salvati solo su questo dispositivo.';
}
store.storageText = storageText;

function renderAcct() {
  const element = $('#acct');
  if (!element) return;
  if (!isFirebaseReady()) { element.innerHTML = ''; return; }
  element.innerHTML = user
    ? '<button class="btn" type="button" data-a="signout" title="' + esc(user.email || '') + '">Esci</button>'
    : '<button class="btn" type="button" data-a="signin">Accedi con Google</button>';
}

function flush() {
  if (!user || !isFirebaseReady() || isDeletingAccount()) return;
  if (saving) { pending = true; return; }
  saving = true;
  setSync('busy');
  (function saveLoop() {
    pending = false;
    saveUserData(JSON.parse(JSON.stringify(state))).then(function () {
      if (pending) return saveLoop();
      saving = false;
      setSync('ok');
    }).catch(function () {
      saving = false;
      setSync('err');
    });
  })();
}

function commit() {
  state.savedAt = Date.now();
  localSave();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 350);
}

function onRemote(snapshot) {
  clearTimeout(syncTimer);
  if (isDeletingAccount() || deletingLocally || snapshot.metadata.hasPendingWrites) return;
  const remoteData = snapshot.exists() ? snapshot.data() : null;
  const fromCache = snapshot.metadata.fromCache;
  if (remoteData) {
    const remoteState = normalize(remoteData);
    if (remoteState.savedAt > state.savedAt) {
      replaceState(remoteState);
      localSave();
      renderAll();
    } else if (remoteState.savedAt < state.savedAt && !fromCache) {
      flush();
    }
  } else if (!fromCache && state.savedAt > 0) {
    // Una cache locale di QUESTO UID può essere sincronizzata se il documento non esiste.
    // La chiave locale è specifica per account; non può ripristinare i dati di un altro utente.
    flush();
  }
  if (fromCache) syncTimer = setTimeout(() => setSync('late'), 10000);
  if (!saving) setSync(fromCache ? 'connecting' : 'ok');
}

function onUserChanged(nextUser) {
  clearTimeout(saveTimer);
  clearTimeout(syncTimer);
  saving = false;
  pending = false;
  user = nextUser;
  store.user = nextUser;
  currentStorageKey = LS_KEY + (nextUser ? ':user:' + nextUser.uid : ':guest');
  const cached = localLoad();
  replaceState(cached ? normalize(cached) : defaultState());
  renderAcct();
  renderAll();
  if (nextUser) {
    setSync('connecting');
    syncTimer = setTimeout(() => setSync('late'), 10000);
  } else {
    setSync('signedout');
  }
}

function initDb() {
  initializeFirebase(FIREBASE_CONFIG, FB_VER, {
    onUser: onUserChanged,
    onSnapshot: onRemote,
    onStatus: setSync
  }).catch(function () {
    setSync('local');
    renderAcct();
  });
}

const ui = {tab:'panoramica',period:'all',subject:null,fSubject:'',fType:'',confirmDel:null,confirmClear:false,confirmAccountDelete:false,pendingImport:null,editId:null,formOpen:false,lastSubject:null,simGoal:'subject',simSubject:null,simTarget:6,wiSubject:null,wiGrade:'7'};
store.ui = ui;

function openForm(id,subject){
  ui.editId=id||null; ui.formOpen=true;
  var g=id?state.grades.filter(function(x){return x.id===id;})[0]:null;
  var sel=g?g.subject:(subject||ui.lastSubject||ui.subject||state.subjects[0]);
  var h='<form id="gradeForm" class="card panel" novalidate><div class="panel-head"><h2>'+(g?'Modifica voto':'Nuovo voto')+'</h2><button class="lnk" type="button" data-a="closeform">Chiudi</button></div><div class="form-grid">'+
    '<div class="field"><label for="frmSubject">Materia</label><select id="frmSubject">'+state.subjects.map(function(n){return '<option value="'+esc(n)+'"'+(n===sel?' selected':'')+'>'+esc(n)+'</option>';}).join('')+'<option value="__new">＋ Nuova materia…</option></select></div>'+
    '<div class="field" id="newWrap" hidden><label for="frmNew">Nome della materia</label><input id="frmNew" type="text" maxlength="40" autocomplete="off"></div>'+
    '<div class="field wide"><label for="frmGrade">Voto <span class="hint">7, 7+, 7½, 6-, 5/6</span></label><input id="frmGrade" type="text" maxlength="6" autocomplete="off" value="'+(g?esc(g.label):'')+'"><div class="keys">'+
    [4,5,6,7,8,9,10].map(function(k){return '<button class="key" type="button" data-a="key" data-k="'+k+'">'+k+'</button>';}).join('')+'<span class="sep"></span>'+
    '<button class="key m" type="button" data-a="mod" data-m="-" aria-label="meno">−</button><button class="key m" type="button" data-a="mod" data-m="½" aria-label="e mezzo">½</button><button class="key m" type="button" data-a="mod" data-m="+" aria-label="più">+</button></div></div>'+
    '<div class="field"><label for="frmDate">Data</label><input id="frmDate" type="date" value="'+(g?esc(g.date):todayISO())+'"></div>'+
    '<div class="field"><label for="frmType">Prova</label><select id="frmType">'+TYPES.map(function(t){return '<option'+(g&&g.type===t?' selected':'')+'>'+t+'</option>';}).join('')+'</select></div>'+
    '<div class="field wide"><label for="frmNote">Note <span class="hint">argomento o commento</span></label><input id="frmNote" type="text" maxlength="120" autocomplete="off" value="'+(g?esc(g.note):'')+'"></div></div>'+
    '<p class="err" id="frmErr" role="alert" hidden></p><div class="panel-actions"><button class="btn-primary" type="submit">Salva</button>'+(g?'':'<button class="btn" type="button" data-a="savemore">Salva e aggiungi un altro</button>')+'</div></form>';
  $('#formHost').innerHTML=h;
  $('#frmGrade').focus();
  var gf=$('#gradeForm'); if(gf.scrollIntoView) gf.scrollIntoView({block:'nearest'});
}
function closeForm(){ ui.formOpen=false; ui.editId=null; $('#formHost').innerHTML=''; }
function formErr(msg){ var e=$('#frmErr'); e.textContent=msg; e.hidden=false; }
function saveForm(more){
  var sv=$('#frmSubject').value, subject=sv;
  if(sv==='__new'){
    subject=$('#frmNew').value.trim();
    if(!subject) return formErr('Scrivi il nome della materia.');
  }
  var p=parseGrade($('#frmGrade').value);
  if(!p){
    var raw=$('#frmGrade').value.trim();
    return formErr(raw?'Voto non valido. Usa un numero da 1 a 10, anche 7+, 7½, 6- oppure 5/6.':'Scrivi il voto.');
  }
  var date=$('#frmDate').value;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) return formErr('Scegli la data della prova.');
  var type=$('#frmType').value, note=$('#frmNote').value.trim();
  if (!ui.editId && state.grades.length >= 500) return formErr('Hai raggiunto il limite di 500 voti salvabili online.');
  var ex=state.subjects.filter(function(n){return n.toLowerCase()===subject.toLowerCase();})[0];
  if(ex) subject=ex; else { if(state.subjects.length >= 60) return formErr('Hai raggiunto il limite di 60 materie.'); state.subjects.push(subject); }
  if(state.demo){ state.grades=state.grades.filter(function(g){return !g.demo;}); state.demo=false; }
  var target=ui.editId?state.grades.filter(function(x){return x.id===ui.editId;})[0]:null;
  if(target){ target.subject=subject; target.value=p.value; target.label=p.label; target.date=date; target.type=type; target.note=note; }
  else { state.grades.push({id:newId(),subject:subject,value:p.value,label:p.label,date:date,type:type,note:note,ts:Date.now()}); }
  ui.lastSubject=subject; commit();
  if(more&&!ui.editId){
    renderAll(); openForm(null,subject);
    $('#frmDate').value=date; $('#frmType').value=type;
    toast('Voto salvato');
  } else { var wasEdit=!!ui.editId; closeForm(); renderAll(); toast(wasEdit?'Voto aggiornato':'Voto salvato'); }
}

function renderChrome(){
  $('#tabs').innerHTML = TABS.map(function(tab){
    return '<button class="tab" type="button" data-a="tab" data-t="' + tab[0] + '"' + (ui.tab === tab[0] ? ' aria-current="page"' : '') + '>' + tab[1] + '</button>';
  }).join('');
  $('#seg').innerHTML = PERIODS.map(function(period){
    return '<button type="button" data-a="period" data-p="' + period[0] + '" aria-pressed="' + (ui.period === period[0]) + '">' + period[1] + '</button>';
  }).join('');
  $('#banner').innerHTML = state.demo ? '<div class="demo"><span><b>Dati di esempio.</b> Spariscono quando inserisci il tuo primo voto.</span><button class="btn" type="button" data-a="democlear">Inizia con i miei voti</button></div>' : '';
  const date = new Date(), year = date.getMonth() >= 8 ? date.getFullYear() : date.getFullYear() - 1;
  $('#yearLine').textContent = 'Anno scolastico ' + year + '/' + String(year + 1).slice(2);
  renderAcct();
}

function renderTab(){
  resetCharts();
  const host = $('#view');
  let html;
  if (ui.tab === 'materie') html = viewSubject();
  else if (ui.tab === 'voti') html = viewGrades();
  else if (ui.tab === 'pagella') html = viewReportCard();
  else if (ui.tab === 'simulatore') html = viewSim();
  else if (ui.tab === 'impostazioni') html = viewSettings();
  else html = viewOverview();
  host.innerHTML = html;
  if (ui.tab === 'panoramica') afterOverview();
  else if (ui.tab === 'materie') afterSubject();
  else if (ui.tab === 'simulatore') { simOut(); wiOut(); }
}
function renderAll(){ renderChrome(); renderTab(); setSync(syncMode); }
let toastTimer = null;
function toast(message){
  const element = $('#toast');
  element.textContent = message;
  element.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { element.hidden = true; }, 2400);
}
function go(tab){
  if (location.hash === '#' + tab) { ui.tab = tab; ui.confirmDel = null; renderAll(); }
  else location.hash = tab;
}
function onHash(){
  const tab = location.hash.slice(1);
  if (TABS.some(item => item[0] === tab)) {
    ui.tab = tab;
    ui.confirmDel = null;
    ui.confirmClear = false;
    renderAll();
    window.scrollTo(0, 0);
  }
}

function addSubject(name){
  name=name.trim(); if(!name) return false;
  if(state.subjects.some(function(n){return n.toLowerCase()===name.toLowerCase();}) || state.subjects.length>=60) return false;
  state.subjects.push(name); commit(); return true;
}
var actions={
  tab:function(b){ go(b.dataset.t); },
  signin:function(){
    signInWithGoogle().catch(function(error){
      const code = error && error.code ? String(error.code) : '';
      if (/popup-closed|cancelled/.test(code)) return;
      toast('Accesso non riuscito' + (code ? ' (' + code + ')' : ''));
    });
  },
  signout:function(){ signOutCurrentUser().catch(function(){ toast('Non è stato possibile uscire.'); }); },
  theme:function(button){ setTheme(button.dataset.theme); renderTab(); },
  accountdeleteask:function(){ ui.confirmAccountDelete=true; renderTab(); },
  accountdeleteno:function(){ ui.confirmAccountDelete=false; renderTab(); },
  accountdeleteyes:async function(){
    if (!user) return;
    const removedKey = currentStorageKey;
    clearTimeout(saveTimer);
    clearTimeout(syncTimer);
    saving = false;
    pending = false;
    deletingLocally = true;
    ui.confirmAccountDelete = false;
    renderTab();
    toast('Verifica il tuo account Google per continuare…');
    try {
      await deleteCurrentAccount();
      try { localStorage.removeItem(removedKey); localStorage.removeItem(LS_KEY); } catch (error) { /* ignorato */ }
      deletingLocally = false;
      toast('Account e dati eliminati. Aggiornamento…');
      window.setTimeout(function(){ window.location.reload(); }, 1100);
    } catch (error) {
      deletingLocally = false;
      const code = error && error.code ? String(error.code) : '';
      if (wasDocumentDeletedOnLastAttempt()) {
        // Il documento remoto è stato eliminato, ma Firebase Authentication non ha
        // completato la cancellazione. Non ripristinare la vecchia cache locale.
        try { localStorage.removeItem(removedKey); localStorage.removeItem(LS_KEY); } catch (storageError) { /* ignorato */ }
        replaceState(defaultState());
        toast('I voti nel database sono stati eliminati, ma l’account non è stato cancellato. Riprova.');
        window.setTimeout(function(){ window.location.reload(); }, 1800);
      } else {
        renderAll();
        if (/popup-closed|cancelled/.test(code)) toast('Eliminazione annullata.');
        else if (code === 'auth/requires-recent-login') toast('Accedi nuovamente con Google e riprova.');
        else toast('Eliminazione non riuscita' + (code ? ' (' + code + ')' : '') + '.');
      }
    }
  },
  exportjson:function(){
    var blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}), a=document.createElement('a');
    a.href=URL.createObjectURL(blob); a.download='registro-voti-'+todayISO()+'.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(a.href); },1500);
  },
  importpick:function(){ var i=$('#impFile'); if(i) i.click(); },
  importyes:function(){
    if(!ui.pendingImport) return;
    replaceState(ui.pendingImport); state.demo=false; ui.pendingImport=null;
    commit(); renderAll(); toast('Dati caricati');
  },
  importno:function(){ ui.pendingImport=null; renderTab(); },
  period:function(b){ ui.period=b.dataset.p; renderAll(); },
  add:function(){ openForm(null); },
  addfor:function(b){ openForm(null,b.dataset.s); },
  edit:function(b){ openForm(b.dataset.id); },
  closeform:function(){ closeForm(); },
  key:function(b){ var i=$('#frmGrade'); i.value=b.dataset.k; i.focus(); },
  mod:function(b){
    var i=$('#frmGrade'), m=/^(\d{1,2})/.exec(i.value.trim()); if(!m) return;
    var cur=i.value.trim().slice(m[1].length); i.value=m[1]+(cur===b.dataset.m?'':b.dataset.m); i.focus();
  },
  savemore:function(){ saveForm(true); },
  del:function(b){ ui.confirmDel=b.dataset.id; renderTab(); },
  delno:function(){ ui.confirmDel=null; renderTab(); },
  delyes:function(b){
    state.grades=state.grades.filter(function(g){return g.id!==b.dataset.id;});
    ui.confirmDel=null; commit(); renderAll(); toast('Voto eliminato');
  },
  selsubj:function(b){ ui.subject=b.dataset.s; renderTab(); },
  opensubj:function(b){ ui.subject=b.dataset.s; go('materie'); },
  democlear:function(){ state.grades=state.grades.filter(function(g){return !g.demo;}); state.demo=false; commit(); renderAll(); },
  subjadd:function(){ var i=$('#setNewSubj'); if(addSubject(i.value)) renderTab(); else { i.focus(); } },
  subjdel:function(b){ state.subjects=state.subjects.filter(function(n){return n!==b.dataset.s;}); commit(); renderTab(); },
  clearask:function(){ ui.confirmClear=true; renderTab(); },
  clearno:function(){ ui.confirmClear=false; renderTab(); },
  clearyes:function(){ state.grades=[]; state.demo=false; ui.confirmClear=false; commit(); renderAll(); toast('Voti eliminati'); }
};
document.addEventListener('click',function(e){
  var b=e.target.closest('[data-a]'); if(!b) return;
  var f=actions[b.dataset.a]; if(f) f(b,e);
});
document.addEventListener('submit',function(e){ if(e.target.id==='gradeForm'){ e.preventDefault(); saveForm(false); } });
document.addEventListener('change',function(e){
  var id=e.target.id, v=e.target.value;
  if(id==='impFile'){
    var fl=e.target.files&&e.target.files[0]; if(!fl) return;
    if(fl.size > 1024 * 1024){ toast('Il file supera il limite di 1 MB.'); e.target.value=''; return; }
    fl.text().then(function(t){
      try{ var d=JSON.parse(t); if(!d||!Array.isArray(d.grades)||d.grades.length>500||(Array.isArray(d.subjects)&&d.subjects.length>60)) throw new Error('bad'); ui.pendingImport=normalize(d); renderTab(); }
      catch(err){ toast('File non valido'); }
    });
    return;
  }
  if(id==='frmSubject'){ $('#newWrap').hidden=v!=='__new'; if(v==='__new') $('#frmNew').focus(); }
  else if(id==='fSubject'){ ui.fSubject=v; renderTab(); }
  else if(id==='fType'){ ui.fType=v; renderTab(); }
  else if(id==='simGoal'){ ui.simGoal=v; renderTab(); }
  else if(id==='simSubject'){ ui.simSubject=v; simOut(); }
  else if(id==='wiSubject'){ ui.wiSubject=v; wiOut(); }
  else if(id==='setCut'){ if(/^\d{4}-\d{2}-\d{2}$/.test(v)){ state.settings.cutoff=v; commit(); toast('Data salvata'); } }
  else if(e.target.name==='gmode'){ state.settings.mode=v; commit(); toast('Calcolo aggiornato'); }
});
document.addEventListener('input',function(e){
  var id=e.target.id, v=e.target.value;
  if(id==='simTarget'){ var n=parseFloat(String(v).replace(',','.')); ui.simTarget=isNaN(n)?0:n; simOut(); }
  else if(id==='wiGrade'){ ui.wiGrade=v; wiOut(); }
});
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'&&ui.formOpen) closeForm();
  if(e.key==='Enter'&&e.target.id==='setNewSubj'){ e.preventDefault(); actions.subjadd(); }
});
/* ---------- Avvio ---------- */
function start(){
  initTheme();
  const tab = location.hash.slice(1);
  if (TABS.some(item => item[0] === tab)) ui.tab = tab;
  renderAll();
  setSync('connecting');
  initDb();
}
window.addEventListener('hashchange', onHash);
start();

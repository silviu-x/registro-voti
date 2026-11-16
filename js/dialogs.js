import {read,remember} from './preferences.js';
import {emailAccount} from './firebase.js';
import {privacyContact} from './privacy-config.js';
function modal(title,body){
  const dialog=document.createElement('dialog');
  dialog.setAttribute('aria-label',title);
  dialog.innerHTML='<h2>'+title+'</h2>'+body;
  document.body.append(dialog);
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  dialog.showModal();
  return dialog;
}
export function showPrivacy(done){
  const first=typeof done==='function';
  const d=modal('Privacy e copyright',`
    <p>In modalità ospite, voti, materie, date e note restano in questo browser. Anche tema, dimensione del testo e presa visione vengono ricordati sul dispositivo.</p>
    <p>Se accedi, Google Firebase gestisce l’autenticazione e Firestore conserva i dati del registro associati al tuo identificativo. La sincronizzazione serve a ritrovare i voti sui tuoi dispositivi. La password viene inviata al servizio di autenticazione, senza essere salvata nel registro.</p>
    <details><summary>Conservazione, diritti e fornitori</summary>
    <p>L’hosting riceve dati tecnici di connessione, come l’indirizzo IP. Il registro utilizza la memoria del browser per le funzioni richieste. Non include strumenti pubblicitari o di analisi del pubblico.</p>
    <p>La gestione dell’account e della sincronizzazione è necessaria per fornire il servizio richiesto. I dati del registro restano nel cloud fino alla cancellazione. Puoi correggerli, esportarli o eliminare l’account dalle impostazioni. Le copie locali su altri dispositivi e i file esportati si cancellano separatamente.</p>
    <p>Puoi chiedere accesso, rettifica, cancellazione, limitazione e, quando applicabile, portabilità dei dati. Puoi presentare un reclamo al Garante.</p>
    <p class="contact"></p><p><a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener">Privacy e trattamento dei dati in Firebase</a> · <a href="https://www.garanteprivacy.it/" target="_blank" rel="noopener">Garante Privacy</a></p></details>
    <p>© Registro Voti. I contenuti inseriti restano dei rispettivi autori. Marchi e componenti di terzi appartengono ai rispettivi titolari.</p>
    <button class="btn-primary">Ho letto e continuo</button>`);
  d.querySelector('.contact').textContent=privacyContact||'Informativa in bozza: i recapiti del titolare devono essere completati dal gestore.';
  if(first)d.addEventListener('cancel',e=>e.preventDefault());
  d.querySelector('button').onclick=()=>{remember('privacy-v1','ok');d.close();if(first)done();};
}
export function welcome(start,settings){
  function enter(){
    start();
    if(read('welcome','')==='seen')return;
    const d=modal('Il tuo registro, come lo preferisci','<p>In Impostazioni → Grafica puoi cambiare tema, gradiente e dimensione del testo.</p><div class="panel-actions"><button class="btn-primary">Apri impostazioni</button><button class="btn">Continua</button></div>');
    d.onclose=()=>remember('welcome','seen');
    d.querySelector('.btn-primary').onclick=()=>{d.close();settings();};
    d.querySelector('.btn').onclick=()=>d.close();
  }
  if(read('privacy-v1','')==='ok')enter();else showPrivacy(enter);
}
export function openEmail(){
  const d=modal('Account con email','<form><label>Operazione<select name="mode"><option value="login">Accedi</option><option value="register">Crea account</option><option value="reset">Recupera password</option></select></label><label>Email<input name="email" type="email" required autocomplete="email"></label><label>Password<input name="password" type="password" required autocomplete="current-password"></label><p role="status"></p><div class="panel-actions"><button class="btn-primary">Accedi</button><button type="button" class="btn">Chiudi</button></div></form>');
  const f=d.querySelector('form'), {mode,email,password}=f.elements, status=f.querySelector('[role=status]'),submit=f.querySelector('.btn-primary');
  mode.onchange=()=>{password.required=mode.value!=='reset';password.parentElement.hidden=!password.required;password.autocomplete=mode.value==='register'?'new-password':'current-password';submit.textContent=mode.selectedOptions[0].text;status.textContent='';};
  f.querySelector('.btn').onclick=()=>d.close();
  f.onsubmit=async e=>{e.preventDefault();const task=mode.value;submit.disabled=true;mode.disabled=true;
    try{await emailAccount(task,email.value.trim(),password.value);if(task==='reset')status.textContent='Se l’indirizzo è registrato, controlla la tua posta.';else d.close();}
    catch(err){status.textContent=err.code==='auth/weak-password'?'Scegli una password più robusta.':err.code==='auth/operation-not-allowed'?'Accesso email non abilitato dal gestore.':'Operazione non riuscita. Controlla i dati e la connessione.';}
    finally{submit.disabled=false;mode.disabled=false;}
  };
}

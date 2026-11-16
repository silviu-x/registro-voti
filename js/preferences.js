const palettes = {oceano:['Oceano','#08203e','#557c93'],bosco:['Bosco','#10352f','#568777'],prugna:['Prugna','#352041','#89668c'],tramonto:['Tramonto','#54283a','#a96647']};
const sizes = {standard:['Standard',1],grande:['Grande',1.15],ampio:['Molto grande',1.3]};
export function read(key, fallback){try{return localStorage.getItem('rv-'+key)||fallback;}catch{return fallback;}}
export function remember(key,value){try{localStorage.setItem('rv-'+key,value);}catch{}}
export function applyPreferences(key,value){
  if(key) remember(key,value);
  const [,start,end]=palettes[read('palette','oceano')]||palettes.oceano;
  document.documentElement.style.setProperty('--navy',start);
  document.documentElement.style.setProperty('--steel',end);
  document.documentElement.style.fontSize=(100*(sizes[read('size','standard')]||sizes.standard)[1])+'%';
}
export function preferenceControls(){
  return [['palette','Gradiente',palettes,'oceano'],['size','Dimensione testo',sizes,'standard']].map(([id,label,options,fallback])=>
    '<div class="field"><label for="'+id+'">'+label+'</label><select id="'+id+'">'+Object.entries(options).map(([key,[name]])=>'<option value="'+key+'" '+(key===read(id,fallback)?'selected':'')+'>'+name+'</option>').join('')+'</select></div>').join('');
}

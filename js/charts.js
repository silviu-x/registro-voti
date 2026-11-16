import {DAY, MONTHS, $, esc, f2} from './utils.js';

const redraws = [];
export function resetCharts() { redraws.length = 0; }
export function drawChart(host,o){
  function paint(){
    var pts=[];
    o.lines.forEach(function(l){ pts=pts.concat(l.pts); });
    pts=pts.concat(o.dots||[]);
    if(!pts.length){ host.innerHTML=''; return; }
    var W=Math.max(260,Math.floor(host.clientWidth||560)), H=W<480?220:280;
    var m={l:30,r:18,t:18,b:28};
    var t0=Math.min.apply(null,pts.map(function(p){return p.t;})), t1=Math.max.apply(null,pts.map(function(p){return p.t;}));
    var pad=Math.max((t1-t0)*0.05,4*DAY); t0-=pad; t1+=pad;
    var vmin=Math.min.apply(null,pts.map(function(p){return p.v;}));
    var yMin=Math.max(1,Math.min(5,Math.floor(vmin)-1)), yMax=10;
    function X(t){ return m.l+(t-t0)/(t1-t0)*(W-m.l-m.r); }
    function Y(v){ return m.t+(yMax-v)/(yMax-yMin)*(H-m.t-m.b); }
    var s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="'+esc(o.label)+'">';
    for(var v=yMin;v<=yMax;v++){
      s+='<line class="grid" x1="'+m.l+'" x2="'+(W-m.r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'"/><text class="axis-t" x="'+(m.l-8)+'" y="'+(Y(v)+4)+'" text-anchor="end">'+v+'</text>';
    }
    s+='<line class="suff" x1="'+m.l+'" x2="'+(W-m.r)+'" y1="'+Y(6)+'" y2="'+Y(6)+'"/><text class="suff-t" x="'+(m.l+4)+'" y="'+(Y(6)-5)+'">sufficienza</text>';
    var ticks=[], range=t1-t0, i;
    if(range>=75*DAY){
      var d=new Date(t0); d=new Date(d.getFullYear(),d.getMonth()+1,1,12);
      while(+d<t1){ ticks.push({t:+d,l:MONTHS[d.getMonth()]+(d.getMonth()===0?' '+d.getFullYear():''),a:'middle'}); d=new Date(d.getFullYear(),d.getMonth()+1,1,12); }
      var step=Math.ceil(ticks.length/Math.max(2,Math.floor((W-m.l-m.r)/54)));
      ticks=ticks.filter(function(_,k){return k%step===0;});
    } else {
      for(i=0;i<=4;i++){ var tt=t0+range*i/4, dd=new Date(tt); ticks.push({t:tt,l:dd.getDate()+' '+MONTHS[dd.getMonth()],a:i===0?'start':i===4?'end':'middle'}); }
    }
    ticks.forEach(function(k){ s+='<text class="axis-t" x="'+X(k.t)+'" y="'+(H-8)+'" text-anchor="'+k.a+'">'+k.l+'</text>'; });
    if(o.cutoffT&&o.cutoffT>t0&&o.cutoffT<t1){
      s+='<line class="cut" x1="'+X(o.cutoffT)+'" x2="'+X(o.cutoffT)+'" y1="'+m.t+'" y2="'+(H-m.b)+'"/><text class="axis-t" x="'+(X(o.cutoffT)+5)+'" y="'+(m.t-5)+'">2° quadrimestre</text>';
    }
    o.lines.forEach(function(l,li){
      if(!l.pts.length) return;
      var path=l.pts.map(function(p,k){return (k?'L':'M')+X(p.t).toFixed(1)+' '+Y(p.v).toFixed(1);}).join(' ');
      if(l.area&&l.pts.length>1){
        s+='<path class="ar" d="'+path+' L'+X(l.pts[l.pts.length-1].t).toFixed(1)+' '+Y(yMin)+' L'+X(l.pts[0].t).toFixed(1)+' '+Y(yMin)+'Z"/>';
      }
      if(l.pts.length>1) s+='<path class="ln" d="'+path+'"/>';
    });
    (o.dots||[]).forEach(function(p){ s+='<circle class="dot dot-'+p.c+'" cx="'+X(p.t).toFixed(1)+'" cy="'+Y(p.v).toFixed(1)+'" r="4"/>'; });
    var main=o.lines[0].pts, last=main[main.length-1];
    if(last){
      var lx=X(last.t), ly=Y(last.v);
      s+='<circle class="hv-c" cx="'+lx.toFixed(1)+'" cy="'+ly.toFixed(1)+'" r="5"/>';
      s+='<text class="endv" x="'+Math.min(lx,W-m.r-4).toFixed(1)+'" y="'+(ly-12).toFixed(1)+'" text-anchor="'+(lx>W-60?'end':'middle')+'">'+f2(last.v)+'</text>';
    }
    s+='<line class="cut hv-l" y1="'+m.t+'" y2="'+(H-m.b)+'" style="display:none"/><circle class="hv-c hv-d" r="5" style="display:none"/>';
    s+='</svg><div class="tip" hidden></div>';
    host.className='chart-wrap';
    host.innerHTML=s;
    if (o.annotation) {
      const annotation = document.createElement('div');
      annotation.className = 'chart-annotation';
      annotation.textContent = o.annotation;
      host.appendChild(annotation);
    }
    var svg=$('svg',host), tip=$('.tip',host), gl=$('.hv-l',host), gd=$('.hv-d',host);
    function hide(){ tip.hidden=true; gl.style.display='none'; gd.style.display='none'; }
    function show(cx){
      var r=svg.getBoundingClientRect(), x=(cx-r.left)*(W/r.width), best=null, bd=1e9;
      (o.hover||[]).forEach(function(h){ var dx=Math.abs(X(h.t)-x); if(dx<bd){ bd=dx; best=h; } });
      if(!best){ hide(); return; }
      var bx=X(best.t), by=Y(best.v);
      gl.setAttribute('x1',bx); gl.setAttribute('x2',bx); gl.style.display='';
      gd.setAttribute('cx',bx); gd.setAttribute('cy',by); gd.style.display='';
      tip.innerHTML=best.html; tip.hidden=false;
      var tw=tip.offsetWidth, left=bx+14; if(left+tw>W) left=bx-tw-14; if(left<0) left=0;
      tip.style.left=left+'px';
    }
    svg.addEventListener('pointermove',function(e){ show(e.clientX); });
    svg.addEventListener('pointerdown',function(e){ show(e.clientX); });
    svg.addEventListener('pointerleave',hide);
  }
  paint();
  redraws.push({host:host,w:host.clientWidth,paint:paint});
}
let rzT = null;
window.addEventListener('resize',function(){
  clearTimeout(rzT);
  rzT=setTimeout(function(){ redraws.forEach(function(r){ if(r.host.isConnected&&Math.abs(r.host.clientWidth-r.w)>2){ r.w=r.host.clientWidth; r.paint(); } }); },120);
});


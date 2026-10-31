(function(){
var D=document,calm=matchMedia('(prefers-reduced-motion:reduce)').matches;
/* blob: [warna, opasitas, x, y, ukuran, durasi, dx, dy] */
var Wd={
academic:{b:[['#f6c25b',.5,'8%','8%',520,17,150,90],['#9fb8e8',.42,'78%','70%',560,20,-140,-90],['#f1b9a8',.38,'35%','95%',440,18,120,-110]],r:['rgba(246,194,91,.35)',.5],p:[10,'#fff6dc',.7,4,14]},
work:{b:[['#2fb7a6',.3,'18%','12%',620,18,200,80],['#5b6fd6',.24,'50%','100%',640,20,-160,-90]],au:[[ '#2fe0c0','12%',.34,-10],['#5b8cf0','38%',.3,12],['#b58cf0','62%',.26,-14],['#e8c07a','82%',.18,10]],st:[24,'#bfeee8'],sh:2,spot:'rgba(79,195,184,.14)'},
org:{b:[['#8fcfb0',.5,'12%','10%',520,18,140,90],['#f0d58c',.42,'85%','25%',460,20,-130,80],['#b8e0d0',.45,'55%','92%',560,19,100,-100]],r:['rgba(255,255,255,.55)',.45],l:[10,['#6fb58f','#8fcfb0','#e6c36a','#4f9a7a']]},
project:{b:[['#e58a63',.36,'88%','8%',560,18,-140,90],['#f2cf9a',.44,'10%','55%',520,20,130,-60]],au:[['#e9825a','20%',.3,22],['#f2b07a','55%',.28,-20],['#c9667a','80%',.2,24]]},
task:{b:[['#5865f2',.32,'85%','8%',620,19,-160,110],['#a06cf0',.24,'10%','60%',560,21,150,-80]],st:[34,'#dfe4ff'],sh:2,spot:'rgba(140,158,255,.16)',au:[['#6a78ff','30%',.2,8],['#a06cf0','70%',.18,-10]]},
calendar:{b:[['#ffc9a6',.5,'12%','10%',560,17,130,80],['#f5a3b3',.38,'88%','45%',520,20,-130,60]],sun:1,f:[3,'#ffe9d6',.7]},
finance:{b:[['#e8c27a',.45,'90%','8%',560,18,-130,80],['#7fc8bd',.3,'8%','70%',560,21,130,-80]],sp:[14,'#f3d27a'],sheen:1,p:[8,'#f3d27a',.6,3,8]},
goal:{b:[['#8fdcf0',.5,'15%','8%',560,17,120,80],['#b6ecd2',.38,'55%','100%',560,19,100,-80]],sun:1,r:['rgba(255,236,160,.45)',.4],c:[6,'#fff',.85]},
documents:{b:[['#ffd9a0',.6,'88%','6%',560,18,-110,90,1],['#e8b27a',.3,'10%','80%',520,21,100,-80]],p:[9,'#fff3d6',.75,4,22]},
analytics:{b:[['#b7a8f5',.45,'12%','10%',580,18,150,80],['#f6a99a',.34,'88%','55%',520,20,-130,-60]],w:[['#8a7bf0',.5,'6%',38],['#f08f78',.45,'0%',30],['#6fcfbf',.4,'-4%',46]]},
settings:{b:[['#a9c1d9',.5,'12%','10%',560,20,120,70]],f:[4,'#e9f1f8',.75]}};
function el(c,s,t){var e=D.createElement(t||'div');e.className=c;for(var k in s)e.style.setProperty(k,s[k]);return e}
function r(a,b){return a+Math.random()*(b-a)}
function add(a,n,c,f){for(var i=0;i<n;i++)a.appendChild(el(c,f(i)))}
function build(n){
  var w=Wd[n],a=el('wx-amb');if(!w)return a;
  w.b.forEach(function(b){var e=el('wx-b'+(b[8]?' wx-breathe':''),{'--c':b[0],'--o':b[1],'--x':b[2],'--y':b[3],'--s':b[4]+'px','--t':b[5]+'s','--dx':b[6]+'px','--dy':b[7]+'px'});a.appendChild(e)});
  if(w.r)a.appendChild(el('wx-r',{'--c':w.r[0],'--o':w.r[1]}));
  if(w.au)w.au.forEach(function(u,i){a.appendChild(el('wx-au',{'--c':u[0],'--x':u[1],'--o':u[2],'--r':u[3]+'deg','--t':r(14,22)+'s','--d':-i*4+'s'}))});
  if(w.w)w.w.forEach(function(u,i){var s=D.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('viewBox','0 0 1600 200');s.setAttribute('preserveAspectRatio','none');s.setAttribute('class','wx-w');
    s.style.cssText='--c:'+u[0]+';--o:'+u[1]+';--y:'+u[2]+';--t:'+(u[3]+i*6)+'s;--d:-'+i*7+'s';
    s.innerHTML='<path d="M0 100 C260 20 540 180 800 100 C1060 20 1340 180 1600 100"/>';a.appendChild(s)});
  if(w.p)add(a,w.p[0],'wx-p',function(){return{'--c':w.p[1],'--o':w.p[2],'--x':r(3,97)+'%','--s':r(w.p[3],w.p[4])*.5+'px','--t':r(14,26)+'s','--d':-r(0,26)+'s','--dx':r(-60,60)+'px'}});
  if(w.st)add(a,w.st[0],'wx-s',function(){return{'--c':w.st[1],'--o':r(.3,.85),'--x':r(2,98)+'%','--y':r(2,98)+'%','--s':r(1.5,3)+'px','--t':r(2.5,6)+'s','--d':-r(0,6)+'s'}});
  if(w.sh)add(a,w.sh,'wx-sh',function(i){return{'--x':r(40,90)+'%','--y':r(4,30)+'%','--t':r(9,15)+'s','--d':-i*5+'s'}});
  if(w.sp)add(a,w.sp[0],'wx-sp',function(){return{'--c':w.sp[1],'--o':r(.5,.95),'--x':r(3,95)+'%','--y':r(5,95)+'%','--s':r(10,22)+'px','--t':r(3,6)+'s','--d':-r(0,6)+'s'}});
  if(w.sheen)a.appendChild(el('wx-sheen'));
  if(w.l)add(a,w.l[0],'wx-l',function(i){return{'--c':w.l[1][i%w.l[1].length],'--o':r(.5,.85),'--x':r(2,96)+'%','--s':r(12,22)+'px','--t':r(12,22)+'s','--d':-r(0,22)+'s','--dx':r(-140,140)+'px','--rot':r(240,600)+'deg'}});
  if(w.c)add(a,w.c[0],'wx-c',function(){return{'--c':w.c[1],'--o':w.c[2]-r(0,.25),'--y':r(4,70)+'%','--s':r(260,520)+'px','--t':r(60,110)+'s','--d':-r(0,100)+'s'}});
  if(w.f)add(a,w.f[0],'wx-f',function(i){return{'--c':w.f[1],'--o':w.f[2]-r(0,.25),'--y':(i*24+r(-6,10))+'%','--s':r(620,980)+'px','--t':r(34,60)+'s','--d':-r(0,40)+'s'}});
  if(w.sun){var d=new Date(),h=d.getHours()+d.getMinutes()/60,night=h<5.5||h>18.5,x=10+Math.max(0,Math.min(1,(h-5.5)/13))*80;
    a.appendChild(el('wx-sun',{'--x':x+'%','--c':night?'#cdd8ff':(h>16.5?'#ffb27a':'#ffd98a'),'--o':night?.45:.7}))}
  if(w.spot)a.appendChild(el('wx-spot',{'--c':w.spot}));
  return a;
}
function world(ov){
  var c=ov.className+'',f=ov.firstElementChild;if(!f||/ac-ov2|ac-form|\bvw\b/.test(c+' '+f.className))return null;
  if(/\bad-ov\b/.test(c))return'academic';if(/\bwo-ov\b/.test(c))return'work';if(/\bes-ov\b/.test(c))return'org';if(/\bfn-ov\b/.test(c))return'finance';
  if(/pj-skin/.test(c))return'project';if(/tk-skin/.test(c))return'task';if(/gq-skin/.test(c))return'goal';if(/rd-skin/.test(c))return'documents';if(/an-skin/.test(c))return'analytics';
  if(!/\bac-ov\b/.test(c))return null;
  return /kalender|calendar/i.test((ov.querySelector('header')||ov).textContent.slice(0,80))?'calendar':'settings';
}
function spot(win){
  var s=win.querySelector('.wx-spot');if(!s||calm||win._sp)return;win._sp=1;var q=0,x=0,y=0;
  win.addEventListener('pointermove',function(e){x=e.clientX;y=e.clientY;if(q)return;q=requestAnimationFrame(function(){q=0;var b=win.getBoundingClientRect();var a=win.querySelector('.wx-spot');if(a){a.style.setProperty('--mx',(x-b.left)+'px');a.style.setProperty('--my',(y-b.top)+'px')}})},{passive:true});
}
/* Jika modul menggambar ulang isi jendela dan latar terhapus, pasang kembali */
function guard(win,n){
  if(win._wg)return;win._wg=1;
  new MutationObserver(function(){if(!win.querySelector(':scope>.wx-amb')){win.appendChild(build(n));spot(win)}}).observe(win,{childList:true});
}
var pend=0;
function scan(){
  pend=0;
  D.querySelectorAll('[class$="-ov"],[class*="-ov "]').forEach(function(ov){
    var vis=!ov.hidden&&getComputedStyle(ov).display!=='none';
    if(!vis){if(ov.classList.contains('wx-live'))ov.classList.remove('wx-live','wx-open');return}
    if(ov.classList.contains('wx-live'))return;
    var n=world(ov);if(!n)return;
    ov.dataset.wx=n;ov.classList.add('wx-live');
    var win=ov.firstElementChild;
    if(!win.querySelector(':scope>.wx-amb')){win.appendChild(build(n));spot(win)}
    guard(win,n);
    if(!calm){ov.classList.add('wx-open');setTimeout(function(){ov.classList.remove('wx-open')},1700)}
  });
}
function sched(){if(!pend){pend=1;requestAnimationFrame(scan)}}
new MutationObserver(sched).observe(D.body,{childList:true});
new MutationObserver(sched).observe(D.body,{attributes:true,attributeFilter:['hidden'],subtree:false,childList:false}); /* hanya anak langsung <body> (overlay); subtree:true memicu pemindaian penuh tiap elemen di dalam menu di-hide/show */
addEventListener('hashchange',sched);
sched();
})();

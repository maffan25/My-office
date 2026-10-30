(function(){
var D=document,calm=matchMedia('(prefers-reduced-motion:reduce)').matches;
/* blob: [warna, opasitas, x, y, ukuran, durasi s, dx, dy] */
var Wd={
academic:{b:[['#f6c25b',.5,'8%','8%',520,28,70,40],['#9fb8e8',.42,'78%','70%',560,34,-60,-40],['#f1b9a8',.38,'35%','95%',440,30,50,-60]]},
work:{b:[['#2fb7a6',.34,'18%','12%',620,30,90,40],['#e8c07a',.2,'85%','30%',520,36,-80,50],['#5b6fd6',.26,'50%','100%',640,32,60,-60]],spot:'rgba(79,195,184,.14)',st:[26,'#bfeee8']},
org:{b:[['#8fcfb0',.5,'12%','10%',520,30,60,50],['#f0d58c',.42,'85%','25%',460,34,-60,40],['#b8e0d0',.45,'55%','92%',560,32,40,-50]],p:[12,'#fff',.55,6,16]},
project:{b:[['#e58a63',.38,'88%','8%',560,30,-60,50],['#f2cf9a',.46,'10%','55%',520,34,60,-30],['#b66a7a',.2,'60%','100%',480,32,-40,-50]]},
task:{b:[['#5865f2',.34,'85%','8%',620,32,-70,60],['#a06cf0',.26,'10%','60%',560,36,70,-40],['#4fc3f7',.18,'55%','100%',520,30,-50,-60]],spot:'rgba(140,158,255,.16)',st:[34,'#dfe4ff']},
calendar:{b:[['#ffc9a6',.55,'12%','10%',560,28,60,40],['#f5a3b3',.4,'88%','45%',520,34,-60,30],['#ffe1a1',.45,'45%','100%',560,30,50,-50]]},
finance:{b:[['#e8c27a',.45,'90%','8%',560,32,-60,40],['#7fc8bd',.3,'8%','70%',560,36,60,-40],['#f6e2b0',.5,'55%','100%',520,30,40,-50]]},
goal:{b:[['#8fdcf0',.5,'15%','8%',560,30,60,40],['#ffe08a',.5,'88%','12%',420,34,-40,50],['#b6ecd2',.4,'55%','100%',560,32,50,-40]],c:[5,'#fff',.8]},
documents:{b:[['#ffd9a0',.6,'88%','6%',560,32,-50,50],['#e8b27a',.3,'10%','80%',520,36,50,-40]],p:[16,'#fff3d6',.7,4,22]},
analytics:{b:[['#b7a8f5',.5,'12%','10%',580,30,70,40],['#f6a99a',.38,'88%','55%',520,34,-60,-30],['#a9e0d4',.4,'45%','100%',560,32,40,-50]]},
settings:{b:[['#a9c1d9',.5,'12%','10%',560,34,60,40],['#dfe8f1',.7,'85%','35%',520,38,-50,40],['#bfd6cc',.4,'50%','100%',520,32,40,-40]]}};
function el(c,s){var e=D.createElement('div');e.className=c;for(var k in s)e.style.setProperty(k,s[k]);return e}
function r(a,b){return a+Math.random()*(b-a)}
function build(n){
  var w=Wd[n],a=el('wx-amb');if(!w)return a;
  w.b.forEach(function(b){a.appendChild(el('wx-b',{'--c':b[0],'--o':b[1],'--x':b[2],'--y':b[3],'--s':b[4]+'px','--t':b[5]+'s','--dx':b[6]+'px','--dy':b[7]+'px'}))});
  if(w.p)for(var i=0;i<w.p[0];i++)a.appendChild(el('wx-p',{'--c':w.p[1],'--o':w.p[2],'--x':r(3,97)+'%','--s':r(w.p[3],w.p[4])*.5+'px','--t':r(16,30)+'s','--d':-r(0,28)+'s','--dx':r(-50,50)+'px'}));
  if(w.st)for(var j=0;j<w.st[0];j++)a.appendChild(el('wx-s',{'--c':w.st[1],'--o':r(.3,.8),'--x':r(2,98)+'%','--y':r(2,98)+'%','--s':r(1.5,3)+'px','--t':r(2.5,6)+'s','--d':-r(0,6)+'s'}));
  if(w.c)for(var k=0;k<w.c[0];k++)a.appendChild(el('wx-c',{'--c':w.c[1],'--o':w.c[2]-r(0,.25),'--y':r(4,70)+'%','--s':r(260,520)+'px','--t':r(70,130)+'s','--d':-r(0,120)+'s'}));
  if(w.spot)a.appendChild(el('wx-spot',{'--c':w.spot}));
  return a;
}
function world(ov){
  var c=ov.className+'',f=ov.firstElementChild;if(!f||/ac-ov2|ac-form/.test(c+' '+f.className))return null;
  if(/\bad-ov\b/.test(c))return'academic';if(/\bwo-ov\b/.test(c))return'work';if(/\bes-ov\b/.test(c))return'org';if(/\bfn-ov\b/.test(c))return'finance';
  if(/pj-skin/.test(c))return'project';if(/tk-skin/.test(c))return'task';if(/gq-skin/.test(c))return'goal';if(/rd-skin/.test(c))return'documents';if(/an-skin/.test(c))return'analytics';
  if(!/\bac-ov\b/.test(c))return null;
  return /kalender|calendar/i.test((ov.querySelector('header')||ov).textContent.slice(0,80))?'calendar':'settings';
}
function spot(win){
  var s=win.querySelector('.wx-spot');if(!s||calm||win._sp)return;win._sp=1;var q=0,x=0,y=0;
  win.addEventListener('pointermove',function(e){x=e.clientX;y=e.clientY;if(q)return;q=requestAnimationFrame(function(){q=0;var b=win.getBoundingClientRect();s.style.setProperty('--mx',(x-b.left)+'px');s.style.setProperty('--my',(y-b.top)+'px')})},{passive:true});
}
var pend=0;
function scan(){
  pend=0;
  D.querySelectorAll('[class$="-ov"],[class*="-ov "]').forEach(function(ov){
    var vis=!ov.hidden&&ov.offsetParent!==null||(!ov.hidden&&getComputedStyle(ov).display!=='none');
    if(!vis){ov.classList.remove('wx-live','wx-open');return}
    if(ov.classList.contains('wx-live'))return;
    var n=world(ov);if(!n)return;
    ov.dataset.wx=n;ov.classList.add('wx-live');
    var win=ov.firstElementChild;
    if(!win.querySelector(':scope>.wx-amb')){win.appendChild(build(n));spot(win)}
    if(!calm){ov.classList.add('wx-open');setTimeout(function(){ov.classList.remove('wx-open')},1700)}
  });
}
function sched(){if(!pend){pend=1;requestAnimationFrame(scan)}}
new MutationObserver(sched).observe(D.body,{childList:true,subtree:false});
new MutationObserver(sched).observe(D.body,{attributes:true,attributeFilter:['hidden','class'],subtree:true,attributeOldValue:false});
addEventListener('hashchange',sched);D.addEventListener('click',function(){setTimeout(sched,60)},true);
sched();
})();

(function(){
var P=['#99CDD8','#DAEBE3','#FDE8D3','#F3C3B2','#CFD8C4','#657166'],D=document,B=D.body;
var calm=matchMedia('(prefers-reduced-motion:reduce)').matches;
function el(t,c,h){var e=D.createElement(t);if(c)e.className=c;if(h)e.innerHTML=h;return e}
/* 1. Intro: enam kapsul naik menyusun palet, lalu layar mengembun terbuka */
if(!calm&&!sessionStorage.getItem('p-intro')){
  var it=el('div');it.id='p-intro';var st=el('div');
  P.forEach(function(c){var i=el('i');i.style.background=c;st.appendChild(i)});
  it.appendChild(st);B.appendChild(it);sessionStorage.setItem('p-intro',1);
  setTimeout(function(){it.remove()},3200);
}
/* 2. Aura kursor yang mengikuti dengan lembut */
if(!calm&&matchMedia('(pointer:fine)').matches){
  var a=el('div');a.id='p-aura';B.appendChild(a);var x=0,y=0,tx=0,ty=0;
  addEventListener('pointermove',function(e){tx=e.clientX;ty=e.clientY;a.style.opacity=1});
  D.addEventListener('mouseleave',function(){a.style.opacity=0});
  (function f(){x+=(tx-x)*.12;y+=(ty-y)*.12;a.style.transform='translate('+x+'px,'+y+'px)';requestAnimationFrame(f)})();
}
/* 3. Klik tombol/menu: kapsul palet meletup */
function burst(px,py,n){
  if(calm)return;
  for(var i=0;i<n;i++){
    var c=el('i','p-cap');c.style.background=P[i%P.length];B.appendChild(c);
    var ang=Math.random()*6.28,d=50+Math.random()*90,r=(Math.random()-.5)*540;
    c.animate([{transform:'translate('+px+'px,'+py+'px) rotate(0) scale(.4)',opacity:1},
      {transform:'translate('+(px+Math.cos(ang)*d)+'px,'+(py+Math.sin(ang)*d-30)+'px) rotate('+r+'deg) scale(1)',opacity:1,offset:.6},
      {transform:'translate('+(px+Math.cos(ang)*d*1.15)+'px,'+(py+Math.sin(ang)*d+70)+'px) rotate('+r*1.4+'deg) scale(.8)',opacity:0}],
      {duration:900+Math.random()*400,easing:'cubic-bezier(.16,1,.3,1)'}).onfinish=function(){this.effect.target.remove()};
  }
}
D.addEventListener('click',function(e){if(e.target.closest('.nav a,.ac-ov button,.chip,.wall'))burst(e.clientX,e.clientY,9)},true);
/* 4. Kejutan: klik dua kali logo (atau tekan P) membuka kipas palet; klik kapsul untuk menyalin kode warna */
var fan=el('div');fan.id='p-fan';var w=el('div');
P.slice().reverse().forEach(function(c,i){
  var b=el('b','',c);b.style.background=c;b.style.setProperty('--i',i);b.style.transitionDelay=i*60+'ms';
  b.style.color=i<2||i==3?'#202721':'#FFFAF4';
  b.onclick=function(e){e.stopPropagation();try{navigator.clipboard.writeText(c)}catch(_){}b.textContent=c+'  disalin';burst(e.clientX,e.clientY,14);setTimeout(function(){b.textContent=c},1200)};
  w.appendChild(b)});
w.appendChild(el('small','','Klik warna untuk menyalin · Esc untuk menutup'));fan.appendChild(w);B.appendChild(fan);
function tog(o){fan.classList.toggle('on',o)}
fan.onclick=function(){tog(false)};
D.querySelector('.brand').addEventListener('dblclick',function(e){e.preventDefault();tog(true)});
addEventListener('keydown',function(e){
  if(e.key==='Escape')tog(false);
  if((e.key==='p'||e.key==='P')&&!/input|textarea|select/i.test((e.target.tagName||''))&&!e.target.isContentEditable&&!e.ctrlKey&&!e.metaKey)tog(!fan.classList.contains('on'));
});
/* 5. Nav magnetis: ikon sedikit mengejar kursor */
if(!calm)D.querySelectorAll('.nav a').forEach(function(l){
  l.addEventListener('pointermove',function(e){var r=l.getBoundingClientRect();l.style.transform='translate('+(e.clientX-r.left-r.width/2)*.12+'px,-3px)'});
  l.addEventListener('pointerleave',function(){l.style.transform=''});
});
})();

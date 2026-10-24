/* Abhijit Sonwane portfolio.
   Content lives in /data/*.json and is edited through Pages CMS (app.pagescms.org).
   Photos and PDFs live in /media. This file only reads and displays them. */
(function(){
  var $=function(id){ return document.getElementById(id); };
  var S={ settings:{photos:{}}, work:[], blogs:[], cities:[], gallery:[] };
  var rFilter='All', pFilter='All', query='';

  function el(t,c,x){ var n=document.createElement(t); if(c) n.className=c; if(x!=null) n.textContent=x; return n; }
  function safeUrl(u){ return /^https?:\/\//i.test(u||'')?u:''; }
  // Pages CMS stores media as a path (e.g. "/media/images/pune.jpg"); accept arrays too.
  var PREVIEW={}; // fresh uploads shown from memory until GitHub publishes them
  function mediaUrl(v){ if(Array.isArray(v)) v=v[0]; if(!v||typeof v!=='string') return ''; v=v.trim(); if(!v) return ''; if(PREVIEW[v]) return PREVIEW[v]; if(/^https?:\/\//i.test(v)||v.charAt(0)==='/') return v; return '/'+v; }
  function img(src,alt){ var i=el('img'); i.src=src; i.alt=alt||''; i.loading='lazy'; i.decoding='async'; return i; }
  var NS='http://www.w3.org/2000/svg';
  function sv(tag,attrs,cls){ var n=document.createElementNS(NS,tag); for(var k in attrs) n.setAttribute(k,attrs[k]); if(cls) n.setAttribute('class',cls); return n; }
  function icon(name){ var s=sv('svg',{'aria-hidden':'true'},'ico'); s.appendChild(sv('use',{href:'#i-'+name})); return s; }
  function hash(s){ var h=2166136261; s=String(s||'x'); for(var i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
  function rng(seed){ var a=seed||1; return function(){ a|=0; a=a+0x6D2B79F5|0; var t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
  function scaler(v,lo,hi){ var mn=Math.min.apply(null,v), mx=Math.max.apply(null,v), k=(hi-lo)/((mx-mn)||1); return function(x){ return hi-(x-mn)*k; }; }
  var uid=0;

  // ---------- soft landscape art (shown until a section photo is added) ----------
  var PAL={
    blue:{sky:['#D5E2F3','#F4F7FB'],sun:'#F6DDB8',m:['#C3D0E3','#9DB0CC','#71879F']},
    warm:{sky:['#F2E3D0','#FAF6F1'],sun:'#F4C99A',m:['#DCCBB6','#BBA58C','#8E7B66']},
    sage:{sky:['#DCE8E2','#F6F9F7'],sun:'#F3E0B9',m:['#C2D3C9','#97B1A3','#6C8A7C']},
    dusk:{sky:['#E3DDF0','#F8F6FB'],sun:'#F5C9B0',m:['#CDC5DF','#A79CC2','#7C709B']}
  };
  function scene(svg,Wd,H,seed,palName){
    var p=PAL[palName]||PAL.blue, r=rng(seed), id='sg'+(++uid);
    var defs=sv('defs',{}), lg=sv('linearGradient',{id:id,x1:0,y1:0,x2:0,y2:1});
    lg.appendChild(sv('stop',{offset:'0','stop-color':p.sky[0]})); lg.appendChild(sv('stop',{offset:'1','stop-color':p.sky[1]}));
    defs.appendChild(lg); svg.appendChild(defs);
    svg.appendChild(sv('rect',{x:0,y:0,width:Wd,height:H,fill:'url(#'+id+')'}));
    svg.appendChild(sv('circle',{cx:Wd*(.55+r()*.3),cy:H*(.2+r()*.1),r:H*.09,fill:p.sun,opacity:.85}));
    for(var k=0;k<3;k++){
      var base=H*(.48+k*.14), amp=H*(.2-k*.04), n=6+k*2, d='M0 '+H+' L0 '+(base+(r()-.5)*amp).toFixed(1);
      for(var i=1;i<=n;i++){ var x=i*Wd/n, cx=x-Wd/n/2, peak=base-amp*(.35+r()*.75); d+=' Q'+cx.toFixed(1)+' '+peak.toFixed(1)+' '+x.toFixed(1)+' '+(base+(r()-.5)*amp*.4).toFixed(1); }
      svg.appendChild(sv('path',{d:d+' L'+Wd+' '+H+' Z',fill:p.m[k],opacity:(.75+k*.08).toFixed(2)}));
    }
    var mid='mg'+uid, mg=sv('linearGradient',{id:mid,x1:0,y1:0,x2:0,y2:1});
    mg.appendChild(sv('stop',{offset:'0','stop-color':'#FFFFFF','stop-opacity':0})); mg.appendChild(sv('stop',{offset:'1','stop-color':'#FFFFFF','stop-opacity':.55}));
    defs.appendChild(mg); svg.appendChild(sv('rect',{x:0,y:H*.55,width:Wd,height:H*.45,fill:'url(#'+mid+')'}));
    return svg;
  }
  function landscape(seed,pal){ var s=sv('svg',{viewBox:'0 0 800 500',preserveAspectRatio:'xMidYMid slice','aria-hidden':'true'}); return scene(s,800,500,seed,pal); }

  // ---------- city skyline art (shown until a city photo is added) ----------
  function skyline(name){
    var r=rng(hash(name)), h=200+Math.floor(r()*40), s=sv('svg',{viewBox:'0 0 400 300',preserveAspectRatio:'xMidYMid slice','aria-hidden':'true'}), id='ck'+(++uid);
    var defs=sv('defs',{}), lg=sv('linearGradient',{id:id,x1:0,y1:0,x2:0,y2:1});
    lg.appendChild(sv('stop',{offset:'0','stop-color':'hsl('+h+',55%,84%)'})); lg.appendChild(sv('stop',{offset:'1','stop-color':'hsl('+(h-170)+',60%,92%)'}));
    defs.appendChild(lg); s.appendChild(defs);
    s.appendChild(sv('rect',{x:0,y:0,width:400,height:300,fill:'url(#'+id+')'}));
    s.appendChild(sv('circle',{cx:80+r()*240,cy:70+r()*30,r:28,fill:'#F6DDB8'}));
    s.appendChild(sv('path',{d:'M0 230 Q100 '+(190+r()*20)+' 200 215 T400 205 V300 H0Z',fill:'hsl('+h+',25%,72%)',opacity:.6}));
    var x=0; while(x<400){ var w=18+r()*34, bh=50+r()*130; s.appendChild(sv('rect',{x:x,y:300-bh,width:w-3,height:bh,fill:'hsl('+h+',28%,'+(24+r()*14)+'%)',opacity:.9}));
      for(var wy=300-bh+10; wy<290; wy+=14) for(var wx=x+5; wx<x+w-8; wx+=8) if(r()>.6) s.appendChild(sv('rect',{x:wx,y:wy,width:3,height:5,fill:'#FFE9B0',opacity:.75}));
      x+=w; }
    return s;
  }

  // ---------- chart art for cards without a cover photo ----------
  function art(it){
    var Wd=400,H=225,r=rng(hash(it.title)), i, x, d;
    var svg=sv('svg',{viewBox:'0 0 '+Wd+' '+H,preserveAspectRatio:'xMidYMid slice','aria-hidden':'true'});
    svg.appendChild(sv('rect',{x:0,y:0,width:Wd,height:H,fill:'#F7F9FC'}));
    for(var gy=30;gy<H;gy+=38) svg.appendChild(sv('line',{x1:0,y1:gy,x2:Wd,y2:gy},'cv-grid'));
    var kind={'Company Report':'candles','Sector Report':'bars','Financial Model':'field','Case Study':'runway','Startup Case Study':'runway'}[it.category]||'line';
    if(kind==='candles'){
      var n=24, st=Wd/n, o=[],c=[],hi=[],lo=[],p=50;
      for(i=0;i<n;i++){ var op=p, cl=p+(r()-.42)*9; o.push(op); c.push(cl); hi.push(Math.max(op,cl)+r()*4); lo.push(Math.min(op,cl)-r()*4); p=cl; }
      var y=scaler(hi.concat(lo),22,H-20);
      for(i=0;i<n;i++){ x=i*st+st/2; var u=c[i]>=o[i];
        svg.appendChild(sv('line',{x1:x,x2:x,y1:y(hi[i]),y2:y(lo[i]),'stroke-width':1.4},u?'cv-wick-up':'cv-wick-dn'));
        svg.appendChild(sv('rect',{x:x-st*.3,y:y(Math.max(o[i],c[i])),width:st*.6,height:Math.max(2,Math.abs(y(o[i])-y(c[i]))),rx:1},u?'cv-up':'cv-dn')); }
      d=''; for(i=3;i<n;i++){ var m=(c[i]+c[i-1]+c[i-2]+c[i-3])/4; d+=(i===3?'M':'L')+(i*st+st/2).toFixed(1)+' '+y(m).toFixed(1); }
      svg.appendChild(sv('path',{d:d},'cv-line'));
    } else if(kind==='field'){
      var mid=140+r()*130;
      for(i=0;i<4;i++){ var a=40+r()*(mid-60), b=mid+20+r()*(Wd-60-mid); svg.appendChild(sv('rect',{x:a,y:34+i*42,width:b-a,height:22,rx:4},i%2?'cv-mut':'cv-acc')); }
      svg.appendChild(sv('line',{x1:mid,x2:mid,y1:16,y2:H-12},'cv-dash'));
    } else if(kind==='runway'){
      var n2=30, v=[], cash=100; for(i=0;i<n2;i++){ cash-=2+r()*4.5; v.push(Math.max(cash,4)); }
      var yr=function(q){ return 20+(1-q/100)*(H-40); };
      d='M0 '+yr(v[0]); for(i=1;i<n2;i++) d+=' L'+(i*Wd/(n2-1)).toFixed(1)+' '+yr(v[i]).toFixed(1);
      svg.appendChild(sv('path',{d:d+' L'+Wd+' '+H+' L0 '+H+' Z'},'cv-area')); svg.appendChild(sv('path',{d:d},'cv-line'));
      var z=v.findIndex(function(q){ return q<=20; }); if(z>0){ var zx=z*Wd/(n2-1); svg.appendChild(sv('line',{x1:zx,x2:zx,y1:14,y2:H-10},'cv-dash')); }
    } else if(kind==='bars'){
      var n3=12, bw=Wd/n3, hv=[], q=40; for(i=0;i<n3;i++){ q+=(r()-.3)*8; hv.push(q); }
      var yb=scaler(hv,40,H-20);
      for(i=0;i<n3;i++) svg.appendChild(sv('rect',{x:i*bw+bw*.2,y:yb(hv[i]),width:bw*.6,height:H-yb(hv[i]),rx:3},i%3===2?'cv-acc':'cv-mut'));
    } else {
      var lv=[], pv=50; for(i=0;i<30;i++){ pv+=(r()-.38)*7; lv.push(pv); }
      var yl=scaler(lv,24,H-20);
      d='M0 '+yl(lv[0]); for(i=1;i<30;i++) d+=' L'+(i*Wd/29).toFixed(1)+' '+yl(lv[i]).toFixed(1);
      svg.appendChild(sv('path',{d:d+' L'+Wd+' '+H+' L0 '+H+' Z'},'cv-area')); svg.appendChild(sv('path',{d:d},'cv-line'));
    }
    return svg;
  }

  // ---------- cat placeholder (original drawing) until your photo is added ----------
  function cat(kind){
    var s=sv('svg',{viewBox:'0 0 600 600',preserveAspectRatio:'xMidYMid slice',role:'img','aria-label':'Cartoon cat in a suit'});
    scene(s,600,600,kind==='hero'?777:4242,kind==='hero'?'blue':'warm');
    var G=sv('g',{transform:'translate(100,140)'}); s.appendChild(G);
    var g=function(t,a){ var n=sv(t,a); G.appendChild(n); return n; };
    g('path',{d:'M110 460 C 110 330 150 290 200 290 C 250 290 290 330 290 460 Z',fill:'#2B2F3A'});
    g('path',{d:'M285 430 C 345 420 360 360 330 330',stroke:'#2B2F3A','stroke-width':18,fill:'none','stroke-linecap':'round'});
    g('path',{d:'M130 150 L140 85 L185 125 Z',fill:'#2B2F3A'}); g('path',{d:'M270 150 L260 85 L215 125 Z',fill:'#2B2F3A'});
    g('path',{d:'M145 132 L148 102 L170 122 Z',fill:'#E9A7A7'}); g('path',{d:'M255 132 L252 102 L230 122 Z',fill:'#E9A7A7'});
    g('ellipse',{cx:200,cy:200,rx:95,ry:85,fill:'#2B2F3A'});
    if(kind==='hero'){
      g('rect',{x:128,y:178,width:62,height:36,rx:14,fill:'#0F1B2D'}); g('rect',{x:210,y:178,width:62,height:36,rx:14,fill:'#0F1B2D'});
      g('path',{d:'M190 192 H210',stroke:'#0F1B2D','stroke-width':6});
      g('path',{d:'M140 186 L158 186',stroke:'#5B7BB5','stroke-width':4,'stroke-linecap':'round'}); g('path',{d:'M222 186 L240 186',stroke:'#5B7BB5','stroke-width':4,'stroke-linecap':'round'});
    } else {
      g('circle',{cx:165,cy:195,r:20,fill:'#F4D35E'}); g('circle',{cx:235,cy:195,r:20,fill:'#F4D35E'});
      g('ellipse',{cx:165,cy:197,rx:7,ry:14,fill:'#111'}); g('ellipse',{cx:235,cy:197,rx:7,ry:14,fill:'#111'});
      g('circle',{cx:170,cy:188,r:4,fill:'#fff'}); g('circle',{cx:240,cy:188,r:4,fill:'#fff'});
    }
    g('path',{d:'M192 228 L208 228 L200 238 Z',fill:'#E9A7A7'});
    g('path',{d:'M200 238 Q 192 252 182 246 M200 238 Q 208 252 218 246',stroke:'#C9CED8','stroke-width':3,fill:'none','stroke-linecap':'round'});
    ['M150 232 L100 222','M150 240 L102 244','M250 232 L300 222','M250 240 L298 244'].forEach(function(p){ g('path',{d:p,stroke:'#C9CED8','stroke-width':2.5,'stroke-linecap':'round'}); });
    g('path',{d:'M170 292 L200 312 L230 292',fill:'#FFFFFF'});
    g('path',{d:'M200 306 L190 322 L200 392 L210 322 Z',fill:kind==='hero'?'#2563EB':'#C2501F'});
    g('path',{d:'M193 330 L207 345 M192 352 L208 367',stroke:'rgba(255,255,255,.55)','stroke-width':4});
    return s;
  }

  // ---------- photos ----------
  var SECPAL={about:'warm',open:'blue',research:'blue',projects:'sage',resume:'dusk',quote:'blue',blogs:'warm',goals:'sage',contact:'blue'};
  function secNode(key){ var u=mediaUrl((S.settings.photos||{})[key]); return u ? img(u,'') : landscape(hash('sec-'+key), SECPAL[key]||'blue'); }
  function renderPhotos(){
    var st=S.settings, hm=$('heroMedia'); hm.textContent='';
    var hp=mediaUrl(st.heroPhoto); hm.appendChild(hp ? img(hp,'Abhijit Sonwane') : cat('hero'));
    var h=el('div','hand'); h.appendChild(document.createTextNode('Better Analysis,')); h.appendChild(el('br')); h.appendChild(document.createTextNode('Better Decisions.')); hm.appendChild(h);
    var ap=$('aboutPhoto'), au=mediaUrl(st.aboutPhoto); ap.textContent=''; ap.appendChild(au ? img(au,'Abhijit Sonwane') : cat('about'));
    document.querySelectorAll('[data-sec]').forEach(function(b){ b.textContent=''; b.appendChild(secNode(b.getAttribute('data-sec'))); });
    var ru=mediaUrl(st.resume), hb=$('heroResume'), rb=$('resumeBtn');
    if(ru){ [hb,rb].forEach(function(b){ b.href=ru; b.target='_blank'; b.rel='noopener'; }); $('resumeBtnTxt').textContent='Download Resume (PDF)'; }
    var gw=$('gallery'), gg=$('gGrid'); gg.textContent='';
    var pics=(S.gallery||[]).filter(function(g){ return mediaUrl(g.photo); });
    gw.hidden=!pics.length;
    pics.forEach(function(g){ var f=el('figure','gitem'); f.appendChild(img(mediaUrl(g.photo),g.caption||'')); if(g.caption) f.appendChild(el('figcaption',null,g.caption)); gg.appendChild(f); });
  }
  function renderCities(){
    var box=$('cities'); box.textContent='';
    (S.cities||[]).forEach(function(c){
      if(!c||!c.name) return;
      var card=el('article','city'), ph=el('div','ph'), u=mediaUrl(c.photo);
      ph.appendChild(u ? img(u,c.name) : skyline(c.name)); ph.appendChild(el('span','nm',c.name)); card.appendChild(ph);
      var info=el('div','info'); info.appendChild(el('span',null,c.note||'')); info.appendChild(el('span','pill'+(c.home?' home':''), c.home?'Based here':'Open to move')); card.appendChild(info);
      box.appendChild(card);
    });
  }

  // ---------- research and projects ----------
  function tagsOf(it){ return String(it.tags||'').split(',').map(function(t){ return t.trim(); }).filter(Boolean); }
  function coverOf(it){ var u=mediaUrl(it.cover); return u ? img(u,'') : art(it); }
  function card(it){
    var c=el('article','card'), cv=el('div','cover'); cv.appendChild(coverOf(it)); c.appendChild(cv);
    var b=el('div','cbody'); if(it.category) b.appendChild(el('span','chip',it.category)); b.appendChild(el('h3',null,it.title)); if(it.summary) b.appendChild(el('p',null,it.summary));
    if(it.keyNumber){ var fg=el('div','figs'), dv=el('div'); dv.appendChild(el('b',null,it.keyNumber)); dv.appendChild(el('span',null,it.keyLabel||'')); fg.appendChild(dv); b.appendChild(fg); }
    var ft=el('div','foot'); ft.appendChild(el('span',null,it.date||tagsOf(it).join(' · ')));
    var acts=el('div','acts'), link=safeUrl(it.link), rep=mediaUrl(it.report);
    if(rep){ var a=el('a','round'); a.href=rep; a.target='_blank'; a.rel='noopener'; a.title='Open the report'; a.setAttribute('aria-label','Open the '+it.title+' report'); a.appendChild(icon('file')); acts.appendChild(a); }
    if(link){ var l=el('a','round'); l.href=link; l.target='_blank'; l.rel='noopener'; l.title='Open link'; l.setAttribute('aria-label','Open '+it.title); l.appendChild(icon('arrow')); acts.appendChild(l); }
    ft.appendChild(acts); b.appendChild(ft); c.appendChild(b); return c;
  }
  function plural(c){ return /[^aeiou]y$/i.test(c)?c.slice(0,-1)+'ies':(/s$/i.test(c)?c:c+'s'); }
  function tabs(box,cats,cur,onPick){ box.textContent=''; ['All'].concat(cats).forEach(function(cn){ var t=el('button','tab',cn==='All'?'All':plural(cn)); t.type='button'; t.setAttribute('aria-pressed',String(cn===cur)); t.addEventListener('click',function(){ onPick(cn); }); box.appendChild(t); }); }
  function itemsIn(sec){ return (S.work||[]).filter(function(i){ return i&&i.title&&(i.section||'research')===sec; }); }
  function catsIn(sec){ var out=[]; itemsIn(sec).forEach(function(i){ if(i.category&&out.indexOf(i.category)<0) out.push(i.category); }); return out; }
  function renderWork(){
    var rc=catsIn('research'); if(rFilter!=='All'&&rc.indexOf(rFilter)<0) rFilter='All';
    tabs($('rTabs'),rc,rFilter,function(c){ rFilter=c; renderWork(); });
    var q=query.trim().toLowerCase();
    var rs=itemsIn('research').filter(function(i){ return (rFilter==='All'||i.category===rFilter)&&(!q||(i.title+' '+(i.summary||'')+' '+(i.category||'')+' '+(i.tags||'')).toLowerCase().indexOf(q)>=0); });
    var rg=$('rGrid'); rg.textContent=''; if(!rs.length) rg.appendChild(el('p','empty',q?'No research matches "'+query.trim()+'".':'New research coming soon.'));
    rs.forEach(function(i){ rg.appendChild(card(i)); });
    var pc=catsIn('projects'); if(pFilter!=='All'&&pc.indexOf(pFilter)<0) pFilter='All';
    tabs($('pTabs'),pc,pFilter,function(c){ pFilter=c; renderWork(); });
    var ps=itemsIn('projects').filter(function(i){ return pFilter==='All'||i.category===pFilter; });
    var pg=$('pGrid'); pg.textContent=''; if(!ps.length) pg.appendChild(el('p','empty','New projects coming soon.')); ps.forEach(function(i){ pg.appendChild(card(i)); });
    var feat=itemsIn('research').slice(0,2).concat(itemsIn('projects').slice(0,2));
    var fg=$('fGrid'); fg.textContent=''; $('featuredWrap').hidden=!feat.length;
    feat.forEach(function(it){ var a=el('a','fitem'); a.href='#'+(it.section||'research'); var cv=el('div','cover'); cv.appendChild(coverOf(it)); a.appendChild(cv);
      var t=el('div','t'); t.appendChild(el('b',null,it.title)); t.appendChild(el('span',null,it.category||'')); a.appendChild(t); fg.appendChild(a); });
  }

  // ---------- blogs ----------
  function blogThumb(p){ var u=mediaUrl(p.cover); return u ? img(u,'') : landscape(hash(p.title),['blue','warm','sage','dusk'][hash(p.title)%4]); }
  function meta(p){ return [p.date, p.mins?p.mins+' min read':''].filter(Boolean).join(' · '); }
  function renderBlogs(){
    var posts=(S.blogs||[]).filter(function(p){ return p&&p.title; });
    $('blogs').hidden=!posts.length; $('navBlogs').hidden=!posts.length;
    var f=$('bFeatured'), l=$('bList'); f.textContent=''; l.textContent='';
    if(!posts.length) return;
    var p0=posts[0], fb=el('button','featured'); fb.type='button'; fb.appendChild(blogThumb(p0)); fb.appendChild(el('div','ov'));
    var tx=el('div','txt'); if(p0.tag) tx.appendChild(el('span','chip',p0.tag)); tx.appendChild(el('h3',null,p0.title)); tx.appendChild(el('div','meta',meta(p0))); fb.appendChild(tx);
    fb.addEventListener('click',function(){ openPost(p0); }); f.appendChild(fb);
    posts.slice(1,5).forEach(function(p){ var bi=el('button','bitem'); bi.type='button'; var th=el('span','th'); th.appendChild(blogThumb(p)); bi.appendChild(th);
      var t=el('span'); t.appendChild(el('h4',null,p.title)); t.appendChild(el('div','meta',meta(p))); bi.appendChild(t); bi.addEventListener('click',function(){ openPost(p); }); l.appendChild(bi); });
  }
  var lastFocus=null;
  function openPost(p){
    lastFocus=document.activeElement; $('rdTag').textContent=p.tag||'Blog'; $('rdTitle').textContent=p.title; $('rdMeta').textContent=meta(p);
    var cv=$('rdCover'); cv.textContent=''; if(mediaUrl(p.cover)){ cv.appendChild(blogThumb(p)); cv.hidden=false; } else cv.hidden=true;
    var tx=$('rdText'); tx.textContent=''; String(p.body||p.summary||'').split(/\n\s*\n/).forEach(function(par){ if(par.trim()) tx.appendChild(el('p',null,par.trim())); });
    var lk=safeUrl(p.link), a=$('rdLink'); if(lk){ a.href=lk; a.hidden=false; } else a.hidden=true;
    $('reader').hidden=false; $('rdClose').focus();
  }
  function closeReader(){ $('reader').hidden=true; if(lastFocus) lastFocus.focus(); }
  $('rdClose').addEventListener('click',closeReader);
  $('reader').addEventListener('click',function(e){ if(e.target===this) closeReader(); });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&!$('reader').hidden) closeReader(); });

  $('rSearch').addEventListener('input',function(){ query=this.value; renderWork(); });
  document.querySelectorAll('.copy').forEach(function(b){
    b.addEventListener('click',function(){
      var t=$(b.getAttribute('data-copy')), text=t.textContent.trim(); if(t.tagName==='A') text='https://www.'+text;
      function done(m){ b.textContent=m; setTimeout(function(){ b.textContent='Copy'; },1600); }
      function sel(){ var rg=document.createRange(); rg.selectNodeContents(t); var s=getSelection(); s.removeAllRanges(); s.addRange(rg); done('Selected'); }
      try{ navigator.clipboard.writeText(text).then(function(){ done('Copied'); },sel); }catch(e){ sel(); }
    });
  });

  // ---------- resume ----------
  function lines(t){ return String(t||'').split('\n').map(function(x){ return x.trim(); }).filter(Boolean); }
  function renderResume(){
    var R=S.resume; if(!R) return;
    var h=$('resHead'); h.textContent=''; lines(R.heading).forEach(function(l,i){ if(i) h.appendChild(el('br')); h.appendChild(document.createTextNode(l)); });
    $('resSub').textContent=R.subtitle||'';
    var ex=$('resExp'); ex.textContent='';
    (R.experience||[]).forEach(function(x){ if(!x||!x.role) return; var li=el('li'); li.appendChild(el('h4',null,x.role)); if(x.org) li.appendChild(el('div','org',x.org)); if(x.when) li.appendChild(el('div','when',x.when));
      var pts=lines(x.points); if(pts.length){ var ul=el('ul'); pts.forEach(function(p){ ul.appendChild(el('li',null,p)); }); li.appendChild(ul); } ex.appendChild(li); });
    var ed=$('resEdu'); ed.textContent='';
    (R.education||[]).forEach(function(x){ if(!x||!x.degree) return; var li=el('li'); li.appendChild(el('h4',null,x.degree)); if(x.when) li.appendChild(el('div','when',x.when)); ed.appendChild(li); });
    var sk=$('resSkills'); sk.textContent=''; String(R.skills||'').split(',').map(function(x){ return x.trim(); }).filter(Boolean).forEach(function(k){ sk.appendChild(el('span',null,k)); });
    var tl=$('resTools'); tl.textContent='';
    (R.tools||[]).forEach(function(t){ if(!t||!t.name) return; var d=el('div','tool'), tile=el('span','tile',t.short||t.name.charAt(0)); tile.style.background=/^#[0-9a-f]{3,8}$/i.test(t.color||'')?t.color:'#0F1B2D'; d.appendChild(tile); d.appendChild(document.createTextNode(t.name)); tl.appendChild(d); });
    var cs=lines(R.certs), cl=$('resCerts'); cl.textContent=''; $('resCertsWrap').hidden=!cs.length; $('resCertsTitle').textContent=R.certsTitle||'Certifications';
    cs.forEach(function(c){ var li=el('li'); li.appendChild(icon('check')); li.appendChild(document.createTextNode(c)); cl.appendChild(li); });
    $('resQuoteWrap').hidden=!R.quote; $('resQuote').textContent=R.quote?'“'+R.quote.replace(/^[“"]|[”"]$/g,'')+'”':''; $('resQuoteBy').textContent=R.quoteBy||'';
  }

  function render(){ renderPhotos(); renderCities(); renderWork(); renderBlogs(); renderResume(); }
  window.ASite={ state:S, render:render, preview:PREVIEW, mediaUrl:mediaUrl, skyline:skyline, landscape:landscape, hash:hash, loaded:false };
  render(); // placeholders right away, real content once the files load

  function load(name){ return fetch('data/'+name+'.json',{cache:'no-cache'}).then(function(r){ return r.ok?r.json():null; }).catch(function(){ return null; }); }
  Promise.all(['settings','work','blogs','cities','gallery','resume'].map(load)).then(function(res){
    if(res[0]&&typeof res[0]==='object') S.settings=res[0]; if(!S.settings.photos) S.settings.photos={};
    ['work','blogs','cities','gallery'].forEach(function(k,i){ if(Array.isArray(res[i+1])) S[k]=res[i+1]; });
    if(res[5]&&typeof res[5]==='object') S.resume=res[5];
    render(); window.ASite.loaded=true; document.dispatchEvent(new Event('asite:loaded'));
    if(location.hash){ var t=document.getElementById(location.hash.slice(1)); if(t) t.scrollIntoView(); }
  });
})();

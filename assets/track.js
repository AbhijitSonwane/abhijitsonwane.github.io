/* Anonymous visit and download counter.
   Sends small records (event type, what was clicked, where the visitor came from, device, time zone)
   to the owner's Supabase table. No names, emails, IP addresses or cookies are collected.
   The owner's own browser is never counted. Does nothing until data/analytics.json has a url and key. */
(function(){
  function store(kind,k,v){ try{ var s=window[kind]; if(v===undefined) return s.getItem(k); s.setItem(k,v); }catch(e){ return null; } }
  if(store('localStorage','as-owner')==='1') return;

  var cfg=null, queue=[];
  var visitor=store('localStorage','as-vid');
  if(!visitor){ visitor=Math.random().toString(36).slice(2,12)+Date.now().toString(36); store('localStorage','as-vid',visitor); }
  function source(){
    try{ var q=new URLSearchParams(location.search).get('utm_source')||new URLSearchParams(location.search).get('ref'); if(q) return q.slice(0,60);
      if(!document.referrer) return 'direct';
      var h=new URL(document.referrer).hostname.replace(/^www\./,'');
      if(h===location.hostname) return 'direct';
      if(/linkedin|lnkd/.test(h)) return 'LinkedIn';
      if(/google\./.test(h)) return 'Google';
      if(/naukri/.test(h)) return 'Naukri';
      if(/mail\./.test(h)||/outlook/.test(h)) return 'Email';
      if(/whatsapp|wa\.me/.test(h)) return 'WhatsApp';
      return h.slice(0,60);
    }catch(e){ return 'direct'; }
  }
  var SRC=store('sessionStorage','as-src'); if(!SRC){ SRC=source(); store('sessionStorage','as-src',SRC); }
  var DEVICE=/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)?'mobile':'desktop';
  var TZ=''; try{ TZ=Intl.DateTimeFormat().resolvedOptions().timeZone||''; }catch(e){}

  function send(ev){
    if(!cfg){ queue.push(ev); return; }
    var h={'apikey':cfg.key,'Content-Type':'application/json','Prefer':'return=minimal'};
    if(/^eyJ/.test(cfg.key)) h.Authorization='Bearer '+cfg.key;
    try{ fetch(cfg.url.replace(/\/+$/,'')+'/rest/v1/events',{method:'POST',headers:h,keepalive:true,
      body:JSON.stringify({type:ev.type,label:(ev.label||'').slice(0,200),source:SRC,device:DEVICE,tz:TZ.slice(0,64),visitor:visitor})}).catch(function(){}); }catch(e){}
  }
  function track(type,label){ send({type:type,label:label}); }
  window.ASTrack=track;

  fetch('data/analytics.json',{cache:'no-cache'}).then(function(r){ return r.ok?r.json():null; }).then(function(c){
    if(!c||!c.url||!c.key) return; cfg=c; var q=queue; queue=[]; q.forEach(send);
  }).catch(function(){});

  if(!store('sessionStorage','as-visit')){ store('sessionStorage','as-visit','1'); track('visit',location.hash||'home'); }

  document.addEventListener('click',function(e){
    var t=e.target.closest&&e.target.closest('a,button'); if(!t) return;
    if(t.id==='heroResume'||t.id==='resumeBtn'){ if(/\.pdf/i.test(t.getAttribute('href')||'')) track('resume',t.id==='heroResume'?'top of page':'resume section'); return; }
    if(t.classList.contains('copy')){ var k=t.getAttribute('data-copy')||''; track('copy',k==='v-email'?'email':k==='v-phone'?'phone':k==='v-li'?'linkedin':k); return; }
    var card=t.closest('.card');
    if(card&&t.classList.contains('round')){ var title=(card.querySelector('h3')||{}).textContent||''; track(/file/.test(t.innerHTML)?'report':'link',title); return; }
    if(t.tagName==='A'&&/linkedin\.com/.test(t.href||'')){ track('link','LinkedIn profile'); }
  },true);
})();

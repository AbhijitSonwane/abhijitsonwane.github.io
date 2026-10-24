/* Owner login and site editor.
   The GitHub key that can edit this repo is stored in data/auth.json, encrypted with the
   owner's ID + password (PBKDF2-SHA256, 600k rounds, AES-GCM). Without the password it is useless.
   Saving writes the data/*.json files and uploads to /media through the GitHub API. */
(function(){
  var REPO='AbhijitSonwane/abhijitsonwane.github.io', BRANCH='main';
  var API='https://api.github.com/repos/'+REPO;
  var ROUNDS=600000;
  var token=null; try{ token=sessionStorage.getItem('as-key'); }catch(e){}
  var dirty={}; var $=function(id){ return document.getElementById(id); };
  function el(t,c,x){ var n=document.createElement(t); if(c) n.className=c; if(x!=null) n.textContent=x; return n; }
  function A(){ return window.ASite; }

  // ---------- crypto helpers ----------
  function toB64(bytes){ var s=''; var b=new Uint8Array(bytes); for(var i=0;i<b.length;i+=0x8000) s+=String.fromCharCode.apply(null,b.subarray(i,i+0x8000)); return btoa(s); }
  function fromB64(s){ var bin=atob(s), b=new Uint8Array(bin.length); for(var i=0;i<bin.length;i++) b[i]=bin.charCodeAt(i); return b; }
  function textB64(str){ return toB64(new TextEncoder().encode(str)); }
  function deriveKey(id,pw,salt){
    return crypto.subtle.importKey('raw', new TextEncoder().encode(id.trim().toLowerCase()+'\n'+pw), 'PBKDF2', false, ['deriveKey'])
      .then(function(base){ return crypto.subtle.deriveKey({name:'PBKDF2',salt:salt,iterations:ROUNDS,hash:'SHA-256'}, base, {name:'AES-GCM',length:256}, false, ['encrypt','decrypt']); });
  }
  function lock(id,pw,secret){
    var salt=crypto.getRandomValues(new Uint8Array(16)), iv=crypto.getRandomValues(new Uint8Array(12));
    return deriveKey(id,pw,salt).then(function(k){ return crypto.subtle.encrypt({name:'AES-GCM',iv:iv},k,new TextEncoder().encode(secret)); })
      .then(function(ct){ return {v:1,rounds:ROUNDS,salt:toB64(salt),iv:toB64(iv),data:toB64(ct)}; });
  }
  function unlock(id,pw,box){
    return deriveKey(id,pw,fromB64(box.salt)).then(function(k){ return crypto.subtle.decrypt({name:'AES-GCM',iv:fromB64(box.iv)},k,fromB64(box.data)); })
      .then(function(pt){ return new TextDecoder().decode(pt); });
  }

  // ---------- GitHub helpers ----------
  function headers(t){ return {'Authorization':'Bearer '+(t||token),'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}; }
  function enc(path){ return path.split('/').map(encodeURIComponent).join('/'); }
  function ghError(r){ return r.text().then(function(t){ var m=''; try{ m=JSON.parse(t).message; }catch(e){ m=t; }
    if(r.status===401) return new Error('The GitHub key has expired or is wrong. Run setup again with a new key.');
    if(r.status===403||r.status===404) return new Error('The GitHub key can\'t edit this website. Check it has Contents: Read and write for abhijitsonwane.github.io.');
    if(r.status===409) return new Error('Someone else saved at the same time. Reload the page and try again.');
    return new Error('GitHub said: '+(m||r.status)); }); }
  function getSha(path,t){ return fetch(API+'/contents/'+enc(path)+'?ref='+BRANCH,{headers:headers(t),cache:'no-store'}).then(function(r){ if(r.status===404) return null; if(!r.ok) return ghError(r).then(function(e){ throw e; }); return r.json().then(function(j){ return j.sha; }); }); }
  function putFile(path,b64,message,t){
    return getSha(path,t).then(function(sha){
      var body={message:message,content:b64,branch:BRANCH}; if(sha) body.sha=sha;
      return fetch(API+'/contents/'+enc(path),{method:'PUT',headers:headers(t),body:JSON.stringify(body)});
    }).then(function(r){ if(!r.ok) return ghError(r).then(function(e){ throw e; }); return r.json(); });
  }
  function checkKey(t){ return fetch(API,{headers:headers(t),cache:'no-store'}).then(function(r){ if(!r.ok) return ghError(r).then(function(e){ throw e; }); return r.json(); })
    .then(function(j){ if(j.permissions && j.permissions.push===false) throw new Error('This key can only read. Set Contents to Read and write.'); return true; }); }

  // ---------- login dialog ----------
  var box=null; // encrypted key from data/auth.json
  function loadBox(){ return fetch('data/auth.json?'+Date.now(),{cache:'no-store'}).then(function(r){ return r.ok?r.json():null; }).catch(function(){ return null; }); }
  var lastFocus=null;
  function overlay(id,cls){ var o=el('div','overlay '+cls); o.id=id; o.hidden=true; document.body.appendChild(o); o.addEventListener('click',function(e){ if(e.target===o) close(o); }); return o; }
  function close(o){ o.hidden=true; if(lastFocus&&lastFocus.focus) lastFocus.focus(); }
  function msg(st,cls,t){ st.className='status'+(cls?' '+cls:''); st.textContent=t; }

  var login=overlay('loginBox','login');
  function field(form,label,type,id,ac){ var l=el('label'); l.appendChild(el('span',null,label)); var i=el('input'); i.type=type; i.id=id; if(ac) i.autocomplete=ac; i.required=true; l.appendChild(i); form.appendChild(l); return i; }
  function openLogin(){
    lastFocus=document.activeElement; login.textContent=''; login.hidden=false;
    var sh=el('div','sheet'); sh.setAttribute('role','dialog'); sh.setAttribute('aria-modal','true'); login.appendChild(sh);
    var head=el('div','sheet-head'); var h=el('h2',null,'Owner login'); h.style.fontSize='24px'; head.appendChild(h);
    var x=el('button','btn btn-light btn-sm','Close'); x.type='button'; x.addEventListener('click',function(){ close(login); }); head.appendChild(x); sh.appendChild(head);
    var wait=el('p','note','Checking…'); sh.appendChild(wait);
    loadBox().then(function(b){ box=b; wait.remove(); if(b&&b.data) loginForm(sh); else setupForm(sh,false); });
  }
  function loginForm(sh){
    var f=el('form'); var id=field(f,'ID','text','lgId','username'); var pw=field(f,'Password','password','lgPw','current-password');
    var st=el('p','status'); f.appendChild(st);
    var go=el('button','btn btn-dark','Log in'); go.type='submit'; f.appendChild(go);
    var reset=el('button','linklike','Forgot password or new GitHub key? Set up again'); reset.type='button'; reset.style.fontSize='13px'; reset.style.justifySelf='start';
    reset.addEventListener('click',function(){ sh.removeChild(f); setupForm(sh,true); }); f.appendChild(reset);
    f.addEventListener('submit',function(e){ e.preventDefault(); go.disabled=true; msg(st,'','Checking… this takes a few seconds.');
      unlock(id.value,pw.value,box).then(function(t){ return checkKey(t).then(function(){ return t; }); }).then(function(t){
        token=t; try{ sessionStorage.setItem('as-key',t); }catch(e){} close(login); loggedIn(); openEditor();
      }).catch(function(err){ go.disabled=false; msg(st,'err', err&&err.name==='OperationError' ? 'Wrong ID or password.' : (err&&err.message)||'Couldn\'t log in. Try again.'); });
    });
    sh.appendChild(f); id.focus();
  }
  function setupForm(sh,again){
    var f=el('form');
    f.appendChild(el('p','note', again ? 'Choose a new ID and password, and paste a working GitHub key. This replaces your old login.' : 'First-time setup. Choose your ID and password, and paste the GitHub key you created. The key gets locked with your password before it is saved.'));
    var id=field(f,'Choose an ID','text','suId','username');
    var pw=field(f,'Choose a password (12+ characters, not used anywhere else)','password','suPw','new-password');
    var pw2=field(f,'Type the password again','password','suPw2','new-password');
    var key=field(f,'GitHub key (starts with github_pat_)','password','suKey','off');
    var st=el('p','status'); f.appendChild(st);
    var go=el('button','btn btn-dark',again?'Save new login':'Set up my login'); go.type='submit'; f.appendChild(go);
    f.addEventListener('submit',function(e){ e.preventDefault();
      var t=key.value.trim();
      if(id.value.trim().length<3) return msg(st,'err','Choose an ID of at least 3 characters.');
      if(pw.value.length<12) return msg(st,'err','Use at least 12 characters for the password.');
      if(pw.value!==pw2.value) return msg(st,'err','The two passwords don\'t match.');
      if(!/^(github_pat_|ghp_)/.test(t)) return msg(st,'err','That doesn\'t look like a GitHub key. It should start with github_pat_');
      go.disabled=true; msg(st,'','Checking the key with GitHub…');
      checkKey(t).then(function(){ msg(st,'','Locking the key with your password…'); return lock(id.value,pw.value,t); })
        .then(function(b){ msg(st,'','Saving…'); return putFile('data/auth.json',textB64(JSON.stringify(b,null,2)),'Set up owner login',t).then(function(){ box=b; }); })
        .then(function(){ token=t; try{ sessionStorage.setItem('as-key',t); }catch(e){} close(login); loggedIn(); openEditor(); toast('Login set up. Next time, log in with your ID and password.'); })
        .catch(function(err){ go.disabled=false; msg(st,'err',(err&&err.message)||'Setup failed. Try again.'); });
    });
    sh.appendChild(f); id.focus();
  }

  // ---------- logged-in state ----------
  var editBtn=null;
  function loggedIn(){
    var ol=$('ownerLogin'); ol.textContent='Log out';
    if(!editBtn){ editBtn=el('button','btn btn-light btn-sm','Edit site'); editBtn.type='button'; editBtn.addEventListener('click',openEditor);
      var nr=document.querySelector('.nav-r'); nr.insertBefore(editBtn,nr.firstChild); }
  }
  function logOut(){
    if(Object.keys(dirty).length && !confirmLeave()) return;
    token=null; try{ sessionStorage.removeItem('as-key'); }catch(e){}
    if(editBtn){ editBtn.remove(); editBtn=null; } $('ownerLogin').textContent='Owner login'; close(ed); dirty={};
  }
  var leaveArmed=false;
  function confirmLeave(){ if(leaveArmed){ leaveArmed=false; return true; } leaveArmed=true; toast('You have unsaved changes. Press Log out again to discard them.'); setTimeout(function(){ leaveArmed=false; },4000); return false; }
  $('ownerLogin').addEventListener('click',function(){ if(token) logOut(); else openLogin(); });
  window.addEventListener('beforeunload',function(e){ if(Object.keys(dirty).length){ e.preventDefault(); e.returnValue=''; } });

  var toastEl=null;
  function toast(t){ if(!toastEl){ toastEl=el('div'); toastEl.setAttribute('role','status'); toastEl.style.cssText='position:fixed;left:50%;transform:translateX(-50%);bottom:calc(20px + env(safe-area-inset-bottom,0px));z-index:80;background:#0F1B2D;color:#fff;padding:10px 16px;border-radius:10px;font-size:14px;max-width:min(560px,calc(100% - 32px));box-shadow:0 10px 30px -10px rgba(15,27,45,.5)'; document.body.appendChild(toastEl); }
    toastEl.textContent=t; toastEl.hidden=false; clearTimeout(toastEl._t); toastEl._t=setTimeout(function(){ toastEl.hidden=true; },5000); }

  // ---------- uploads ----------
  var IMG=['jpg','jpeg','png','webp'];
  function slug(name){ return name.toLowerCase().replace(/\.[^.]+$/,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'file'; }
  function shrink(file){ // resize big photos so the site stays fast
    return new Promise(function(res){
      var u=URL.createObjectURL(file), im=new Image();
      im.onload=function(){ var max=2000, w=im.naturalWidth, h=im.naturalHeight, s=Math.min(1,max/Math.max(w,h));
        if(s===1 && file.size<1.5e6){ URL.revokeObjectURL(u); return res({blob:file,ext:(file.name.split('.').pop()||'jpg').toLowerCase()}); }
        var c=document.createElement('canvas'); c.width=Math.round(w*s); c.height=Math.round(h*s); c.getContext('2d').drawImage(im,0,0,c.width,c.height); URL.revokeObjectURL(u);
        c.toBlob(function(b){ res({blob:b||file,ext:b?'jpg':(file.name.split('.').pop()||'jpg')}); },'image/jpeg',.85); };
      im.onerror=function(){ URL.revokeObjectURL(u); res({blob:file,ext:(file.name.split('.').pop()||'jpg').toLowerCase()}); };
      im.src=u;
    });
  }
  function upload(file,kind,st){
    var ext=(file.name.split('.').pop()||'').toLowerCase();
    if(kind==='image' && IMG.indexOf(ext)<0){ msg(st,'err','Use a JPG, PNG or WEBP photo.'); return Promise.reject(); }
    if(kind==='pdf' && ext!=='pdf'){ msg(st,'err','Use a PDF file. For Excel, upload it to Google Drive and paste the link instead.'); return Promise.reject(); }
    if(kind==='pdf' && file.size>10e6){ msg(st,'err','That PDF is over 10 MB. Compress it and try again.'); return Promise.reject(); }
    msg(st,'','Uploading '+file.name+'…');
    var prep = kind==='image' ? shrink(file) : Promise.resolve({blob:file,ext:'pdf'});
    return prep.then(function(p){
      var folder=kind==='image'?'media/images/':'media/docs/', path=folder+slug(file.name)+'-'+Date.now().toString(36)+'.'+p.ext;
      return p.blob.arrayBuffer().then(function(buf){ return putFile(path,toB64(buf),'Upload '+file.name); }).then(function(){
        var pub='/'+path; A().preview[pub]=URL.createObjectURL(p.blob); msg(st,'ok','Uploaded '+file.name+'. Press Publish to put it live.'); return pub; });
    }).catch(function(err){ if(err) msg(st,'err',err.message||'Upload failed. Try again.'); throw err; });
  }

  // ---------- editor ----------
  var ed=overlay('editorBox','editor');
  ed.innerHTML='<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="eTitle">'
   +'<div class="sheet-head"><h2 id="eTitle" style="font-size:26px">Edit your site</h2><button class="btn btn-light btn-sm" id="eClose" type="button">Close</button></div>'
   +'<p class="note">Changes show on the page right away. Press <b>Publish</b> to put them live for everyone (takes about a minute).</p>'
   +'<div class="ed-sec"><h3>Page text</h3><p class="note">Change any fixed text on the page. Clear a box to go back to the original text.</p><div id="eText" style="display:grid;gap:12px"></div></div>'
   +'<div class="ed-sec"><h3>Your photos and resume</h3><div class="f">'
   +'<div class="two"><label><span>Main photo (top of the page)</span><input id="eHero" type="file" accept=".jpg,.jpeg,.png,.webp"></label><label><span>About photo</span><input id="eAbout" type="file" accept=".jpg,.jpeg,.png,.webp"></label></div>'
   +'<div class="row-actions" style="justify-content:flex-start"><button class="mini del" id="eHeroRm" type="button">Use cat for main photo</button><button class="mini del" id="eAboutRm" type="button">Use cat for about photo</button></div>'
   +'<label><span>Resume (PDF) for the Download Resume buttons</span><input id="eResume" type="file" accept=".pdf"></label>'
   +'<div class="row-actions" style="justify-content:flex-start"><button class="mini del" id="eResumeRm" type="button">Remove resume</button></div>'
   +'<p class="status" id="eStatus"></p></div></div>'
   +'<div class="ed-sec"><h3>Section background photos</h3><p class="note">Wide landscape photos work best. Each one fades softly into its section.</p><div class="secphotos" id="eSec"></div><p class="status" id="eSecSt"></p></div>'
   +'<div class="ed-sec"><h3>Where I\'m open to work</h3><div class="list" id="eCities"></div><div class="row-actions" style="justify-content:flex-start"><button class="btn btn-light btn-sm" id="eCityAdd" type="button">Add a city</button></div><p class="status" id="eCitySt"></p></div>'
   +'<div class="ed-sec"><h3>About photo gallery</h3><p class="note">Bike rides, travel, your photography. You can pick several at once.</p><div class="row-actions" style="justify-content:flex-start"><label class="mini">Add photos<input id="eGalAdd" type="file" accept=".jpg,.jpeg,.png,.webp" multiple></label></div><div class="list" id="eGal"></div><p class="status" id="eGalSt"></p></div>'
   +'<div class="ed-sec"><h3>Research and projects</h3><div class="row-actions" style="justify-content:flex-start"><button class="btn btn-dark btn-sm" id="eWNew" type="button">Add new work</button></div>'
   +'<form class="f" id="eWForm" hidden>'
   +'<div class="two"><label><span>Show it under</span><select id="wSec"><option value="research">Research</option><option value="projects">Projects</option></select></label><label><span>Category</span><select id="wCat"></select></label></div>'
   +'<label id="wNewCatW" hidden><span>New category name</span><input id="wNewCat" type="text" placeholder="Credit Note"></label>'
   +'<label><span>Title</span><input id="wTitle" type="text" placeholder="Tata Motors"></label>'
   +'<label><span>Summary (one or two lines)</span><textarea id="wSum"></textarea></label>'
   +'<div class="two"><label><span>Date</span><input id="wDate" type="text" placeholder="Oct 2026"></label><label><span>Tags (commas)</span><input id="wTags" type="text" placeholder="DCF, WACC"></label></div>'
   +'<div class="two"><label><span>Key number (optional)</span><input id="wNum" type="text" placeholder="10-year"></label><label><span>Its label</span><input id="wNumL" type="text" placeholder="Forecast period"></label></div>'
   +'<p class="note">Keep buy/sell ratings and target prices inside the PDF report, not on the card.</p>'
   +'<label><span>Link (Google Drive, LinkedIn post, etc.)</span><input id="wLink" type="url" placeholder="https://"></label>'
   +'<div class="two"><label><span>Cover photo</span><input id="wCover" type="file" accept=".jpg,.jpeg,.png,.webp"></label><label><span>Report (PDF)</span><input id="wRep" type="file" accept=".pdf"></label></div>'
   +'<div class="row-actions" style="justify-content:flex-start"><button class="mini del" id="wCoverRm" type="button">Remove cover</button><button class="mini del" id="wRepRm" type="button">Remove report</button></div>'
   +'<p class="note">Excel files: upload to Google Drive and paste the share link above.</p><p class="status" id="wSt"></p>'
   +'<div class="row-actions"><button class="btn btn-light btn-sm" type="button" id="wCancel">Cancel</button><button class="btn btn-dark btn-sm" type="submit" id="wSave">Save to list</button></div></form>'
   +'<div class="list" id="eWList"></div></div>'
   +'<div class="ed-sec"><h3>Resume section</h3>'
   +'<div class="f"><label><span>Heading (press Enter for a new line)</span><textarea id="rHead" style="min-height:60px"></textarea></label>'
   +'<label><span>Line under the heading</span><input id="rSub" type="text"></label></div>'
   +'<h4 style="margin:6px 0 0;font-size:15px">Experience</h4><div id="rExp" style="display:grid;gap:10px"></div>'
   +'<div class="row-actions" style="justify-content:flex-start"><button class="btn btn-light btn-sm" id="rExpAdd" type="button">Add a job or internship</button></div>'
   +'<h4 style="margin:6px 0 0;font-size:15px">Education</h4><div class="list" id="rEdu"></div>'
   +'<div class="row-actions" style="justify-content:flex-start"><button class="btn btn-light btn-sm" id="rEduAdd" type="button">Add education</button></div>'
   +'<div class="f"><label><span>Skills (separate with commas)</span><textarea id="rSkills" style="min-height:70px"></textarea></label></div>'
   +'<h4 style="margin:6px 0 0;font-size:15px">Tools</h4><p class="note">Short label is the 1–2 letters on the coloured tile.</p><div class="list" id="rTools"></div>'
   +'<div class="row-actions" style="justify-content:flex-start"><button class="btn btn-light btn-sm" id="rToolAdd" type="button">Add a tool</button></div>'
   +'<div class="f"><label><span>Certifications title</span><input id="rCertT" type="text"></label>'
   +'<label><span>Certifications (one per line)</span><textarea id="rCerts" style="min-height:110px"></textarea></label>'
   +'<label><span>Quote (leave empty to hide the quote card)</span><input id="rQuote" type="text"></label>'
   +'<label><span>Quote by</span><input id="rQuoteBy" type="text"></label></div></div>'
   +'<div class="ed-sec"><h3>Blogs</h3><div class="row-actions" style="justify-content:flex-start"><button class="btn btn-dark btn-sm" id="eBNew" type="button">Write a new post</button></div>'
   +'<form class="f" id="eBForm" hidden>'
   +'<label><span>Title</span><input id="bTitle" type="text" placeholder="What a financial model really taught me"></label>'
   +'<div class="two"><label><span>Topic tag</span><input id="bTag" type="text" placeholder="What I Learned"></label><label><span>Date</span><input id="bDate" type="text" placeholder="Oct 2026"></label></div>'
   +'<label><span>Read time (minutes)</span><input id="bMins" type="number" min="1" max="60"></label>'
   +'<label><span>Short summary</span><textarea id="bSum" style="min-height:60px"></textarea></label>'
   +'<label><span>Full post (leave a blank line between paragraphs)</span><textarea id="bBody" style="min-height:200px"></textarea></label>'
   +'<label><span>Link instead of full text (optional)</span><input id="bLink" type="url" placeholder="https://"></label>'
   +'<label><span>Cover photo</span><input id="bCover" type="file" accept=".jpg,.jpeg,.png,.webp"></label><p class="status" id="bSt"></p>'
   +'<div class="row-actions"><button class="btn btn-light btn-sm" type="button" id="bCancel">Cancel</button><button class="btn btn-dark btn-sm" type="submit" id="bSave">Save to list</button></div></form>'
   +'<div class="list" id="eBList"></div></div>'
   +'<div class="pubbar"><span class="status" id="pubSt">No unpublished changes.</span><button class="btn btn-dark btn-sm" id="pubBtn" type="button" disabled>Publish</button></div>'
   +'</div>';

  function S(){ return A().state; }
  function changed(name){ dirty[name]=true; $('pubBtn').disabled=false; msg($('pubSt'),'','Unpublished changes: '+Object.keys(dirty).join(', ')+'.'); A().render(); }
  function openEditor(){ if(!token) return openLogin(); lastFocus=document.activeElement; renderAll(); ed.hidden=false; $('eClose').focus(); }
  $('eClose').addEventListener('click',function(){ close(ed); });
  document.addEventListener('keydown',function(e){ if(e.key!=='Escape') return; if(!login.hidden) close(login); else if(!ed.hidden) close(ed); });

  // your photos and resume
  function fileInput(input,kind,st,fn){ input.addEventListener('change',function(){ var f=this.files&&this.files[0]; this.value=''; if(!f) return; upload(f,kind,st).then(fn).catch(function(){}); }); }
  fileInput($('eHero'),'image',$('eStatus'),function(p){ S().settings.heroPhoto=p; changed('settings'); });
  fileInput($('eAbout'),'image',$('eStatus'),function(p){ S().settings.aboutPhoto=p; changed('settings'); });
  fileInput($('eResume'),'pdf',$('eStatus'),function(p){ S().settings.resume=p; changed('settings'); });
  $('eHeroRm').addEventListener('click',function(){ S().settings.heroPhoto=''; changed('settings'); });
  $('eAboutRm').addEventListener('click',function(){ S().settings.aboutPhoto=''; changed('settings'); });
  $('eResumeRm').addEventListener('click',function(){ S().settings.resume=''; changed('settings'); });

  var SECS=[['about','About'],['open','Open to work'],['research','Research'],['projects','Projects'],['resume','Resume'],['quote','Resume quote card'],['blogs','Blogs'],['goals','Goals'],['contact','Contact']];
  var SECPAL={about:'warm',open:'blue',research:'blue',projects:'sage',resume:'dusk',quote:'blue',blogs:'warm',goals:'sage',contact:'blue'};
  function thumb(path,fallback){ var u=A().mediaUrl(path); if(u){ var i=el('img'); i.src=u; i.alt=''; return i; } return fallback(); }
  function renderSec(){
    var b=$('eSec'); b.textContent=''; var ph=S().settings.photos||(S().settings.photos={});
    SECS.forEach(function(s){ var k=s[0], sp=el('div','sp'), th=el('div','th');
      th.appendChild(thumb(ph[k],function(){ return A().landscape(A().hash('sec-'+k),SECPAL[k]); })); sp.appendChild(th);
      var info=el('div'); info.appendChild(el('b',null,s[1])); var a=el('div','a');
      var lb=el('label','mini',ph[k]?'Change':'Add photo'), inp=el('input'); inp.type='file'; inp.accept='.jpg,.jpeg,.png,.webp'; inp.setAttribute('aria-label','Photo for '+s[1]); lb.appendChild(inp);
      inp.addEventListener('change',function(){ var f=this.files&&this.files[0]; if(f) upload(f,'image',$('eSecSt')).then(function(p){ ph[k]=p; changed('settings'); renderSec(); }).catch(function(){}); });
      a.appendChild(lb);
      if(ph[k]){ var rm=el('button','mini del','Remove'); rm.type='button'; rm.addEventListener('click',function(){ ph[k]=''; changed('settings'); renderSec(); }); a.appendChild(rm); }
      info.appendChild(a); sp.appendChild(info); b.appendChild(sp); });
  }

  function confirmBtn(btn,fn){ btn.addEventListener('click',function(){ if(btn.dataset.c){ fn(); } else { btn.dataset.c='1'; btn.textContent='Sure?'; setTimeout(function(){ if(btn.isConnected){ delete btn.dataset.c; btn.textContent='Remove'; } },3000); } }); }
  function upBtn(arr,idx,label,after){ var u=el('button','mini','↑'); u.type='button'; u.setAttribute('aria-label','Move '+label+' up'); u.addEventListener('click',function(){ var t=arr[idx-1]; arr[idx-1]=arr[idx]; arr[idx]=t; after(); }); return u; }

  function renderCities(){
    var b=$('eCities'); b.textContent=''; var list=S().cities;
    list.forEach(function(c,idx){
      var r=el('div','erow'), th=el('div','th'); th.appendChild(thumb(c.photo,function(){ return A().skyline(c.name||'City'); })); r.appendChild(th);
      var fl=el('div','fields'), n=el('input'); n.type='text'; n.value=c.name||''; n.placeholder='City'; n.setAttribute('aria-label','City name');
      n.addEventListener('change',function(){ c.name=this.value.trim()||c.name; changed('cities'); renderCities(); });
      var nt=el('input'); nt.type='text'; nt.value=c.note||''; nt.placeholder='Open to relocate'; nt.setAttribute('aria-label','Note for '+(c.name||'city'));
      nt.addEventListener('change',function(){ c.note=this.value.trim(); changed('cities'); });
      fl.appendChild(n); fl.appendChild(nt); r.appendChild(fl);
      var a=el('div','acts');
      var hb=el('button','mini',c.home?'Home base ✓':'Make home base'); hb.type='button'; hb.addEventListener('click',function(){ list.forEach(function(x){ x.home=(x===c); }); changed('cities'); renderCities(); }); a.appendChild(hb);
      var lb=el('label','mini',c.photo?'Change photo':'Add photo'), inp=el('input'); inp.type='file'; inp.accept='.jpg,.jpeg,.png,.webp'; inp.setAttribute('aria-label','Photo for '+(c.name||'city')); lb.appendChild(inp);
      inp.addEventListener('change',function(){ var f=this.files&&this.files[0]; if(f) upload(f,'image',$('eCitySt')).then(function(p){ c.photo=p; changed('cities'); renderCities(); }).catch(function(){}); }); a.appendChild(lb);
      if(idx>0) a.appendChild(upBtn(list,idx,c.name,function(){ changed('cities'); renderCities(); }));
      var dl=el('button','mini del','Remove'); dl.type='button'; confirmBtn(dl,function(){ list.splice(idx,1); changed('cities'); renderCities(); }); a.appendChild(dl);
      r.appendChild(a); b.appendChild(r);
    });
  }
  $('eCityAdd').addEventListener('click',function(){ S().cities.push({name:'New city',note:'Open to relocate',home:false,photo:''}); changed('cities'); renderCities(); var ins=$('eCities').querySelectorAll('input[type=text]'); if(ins.length>1){ ins[ins.length-2].focus(); ins[ins.length-2].select(); } });

  $('eGalAdd').addEventListener('change',function(){ var files=Array.prototype.slice.call(this.files||[]); this.value='';
    (function next(){ var f=files.shift(); if(!f) return; upload(f,'image',$('eGalSt')).then(function(p){ S().gallery.push({photo:p,caption:''}); changed('gallery'); renderGal(); }).catch(function(){}).then(next); })(); });
  function renderGal(){
    var b=$('eGal'); b.textContent=''; var list=S().gallery;
    list.forEach(function(g,idx){ var r=el('div','erow'), th=el('div','th'); th.appendChild(thumb(g.photo,function(){ return el('span'); })); r.appendChild(th);
      var fl=el('div','fields'), c=el('input'); c.type='text'; c.value=g.caption||''; c.placeholder='Caption (optional)'; c.setAttribute('aria-label','Caption for photo '+(idx+1));
      c.addEventListener('change',function(){ g.caption=this.value.trim(); changed('gallery'); }); fl.appendChild(c); r.appendChild(fl);
      var a=el('div','acts'); if(idx>0) a.appendChild(upBtn(list,idx,'photo '+(idx+1),function(){ changed('gallery'); renderGal(); }));
      var dl=el('button','mini del','Remove'); dl.type='button'; confirmBtn(dl,function(){ list.splice(idx,1); changed('gallery'); renderGal(); }); a.appendChild(dl);
      r.appendChild(a); b.appendChild(r); });
  }

  // research and projects
  var DEFCATS={research:['Company Report','Sector Report'],projects:['Financial Model','Case Study','Startup Case Study','Side Project']};
  var wItem=null, wCover='', wRep='';
  function catsFor(sec){ var c=DEFCATS[sec].slice(); S().work.forEach(function(i){ if((i.section||'research')===sec&&i.category&&c.indexOf(i.category)<0) c.push(i.category); }); return c; }
  function fillCats(sec,sel){ var s=$('wCat'); s.textContent=''; catsFor(sec).forEach(function(c){ var o=el('option',null,c); o.value=c; s.appendChild(o); });
    var o=el('option',null,'New category…'); o.value='__new'; s.appendChild(o); s.value=sel&&catsFor(sec).indexOf(sel)>=0?sel:catsFor(sec)[0]; $('wNewCatW').hidden=s.value!=='__new'; }
  $('wSec').addEventListener('change',function(){ fillCats(this.value); });
  $('wCat').addEventListener('change',function(){ $('wNewCatW').hidden=this.value!=='__new'; });
  function openWork(it){
    wItem=it; wCover=it?it.cover||'':''; wRep=it?it.report||'':'';
    $('wSec').value=it?it.section||'research':'research'; fillCats($('wSec').value,it&&it.category);
    $('wNewCat').value=''; $('wTitle').value=it?it.title:''; $('wSum').value=it?it.summary||'':''; $('wDate').value=it?it.date||'':''; $('wTags').value=it?it.tags||'':'';
    $('wNum').value=it?it.keyNumber||'':''; $('wNumL').value=it?it.keyLabel||'':''; $('wLink').value=it?it.link||'':''; $('wCover').value=''; $('wRep').value='';
    msg($('wSt'),'',[wCover?'Has a cover photo':'',wRep?'Has a report attached':''].filter(Boolean).join(' · '));
    $('wSave').textContent=it?'Update in list':'Save to list'; $('eWForm').hidden=false; $('wTitle').focus();
  }
  $('eWNew').addEventListener('click',function(){ openWork(null); });
  $('wCancel').addEventListener('click',function(){ $('eWForm').hidden=true; });
  function busy(btn,p){ btn.disabled=true; return p.then(function(v){ btn.disabled=false; return v; },function(e){ btn.disabled=false; throw e; }); }
  $('wCover').addEventListener('change',function(){ var f=this.files&&this.files[0]; if(f) busy($('wSave'),upload(f,'image',$('wSt'))).then(function(p){ wCover=p; }).catch(function(){}); });
  $('wRep').addEventListener('change',function(){ var f=this.files&&this.files[0]; if(f) busy($('wSave'),upload(f,'pdf',$('wSt'))).then(function(p){ wRep=p; }).catch(function(){}); });
  $('wCoverRm').addEventListener('click',function(){ wCover=''; msg($('wSt'),'','Cover removed. The card will use chart art.'); });
  $('wRepRm').addEventListener('click',function(){ wRep=''; msg($('wSt'),'','Report removed.'); });
  function okLink(v){ return !v || /^https?:\/\//i.test(v); }
  $('eWForm').addEventListener('submit',function(e){ e.preventDefault(); var st=$('wSt');
    var title=$('wTitle').value.trim(); if(!title) return msg(st,'err','Add a title.');
    var cat=$('wCat').value; if(cat==='__new'){ cat=$('wNewCat').value.trim(); if(!cat) return msg(st,'err','Name the new category.'); }
    var link=$('wLink').value.trim(); if(!okLink(link)) return msg(st,'err','Links must start with https://');
    var it={section:$('wSec').value,category:cat,title:title,summary:$('wSum').value.trim(),date:$('wDate').value.trim(),tags:$('wTags').value.trim(),
      keyNumber:$('wNum').value.trim(),keyLabel:$('wNumL').value.trim(),link:link,cover:wCover,report:wRep};
    var list=S().work; if(wItem){ list[list.indexOf(wItem)]=it; } else list.unshift(it);
    $('eWForm').hidden=true; changed('work'); renderWork(); });
  function row(title,sub,onEdit,upEl,onDel){ var r=el('div','row'), info=el('div'); info.appendChild(el('div','t',title)); info.appendChild(el('div','c',sub)); r.appendChild(info);
    var a=el('div','acts'); if(upEl) a.appendChild(upEl); var e=el('button','mini','Edit'); e.type='button'; e.addEventListener('click',onEdit); a.appendChild(e);
    var d=el('button','mini del','Remove'); d.type='button'; confirmBtn(d,onDel); a.appendChild(d); r.appendChild(a); return r; }
  function renderWork(){
    var b=$('eWList'); b.textContent=''; var list=S().work;
    [['research','Research'],['projects','Projects']].forEach(function(sx){
      var idxs=[]; list.forEach(function(it,i){ if((it.section||'research')===sx[0]) idxs.push(i); }); if(!idxs.length) return;
      b.appendChild(el('div','grp',sx[1]));
      idxs.forEach(function(i,n){ var it=list[i];
        var up=null; if(n>0){ up=el('button','mini','↑'); up.type='button'; up.setAttribute('aria-label','Move '+it.title+' up');
          up.addEventListener('click',function(){ var j=idxs[n-1], t=list[j]; list[j]=list[i]; list[i]=t; changed('work'); renderWork(); }); }
        b.appendChild(row(it.title,(it.category||'')+(it.cover?' · cover photo':'')+(it.report?' · report':''),function(){ openWork(it); },up,function(){ list.splice(list.indexOf(it),1); changed('work'); renderWork(); }));
      });
    });
  }

  // blogs
  var bItem=null, bCover='';
  function openBlog(p){ bItem=p; bCover=p?p.cover||'':'';
    $('bTitle').value=p?p.title:''; $('bTag').value=p?p.tag||'':''; $('bDate').value=p?p.date||'':''; $('bMins').value=p&&p.mins?p.mins:'';
    $('bSum').value=p?p.summary||'':''; $('bBody').value=p?p.body||'':''; $('bLink').value=p?p.link||'':''; $('bCover').value='';
    msg($('bSt'),'',bCover?'Has a cover photo':''); $('bSave').textContent=p?'Update in list':'Save to list'; $('eBForm').hidden=false; $('bTitle').focus(); }
  $('eBNew').addEventListener('click',function(){ openBlog(null); });
  $('bCancel').addEventListener('click',function(){ $('eBForm').hidden=true; });
  $('bCover').addEventListener('change',function(){ var f=this.files&&this.files[0]; if(f) busy($('bSave'),upload(f,'image',$('bSt'))).then(function(p){ bCover=p; }).catch(function(){}); });
  $('eBForm').addEventListener('submit',function(e){ e.preventDefault(); var st=$('bSt');
    var t=$('bTitle').value.trim(); if(!t) return msg(st,'err','Add a title.');
    var link=$('bLink').value.trim(); if(!okLink(link)) return msg(st,'err','Links must start with https://');
    if(!$('bBody').value.trim()&&!link&&!$('bSum').value.trim()) return msg(st,'err','Write the post, or add a link to it.');
    var p={title:t,tag:$('bTag').value.trim(),date:$('bDate').value.trim(),mins:parseInt($('bMins').value,10)||0,summary:$('bSum').value.trim(),body:$('bBody').value.trim(),link:link,cover:bCover};
    var list=S().blogs; if(bItem) list[list.indexOf(bItem)]=p; else list.unshift(p);
    $('eBForm').hidden=true; changed('blogs'); renderBlogs(); });
  function renderBlogs(){ var b=$('eBList'); b.textContent=''; var list=S().blogs;
    list.forEach(function(p,idx){ b.appendChild(row(p.title,[p.date,p.tag].filter(Boolean).join(' · ')||'Post',function(){ openBlog(p); },
      idx>0?upBtn(list,idx,p.title,function(){ changed('blogs'); renderBlogs(); }):null,function(){ list.splice(list.indexOf(p),1); changed('blogs'); renderBlogs(); })); }); }


  // resume section
  function R(){ var st=S(); if(!st.resume) st.resume={experience:[],education:[],tools:[]}; ['experience','education','tools'].forEach(function(k){ if(!Array.isArray(st.resume[k])) st.resume[k]=[]; }); return st.resume; }
  function bindText(id,key){ $(id).addEventListener('change',function(){ R()[key]=this.value.trim(); changed('resume'); }); }
  bindText('rHead','heading'); bindText('rSub','subtitle'); bindText('rSkills','skills'); bindText('rCertT','certsTitle'); bindText('rCerts','certs'); bindText('rQuote','quote'); bindText('rQuoteBy','quoteBy');
  function inp(val,ph,label,fn,tag){ var i=el(tag||'input'); if(!tag) i.type='text'; i.value=val||''; i.placeholder=ph||''; i.setAttribute('aria-label',label); i.addEventListener('change',function(){ fn(this.value.trim()); changed('resume'); }); return i; }
  function renderResumeEd(){
    var r=R(); $('rHead').value=r.heading||''; $('rSub').value=r.subtitle||''; $('rSkills').value=r.skills||''; $('rCertT').value=r.certsTitle||''; $('rCerts').value=r.certs||''; $('rQuote').value=r.quote||''; $('rQuoteBy').value=r.quoteBy||'';
    var ex=$('rExp'); ex.textContent='';
    r.experience.forEach(function(x,idx){
      var f=el('div','f');
      var two=el('div','two'); var l1=el('label'); l1.appendChild(el('span',null,'Role')); l1.appendChild(inp(x.role,'Financial Analyst','Role',function(v){ x.role=v; })); two.appendChild(l1);
      var l2=el('label'); l2.appendChild(el('span',null,'Company')); l2.appendChild(inp(x.org,'Company name','Company',function(v){ x.org=v; })); two.appendChild(l2); f.appendChild(two);
      var l3=el('label'); l3.appendChild(el('span',null,'Dates')); l3.appendChild(inp(x.when,'Jun 2026 – Present','Dates',function(v){ x.when=v; })); f.appendChild(l3);
      var l4=el('label'); l4.appendChild(el('span',null,'Points (one per line)')); var ta=inp(x.points,'What you did and learned','Points',function(v){ x.points=v; },'textarea'); l4.appendChild(ta); f.appendChild(l4);
      var a=el('div','row-actions'); a.style.justifyContent='flex-start';
      if(idx>0) a.appendChild(upBtn(r.experience,idx,x.role||'job',function(){ changed('resume'); renderResumeEd(); }));
      var d=el('button','mini del','Remove'); d.type='button'; confirmBtn(d,function(){ r.experience.splice(idx,1); changed('resume'); renderResumeEd(); }); a.appendChild(d); f.appendChild(a);
      ex.appendChild(f);
    });
    var eu=$('rEdu'); eu.textContent='';
    r.education.forEach(function(x,idx){ var row=el('div','erow'); row.style.gridTemplateColumns='minmax(0,1fr) auto';
      var fl=el('div','fields'); fl.appendChild(inp(x.degree,'MBA (Finance)','Degree',function(v){ x.degree=v; })); fl.appendChild(inp(x.when,'2023 – 2025','Years',function(v){ x.when=v; })); row.appendChild(fl);
      var a=el('div','acts'); if(idx>0) a.appendChild(upBtn(r.education,idx,x.degree||'item',function(){ changed('resume'); renderResumeEd(); }));
      var d=el('button','mini del','Remove'); d.type='button'; confirmBtn(d,function(){ r.education.splice(idx,1); changed('resume'); renderResumeEd(); }); a.appendChild(d); row.appendChild(a); eu.appendChild(row); });
    var tl=$('rTools'); tl.textContent='';
    r.tools.forEach(function(t,idx){ var row=el('div','erow'); row.style.gridTemplateColumns='48px minmax(0,1fr) auto';
      var col=el('input'); col.type='color'; col.value=/^#[0-9a-f]{6}$/i.test(t.color||'')?t.color:'#0F1B2D'; col.setAttribute('aria-label','Tile colour for '+(t.name||'tool')); col.style.cssText='width:44px;height:40px;border:1px solid var(--line);border-radius:8px;padding:2px;background:#fff';
      col.addEventListener('change',function(){ t.color=this.value; changed('resume'); }); row.appendChild(col);
      var fl=el('div','fields'); fl.appendChild(inp(t.name,'Excel','Tool name',function(v){ t.name=v; })); fl.appendChild(inp(t.short,'X','Short label',function(v){ t.short=v.slice(0,3); })); row.appendChild(fl);
      var a=el('div','acts'); if(idx>0) a.appendChild(upBtn(r.tools,idx,t.name||'tool',function(){ changed('resume'); renderResumeEd(); }));
      var d=el('button','mini del','Remove'); d.type='button'; confirmBtn(d,function(){ r.tools.splice(idx,1); changed('resume'); renderResumeEd(); }); a.appendChild(d); row.appendChild(a); tl.appendChild(row); });
  }
  $('rExpAdd').addEventListener('click',function(){ R().experience.unshift({role:'',org:'',when:'',points:''}); changed('resume'); renderResumeEd(); var f=$('rExp').querySelector('input'); if(f) f.focus(); });
  $('rEduAdd').addEventListener('click',function(){ R().education.push({degree:'',when:''}); changed('resume'); renderResumeEd(); var ins=$('rEdu').querySelectorAll('input'); if(ins.length) ins[ins.length-2].focus(); });
  $('rToolAdd').addEventListener('click',function(){ R().tools.push({name:'',short:'',color:'#2563EB'}); changed('resume'); renderResumeEd(); var ins=$('rTools').querySelectorAll('input[type=text]'); if(ins.length) ins[ins.length-2].focus(); });


  // page text
  function renderTextEd(){
    var box=$('eText'); box.textContent=''; var st=S(); if(!st.text) st.text={}; var T=st.text, D=A().textDefault||{};
    var groups={}, order=[];
    document.querySelectorAll('#app [data-edit], body > section [data-edit], [data-edit]').forEach(function(n){
      if(n.closest('.overlay')) return; var g=n.getAttribute('data-group')||'Other', k=n.getAttribute('data-edit');
      if(!groups[g]){ groups[g]=[]; order.push(g); } if(groups[g].some(function(x){ return x.k===k; })) return;
      groups[g].push({k:k,label:n.getAttribute('data-label')||k,long:(D[k]||'').length>70||/\n/.test(D[k]||'')});
    });
    order.forEach(function(g){
      var d=el('details','f'); var sm=el('summary',null,g); sm.style.cssText='cursor:pointer;font-weight:600;font-size:15px'; d.appendChild(sm);
      var inner=el('div'); inner.style.cssText='display:grid;gap:10px;margin-top:10px';
      groups[g].forEach(function(f){
        var l=el('label'); l.appendChild(el('span',null,f.label));
        var i=el(f.long?'textarea':'input'); if(!f.long) i.type='text'; else i.style.minHeight='70px';
        i.value=(typeof T[f.k]==='string'&&T[f.k].trim())?T[f.k]:(D[f.k]||'');
        i.addEventListener('change',function(){ var v=this.value.trim(); if(!v||v===D[f.k]){ delete T[f.k]; if(!v) this.value=D[f.k]||''; } else T[f.k]=v; changed('text'); });
        l.appendChild(i); inner.appendChild(l);
      });
      d.appendChild(inner); box.appendChild(d);
    });
  }

  function renderAll(){ if(!S().settings.photos) S().settings.photos={}; renderSec(); renderCities(); renderGal(); renderWork(); renderBlogs(); renderResumeEd(); renderTextEd(); }

  // publish
  $('pubBtn').addEventListener('click',function(){
    var names=Object.keys(dirty); if(!names.length) return; var b=this, st=$('pubSt'); b.disabled=true;
    var chain=Promise.resolve();
    names.forEach(function(n){ chain=chain.then(function(){ msg(st,'','Publishing '+n+'…'); return putFile('data/'+n+'.json',textB64(JSON.stringify(S()[n],null,2)+'\n'),'Update '+n+' from site editor').then(function(){ delete dirty[n]; }); }); });
    chain.then(function(){ msg(st,'ok','Published. The live site updates in about a minute.'); toast('Published. Your live site updates in about a minute.'); })
      .catch(function(err){ b.disabled=false; msg(st,'err',(err&&err.message)||'Publishing failed. Try again.'); });
  });

  if(token){ loggedIn(); }
})();

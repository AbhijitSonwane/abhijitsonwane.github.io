/* Builds one shareable page per research/project item: /work/<slug>/index.html
   Each page has its own LinkedIn preview (title, summary, cover photo).
   Used by the site editor when publishing, and by the site to link cards to their page. */
(function(root){
  var BASE='https://abhijitsonwane.github.io';
  var VERSION='20261025b';
  function slugify(t){ return String(t||'item').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60)||'item'; }
  function assignSlugs(items){ // keep existing slugs, give new items a unique one
    var used={}; items.forEach(function(i){ if(i.slug) used[i.slug]=1; });
    items.forEach(function(i){ if(i.slug) return; var s=slugify(i.title), n=2, c=s; while(used[c]) c=s+'-'+(n++); i.slug=c; used[c]=1; });
    return items;
  }
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function abs(p){ if(!p) return ''; if(/^https?:\/\//i.test(p)) return p; return BASE+(p.charAt(0)==='/'?'':'/')+p; }
  function pageUrl(it){ return BASE+'/work/'+it.slug+'/'; }
  function shareUrl(it){ return pageUrl(it)+'?utm_source=linkedin'; }
  function build(it,settings){
    settings=settings||{};
    var title=it.title||'Untitled', cat=it.category||'', sum=it.summary||'';
    var img=it.cover?abs(it.cover):BASE+'/assets/og-default.png';
    var tags=String(it.tags||'').split(',').map(function(t){ return t.trim(); }).filter(Boolean);
    var link=/^https?:\/\//i.test(it.link||'')?it.link:'';
    var btns='';
    if(it.report) btns+='<a class="btn btn-dark" href="'+esc(it.report)+'" target="_blank" rel="noopener" data-track="report"><svg class="ico" aria-hidden="true"><use href="#i-file"/></svg> Open the report (PDF)</a>';
    if(link) btns+='<a class="btn '+(it.report?'btn-light':'btn-dark')+'" href="'+esc(link)+'" target="_blank" rel="noopener" data-track="link"><svg class="ico" aria-hidden="true"><use href="#i-out"/></svg> Open the full work</a>';
    var resume=settings.resume?'<a class="btn btn-light" id="heroResume" href="'+esc(settings.resume)+'" target="_blank" rel="noopener"><svg class="ico" aria-hidden="true"><use href="#i-down"/></svg> Download my resume</a>':'';
    var disclaim=(it.section||'research')==='research'?'<p class="disclaim">Educational research for portfolio purposes only. Not investment advice or a recommendation to buy or sell any security.</p>':'';
    var key=it.keyNumber?'<div class="figs"><div><b>'+esc(it.keyNumber)+'</b><span>'+esc(it.keyLabel||'')+'</span></div></div>':'';
    return '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
      +'<title>'+esc(title)+' | Abhijit Sonwane</title>\n'
      +'<meta name="description" content="'+esc(sum)+'">\n'
      +'<meta property="og:type" content="article">\n<meta property="og:title" content="'+esc(title)+' | Abhijit Sonwane">\n'
      +'<meta property="og:description" content="'+esc(sum)+'">\n<meta property="og:image" content="'+esc(img)+'">\n'
      +'<meta property="og:url" content="'+esc(pageUrl(it))+'">\n<meta name="twitter:card" content="summary_large_image">\n'
      +'<link rel="canonical" href="'+esc(pageUrl(it))+'">\n'
      +'<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=IBM+Plex+Mono:wght@400;500&display=swap">\n'
      +'<link rel="stylesheet" href="/assets/site.css?v='+VERSION+'">\n</head>\n<body>\n'
      +'<svg width="0" height="0" style="position:absolute" aria-hidden="true"><symbol id="i-file" viewBox="0 0 24 24"><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></symbol><symbol id="i-out" viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></symbol><symbol id="i-down" viewBox="0 0 24 24"><path d="M12 4v12M6 10l6 6 6-6M5 20h14"/></symbol><symbol id="i-arrow" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></symbol><symbol id="i-back" viewBox="0 0 24 24"><path d="M19 12H5M11 18l-6-6 6-6"/></symbol></svg>\n'
      +'<header class="nav"><div class="wrap"><a class="logo" href="/" aria-label="Abhijit Sonwane, home">A<span>S</span></a>'
      +'<nav class="links" aria-label="Sections"><a href="/#research">Research</a><a href="/#projects">Projects</a><a href="/#resume">Resume</a><a href="/#contact">Contact</a></nav>'
      +'<div class="nav-r"><a class="btn btn-dark btn-sm" href="/#contact">Let\'s Connect <svg class="ico" aria-hidden="true"><use href="#i-arrow"/></svg></a></div></div></header>\n'
      +'<main class="band detail"><div class="wrap">'
      +'<a class="backlink" href="/#'+esc(it.section||'research')+'"><svg class="ico" aria-hidden="true"><use href="#i-back"/></svg> All my work</a>'
      +'<article>'+(cat?'<span class="chip">'+esc(cat)+'</span>':'')+'<h1>'+esc(title)+'</h1>'
      +(it.date||tags.length?'<p class="meta">'+esc([it.date].concat(tags).filter(Boolean).join(' · '))+'</p>':'')
      +(it.cover?'<div class="cover"><img src="'+esc(it.cover)+'" alt=""></div>':'')
      +(sum?'<p class="lede">'+esc(sum)+'</p>':'')+key
      +(it.writeup?'<div class="writeup">'+String(it.writeup).split(/\n\s*\n/).map(function(p){ p=p.trim(); return p?'<p>'+esc(p).replace(/\n/g,'<br>')+'</p>':''; }).join('')+'</div>':'')
      +(btns||resume?'<div class="cta">'+btns+resume+'</div>':'')+disclaim
      +'</article>'
      +'<aside class="aboutme"><b>Abhijit Sonwane</b><span>MBA Finance analyst in Pune. Financial models, company research and startup funding.</span><a href="/">See all my work <svg class="ico" aria-hidden="true"><use href="#i-arrow"/></svg></a></aside>'
      +'</div></main>\n'
      +'<footer><div class="wrap"><span>© 2026 Abhijit Sonwane · This site counts visits and downloads anonymously.</span><span><a href="/">abhijitsonwane.github.io</a></span></div></footer>\n'
      +'<script src="/assets/track.js?v='+VERSION+'" defer></script>\n</body>\n</html>\n';
  }
  var api={slugify:slugify,assignSlugs:assignSlugs,build:build,pageUrl:pageUrl,shareUrl:shareUrl,BASE:BASE};
  if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.ASPages=api;
})(this);

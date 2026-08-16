/* Atelier Moka — native-scroll choreography for #direction-lab.
   Self-contained: delete this file's <script> tag (+ the CSS <link> and the
   <section id="direction-lab"> block) to remove the experiment entirely.
   The only thing here that is NOT part of that experiment is renderProjects()
   below, which adds a very small scroll parallax to the #selected-work case
   studies (a separate, independent improvement) — safe to keep either way.
   Single rAF-gated scroll/resize listener; nothing runs while idle. */
(function(){
  var stories=document.querySelectorAll('[data-moka-story]');
  if(!stories.length)return;
  var reduce=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var clamp=function(n,a,b){return Math.max(a,Math.min(b,n));};
  var range=function(p,a,b){return clamp((p-a)/(b-a),0,1);};
  var ease=function(t){return 1-Math.pow(1-t,3);};
  var raf=0;
  var projects=Array.prototype.slice.call(document.querySelectorAll('#selected-work .proj'));
  var renderProjects=function(){
    var vh=window.innerHeight||800;
    projects.forEach(function(el,i){
      var r=el.getBoundingClientRect();
      if(r.bottom<0||r.top>vh)return;
      var t=clamp(((r.top+r.height*.5)-vh*.5)/(vh+r.height),-.5,.5)*2;
      var amp=i===2?8:13;
      el.style.setProperty('--proj-shift',(-t*amp).toFixed(2)+'px');
    });
  };

  stories.forEach(function(story){
    var track=story.querySelector('.moka-story__track');
    var browser=story.querySelector('[data-moka-browser]');
    var viewport=story.querySelector('[data-moka-viewport]');
    var page=story.querySelector('[data-moka-page]');
    var fragments=Array.prototype.slice.call(story.querySelectorAll('[data-moka-fragment]'));
    var progress=story.querySelector('[data-moka-progress]');
    var phaseNum=story.querySelector('[data-moka-phase-num]');
    var phaseName=story.querySelector('[data-moka-phase-name]');
    var endcard=story.querySelector('[data-moka-endcard]');
    var phaseNames=(function(){
      var lang=document.documentElement.lang||'fr';
      if(lang.indexOf('en')===0)return ['Gather','Give it direction','Bring it to life','Make it useful','Make it yours'];
      if(lang.indexOf('it')===0)return ['Raccogliere','Dare una direzione','Far vivere','Rendere utile','Renderlo tuo'];
      return ['Rassembler','Donner une direction','Faire vivre','Rendre utile','Vous appartient'];
    })();
    var canvas=story.querySelector('[data-moka-canvas]');
    var maxInner=0;
    var measure=function(){maxInner=Math.max(0,page.scrollHeight-viewport.clientHeight);};
    measure();
    if('ResizeObserver' in window)new ResizeObserver(measure).observe(viewport);

    var render=function(){
      var rect=track.getBoundingClientRect();
      var scrollable=Math.max(1,track.offsetHeight-window.innerHeight);
      var target=clamp(-rect.top/scrollable,0,1);
      /* Chase the scroll-derived target instead of snapping to it every
         frame. Raw scroll position (especially touch momentum on mobile,
         which delivers position in uneven, chunky steps) made the whole
         choreography feel jerky and mechanical. Lerping the rendered value
         toward the target each frame turns that into a smooth, delicate
         glide, and costs nothing while idle: render() reports whether it's
         still converging, and tick() only keeps scheduling frames while
         at least one story hasn't settled yet. */
      var settled=story._mokaP==null;
      var p=settled?target:story._mokaP+(target-story._mokaP)*.07;
      if(Math.abs(target-p)<.0004)p=target;
      story._mokaP=p;
      var assemble=ease(range(p,.02,.20));
      var open=ease(range(p,.12,.30));
      var inner=range(p,.28,.84);
      /* the resolve card only had a ~3% scroll window fully visible before
         the section unpinned — easy to blow straight through and never
         actually read. Same start (right as the page finishes scrolling to
         its final section), but full opacity lands sooner and holds for
         the rest of the track instead of arriving right as it's cut off. */
      var finish=ease(range(p,.84,.92));
      var fadeSources=1-range(p,.14,.27);

      if(progress)progress.style.transform='scaleY('+p.toFixed(4)+')';
      if(browser){browser.style.setProperty('--open',open.toFixed(4));browser.style.opacity=(open*(1-.13*finish)).toFixed(4);browser.style.transform='translate(-50%,-50%) scale('+(0.72+open*.28-finish*.055).toFixed(4)+')';}
      if(page)page.style.transform='translate3d(0,'+(-maxInner*inner).toFixed(2)+'px,0)';
      /* Fragments are clamped against the canvas's *actual* rendered size
         (not a guessed scale constant) so they can never overflow the
         viewport at any width — this is what was cut off on mobile before. */
      var cw=canvas?canvas.clientWidth:9999, ch=canvas?canvas.clientHeight:9999;
      var remain=1-assemble;
      fragments.forEach(function(el,i){
        var x=Number(el.dataset.x)||0,y=Number(el.dataset.y)||0,r=Number(el.dataset.r)||0;
        var fw=el.offsetWidth||180,fh=el.offsetHeight||56;
        var maxX=Math.max(16,cw/2-fw/2-6),maxY=Math.max(16,ch/2-fh/2-6);
        var drift=(i%2?1:-1)*10*range(p,0,.14);
        var ox=clamp(x*remain+drift,-maxX,maxX);
        var oy=clamp(y*remain,-maxY,maxY);
        el.style.transform='translate3d(calc(-50% + '+ox.toFixed(1)+'px),calc(-50% + '+oy.toFixed(1)+'px),0) rotate('+(r*remain).toFixed(2)+'deg) scale('+(1-.07*assemble).toFixed(3)+')';
        el.style.opacity=(fadeSources*(.72+.28*(1-assemble))).toFixed(3);
      });
      if(endcard){endcard.style.opacity=finish.toFixed(3);endcard.style.transform='translate(-50%,'+(28-28*finish).toFixed(1)+'px)';}

      var phase=p<.14?0:p<.34?1:p<.58?2:p<.82?3:4;
      if(phaseNum)phaseNum.textContent=('0'+phase).slice(-2);
      if(phaseName)phaseName.textContent=phaseNames[phase];

      return p!==target;
    };
    story._mokaRender=render;
    if(reduce){
      fragments.forEach(function(el){el.style.opacity='0';});
      if(browser){browser.style.setProperty('--open','1');browser.style.opacity='1';browser.style.transform='translate(-50%,-50%) scale(1)';}
      if(page)page.style.transform='translate3d(0,0,0)';
    }
  });

  var tick=function(){
    raf=0;
    var settling=false;
    stories.forEach(function(s){if(s._mokaRender&&!reduce&&s._mokaRender())settling=true;});
    if(!reduce)renderProjects();
    if(settling)request();
  };
  var request=function(){if(!raf)raf=requestAnimationFrame(tick);};
  window.addEventListener('scroll',request,{passive:true});
  window.addEventListener('resize',request,{passive:true});
  request();
})();

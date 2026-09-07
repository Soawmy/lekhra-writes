/* ==========================================================================
   LEKHRA WRITES — shared behaviour
   ========================================================================== */
(function(){
  "use strict";

  var isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- bfcache safety net ----------------
     When a link is clicked, .is-transitioning gets added to <body> to play
     the cover animation before the real navigation happens. If the user
     hits the browser's Back button, some browsers restore the previous
     page from cache frozen in whatever DOM state it was in the instant it
     unloaded — including mid-transition, with the overlay still covering
     the screen. This is what produced the blank page with a stuck gold
     line. Clearing the class on restore fixes it. */
  window.addEventListener('pageshow', function(e){
    if(e.persisted){ document.body.classList.remove('is-transitioning'); }
  });

  /* ---------------- Intro (home only, once per session) ----------------
     Timed entirely by CSS (see style.css) so it matches the reference build
     exactly: #intro runs its own reveal + introExit animation on a fixed
     clock, and the hero cascade (.hero-meta / h1 spans / .hero-bottom) is
     timed to hand off from it. On repeat visits and prefers-reduced-motion
     we skip the overlay outright and collapse the hero's animation-delay
     to ~0 via the .skip-intro-timing class, so it appears immediately
     instead of waiting out a clock nobody saw start. */
  var intro = document.getElementById('intro');
  if(intro){
    var forceReplay = /[?&]replay-intro\b/.test(window.location.search);
    var seen = sessionStorage.getItem('lw-intro-seen');
    if(forceReplay){ sessionStorage.removeItem('lw-intro-seen'); seen = null; }
    if(seen || reduced){
      intro.remove();
      document.body.classList.add('skip-intro-timing');
    } else {
      sessionStorage.setItem('lw-intro-seen', '1');
      intro.addEventListener('animationend', function(e){
        if(e.target === intro){ intro.remove(); }
      });
    }
  } else {
    document.body.classList.add('skip-intro-timing');
  }

  /* ---------------- Hero mouse-parallax (desktop only) ---------------- */
  var hero = document.getElementById('home-hero');
  var heroWash = document.getElementById('hero-wash');
  var heroRect = null;
  function refreshHeroRect(){ heroRect = (hero && !isTouch && !reduced) ? hero.getBoundingClientRect() : null; }
  if(hero) refreshHeroRect();

  /* ---------------- Custom cursor (desktop only) ---------------- */
  if(!isTouch){
    document.body.classList.add('has-custom-cursor');
    var dot = document.createElement('div'); dot.className = 'cursor-dot';
    var ring = document.createElement('div'); ring.className = 'cursor-ring';
    var label = document.createElement('div'); label.className = 'cursor-label';
    document.body.appendChild(dot); document.body.appendChild(ring); document.body.appendChild(label);

    /* One raw mousemove listener just records position — all the actual
       DOM reads/writes for the cursor, hero parallax, and magnetic buttons
       below are batched into a single requestAnimationFrame loop instead
       of running redundantly on every raw event (which can fire far more
       than 60/sec on a high-poll-rate mouse). */
    var mx=0,my=0, rx=0, ry=0, cursorSeen=false;
    window.addEventListener('mousemove', function(e){
      mx = e.clientX; my = e.clientY;
      if(!cursorSeen){
        cursorSeen = true;
        rx = mx; ry = my;
        dot.classList.add('is-active');
        ring.classList.add('is-active');
      }
    }, { passive: true });

    /* ---- magnetic buttons: pull toward the cursor within a small radius ----
       Bounding rects are cached and only recomputed on scroll/resize, not
       on every frame — a button's position doesn't change otherwise, so
       re-measuring it every frame was pure wasted layout work. */
    var magneticEls = Array.prototype.slice.call(document.querySelectorAll('.btn, .nav-cta'));
    var magneticRects = [];
    var MAGNETIC_RADIUS = 90;
    var MAGNETIC_STRENGTH = 0.35;
    function refreshMagneticRects(){
      magneticRects = magneticEls.map(function(el){ return el.getBoundingClientRect(); });
    }
    refreshMagneticRects();

    var rectRefreshPending = false;
    function scheduleRectRefresh(){
      if(rectRefreshPending) return;
      rectRefreshPending = true;
      requestAnimationFrame(function(){ refreshMagneticRects(); refreshHeroRect(); rectRefreshPending = false; });
    }
    window.addEventListener('scroll', scheduleRectRefresh, { passive: true });
    window.addEventListener('resize', scheduleRectRefresh);

    (function loop(){
      rx += (mx-rx)*0.14; ry += (my-ry)*0.14;
      ring.style.left = rx+'px'; ring.style.top = ry+'px';
      dot.style.left = mx+'px'; dot.style.top = my+'px';
      label.style.left = mx+'px'; label.style.top = my+'px';

      if(heroRect && heroRect.width && heroRect.height){
        var px = (mx - heroRect.left) / heroRect.width - 0.5;
        var py = (my - heroRect.top) / heroRect.height - 0.5;
        var insideHero = mx >= heroRect.left && mx <= heroRect.right && my >= heroRect.top && my <= heroRect.bottom;
        heroWash.style.transform = insideHero ? 'translate(' + (px * 26).toFixed(1) + 'px, ' + (py * 26).toFixed(1) + 'px)' : '';
      }

      magneticEls.forEach(function(el, i){
        var r = magneticRects[i];
        if(!r) return;
        var cx = r.left + r.width / 2;
        var cy = r.top + r.height / 2;
        var dx = mx - cx;
        var dy = my - cy;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if(dist < MAGNETIC_RADIUS){
          el.style.transform = 'translate(' + (dx * MAGNETIC_STRENGTH).toFixed(1) + 'px, ' + (dy * MAGNETIC_STRENGTH).toFixed(1) + 'px)';
        } else if(el.style.transform){
          el.style.transform = '';
        }
      });

      requestAnimationFrame(loop);
    })();

    document.addEventListener('mouseover', function(e){
      var t = e.target.closest('[data-cursor]');
      if(t){
        ring.classList.add('is-hover');
        var txt = t.getAttribute('data-cursor');
        if(txt){ label.textContent = txt; label.classList.add('is-active'); }
      } else if(e.target.closest('a, button')){
        ring.classList.add('is-hover');
      }
    });
    document.addEventListener('mouseout', function(e){
      var t = e.target.closest('[data-cursor]');
      if(t || e.target.closest('a, button')){
        ring.classList.remove('is-hover');
        label.classList.remove('is-active');
      }
    });
  }

  /* ---------------- Nav: shrink + blur on scroll ---------------- */
  var nav = document.querySelector('.site-nav');
  function onScrollNav(){
    if(!nav) return;
    if(window.scrollY > 40) nav.classList.add('is-scrolled');
    else nav.classList.remove('is-scrolled');
  }
  window.addEventListener('scroll', onScrollNav, { passive:true });
  onScrollNav();

  /* mark active nav link — compares full resolved paths, not just the
     filename, since "index.html" is ambiguous (both the home page AND
     services/index.html end in that basename; comparing only the last
     path segment was marking "Services" active while on Home). Also never
     highlights anything for a plain directory root like "/" that doesn't
     correspond to any nav link. */
  function normalizePath(pathname){
    var p = pathname.split('?')[0].split('#')[0];
    if(p.length > 1 && p.charAt(p.length - 1) === '/') p = p.slice(0, -1);
    if(/\/index\.html$/.test(p)) p = p.slice(0, -'index.html'.length - 1);
    return p || '/';
  }
  var currentPath = normalizePath(window.location.pathname);
  document.querySelectorAll('.nav-links a, .mobile-menu a').forEach(function(a){
    var linkUrl;
    try { linkUrl = new URL(a.getAttribute('href'), window.location.href); }
    catch(err) { return; }
    if(normalizePath(linkUrl.pathname) === currentPath){ a.classList.add('is-active'); }
  });

  /* ---------------- Mobile menu ---------------- */
  var burger = document.querySelector('.nav-burger');
  var mobileMenu = document.querySelector('.mobile-menu');
  if(burger && mobileMenu){
    burger.addEventListener('click', function(){
      mobileMenu.classList.toggle('is-open');
      burger.classList.toggle('is-open');
    });
    mobileMenu.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){ mobileMenu.classList.remove('is-open'); });
    });
  }

  /* ---------------- Scroll reveal ----------------
     Replays every time an element re-enters view (either scroll direction),
     rather than firing once and staying revealed forever. Exposed on
     window so dynamically-inserted content (e.g. Work page case studies
     loaded after the fact) can be picked up too. */
  var revealIO = null;
  function observeReveals(root){
    var scope = root || document;
    var els = scope.querySelectorAll('.reveal:not(.principle-stagger), .ink-divider');
    if(revealIO){
      els.forEach(function(el){ revealIO.observe(el); });
    } else {
      els.forEach(function(el){ el.classList.add('in-view'); });
    }
  }
  if('IntersectionObserver' in window){
    revealIO = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        entry.target.classList.toggle('in-view', entry.isIntersecting);
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
  }
  observeReveals();
  document.addEventListener('lw:content-inserted', function(){ observeReveals(); });

  /* ---------------- Page transitions between internal links ----------------
     Desktop only: the animated sheet-sweep is a nice-to-have flourish, but
     intercepting taps with preventDefault + a delayed manual navigation is
     exactly the kind of thing that can misfire on mobile browsers. Touch
     devices get plain, instant, native navigation — no interception. */
  var overlay = document.getElementById('page-transition');
  if(overlay && !reduced && !isTouch){
    document.querySelectorAll('a[href]').forEach(function(a){
      var href = a.getAttribute('href');
      if(!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto') || a.target === '_blank') return;
      a.addEventListener('click', function(e){
        e.preventDefault();
        document.body.classList.add('is-transitioning');
        setTimeout(function(){ window.location.href = href; }, 470);
      });
    });
  }

  /* ---------------- ink divider builder ---------------- */
  document.querySelectorAll('.ink-divider[data-auto]').forEach(function(div){
    div.innerHTML = '<svg viewBox="0 0 1200 40" preserveAspectRatio="none"><path d="M0 20 Q 300 4, 600 20 T 1200 20"/></svg>';
  });

})();

/* ==========================================================================
   Component behaviours
   ========================================================================== */
(function(){
  "use strict";

  /* ---- morph-chain: cycle through words continuously while in view ---- */
  document.querySelectorAll('.morph-chain').forEach(function(chain){
    var words = chain.querySelectorAll('.morph-word');
    if(!words.length) return;
    var timer = null, i = 0, active = false;

    function show(idx){
      words.forEach(function(w){ w.classList.remove('is-active'); });
      words[idx].classList.add('is-active');
    }
    function step(){
      i = (i + 1) % words.length;
      show(i);
      // linger longer on the final word ("IMPACT") before looping back
      var isLast = (i === words.length - 1);
      timer = setTimeout(step, isLast ? 1700 : 900);
    }
    function start(){
      if(active) return;
      active = true; i = 0; show(0);
      timer = setTimeout(step, 900);
    }
    function stop(){
      active = false;
      if(timer){ clearTimeout(timer); timer = null; }
    }

    if('IntersectionObserver' in window){
      new IntersectionObserver(function(entries){
        entries.forEach(function(entry){ entry.isIntersecting ? start() : stop(); });
      }, { threshold: 0.5 }).observe(chain);
    } else { start(); }
  });

  /* ---- need-based finder ---- */
  document.querySelectorAll('.finder-grid').forEach(function(grid){
    var result = grid.parentElement.querySelector('.finder-result');
    if(!result) return;
    grid.querySelectorAll('[data-result-label]').forEach(function(btn){
      btn.addEventListener('click', function(){
        grid.querySelectorAll('.chip').forEach(function(c){ c.classList.remove('is-active'); });
        btn.classList.add('is-active');
        result.querySelector('p').textContent = btn.getAttribute('data-result-label');
        var link = result.querySelector('a');
        link.setAttribute('href', btn.getAttribute('data-result-href'));
        result.classList.add('is-visible');
      });
    });
  });

  /* ---- browser frame morph toggle ---- */
  document.querySelectorAll('.frame-toggle').forEach(function(toggle){
    var frame = document.querySelector(toggle.getAttribute('data-target'));
    if(!frame) return;
    toggle.querySelectorAll('button').forEach(function(btn){
      btn.addEventListener('click', function(){
        toggle.querySelectorAll('button').forEach(function(b){ b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        frame.classList.toggle('is-mobile', btn.getAttribute('data-frame') === 'mobile');
      });
    });
  });

  /* ---- screenplay typewriter ---- */
  document.querySelectorAll('.sp-type').forEach(function(el){
    var full = el.textContent;
    el.textContent = '';
    var started = false;
    function type(i){
      if(i <= full.length){
        el.textContent = full.slice(0, i);
        setTimeout(function(){ type(i+1); }, 28);
      }
    }
    if('IntersectionObserver' in window){
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(entry.isIntersecting && !started){ started = true; type(0); io.unobserve(entry.target); }
        });
      }, { threshold: 0.6 });
      io.observe(el);
    } else { el.textContent = full; }
  });

  /* ---- principle cards (Think First / Create with Intention / Refine the
     Details): reveal 01, then 02, then 03 in a clearly readable sequence.
     A shared IntersectionObserver would fire for all three at once since
     they're all onscreen together — staggering has to be done deliberately
     with a timer, not left to each card's own visibility trigger. ---- */
  (function(){
    var cards = document.querySelectorAll('.principle-stagger');
    if(!cards.length) return;
    var triggered = false;
    var timers = [];
    function clearTimers(){ timers.forEach(clearTimeout); timers = []; }
    new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting && !triggered){
          triggered = true;
          cards.forEach(function(card, i){
            timers.push(setTimeout(function(){ card.classList.add('in-view'); }, i * 380));
          });
        } else if(!entry.isIntersecting){
          triggered = false;
          clearTimers();
          cards.forEach(function(card){ card.classList.remove('in-view'); });
        }
      });
    }, { threshold: 0.35 }).observe(cards[0].parentElement);
  })();

  /* ---- evolution row: highlight steps in sequence, only while in view ---- */
  document.querySelectorAll('.evo-row').forEach(function(row){
    var steps = row.querySelectorAll('.evo-step');
    if(!steps.length) return;
    var idx = 0, timer = null;

    function tick(){
      steps.forEach(function(s){ s.classList.remove('is-current'); });
      steps[idx % steps.length].classList.add('is-current');
      idx++;
    }
    function start(){ if(!timer){ tick(); timer = setInterval(tick, 1500); } }
    function stop(){ if(timer){ clearInterval(timer); timer = null; } }

    if('IntersectionObserver' in window){
      new IntersectionObserver(function(entries){
        entries.forEach(function(entry){ entry.isIntersecting ? start() : stop(); });
      }, { threshold: 0.4 }).observe(row);
    } else {
      start();
    }
  });

})();

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

  /* ---- Dynamic Connect Section (Footer Social Media Links) ---- */
  (function(){
    var DEFAULT_SOCIAL_LINKS = [
      { id: 'instagram', platform: 'Instagram', url: 'https://instagram.com/lekhrawrites' },
      { id: 'linkedin', platform: 'LinkedIn', url: 'https://linkedin.com/company/lekhrawrites' },
      { id: 'behance', platform: 'Behance', url: 'https://behance.net/lekhrawrites' }
    ];

    function getSocialSvg(platform){
      var p = (platform || '').toLowerCase().trim();
      // Instagram - Official camera logo
      if(p.indexOf('insta') !== -1){
        return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>';
      }
      // LinkedIn - Official 'in' logo
      if(p.indexOf('link') !== -1){
        return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/></svg>';
      }
      // Behance - Official 'Bē' logo
      if(p.indexOf('behance') !== -1){
        return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 7h-7V5h7v2zm1.726 10c-.442 1.297-1.246 2.318-2.396 3.035C20.177 20.75 18.79 21.1 17.15 21.1c-1.862 0-3.447-.469-4.717-1.397-1.27-.932-2.2-2.188-2.766-3.738-.564-1.554-.852-3.265-.852-5.097 0-1.879.301-3.606.897-5.143.597-1.536 1.552-2.781 2.846-3.708C13.854 1.09 15.42.63 17.228.63c1.782 0 3.268.423 4.437 1.261 1.168.837 2.012 1.986 2.516 3.424.505 1.437.712 3.064.618 4.847H13.673c.094 1.516.549 2.68 1.353 3.463.806.784 1.873 1.182 3.178 1.182.916 0 1.697-.184 2.327-.549.63-.364 1.077-.872 1.332-1.514l1.863.256zm-1.996-5.834c-.066-1.125-.407-1.993-1.016-2.583-.61-.59-1.428-.89-2.436-.89-.993 0-1.802.29-2.408.86-.606.57-.96 1.436-1.054 2.58h6.914zM0 2.25h8.924c1.232 0 2.285.167 3.16.501.875.334 1.579.818 2.111 1.452.532.634.908 1.403 1.127 2.307.219.904.329 1.932.329 3.084 0 .979-.115 1.85-.344 2.613-.23.763-.594 1.417-1.093 1.961-.499.544-1.139.967-1.92 1.269.96.287 1.748.749 2.364 1.387.616.638 1.077 1.413 1.383 2.325.306.912.459 1.954.459 3.126 0 1.299-.148 2.45-.444 3.453-.297 1.003-.761 1.844-1.394 2.523-.633.679-1.448 1.183-2.445 1.512-.997.329-2.203.493-3.619.493H0V2.25zm4.842 6.643h2.096c.7 0 1.31-.089 1.828-.268.518-.179.943-.451 1.275-.815.332-.365.579-.832.742-1.402.163-.57.244-1.246.244-2.029 0-.825-.079-1.528-.237-2.11-.158-.581-.41-1.046-.756-1.394-.345-.348-.797-.599-1.355-.753-.558-.155-1.223-.232-1.996-.232H4.842v9.003zm0 10.37h2.518c.708 0 1.313-.071 1.815-.212.502-.141.911-.382 1.226-.723.315-.341.544-.792.688-1.353.143-.561.215-1.239.215-2.033 0-.765-.062-1.419-.186-1.961-.124-.543-.324-.986-.601-1.33-.277-.343-.639-.597-1.085-.761-.446-.164-.984-.246-1.614-.246H4.842v8.619z"/></svg>';
      }
      // X / Twitter - Official 'X' logo
      if(p.indexOf('twitter') !== -1 || p === 'x' || p.indexOf(' x') !== -1 || p.indexOf('x ') !== -1){
        return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>';
      }
      // YouTube - Official play button logo
      if(p.indexOf('youtu') !== -1){
        return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>';
      }
      // TikTok - Official note glyph
      if(p.indexOf('tik') !== -1){
        return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>';
      }
      // Facebook - Official 'f' badge
      if(p.indexOf('face') !== -1 || p.indexOf('fb') !== -1){
        return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>';
      }
      // Dribbble - Official basketball logo
      if(p.indexOf('drib') !== -1){
        return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm7.143 5.597c1.47 1.745 2.378 3.992 2.457 6.447-.577-.123-2.748-.562-5.362-.239-.076-.184-.156-.37-.24-.555-.668-1.468-1.465-2.887-2.366-4.218 2.571-.628 4.593-1.22 5.511-1.435zM12 2.4c2.25 0 4.316.764 5.968 2.05-.788.223-2.668.797-5.12 1.407-1.332-2.274-2.435-4.475-2.748-5.143C10.74 2.483 11.36 2.4 12 2.4zM7.564 1.488c.325.688 1.42 2.871 2.768 5.161-3.66 1.054-6.974 1.096-7.85 1.096C3.398 4.869 5.253 2.708 7.564 1.488zm-5.16 8.707c.883 0 4.457-.043 8.358-1.185.347.674.673 1.37.973 2.083-2.235.686-4.66 2.379-6.398 5.556C3.606 14.887 2.4 12.569 2.4 10.195zm4.27 7.917c1.554-2.868 3.69-4.382 5.753-5.028.91 2.41 1.487 5.034 1.677 7.749C12.784 21.31 11.417 21.6 12 21.6c-2.025 0-3.899-.684-5.33-1.488zM15.937 19.98c-.183-2.529-.714-4.975-1.554-7.234 2.443-.377 4.605.02 5.176.143-.356 3.12-2.122 5.792-4.622 7.091h-.001z"/></svg>';
      }
      // GitHub - Official Octocat silhouette
      if(p.indexOf('git') !== -1){
        return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>';
      }
      // Threads - Official logo
      if(p.indexOf('thread') !== -1){
        return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.186 24h-.007C5.463 23.975 0 18.57 0 11.942 0 5.304 5.467 0 12.186 0c6.7 0 12.15 5.289 12.186 11.916v.053c0 6.64-5.468 12.031-12.186 12.031zm0-21.722c-5.452 0-9.889 4.364-9.889 9.664 0 5.311 4.437 9.686 9.889 9.686 5.438 0 9.874-4.353 9.889-9.638 0-5.322-4.437-9.712-9.889-9.712zm6.262 9.775c-.247 3.535-2.457 5.793-5.918 5.793-2.228 0-4.043-.997-4.832-2.65-.548-1.151-.715-2.664-.473-4.264.394-2.607 2.115-4.321 4.673-4.697 1.341-.197 2.697.027 3.82.632.748.404 1.353.989 1.761 1.704.428.75.599 1.62.502 2.532-.09.845-.444 1.583-1.026 2.138-.646.617-1.503.95-2.474.962-1.042.012-1.905-.333-2.43-.974-.352-.43-.538-.999-.553-1.696-.026-1.229.47-2.124 1.472-2.661.73-.39 1.65-.515 2.735-.371.189.025.378.06.566.104-.078-.501-.264-.93-.568-1.277-.487-.557-1.25-.85-2.148-.827-1.39.037-2.467.671-2.956 1.74-.287.627-.378 1.401-.271 2.298.243 2.034 1.554 3.731 3.42 4.426.657.244 1.378.368 2.146.368 2.454 0 4.392-1.272 5.318-3.491.564-1.35.632-2.909.196-4.509-.597-2.193-2.071-3.958-4.044-4.843-1.782-.8-3.799-1.01-5.681-.591-3.606.803-6.425 3.659-7.23 7.323-.559 2.544-.22 5.094.954 7.181 1.488 2.645 4.148 4.301 7.299 4.544 2.871.221 5.56-.732 7.571-2.684l1.597 1.528c-2.451 2.38-5.74 3.541-9.256 3.269-3.837-.297-7.076-2.313-8.889-5.534-1.433-2.547-1.847-5.658-1.164-8.761.981-4.464 4.417-7.943 8.812-8.922 2.292-.51 4.75-.255 6.921.718 2.404 1.077 4.198 3.227 4.925 5.897.534 1.956.452 3.86-.239 5.508z"/></svg>';
      }
      // Pinterest - Official 'P' logo
      if(p.indexOf('pin') !== -1){
        return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0a12 12 0 0 0-4.37 23.18c-.05-.98-.1-2.5.02-3.57.11-.97.74-6.3.74-6.3s-.19-.38-.19-.94c0-.88.51-1.54 1.15-1.54.54 0 .8.41.8.9 0 .55-.35 1.37-.53 2.13-.15.64.32 1.16.95 1.16 1.14 0 2.02-1.2 2.02-2.94 0-1.54-1.1-2.61-2.69-2.61-1.83 0-2.91 1.38-2.91 2.8 0 .56.21 1.15.48 1.48.05.06.06.12.04.18-.05.21-.16.65-.18.74-.03.12-.1.17-.23.11-1.02-.48-1.66-1.97-1.66-3.17 0-2.58 1.88-4.96 5.41-4.96 2.84 0 5.06 2.03 5.06 4.74 0 2.82-1.78 5.1-4.25 5.1-.83 0-1.61-.43-1.88-.94l-.51 1.95c-.18.72-.68 1.62-1.01 2.17A12 12 0 1 0 12 0z"/></svg>';
      }
      // Discord - Official logo
      if(p.indexOf('disc') !== -1){
        return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>';
      }
      // Telegram - Official logo
      if(p.indexOf('tele') !== -1){
        return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.458c.538-.196 1.006.128.832.941z"/></svg>';
      }
      // WhatsApp - Official logo
      if(p.indexOf('what') !== -1){
        return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.301-.15-1.78-.878-2.056-.979-.276-.1-.476-.15-.677.15-.2.3-.777.979-.952 1.18-.176.2-.351.226-.652.075-.301-.15-1.272-.469-2.423-1.496-.896-.799-1.501-1.786-1.677-2.087-.176-.3-.019-.463.132-.612.136-.135.301-.351.451-.527.151-.175.201-.3.302-.501.1-.2.05-.376-.025-.526-.075-.15-.677-1.632-.927-2.235-.244-.587-.492-.507-.677-.517-.175-.009-.376-.01-.577-.01-.2 0-.526.075-.802.376-.276.3-1.053 1.028-1.053 2.508 0 1.479 1.078 2.908 1.228 3.109.15.2 2.122 3.24 5.141 4.542.719.31 1.28.496 1.718.635.722.23 1.378.197 1.898.12.58-.087 1.78-.727 2.03-1.43.25-.702.25-1.304.175-1.43-.075-.125-.276-.2-.577-.35zm-5.467 7.424c-1.815 0-3.593-.489-5.158-1.413l-.37-.22-3.834 1.006 1.024-3.738-.241-.383A10.457 10.457 0 0 1 1.8 11.806C1.8 6.178 6.377 1.6 12.005 1.6c2.727 0 5.289 1.063 7.218 2.993a10.16 10.16 0 0 1 2.987 7.213c0 5.629-4.577 10.207-10.205 10.207zM12 0C5.373 0 0 5.373 0 12c0 2.115.548 4.102 1.512 5.836L0 24l6.335-1.472A11.936 11.936 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>';
      }
      // Spotify - Official wave logo
      if(p.indexOf('spoti') !== -1){
        return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>';
      }
      // Substack - Official logo
      if(p.indexOf('sub') !== -1){
        return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z"/></svg>';
      }
      // Medium - Official logo
      if(p.indexOf('med') !== -1){
        return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.54 12a6.8 6.8 0 0 1-6.77 6.82A6.8 6.8 0 0 1 0 12a6.8 6.8 0 0 1 6.77-6.82A6.8 6.8 0 0 1 13.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z"/></svg>';
      }
      // Vimeo - Official logo
      if(p.indexOf('vimeo') !== -1){
        return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.977 6.416c-.105 2.338-1.739 5.543-4.894 9.609-3.268 4.247-6.026 6.37-8.29 6.37-1.409 0-2.578-1.294-3.553-3.881l-1.92-7.054c-.716-2.56-1.477-3.841-2.28-3.841-.177 0-.793.376-1.849 1.129L0 7.284C1.229 6.208 2.458 5.158 3.687 4.135c1.716-1.493 3.012-2.298 3.886-2.417 2.052-.284 3.313.916 3.782 3.6.5 2.871.847 4.654 1.042 5.348.583 2.502 1.218 3.753 1.905 3.753.535 0 1.242-.83 2.12-2.489.878-1.659 1.349-2.909 1.413-3.752.126-1.393-.385-2.09-1.533-2.09-.548 0-1.118.125-1.711.375 1.127-3.702 3.284-5.498 6.471-5.388 2.364.081 3.514 1.47 3.447 4.167-.039.09-.039.245 0 .47z"/></svg>';
      }
      // Generic link / globe
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>';
    }

    function findConnectCol(){
      var col = document.querySelector('footer:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(4)');
      if(col) return col;
      var cols = document.querySelectorAll('.site-footer .footer-col');
      for(var i = 0; i < cols.length; i++){
        var h5 = cols[i].querySelector('h5');
        if(h5 && h5.textContent.trim().toLowerCase() === 'connect'){
          return cols[i];
        }
      }
      return null;
    }

    function renderConnectLinks(col, links){
      if(!col) return;
      var h5 = col.querySelector('h5');
      col.innerHTML = '';
      if(h5){
        col.appendChild(h5);
      } else {
        var newH5 = document.createElement('h5');
        newH5.textContent = 'Connect';
        col.appendChild(newH5);
      }

      if(!Array.isArray(links) || !links.length) return;

      links.forEach(function(item){
        if(!item || !item.platform) return;
        var a = document.createElement('a');
        var url = (item.url || '').trim();
        if(!url || url === '#'){
          a.href = '#';
          a.setAttribute('data-cursor', 'SOON');
        } else {
          a.href = url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.setAttribute('data-cursor', 'VISIT');
        }
        a.className = 'footer-social-link';

        var iconSpan = document.createElement('span');
        iconSpan.className = 'footer-social-icon';
        iconSpan.innerHTML = getSocialSvg(item.platform);

        var nameSpan = document.createElement('span');
        nameSpan.className = 'footer-social-name';
        nameSpan.textContent = item.platform;

        a.appendChild(iconSpan);
        a.appendChild(nameSpan);
        col.appendChild(a);
      });
    }

    function initConnectLinks(){
      var col = findConnectCol();
      if(!col) return;

      // 1. Render immediately from local cache if available, or fallback to defaults
      var cached = null;
      try {
        var rawCache = localStorage.getItem('lw-social-links');
        if(rawCache) cached = JSON.parse(rawCache);
      } catch(e){}

      if(Array.isArray(cached)){
        renderConnectLinks(col, cached);
      } else {
        renderConnectLinks(col, DEFAULT_SOCIAL_LINKS);
      }

      // 2. Fetch fresh links from API
      fetch('/api/social-links', { cache: 'no-store' })
        .then(function(res){ return res.json(); })
        .then(function(data){
          if(data && Array.isArray(data.links)){
            try { localStorage.setItem('lw-social-links', JSON.stringify(data.links)); } catch(e){}
            renderConnectLinks(col, data.links);
          }
        })
        .catch(function(){});
    }

    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', initConnectLinks);
    } else {
      initConnectLinks();
    }
  })();

})();

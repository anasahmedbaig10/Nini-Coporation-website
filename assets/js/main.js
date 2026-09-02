/* Nini Corporation — interaction layer
   No dependencies. Progressive enhancement: every section is readable and
   navigable with JavaScript disabled.

   Scroll-animation timings mirror the arville.com reference
   (0.75s cubic-bezier(.25,.46,.45,.94), translate3d-based). The 3D pointer
   tilt, hero parallax, magnetic buttons and stat count-up are additions. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer  = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* --- year ------------------------------------------------------------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* --- sticky header ---------------------------------------------------- */
  var header = document.getElementById('header');
  if (header) {
    var onScrollHeader = function () { header.classList.toggle('is-stuck', window.scrollY > 40); };
    onScrollHeader();
    window.addEventListener('scroll', onScrollHeader, { passive: true });
  }

  /* --- mobile nav ------------------------------------------------------- */
  var burger = document.querySelector('.burger');
  var nav = document.getElementById('nav');

  function closeNav() {
    if (!burger || !nav) return;
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Open menu');
    nav.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      burger.setAttribute('aria-label', open ? 'Open menu' : 'Close menu');
      nav.classList.toggle('is-open', !open);
      document.body.style.overflow = !open ? 'hidden' : '';
    });
  }

  /* --- mega menus ------------------------------------------------------- */
  var dropdownItems = Array.prototype.slice.call(document.querySelectorAll('[data-dropdown]'));

  function closeAllDropdowns(except) {
    dropdownItems.forEach(function (item) {
      if (item === except) return;
      item.classList.remove('is-open');
      var btn = item.querySelector('.nav__link');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    });
    if (!except) document.body.classList.remove('mega-open');
  }

  dropdownItems.forEach(function (item) {
    var btn = item.querySelector('.nav__link');
    if (!btn) return;

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = item.classList.contains('is-open');
      closeAllDropdowns(item);
      item.classList.toggle('is-open', !isOpen);
      btn.setAttribute('aria-expanded', String(!isOpen));
      document.body.classList.toggle('mega-open', !isOpen);
    });

    /* open on hover for pointer devices, as the reference does */
    if (finePointer) {
      var hoverTimer;
      item.addEventListener('mouseenter', function () {
        clearTimeout(hoverTimer);
        if (window.innerWidth <= 980) return;
        closeAllDropdowns(item);
        item.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
        document.body.classList.add('mega-open');
      });
      item.addEventListener('mouseleave', function () {
        if (window.innerWidth <= 980) return;
        hoverTimer = setTimeout(function () {
          item.classList.remove('is-open');
          btn.setAttribute('aria-expanded', 'false');
          document.body.classList.remove('mega-open');
        }, 180);
      });
    }
  });

  document.addEventListener('click', function (e) {
    if (!e.target.closest('[data-dropdown]')) closeAllDropdowns(null);
  });

  /* nav links are page URLs now, not only in-page anchors */
  document.querySelectorAll('.nav a, .footer a').forEach(function (a) {
    a.addEventListener('click', function () { closeAllDropdowns(null); closeNav(); });
  });

  /* --- smooth inertia scroll -------------------------------------------- */
  /* The reference runs GSAP ScrollSmoother. This is the same idea in ~30
     lines: intercept the wheel, ease the real window scroll toward a target.
     Because it drives genuine scroll (not a transformed container),
     position:sticky, anchors and the scrollbar all keep working. */
  var coarse = window.matchMedia('(pointer: coarse)').matches;
  if (finePointer && !coarse && !reduceMotion) {
    var sTarget = window.scrollY;
    var sCurrent = window.scrollY;
    var sRunning = false;
    var EASE = 0.115;

    var maxScroll = function () {
      return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    };

    var tick = function () {
      sCurrent += (sTarget - sCurrent) * EASE;
      if (Math.abs(sTarget - sCurrent) < 0.4) {
        sCurrent = sTarget;
        sRunning = false;
        window.scrollTo(0, sCurrent);
        return;
      }
      window.scrollTo(0, sCurrent);
      window.requestAnimationFrame(tick);
    };

    window.addEventListener('wheel', function (e) {
      if (e.ctrlKey) return;                                   /* pinch-zoom */
      if (e.target.closest && e.target.closest('.lightbox, select, textarea')) return;
      e.preventDefault();
      sTarget = Math.max(0, Math.min(sTarget + e.deltaY, maxScroll()));
      if (!sRunning) { sRunning = true; window.requestAnimationFrame(tick); }
    }, { passive: false });

    /* keyboard, scrollbar drag and anchor jumps bypass the wheel handler —
       resync so the next wheel event does not snap back */
    window.addEventListener('scroll', function () {
      if (!sRunning) { sTarget = sCurrent = window.scrollY; }
    }, { passive: true });

    window.addEventListener('resize', function () {
      sTarget = sCurrent = window.scrollY;
    }, { passive: true });
  }

  /* --- hero carousel ----------------------------------------------------- */
  /* The reference hero cycles slides with prev/next arrows. */
  var heroSlides = Array.prototype.slice.call(document.querySelectorAll('.heroslide'));
  if (heroSlides.length > 1) {
    var hIndex = 0;
    var hPrev = document.getElementById('heroPrev');
    var hNext = document.getElementById('heroNext');
    var hStatus = document.getElementById('heroStatus');
    var hTimer = null;

    var heroCopy = Array.prototype.slice.call(document.querySelectorAll('.hero__copyset'));
    var heroEl0 = document.querySelector('.hero');

    /* Rebuild the outgoing frame as vertical panels and let them fall away at
       staggered speeds — cloth dropping off the bolt. Uses the slide's <img>
       (the video slide's poster), so it works for every slide. */
    var PANELS = 12;
    var drapeOut = function (fromSlide) {
      if (reduceMotion || !fromSlide || !heroEl0) return;
      var src = fromSlide.querySelector('img');
      if (!src || !src.currentSrc && !src.src) return;

      var url = src.currentSrc || src.src;
      var w = heroEl0.clientWidth, h = heroEl0.clientHeight;

      var wrap = document.createElement('div');
      wrap.className = 'drape';
      wrap.setAttribute('aria-hidden', 'true');

      for (var p = 0; p < PANELS; p++) {
        var panel = document.createElement('div');
        panel.className = 'drape__panel';
        panel.style.backgroundImage = 'url("' + url + '")';
        panel.style.backgroundSize = w + 'px ' + h + 'px';
        panel.style.backgroundPosition = '-' + (p * (w / PANELS)) + 'px 0';
        /* uneven stagger so it falls like fabric, not a shutter */
        var jitter = (p % 3) * 26;
        panel.style.setProperty('--d', (p * 34 + jitter) + 'ms');
        panel.style.setProperty('--drape-dur', (1050 + (p % 4) * 120) + 'ms');
        wrap.appendChild(panel);
      }

      heroEl0.appendChild(wrap);
      setTimeout(function () { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }, 2000);
    };

    var showSlide = function (i, animate) {
      if (animate) drapeOut(heroSlides[hIndex]);
      hIndex = (i + heroSlides.length) % heroSlides.length;
      heroSlides.forEach(function (s, n) {
        s.classList.toggle('is-active', n === hIndex);
        s.setAttribute('aria-hidden', String(n !== hIndex));
      });
      /* headline set swaps with the background, and offscreen copy leaves
         the tab order */
      heroCopy.forEach(function (c, n) {
        var on = n === hIndex;
        c.classList.toggle('is-active', on);
        c.setAttribute('aria-hidden', String(!on));
        c.querySelectorAll('a,button').forEach(function (el) { el.tabIndex = on ? 0 : -1; });
        if (on) {
          /* replay the line-mask rise on the incoming headline */
          c.querySelectorAll('.line-mask > span').forEach(function (span) {
            span.style.animation = 'none';
            void span.offsetWidth;
            span.style.animation = '';
          });
        }
      });
      if (hStatus) hStatus.textContent = 'Slide ' + (hIndex + 1) + ' of ' + heroSlides.length;
    };

    /* Auto-rotation is OFF by default. Slide 1 carries the backdrop video —
       rotating away after a few seconds would hide it permanently, and
       auto-rotating content is a WCAG 2.2 liability. The arrows drive it.
       Set to true to restore rotation. */
    var HERO_AUTOPLAY = false;

    var autoplay = function () {
      if (!HERO_AUTOPLAY || reduceMotion) return;
      clearTimeout(hTimer);
      hTimer = setTimeout(function () { showSlide(hIndex + 1, true); autoplay(); }, 9000);
    };

    if (hPrev) hPrev.addEventListener('click', function () { showSlide(hIndex - 1, true); autoplay(); });
    if (hNext) hNext.addEventListener('click', function () { showSlide(hIndex + 1, true); autoplay(); });

    /* pause rotation on hover and whenever focus is inside — WCAG 2.2 */
    var heroEl = document.querySelector('.hero');
    if (heroEl) {
      heroEl.addEventListener('mouseenter', function () { clearTimeout(hTimer); });
      heroEl.addEventListener('mouseleave', autoplay);
      heroEl.addEventListener('focusin', function () { clearTimeout(hTimer); });
      heroEl.addEventListener('focusout', autoplay);
    }
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') autoplay(); else clearTimeout(hTimer);
    });

    showSlide(0);
    autoplay();
  }

  /* --- woven band -------------------------------------------------------- */
  /* Draws an actual warp/weft weave: vertical threads, horizontal threads,
     and at every intersection the one that passes OVER is redrawn, alternating
     like a plain weave. Threads bow toward the pointer as if the cloth were
     being lifted. Canvas 2D only — no library. */
  var weaveCanvas = document.getElementById('weaveCanvas');
  if (weaveCanvas && weaveCanvas.getContext) {
    var wctx = weaveCanvas.getContext('2d');
    var band = weaveCanvas.closest('.weaveband');
    var W = 0, H = 0, dpr = 1;
    var SP = 26;                       /* thread spacing */
    var t = 0;
    var pointer = { x: -9999, y: -9999, active: false };
    var wRaf = null, inView = false;

    var sizeCanvas = function () {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = weaveCanvas.clientWidth;
      H = weaveCanvas.clientHeight;
      weaveCanvas.width = Math.round(W * dpr);
      weaveCanvas.height = Math.round(H * dpr);
      wctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    /* how far a thread bows at (x,y): sine drift plus pointer lift */
    var bow = function (x, y, phase) {
      var d = Math.sin((x + y) * 0.012 + t * 0.6 + phase) * 2.2;
      if (pointer.active) {
        var dx = x - pointer.x, dy = y - pointer.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 190) {
          var f = (1 - dist / 190);
          d += f * f * 16 * Math.sin(t * 1.4 + dist * 0.03);
        }
      }
      return d;
    };

    var drawWeave = function () {
      wctx.clearRect(0, 0, W, H);
      var cols = Math.ceil(W / SP) + 2;
      var rows = Math.ceil(H / SP) + 2;

      /* warp — vertical threads */
      wctx.lineWidth = 1.4;
      for (var i = 0; i < cols; i++) {
        var x = i * SP;
        wctx.beginPath();
        for (var y = 0; y <= H; y += 8) {
          var xx = x + bow(x, y, 0);
          if (y === 0) wctx.moveTo(xx, y); else wctx.lineTo(xx, y);
        }
        wctx.strokeStyle = i % 4 === 0 ? 'rgba(140,193,99,.30)' : 'rgba(255,255,255,.10)';
        wctx.stroke();
      }

      /* weft — horizontal threads */
      for (var j = 0; j < rows; j++) {
        var y2 = j * SP;
        wctx.beginPath();
        for (var x2 = 0; x2 <= W; x2 += 8) {
          var yy = y2 + bow(x2, y2, 1.7);
          if (x2 === 0) wctx.moveTo(x2, yy); else wctx.lineTo(x2, yy);
        }
        wctx.strokeStyle = j % 4 === 0 ? 'rgba(140,193,99,.22)' : 'rgba(255,255,255,.08)';
        wctx.stroke();
      }

      /* the weave itself: redraw the crossing thread OVER the other,
         alternating per intersection so it reads as interlaced cloth */
      wctx.lineWidth = 1.8;
      for (var a = 0; a < cols; a++) {
        for (var b = 0; b < rows; b++) {
          if ((a + b) % 2 !== 0) continue;
          var cx = a * SP, cy = b * SP;
          var ox = bow(cx, cy, 0), oy = bow(cx, cy, 1.7);
          wctx.beginPath();
          wctx.moveTo(cx + ox, cy + oy - SP * 0.42);
          wctx.lineTo(cx + ox, cy + oy + SP * 0.42);
          wctx.strokeStyle = a % 4 === 0 ? 'rgba(140,193,99,.45)' : 'rgba(255,255,255,.16)';
          wctx.stroke();
        }
      }
    };

    var loopWeave = function () {
      t += 0.016;
      drawWeave();
      wRaf = window.requestAnimationFrame(loopWeave);
    };

    var startWeave = function () {
      if (wRaf || reduceMotion) return;
      wRaf = window.requestAnimationFrame(loopWeave);
    };
    var stopWeave = function () {
      if (wRaf) { window.cancelAnimationFrame(wRaf); wRaf = null; }
    };

    sizeCanvas();
    drawWeave();                      /* static frame first, so it is never blank */

    window.addEventListener('resize', function () { sizeCanvas(); drawWeave(); }, { passive: true });

    if (band) {
      band.addEventListener('pointermove', function (e) {
        var r = weaveCanvas.getBoundingClientRect();
        pointer.x = e.clientX - r.left;
        pointer.y = e.clientY - r.top;
        pointer.active = true;
      });
      band.addEventListener('pointerleave', function () { pointer.active = false; });
    }

    /* only animate while on screen and the tab is focused */
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        if (inView && document.visibilityState === 'visible') startWeave(); else stopWeave();
      }, { threshold: 0.02 }).observe(weaveCanvas);
    } else {
      startWeave();
    }

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && inView) startWeave(); else stopWeave();
    });
  }

  /* --- stitched scroll indicator ----------------------------------------- */
  /* A thread stitched down the page edge — dashes appear as you scroll, with
     a needle riding the leading end. Replaces the flat progress bar. */
  var thread = document.getElementById('stitchThread');
  var needle = document.getElementById('stitchNeedle');
  var progress = document.getElementById('scrollProgress');   /* legacy rail */

  if (thread) {
    var stitchTicking = false;
    var updateStitch = function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      /* clip rather than scale, so the dash rhythm never distorts */
      thread.style.clipPath = 'inset(0 0 ' + ((1 - p) * 100).toFixed(2) + '% 0)';
      if (needle) needle.style.transform = 'translateY(' + (p * window.innerHeight).toFixed(1) + 'px)';
      stitchTicking = false;
    };

    window.addEventListener('scroll', function () {
      if (!stitchTicking) { stitchTicking = true; window.requestAnimationFrame(updateStitch); }
    }, { passive: true });
    window.addEventListener('resize', updateStitch, { passive: true });
    updateStitch();
  } else if (progress) {
    var progTicking = false;
    var updateProgress = function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      progress.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      progTicking = false;
    };
    window.addEventListener('scroll', function () {
      if (!progTicking) { progTicking = true; window.requestAnimationFrame(updateProgress); }
    }, { passive: true });
    window.addEventListener('resize', updateProgress, { passive: true });
    updateProgress();
  }

  /* --- scroll-pinned process --------------------------------------------- */
  /* Steps scroll past a pinned frame; the imagery and counter follow the
     step currently in the reading zone. */
  var pinnedSteps = Array.prototype.slice.call(document.querySelectorAll('.pinned__step'));
  if (pinnedSteps.length && 'IntersectionObserver' in window) {
    var pinnedShots = Array.prototype.slice.call(document.querySelectorAll('.pinned__frame img'));
    var pinnedCounter = document.getElementById('pinnedCounter');

    var setCurrent = function (idx) {
      pinnedSteps.forEach(function (s, n) { s.classList.toggle('is-current', n === idx); });
      pinnedShots.forEach(function (im, n) { im.classList.toggle('is-current', n === idx); });
      if (pinnedCounter) {
        pinnedCounter.innerHTML = String(idx + 1).padStart(2, '0')
          + '<span>/' + String(pinnedSteps.length).padStart(2, '0') + '</span>';
      }
    };

    var pinObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var i = pinnedSteps.indexOf(entry.target);
          if (i !== -1) setCurrent(i);
        }
      });
    }, { rootMargin: '-45% 0px -45% 0px' });

    pinnedSteps.forEach(function (s) { pinObs.observe(s); });
    setCurrent(0);
  }

  /* --- custom cursor ---------------------------------------------------- */
  var dot = document.getElementById('cursorDot');
  var ring = document.getElementById('cursorRing');
  if (dot && ring && finePointer && !reduceMotion) {
    var mx = 0, my = 0, rx = 0, ry = 0, cursorRaf = null;

    var loop = function () {
      /* the ring trails the dot for a bit of weight */
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      dot.style.transform  = 'translate3d(' + mx + 'px,' + my + 'px,0) translate(-50%,-50%)';
      ring.style.transform = 'translate3d(' + rx.toFixed(2) + 'px,' + ry.toFixed(2) + 'px,0) translate(-50%,-50%)';
      cursorRaf = window.requestAnimationFrame(loop);
    };

    document.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      mx = e.clientX; my = e.clientY;
      if (!document.body.classList.contains('has-cursor')) {
        document.body.classList.add('has-cursor');
        rx = mx; ry = my;
        if (!cursorRaf) loop();
      }
    });

    document.addEventListener('pointerleave', function () {
      document.body.classList.remove('has-cursor');
    });

    /* grow over anything interactive */
    var hot = 'a, button, input, select, textarea, .gallery__item, .product, .quicklink';
    document.addEventListener('pointerover', function (e) {
      if (e.target.closest && e.target.closest(hot)) ring.classList.add('is-hot');
    });
    document.addEventListener('pointerout', function (e) {
      if (e.target.closest && e.target.closest(hot)) ring.classList.remove('is-hot');
    });
  }

  /* --- scroll reveal ---------------------------------------------------- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal, .stagger'));

  /* index children of staggered grids so CSS can offset each one */
  document.querySelectorAll('.stagger').forEach(function (grid) {
    Array.prototype.forEach.call(grid.children, function (child, i) {
      child.style.setProperty('--i', i);
    });
  });

  function revealNow(el) {
    el.classList.add('is-in');
    el.style.opacity = 1;
    Array.prototype.forEach.call(el.children, function (c) { c.style.opacity = 1; });
  }

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(revealNow);
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('is-in'); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

    revealEls.forEach(function (el) { io.observe(el); });

    /* A page loaded in a BACKGROUND tab never gets IntersectionObserver
       callbacks, so on first focus the visitor would meet blank sections.
       Sweep anything already on screen when the tab becomes visible. */
    var sweepVisible = function () {
      if (document.visibilityState !== 'visible') return;
      revealEls.forEach(function (el) {
        if (el.classList.contains('is-in')) return;
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) {
          el.classList.add('is-in');
          io.unobserve(el);
        }
      });
    };
    document.addEventListener('visibilitychange', sweepVisible);
    window.addEventListener('pageshow', sweepVisible);
  }

  /* --- active nav link -------------------------------------------------- */
  var sections = Array.prototype.slice.call(document.querySelectorAll('main section[id]'));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav__link[href^="#"]'));
  if ('IntersectionObserver' in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = '#' + entry.target.id;
        navLinks.forEach(function (link) {
          link.classList.toggle('is-active', link.getAttribute('href') === id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* --- hero parallax (addition) ----------------------------------------- */
  /* The media plane drifts slower than the page and recedes slightly in Z,
     so the hero gains depth as you scroll away from it. */
  var heroMedia = document.querySelector('.hero__media');
  var hero = document.querySelector('.hero');
  if (heroMedia && hero && !reduceMotion) {
    var ticking = false;
    var applyParallax = function () {
      var rect = hero.getBoundingClientRect();
      if (rect.bottom < 0) { ticking = false; return; }
      var progress = Math.min(1, Math.max(0, -rect.top / (rect.height || 1)));
      var shift = progress * 90;            /* px of drift */
      var depth = progress * -70;           /* px of Z recession */
      var scale = 1 + progress * 0.06;
      heroMedia.style.transform =
        'translate3d(0,' + shift.toFixed(2) + 'px,' + depth.toFixed(2) + 'px) scale(' + scale.toFixed(4) + ')';
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(applyParallax); }
    }, { passive: true });
    applyParallax();
  }

  /* --- 3D pointer tilt (addition) --------------------------------------- */
  /* Cards rotate toward the cursor on two axes; captions sit forward in Z
     so the card reads as a real plane rather than a flat image. */
  if (finePointer && !reduceMotion) {
    document.querySelectorAll('.tilt3d').forEach(function (card) {
      var inner = card.querySelector('.tilt3d__inner') || card;
      var raf = null;

      card.addEventListener('pointermove', function (e) {
        if (raf) return;
        raf = window.requestAnimationFrame(function () {
          var r = card.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width;   /* 0 → 1 */
          var py = (e.clientY - r.top) / r.height;
          var rotY = (px - 0.5) * 12;                 /* deg */
          var rotX = (0.5 - py) * 12;
          inner.style.transform =
            'perspective(900px) rotateX(' + rotX.toFixed(2) + 'deg) rotateY(' + rotY.toFixed(2) + 'deg) translate3d(0,0,22px)';
          raf = null;
        });
      });

      card.addEventListener('pointerleave', function () {
        inner.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) translate3d(0,0,0)';
      });
    });
  }

  /* --- magnetic circle buttons (addition) ------------------------------- */
  if (finePointer && !reduceMotion) {
    document.querySelectorAll('.circle--lg, .hero__scrollcue').forEach(function (btn) {
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) * 0.28;
        var dy = (e.clientY - (r.top + r.height / 2)) * 0.28;
        btn.style.transform = 'translate3d(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px,0)';
      });
      btn.addEventListener('pointerleave', function () {
        btn.style.transform = 'translate3d(0,0,0)';
      });
    });
  }

  /* --- stat count-up (addition) ----------------------------------------- */
  var statVals = Array.prototype.slice.call(document.querySelectorAll('[data-count]'));
  if (statVals.length && 'IntersectionObserver' in window) {
    var countObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        countObs.unobserve(el);
        var target = parseInt(el.getAttribute('data-count'), 10);
        if (isNaN(target)) return;

        /* Years count from a nearby floor rather than 0 — watching a date
           spin up from zero reads as a number, not a year. */
        var from = parseInt(el.getAttribute('data-count-from'), 10);
        if (isNaN(from)) from = 0;

        /* thousands separators, except where the value is a year */
        var plain = el.hasAttribute('data-count-plain');
        var fmt = function (v) { return plain ? String(v) : v.toLocaleString('en-GB'); };

        if (reduceMotion) { el.textContent = fmt(target); return; }

        var dur = 1400, start = null;
        var step = function (ts) {
          if (!start) start = ts;
          var p = Math.min(1, (ts - start) / dur);
          var eased = 1 - Math.pow(1 - p, 3);       /* easeOutCubic */
          el.textContent = fmt(Math.round(from + (target - from) * eased));
          if (p < 1) window.requestAnimationFrame(step);
          else el.textContent = fmt(target);        /* land exactly on target */
        };
        el.textContent = fmt(from);
        window.requestAnimationFrame(step);
      });
    }, { threshold: 0.4 });
    statVals.forEach(function (el) { countObs.observe(el); });
  }

  /* --- hero video ------------------------------------------------------- */
  var video = document.getElementById('heroVideo');
  if (video) {
    var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    var slow = conn && (conn.saveData === true || /2g/.test(conn.effectiveType || ''));

    /* No width gate. That existed when the source was 15 MB; the encode is
       now ~900 KB, which is fine on a phone. Only save-data, 2G and
       reduced-motion opt out. */
    if (!reduceMotion && !slow) {
      var started = false;

      var startVideo = function () {
        if (started) return;
        started = true;
        video.classList.add('is-ready');
        var p = video.play();
        if (p && p.catch) {
          p.catch(function () {
            /* Autoplay refused, or the tab is backgrounded and the browser
               paused audio-less video to save power. The poster remains, and
               playback resumes when the tab is focused. */
            started = false;
          });
        }
      };

      /* if it is already buffered (bfcache, warm cache) no event will fire */
      if (video.readyState >= 2) {
        startVideo();
      } else {
        video.addEventListener('loadeddata', startVideo, { once: true });
        video.addEventListener('canplay', startVideo, { once: true });
      }

      video.preload = 'auto';
      video.load();

      /* retry when the tab returns to the foreground */
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible' && video.paused && video.readyState >= 2) {
          started = false;
          startVideo();
        }
      });
    }
  }

  /* --- lightbox --------------------------------------------------------- */
  var lightbox = document.getElementById('lightbox');
  var lbImg = document.getElementById('lbImg');
  var lbVideo = document.getElementById('lbVideo');
  var lbCap = document.getElementById('lbCap');
  var lbClose = document.getElementById('lbClose');
  var lastFocused = null;

  function openLightbox(opts, trigger) {
    if (!lightbox) return;
    lastFocused = trigger || null;

    if (opts.video) {
      lbImg.style.display = 'none';
      lbImg.removeAttribute('src');
      lbVideo.style.display = 'block';
      /* setting currentTime before load throws InvalidStateError */
      try { lbVideo.currentTime = 0; } catch (err) {}
      var p = lbVideo.play();
      if (p && p.catch) p.catch(function () { /* controls remain available */ });
    } else {
      lbVideo.pause();
      lbVideo.style.display = 'none';
      lbImg.style.display = 'block';
      lbImg.src = opts.src;
      lbImg.alt = opts.caption || '';
    }

    lbCap.textContent = opts.caption || '';
    lightbox.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    if (lbClose) lbClose.focus();
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('is-open');
    document.body.style.overflow = '';
    lbVideo.pause();
    lbImg.removeAttribute('src');
    if (lastFocused) lastFocused.focus();
  }

  document.querySelectorAll('[data-lightbox]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      openLightbox({ src: btn.getAttribute('data-lightbox'), caption: btn.getAttribute('data-caption') }, btn);
    });
  });

  var playFilm = document.getElementById('playFilm');
  if (playFilm) {
    playFilm.addEventListener('click', function () {
      openLightbox({ video: true, caption: 'Nini Corporation' }, playFilm);
    });
  }

  if (lbClose) lbClose.addEventListener('click', closeLightbox);
  if (lightbox) lightbox.addEventListener('click', function (e) { if (e.target === lightbox) closeLightbox(); });

  /* --- sample request tray ----------------------------------------------- */
  /* Buyers pick categories across the site, then carry the list into the
     enquiry form. Stored in localStorage so it survives page navigation —
     every read/write is guarded, since localStorage throws outright in
     private windows and when site data is blocked. */
  var SAMPLE_KEY = 'nini_samples';

  var readSamples = function () {
    try {
      var raw = window.localStorage.getItem(SAMPLE_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  };
  var writeSamples = function (arr) {
    try { window.localStorage.setItem(SAMPLE_KEY, JSON.stringify(arr)); } catch (e) { /* ignore */ }
  };

  var tray = document.getElementById('sampleTray');
  var trayList = document.getElementById('trayList');
  var trayCount = document.getElementById('trayCount');
  var trayToggle = document.getElementById('trayToggle');
  var traySend = document.getElementById('traySend');
  var trayClear = document.getElementById('trayClear');
  var addButtons = Array.prototype.slice.call(document.querySelectorAll('[data-sample]'));

  var syncAddButtons = function (items) {
    addButtons.forEach(function (b) {
      var on = items.indexOf(b.getAttribute('data-sample')) !== -1;
      b.classList.toggle('is-added', on);
      b.setAttribute('aria-pressed', String(on));
      var name = b.getAttribute('data-sample');
      b.setAttribute('aria-label', (on ? 'Remove ' : 'Add ') + name + (on ? ' from' : ' to') + ' sample request');
    });
  };

  var renderTray = function () {
    var items = readSamples();
    syncAddButtons(items);
    if (!tray) return;

    tray.classList.toggle('has-items', items.length > 0);
    if (trayCount) trayCount.textContent = items.length;
    if (items.length === 0) tray.classList.remove('is-open');

    if (!trayList) return;
    trayList.innerHTML = '';
    if (items.length === 0) {
      var empty = document.createElement('p');
      empty.className = 'tray__empty';
      empty.textContent = 'No categories selected yet.';
      trayList.appendChild(empty);
      return;
    }
    items.forEach(function (name) {
      var row = document.createElement('div');
      row.className = 'tray__item';
      var label = document.createElement('span');
      label.textContent = name;
      var rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'tray__remove';
      rm.setAttribute('aria-label', 'Remove ' + name);
      rm.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
      rm.addEventListener('click', function () {
        var next = readSamples().filter(function (n) { return n !== name; });
        writeSamples(next);
        renderTray();
      });
      row.appendChild(label);
      row.appendChild(rm);
      trayList.appendChild(row);
    });
  };

  addButtons.forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var name = btn.getAttribute('data-sample');
      var items = readSamples();
      var at = items.indexOf(name);
      if (at === -1) items.push(name); else items.splice(at, 1);
      writeSamples(items);
      renderTray();
      if (tray && items.length && at === -1) {
        tray.classList.add('is-open');
        clearTimeout(tray._t);
        tray._t = setTimeout(function () { tray.classList.remove('is-open'); }, 2600);
      }
    });
  });

  if (trayToggle && tray) {
    trayToggle.addEventListener('click', function () {
      clearTimeout(tray._t);
      var open = tray.classList.toggle('is-open');
      trayToggle.setAttribute('aria-expanded', String(open));
    });
  }
  if (trayClear) {
    trayClear.addEventListener('click', function () { writeSamples([]); renderTray(); });
  }
  if (traySend) {
    traySend.addEventListener('click', function (e) {
      var items = readSamples();
      if (!items.length) return;

      var href = traySend.getAttribute('href') || 'contact.html#quote';
      /* localStorage does not cross origins, so when the enquiry destination
         is the app on another domain the list has to travel in the URL */
      var isExternal = /^https?:\/\//i.test(href) &&
                       href.indexOf(window.location.origin) !== 0;
      if (isExternal) {
        e.preventDefault();
        var url = new URL(href);
        url.searchParams.set('samples', items.join('|'));
        window.location.href = url.toString();
      }
      /* same-origin: let the link follow normally, storage carries the list */
    });
  }
  document.addEventListener('click', function (e) {
    if (tray && tray.classList.contains('is-open') && !e.target.closest('#sampleTray')) {
      tray.classList.remove('is-open');
      if (trayToggle) trayToggle.setAttribute('aria-expanded', 'false');
    }
  });

  renderTray();

  /* on the contact page, seed the message with whatever was collected —
     from storage, or from ?samples= when arriving from another origin */
  var msgField = document.getElementById('f-msg');
  if (msgField && !msgField.value.trim()) {
    var picked = readSamples();
    try {
      var fromUrl = new URLSearchParams(window.location.search).get('samples');
      if (fromUrl) picked = fromUrl.split('|').filter(Boolean);
    } catch (e) { /* no URLSearchParams support */ }
    if (picked.length) {
      msgField.value = 'Sample request — please quote the following:\n'
        + picked.map(function (n) { return '• ' + n; }).join('\n')
        + '\n\nQuantities / target price / delivery date:\n';
      var svc = document.getElementById('f-service');
      if (svc) {
        for (var o = 0; o < svc.options.length; o++) {
          if (/home textiles/i.test(svc.options[o].text)) { svc.selectedIndex = o; break; }
        }
      }
    }
  }

  /* --- testimonial carousel --------------------------------------------- */
  var track = document.getElementById('testiTrack');
  if (track) {
    var slides = track.children.length;
    var index = 0;
    var prev = document.getElementById('testiPrev');
    var next = document.getElementById('testiNext');
    var status = document.getElementById('testiStatus');

    function go(i) {
      index = (i + slides) % slides;
      track.style.transform = 'translate3d(' + (-index * 100) + '%,0,0)';
      if (status) status.textContent = 'Testimonial ' + (index + 1) + ' of ' + slides;
      Array.prototype.forEach.call(track.children, function (slide, n) {
        slide.setAttribute('aria-hidden', String(n !== index));
        slide.querySelectorAll('a,button').forEach(function (el) { el.tabIndex = n === index ? 0 : -1; });
      });
    }

    if (prev) prev.addEventListener('click', function () { go(index - 1); });
    if (next) next.addEventListener('click', function () { go(index + 1); });

    var testiRoot = track.closest('.testi');
    if (testiRoot) {
      testiRoot.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft')  go(index - 1);
        if (e.key === 'ArrowRight') go(index + 1);
      });
    }
    go(0);
  }

  /* --- global Escape / focus trap --------------------------------------- */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (lightbox && lightbox.classList.contains('is-open')) { closeLightbox(); return; }
      closeAllDropdowns(null);
      closeNav();
    }
    if (e.key === 'Tab' && lightbox && lightbox.classList.contains('is-open')) {
      var focusables = lightbox.querySelectorAll('button, video[controls]');
      if (focusables.length < 2) { e.preventDefault(); if (lbClose) lbClose.focus(); }
    }
  });

  /* --- quote form validation -------------------------------------------- */
  var form = document.getElementById('quoteForm');
  if (form) {
    var formStatus = document.getElementById('formStatus');
    function fieldOf(input) { return input.closest('.field'); }

    function validate(input) {
      var ok = input.checkValidity() && String(input.value).trim() !== '';
      var wrap = fieldOf(input);
      if (wrap) wrap.classList.toggle('is-invalid', !ok);
      input.setAttribute('aria-invalid', String(!ok));
      return ok;
    }

    form.querySelectorAll('[required]').forEach(function (input) {
      input.addEventListener('blur', function () { validate(input); });
      input.addEventListener('input', function () {
        var wrap = fieldOf(input);
        if (wrap && wrap.classList.contains('is-invalid')) validate(input);
      });
    });

    form.addEventListener('submit', function (e) {
      var required = Array.prototype.slice.call(form.querySelectorAll('[required]'));
      var firstBad = null;
      required.forEach(function (input) { if (!validate(input) && !firstBad) firstBad = input; });

      if (firstBad) { e.preventDefault(); firstBad.focus(); return; }

      /* With an action configured (Formspree, or the app's own API) let the
         browser post normally — validation has already passed. Without one,
         stop and say so rather than pretending it sent. */
      if (form.getAttribute('action')) {
        try { window.localStorage.removeItem(SAMPLE_KEY); } catch (err) {}
        return;
      }

      e.preventDefault();
      if (formStatus) {
        formStatus.textContent = 'Thank you. Your enquiry has been captured — connect a mail handler to receive it.';
        formStatus.classList.add('is-ok');
      }
      form.reset();
    });
  }

})();

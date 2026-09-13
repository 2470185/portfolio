/* Motion layer — progressive enhancement only.
   Every effect is opt-out via prefers-reduced-motion, and nothing here is
   required for the page to be readable or navigable. */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia('(pointer: coarse)').matches;
  var raf = window.requestAnimationFrame;

  /* ---------- scroll progress bar ---------- */
  var bar = document.createElement('div');
  bar.className = 'scroll-bar';
  document.body.appendChild(bar);

  /* ---------- film grain (cheap, adds depth) ---------- */
  if (!reduced) {
    var grain = document.createElement('div');
    grain.className = 'grain';
    document.body.appendChild(grain);
  }

  /* ---------- reveal on scroll ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.rv').forEach(function (el, i) {
    el.style.transitionDelay = (Math.min(i, 6) * 70) + 'ms';
    io.observe(el);
  });

  /* ---------- mask-wipe reveal for media and headings ---------- */
  if (!reduced) {
    var maskTargets = document.querySelectorAll('.shot, .work-media, .about-photo, .flowbox');
    var maskObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        maskObs.unobserve(e.target);
        e.target.classList.add('wiped');
      });
    }, { threshold: 0.15 });
    maskTargets.forEach(function (t) { t.classList.add('wipe'); maskObs.observe(t); });

    // Failsafe: a decorative effect must never be able to withhold content.
    // If anything prevents the observer from firing, reveal everything anyway.
    setTimeout(function () {
      maskTargets.forEach(function (t) { t.classList.add('wiped'); });
    }, 4000);
  }

  /* ---------- hero headline, word by word ---------- */
  if (!reduced) {
    document.querySelectorAll('.hero h1').forEach(function (h) {
      var walk = function (node) {
        if (node.nodeType === 3 && node.textContent.trim()) {
          var frag = document.createDocumentFragment();
          node.textContent.split(/(\s+)/).forEach(function (w) {
            if (!w.trim()) { frag.appendChild(document.createTextNode(w)); return; }
            var outer = document.createElement('span');
            outer.className = 'word-mask';
            var inner = document.createElement('span');
            inner.className = 'word';
            inner.textContent = w;
            outer.appendChild(inner);
            frag.appendChild(outer);
          });
          node.parentNode.replaceChild(frag, node);
        } else if (node.nodeType === 1) {
          Array.prototype.slice.call(node.childNodes).forEach(walk);
        }
      };
      Array.prototype.slice.call(h.childNodes).forEach(walk);
      h.querySelectorAll('.word').forEach(function (w, i) {
        w.style.animationDelay = (90 + i * 70) + 'ms';
      });
      h.classList.add('words-ready');
    });
  }

  /* ---------- count-up stats ---------- */
  var statObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      statObs.unobserve(e.target);
      var el = e.target, m = el.textContent.trim().match(/^(\d+)(.*)$/);
      if (!m || reduced) return;
      var target = parseInt(m[1], 10), suffix = m[2], start = null;
      function tick(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / 900, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
        if (p < 1) raf(tick);
      }
      el.textContent = '0' + suffix;
      raf(tick);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('.stat b').forEach(function (b) { statObs.observe(b); });

  /* ---------- pointer-tracked tilt + glow ---------- */
  if (!reduced && !coarse) {
    var TILT = 5.5;
    document.querySelectorAll('.work, .step, .req, .dec, .feat, .skillcard, .stat')
      .forEach(function (card) {
        card.classList.add('tiltable');
        var pending = null;
        card.addEventListener('pointermove', function (ev) {
          if (pending) return;
          pending = raf(function () {
            pending = null;
            var r = card.getBoundingClientRect();
            var px = (ev.clientX - r.left) / r.width;
            var py = (ev.clientY - r.top) / r.height;
            card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
            card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
            card.style.setProperty('--rx', ((0.5 - py) * TILT).toFixed(2) + 'deg');
            card.style.setProperty('--ry', ((px - 0.5) * TILT).toFixed(2) + 'deg');
            var img = card.querySelector('.work-media img');
            if (img) {
              img.style.setProperty('--ix', ((px - 0.5) * -14).toFixed(1) + 'px');
              img.style.setProperty('--iy', ((py - 0.5) * -10).toFixed(1) + 'px');
            }
          });
        }, { passive: true });
        card.addEventListener('pointerleave', function () {
          card.style.setProperty('--rx', '0deg');
          card.style.setProperty('--ry', '0deg');
          var img = card.querySelector('.work-media img');
          if (img) { img.style.setProperty('--ix', '0px'); img.style.setProperty('--iy', '0px'); }
        });
      });
  }

  /* ---------- magnetic buttons ---------- */
  if (!reduced && !coarse) {
    document.querySelectorAll('.btn, .nav-cta').forEach(function (btn) {
      var pending = null;
      btn.addEventListener('pointermove', function (ev) {
        if (pending) return;
        pending = raf(function () {
          pending = null;
          var r = btn.getBoundingClientRect();
          var dx = (ev.clientX - (r.left + r.width / 2)) / r.width;
          var dy = (ev.clientY - (r.top + r.height / 2)) / r.height;
          btn.style.setProperty('--bx', (dx * 13).toFixed(1) + 'px');
          btn.style.setProperty('--by', (dy * 9).toFixed(1) + 'px');
        });
      }, { passive: true });
      btn.addEventListener('pointerleave', function () {
        btn.style.setProperty('--bx', '0px');
        btn.style.setProperty('--by', '0px');
      });
    });
  }

  /* ---------- eased anchor scrolling ---------- */
  if (!reduced) {
    document.querySelectorAll('a[href^="#"], a[href*="index.html#"]').forEach(function (a) {
      a.addEventListener('click', function (ev) {
        var id = (a.getAttribute('href') || '').split('#')[1];
        var target = id && document.getElementById(id);
        if (!target) return;
        ev.preventDefault();
        var startY = window.scrollY;
        var endY = target.getBoundingClientRect().top + startY - 72;
        var t0 = null, dur = Math.min(1100, 420 + Math.abs(endY - startY) * 0.35);
        raf(function step(ts) {
          if (!t0) t0 = ts;
          var p = Math.min((ts - t0) / dur, 1);
          var e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
          window.scrollTo(0, startY + (endY - startY) * e);
          if (p < 1) raf(step);
        });
      });
    });
  }

  /* ---------- scroll-driven: bar, nav, parallax, velocity skew ---------- */
  var nav = document.querySelector('nav');
  var aurora = document.querySelector('.aurora');
  var doc = document.documentElement;
  var ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    raf(function () {
      ticking = false;
      var y = window.scrollY;
      var max = doc.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
      if (nav) nav.classList.toggle('scrolled', y > 40);

      if (!reduced && aurora && y < 1000) {
        aurora.style.transform = 'translateY(' + (y * 0.16).toFixed(1) + 'px)';
      }
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- active section in nav ---------- */
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav-links a[href*="#"]'));
  if (links.length) {
    var secObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) {
          a.toggleAttribute('aria-current',
            (a.getAttribute('href') || '').endsWith('#' + e.target.id));
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.map(function (a) { return (a.getAttribute('href') || '').split('#')[1]; })
      .filter(Boolean)
      .forEach(function (id) {
        var s = document.getElementById(id);
        if (s) secObs.observe(s);
      });
  }
})();

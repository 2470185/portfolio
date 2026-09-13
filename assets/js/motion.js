/* Motion layer — progressive enhancement only.
   Every effect is opt-out via prefers-reduced-motion, and nothing here is
   required for the page to be readable or navigable. */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia('(pointer: coarse)').matches;

  /* ---------- 1. scroll progress bar ---------- */
  var bar = document.createElement('div');
  bar.className = 'scroll-bar';
  document.body.appendChild(bar);

  /* ---------- 2. reveal on scroll ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.rv').forEach(function (el, i) {
    el.style.transitionDelay = (Math.min(i, 6) * 70) + 'ms';
    io.observe(el);
  });

  /* ---------- 3. hero headline, word by word ---------- */
  if (!reduced) {
    document.querySelectorAll('.hero h1').forEach(function (h) {
      h.querySelectorAll('.serif, br').length; // keep structure intact
      var walk = function (node) {
        if (node.nodeType === 3 && node.textContent.trim()) {
          var frag = document.createDocumentFragment();
          node.textContent.split(/(\s+)/).forEach(function (w) {
            if (!w.trim()) { frag.appendChild(document.createTextNode(w)); return; }
            var s = document.createElement('span');
            s.className = 'word';
            s.textContent = w;
            frag.appendChild(s);
          });
          node.parentNode.replaceChild(frag, node);
        } else if (node.nodeType === 1) {
          Array.prototype.slice.call(node.childNodes).forEach(walk);
        }
      };
      Array.prototype.slice.call(h.childNodes).forEach(walk);
      h.querySelectorAll('.word').forEach(function (w, i) {
        w.style.animationDelay = (90 + i * 65) + 'ms';
      });
      h.classList.add('words-ready');
    });
  }

  /* ---------- 4. count-up stats ---------- */
  var statObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      statObs.unobserve(e.target);
      var el = e.target;
      var raw = el.textContent.trim();
      var m = raw.match(/^(\d+)(.*)$/);
      if (!m || reduced) return;
      var target = parseInt(m[1], 10), suffix = m[2], start = null, dur = 900;
      function tick(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      }
      el.textContent = '0' + suffix;
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('.stat b').forEach(function (b) { statObs.observe(b); });

  /* ---------- 5. pointer-tracked tilt + glow on cards ---------- */
  if (!reduced && !coarse) {
    var TILT = 5.5;
    document.querySelectorAll('.work, .step, .req, .dec, .feat, .skillcard').forEach(function (card) {
      card.classList.add('tiltable');
      var raf = null;
      card.addEventListener('pointermove', function (ev) {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = null;
          var r = card.getBoundingClientRect();
          var px = (ev.clientX - r.left) / r.width;
          var py = (ev.clientY - r.top) / r.height;
          card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
          card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
          card.style.setProperty('--rx', ((0.5 - py) * TILT).toFixed(2) + 'deg');
          card.style.setProperty('--ry', ((px - 0.5) * TILT).toFixed(2) + 'deg');
        });
      }, { passive: true });
      card.addEventListener('pointerleave', function () {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ---------- 6. scroll-driven work ---------- */
  var nav = document.querySelector('nav');
  var aurora = document.querySelector('.aurora');
  var doc = document.documentElement;
  var ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var y = window.scrollY;
      var max = doc.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
      if (nav) nav.classList.toggle('scrolled', y > 40);
      if (aurora && !reduced && y < 1000) {
        aurora.style.transform = 'translateY(' + (y * 0.16).toFixed(1) + 'px)';
      }
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- 7. active section in nav ---------- */
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav-links a[href*="#"]'));
  if (links.length) {
    var ids = links.map(function (a) { return (a.getAttribute('href') || '').split('#')[1]; })
                   .filter(Boolean);
    var secObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) {
          a.toggleAttribute('aria-current',
            (a.getAttribute('href') || '').endsWith('#' + e.target.id));
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ids.forEach(function (id) {
      var s = document.getElementById(id);
      if (s) secObs.observe(s);
    });
  }
})();

/* Spring layer — drives Motion, the vanilla build of the animation engine
   behind Framer Motion, loaded from a pinned CDN build with an SRI hash.

   Progressive enhancement only. If the library fails to load, or the
   visitor prefers reduced motion, this file returns before touching the
   page and every element stays where the stylesheet puts it. That is why
   no hidden or pre-animation state lives in the stylesheet for this layer.

   Ownership is deliberate. The stylesheet and motion.js already animate
   .rv reveals, card tilt, magnetic buttons and the hero entrance through
   transform. Two systems writing one property on one element is how this
   site broke before, so this layer only touches elements nothing else
   animates: [data-m] cards, the timeline rail and dots, the hero wrapper,
   and the nav pill. */
(function () {
  'use strict';

  var M = window.Motion;
  if (!M || !M.animate) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var animate = M.animate;
  var coarse = window.matchMedia('(pointer: coarse)').matches;
  var raf = window.requestAnimationFrame;
  var spring = function (extra) {
    var o = { type: 'spring', bounce: 0.22, visualDuration: 0.62 };
    for (var k in extra) o[k] = extra[k];
    return o;
  };
  // scroll() hands a number in current Motion and an axis object in older builds
  var progressOf = function (p) {
    if (typeof p === 'number') return p;
    return p && p.y && typeof p.y.progress === 'number' ? p.y.progress : 0;
  };

  document.documentElement.classList.add('has-motion');

  /* ---------- spring reveals ---------- */
  var narrow = window.matchMedia('(max-width: 860px)').matches;

  // data-m names the side a card sits on. Cards enter from the rail outward,
  // never from the page edge inward: an outward starting offset pushes a
  // right-hand card past the viewport on any screen narrower than 1232px,
  // where the gutter is only the wrapper's 26px padding.
  function fromState(el) {
    var side = el.getAttribute('data-m');
    if (!narrow && side === 'left') return { x: 40, y: 0 };
    if (!narrow && side === 'right') return { x: -40, y: 0 };
    return { x: 0, y: 30 };
  }

  var groups = [];
  document.querySelectorAll('[data-m-group]').forEach(function (g) {
    var items = Array.prototype.slice.call(g.querySelectorAll('[data-m]'));
    if (items.length) groups.push({ el: g, items: items, done: false });
  });

  function reveal(group) {
    if (group.done) return;
    group.done = true;
    group.items.forEach(function (el, i) {
      var f = fromState(el);
      animate(el, { opacity: [0, 1], x: [f.x, 0], y: [f.y, 0], scale: [0.97, 1] },
        spring({ delay: i * 0.085 }));
    });
  }

  groups.forEach(function (group) {
    // Already on screen at load (a reload mid-page, or an anchor link):
    // leave it visible rather than blanking it for an entrance.
    if (group.el.getBoundingClientRect().top < window.innerHeight * 0.9) {
      group.done = true;
      return;
    }
    group.items.forEach(function (el) {
      var f = fromState(el);
      el.style.opacity = '0';
      el.style.transform = 'translate3d(' + f.x + 'px,' + f.y + 'px,0) scale(0.97)';
    });
    if (M.inView) M.inView(group.el, function () { reveal(group); }, { amount: 0.18 });
  });

  // A decorative effect must never withhold content. Whatever the observer
  // does, a group that is clearly on screen, or already scrolled past, is shown.
  var sweeping = false;
  function sweep() {
    sweeping = false;
    var vh = window.innerHeight;
    groups.forEach(function (group) {
      if (!group.done && group.el.getBoundingClientRect().top < vh * 0.6) reveal(group);
    });
  }
  window.addEventListener('scroll', function () {
    if (!sweeping) { sweeping = true; raf(sweep); }
  }, { passive: true });
  setTimeout(function () {
    var vh = window.innerHeight;
    groups.forEach(function (group) {
      if (!group.done && group.el.getBoundingClientRect().top < vh) reveal(group);
    });
  }, 4000);

  /* ---------- timeline rail draws with the scroll ---------- */
  if (M.scroll) {
    document.querySelectorAll('.timeline').forEach(function (tl) {
      var fill = tl.querySelector('.tl-fill');
      var rail = tl.querySelector('.tl-rail');
      var dots = Array.prototype.slice.call(tl.querySelectorAll('.tl-dot'));
      if (!fill || !rail) return;
      var armed = false;
      M.scroll(function (raw) {
        var p = Math.max(0, Math.min(1, progressOf(raw)));
        // Dots dim only once the callback has proved it runs, so a silent
        // failure leaves the timeline fully drawn rather than half lit.
        if (!armed) { armed = true; tl.classList.add('tl-armed'); }
        fill.style.transform = 'scaleY(' + p.toFixed(4) + ')';
        var rr = rail.getBoundingClientRect();
        var edge = rr.top + rr.height * p;
        dots.forEach(function (d) {
          var dr = d.getBoundingClientRect();
          d.classList.toggle('lit', dr.top + dr.height / 2 <= edge + 1);
        });
      }, { target: tl, offset: ['start 70%', 'end 55%'] });
    });
  }

  /* ---------- hero eases away as you scroll past it ---------- */
  var hero = document.querySelector('.hero');
  var heroWrap = hero && hero.querySelector(':scope > .wrap');
  if (M.scroll && heroWrap) {
    M.scroll(function (raw) {
      var p = Math.max(0, Math.min(1, progressOf(raw)));
      heroWrap.style.transform =
        'translate3d(0,' + (p * 80).toFixed(1) + 'px,0) scale(' + (1 - p * 0.05).toFixed(4) + ')';
      heroWrap.style.opacity = (1 - p * 0.6).toFixed(3);
    }, { target: hero, offset: ['start start', 'end start'] });
  }

  /* ---------- nav pill glides between links ---------- */
  var list = document.querySelector('.nav-links');
  if (list && !coarse) {
    var pill = document.createElement('li');
    pill.className = 'nav-pill';
    pill.setAttribute('aria-hidden', 'true');
    list.appendChild(pill);
    document.documentElement.classList.add('has-pill');

    var current = function () { return list.querySelector('a[aria-current]'); };
    var shown = false;
    var moveTo = function (a, instant) {
      if (!a || !a.offsetWidth) {
        if (shown) { animate(pill, { opacity: 0 }, { duration: 0.18 }); shown = false; }
        return;
      }
      var lr = list.getBoundingClientRect(), r = a.getBoundingClientRect();
      var x = r.left - lr.left - 12, w = r.width + 24;
      if (instant || !shown) {
        // first appearance: place it, then fade, so it never slides in from the edge
        animate(pill, { x: x, width: w }, { duration: 0 });
        animate(pill, { opacity: 1 }, { duration: 0.2 });
      } else {
        animate(pill, { x: x, width: w, opacity: 1 }, spring({ bounce: 0.2, visualDuration: 0.42 }));
      }
      shown = true;
    };

    list.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('pointerenter', function () { moveTo(a); });
      a.addEventListener('focus', function () { moveTo(a); });
    });
    list.addEventListener('pointerleave', function () { moveTo(current()); });
    new MutationObserver(function () {
      if (!list.matches(':hover')) moveTo(current());
    }).observe(list, { subtree: true, attributes: true, attributeFilter: ['aria-current'] });
    window.addEventListener('resize', function () { moveTo(current(), true); });
    moveTo(current(), true);
  }

  /* ---------- cards lift on a spring ---------- */
  if (M.hover && !coarse) {
    document.querySelectorAll('.cert, .tl-card').forEach(function (card) {
      var mark = card.querySelector('.cert-mark');
      M.hover(card, function () {
        animate(card, { y: -6 }, spring({ bounce: 0.35, visualDuration: 0.34 }));
        if (mark) animate(mark, { rotate: -8, scale: 1.08 }, spring({ bounce: 0.45, visualDuration: 0.4 }));
        return function () {
          animate(card, { y: 0 }, spring({ bounce: 0.25, visualDuration: 0.4 }));
          if (mark) animate(mark, { rotate: 0, scale: 1 }, spring({ bounce: 0.3, visualDuration: 0.4 }));
        };
      });
    });
  }
})();

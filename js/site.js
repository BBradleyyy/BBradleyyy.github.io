/* Light motion for bradleykakiz.com: reveal on scroll, count-up figures, hero chart draw,
   scroll progress, section-aware nav and a cursor light on cards.
   Everything is static when the visitor prefers reduced motion or scripts are off. */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;
  var header = document.querySelector('.site-header');
  var bar = document.querySelector('.progress');
  function onScroll() {
    var y = window.scrollY || 0, h = document.documentElement.scrollHeight - window.innerHeight;
    if (header) header.classList.toggle('scrolled', y > 8);
    if (bar && !reduce) bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, y / h) : 0) + ')';
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // cards: the soft light follows the cursor
  document.querySelectorAll('.card, .stat').forEach(function (el) {
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  // nav: underline the section in view
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav a[href^="#"]'));
  if (links.length && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle('here', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach(function (a) { var t = document.querySelector(a.getAttribute('href')); if (t) spy.observe(t); });
  }

  if (reduce || !('IntersectionObserver' in window)) { root.classList.add('static'); return; }
  root.classList.add('motion');

  var targets = document.querySelectorAll(
    '.section h2, .section .prose p, .role, .feature, .card, .two-col > div, .cta-box, .stat, ' +
    'figure, .table-wrap, .aside, .soft-cta, video, .h2s, .band h2');
  var groups = new Map();
  targets.forEach(function (el) {
    el.classList.add('reveal');
    var p = el.parentElement;
    var i = groups.get(p) || 0;
    el.style.transitionDelay = Math.min(i, 5) * 70 + 'ms';
    groups.set(p, i + 1);
  });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  targets.forEach(function (el) { io.observe(el); });

  // count-up: <b data-count="7000" data-suffix="+">7,000+</b>
  var counters = document.querySelectorAll('[data-count]');
  var co = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      co.unobserve(e.target);
      var el = e.target, end = parseFloat(el.dataset.count), suffix = el.dataset.suffix || '';
      var t0 = null, dur = 1200;
      function step(ts) {
        if (!t0) t0 = ts;
        var k = Math.min(1, (ts - t0) / dur), eased = 1 - Math.pow(1 - k, 3);
        el.textContent = Math.round(end * eased).toLocaleString('en-US') + suffix;
        if (k < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }, { threshold: 0.6 });
  counters.forEach(function (el) { co.observe(el); });
})();

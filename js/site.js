/* Light motion for bradleykakiz.com: reveal on scroll, count-up figures, hero chart draw.
   Everything is static when the visitor prefers reduced motion or scripts are off. */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;
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

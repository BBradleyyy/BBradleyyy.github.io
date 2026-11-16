/* Hero background: a dark trading floor drawn live -- dotted world map, candlesticks, trend lines,
   flickering prices and a perspective grid. Original artwork, no images. With reduced motion it is
   drawn once and stays still. */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MAP = [
    "                                                                ",
    "      ######      ##                  #####                     ",
    "   ############  ####       ##    ##############  ######        ",
    "  ###############  ##      ####  ######################  ###    ",
    "   ##############         ##   ##########################  ##   ",
    "     ############         #  ############################       ",
    "      ##########             ##########################         ",
    "       ########             ###### #################   #        ",
    "        #####               #####   ############## ##           ",
    "         ###                ########  ###########               ",
    "          ##   #           ##########   ######  #               ",
    "            #####          ###########   ####    ##             ",
    "             ######         #########     ##      #             ",
    "             ########         #######             ##            ",
    "              #######         ######            #####           ",
    "               #####          #####            #######          ",
    "               ####            ###              ######          ",
    "               ###             ##                 ##       #    ",
    "               ##                                               ",
    "               #                                                "];

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function Scene(host) {
    var cv = document.createElement('canvas');
    cv.className = 'hero-bg';
    cv.setAttribute('aria-hidden', 'true');
    host.insertBefore(cv, host.firstChild);
    var ctx = cv.getContext('2d'), w = 0, h = 0, candles = [], lines = [[], []], nums = [], t = 0;

    function seed() {
      candles = []; var p = 100;
      for (var i = 0; i < 46; i++) candles.push(next(p)), p = candles[candles.length - 1].c;
      lines = [[], []];
      for (var k = 0; k < 2; k++) { var v = rnd(0.35, 0.65); for (var j = 0; j < 9; j++) { v += rnd(-0.16, 0.16); v = Math.min(0.9, Math.max(0.15, v)); lines[k].push(v); } }
      nums = [];
      for (var n = 0; n < 7; n++) nums.push({ x: 0.62 + 0.055 * n + rnd(-0.01, 0.01), y: rnd(0.12, 0.80), v: rnd(15, 240), up: Math.random() < 0.55, s: rnd(12, 17) });
    }
    function next(p) {
      var o = p, c = Math.max(20, o + rnd(-4.2, 4.6)), hi = Math.max(o, c) + rnd(0.3, 3), lo = Math.min(o, c) - rnd(0.3, 3);
      return { o: o, c: c, h: hi, l: lo };
    }
    function size() {
      var r = host.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      w = r.width; h = r.height; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function draw() {
      var g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#05112B'); g.addColorStop(0.55, '#0A1F4D'); g.addColorStop(1, '#0B2A6F');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      // dotted world map
      var cols = MAP[0].length, rows = MAP.length, cell = Math.min(w * 0.85 / cols, h * 0.95 / rows);
      var ox = w * 0.12, oy = h * 0.04;
      ctx.fillStyle = 'rgba(91,141,239,.20)';
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) if (MAP[r][c] === '#') {
        ctx.fillRect(ox + c * cell, oy + r * cell, cell * 0.55, cell * 0.55);
      }
      // perspective grid floor
      var hz = h * 0.72; ctx.strokeStyle = 'rgba(120,160,230,.16)'; ctx.lineWidth = 1;
      for (var i = 0; i <= 18; i++) { var x = w * i / 18; ctx.beginPath(); ctx.moveTo(w / 2 + (x - w / 2) * 0.25, hz); ctx.lineTo(x * 1.6 - w * 0.3, h); ctx.stroke(); }
      for (var k = 0; k < 7; k++) { var y = hz + (h - hz) * Math.pow(k / 6, 1.8); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      ctx.fillStyle = 'rgba(200,220,255,.55)';
      for (var a = 0; a <= 18; a += 2) for (var b = 1; b < 7; b += 2) {
        var yy = hz + (h - hz) * Math.pow(b / 6, 1.8), f = (yy - hz) / (h - hz), xx = w / 2 + (w * a / 18 * 1.6 - w * 0.3 - w / 2) * (0.25 + 0.75 * f);
        ctx.beginPath(); ctx.arc(xx, yy, 1.4, 0, Math.PI * 2); ctx.fill();
      }
      // candlesticks
      var lo = Infinity, hi = -Infinity;
      candles.forEach(function (k) { lo = Math.min(lo, k.l); hi = Math.max(hi, k.h); });
      var x0 = w * 0.08, cw = (w * 0.92) / candles.length, top = h * 0.16, bot = h * 0.80;
      var Y = function (v) { return bot - (bot - top) * (v - lo) / (hi - lo || 1); };
      ctx.shadowBlur = 0;
      candles.forEach(function (k, i) {
        var up = k.c >= k.o, col = up ? '#3FBF9B' : '#E0736F', x = x0 + i * cw + cw / 2;
        var fade = 0.15 + 0.6 * (i / candles.length);
        ctx.globalAlpha = fade; ctx.shadowColor = col; ctx.strokeStyle = col; ctx.fillStyle = col;
        ctx.beginPath(); ctx.moveTo(x, Y(k.h)); ctx.lineTo(x, Y(k.l)); ctx.lineWidth = 1.2; ctx.stroke();
        var y1 = Y(Math.max(k.o, k.c)), y2 = Y(Math.min(k.o, k.c));
        ctx.fillRect(x - cw * 0.3, y1, cw * 0.6, Math.max(1.5, y2 - y1));
      });
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      // trend lines
      [['rgba(94,214,200,.45)', 0], ['rgba(224,115,111,.32)', 1]].forEach(function (s) {
        var pts = lines[s[1]]; ctx.strokeStyle = s[0]; ctx.lineWidth = 1.4;
        ctx.beginPath();
        pts.forEach(function (v, i) { var x = w * (0.05 + 0.9 * i / (pts.length - 1)), y = top + (bot - top) * (1 - v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
        ctx.stroke(); ctx.shadowBlur = 0;
      });
      // prices
      var narrow = w < 700;
      nums.forEach(function (n, idx) {
        if (narrow) return;
        ctx.font = '500 ' + n.s + 'px Inter, system-ui, sans-serif';
        ctx.fillStyle = n.up ? 'rgba(63,191,155,.55)' : 'rgba(224,115,111,.5)';
        var nx = Math.max(w * n.x, w / 2 + 120 + (n.x - 0.62) * 1400);
        if (nx < w - 60) ctx.fillText(n.v.toFixed(2), nx, h * n.y);
      });
      // keep the text side readable
      var shade = ctx.createLinearGradient(0, 0, w, 0);
      if (narrow) { shade.addColorStop(0, 'rgba(5,17,43,.78)'); shade.addColorStop(1, 'rgba(5,17,43,.62)'); }
      else { shade.addColorStop(0, 'rgba(5,17,43,.88)'); shade.addColorStop(0.45, 'rgba(5,17,43,.55)'); shade.addColorStop(1, 'rgba(5,17,43,.15)'); }
      ctx.fillStyle = shade; ctx.fillRect(0, 0, w, h);
    }
    function tick() {
      t++;
      if (t % 40 === 0) { candles.shift(); candles.push(next(candles[candles.length - 1].c)); }
      if (t % 12 === 0) { var n = nums[Math.floor(Math.random() * nums.length)]; var d = n.v * rnd(-0.012, 0.012); n.v += d; n.up = d >= 0; }
      if (t % 120 === 0) lines.forEach(function (pts) { pts.shift(); var v = pts[pts.length - 1] + rnd(-0.16, 0.16); pts.push(Math.min(0.9, Math.max(0.15, v))); });
      draw();
    }
    seed(); size(); draw();
    window.addEventListener('resize', function () { size(); draw(); });
    if (!reduce) {
      var visible = true;
      if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(host);
      setInterval(function () { if (visible && !document.hidden) tick(); }, 90);
    }
  }
  document.querySelectorAll('.hero, .p-hero').forEach(function (el) { Scene(el); });
})();

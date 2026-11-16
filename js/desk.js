/* The trading desk: a 60-second simulated index future on a trading-terminal screen.
   Ticks every 100 ms; ten ticks make a one-second candle. Volatility switches between calm and
   stormy regimes, headlines arrive as jumps, and the trend flips without warning. Orders fill at
   the market: buys at the ask, sells at the bid, a quarter point apart. One point is $50. */
(function () {
  var app = document.getElementById('desk-app');
  if (!app) return;
  var $ = function (id) { return document.getElementById(id); };
  var cv = $('d-canvas'), ctx = cv.getContext('2d');
  var MULT = 50, MAXPOS = 3, TICK = 100, PER = 10, LEN = 600, MARGIN = 25000, HALF = 0.125;
  var COL = { up: '#26A69A', dn: '#EF5350', ema: '#F5C542', grid: 'rgba(148,163,184,.10)',
              axis: 'rgba(203,213,225,.70)', text: '#E2E8F0' };
  var NEWS_UP = ['Fed signals a pause', 'Earnings beat across tech', 'Inflation cools more than expected',
    'Ceasefire talks advance', 'Jobs report lands in the sweet spot', 'Buyback wave announced'];
  var NEWS_DN = ['CPI comes in hot', 'Credit fund halts redemptions', 'Bond yields spike',
    'Guidance cut at a megacap', 'Oil jumps on supply shock', 'Liquidity dries up in futures'];
  var WATCH = [['NDQ Z6', 'Tech 100 fut', 18250, 0.0016], ['CRD F7', 'Crude oil fut', 74.2, 0.003],
    ['GLD G7', 'Gold fut', 2410, 0.0011], ['UST 10Y', 'Treasury yield', 4.21, 0.002],
    ['EUR/USD', 'Euro', 1.0842, 0.0006], ['VOLX', 'Volatility index', 15.8, 0.006]];
  var st, qty = 1, watch = [];

  function gauss() { var u = 1 - Math.random(), v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function money(v) { var s = Math.round(Math.abs(v)).toLocaleString('en-US'); return (v < 0 ? '−$' : '$') + s; }
  function px(v) { return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function tick25(v) { return Math.round(v * 4) / 4; }
  function best() { try { return parseFloat(localStorage.getItem('sn-desk-best')); } catch (e) { return NaN; } }
  function saveBest(v) { try { localStorage.setItem('sn-desk-best', String(v)); } catch (e) { /* storage off */ } }
  function clock(t) { var s = Math.floor(t / 10), m = Math.floor(s / 60); return '09:3' + (m) + ':' + String(s % 60).padStart(2, '0') + '.' + (t % 10); }

  function newCandle(p) { return { o: p, h: p, l: p, c: p, v: 0 }; }

  function reset(preview) {
    st = { candles: [], last: 5000, open: 5000, hi: 5000, lo: 5000, vol: 0, t: 0, pos: 0, avg: 0, real: 0,
           run: false, sig: 0.00035, regime: 'calm', drift: 0, marks: [], news: '', newsT: 0, timer: null,
           trades: 0, fills: [], tape: [] };
    // an hour of history before the open, so the chart starts full
    var p = 5000 * Math.exp(-0.004 + 0.008 * Math.random());
    for (var i = 0; i < 70; i++) {
      var c = newCandle(p);
      for (var k = 0; k < PER; k++) { p = p * Math.exp(0.0004 * gauss()); c.h = Math.max(c.h, p); c.l = Math.min(c.l, p); c.v += 2 + Math.floor(Math.random() * 18); }
      c.c = p; st.candles.push(c);
    }
    var lastC = st.candles[st.candles.length - 1];
    st.last = st.open = st.hi = st.lo = tick25(lastC.c);
    st.candles.push(newCandle(st.last));
    $('d-fills').innerHTML = '<tr class="empty"><td colspan="4">No fills yet</td></tr>';
    $('d-tape').innerHTML = '';
    render(); stats();
  }

  function step() {
    if (Math.random() < 0.02) {
      st.regime = st.regime === 'calm' ? 'storm' : 'calm';
      st.sig = st.regime === 'calm' ? 0.00030 + Math.random() * 0.00015 : 0.0008 + Math.random() * 0.0006;
    }
    if (Math.random() < 0.03) st.drift = (Math.random() - 0.5) * 0.00025;
    var r = st.drift + st.sig * gauss();
    if (Math.random() < 0.006) {
      var up = Math.random() < 0.5;
      r += (0.003 + Math.random() * 0.007) * (up ? 1 : -1);
      st.news = (up ? '▲ ' : '▼ ') + (up ? NEWS_UP : NEWS_DN)[Math.floor(Math.random() * 6)];
      st.newsT = 30; st.sig = Math.max(st.sig, 0.0009); st.regime = 'storm';
    }
    var p = tick25(Math.max(100, st.last * Math.exp(r)));
    var size = 1 + Math.floor(Math.random() * (st.regime === 'storm' ? 60 : 20));
    var c = st.candles[st.candles.length - 1];
    c.h = Math.max(c.h, p); c.l = Math.min(c.l, p); c.c = p; c.v += size;
    st.vol += size; st.hi = Math.max(st.hi, p); st.lo = Math.min(st.lo, p);
    if (Math.random() < 0.6) print(p, size, p >= st.last);
    st.last = p; st.t++;
    if (st.t % PER === 0 && st.t < LEN) { st.candles.push(newCandle(p)); if (st.candles.length > 110) st.candles.shift(), st.marks.forEach(function (m) { m.i--; }); }
    if (st.newsT > 0 && --st.newsT === 0) st.news = '';
    if (st.real + openPnl() <= -MARGIN) { closeAll(); end('Margin call', 'The desk liquidated your position. Volatility cuts both ways.'); return; }
    if (st.t >= LEN) { closeAll(); end('Closing bell', ''); return; }
    if (st.t % 5 === 0) moveWatch();
    render(); stats();
  }

  function quote() { return { bid: st.last - 0.25, ask: st.last + 0.25 }; }
  function openPnl() { var q = quote(); return st.pos > 0 ? st.pos * (q.bid - st.avg) * MULT : st.pos < 0 ? st.pos * (q.ask - st.avg) * MULT : 0; }

  function fill(dir, n) {
    var q = quote(), price = dir > 0 ? q.ask : q.bid;
    var np = Math.max(-MAXPOS, Math.min(MAXPOS, st.pos + dir * n)), done = Math.abs(np - st.pos);
    if (!done) return;
    var reduce = st.pos !== 0 && Math.sign(st.pos) !== dir ? Math.min(done, Math.abs(st.pos)) : 0;
    if (reduce) st.real += reduce * (price - st.avg) * MULT * Math.sign(st.pos);
    var add = done - reduce, remaining = Math.abs(st.pos) - reduce;
    if (add) {
      var base = remaining > 0 ? st.avg : 0, baseQty = remaining;
      st.avg = (base * baseQty + price * add) / (baseQty + add);
    }
    st.pos = np; if (st.pos === 0) st.avg = 0;
    st.marks.push({ i: st.candles.length - 1, d: dir, p: price });
    st.trades++;
    var rows = $('d-fills');
    if (rows.querySelector('.empty')) rows.innerHTML = '';
    var tr = document.createElement('tr');
    tr.innerHTML = '<td>' + clock(st.t) + '</td><td class="' + (dir > 0 ? 'up' : 'dn') + '">' + (dir > 0 ? 'BUY' : 'SELL') + '</td><td>' + done + '</td><td>' + px(price) + '</td>';
    rows.insertBefore(tr, rows.firstChild);
    while (rows.children.length > 7) rows.removeChild(rows.lastChild);
    stats(); render();
  }
  function trade(dir) { if (st.run) fill(dir, qty); }
  function closeAll() { if (st.pos) fill(st.pos > 0 ? -1 : 1, Math.abs(st.pos)); }
  function flat() { if (st.run && st.pos) closeAll(); }

  function print(p, size, up) {
    var rows = $('d-tape'), tr = document.createElement('tr');
    tr.className = up ? 'up' : 'dn';
    tr.innerHTML = '<td>' + clock(st.t) + '</td><td>' + px(p) + '</td><td>' + size + '</td>';
    rows.insertBefore(tr, rows.firstChild);
    while (rows.children.length > 7) rows.removeChild(rows.lastChild);
  }

  function start() {
    reset(); st.run = true;
    $('d-over').classList.add('hide');
    ['d-buy', 'd-sell', 'd-flat'].forEach(function (id) { $(id).disabled = false; });
    st.timer = setInterval(step, TICK);
  }
  function end(title, extra) {
    clearInterval(st.timer); st.run = false;
    ['d-buy', 'd-sell', 'd-flat'].forEach(function (id) { $(id).disabled = true; });
    var hold = (st.last - st.open) * MULT, b = best();
    var record = st.trades > 0 && (isNaN(b) || st.real > b);
    if (record) saveBest(st.real);
    $('d-over-title').textContent = title + ' · P&L ' + money(st.real);
    $('d-over-text').textContent = (extra ? extra + ' ' : '') + (st.trades === 0 ? 'You sat it out. Flat is a position too.'
      : st.trades + ' fills. One contract held from the open would have made ' + money(hold) + '.' + (record ? ' New personal best.' : ''));
    $('d-start').textContent = 'Trade another session';
    $('d-over').classList.remove('hide');
    stats(); render();
  }

  function cls(e, v) { e.classList.toggle('up', v > 0); e.classList.toggle('dn', v < 0); }
  function stats() {
    var q = quote(), chg = st.last - st.open, o = openPnl(), tot = st.real + o, b = best();
    $('d-price').textContent = px(st.last);
    var c = $('d-chg'); c.textContent = (chg >= 0 ? '+' : '−') + px(Math.abs(chg)) + ' (' + (chg >= 0 ? '+' : '−') + Math.abs(chg / st.open * 100).toFixed(2) + '%)';
    c.className = 'chg ' + (chg >= 0 ? 'up' : 'dn');
    $('d-hi').textContent = px(st.hi); $('d-lo').textContent = px(st.lo);
    $('d-vol').textContent = st.vol.toLocaleString('en-US');
    $('d-time').textContent = ((LEN - st.t) * TICK / 1000).toFixed(1) + 's';
    $('d-bid').textContent = px(q.bid); $('d-ask').textContent = px(q.ask);
    var pos = $('d-pos'); pos.textContent = st.pos === 0 ? 'Flat' : (st.pos > 0 ? 'Long ' : 'Short ') + Math.abs(st.pos); cls(pos, st.pos);
    $('d-avg').textContent = st.pos ? px(st.avg) : '–';
    [['d-open', o], ['d-real', st.real], ['d-pnl', tot]].forEach(function (x) { var e = $(x[0]); e.textContent = money(x[1]); cls(e, x[1]); });
    $('d-best').textContent = isNaN(b) ? '–' : money(b);
    var used = Math.min(1, Math.max(0, -tot) / MARGIN);
    $('d-mbar').style.width = (used * 100) + '%';
    $('d-mbar').className = used > 0.7 ? 'hot' : '';
    $('d-mtext').textContent = money(Math.max(0, -tot)) + ' / $25,000';
    var n = $('d-news'); n.textContent = st.news; n.className = 'desk-news' + (st.news ? ' on' : '') + (st.news.charAt(0) === '▼' ? ' dn' : '');
    app.classList.toggle('storm', st.regime === 'storm' && st.run);
  }

  function ema(vals, n) { var k = 2 / (n + 1), out = [], e = vals[0]; vals.forEach(function (v) { e = v * k + e * (1 - k); out.push(e); }); return out; }

  function render() {
    var dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    var cs = st.candles, AX = 64, volH = h * 0.18, top = 12, bot = h - volH - 22;
    var slots = Math.max(cs.length, 110), cw = (w - AX - 8) / slots;
    var lo = Infinity, hi = -Infinity, vmax = 1;
    cs.forEach(function (c) { lo = Math.min(lo, c.l); hi = Math.max(hi, c.h); vmax = Math.max(vmax, c.v); });
    var pad = (hi - lo) * 0.08 || 1; lo -= pad; hi += pad;
    var Y = function (v) { return top + (bot - top) * (1 - (v - lo) / (hi - lo)); };
    var X = function (i) { return 4 + i * cw + cw / 2; };
    ctx.font = '11px Inter, system-ui, sans-serif'; ctx.textBaseline = 'middle';
    var stepP = [0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100].find(function (s) { return (hi - lo) / s <= 7; }) || 100;
    for (var g = Math.ceil(lo / stepP) * stepP; g <= hi; g += stepP) {
      var y = Y(g); ctx.strokeStyle = COL.grid; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w - AX, y); ctx.stroke();
      ctx.fillStyle = COL.axis; ctx.fillText(px(g), w - AX + 6, y);
    }
    for (var vt = 0; vt < slots; vt += 15) { var xg = X(vt); ctx.strokeStyle = COL.grid; ctx.beginPath(); ctx.moveTo(xg, top); ctx.lineTo(xg, h - 18); ctx.stroke(); }
    // volume
    cs.forEach(function (c, i) {
      var vh = (volH - 6) * c.v / vmax; ctx.fillStyle = c.c >= c.o ? 'rgba(38,166,154,.35)' : 'rgba(239,83,80,.35)';
      ctx.fillRect(X(i) - cw * 0.35, h - 20 - vh, cw * 0.7, vh);
    });
    // candles
    cs.forEach(function (c, i) {
      var up = c.c >= c.o, col = up ? COL.up : COL.dn, x = X(i);
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, Y(c.h)); ctx.lineTo(x, Y(c.l)); ctx.stroke();
      var y1 = Y(Math.max(c.o, c.c)), y2 = Y(Math.min(c.o, c.c));
      ctx.fillRect(x - Math.max(1, cw * 0.36), y1, Math.max(2, cw * 0.72), Math.max(1, y2 - y1));
    });
    // EMA 9
    var e = ema(cs.map(function (c) { return c.c; }), 9);
    ctx.strokeStyle = COL.ema; ctx.lineWidth = 1.4; ctx.beginPath();
    e.forEach(function (v, i) { i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v)); }); ctx.stroke();
    // entry line
    if (st.pos) {
      var ya = Y(st.avg); ctx.setLineDash([5, 4]); ctx.strokeStyle = st.pos > 0 ? COL.up : COL.dn; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, ya); ctx.lineTo(w - AX, ya); ctx.stroke(); ctx.setLineDash([]);
      tag(ya, (st.pos > 0 ? 'LONG ' : 'SHORT ') + Math.abs(st.pos) + ' @ ' + px(st.avg), st.pos > 0 ? COL.up : COL.dn, 8, 'left');
    }
    // fills
    st.marks.forEach(function (m) {
      if (m.i < 0) return;
      var x = X(m.i), y = Y(m.p); ctx.fillStyle = m.d > 0 ? COL.up : COL.dn; ctx.beginPath();
      if (m.d > 0) { ctx.moveTo(x, y + 4); ctx.lineTo(x - 5, y + 12); ctx.lineTo(x + 5, y + 12); }
      else { ctx.moveTo(x, y - 4); ctx.lineTo(x - 5, y - 12); ctx.lineTo(x + 5, y - 12); }
      ctx.fill();
    });
    // last price line and tag
    var last = cs[cs.length - 1], yl = Y(st.last), lc = last.c >= last.o ? COL.up : COL.dn;
    ctx.setLineDash([2, 3]); ctx.strokeStyle = lc; ctx.beginPath(); ctx.moveTo(0, yl); ctx.lineTo(w - AX, yl); ctx.stroke(); ctx.setLineDash([]);
    tag(yl, px(st.last), lc, w - AX + 2, 'right');
    ctx.fillStyle = COL.axis; ctx.fillText('EMA 9  ' + px(e[e.length - 1]), 8, top + 4);
    function tag(y, text, color, x, side) {
      ctx.font = '600 11px Inter, system-ui, sans-serif';
      var tw = ctx.measureText(text).width + 10;
      ctx.fillStyle = color; ctx.fillRect(side === 'right' ? x : x, y - 9, side === 'right' ? AX - 4 : tw, 18);
      ctx.fillStyle = '#fff'; ctx.fillText(text, x + 5, y + 0.5);
      ctx.font = '11px Inter, system-ui, sans-serif';
    }
  }

  function buildWatch() {
    var body = $('d-watch'); body.innerHTML = '';
    watch = WATCH.map(function (w) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td><b>' + w[0] + '</b><small>' + w[1] + '</small></td><td class="r"><span class="p"></span><span class="c"></span></td>';
      body.appendChild(tr);
      return { el: tr, p: w[2], o: w[2], s: w[3] };
    });
    var me = document.createElement('tr'); me.className = 'me';
    me.innerHTML = '<td><b>SNF Z6</b><small>Index futures</small></td><td class="r"><span class="p" id="d-wme"></span><span class="c" id="d-wmec"></span></td>';
    body.insertBefore(me, body.firstChild);
    moveWatch();
  }
  function moveWatch() {
    watch.forEach(function (w) {
      var old = w.p; w.p = w.p * Math.exp(w.s * gauss() * 1.6);
      var dec = w.p < 10 ? 4 : 2, chg = w.p / w.o - 1;
      var p = w.el.querySelector('.p'), c = w.el.querySelector('.c');
      p.textContent = w.p.toFixed(dec); c.textContent = (chg >= 0 ? '+' : '') + (chg * 100).toFixed(2) + '%';
      c.className = 'c ' + (chg >= 0 ? 'up' : 'dn');
      w.el.classList.remove('fl-up', 'fl-dn'); void w.el.offsetWidth; w.el.classList.add(w.p >= old ? 'fl-up' : 'fl-dn');
    });
    var me = $('d-wme'); if (me) { me.textContent = px(st.last); var ch = st.last / st.open - 1, mc = $('d-wmec'); mc.textContent = (ch >= 0 ? '+' : '') + (ch * 100).toFixed(2) + '%'; mc.className = 'c ' + (ch >= 0 ? 'up' : 'dn'); }
  }

  $('d-start').addEventListener('click', start);
  $('d-buy').addEventListener('click', function () { trade(1); });
  $('d-sell').addEventListener('click', function () { trade(-1); });
  $('d-flat').addEventListener('click', flat);
  app.querySelectorAll('.tx-qty button').forEach(function (b) {
    b.addEventListener('click', function () { qty = +b.dataset.q; app.querySelectorAll('.tx-qty button').forEach(function (x) { x.classList.toggle('on', x === b); }); });
  });
  document.addEventListener('keydown', function (e) {
    if (!st.run || /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    var k = e.key.toLowerCase();
    if (k === 'b') trade(1); else if (k === 's') trade(-1); else if (k === 'f') flat();
    else if (k === '1' || k === '2' || k === '3') { var q = app.querySelector('.tx-qty button[data-q="' + k + '"]'); if (q) q.click(); }
    else return;
    e.preventDefault();
  });
  window.addEventListener('resize', render);
  reset(); buildWatch();
  setInterval(function () { if (!st.run && !document.hidden) moveWatch(); }, 1500);
})();

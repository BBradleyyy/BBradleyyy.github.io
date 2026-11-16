/* The trading desk: a 60-second simulated index future. Volatility switches between calm and
   stormy regimes, headlines arrive as jumps, and the trend flips without warning. The visitor
   goes long or short up to three contracts; one point is worth $50. */
(function () {
  var app = document.getElementById('desk-app');
  if (!app) return;
  var $ = function (id) { return document.getElementById(id); };
  var cv = $('d-canvas'), ctx = cv.getContext('2d');
  var MULT = 50, MAXPOS = 3, TICK = 100, LEN = 600, MARGIN = -25000;
  var NEWS_UP = ['Fed signals a pause', 'Earnings beat across tech', 'Inflation cools more than expected',
    'Ceasefire talks advance', 'Jobs report lands in the sweet spot', 'Buyback wave announced'];
  var NEWS_DN = ['CPI comes in hot', 'Credit fund halts redemptions', 'Bond yields spike',
    'Guidance cut at a megacap', 'Oil jumps on supply shock', 'Liquidity dries up in futures'];
  var st;

  function fmt$(v) { var s = Math.round(Math.abs(v)).toLocaleString('en-US'); return (v < 0 ? '−$' : '$') + s; }
  function gauss() { var u = 1 - Math.random(), v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function best() { try { return parseFloat(localStorage.getItem('sn-desk-best')); } catch (e) { return NaN; } }
  function saveBest(v) { try { localStorage.setItem('sn-desk-best', String(v)); } catch (e) { /* storage off */ } }

  function reset() {
    st = { px: [5000], t: 0, pos: 0, avg: 0, real: 0, run: false, vol: 0.0012, regime: 'calm',
           drift: 0, marks: [], news: '', newsT: 0, timer: null, trades: 0 };
    render(); stats();
  }

  function step() {
    var p = st.px[st.px.length - 1];
    if (Math.random() < 0.02) {                       // regime change
      st.regime = st.regime === 'calm' ? 'storm' : 'calm';
      st.vol = st.regime === 'calm' ? 0.0010 + Math.random() * 0.0006 : 0.0028 + Math.random() * 0.0025;
    }
    if (Math.random() < 0.03) st.drift = (Math.random() - 0.5) * 0.0012;   // trend flips
    var r = st.drift + st.vol * gauss();
    if (Math.random() < 0.006) {                     // headline jump, fat tailed
      var up = Math.random() < 0.5, size = (0.006 + Math.random() * 0.018) * (up ? 1 : -1);
      r += size;
      st.news = (up ? '▲ ' : '▼ ') + (up ? NEWS_UP : NEWS_DN)[Math.floor(Math.random() * 6)];
      st.newsT = 30;
      st.vol = Math.max(st.vol, 0.003); st.regime = 'storm';
    }
    st.px.push(Math.max(100, p * Math.exp(r)));
    st.t++;
    if (st.newsT > 0 && --st.newsT === 0) st.news = '';
    var total = st.real + openPnl();
    if (total <= MARGIN) { closePos(); end('Margin call', 'The desk closed you out at ' + fmt$(st.real) + '. Volatility cuts both ways.'); return; }
    if (st.t >= LEN) { closePos(); end('Time', ''); return; }
    render(); stats();
  }

  function last() { return st.px[st.px.length - 1]; }
  function openPnl() { return st.pos ? st.pos * (last() - st.avg) * MULT : 0; }
  function trade(dir) {
    if (!st.run) return;
    var p = last(), np = Math.max(-MAXPOS, Math.min(MAXPOS, st.pos + dir));
    if (np === st.pos) return;
    if (st.pos === 0 || Math.sign(st.pos) === dir) {          // open or add
      st.avg = (st.avg * Math.abs(st.pos) + p) / (Math.abs(st.pos) + 1);
    } else {                                                   // reduce
      st.real += -dir * (p - st.avg) * MULT;
    }
    st.pos = np; if (st.pos === 0) st.avg = 0;
    st.marks.push({ i: st.px.length - 1, d: dir }); st.trades++;
    stats(); render();
  }
  function closePos() {
    if (!st.pos) return;
    st.real += st.pos * (last() - st.avg) * MULT;
    st.marks.push({ i: st.px.length - 1, d: -Math.sign(st.pos) });
    st.pos = 0; st.avg = 0;
  }
  function flat() { if (st.run && st.pos) { closePos(); st.trades++; stats(); render(); } }

  function start() {
    reset(); st.run = true;
    $('d-over').classList.add('hide');
    ['d-buy', 'd-sell', 'd-flat'].forEach(function (id) { $(id).disabled = false; });
    st.timer = setInterval(step, TICK);
  }
  function end(title, extra) {
    clearInterval(st.timer); st.run = false;
    ['d-buy', 'd-sell', 'd-flat'].forEach(function (id) { $(id).disabled = true; });
    var hold = (last() - st.px[0]) * MULT, b = best();
    var record = st.trades > 0 && (isNaN(b) || st.real > b);
    if (record) saveBest(st.real);
    $('d-over-title').textContent = (title === 'Time' ? 'Final P&L ' : title + ': ') + fmt$(st.real);
    $('d-over-text').textContent = (extra ? extra + ' ' : '') + (st.trades === 0 ? 'You sat it out. Flat is a position too.'
      : st.trades + ' trades. Holding one contract all round would have made ' + fmt$(hold) + '.' + (record ? ' New personal best.' : ''));
    $('d-start').textContent = 'Play again';
    $('d-over').classList.remove('hide');
    stats(); render();
  }

  function stats() {
    var p = last(), chg = p / st.px[0] - 1, o = openPnl(), tot = st.real + o, b = best();
    $('d-price').textContent = p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    var c = $('d-chg'); c.textContent = (chg >= 0 ? '+' : '') + (chg * 100).toFixed(2) + '%';
    c.className = 'chg ' + (chg >= 0 ? 'up' : 'dn');
    $('d-time').textContent = ((LEN - st.t) * TICK / 1000).toFixed(1);
    $('d-pos').textContent = st.pos === 0 ? 'Flat' : (st.pos > 0 ? 'Long ' : 'Short ') + Math.abs(st.pos) + (Math.abs(st.pos) > 1 ? ' contracts' : ' contract');
    $('d-pos').className = st.pos > 0 ? 'up' : (st.pos < 0 ? 'dn' : '');
    [['d-open', o], ['d-pnl', tot]].forEach(function (x) { var e = $(x[0]); e.textContent = fmt$(x[1]); e.className = x[1] > 0 ? 'up' : (x[1] < 0 ? 'dn' : ''); });
    $('d-best').textContent = isNaN(b) ? '–' : fmt$(b);
    var n = $('d-news'); n.textContent = st.news; n.className = 'desk-news' + (st.news ? ' on' : '') + (st.news.charAt(0) === '▼' ? ' dn' : '');
    app.classList.toggle('storm', st.regime === 'storm' && st.run);
  }

  function render() {
    var dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    var px = st.px, n = Math.max(LEN, px.length), lo = Infinity, hi = -Infinity;
    px.forEach(function (v) { lo = Math.min(lo, v); hi = Math.max(hi, v); });
    var pad = Math.max((hi - lo) * 0.15, px[0] * 0.004); lo -= pad; hi += pad;
    var X = function (i) { return 8 + (w - 70) * i / (n - 1); }, Y = function (v) { return 10 + (h - 20) * (1 - (v - lo) / (hi - lo)); };
    ctx.strokeStyle = 'rgba(157,184,230,.18)'; ctx.lineWidth = 1; ctx.fillStyle = 'rgba(220,230,247,.55)'; ctx.font = '11px Inter, system-ui, sans-serif';
    for (var g = 0; g <= 4; g++) {
      var v = lo + (hi - lo) * g / 4, y = Y(v);
      ctx.beginPath(); ctx.moveTo(8, y); ctx.lineTo(w - 62, y); ctx.stroke();
      ctx.fillText(v.toFixed(0), w - 56, y + 4);
    }
    if (st.avg && st.pos) {
      ctx.setLineDash([4, 4]); ctx.strokeStyle = st.pos > 0 ? 'rgba(52,211,153,.7)' : 'rgba(251,146,60,.8)';
      ctx.beginPath(); ctx.moveTo(8, Y(st.avg)); ctx.lineTo(w - 62, Y(st.avg)); ctx.stroke(); ctx.setLineDash([]);
    }
    var up = px[px.length - 1] >= px[0];
    var grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, up ? 'rgba(52,211,153,.28)' : 'rgba(251,146,60,.28)'); grad.addColorStop(1, 'rgba(11,42,111,0)');
    ctx.beginPath(); ctx.moveTo(X(0), Y(px[0]));
    for (var i = 1; i < px.length; i++) ctx.lineTo(X(i), Y(px[i]));
    ctx.strokeStyle = up ? '#34D399' : '#FB923C'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.lineTo(X(px.length - 1), h); ctx.lineTo(X(0), h); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
    st.marks.forEach(function (m) {
      var x = X(m.i), y = Y(px[m.i]);
      ctx.fillStyle = m.d > 0 ? '#34D399' : '#FB923C'; ctx.beginPath();
      if (m.d > 0) { ctx.moveTo(x, y + 6); ctx.lineTo(x - 5, y + 14); ctx.lineTo(x + 5, y + 14); }
      else { ctx.moveTo(x, y - 6); ctx.lineTo(x - 5, y - 14); ctx.lineTo(x + 5, y - 14); }
      ctx.fill();
    });
    var lx = X(px.length - 1), ly = Y(px[px.length - 1]);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(lx, ly, 3.5, 0, Math.PI * 2); ctx.fill();
  }

  $('d-start').addEventListener('click', start);
  $('d-buy').addEventListener('click', function () { trade(1); });
  $('d-sell').addEventListener('click', function () { trade(-1); });
  $('d-flat').addEventListener('click', flat);
  document.addEventListener('keydown', function (e) {
    if (!st.run || e.target.tagName === 'INPUT') return;
    var k = e.key.toLowerCase();
    if (k === 'b') trade(1); else if (k === 's') trade(-1); else if (k === 'f') flat(); else return;
    e.preventDefault();
  });
  window.addEventListener('resize', render);
  reset();
  // a preview tape behind the start panel, so it never looks empty
  for (var k = 0; k < 240; k++) st.px.push(st.px[st.px.length - 1] * Math.exp(0.0016 * gauss()));
  render();
})();

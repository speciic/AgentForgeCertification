(function () {
  'use strict';

  var PEOPLE = window.AF_PARTICIPANTS || [];
  var DEPTS = {
    CSE: 'Computer Science & Engineering',
    CSM: 'CSE (AI & ML)',
    CSD: 'CSE (Data Science)',
    ECE: 'Electronics & Communication Engg.',
    CSC: 'CSE (Cyber Security)'
  };
  var YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- nav ---------- */
  var nav = document.querySelector('.nav');
  var toggle = document.querySelector('.nav__toggle');
  toggle.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });
  nav.querySelectorAll('.nav__links a').forEach(function (a) {
    a.addEventListener('click', function () { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); });
  });

  /* ---------- starfield ---------- */
  (function stars() {
    var c = $('stars'); if (!c) return;
    var ctx = c.getContext('2d');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var pts = [];
    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = innerWidth * dpr; c.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(innerWidth * innerHeight / 9000);
      pts = [];
      for (var i = 0; i < n; i++) pts.push({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, r: Math.random() * 1.3 + .2, p: Math.random() * 6.28, s: Math.random() * .02 + .005 });
    }
    function draw() {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (var i = 0; i < pts.length; i++) {
        var s = pts[i]; s.p += s.s;
        ctx.globalAlpha = .35 + Math.sin(s.p) * .3;
        ctx.fillStyle = i % 7 === 0 ? '#ff7be0' : i % 5 === 0 ? '#7fd8ff' : '#ffffff';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
      }
      if (!reduce) requestAnimationFrame(draw);
    }
    size(); draw();
    var t; addEventListener('resize', function () { clearTimeout(t); t = setTimeout(function () { size(); if (reduce) draw(); }, 150); });
  })();

  /* ---------- cohort chart (built from the data) ---------- */
  (function cohort() {
    var counts = {};
    PEOPLE.forEach(function (p) {
      counts[p.d] = counts[p.d] || [0, 0, 0, 0];
      counts[p.d][p.y - 1]++;
    });
    var order = Object.keys(counts).sort(function (a, b) { return sum(counts[b]) - sum(counts[a]); });
    var max = Math.max.apply(null, order.map(function (k) { return sum(counts[k]); }));
    function sum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }

    var html = order.map(function (k) {
      var c = counts[k], t = sum(c);
      var segs = c.map(function (v, i) {
        return v ? '<i class="y' + (i + 1) + '" data-w="' + (v / max * 100) + '" title="' + YEARS[i] + ': ' + v + '"></i>' : '';
      }).join('');
      return '<div class="bar-row"><div class="bar-row__label"><strong>' + k + '</strong><span>' + (DEPTS[k] || '') + '</span></div>' +
        '<div class="bar">' + segs + '</div><div class="bar-row__total">' + t + '</div></div>';
    }).join('');
    $('deptChart').innerHTML = html;

    var totals = [0, 0, 0, 0];
    PEOPLE.forEach(function (p) { totals[p.y - 1]++; });
    $('yearLegend').innerHTML = YEARS.map(function (y, i) {
      return '<span><i class="y' + (i + 1) + '"></i>' + y + ' · ' + totals[i] + '</span>';
    }).join('');

    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.querySelectorAll('.bar i').forEach(function (i) { i.style.width = i.dataset.w + '%'; });
        io.disconnect();
      });
    }, { threshold: .3 });
    io.observe($('deptChart'));
  })();

  /* ---------- reveal on scroll ---------- */
  (function reveal() {
    var els = document.querySelectorAll('.section__head, .about, .day, .cohort, .stat, .affil, .search');
    els.forEach(function (el) { el.classList.add('reveal'); });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: .12 });
    els.forEach(function (el) { io.observe(el); });
  })();

  /* ---------- certificate portal ---------- */
  // Lookup by roll number, email, or name (forgiving: partial, any order, dots/initials, small typos).
  function norm(s) {
    return String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function lev(a, b) {
    if (a === b) return 0;
    if (Math.abs(a.length - b.length) > 2) return 3;
    var prev = [], cur, i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur = [i];
      for (j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[b.length];
  }

  var byRoll = {}, byEmail = {};
  PEOPLE.forEach(function (p) {
    byRoll[p.r] = p;
    if (p.e) (byEmail[p.e] = byEmail[p.e] || []).push(p);
    p._tokens = norm(p.n).split(' ').filter(Boolean);
    p._compact = p._tokens.join('');
  });

  // Score how well a name query matches a participant (0 = no match, higher = better).
  function nameScore(p, q) {
    var qn = norm(q);
    if (!qn) return 0;
    var qc = qn.replace(/ /g, '');
    if (qc === p._compact) return 100;                         // exact (ignoring spaces/dots/case)
    var qt = qn.split(' ');
    var used = [], total = 0;
    for (var i = 0; i < qt.length; i++) {
      var t = qt[i], best = 0, bestIdx = -1;
      for (var j = 0; j < p._tokens.length; j++) {
        if (used[j]) continue;
        var nt = p._tokens[j], s = 0;
        if (nt === t) s = 10;
        else if (t.length >= 2 && nt.indexOf(t) === 0) s = 7;   // prefix: "sai" → "saiteja"
        else if (t.length === 1 && nt[0] === t) s = 4;          // initial: "g" → "gopagani"
        else if (t.length >= 4 && nt.length >= 4 && lev(t, nt) <= (t.length >= 6 ? 2 : 1)) s = 5; // typo
        if (s > best) { best = s; bestIdx = j; }
      }
      if (!best) {
        // token may span a missing space, e.g. "nithyasree" vs "nithya sree"
        if (t.length >= 4 && p._compact.indexOf(t) > -1) { total += 6; continue; }
        return 0;
      }
      used[bestIdx] = true;
      total += best;
    }
    if (qc.length >= 4 && p._compact.indexOf(qc) > -1) total += 3;
    return total;
  }

  function searchNames(q) {
    var hits = [];
    PEOPLE.forEach(function (p) {
      var s = nameScore(p, q);
      if (s) hits.push({ p: p, s: s });
    });
    hits.sort(function (a, b) { return b.s - a.s || a.p.n.localeCompare(b.p.n); });
    return hits;
  }

  var form = $('searchForm'), input = $('q'), msg = $('searchMsg');
  var picks = $('picks');
  var result = $('result'), canvas = $('certCanvas'), loading = $('previewLoading');
  var btnPng = $('dlPng'), btnPdf = $('dlPdf');
  var current = null;
  var typeTimer;

  // Warm the template cache once the visitor heads toward the portal
  var warmed = false;
  function warm() { if (!warmed) { warmed = true; window.AFCert.preload().catch(function () {}); } }
  input.addEventListener('focus', warm);
  new IntersectionObserver(function (es) { if (es[0].isIntersecting) warm(); }).observe(form);

  function maskEmail(e) {
    if (!e) return '—';
    var at = e.indexOf('@');
    var u = e.slice(0, at);
    return (u.length <= 3 ? u[0] + '••' : u.slice(0, 3) + '•'.repeat(Math.min(6, u.length - 3))) + e.slice(at);
  }
  function maskRoll(r) { return r.slice(0, 6) + '••' + r.slice(-2); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function setMsg(text, err) {
    msg.textContent = text;
    msg.classList.toggle('err', !!err);
  }

  function isRollLike(q) { return /^\d{2}[a-z]{2}\d[a-z]\w{4}$/i.test(q.replace(/[\s\-]/g, '')); }

  function find(q) {
    q = q.trim();
    if (!q) return { err: 'Enter your name, roll number or registered email.' };
    if (q.indexOf('@') > -1) {
      var hits = byEmail[q.toLowerCase()];
      if (!hits) return { err: 'No participant found with that email. Try your name or roll number instead.' };
      return { p: hits[0] };
    }
    var roll = q.toUpperCase().replace(/[\s\-]/g, '');
    if (byRoll[roll]) return { p: byRoll[roll] };
    if (isRollLike(q)) return { err: 'No participant found with roll number ' + roll + '. Check it, or search by your name.' };

    var res = searchNames(q);
    if (!res.length) return { err: 'No participant found with the name “' + q + '”. Try just your first name, or use your roll number.' };
    var top = res[0];
    var exact = res.filter(function (h) { return h.s === 100; });
    if (exact.length === 1) return { p: exact[0].p };
    if (res.length === 1) return { p: top.p };
    return { list: (exact.length > 1 ? exact : res).slice(0, 8).map(function (h) { return h.p; }), more: res.length > 8 };
  }

  function renderPicks(list, more) {
    picks.innerHTML = list.map(function (p, i) {
      return '<li><button type="button" class="pick" data-i="' + i + '">' +
        '<span class="pick__name">' + esc(window.AFCert.displayName(p.n)) + '</span>' +
        '<span class="pick__meta">' + esc(p.d) + ' · ' + esc(YEARS[p.y - 1] || '') + ' · <code>' + esc(maskRoll(p.r)) + '</code></span>' +
        '<span class="pick__go" aria-hidden="true">→</span></button></li>';
    }).join('') + (more ? '<li class="pick__more">More matches — type your full name to narrow it down.</li>' : '');
    picks._list = list;
    picks.hidden = false;
  }
  function clearPicks() { picks.hidden = true; picks.innerHTML = ''; picks._list = null; }

  picks.addEventListener('click', function (e) {
    var b = e.target.closest('.pick');
    if (b && picks._list) show(picks._list[+b.dataset.i]);
  });

  function show(p) {
    current = p;
    clearPicks();
    $('rName').textContent = window.AFCert.displayName(p.n);
    $('rRoll').textContent = p.r;
    $('rDept').textContent = p.d + ' · ' + (DEPTS[p.d] || '');
    $('rYear').textContent = YEARS[p.y - 1] || '';
    $('rEmail').textContent = maskEmail(p.e);
    result.hidden = false;
    form.hidden = true;
    setMsg('');
    btnPng.disabled = btnPdf.disabled = true;
    loading.hidden = false;
    loading.innerHTML = '<span class="spinner"></span>Forging your certificate…';
    window.AFCert.render(canvas, p.n).then(function () {
      loading.hidden = true;
      btnPng.disabled = btnPdf.disabled = false;
    }).catch(function (e) {
      loading.innerHTML = 'Could not load the certificate template. Please refresh and try again.';
      console.error(e);
    });
    result.scrollIntoView({ behavior: 'smooth', block: 'start' });
    try { history.replaceState(null, '', '#certificate'); } catch (e) {}
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearTimeout(typeTimer);
    var r = find(input.value);
    if (r.err) { clearPicks(); setMsg(r.err, true); input.focus(); return; }
    if (r.list) {
      setMsg(r.list.length + (r.more ? '+' : '') + ' participants match “' + input.value.trim() + '” — pick yours:');
      renderPicks(r.list, r.more);
      return;
    }
    show(r.p);
  });

  // Live suggestions while typing a name
  input.addEventListener('input', function () {
    clearTimeout(typeTimer);
    typeTimer = setTimeout(function () {
      var q = input.value.trim();
      if (q.length < 3 || q.indexOf('@') > -1 || /\d/.test(q)) { clearPicks(); setMsg(''); return; }
      var res = searchNames(q);
      if (!res.length) { clearPicks(); setMsg(''); return; }
      setMsg('Is this you? Select your name, or press Enter.');
      renderPicks(res.slice(0, 6).map(function (h) { return h.p; }), res.length > 6);
    }, 180);
  });

  $('resetBtn').addEventListener('click', function () {
    result.hidden = true; form.hidden = false; current = null;
    input.value = ''; input.focus(); setMsg(''); clearPicks();
  });

  function busy(btn, fn) {
    if (!current) return;
    var label = btn.textContent;
    btn.disabled = true; btn.textContent = 'Preparing…';
    fn(canvas, current).finally(function () { btn.disabled = false; btn.textContent = label; });
  }
  btnPng.addEventListener('click', function () { busy(btnPng, window.AFCert.downloadPNG); });
  btnPdf.addEventListener('click', function () { busy(btnPdf, window.AFCert.downloadPDF); });
})();

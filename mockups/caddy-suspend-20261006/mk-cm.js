/* MOCKUP harness — Caddy Master side of "suspend a caddy from bookings" (Pete 2026-10-06).
   DOM-only, injected into the LIVE Caddy Master dashboard (PIN, Burapha A+C). Nothing is written anywhere.
   Uses the live .cbk-* / .cws-* / .mgc classes; #124 / #187 / #194 are number-only roster caddies. */
window.MKCM = (function () {
  var MS = function (n, s) { return '<span class="material-symbols-outlined"' + (s ? ' style="' + s + '"' : '') + '>' + n + '</span>'; };
  var RED = '#dc2626', AMB = '#d97706';
  function css() {
    if (document.getElementById('mk-sus-css')) return;
    var s = document.createElement('style'); s.id = 'mk-sus-css';
    s.textContent =
      '.sus-kp{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:12px 0 4px}' +
      '.sus-kp>div{background:#151d2b;border:1px solid rgba(148,163,184,.2);border-radius:14px;padding:10px 12px}' +
      '.sus-kp b{display:block;font-size:22px;font-weight:800;color:#fff;line-height:1.1}' +
      '.sus-kp span{font-size:11px;font-weight:700;color:#94a3b8}' +
      '.sus-card{background:#151d2b;border:1px solid rgba(248,113,113,.45);border-radius:14px;padding:12px;margin-bottom:8px;color:#e2e8f0}' +
      '.sus-card.later{border-color:rgba(251,191,36,.45)}' +
      '.sus-card.past{border-color:rgba(148,163,184,.2);opacity:.8}' +
      '.sus-top{display:flex;gap:10px;align-items:center}' +
      '.sus-top .w{flex:1;min-width:0}' +
      '.sus-top .w b{display:block;font-size:15px;font-weight:800;color:#fff}' +
      '.sus-top .w small{display:block;font-size:12px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.sus-pill{flex:none;font-size:11px;font-weight:800;padding:3px 10px;border-radius:999px;color:#fff;white-space:nowrap}' +
      '.sus-prog{height:6px;border-radius:3px;background:#1e293b;margin:10px 0 6px;overflow:hidden}' +
      '.sus-prog i{display:block;height:100%;background:#dc2626;border-radius:3px}' +
      '.sus-meta{display:flex;justify-content:space-between;gap:8px;font-size:12px;color:#94a3b8}' +
      '.sus-meta b{color:#fff;font-weight:700}' +
      '.sus-why{font-size:13px;color:#e2e8f0;margin-top:8px;line-height:1.35}' +
      '.sus-why small{color:#94a3b8}' +
      '.sus-acts{display:flex;gap:8px;margin-top:10px}' +
      '.sus-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}' +
      '.sus-chip{height:38px;padding:0 13px;border-radius:999px;border:1px solid rgba(148,163,184,.3);background:#151d2b;color:#e2e8f0;font-size:13px;font-weight:700;display:inline-flex;align-items:center}' +
      '.sus-chip.on{background:#dc2626;border-color:#dc2626;color:#fff}' +
      '.sus-lbl{font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#94a3b8;margin:14px 0 2px}' +
      '.sus-box{border-radius:12px;padding:10px 12px;border:1px solid rgba(248,113,113,.45);background:rgba(248,113,113,.1);margin-top:10px}' +
      '.sus-box b{display:block;font-size:14px;color:#fff}' +
      '.sus-box small{display:block;font-size:12px;color:#cbd5e1;line-height:1.35;margin-top:2px}' +
      '.sus-box.amber{border-color:rgba(251,191,36,.45);background:rgba(251,191,36,.1)}' +
      '.sus-tg{display:flex;align-items:center;gap:10px;font-size:13px;font-weight:700;color:#e2e8f0;margin-top:10px}' +
      '.sus-tg i{flex:none;width:38px;height:22px;border-radius:11px;background:#16a34a;position:relative}' +
      '.sus-tg i:after{content:"";position:absolute;right:2px;top:2px;width:18px;height:18px;border-radius:50%;background:#fff}' +
      '.cbk-primary.sus-red{background:#dc2626}' +
      '.cbk-tile.sus .cbk-media img,.cbk-tile.sus .cbk-numtile{filter:grayscale(1) brightness(.5)}' +
      '.cbk-tile.sus{border-color:rgba(248,113,113,.6)}' +
      '.sus-over{position:absolute;left:0;right:0;bottom:0;padding:5px 4px;background:rgba(220,38,38,.92);color:#fff;font-size:10.5px;font-weight:800;text-align:center;line-height:1.2;z-index:3}';
    document.head.appendChild(s);
  }
  var numTile = function (n) { return '<span class="cws-ini"><span style="display:flex;flex-direction:column;align-items:center;line-height:1"><span class="material-symbols-outlined" style="font-size:13px;color:#4ade80">sports_golf</span><b style="font-size:13px">' + n + '</b></span></span>'; };

  return {
    /* 1 — Home: a Control cube */
    cube: function () {
      css();
      var g = document.querySelector('#cmCubeHome .mgc-grid'), room = g.querySelector('[onclick*="\'room\'"]');
      if (g.querySelector('.mk-ctl')) return;
      var b = document.createElement('button'); b.className = 'mgc mk-ctl'; b.setAttribute('style', '--p1:#f3dada;--p2:#fdf2f2');
      b.innerHTML = '<div class="t">Control</div><div class="chip">Suspensions</div><div class="cube-art" aria-hidden="true"><svg viewBox="0 0 96 96"><use href="#cuGear"/></svg></div><span class="badge" style="display:flex">1</span>';
      room.parentNode.insertBefore(b, room.nextSibling);
    },
    /* 2 — the Control tab */
    control: function () {
      css();
      var r = document.getElementById('cmxRoot');
      document.querySelectorAll('#cmDock .mdk').forEach(function (b) { b.classList.toggle('active', b.id === 'cmDockMore'); });
      r.innerHTML = '<div class="cbk-page cws">' +
        '<div class="cbk-top"><div style="flex:1;min-width:0"><h2 class="cbk-h1">Control</h2></div></div>' +
        '<div style="font-size:13px;color:#94a3b8;margin:-4px 0 10px">A suspended caddy cannot be booked by anyone — pro shop, golfers or the rotation — until the time you set.</div>' +
        '<button type="button" class="cbk-primary sus-red">' + MS('block') + '<span>Suspend a caddy</span></button>' +
        '<div class="sus-kp"><div><b>1</b><span>Suspended now</span></div><div><b>1</b><span>Starts later</span></div><div><b>2</b><span>Ended · 30 days</span></div></div>' +

        '<div class="cws-h" style="margin-top:12px">Suspended now</div>' +
        '<div class="sus-card"><div class="sus-top">' + numTile(124) + '<div class="w"><b>#124</b><small>Burapha Golf Club · no bookings</small></div><span class="sus-pill" style="background:' + RED + '">Suspended</span></div>' +
        '<div class="sus-prog"><i style="width:3%"></i></div>' +
        '<div class="sus-meta"><span>From <b>Tue 6 Oct · 06:52</b></span><span>Until <b>Tue 13 Oct · 06:52</b></span></div>' +
        '<div class="sus-meta" style="margin-top:3px"><span>1 week</span><span><b>6 days 23 h left</b></span></div>' +
        '<div class="sus-why">Late to the bag drop twice this week<small> · set by Caddy Master, today 06:52</small></div>' +
        '<div class="sus-acts"><button type="button" class="cws-b2">' + MS('edit') + 'Change time</button><button type="button" class="cws-b2 go">' + MS('lock_open') + 'Lift now</button></div></div>' +

        '<div class="cws-h" style="margin-top:12px">Starts later</div>' +
        '<div class="sus-card later"><div class="sus-top">' + numTile(187) + '<div class="w"><b>#187</b><small>Burapha Golf Club · bookable until it starts</small></div><span class="sus-pill" style="background:' + AMB + '">From Sat 10 Oct</span></div>' +
        '<div class="sus-meta" style="margin-top:10px"><span>From <b>Sat 10 Oct · 12:00</b></span><span>Until <b>Sat 10 Oct · 18:00</b></span></div>' +
        '<div class="sus-meta" style="margin-top:3px"><span>6 hours</span><span><b>1 booking inside it</b></span></div>' +
        '<div class="sus-why">Afternoon off the sheet — training<small> · set by Caddy Master, today 06:40</small></div>' +
        '<div class="sus-acts"><button type="button" class="cws-b2">' + MS('edit') + 'Change time</button><button type="button" class="cws-b2 red">Remove</button></div></div>' +

        '<div class="cws-h" style="margin-top:12px">Ended<small>last 30 days</small></div>' +
        '<div class="cws-job">' + numTile(194) + '<div class="cws-jb" style="flex:1;min-width:0"><div class="cws-jn"><span class="nm">#194 · 3 days</span></div><div class="cws-jm">22 – 25 Sept · ran its full time</div></div>' + MS('chevron_right', 'color:#94a3b8;flex:none') + '</div>' +
        '<div class="cws-job">' + numTile(316) + '<div class="cws-jb" style="flex:1;min-width:0"><div class="cws-jn"><span class="nm">#316 · 2 weeks</span></div><div class="cws-jm">1 – 9 Sept · lifted early by Caddy Master</div></div>' + MS('chevron_right', 'color:#94a3b8;flex:none') + '</div>' +
        '</div>';
      (document.getElementById('caddyMasterDashboard').querySelector('.mhvMain,.screen-body') || document.scrollingElement).scrollTop = 0;
    },
    /* 3 — the Suspend sheet */
    sheet: function () {
      css();
      var w = document.createElement('div'); w.id = 'mkSusSheet'; w.className = 'cbk-sheet-wrap cws-wrap';
      var chip = function (t, on) { return '<span class="sus-chip' + (on ? ' on' : '') + '">' + t + '</span>'; };
      w.innerHTML = '<div class="cbk-sheet" role="dialog"><button type="button" class="cbk-x" aria-label="Close">' + MS('close') + '</button>' +
        '<div class="cbk-who"><div class="cbk-who-av"><span class="cbk-numtile">' + MS('sports_golf') + '<b>124</b></span></div><div class="cbk-who-body"><div class="cbk-who-name"><span class="cbk-num">#124</span><b></b></div><div class="cbk-who-course">Burapha Golf Club</div><div style="display:flex;gap:6px;flex-wrap:wrap"><span class="cbk-badge-lg" style="background:#16a34a">Free now</span></div></div></div>' +
        '<div class="sus-lbl">Suspend from bookings for</div>' +
        '<div class="sus-chips">' + chip('4 hours') + chip('Rest of today') + chip('1 day') + chip('3 days') + chip('1 week', 1) + chip('2 weeks') + chip('1 month') + chip('3 months') + chip('Set dates…') + '</div>' +
        '<div class="cbk-when" style="margin-top:10px"><label class="cbk-field"><span>From</span><input type="text" value="Now · 06:52" readonly></label><label class="cbk-field"><span>Until</span><input type="text" value="Tue 13 Oct · 06:52" readonly></label></div>' +
        '<div class="sus-lbl">Reason — staff only</div>' +
        '<div class="sus-chips">' + chip('Late / no show', 1) + chip('Conduct') + chip('Golfer complaint') + chip('Training') + chip('Other') + '</div>' +
        '<input class="cbk-in" style="margin-top:8px" value="Late to the bag drop twice this week" readonly>' +
        '<div class="sus-box"><b>2 bookings fall inside this time</b><small>Wed 7 Oct 08:10 · golfer on the tee sheet<br>Sat 10 Oct 09:30 · society day</small><small style="margin-top:6px;color:#fff;font-weight:700">They go back to "needs a caddy" for you to re-assign. The golfers are told their caddy changed.</small></div>' +
        '<div class="sus-tg" style="padding-left:46px"><i></i><span>Tell her on LINE and on her dashboard</span></div>' +
        '<button type="button" class="cbk-primary sus-red" style="margin-top:14px">' + MS('block') + '<span>Suspend #124 until Tue 13 Oct</span></button>' +
        '</div>';
      document.body.appendChild(w); w.classList.add('show', 'on', 'open'); w.style.display = 'flex';
    },
    /* 4 — the roster grid: the suspended tile */
    tiles: function () {
      css();
      var t = [].filter.call(document.querySelectorAll('#cmxGrid .cbk-tile'), function (x) { return /#124/.test(x.textContent); })[0]; if (!t) return 'no tile';
      t.classList.add('sus');
      var bd = t.querySelector('.cbk-badge'); bd.textContent = 'Suspended'; bd.style.background = RED;
      var q = t.querySelector('.cws-rot'); if (q) q.remove();
      var m = t.querySelector('.cbk-media'); m.style.position = 'relative';
      var o = document.createElement('span'); o.className = 'sus-over'; o.textContent = 'until Tue 13 Oct'; o.style.filter = 'none'; t.style.position = 'relative'; t.insertBefore(o, t.querySelector('.cbk-tile-body')); o.style.position = 'static'; o.style.display = 'block';
      // rotation closes up behind her
      var k = 2; [].forEach.call(document.querySelectorAll('#cmxGrid .cbk-tile'), function (x) { if (x === t) return; var r = x.querySelector('.cws-rot'); if (r && +r.textContent.slice(1) > 1) r.textContent = 'Q' + (k++); });
      var c = document.getElementById('cmxCount'); if (c) c.innerHTML = c.innerHTML.replace('9 free now', '8 free now').replace('9 of 9 working', '8 of 9 working · 1 suspended');
    },
    /* 5 — her card in the caddy master's sheet */
    card: function () {
      css();
      var s = document.getElementById('cwsCmSheet'); if (!s) return 'no sheet';
      var b = s.querySelector('.cbk-badge-lg'); b.textContent = 'Suspended'; b.style.background = RED;
      var wl = s.querySelector('.cbk-whenline'); wl.className = 'cbk-whenline booked';
      wl.innerHTML = '<b>No bookings until Tue 13 Oct · 06:52</b><small>Suspended today 06:52 by Caddy Master · 6 days 23 h left<br>Late to the bag drop twice this week</small>';
      var p = s.querySelector('.cbk-primary'); p.className = 'cbk-primary'; p.innerHTML = MS('lock_open') + '<span>Lift suspension now</span>';
      var x = document.createElement('div'); x.className = 'cws-btns'; x.style.marginTop = '8px'; x.innerHTML = '<button type="button" class="cws-b2">' + MS('edit') + 'Change time</button><button type="button" class="cws-b2" disabled>' + MS('assignment_ind') + 'Give her a job</button>';
      p.parentNode.insertBefore(x, p.nextSibling);
      [].forEach.call(s.querySelectorAll('.cbk-day'), function (d, i) { if (i < 7) { d.className = 'cbk-day full'; d.style.opacity = '.6'; } });
      var bar = s.querySelector('.cbk-bar-free'); if (bar) { bar.style.background = '#dc2626'; bar.style.left = '0'; bar.style.width = '100%'; }
      var sl = s.querySelector('.cbk-slots'); if (sl) sl.innerHTML = '<span class="cbk-slots-h" style="color:#fca5a5">Suspended all day — nothing to start</span>';
    }
  };
})();

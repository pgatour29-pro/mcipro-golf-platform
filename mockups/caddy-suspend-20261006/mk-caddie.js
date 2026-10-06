/* MOCKUP harness — the caddie's own dashboard while suspended (PIN demo caddie #27, live site, DOM only). */
window.MKCD = {
  schedule: function () {
    var r = document.getElementById('cwsCaddyRoot'); if (!r) return 'no root';
    var wl = r.querySelector('.cbk-whenline'); wl.className = 'cbk-whenline booked';
    wl.innerHTML = '<b style="display:flex;align-items:center;gap:6px"><span class="material-symbols-outlined" style="font-size:18px;color:#f87171">block</span>No new bookings until Tue 13 Oct · 06:52</b><small>The caddy master has taken you off bookings for 1 week · 6 days 23 h left.<br>Pro shop, golfers and the rotation cannot book you until then.</small>';
    [].forEach.call(r.querySelectorAll('.cbk-day'), function (d, i) { if (i < 7) { d.className = 'cbk-day full' + (i === 0 ? ' on' : ''); d.querySelector('i').style.background = '#ef4444'; } });
    var bar = r.querySelector('.cbk-bar'); if (bar) { [].forEach.call(bar.querySelectorAll('span:not(.cbk-bar-l):not(.cbk-bar-r):not(.cws-now)'), function (s, i) { if (i === 0) { s.style.left = '0'; s.style.width = '100%'; s.style.background = '#dc2626'; } else s.remove(); }); }
    var note = [].filter.call(r.querySelectorAll('div,span'), function (e) { return e.children.length === 0 && /Fully booked/.test(e.textContent); })[0];
    if (note) note.textContent = 'Off bookings — golfers see "Not available until Tue 13 Oct"';
    var jobs = r.querySelectorAll('.cws-job');
    if (jobs[1]) { jobs[1].style.opacity = '.55'; var st = jobs[1].querySelector('.cws-st'); if (st) { st.textContent = 'MOVED'; st.style.background = 'rgba(148,163,184,.2)'; st.style.color = '#cbd5e1'; st.style.borderColor = 'transparent'; } var jm = jobs[1].querySelector('.cws-jm'); if (jm) jm.textContent = 'Given to another caddy by the caddy master'; }
    var h = [].filter.call(r.querySelectorAll('.cws-h'), function (e) { return /Today/i.test(e.textContent); })[0];
    if (h) h.innerHTML = 'Today · finish your round<small>then off until Tue 13 Oct</small>';
    var b = [].filter.call(r.querySelectorAll('button'), function (e) { return /Request a day off/.test(e.textContent); })[0]; if (b) { b.disabled = true; b.style.opacity = '.45'; }
    return 'ok';
  },
  overview: function () {
    var chip = document.getElementById('caddie-status-chip'); chip.textContent = 'SUSPENDED'; chip.style.background = '#dc2626'; chip.style.color = '#fff';
    var card = document.getElementById('caddie-rotation-card');
    var x = document.createElement('div'); x.id = 'mkSusCard'; x.className = 'rounded-xl p-4 mb-4';
    x.setAttribute('style', 'background:#fef2f2;border:1px solid rgba(220,38,38,.45);box-shadow:0 1px 3px rgba(0,0,0,.04)');
    x.innerHTML = '<div class="flex items-center justify-between mb-1"><h4 class="font-semibold text-sm" style="color:#7f1d1d;display:flex;align-items:center;gap:6px"><span class="material-symbols-outlined" style="font-size:18px;color:#dc2626">block</span>Off bookings</h4><span class="px-2 py-0.5 rounded-full text-[10px] font-semibold" style="background:#dc2626;color:#fff">UNTIL TUE 13 OCT · 06:52</span></div>' +
      '<div class="text-sm" style="color:#7f1d1d;font-weight:600">The caddy master has taken you off bookings for 1 week.</div>' +
      '<div class="text-sm" style="color:#991b1b;margin-top:2px">6 days 23 h left · you cannot be booked by the pro shop, golfers or the rotation until then. Finish the round you are on.</div>' +
      '<button class="mt-3 px-3 py-2 rounded-lg text-xs font-semibold" style="background:#fff;border:1px solid rgba(220,38,38,.4);color:#991b1b">Ask the caddy master</button>';
    card.parentNode.insertBefore(x, card);
    var pill = document.getElementById('caddie-rot-pill'); pill.innerHTML = '<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold" style="background:#fee2e2;color:#991b1b">OUT OF ROTATION</span>';
    document.getElementById('caddie-rotation-body').textContent = 'You are not in the rotation while off bookings. You rejoin it on Tue 13 Oct.';
    var b = card.querySelector('button'); if (b) { b.disabled = true; b.style.opacity = '.45'; }
    return 'ok';
  }
};

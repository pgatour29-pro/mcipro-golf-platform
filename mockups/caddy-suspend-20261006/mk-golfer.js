/* MOCKUP harness — golfer Book a Caddy (live, Bangpakong, signed in as Pete, DOM only, nothing booked).
   Golfer wording never says "suspended" and never shows the reason. */
window.MKG = {
  tile: function () {
    var g = document.getElementById('caddiesGrid');
    var t = [].filter.call(g.children, function (x) { var n = x.querySelector('.cbk-num'); return n && n.textContent.trim() === '#14'; })[0]; if (!t) return 'no tile';
    t.classList.add('off'); t.style.opacity = '1';
    t.querySelector('.cbk-numtile').style.filter = 'grayscale(1) brightness(.55)';
    var b = t.querySelector('.cbk-badge'); b.className = 'cbk-badge'; b.style.background = '#475569'; b.textContent = 'Not available';
    t.querySelector('.cbk-name').innerHTML = '<span style="color:#fca5a5;font-size:11px;font-weight:700">until 13 Oct</span>';
    var c = document.getElementById('caddyCount'); if (c) c.textContent = '12 caddies · 2 yours · 1 not available';
    var sc = document.getElementById('mainContent'); t.scrollIntoView({ block: 'center' });
    return 'ok';
  },
  sheet: function () {
    var m = document.getElementById('caddyBookingModal'); if (!m) return 'no sheet';
    var b = m.querySelector('.cbk-badge-lg'); b.className = 'cbk-badge-lg'; b.style.background = '#475569'; b.textContent = 'Not available';
    var wl = m.querySelector('#cbkWhenLine') || m.querySelector('.cbk-whenline'); wl.className = 'cbk-whenline booked';
    wl.innerHTML = '<b>Not taking bookings until Tue 13 Oct</b><small>The course has taken this caddy off bookings for now. Pick another caddy for your round, or book her for Tue 13 Oct or later.</small>';
    var p = [].filter.call(m.querySelectorAll('.cbk-primary'), function (x) { return x.offsetParent; }).pop();
    if (p) { p.disabled = true; p.innerHTML = '<span class="material-symbols-outlined">event_busy</span><span>Bookable from Tue 13 Oct</span>'; p.style.background = '#334155'; p.style.opacity = '1';
      var a = document.createElement('button'); a.type = 'button'; a.className = 'cbk-primary'; a.style.marginTop = '8px'; a.innerHTML = '<span class="material-symbols-outlined">groups</span><span>See caddies free on Tue 6 Oct</span>'; p.parentNode.insertBefore(a, p.nextSibling); }
    return 'ok ' + !!p;
  }
};
MKG.sched = function () {
  var m = document.getElementById('caddyBookingModal');
  [].forEach.call(m.querySelectorAll('.cbk-day'), function (d, i) { if (i < 7) { d.className = 'cbk-day full' + (i === 0 ? ' on' : ''); d.style.opacity = '.6'; } });
  var bar = m.querySelector('.cbk-bar-free'); if (bar) { bar.style.left = '0'; bar.style.width = '100%'; bar.style.background = '#475569'; }
  var sl = m.querySelector('.cbk-slots'); if (sl) sl.innerHTML = '<span class="cbk-slots-h" style="color:#fca5a5">No start times until Tue 13 Oct</span>';
  return 'ok';
};

/* MOCKUP harness — pro shop tee sheet (live, Bangpakong, inside the dashboard iframe). #14 = number-only roster caddy. */
(function () {
  var W = document.getElementById('teesheet-iframe').contentWindow, D = W.document;
  W.MKPS = {
    dialog: function () {
      var dd = D.querySelector('.caddy-dd');
      var row = [].filter.call(dd.children, function (c) { return /#14 /.test(c.textContent); })[0];
      if (row) { row.className = 'caddy-option booked'; row.style.cssText = 'background:rgba(220,38,38,.16);opacity:1'; var nm = row.querySelector('.caddy-option-name'); nm.style.cssText = 'color:#fca5a5;text-decoration:line-through'; nm.innerHTML = '#14 Caddy #14<span class="caddy-booked-badge" style="background:#dc2626;color:#fff;text-decoration:none;display:inline-block;margin-left:6px">SUSPENDED · until Tue 13 Oct</span>'; var info = row.querySelector('.caddy-option-info'); if (info) info.textContent = 'Off bookings — set by the caddy master'; }
      dd.classList.add('show');
      var br = [].filter.call(D.querySelectorAll('#bk-rail .bb-row'), function (r) { var b = r.querySelector('.w b'); return b && b.textContent.replace('★', '').trim() === '#14'; })[0];
      if (br) { var b = br.querySelector('.bb-btn, .bb-st'); var s = D.createElement('span'); s.className = 'bb-st no'; s.style.cssText = 'background:#dc2626;color:#fff'; s.textContent = 'Suspended · until 13 Oct'; b.replaceWith(s); br.querySelector('.ph').style.filter = 'grayscale(1) brightness(.6)'; }
      return (row ? 'row ' : 'NO ROW ') + (br ? 'brief' : 'NO BRIEF');
    }
  };
})();
/* Caddy Desk: suspended caddy leaves the queue, counts change, her tile says until when */
(function () {
  var W = document.getElementById('teesheet-iframe').contentWindow, D = W.document;
  W.MKPS.desk = function () {
    var desk = D.getElementById('cd-desk'), k = desk.querySelectorAll('.cd-k');
    k[0].querySelector('.v').textContent = '11'; k[2].querySelector('.v').textContent = '11';
    k[5].querySelector('.v').textContent = '1'; k[5].querySelector('.l').textContent = 'Suspended'; k[5].querySelector('.v').style.color = '#f87171';
    var cap = desk.querySelector('.cd-hr .cap span'); if (cap) cap.textContent = '11 on duty';
    var q = desk.querySelectorAll('.cd-qi'); q[0].remove(); q = desk.querySelectorAll('.cd-qi'); q.forEach(function (b, i) { b.querySelector('i').textContent = 'Q' + (i + 1); b.classList.toggle('first', i === 0); });
    var chips = desk.querySelector('.cd-chips'); chips.children[1].querySelector('em').textContent = '11';
    var c = D.createElement('button'); c.type = 'button'; c.className = 'cd-chip'; c.style.cssText = 'border-color:#dc2626;color:#fca5a5'; c.innerHTML = 'Suspended <em>1</em>'; chips.appendChild(c);
    var t = desk.querySelector('.cd-grid .cd-c'); t.className = 'cd-c'; t.style.cssText = 'border-color:#dc2626;background:rgba(220,38,38,.14)';
    t.querySelector('small').innerHTML = '<b style="color:#fca5a5">Suspended</b> · until Tue 13 Oct';
    t.querySelector('.h').style.cssText = 'opacity:.7;text-decoration:line-through';
    desk.querySelector('.cd-body').scrollTop = 150;
    return 'ok';
  };
})();

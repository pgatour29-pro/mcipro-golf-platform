/* v1592 (Pete 2026-10-16): "get rid of the proshop avatar up on the left corner for all dashboards. only thing left is
 * the golf course logo/avatar". The role icon in the top-left of every COURSE dashboard (Pro Shop storefront, Caddy Master
 * supervisor, Marketing megaphone, Manager flag) now shows the course: its initials (no course stores a logo yet), read
 * from the dashboard's own course so it follows a course switch. No course picked = a plain golf flag.
 * Not here: golfer + caddie headers (the person's own photo), organizer (society logo, v1588), maintenance (no course).
 */
(function (W) {
  'use strict';
  var psCourse = function () { var P = W.ProshopDashboard; return P && (P.facility ? P.facility.name : (P.course && P.course.name)); };
  var SLOTS = [
    { host: '#proshopDashboard header .bg-gradient-to-br', watch: '#ps-course-chip-name', course: psCourse },
    { host: '#psgRail > .lg', watch: '#ps-course-chip-name', course: psCourse },   // Glass: the rail's top tile
    { host: '#caddyMasterDashboard .cm-hdr-ic', watch: '#cm-course-chip-name',
      course: function () { var C = W.CaddyMasterData; return C && C.course && (C.course.label || C.course.name); } },
    { host: '#marketingDashboard .mk-hdr-ic', watch: '#mkCourseName',
      course: function () { var M = W.MarketingDashboard; return M && M.course && M.course.name; } },
    { host: '#managerDashboard header .material-symbols-outlined.text-green-600', watch: '#mgrCourseName', small: true,
      course: function () { var D = W.ManagerDashboard; return D && D.course && D.course.name; } }
  ];
  // words every course name shares say nothing about WHICH course
  var GENERIC = /^(the|and|&|at|of|golf|club|country|course|courses|resort|resorts|spa|cc|gc|g\.c\.|c\.c\.|international|links|and)$/i;
  function initials(name) {
    var w = String(name || '').replace(/[·•|()\-–,]/g, ' ').split(/\s+/).filter(function (x) { return x && /[A-Za-z0-9฀-๿]/.test(x); });
    var k = w.filter(function (x) { return !GENERIC.test(x); });
    if (!k.length) k = w;
    if (!k.length) return '';
    if (k.length === 1) { var nx = w[w.indexOf(k[0]) + 1]; return (k[0].charAt(0) + (nx ? nx.charAt(0) : '')).toUpperCase(); }   // Pattaya Country Club = PC
    return (k[0].charAt(0) + k[1].charAt(0)).toUpperCase();
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var CSS = '.crs-av{display:inline-flex;align-items:center;justify-content:center;flex:none;font:800 14px/1 "Inter",system-ui,sans-serif;letter-spacing:.02em;color:#fff;text-transform:uppercase}' +
    '.crs-av.sm{width:32px;height:32px;border-radius:9px;font-size:12.5px;background:linear-gradient(135deg,#16a34a,#0f766e)}' +
    '.crs-av .material-symbols-outlined{font-size:18px}' +
    // the phone headers hid the role icon to save room; the course stays, a size smaller
    '@media (max-width:767px){#caddyMasterDashboard .nav-header .cm-hdr-ic[data-crs-k],#marketingDashboard .nav-header .mk-hdr-ic[data-crs-k]{display:flex!important;width:32px;height:32px;border-radius:9px}' +
    '#caddyMasterDashboard .nav-header .cm-hdr-ic .crs-av,#marketingDashboard .nav-header .mk-hdr-ic .crs-av{font-size:12.5px}}';
  var CA = W.CourseAvatar = {
    initials: initials,
    paint: function () {
      SLOTS.forEach(function (s) {
        var host = document.querySelector(s.host + ',[data-crs-av="' + s.watch + '"]'); if (!host) return;
        var nm = ''; try { nm = s.course() || ''; } catch (e) { }
        var ini = initials(nm), key = ini + '|' + nm;
        if (host.getAttribute('data-crs-k') === key) return;
        if (s.small && !host.classList.contains('crs-av')) {   // the manager header had a bare icon: it becomes a tile
          var t = document.createElement('span'); t.className = 'crs-av sm'; t.setAttribute('data-crs-av', s.watch);
          host.replaceWith(t); host = t;
        }
        host.setAttribute('data-crs-k', key);
        if (host.parentElement) host.parentElement.style.flexWrap = 'nowrap';   // phones force flex rows to wrap: the tile sits BESIDE the title
        host.setAttribute('title', nm || '');
        host.setAttribute('aria-label', nm || '');
        host.innerHTML = ini ? '<span class="crs-av" aria-hidden="true">' + esc(ini) + '</span>' : '<span class="material-symbols-outlined" aria-hidden="true">golf_course</span>';
      });
    },
    boot: function () {
      if (!document.getElementById('crsAvCss')) { var st = document.createElement('style'); st.id = 'crsAvCss'; st.textContent = CSS; document.head.appendChild(st); }
      CA.paint();
      // the dashboards rewrite their course name when the course is picked or switched — repaint on that
      SLOTS.forEach(function (s) {
        var el = document.querySelector(s.watch);
        if (el && W.MutationObserver) new MutationObserver(function () { CA.paint(); }).observe(el, { childList: true, characterData: true, subtree: true });
      });
      // Glass builds its rail later (and again on a look switch): its top tile is painted when the rail lands
      var rail = function () { var r = document.getElementById('psgRail'); if (r && !r._crs && W.MutationObserver) { r._crs = 1; new MutationObserver(function () { CA.paint(); }).observe(r, { childList: true }); } CA.paint(); };
      if (W.MutationObserver) new MutationObserver(function (m) { if (document.getElementById('psgRail')) rail(); }).observe(document.getElementById('proshopDashboard') || document.body, { childList: true });
      [800, 2500].forEach(function (ms) { setTimeout(rail, ms); });
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', CA.boot); else CA.boot();
})(window);

/* v1595 (Pete 2026-10-16): "go into the main Mcipro/golfcourses and there you will see most of the logos for the courses.
 * match it up to the course and put their logos on their dashboards and also in the Tee Times offering sections, as well
 * for the course ID's when caddis and staff are selecting the courses they work at".
 * The logos (from "golf courses/") live in /images/course-logos/<venue slug>.webp, trimmed to the mark, max 256px.
 * Any course name, course id (eastern_star) or venue slug (eastern-star) resolves through CourseLink; a course with no
 * logo file gets '' and the surface keeps what it had. ONE place to add a logo: drop the file + add its slug to HAVE.
 */
(function (W) {
  'use strict';
  var HAVE = ['bangpra-international', 'black-mountain', 'cheechan', 'eastern-star', 'greenwood', 'hermes', 'laem-chabang',
    'lotus-valley', 'pattaya-golf', 'phoenix', 'pineapple-valley', 'robinswood', 'siam-bangkok', 'siam-cc-old',
    'siam-cc-waterside', 'siam-plantation', 'siam-rolling-hills', 'st-andrews-2000'];
  // course ids (courses.id) CourseLink can't read from the id alone
  var IDS = { pattaya_county: 'pattaya-golf' };
  // logos for courses not on the platform yet (no CourseLink entry): they light up the day the course is added
  var EXTRA = [[/lotus\s*valley/i, 'lotus-valley'], [/robins\s*wood/i, 'robinswood'], [/barcelona/i, 'st-andrews-2000']];
  // v1597 (Pete 2026-10-16): "Barcelona is St. Andrews2000" — the Barcelona Golf facility (St Andrews 2000 + Green Valley
  // Rayong + Silky Oak) wears the St Andrews 2000 crest: the facility's pro shop dashboard and its sister courses' Tee Times
  var ALIAS = { 'green-valley-rayong': 'st-andrews-2000', 'silky-oak': 'st-andrews-2000' };
  function one(x) {
    if (!x) return '';
    x = String(x).trim(); if (!x) return '';
    if (HAVE.indexOf(x) >= 0) return x;
    if (ALIAS[x]) return ALIAS[x];
    if (IDS[x]) return IDS[x];
    var L = W.CourseLink, s = null;
    try { s = L && L.slugFor ? L.slugFor(x.replace(/[_-]+/g, ' ')) : null; } catch (e) { }
    if (s) return ALIAS[s] || s;
    for (var i = 0; i < EXTRA.length; i++) if (EXTRA[i][0].test(x)) return EXTRA[i][1];
    return '';
  }
  var CSS = '.crs-logo{display:inline-block;object-fit:contain;background:#fff;border-radius:8px;flex:none;padding:2px;box-sizing:border-box;' +
    'box-shadow:0 0 0 1px rgba(15,23,42,.10);vertical-align:middle}';
  var CL = W.CourseLogos = {
    HAVE: HAVE,
    // first argument that resolves wins: pass the name AND the id/slug when you have both
    slug: function () { for (var i = 0; i < arguments.length; i++) { var s = one(arguments[i]); if (s) return s; } return ''; },
    url: function () { var s = CL.slug.apply(null, arguments); return s && HAVE.indexOf(s) >= 0 ? '/images/course-logos/' + s + '.webp' : ''; },
    // <img> or '' — px = box size; extra = class names / inline style for the surface
    img: function (px, cls, style /*, name, id, … */) {
      var u = CL.url.apply(null, Array.prototype.slice.call(arguments, 3)); if (!u) return '';
      CL.css();
      return '<img class="crs-logo' + (cls ? ' ' + cls : '') + '" src="' + u + '" alt="" width="' + px + '" height="' + px +
        '" loading="lazy" decoding="async" style="width:' + px + 'px;height:' + px + 'px;' + (style || '') + '">';
    },
    // a native <select> can't show pictures in its list: the PICKED course's logo sits inside the box, left of its name
    decorateSelect: function (sel) {
      if (!sel) return;
      var paint = function () {
        var o = sel.options[sel.selectedIndex], u = o && o.value ? CL.url(o.value, o.textContent) : '';
        if (!sel._crsBg) { var cs = getComputedStyle(sel); sel._crsBg = { img: cs.backgroundImage, pos: cs.backgroundPosition, size: cs.backgroundSize, rep: cs.backgroundRepeat, pl: sel.style.paddingLeft }; }
        var b = sel._crsBg, more = b.img && b.img !== 'none';   // keep the box's own arrow / art behind the logo
        if (u) {
          sel.style.backgroundImage = 'url("' + u + '")' + (more ? ', ' + b.img : '');
          sel.style.backgroundPosition = '8px center' + (more ? ', ' + b.pos : '');
          sel.style.backgroundSize = '26px 26px' + (more ? ', ' + b.size : '');
          sel.style.backgroundRepeat = 'no-repeat' + (more ? ', ' + b.rep : '');
          sel.style.paddingLeft = '42px';
        } else {
          sel.style.backgroundImage = sel.style.backgroundPosition = sel.style.backgroundSize = sel.style.backgroundRepeat = '';
          sel.style.paddingLeft = b.pl;
        }
      };
      if (!sel._crsDec) { sel._crsDec = 1; sel.addEventListener('change', paint); }
      paint();
    },
    css: function () {
      if (document.getElementById('crsLogoCss')) return;
      var st = document.createElement('style'); st.id = 'crsLogoCss'; st.textContent = CSS; (document.head || document.documentElement).appendChild(st);
    }
  };
})(window);

/* MOCKUP: bolder "selected course" on the Barcelona facility rail + a matching chip under "Barcelona Golf".
   Theme tokens only (--brand / --card-hi / --ink / --course-X-header) so WHITE, DARK and GLASS all follow. */
(function () {
  var css = [
    /* rail: picked course = 2px brand ring + brand-tinted fill; ALL keeps its own look */
    '.fx-rail button:not(.all).on{background:color-mix(in srgb,var(--brand) 16%,var(--card-hi));box-shadow:inset 0 0 0 2px var(--brand)}',
    '.fx-rail button:not(.all).on .nm{color:var(--ink);font-weight:900}',
    '.fx-rail button:not(.all).on .f{color:var(--brand)}',
    /* header: the course under "Barcelona Golf" becomes the same ringed chip */
    '.fx-sub.fx-pick{display:flex;align-items:center;gap:6px;width:fit-content;max-width:46vw;margin-top:4px;padding:3px 9px 3px 7px;border-radius:7px;line-height:1.15;',
    '  box-shadow:inset 0 0 0 2px var(--brand);background:color-mix(in srgb,var(--brand) 14%,transparent);color:var(--ink);font-weight:800;letter-spacing:.2px}',
    '.fx-sub.fx-pick .d{width:7px;height:7px;border-radius:2px;background:var(--cc);flex:none}',
    '.fx-sub.fx-pick .t{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.fx-sub.fx-pick .s{display:none}',
    /* phone: the short name (same as the rail) so the chip never truncates */
    '@media (max-width:640px){.fx-sub.fx-pick .t{display:none}.fx-sub.fx-pick .s{display:inline}}'
  ].join('\n');
  var st = document.getElementById('mk-fxsel'); if (!st) { st = document.createElement('style'); st.id = 'mk-fxsel'; document.head.appendChild(st); }
  st.textContent = css;
  var F = window.FacilitySheet; if (!F || F._mkPatched) return;
  F._mkPatched = true;
  F.paintHeader = function () {
    var node = document.getElementById('course-name-display'); if (!node || !this.fac) return;
    var c = this.courseOf(this.api.el.courseSelect.value), all = this.showingAll();
    var esc = function (s) { return String(s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); };
    node.innerHTML = esc(this.fac.name) + (all || !c
      ? '<span class="fx-sub">' + esc(this.t('allCourses')) + '</span>'
      : '<span class="fx-sub fx-pick" style="--cc:var(--course-' + this.letterOf(c.slug) + '-header)"><span class="d"></span><span class="t">' + esc(c.name) + '</span><span class="s">' + esc(c.short) + '</span></span>');
  };
  F.paintHeader();
})();

// Golfer LINE-avatar helpers — shared copy for standalone pages (results.html, live.html,
// proshop-teesheet.html). index.html has its own inline copy; every definition is guarded.
// GLOBAL RULE (Pete 2026-08-02): a golfer's name never renders without a face.
// Pages that lack window.SupabaseDB must set window.__golferAvSb = <their supabase client>.
window.__golferAvCache = window.__golferAvCache || {};
if (!window._golferPhotoMap) window._golferPhotoMap = async function(ids){
  var cache = window.__golferAvCache;
  try{
    var sb = (window.SupabaseDB && window.SupabaseDB.client) || window.__golferAvSb;
    if (!sb) return cache;
    var need = [];
    (ids||[]).forEach(function(id){ id=String(id||'').trim(); if(id && cache[id]===undefined && need.indexOf(id)<0) need.push(id); });
    for (var i=0; i<need.length; i+=200){
      var chunk = need.slice(i, i+200);
      var r = await sb.from('user_profiles').select('line_user_id, profile_data').in('line_user_id', chunk);
      (r.data||[]).forEach(function(p){ cache[p.line_user_id] = (p.profile_data && p.profile_data.linePictureUrl) || ''; });
      chunk.forEach(function(id){ if(cache[id]===undefined) cache[id]=''; });
    }
  }catch(e){}
  return cache;
};
if (!window._golferInitials) window._golferInitials = function(name){
  var p = String(name||'').trim().split(/\s+/);
  return (((p[0]||'')[0]||'')+((p[1]||'')[0]||'')).toUpperCase() || '?';
};
if (!window._golferInitialsDisc) window._golferInitialsDisc = function(name, size){
  size = size || 20;
  return '<span style="display:inline-flex;align-items:center;justify-content:center;width:'+size+'px;height:'+size+'px;border-radius:50%;background:#d1fae5;color:#065f46;font-weight:700;font-size:'+Math.max(8,Math.round(size*0.42))+'px;vertical-align:middle;margin-right:6px;flex:none;pointer-events:none;">'+window._golferInitials(name)+'</span>';
};
if (!window._gavErr) window._gavErr = function(img){
  try{ img.outerHTML = window._golferInitialsDisc(img.getAttribute('data-gav-nm')||'', parseInt(img.getAttribute('data-gav-sz'))||20); }catch(e){}
};
if (!window._golferAvHtml) window._golferAvHtml = function(id, name, size, map){
  size = size || 20;
  var url = (map || window.__golferAvCache)[String(id||'').trim()];
  if (url) return '<img src="'+String(url).replace(/"/g,'&quot;')+'" data-gav-nm="'+String(name||'').replace(/"/g,'&quot;')+'" data-gav-sz="'+size+'" onerror="window._gavErr(this)" draggable="false" style="display:inline-block;width:'+size+'px;height:'+size+'px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:6px;flex:none;pointer-events:none;" alt="">';
  return window._golferInitialsDisc(name, size);
};
if (!window._golferChipDecorate) window._golferChipDecorate = async function(root, size){
  try{
    root = typeof root === 'string' ? document.querySelector(root) : root;
    if (!root) return;
    var chips = root.querySelectorAll('[data-golfer-av]:not([data-golfer-av-done])');
    if (!chips.length) return;
    var ids = []; chips.forEach(function(el){ ids.push(el.getAttribute('data-golfer-av')); });
    var map = await window._golferPhotoMap(ids);
    chips.forEach(function(el){
      if (el.getAttribute('data-golfer-av-done')) return;
      el.setAttribute('data-golfer-av-done','1');
      var nm = el.getAttribute('data-golfer-av-nm') || (el.textContent||'').trim();
      var sz = parseInt(el.getAttribute('data-golfer-av-sz')) || size || 20;
      el.insertAdjacentHTML('afterbegin', window._golferAvHtml(el.getAttribute('data-golfer-av'), nm, sz, map));
    });
  }catch(e){}
};
if (!window._golferFaceFill) window._golferFaceFill = async function(root){
  try{
    root = typeof root === 'string' ? document.querySelector(root) : root;
    if (!root) return;
    var faces = root.querySelectorAll('[data-golfer-face]:not([data-golfer-face-done])');
    if (!faces.length) return;
    var ids = []; faces.forEach(function(el){ ids.push(el.getAttribute('data-golfer-face')); });
    var map = await window._golferPhotoMap(ids);
    faces.forEach(function(el){
      if (el.getAttribute('data-golfer-face-done')) return;
      el.setAttribute('data-golfer-face-done','1');
      var url = map[String(el.getAttribute('data-golfer-face')||'').trim()];
      if (url) el.innerHTML = '<img src="'+String(url).replace(/"/g,'&quot;')+'" onerror="this.remove()" draggable="false" style="display:block;width:100%;height:100%;border-radius:inherit;object-fit:cover;pointer-events:none;" alt="">';
    });
  }catch(e){}
};

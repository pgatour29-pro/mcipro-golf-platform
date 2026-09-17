// Name search helpers — shared copy for standalone pages (proshop-teesheet.html). index.html has
// its own inline copies (window.sanitizeSearch / _NICK_GROUPS / _nickVariants near "Nickname /
// short-name equivalence", and the clause builder inside SocietyGolfDB.searchPlayers); the SQL
// twin is public.name_nickname_variants(). Every definition is guarded, so a page that already
// carries the inline copy keeps it. Keep the three nickname tables in step.
//
// THE rule (index.html nickOrClauses): a typed word must PREFIX a name token — the start of the
// name, or a token after a space — so "h" finds Harris/Heinz but never the h inside Abraham. Each
// word expands to its nickname variants (peter → pete/petey); one .or() per typed word, and the
// .or() calls AND together, so "pete park" and "park pete" both find "Pete Park". A plain
// %substring% ilike can never match a nickname and is a recurring bug source — use this.
window._NICK_GROUPS = window._NICK_GROUPS || [
  ['richard','rick','ricky','rich','richie','dick','dickie'],
  ['robert','rob','robbie','bob','bobby'],
  ['william','will','willie','bill','billy'],
  ['james','jim','jimmy','jamie'],
  ['john','johnny','jon','jonny','jack'],
  ['jonathan','jon','jonny','jonathon'],
  ['michael','mike','mikey','mick','mickey'],
  ['thomas','tom','tommy'],
  ['charles','charlie','chuck','chas'],
  ['christopher','chris','kris'],
  ['daniel','dan','danny'],
  ['david','dave','davey'],
  ['edward','ed','eddie','ted','teddy','ned'],
  ['anthony','tony'],
  ['joseph','joe','joey'],
  ['matthew','matt','matty'],
  ['andrew','andy','drew'],
  ['benjamin','ben','benny'],
  ['nicholas','nick','nicky'],
  ['samuel','sam','sammy'],
  ['alexander','alex','alec','xander','sandy'],
  ['stephen','steve','stevie','steven'],
  ['kenneth','ken','kenny'],
  ['ronald','ron','ronnie'],
  ['donald','don','donnie'],
  ['gerald','gerry','jerry'],
  ['gregory','greg','gregg'],
  ['timothy','tim','timmy'],
  ['patrick','pat','paddy'],
  ['peter','pete','petey'],
  ['frederick','fred','freddie','freddy'],
  ['francis','frank','frankie'],
  ['lawrence','larry','laurie'],
  ['vincent','vince','vinny'],
  ['theodore','theo','ted','teddy'],
  ['philip','phil'],
  ['raymond','ray'],
  ['douglas','doug'],
  ['zachary','zach','zack'],
  ['joshua','josh'],
  ['jacob','jake'],
  ['nathaniel','nathan','nate'],
  ['albert','bert','albie']
];
if (!window._nickVariants) (function(){
  var idx = new Map();
  window._NICK_GROUPS.forEach(function(g){
    g.forEach(function(m){
      var set = idx.get(m); if (!set) { set = new Set(); idx.set(m, set); }
      g.forEach(function(x){ set.add(x); });
    });
  });
  window._nickIndex = window._nickIndex || idx;
  // All equivalent forms of a single lowercased token (includes the token itself).
  window._nickVariants = function(tok){
    tok = String(tok == null ? '' : tok).toLowerCase();
    var s = idx.get(tok); return s ? Array.from(s) : [tok];
  };
})();
// Strip the characters with STRUCTURAL meaning in a PostgREST filter (comma, parens, wildcard,
// backslash) so typed text can't break out of its ilike value. Apostrophes/hyphens stay.
if (!window.sanitizeSearch) window.sanitizeSearch = function(s){
  return String(s == null ? '' : s).replace(/[,()*\\]/g, ' ').replace(/\s+/g, ' ').trim();
};
// One typed word → its .or() clause list, exactly as SocietyGolfDB.searchPlayers builds it:
// nickname variants, the apostrophe-stripped form (o'donnell → odonnell) and, for O'…/D'…
// surnames of 4+ letters, first letter + wildcard + rest (omeara → o%meara, reaches "O'Meara").
// The word must already be sanitizeSearch'd.
if (!window.nameSearchOrClauses) window.nameSearchOrClauses = function(word, col){
  col = col || 'name';
  var variants = window._nickVariants(word), forms = [], clauses = [];
  function add(f){ if (f && forms.indexOf(f) < 0) forms.push(f); }
  variants.forEach(function(v){
    if (!v) return;
    var bare = v.replace(/['’]/g, '');
    add(v);
    if (bare && bare !== v) add(bare);
    if (bare.length >= 4 && /^[od]/i.test(bare)) add(bare.charAt(0) + '%' + bare.slice(1));
  });
  forms.forEach(function(f){ clauses.push(col + '.ilike.' + f + '%', col + '.ilike.% ' + f + '%'); });
  return clauses.join(',');
};
// Directory search for a standalone page (sb = its supabase client). Handicap resolves the way
// searchPlayers does — handicap_index → profile_data.handicap → golfInfo.handicap, "+3" stored as
// -3 — minus the society-handicap layer, which needs a society; null when the profile has none.
// Duplicate profiles (same name + handicap) collapse to one, preferring a real LINE account (U…)
// over a synthetic id, so a pick links the account that can actually see its dashboard.
// Returns [{id, name, handicap}] in name order.
if (!window.searchProfilesByName) window.searchProfilesByName = async function(sb, term, limit){
  term = window.sanitizeSearch(term);
  if (!sb || !term) return [];
  var words = term.split(/\s+/).filter(Boolean);
  var q = sb.from('user_profiles').select('line_user_id, name, handicap_index, profile_data');
  words.forEach(function(w){ q = q.or(window.nameSearchOrClauses(w)); });
  var r = await q.limit(limit || 100);
  if (r.error) throw r.error;
  function hcpOf(p){
    var pd = p.profile_data || {}, gi = pd.golfInfo || {};
    var v = (p.handicap_index != null) ? p.handicap_index : (pd.handicap != null ? pd.handicap : gi.handicap);
    if (v == null || v === '') return null;
    var s = String(v).trim();
    var n = s.charAt(0) === '+' ? -parseFloat(s.slice(1)) : parseFloat(s);
    return isNaN(n) ? null : n;
  }
  function real(p){ return /^U[0-9a-f]{32}$/i.test(p.id) ? 1 : 0; }
  var rows = [], seenId = {};
  (r.data || []).forEach(function(p){
    if (!p.line_user_id || seenId[p.line_user_id]) return;
    seenId[p.line_user_id] = 1;
    rows.push({ id: p.line_user_id, name: String(p.name || '').trim() || 'Unknown', handicap: hcpOf(p) });
  });
  rows.sort(function(a, b){ return (real(b) - real(a)) || a.name.localeCompare(b.name); });
  var seenKey = {}, out = [];
  rows.forEach(function(p){
    var key = p.name.toLowerCase().replace(/\s+/g, ' ') + '|' + (p.handicap == null ? '' : p.handicap);
    if (seenKey[key]) return;
    seenKey[key] = 1; out.push(p);
  });
  out.sort(function(a, b){ return a.name.localeCompare(b.name); });
  return out;
};

// Guard for v1567 — PLAY GOLF in ONE flow (Pete picked mockup A, 2026-10-14). play-flow.js MOVES the existing setup
// blocks into four numbered .scv3-group cards; it never rebuilds them and never adds a second start path.
// 1. index.html loads play-flow.js; every block it moves still exists with its id.
// 2. Course, tee markers, pin positions and starting nine land in the SAME card; event + players in the same card.
// 3. The sticky bar starts the round ONLY by clicking the real #startRoundBtn; it never calls startRound itself.
// 4. Duplicates hidden (#quickStartBtn, #scSection_view); the phone bar lives on <body> (tab transform trap).
// 5. Strings exist in TH/KO/JA for every English key used.
const fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', 'public', f), 'utf8');
const pf = read('play-flow.js'), html = read('index.html');
const fail = [];
if (!/<script src="play-flow\.js\?v=\w+"><\/script>/.test(html)) fail.push('index.html must load play-flow.js');
['scRoundTypeTabs', 'scSection_event', 'scSection_society', 'scSection_players', 'scSection_course', 'scSection_tee', 'pinSheetSection', 'scSection_nine',
 'scSection_games', 'scSection_gamecode', 'masterPointsSection', 'thmStation', 'paceStation', 'styleStation', 'scSection_public', 'scSection_spectate',
 'scSection_stats', 'startRoundBtn', 'quickStartBtn', 'scSection_view', 'teeMarkerContainer', 'scorecardCourseSelect'].forEach(id => {
    if (html.indexOf('id="' + id + '"') === -1) fail.push('index.html lost #' + id + ' (play-flow.js moves it)');
});
const c1 = pf.match(/\['scRoundTypeTabs', 'scSection_event', 'scSection_society', 'scSection_players'\]\.forEach\(function \(id\) \{ mv\(c1, id\); \}\)/);
if (!c1) fail.push('event + players must go into card 1 together');
if (!/mv\(c2, 'scSection_course'\)/.test(pf) || !/\['scSection_tee', 'pinSheetSection', 'scSection_nine'\]\.forEach\(function \(id\) \{ mv\(c2, id\); \}\)/.test(pf)) fail.push('course, tees, pins and starting nine must go into card 2 together');
if (/startRound\s*\(/.test(pf.replace(/\/\*[\s\S]*?\*\//g, ''))) fail.push('play-flow.js must never call startRound() — click #startRoundBtn (one start path)');
if (!/\$\('startRoundBtn'\); if \(b\) b\.click\(\)/.test(pf)) fail.push('the bar must start through the real #startRoundBtn');
if (!/#quickStartBtn/.test(pf) || !/#scSection_view/.test(pf)) fail.push('the duplicate Quick Start + 2nd card style must be hidden');
if (!/document\.body\.appendChild\(bar\)/.test(pf)) fail.push('on a phone the bar must live on <body> (.tab-content.active transform traps fixed children)');
const en = new Set((pf.match(/TT\('([^']+)'\)/g) || []).map(s => s.slice(4, -2)));
['th', 'ko', 'ja'].forEach(l => {
    const blk = (pf.match(new RegExp(l + ': \\{([^}]*)\\}')) || [])[1] || '';
    en.forEach(k => { if (blk.indexOf("'" + k + "'") === -1 && blk.indexOf('"' + k + '"') === -1) fail.push(l + ' is missing "' + k + '"'); });
});
if (/font:\s*\d{3}\s+[\d.]+px(\/[\d.]+(px)?)?\s+inherit/.test(pf)) fail.push('play-flow.js: `font:<w> <size> inherit` is invalid CSS');
if (fail.length) { console.error('play-flow-check FAILED:\n - ' + fail.join('\n - ')); process.exit(1); }
console.log('play-flow-check: ok (4 step cards, course+tees+pins together, one start path, 4 languages)');

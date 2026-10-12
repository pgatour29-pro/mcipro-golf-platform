// Guard for v1531 — FGV2 food module (Pete 2026-10-12: "like a billion food ordering app, not a 7th grade science project").
// 1. Real photos: every photo the library or the seed SQL names exists in public/images/food, with a credit line.
// 2. menu_items.photo is anon-writable → the client only ever renders a whitelisted images/food path.
// 3. Golfer-dashboard trap: sticky never sticks there and the tab carries a transform, so the basket bar,
//    pinned tabs and overlays are mounted on document.body — and they leave with the tab (observer on #golfer-food).
// 4. No search magnifier in the search box (Pete had them stripped app-wide; a global script deletes them anyway).
// 5. Click handlers never carry DB text (deal codes / add-on / spice names): ids or indexes only.
// 6. index.html drops the old FGV1 header + pill and loads the new script version.
const fs = require('fs'), path = require('path');
const pub = f => path.join(__dirname, '..', 'public', f);
const js = fs.readFileSync(pub('food-fgv1.js'), 'utf8');
const html = fs.readFileSync(pub('index.html'), 'utf8');
const sql = fs.readFileSync(path.join(__dirname, '..', 'sql', 'food_fgv2_v1531.sql'), 'utf8');
const fail = [];

const lib = (js.match(/const FOOD_PHOTOS = \[([\s\S]*?)\];/) || [])[1];
if (!lib) fail.push('food-fgv1.js: FOOD_PHOTOS library missing');
const slugs = new Set((lib || '').match(/'([a-z0-9-]+)'/g).map(s => s.slice(1, -1)));
(sql.match(/,'([a-z0-9-]+)'\)/g) || []).forEach(m => slugs.add(m.slice(2, -2)));
slugs.add('hero');
let credits = [];
try { credits = JSON.parse(fs.readFileSync(pub('images/food/CREDITS.json'), 'utf8')).map(c => c.file); } catch (e) { fail.push('images/food/CREDITS.json missing or unreadable'); }
slugs.forEach(s => {
    if (!fs.existsSync(pub('images/food/' + s + '.jpg'))) fail.push('missing photo images/food/' + s + '.jpg');
    if (credits.length && !credits.includes(s + '.jpg')) fail.push('no credit line for images/food/' + s + '.jpg');
});

if (!/const PHOTO_RE = \/\^images\\\/food\\\/\[a-z0-9-\]\+/.test(js)) fail.push('photo whitelist PHOTO_RE must pin photos to images/food/<slug>');
if (!/PHOTO_RE\.test\(String\(it\.photo/.test(js)) fail.push('photoOf must test menu_items.photo against PHOTO_RE');
if (!/photo: PHOTO_RE\.test\(String\(e\.photo/.test(js)) fail.push('kitchen saveItem must whitelist the photo it writes');

['fg2Bar', 'fg2Ovl'].forEach(id => { if (!new RegExp("id = '" + id + "'").test(js)) fail.push(id + ' must be created on document.body'); });
if (!/document\.body\.appendChild\(tb\)/.test(js)) fail.push('pinned category tabs must move to document.body (sticky is dead in the golfer dashboard)');
if (!/new MutationObserver\([\s\S]{0,200}\.observe\(f, \{ attributes: true, attributeFilter: \['class', 'style'\] \}\)/.test(js)) fail.push('body-level chrome must follow #golfer-food (leave the tab → bar/overlay go)');
if (/position:sticky;top:0/.test(js)) fail.push('do not rely on position:sticky for the tab bar');

if (/fg2-srch">' \+ ms\('search'\)/.test(js)) fail.push('no magnifier icon in the food search box');
if (/claim\(\\'' \+ esc\(/.test(js) || /toggleAddon\(\\'' \+ esc\(/.test(js) || /setSpice\(\\'' \+ esc\(/.test(js)) fail.push('click handlers must not carry DB text (use ids / indexes)');

if (/id="fgvPill"|id="fgvKitchenOvl"/.test(html)) fail.push('index.html still has the old FGV1 food header / pill');
if (!/<script src="food-fgv1\.js\?v=1531" defer><\/script>/.test(html) && !/food-fgv1\.js\?v=(15[3-9]\d|1[6-9]\d\d)/.test(html)) fail.push('index.html must load food-fgv1.js at v1531 or later');
if (!/canBack\(\) \{ return S\.view !== 'home'; \}/.test(js)) fail.push('Back must close the item page / basket first');

if (fail.length) { console.error('food-fgv2-check FAILED:\n - ' + fail.join('\n - ')); process.exit(1); }
console.log('food-fgv2-check: ok (' + slugs.size + ' photos)');

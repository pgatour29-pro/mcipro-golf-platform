// Guard for v1558 — MESSAGES HUB (Pete 2026-10-13): the pro shop's inbox on the Tee sheet + Caddy desk, folders + pins,
// a caddy added into a golfer's chat, Message caddies; the caddy phone reads the course chats.
// 1. The pro shop page loads messages-hub.js and hands it its internals; every read/write goes through the mh_* RPCs
//    behind the desk token (never a direct read of the locked tables).
// 2. The Messages button's badge sits ON the chip corner (absolute) — it never widens the button.
// 3. No invalid `font:<weight> <size> inherit` shorthand (the browser drops the whole declaration).
// 4. Strings exist in all four languages with the same keys.
// 5. caddy-dm.js escapes every name it paints and reads course chats; course-inbox "Open & reply" opens the hub thread.
const fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', 'public', f), 'utf8');
const mh = read('messages-hub.js'), ts = read('proshop-teesheet.html'), cdm = read('caddy-dm.js'), ci = read('course-inbox.js');
const fail = [];

if (!/<script src="messages-hub\.js\?v=\w+"><\/script>/.test(ts)) fail.push('proshop-teesheet.html must load messages-hub.js');
if (!/window\.MessagesHub\.init\(\{/.test(ts)) fail.push('proshop-teesheet.html must hand MessagesHub its internals');
['slug', 'courseName', 'dayState', 'sb', 'lang'].forEach(k => {
    const blk = ts.slice(ts.indexOf('window.MessagesHub.init({'), ts.indexOf('[MessagesHub] init:'));
    if (!new RegExp('\\b' + k + '\\b').test(blk)) fail.push('MessagesHub.init is missing ' + k);
});
['mh_inbox', 'mh_thread', 'mh_read', 'mh_send', 'mh_pref', 'mh_folder', 'mh_caddies', 'mh_add_caddy', 'mh_caddy_send'].forEach(r => {
    if (mh.indexOf("rpc('" + r + "'") === -1) fail.push('messages-hub.js must call ' + r);
});
[['messages-hub.js', mh], ['caddy-dm.js', cdm]].forEach(([f, src]) => {
    if (/from\(\s*['"](msg_folders|msg_thread_prefs|course_broadcasts|caddy_pin_logins|proshop_desk_tokens)['"]/.test(src)) fail.push(f + ': reads a locked table directly — go through the RPCs');
    if (/font:\s*\d{3}\s+[\d.]+px(\/[\d.]+(px)?)?\s+inherit/.test(src)) fail.push(f + ': `font:<w> <size> inherit` is invalid CSS (the whole declaration is dropped)');
});
if (!/#mh-btn \.b\{position:absolute/.test(mh)) fail.push('messages-hub.js: the Messages badge must sit ON the chip corner (position:absolute)');
if (!/#mh-btn\{[^}]*position:relative/.test(mh)) fail.push('messages-hub.js: #mh-btn must be the badge anchor (position:relative)');
if (/\bprompt\(|\bconfirm\(|\balert\(/.test(mh)) fail.push('messages-hub.js: no native dialogs (prompt/confirm/alert)');
if (/onclick=/.test(mh)) fail.push('messages-hub.js: no inline onclick — delegated data-a handlers only');

// four languages, same keys
const STR = (() => { const m = mh.match(/var STR = (\{[\s\S]*?\n  \});/); if (!m) return null; try { return Function('return ' + m[1])(); } catch (e) { return null; } })();
if (!STR) fail.push('messages-hub.js: STR table not parseable');
else {
    const en = Object.keys(STR.en);
    ['th', 'ko', 'ja'].forEach(l => {
        if (!STR[l]) { fail.push('messages-hub.js: missing language ' + l); return; }
        en.forEach(k => { if (!(k in STR[l])) fail.push('messages-hub.js: ' + l + ' is missing "' + k + '"'); });
    });
}

if (!/from\('group_chat_messages'\)/.test(cdm) || !/rpc\('msg_prefs'/.test(cdm)) fail.push('caddy-dm.js must read course chats (group_chat_messages) and the All-caddies flags (msg_prefs)');
if (/'<b>' \+ \(n\.name/.test(cdm) || /\? \(n\.name \|\| T\('Golfer'\)\) \+/.test(cdm)) fail.push('caddy-dm.js: a name is painted without esc()');
if (!/MessagesHub\.openThread\(it\.sender_id/.test(ci)) fail.push('course-inbox.js: "Open & reply" on a direct message must open the hub thread');

if (fail.length) { console.error('messages-hub-check FAILED:\n - ' + fail.join('\n - ')); process.exit(1); }
console.log('messages-hub-check: ok');

// Public, indexable pages for Google, generated from the LIVE data (read-only, anon key):
//   /about/                 the landing page (the app at / stays the app — FUCKUPS #33: nothing on the login page)
//   /courses/               directory of the courses the societies play
//   /courses/<slug>/        one page per course: holes, par, yardage per tee, who plays there and when, caddy link
//   /societies/             the societies
//   /societies/<slug>/      one page per society: weekly pattern, courses, how to join
//   /sitemap.xml /robots.txt
// Facts only: everything on a page comes from the courses / course_holes / society_events tables or from the
// app's own public links (/q/<venue>). No invented descriptions, phone numbers or prices.
//   node tools/seo/build.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PUB = join(HERE, '..', '..', 'public');
const SITE = 'https://mycaddipro.com';
const SB = 'https://pyeeplwsnupmhgbguwqs.supabase.co';
const KEY = 'sb_publishable_JUC1GzlfviBUyy8LeEpSkA_Xc8tgRC9';
const TODAY = new Date();
const ISO = (d) => d.toISOString().slice(0, 10);

async function rest(path) {
    const r = await fetch(`${SB}/rest/v1/${path}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
    if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`);
    return r.json();
}

// The courses the societies actually play (eastern seaboard). slug = public URL, id = courses table row for
// hole data, venue = the /q/<venue> key from course-society-link.js, match = words that identify the course in
// society_events.course_name / title.
const COURSES = [
    { slug: 'pattaya-country-club', id: 'pattaya_county', name: 'Pattaya Country Club', venue: 'pattaya-country', match: [['pattaya', 'country'], ['pattaya', 'cc']] },
    { slug: 'burapha-golf-club', id: 'burapha', name: 'Burapha Golf Club', venue: 'burapha', match: [['burapha']] },
    { slug: 'phoenix-gold-golf', id: 'phoenix_gold', name: 'Phoenix Gold Golf & Country Club', venue: 'phoenix', match: [['phoenix']] },
    { slug: 'bangpakong-riverside', id: 'bangpakong', name: 'Bangpakong Riverside Country Club', venue: 'bangpakong', match: [['bangpakong']] },
    { slug: 'green-valley-rayong', id: 'green_valley_rayong', name: 'Green Valley Rayong Country Club', venue: 'green-valley', match: [['green', 'valley']] },
    { slug: 'eastern-star', id: 'eastern_star', name: 'Eastern Star Golf Course', venue: 'eastern-star', match: [['eastern', 'star']] },
    { slug: 'khao-kheow', id: 'khao_kheow', name: 'Khao Kheow Country Club', venue: 'khao-kheow', match: [['khao', 'kheow'], ['khaokheow']] },
    { slug: 'treasure-hill', id: null, name: 'Treasure Hill Golf & Country Club', venue: 'treasure-hill', match: [['treasure', 'hill']] },
    { slug: 'bangpra-international', id: 'bangpra', name: 'Bangpra International Golf Club', venue: 'bangpra', match: [['bangpra']] },
    { slug: 'greenwood-golf', id: 'greenwood', name: 'Greenwood Golf & Resort', venue: 'greenwood', match: [['greenwood'], ['green', 'wood']] },
    { slug: 'st-andrews-2000', id: null, name: 'St Andrews 2000', venue: 'andrews', match: [['andrews']] },
    { slug: 'plutaluang-navy', id: 'plutaluang', name: 'Plutaluang Royal Thai Navy Golf Course', venue: 'plutaluang', match: [['plutaluang'], ['putaluang']] },
    { slug: 'hermes-golf', id: 'hermes', name: 'Hermes Golf Club', venue: 'hermes', match: [['hermes']] },
    { slug: 'siam-plantation', id: 'siam_plantation', name: 'Siam Country Club Plantation', venue: 'siam-plantation', match: [['siam', 'plantation']] },
    { slug: 'siam-old-course', id: 'siam_cc_old', name: 'Siam Country Club Old Course', venue: 'siam-old', match: [['siam', 'old']] },
    { slug: 'pattavia', id: 'pattavia', name: 'Pattavia Century Golf Club', venue: 'pattavia', match: [['pattavia']] },
    { slug: 'mountain-shadow', id: 'mountain_shadow', name: 'Mountain Shadow Golf Club', venue: 'mountain-shadow', match: [['mountain', 'shadow']] },
    { slug: 'laem-chabang', id: 'laem_chabang', name: 'Laem Chabang International Country Club', venue: 'laem-chabang', match: [['laem', 'chabang']] },
    { slug: 'pleasant-valley', id: 'pleasant_valley', name: 'Pleasant Valley Golf Club', venue: 'pleasant-valley', match: [['pleasant', 'valley']] },
    { slug: 'crystal-bay', id: 'crystal_bay', name: 'Crystal Bay Golf Club', venue: 'crystal-bay', match: [['crystal', 'bay']] },
    { slug: 'royal-lakeside', id: 'royal_lakeside', name: 'Royal Lakeside Golf Club', venue: 'royal-lakeside', match: [['royal', 'lakeside'], ['lakeside']] },
    { slug: 'chee-chan', id: 'cheechan', name: 'Chee Chan Golf Resort', venue: 'chee-chan', match: [['chee', 'chan'], ['cheechan']] },
    { slug: 'pattana-golf', id: 'pattana', name: 'Pattana Golf Resort & Spa', venue: 'pattana', match: [['pattana']] },
    { slug: 'grand-prix', id: 'grand_prix', name: 'Grand Prix Golf Club', venue: 'grand-prix', match: [['grand', 'prix']] },
];
const SOCIETIES = [
    { slug: 'travellers-rest-golf-group', name: 'Travellers Rest Golf Group', short: 'TRGG', db: 'Travellers Rest Golf Group', blurb: 'A Pattaya golf society playing several days a week across the eastern seaboard courses, with transport from Pattaya, competitions and a season order of merit.' },
    { slug: 'joa-golf-pattaya', name: 'JOA Golf Pattaya', short: 'JOA', db: 'JOA Golf Pattaya', blurb: 'A Korean golf society based in Pattaya with regular society days and its own handicap system.' },
    { slug: 'jgts-jomtien', name: 'JGTS - Jomtien Golf & Transport Society', short: 'JGTS', db: 'JGTS - Jomtien Golf & Transport', blurb: 'A Swedish golf group in Jomtien playing society days with transport.' },
];
const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const toks = (s) => new Set(String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter(Boolean));
const matches = (c, text) => { const t = toks(text); return c.match.some((set) => set.every((w) => t.has(w))); };
const hm = (t) => (t ? String(t).slice(0, 5) : '');
const nice = (iso) => { const d = new Date(iso + 'T00:00:00'); return `${WD[d.getDay()].slice(0, 3)} ${d.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]}`; };
const h12 = (t) => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };

// ---------------------------------------------------------------- data
const since = new Date(TODAY); since.setDate(since.getDate() - 120);
const until = new Date(TODAY); until.setDate(until.getDate() + 60);
const events = await rest(`society_events?select=event_date,start_time,departure_time,course_name,title,society_id,status&event_date=gte.${ISO(since)}&event_date=lte.${ISO(until)}&order=event_date.asc&limit=2000`);
const socRows = await rest(`society_profiles?select=id,society_name`);
const socById = Object.fromEntries(socRows.map((s) => [s.id, s.society_name]));
const live = events.filter((e) => !['cancelled', 'draft'].includes(e.status || ''));
const holesAll = await rest(`course_holes?select=course_id,hole_number,tee_marker,par,stroke_index,yardage&course_id=in.(${COURSES.filter((c) => c.id).map((c) => `"${c.id}"`).join(',')})&limit=5000`);
const courseRows = await rest(`courses?select=id,name,location,total_holes,par&id=in.(${COURSES.filter((c) => c.id).map((c) => `"${c.id}"`).join(',')})`);
const courseById = Object.fromEntries(courseRows.map((c) => [c.id, c]));

// per course: which society plays on which weekday, usual tee time, dates
for (const c of COURSES) {
    const evs = live.filter((e) => matches(c, (e.course_name || '') + ' ' + (e.title || '')));
    const bySoc = {};
    for (const e of evs) {
        const soc = socById[e.society_id]; if (!soc) continue;
        const d = new Date(e.event_date + 'T00:00:00');
        const k = soc + '|' + d.getDay();
        bySoc[k] = bySoc[k] || { soc, dow: d.getDay(), n: 0, tees: {}, next: null, last: null };
        bySoc[k].n++;
        if (e.start_time) bySoc[k].tees[hm(e.start_time)] = (bySoc[k].tees[hm(e.start_time)] || 0) + 1;
        if (e.event_date >= ISO(TODAY) && (!bySoc[k].next || e.event_date < bySoc[k].next)) bySoc[k].next = e.event_date;
        if (e.event_date < ISO(TODAY) && (!bySoc[k].last || e.event_date > bySoc[k].last)) bySoc[k].last = e.event_date;
    }
    c.patterns = Object.values(bySoc).filter((p) => p.n >= 2).sort((a, b) => b.n - a.n).map((p) => ({ ...p, tee: Object.entries(p.tees).sort((a, b) => b[1] - a[1])[0]?.[0] || '' }));
    c.upcoming = evs.filter((e) => e.event_date >= ISO(TODAY)).slice(0, 6).map((e) => ({ date: e.event_date, soc: socById[e.society_id], tee: hm(e.start_time), depart: hm(e.departure_time) }));
    c.played = evs.filter((e) => e.event_date < ISO(TODAY)).length;
    const row = c.id ? courseById[c.id] : null;
    c.location = row?.location || '';
    c.holes = row?.total_holes || 18; c.par = row?.par || 72;
    const hs = c.id ? holesAll.filter((h) => h.course_id === c.id) : [];
    const tees = {};
    for (const h of hs) { const t = (h.tee_marker || '').toLowerCase(); if (!t) continue; tees[t] = tees[t] || { n: 0, y: 0 }; tees[t].n++; tees[t].y += h.yardage || 0; }
    c.tees = Object.entries(tees).filter(([, v]) => v.n >= 18 && v.y > 4000).map(([t, v]) => ({ tee: t, yards: Math.round(v.y / (v.n / 18)) })).sort((a, b) => b.yards - a.yards);
    const one = {}; for (const h of hs) { if (!one[h.hole_number]) one[h.hole_number] = h; }
    c.card = Object.values(one).sort((a, b) => a.hole_number - b.hole_number).slice(0, 18).map((h) => ({ n: h.hole_number, par: h.par, si: h.stroke_index }));
    if (c.card.length === 18) { c.par = c.card.reduce((s, h) => s + (h.par || 0), 0) || c.par; }
}
for (const s of SOCIETIES) {
    const evs = live.filter((e) => socById[e.society_id] === s.db);
    const byDow = {};
    for (const e of evs) {
        const d = new Date(e.event_date + 'T00:00:00'); const c = COURSES.find((x) => matches(x, (e.course_name || '') + ' ' + (e.title || '')));
        const k = d.getDay(); byDow[k] = byDow[k] || { dow: k, n: 0, courses: {} }; byDow[k].n++;
        const cn = c ? c.name : (e.course_name || e.title || ''); byDow[k].courses[cn] = (byDow[k].courses[cn] || 0) + 1;
    }
    s.week = Object.values(byDow).filter((d) => d.n >= 3).sort((a, b) => a.dow - b.dow).map((d) => ({ ...d, top: Object.entries(d.courses).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n]) => n) }));
    s.upcoming = evs.filter((e) => e.event_date >= ISO(TODAY)).slice(0, 8).map((e) => ({ date: e.event_date, course: e.course_name || e.title, tee: hm(e.start_time) }));
    s.played = evs.filter((e) => e.event_date < ISO(TODAY)).length;
    s.courses = [...new Set(evs.map((e) => COURSES.find((x) => matches(x, (e.course_name || '') + ' ' + (e.title || '')))).filter(Boolean))];
}

// ---------------------------------------------------------------- html
const CSS = `
:root{--ink:#0f172a;--mute:#475569;--line:#e2e8f0;--bg:#f6f8f7;--card:#fff;--green:#15803d;--deep:#0b2f1f;--deep2:#113d2a;--mono:'JetBrains Mono',ui-monospace,monospace}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 'Instrument Sans',system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
a{color:var(--green)}header{background:linear-gradient(160deg,var(--deep),var(--deep2));color:#fff}
.wrap{max-width:1040px;margin:0 auto;padding:0 16px}nav{display:flex;align-items:center;gap:18px;padding:14px 0;font-size:14px}
nav a{color:#d8e7df;text-decoration:none}nav a.brand{font-weight:800;font-size:18px;color:#fff;margin-right:auto}nav a.app{background:#22c55e;color:#06281a;padding:8px 14px;border-radius:999px;font-weight:700;white-space:nowrap}
.hero{padding:36px 0 40px}.hero h1{font-size:clamp(28px,5vw,44px);line-height:1.1;margin:0 0 10px;letter-spacing:-.02em}.hero p{color:#cfe3d8;max-width:620px;margin:0 0 18px;font-size:17px}
.kick{font:700 11px/1 var(--mono);letter-spacing:.16em;color:#86efac;text-transform:uppercase;margin-bottom:12px}
main{padding:28px 0 48px}h2{font-size:22px;margin:30px 0 12px;letter-spacing:-.01em}h3{font-size:17px;margin:18px 0 8px}p{margin:0 0 12px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px;text-decoration:none;color:inherit;display:block}
.card b{display:block;font-size:17px;margin-bottom:4px}.card small{color:var(--mute)}
table{border-collapse:collapse;width:100%;background:#fff;border:1px solid var(--line);border-radius:12px;overflow:hidden;font-size:14px}
th,td{padding:8px 10px;text-align:left;border-top:1px solid var(--line)}th{background:#f1f5f3;font:700 11px/1 var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--mute);border-top:0}
.card18{display:grid;grid-template-columns:repeat(9,1fr);gap:4px;font:12px/1.2 var(--mono)}.card18 div{background:#fff;border:1px solid var(--line);border-radius:8px;padding:6px 4px;text-align:center}.card18 div b{display:block;font-size:14px;color:var(--ink)}.card18 div span{color:var(--mute)}
.pill{display:inline-block;background:#dcfce7;color:#166534;border-radius:999px;padding:4px 10px;font:700 12px/1 var(--mono);margin:0 6px 6px 0}
.cta{display:inline-block;background:var(--green);color:#fff;padding:12px 18px;border-radius:12px;font-weight:700;text-decoration:none}
.muted{color:var(--mute)}footer{border-top:1px solid var(--line);padding:22px 0;color:var(--mute);font-size:13px}footer a{color:var(--mute)}
.stats{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0}.stat{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:12px;padding:10px 14px;min-width:120px}.stat b{display:block;font-size:22px;color:#fff}.stat span{font:700 10px/1 var(--mono);letter-spacing:.14em;color:#9fd3b6;text-transform:uppercase}
@media(max-width:480px){.card18{grid-template-columns:repeat(6,1fr)}nav{gap:12px;font-size:13px}}
`;
function page({ path, title, desc, h1, kicker, lead, body, jsonld, stats }) {
    const url = SITE + path;
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website"><meta property="og:site_name" content="MyCaddiPro"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${SITE}/mcipro.png">
<meta name="twitter:card" content="summary"><link rel="icon" href="/mcipro.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
<style>${CSS}</style>
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}
</head><body>
<header><div class="wrap"><nav><a class="brand" href="/about/">MyCaddiPro</a><a href="/courses/">Courses</a><a href="/societies/">Societies</a><a class="app" href="/">Open the app</a></nav>
<div class="hero">${kicker ? `<div class="kick">${esc(kicker)}</div>` : ''}<h1>${esc(h1)}</h1><p>${esc(lead)}</p>${stats || ''}</div></div></header>
<main><div class="wrap">${body}</div></main>
<footer><div class="wrap">MyCaddiPro · tee times, caddies, societies and live scoring for golf in Pattaya and the eastern seaboard · <a href="/privacy.html">Privacy</a> · <a href="/about/">About</a> · <a href="/">Open the app</a></div></footer>
</body></html>`;
}
function write(path, html) { const dir = join(PUB, path); mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, 'index.html'), html); }

const urls = [];
// --- course pages
for (const c of COURSES) {
    const path = `/courses/${c.slug}/`; urls.push(path);
    const who = c.patterns.map((p) => `<tr><td><a href="/societies/${SOCIETIES.find((s) => s.db === p.soc)?.slug || ''}/">${esc(p.soc)}</a></td><td>${WD[p.dow]}s</td><td>${p.tee ? h12(p.tee) : '—'}</td><td>${p.n} days${p.next ? ` · next ${nice(p.next)}` : ''}</td></tr>`).join('');
    const up = c.upcoming.map((u) => `<tr><td>${nice(u.date)}</td><td>${esc(u.soc)}</td><td>${u.depart ? `Depart ${h12(u.depart)} · ` : ''}Tee ${u.tee ? h12(u.tee) : 'TBC'}</td></tr>`).join('');
    const tees = c.tees.map((t) => `<span class="pill">${esc(t.tee)} ${t.yards.toLocaleString()} yd</span>`).join('');
    const card = c.card.length === 18 ? `<div class="card18">${c.card.map((h) => `<div><span>${h.n}</span><b>${h.par}</b><span>SI ${h.si ?? '–'}</span></div>`).join('')}</div>` : '';
    const socs = [...new Set(c.patterns.map((p) => p.soc))];
    const lead = `${c.holes} holes, par ${c.par}${c.tees[0] ? `, ${c.tees[0].yards.toLocaleString()} yards from the ${c.tees[0].tee} tees` : ''}${c.location ? `, ${c.location}` : ''}.${socs.length ? ` ${socs.join(' and ')} play society days here.` : ''}`;
    const desc = `${c.name}: ${lead} Scorecard, yardage, society days and caddy requests on MyCaddiPro.`;
    const body = `
<p class="muted">${esc(c.location || 'Eastern seaboard, Thailand')} · ${c.holes} holes · par ${c.par}${c.played ? ` · ${c.played} society days scored here in the last four months` : ''}</p>
${tees ? `<h2>Yardage</h2><p>${tees}</p>` : ''}
${card ? `<h2>Scorecard</h2><p class="muted">Par and stroke index, holes 1–18.</p>${card}` : ''}
<h2>Who plays here</h2>
${who ? `<table><tr><th>Society</th><th>Day</th><th>Usual tee</th><th>Last four months</th></tr>${who}</table>` : '<p class="muted">No regular society day on record here yet.</p>'}
${up ? `<h2>Coming up</h2><table><tr><th>Date</th><th>Society</th><th>Times</th></tr>${up}</table>` : ''}
<h2>Play ${esc(c.name)} with a society</h2>
<p>Visiting golfers can join a society day at ${esc(c.name)} without installing anything: the venue page lists what is coming up here, takes your registration straight in, and lets you request a caddy by number.</p>
<p><a class="cta" href="/q/${c.venue}">Society days at ${esc(c.name)} →</a></p>
<p class="muted">Members use the MyCaddiPro app for registration, the live tee sheet, caddy booking, live scoring and results. <a href="/">Open the app</a>.</p>`;
    const jsonld = { '@context': 'https://schema.org', '@type': 'GolfCourse', name: c.name, url: SITE + path, ...(c.location ? { address: { '@type': 'PostalAddress', addressLocality: c.location, addressCountry: 'TH' } } : { address: { '@type': 'PostalAddress', addressCountry: 'TH' } }) };
    write(path, page({ path, title: `${c.name} — society days, scorecard and caddies | MyCaddiPro`, desc, h1: c.name, kicker: 'Golf course', lead, body, jsonld }));
}
// --- courses index
{
    const path = '/courses/'; urls.push(path);
    const cards = COURSES.map((c) => `<a class="card" href="/courses/${c.slug}/"><b>${esc(c.name)}</b><small>${esc(c.location || 'Thailand')} · par ${c.par}${c.patterns.length ? ` · ${c.patterns.map((p) => `${SOCIETIES.find((s) => s.db === p.soc)?.short || p.soc} ${WD[p.dow]}s`).join(', ')}` : ''}</small></a>`).join('');
    const desc = `${COURSES.length} golf courses around Pattaya, Chonburi and Rayong that the MyCaddiPro societies play: scorecards, yardage, society days and caddy requests.`;
    write(path, page({ path, title: 'Golf courses in Pattaya and the eastern seaboard | MyCaddiPro', desc, h1: 'Golf courses the societies play', kicker: 'Courses', lead: desc, body: `<div class="grid">${cards}</div>` }));
}
// --- society pages
for (const s of SOCIETIES) {
    const path = `/societies/${s.slug}/`; urls.push(path);
    const week = s.week.map((d) => `<tr><td>${WD[d.dow]}</td><td>${d.top.map(esc).join(', ')}</td><td>${d.n}</td></tr>`).join('');
    const up = s.upcoming.map((u) => `<tr><td>${nice(u.date)}</td><td>${esc(u.course)}</td><td>${u.tee ? h12(u.tee) : 'TBC'}</td></tr>`).join('');
    const courses = s.courses.map((c) => `<a class="card" href="/courses/${c.slug}/"><b>${esc(c.name)}</b><small>${esc(c.location || '')}</small></a>`).join('');
    const desc = `${s.name} (${s.short}): ${s.blurb} ${s.played ? `${s.played} society days in the last four months.` : ''}`;
    const body = `
${week ? `<h2>A typical week</h2><table><tr><th>Day</th><th>Where they usually play</th><th>Days (4 months)</th></tr>${week}</table>` : ''}
${up ? `<h2>Coming up</h2><table><tr><th>Date</th><th>Course</th><th>Tee</th></tr>${up}</table>` : ''}
${courses ? `<h2>Courses</h2><div class="grid">${courses}</div>` : ''}
<h2>Join a day</h2>
<p>Members register, see the tee sheet, book caddies and score live in the MyCaddiPro app. Visitors can register for a day at the course's venue page without installing anything.</p>
<p><a class="cta" href="/">Open MyCaddiPro →</a></p>`;
    const jsonld = { '@context': 'https://schema.org', '@type': 'SportsOrganization', name: s.name, alternateName: s.short, url: SITE + path, sport: 'Golf', location: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: 'Pattaya', addressCountry: 'TH' } } };
    write(path, page({ path, title: `${s.name} — golf society in Pattaya | MyCaddiPro`, desc, h1: s.name, kicker: 'Golf society', lead: s.blurb, body, jsonld }));
}
{
    const path = '/societies/'; urls.push(path);
    const cards = SOCIETIES.map((s) => `<a class="card" href="/societies/${s.slug}/"><b>${esc(s.name)}</b><small>${esc(s.blurb)}</small></a>`).join('');
    const desc = 'Golf societies in Pattaya that run their days on MyCaddiPro: schedules, courses, registration, tee sheets and live scoring.';
    write(path, page({ path, title: 'Golf societies in Pattaya | MyCaddiPro', desc, h1: 'Golf societies on MyCaddiPro', kicker: 'Societies', lead: desc, body: `<div class="grid">${cards}</div>` }));
}
// --- landing
{
    const path = '/about/'; urls.push(path);
    const roundsScored = (await rest('rounds?select=id&limit=1', ).catch(() => null)); // only for liveness; the real count is on the login page
    const nSoc = SOCIETIES.length, nCourses = COURSES.length;
    const desc = 'MyCaddiPro is the golf platform for Pattaya and the eastern seaboard: society registration, live tee sheets, caddy booking by number, live scoring, handicaps and results, on your phone.';
    const stats = `<div class="stats"><div class="stat"><b>${nCourses}</b><span>Courses</span></div><div class="stat"><b>${nSoc}</b><span>Societies</span></div><div class="stat"><b>${live.filter((e) => e.event_date < ISO(TODAY)).length}</b><span>Society days · 4 months</span></div></div>`;
    const body = `
<h2>What it does</h2>
<div class="grid">
<div class="card"><b>Society days</b><small>Register for a day in two taps, see who is playing, transport and fees. Organizers get registrations, pairings and a tee sheet that updates live.</small></div>
<div class="card"><b>Caddies by number</b><small>Request the caddy you want when you register. Pro shops run their caddy desk and tee sheet on the same data.</small></div>
<div class="card"><b>Live scoring</b><small>A paper-card view that fits one screen: scores, Stableford points, side games, leaderboards and results the moment the card is turned in.</small></div>
<div class="card"><b>Handicaps and results</b><small>Society and universal handicaps kept from scored rounds; results, order of merit and player of the year.</small></div>
<div class="card"><b>Pro shop and course staff</b><small>Live tee sheet, day view, quick find, caddy desk and a permanent venue QR for walk-in guests.</small></div>
<div class="card"><b>Four languages</b><small>English, Thai, Korean and Japanese throughout the app.</small></div>
</div>
<h2>Courses</h2><p>The societies play ${nCourses} courses around Pattaya, Chonburi and Rayong. Every course has its own page with the scorecard, yardage, who plays there and when, and a venue link for visitors.</p>
<div class="grid">${COURSES.slice(0, 8).map((c) => `<a class="card" href="/courses/${c.slug}/"><b>${esc(c.name)}</b><small>${esc(c.location || 'Thailand')} · par ${c.par}</small></a>`).join('')}</div>
<p><a href="/courses/">All courses →</a></p>
<h2>Societies</h2><div class="grid">${SOCIETIES.map((s) => `<a class="card" href="/societies/${s.slug}/"><b>${esc(s.name)}</b><small>${esc(s.blurb)}</small></a>`).join('')}</div>
<h2>Get the app</h2>
<p>MyCaddiPro runs in the browser and installs to the home screen on iPhone and Android. Sign in with LINE, Kakao or Google.</p>
<p><a class="cta" href="/">Open MyCaddiPro →</a></p>`;
    const jsonld = { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'MyCaddiPro', applicationCategory: 'SportsApplication', operatingSystem: 'iOS, Android, Web', url: SITE, description: desc, offers: { '@type': 'Offer', price: '0', priceCurrency: 'THB' }, publisher: { '@type': 'Organization', name: 'MyCaddiPro', url: SITE } };
    write(path, page({ path, title: 'MyCaddiPro — golf in Pattaya: societies, tee sheets, caddies and live scoring', desc, h1: 'Golf in Pattaya, run from your phone', kicker: 'MyCaddiPro', lead: desc, body, jsonld, stats }));
}
// --- sitemap + robots
const lastmod = ISO(TODAY);
writeFileSync(join(PUB, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    [['/', '1.0'], ['/about/', '0.9'], ...urls.filter((u) => u !== '/about/').map((u) => [u, u.split('/').length > 3 ? '0.7' : '0.8']), ['/privacy.html', '0.2']]
        .map(([u, p]) => `  <url><loc>${SITE}${u}</loc><lastmod>${lastmod}</lastmod><priority>${p}</priority></url>`).join('\n') + '\n</urlset>\n');
writeFileSync(join(PUB, 'robots.txt'), `User-agent: *
Allow: /
Disallow: /lab/
Disallow: /prototypes/
Disallow: /compacted/
Disallow: /login-showcase/
Disallow: /promo/
Disallow: /chat/
Disallow: /debug-login.html
Disallow: /clear.html
Disallow: /fix_
Disallow: /check_handicaps.html
Disallow: /admin-trgg-handicaps.html
Disallow: /proshop-teesheet.html
Disallow: /index.html.tmp
Sitemap: ${SITE}/sitemap.xml
`);
console.log(`built ${urls.length} pages + sitemap + robots → public/`);

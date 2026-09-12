#!/usr/bin/env node
// Exercises the real OffersInbox render path by EXTRACTING it from public/index.html —
// same approach as tools/course-match.test.js, so there is no second copy to drift.
// Run: node tools/offers-inbox.test.js
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','public','index.html'),'utf8');
const m=html.match(/const OffersInbox = \{[\s\S]*?\nwindow\.OffersInbox = OffersInbox;/);
if(!m){ console.error('FAIL: OffersInbox block not found'); process.exit(1); }

const els={};
function mk(id){ return { id, innerHTML:'', textContent:'', style:{}, classList:{ _s:new Set(),
  add(c){this._s.add(c)}, remove(c){this._s.delete(c)}, contains(c){return this._s.has(c)},
  toggle(c,f){ f?this._s.add(c):this._s.delete(c) } } }; }
const win={
  AppState:{ currentUser:{ lineUserId:'U-test', role:'golfer' } },
  localStorage:{ getItem:k=>k==='mci-pro-language'?'en':null, setItem(){} },
  document:{ getElementById:id=>(els[id]=els[id]||mk(id)), querySelectorAll:()=>[], querySelector:()=>null },
  CourseMatch:{ rows:()=>[{id:'phoenix_gold',name:'Phoenix Gold Golf & Country Club'}] },
  normalizeCourseName:n=>String(n||'').replace(/ Golf.*$/,''),
};
win.window=win;
let fails=0; const bad=s=>{console.log('  x '+s);fails++;};
new Function('window','document','localStorage','AppState','_lvLocale','NotificationManager','console',
  m[0]+'\nwindow.OffersInbox=OffersInbox;')(win,win.document,win.localStorage,win.AppState,()=>'en-US',{show(){}},console);
const OI=win.OffersInbox;

console.log('=== render: empty state ===');
OI.offers=[]; OI.follows=new Set(); OI.consent=false; OI.render();
let h=els['offers-list'].innerHTML;
if(!/No offers yet/.test(h)) bad('empty state missing'); else console.log('  OK empty state');
if(!/Instant alerts/.test(h)) bad('consent switch missing'); else console.log('  OK consent switch present, unchecked:', !/checked/.test(h));

console.log('\n=== render: one unread offer, not following ===');
OI.offers=[{id:'o1',course_id:'phoenix_gold',course_name:'Phoenix Gold',title:'Twilight 9',
  body:'900 THB after 3pm',cta_label:'Book',cta_target:'booking',priority:'normal',
  valid_to:'2026-12-01T00:00:00Z',_state:{}}];
OI.render(); h=els['offers-list'].innerHTML;
[['unread class','oi-card unread'],['course name','Phoenix Gold'],['title','Twilight 9'],
 ['CTA button',"OffersInbox.act('o1','booking')"],['Follow button','notifications_off'],
 ['Dismiss','Dismiss'],['expiry','until']].forEach(([label,needle])=>{
   if(h.includes(needle)) console.log('  OK '+label); else bad(label+' missing ('+needle+')');
});

console.log('\n=== CTA safety ===');
OI.offers[0].cta_target='definitely_not_a_tab'; OI.render();
if(/oi-btn primary/.test(els['offers-list'].innerHTML)) bad('unknown CTA target rendered a dead button');
else console.log('  OK unknown target -> no button at all');
OI.offers[0].cta_target='https://example.com/promo'; OI.render();
if(!/oi-btn primary/.test(els['offers-list'].innerHTML)) bad('url CTA not rendered'); else console.log('  OK url CTA rendered');

console.log('\n=== XSS: offer copy is course-authored, must be escaped ===');
OI.offers=[{id:'o2',course_id:'c',course_name:'<img src=x onerror=alert(1)>',
  title:'<script>alert(2)</script>',body:'"><b>bold</b>',cta_target:'',_state:{}}];
OI.render(); h=els['offers-list'].innerHTML;
const card = h.slice(h.indexOf('oi-card'));
console.log('  rendered card (verbatim):');
console.log('    ' + card.replace(/\s+/g,' ').slice(0,230));
// an ACTIVE tag from course-authored copy is the bug; the same characters escaped are fine
const active = /<script|<img|<b>/.test(card);
const escaped = card.includes('&lt;script&gt;') && card.includes('&lt;img') && card.includes('&lt;b&gt;');
if(active) bad('course copy produced a LIVE tag');
else console.log('  OK no live tag from course copy');
if(!escaped) bad('payloads not present in escaped form (check esc())');
else console.log('  OK all three payloads present but escaped');

console.log('\n=== localisation uses the offer’s own lang map ===');
win.localStorage.getItem=k=>k==='mci-pro-language'?'th':null;
OI.offers=[{id:'o3',course_id:'c',course_name:'X',title:'EN title',body:'EN body',
  lang:{th:{title:'TH title',body:'TH body'}},cta_target:'',_state:{}}];
OI.render(); h=els['offers-list'].innerHTML;
if(h.includes('TH title')&&h.includes('TH body')) console.log('  OK Thai copy used');
else bad('did not use the offer lang map');
win.localStorage.getItem=k=>k==='mci-pro-language'?'ja':null;
OI.render();
if(els['offers-list'].innerHTML.includes('EN title')) console.log('  OK falls back to base copy for a language with no translation');
else bad('no fallback for missing language');

console.log('\n=== followed-courses section ===');
OI.follows=new Set(['phoenix_gold']); OI.render();
if(/Courses you follow/.test(els['offers-list'].innerHTML)) console.log('  OK follow list shown');
else bad('follow list missing');

console.log('\n=== badge writes id AND class mirrors ===');
const seen=[];
win.document.querySelectorAll=sel=>{ seen.push(sel); return [mk('mirror')]; };
OI._setBadge('courseOffersBadge',3);
if(seen.includes('.courseOffersBadge')) console.log('  OK queried the class mirror too');
else bad('class mirrors not queried');
console.log(fails?`\nFAILED: ${fails}`:'\nALL UI TESTS PASSED');
process.exit(fails?1:0);

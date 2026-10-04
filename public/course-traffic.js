/* ============================================================================
   v1458 COURSE TRAFFIC — Google-Maps-traffic for pace of play (Pete 2026-10-04, mockups → "Go").
   Shared by the pro shop tee sheet (proshop-teesheet.html), the app (index.html: caddy master, organizer
   On-the-course board) and the caddy's job card (caddy-work.js).

   NO GPS. A group's position is the holes it has finished: public.round_hole_marks, written by
     * every live score a golfer enters (trigger scores_traffic), and
     * the caddy's one tap "Green done" (traffic_caddy_mark).
   Groups from both sources are merged when they share a player. One mark per group per hole (the first).
   Holes are coloured by the groups on them now (time on the hole vs the course target: par 3 = 11,
   par 4 = 14, par 5 = 17 min), bottlenecks are found from that, and the pro shop can nudge a group's caddies
   or send the marshal (traffic_nudge → a banner on the caddy's card). Live = realtime on the marks.
   Score entries typed in after the round (many holes within seconds) are not pace — they are filtered.
   ========================================================================= */
(function () {
  'use strict';
  if (window.CourseTraffic) return;
  const W = window;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const P = n => '<span class="material-symbols-outlined">' + n + '</span>';
  const PF = n => '<span class="material-symbols-outlined trf-f">' + n + '</span>';
  const TGT = par => par === 3 ? 11 : par >= 5 ? 17 : 14;
  const bkkDate = d => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d || new Date());
  const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const hm = ms => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' });
  const atTee = (date, t) => /^\d{1,2}:\d{2}/.test(String(t || '')) ? new Date(date + 'T' + String(t).slice(0, 5).padStart(5, '0') + ':00+07:00').getTime() : null;
  const dur = m => { const h = Math.floor(m / 60), r = Math.round(m % 60); return h ? h + 'h' + String(r).padStart(2, '0') : r + 'm'; };
  const sgn = v => (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(Math.round(v));

  /* ---------------------------------------------------------------- strings (4 languages) */
  const STR = {
    en: { title: 'Course traffic', live: 'LIVE', live2: 'Live', today: 'Today', days30: '30 days', onCourse: 'On course', groups: 'groups', avgPace: 'Avg pace', vsTarget: 'vs {t} target',
      bottleneck: 'Bottleneck', none: 'none', lastIn: 'Last group in', target: 'target {t}', reporting: 'Reporting', reportingSub: '{c} caddy · {s} scoring',
      front: 'FRONT 9', back: 'BACK 9', clubhouse: 'CLUBHOUSE', flowing: 'Flowing', slowing: 'Slowing', backed: 'Backed up', nodata: 'No groups yet', waitLeg: '⏸ = groups waiting on the tee',
      bnNow: 'Bottlenecks now', auto: 'auto-detected', bnBacked: 'Hole {h} — backed up', bnSlow: 'Hole {h} — slowing', bnSub: '{n} groups on it · {w} waiting · {m} min to play (target {t})',
      bnSub1: 'Group on it for {m} min (target {t})', minGroup: 'MIN / GROUP', why: 'Group {g} is {d} min behind target{gap} — groups behind it are waiting.', gapAhead: ' and {m} min behind the group ahead',
      quietT: '{g} — no update for {m} min', quietS: 'Last seen finishing hole {h}. No scores, no caddy tap.', quiet: 'QUIET',
      nudge: 'Nudge caddies', marshal: 'Send marshal', nudged: 'Sent to the caddies', marshalSent: 'Marshal sent — the caddies see it', justSent: 'Already sent a minute ago',
      noCaddy: 'No caddy in the app with this group — tell the marshal', groupsOn: 'Groups on course', holeMin: 'hole · min vs target', gap: 'gap ahead {m}m', wait: 'waiting',
      srcScore: 'scoring', srcCaddy: 'caddy', srcQuiet: 'quiet', done: 'In · {d}', minPerHole: 'Minutes per hole today', dashed: 'dashed = the course target',
      noGroups: 'No group is reporting from the course right now.', noGroupsSub: 'Positions come from golfers scoring in the app and from caddies tapping "Green done". No GPS.',
      finished: 'Finished today', roundTime: 'round', entered: 'scores typed in after the round — not used for pace',
      histT: 'Where it backs up', histSub: 'minutes over target, by hole', worst: 'Worst hole', next: 'Next worst', avgRound: 'Avg round', noHist: 'No live rounds here in the last 30 days.',
      replay: 'Replay — {d}', replaySub: '{n} groups scored live', tapDay: 'Tap a day to replay it', close: 'Close', noGps: 'No GPS. Positions come from score entries and one caddy tap at every green.',
      // caddy card
      cOn: 'On hole', cDone: 'Green done → {h}', cLast: 'Finish — last green', cStart: 'Where did your group start?', c1: '1st tee', c10: '10th tee', cHere: '{m} min here (target {t})',
      cHint: 'One tap when your group walks off each green. The pro shop sees it instantly.', cUndo: 'Tap again to undo hole {h}', cFinished: 'Round finished · {d}', cProshop: 'From the pro shop', cMarshal: 'The marshal is on the way to hole {h}',
      cNudge: 'Your group is {m} min behind. Please help keep it moving.', cNudgeNoMin: 'Please help your group keep up.', cFail: 'Not saved — try again', cPar: 'Par {p}' },
    th: { title: 'การจราจรในสนาม', live: 'สด', live2: 'สด', today: 'วันนี้', days30: '30 วัน', onCourse: 'ในสนาม', groups: 'กลุ่ม', avgPace: 'ความเร็วเฉลี่ย', vsTarget: 'เทียบเป้า {t}',
      bottleneck: 'จุดติดขัด', none: 'ไม่มี', lastIn: 'กลุ่มสุดท้ายเข้า', target: 'เป้า {t}', reporting: 'กำลังรายงาน', reportingSub: 'แคดดี้ {c} · สกอร์ {s}',
      front: 'หน้า 9', back: 'หลัง 9', clubhouse: 'คลับเฮาส์', flowing: 'ลื่นไหล', slowing: 'เริ่มช้า', backed: 'ติดขัด', nodata: 'ยังไม่มีกลุ่ม', waitLeg: '⏸ = กลุ่มรอที่แท่นที',
      bnNow: 'จุดติดขัดตอนนี้', auto: 'ตรวจอัตโนมัติ', bnBacked: 'หลุม {h} — ติดขัด', bnSlow: 'หลุม {h} — เริ่มช้า', bnSub: '{n} กลุ่ม · รอ {w} · ใช้ {m} นาที (เป้า {t})',
      bnSub1: 'กลุ่มอยู่หลุมนี้ {m} นาที (เป้า {t})', minGroup: 'นาที / กลุ่ม', why: 'กลุ่ม {g} ช้ากว่าเป้า {d} นาที{gap} — กลุ่มข้างหลังต้องรอ', gapAhead: ' และห่างกลุ่มหน้า {m} นาที',
      quietT: '{g} — ไม่มีอัปเดต {m} นาที', quietS: 'เห็นล่าสุดจบหลุม {h} ไม่มีสกอร์ แคดดี้ไม่ได้แตะ', quiet: 'เงียบ',
      nudge: 'เตือนแคดดี้', marshal: 'ส่งมาร์แชล', nudged: 'ส่งถึงแคดดี้แล้ว', marshalSent: 'ส่งมาร์แชลแล้ว — แคดดี้เห็นแล้ว', justSent: 'เพิ่งส่งไปเมื่อสักครู่',
      noCaddy: 'กลุ่มนี้ไม่มีแคดดี้ในแอป — แจ้งมาร์แชล', groupsOn: 'กลุ่มในสนาม', holeMin: 'หลุม · นาทีเทียบเป้า', gap: 'ห่างกลุ่มหน้า {m} นาที', wait: 'รอ',
      srcScore: 'สกอร์', srcCaddy: 'แคดดี้', srcQuiet: 'เงียบ', done: 'เข้าแล้ว · {d}', minPerHole: 'นาทีต่อหลุมวันนี้', dashed: 'เส้นประ = เป้าของสนาม',
      noGroups: 'ตอนนี้ไม่มีกลุ่มรายงานจากสนาม', noGroupsSub: 'ตำแหน่งมาจากนักกอล์ฟที่บันทึกสกอร์ในแอป และแคดดี้ที่แตะ "จบกรีน" ไม่ใช้ GPS',
      finished: 'จบรอบวันนี้', roundTime: 'รอบ', entered: 'กรอกสกอร์หลังจบรอบ — ไม่นำมาคิดความเร็ว',
      histT: 'จุดที่ติดขัดบ่อย', histSub: 'นาทีที่เกินเป้า แยกตามหลุม', worst: 'หลุมแย่สุด', next: 'รองลงมา', avgRound: 'รอบเฉลี่ย', noHist: 'ไม่มีรอบสดที่นี่ใน 30 วันที่ผ่านมา',
      replay: 'ย้อนดู — {d}', replaySub: '{n} กลุ่มบันทึกสด', tapDay: 'แตะวันเพื่อย้อนดู', close: 'ปิด', noGps: 'ไม่ใช้ GPS ตำแหน่งมาจากการบันทึกสกอร์และการแตะของแคดดี้ทุกกรีน',
      cOn: 'อยู่หลุม', cDone: 'จบกรีน → {h}', cLast: 'จบ — กรีนสุดท้าย', cStart: 'กลุ่มเริ่มที่ไหน?', c1: 'ทีหลุม 1', c10: 'ทีหลุม 10', cHere: 'อยู่ {m} นาที (เป้า {t})',
      cHint: 'แตะหนึ่งครั้งเมื่อกลุ่มเดินออกจากแต่ละกรีน โปรช็อปเห็นทันที', cUndo: 'แตะอีกครั้งเพื่อยกเลิกหลุม {h}', cFinished: 'จบรอบ · {d}', cProshop: 'จากโปรช็อป', cMarshal: 'มาร์แชลกำลังไปหลุม {h}',
      cNudge: 'กลุ่มของคุณช้า {m} นาที ช่วยให้เดินเร็วขึ้นด้วย', cNudgeNoMin: 'ช่วยให้กลุ่มเดินทันด้วย', cFail: 'บันทึกไม่สำเร็จ — ลองอีกครั้ง', cPar: 'พาร์ {p}' },
    ko: { title: '코스 교통', live: '실시간', live2: '실시간', today: '오늘', days30: '30일', onCourse: '코스 위', groups: '팀', avgPace: '평균 속도', vsTarget: '목표 {t} 대비',
      bottleneck: '정체 구간', none: '없음', lastIn: '마지막 팀 도착', target: '목표 {t}', reporting: '보고 중', reportingSub: '캐디 {c} · 스코어 {s}',
      front: '전반 9', back: '후반 9', clubhouse: '클럽하우스', flowing: '원활', slowing: '느려짐', backed: '정체', nodata: '아직 팀 없음', waitLeg: '⏸ = 티에서 대기 중인 팀',
      bnNow: '현재 정체 구간', auto: '자동 감지', bnBacked: '{h}번 홀 — 정체', bnSlow: '{h}번 홀 — 느려짐', bnSub: '{n}팀 · {w}팀 대기 · {m}분 소요 (목표 {t})',
      bnSub1: '이 홀에 {m}분 (목표 {t})', minGroup: '분 / 팀', why: '{g} 팀이 목표보다 {d}분 늦습니다{gap} — 뒤 팀들이 기다리고 있습니다.', gapAhead: ', 앞 팀과 {m}분 차이',
      quietT: '{g} — {m}분 동안 업데이트 없음', quietS: '마지막으로 {h}번 홀 종료. 스코어도 캐디 탭도 없음.', quiet: '조용',
      nudge: '캐디에게 알림', marshal: '마샬 보내기', nudged: '캐디에게 전달됨', marshalSent: '마샬 출동 — 캐디가 확인', justSent: '방금 보냈습니다',
      noCaddy: '이 팀에는 앱을 쓰는 캐디가 없습니다 — 마샬에게 알리세요', groupsOn: '코스 위 팀', holeMin: '홀 · 목표 대비 분', gap: '앞 팀과 {m}분', wait: '대기',
      srcScore: '스코어', srcCaddy: '캐디', srcQuiet: '조용', done: '도착 · {d}', minPerHole: '오늘 홀별 소요 시간', dashed: '점선 = 골프장 목표',
      noGroups: '지금 코스에서 보고 중인 팀이 없습니다.', noGroupsSub: '위치는 앱에서 스코어를 입력하는 골퍼와 "그린 완료"를 누르는 캐디로부터 옵니다. GPS 없음.',
      finished: '오늘 종료', roundTime: '라운드', entered: '라운드 후 입력된 스코어 — 속도 계산 제외',
      histT: '정체가 생기는 곳', histSub: '홀별 목표 초과 시간', worst: '최악의 홀', next: '다음', avgRound: '평균 라운드', noHist: '최근 30일 이곳의 실시간 라운드가 없습니다.',
      replay: '다시 보기 — {d}', replaySub: '{n}팀 실시간 기록', tapDay: '날짜를 눌러 다시 보기', close: '닫기', noGps: 'GPS 없음. 위치는 스코어 입력과 매 그린 캐디의 한 번 탭으로 옵니다.',
      cOn: '현재 홀', cDone: '그린 완료 → {h}', cLast: '종료 — 마지막 그린', cStart: '어디서 시작했나요?', c1: '1번 티', c10: '10번 티', cHere: '{m}분 경과 (목표 {t})',
      cHint: '팀이 그린을 떠날 때 한 번 누르세요. 프로샵이 바로 봅니다.', cUndo: '한 번 더 누르면 {h}번 홀 취소', cFinished: '라운드 종료 · {d}', cProshop: '프로샵에서', cMarshal: '마샬이 {h}번 홀로 가고 있습니다',
      cNudge: '팀이 {m}분 늦었습니다. 진행을 도와주세요.', cNudgeNoMin: '팀이 따라가도록 도와주세요.', cFail: '저장 실패 — 다시 시도하세요', cPar: '파 {p}' },
    ja: { title: 'コース渋滞', live: 'ライブ', live2: 'ライブ', today: '今日', days30: '30日', onCourse: 'コース上', groups: '組', avgPace: '平均ペース', vsTarget: '目標 {t} 比',
      bottleneck: '渋滞ホール', none: 'なし', lastIn: '最終組の上がり', target: '目標 {t}', reporting: '報告中', reportingSub: 'キャディ {c} · スコア {s}',
      front: 'アウト', back: 'イン', clubhouse: 'クラブハウス', flowing: '順調', slowing: '遅れ気味', backed: '渋滞', nodata: 'まだ組なし', waitLeg: '⏸ = ティーで待っている組',
      bnNow: '今の渋滞', auto: '自動検出', bnBacked: '{h}番 — 渋滞', bnSlow: '{h}番 — 遅れ気味', bnSub: '{n}組 · {w}組待ち · {m}分 (目標 {t})',
      bnSub1: 'この組は{m}分 (目標 {t})', minGroup: '分 / 組', why: '{g}の組が目標より{d}分遅れ{gap} — 後ろの組が待っています。', gapAhead: '、前の組と{m}分差',
      quietT: '{g} — {m}分更新なし', quietS: '最後は{h}番終了。スコアもキャディのタップもなし。', quiet: '静か',
      nudge: 'キャディに通知', marshal: 'マーシャルを送る', nudged: 'キャディに送信しました', marshalSent: 'マーシャル出動 — キャディに表示', justSent: 'さっき送りました',
      noCaddy: 'この組にアプリのキャディがいません — マーシャルに伝えてください', groupsOn: 'コース上の組', holeMin: 'ホール · 目標比', gap: '前の組と{m}分', wait: '待ち',
      srcScore: 'スコア', srcCaddy: 'キャディ', srcQuiet: '静か', done: '上がり · {d}', minPerHole: '今日のホール別所要時間', dashed: '点線 = コースの目標',
      noGroups: '今コースから報告している組はありません。', noGroupsSub: '位置はアプリでスコアを入力するゴルファーと「グリーン完了」を押すキャディから。GPSなし。',
      finished: '今日終了', roundTime: 'ラウンド', entered: 'ラウンド後に入力されたスコア — ペースには使いません',
      histT: '渋滞する場所', histSub: 'ホール別の目標超過分', worst: '最悪ホール', next: '次点', avgRound: '平均ラウンド', noHist: '過去30日間ここでのライブラウンドはありません。',
      replay: 'リプレイ — {d}', replaySub: '{n}組がライブ入力', tapDay: '日付をタップしてリプレイ', close: '閉じる', noGps: 'GPSなし。位置はスコア入力と各グリーンでのキャディのワンタップから。',
      cOn: '現在のホール', cDone: 'グリーン完了 → {h}', cLast: '終了 — 最終グリーン', cStart: 'どこからスタート？', c1: '1番ティー', c10: '10番ティー', cHere: '{m}分経過 (目標 {t})',
      cHint: '組がグリーンを離れたら一回タップ。プロショップにすぐ表示されます。', cUndo: 'もう一度タップで{h}番を取り消し', cFinished: 'ラウンド終了 · {d}', cProshop: 'プロショップから', cMarshal: 'マーシャルが{h}番に向かっています',
      cNudge: '組が{m}分遅れています。進行をお願いします。', cNudgeNoMin: '組の進行をお願いします。', cFail: '保存できませんでした — もう一度', cPar: 'パー{p}' }
  };
  function lang() {
    try { const a = localStorage.getItem('mci-pro-language') || localStorage.getItem('teesheet.lang'); if (STR[a]) return a; } catch (e) {}
    return 'en';
  }
  function T(k, vars) {
    let s = (STR[lang()] && STR[lang()][k]) || STR.en[k] || k;
    Object.keys(vars || {}).forEach(v => { s = s.split('{' + v + '}').join(vars[v]); });
    return s;
  }

  /* ---------------------------------------------------------------- engine (pure — testable) */
  // marks: [{d,k,h,at,s,t,n,l,p}] → merged groups for one day
  function mergeGroups(marks) {
    const byKey = {};
    marks.forEach(m => { (byKey[m.k] = byKey[m.k] || []).push(m); });
    const keys = Object.keys(byKey), parent = {};
    const find = x => parent[x] === x ? x : (parent[x] = find(parent[x]));
    keys.forEach(k => { parent[k] = k; });
    const byPlayer = {};
    keys.forEach(k => byKey[k].forEach(m => (Array.isArray(m.p) ? m.p : []).forEach(pid => {
      if (!pid) return;
      if (byPlayer[pid] && find(byPlayer[pid]) !== find(k)) parent[find(k)] = find(byPlayer[pid]);
      else if (!byPlayer[pid]) byPlayer[pid] = k;
    })));
    const out = {};
    keys.forEach(k => { const r = find(k); (out[r] = out[r] || []).push(k); });
    return Object.values(out).map(ks => {
      const ms = ks.reduce((a, k) => a.concat(byKey[k]), []).sort((a, b) => new Date(a.at) - new Date(b.at));
      const holes = {};
      ms.forEach(m => { const t = new Date(m.at).getTime(); if (!holes[m.h] || t < holes[m.h].t) holes[m.h] = { t, s: m.s }; });
      const players = Array.from(new Set(ms.reduce((a, m) => a.concat(Array.isArray(m.p) ? m.p : []), [])));
      const tee = (ms.find(m => /caddy/.test(m.s) && m.t) || ms.find(m => m.t) || {}).t || null;
      const label = (ms.find(m => m.s === 'caddy' && m.l) || ms.find(m => m.l) || {}).l || '';
      const startMark = ms.find(m => m.n === 'back' || m.n === 'front');
      return { keys: ks, marks: ms, holes, players, tee, label, sources: Array.from(new Set(ms.map(m => m.s))), startHint: startMark ? startMark.n : null,
        caddyKey: ks.find(k => /^(cj|bk|ev):/.test(k)) || null };
    });
  }
  function analyse(day, marks, pars, now) {
    const target = h => TGT(pars[h - 1] || 4);
    const groups = mergeGroups(marks.filter(m => m.d === day));
    groups.forEach(g => {
      const hs = Object.keys(g.holes).map(Number);
      const first = hs.slice().sort((a, b) => g.holes[a].t - g.holes[b].t)[0];
      const back = g.startHint ? g.startHint === 'back' : (first >= 10 && !hs.some(h => h < 10 && g.holes[h].t < g.holes[first].t));
      g.order = back ? [10, 11, 12, 13, 14, 15, 16, 17, 18, 1, 2, 3, 4, 5, 6, 7, 8, 9] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
      g.back = back;
      // played holes in order; durations; typed-in-afterwards detection
      const seq = g.order.filter(h => g.holes[h]);
      let prev = null, prevBurst = false; g.dur = {}; g.burst = 0;
      // the tee time is only trusted when hole 1 of the order finished a believable time after it — a group that
      // starts the app mid-round carries a "tee" that is really the moment the app was opened
      let teeMs = atTee(day, g.tee);
      if (teeMs && seq.length) {
        const upTo = g.order.slice(0, g.order.indexOf(seq[0]) + 1).reduce((a, h) => a + target(h), 0);
        if ((g.holes[seq[0]].t - teeMs) / 60000 < upTo * 0.6) teeMs = null;
      }
      g.teeMs = teeMs;
      seq.forEach((h, i) => {
        const t = g.holes[h].t;
        let burst = false;
        if (prev != null) {
          const m = (t - prev) / 60000;
          if (m < 1.5 && g.holes[h].s === 'score') { g.burst++; burst = true; }
          else if (!prevBurst && m > 0 && m < 60) g.dur[h] = m;   // a hole right after typed-in holes is not a real time either
        }   // the opening hole is never timed: there is no tee-off signal (an app start or a booked time is not when they hit)
        prev = t; prevBurst = burst;
      });
      g.trailingBurst = prevBurst;
      g.typedIn = seq.length >= 6 && g.burst >= Math.max(4, Math.floor(seq.length * 0.5));
      const last = seq.length ? g.holes[seq[seq.length - 1]].t : null;
      g.lastT = last;
      g.done = seq.length >= 18 || (seq.length && g.order.indexOf(seq[seq.length - 1]) === 17);
      g.cur = g.done ? null : g.order[g.order.indexOf(seq.length ? seq[seq.length - 1] : g.order[0]) + (seq.length ? 1 : 0)];
      g.played = seq.length;
      // no trusted tee: anchor on the LAST hole of any typed-together opening run (holes 1+2 entered at once)
      let anc = 0; while (anc + 1 < seq.length && (g.holes[seq[anc + 1]].t - g.holes[seq[anc]].t) / 60000 < 1.5) anc++;
      const start = teeMs ? teeMs : (seq.length ? g.holes[seq[anc]].t - g.order.slice(0, g.order.indexOf(seq[anc]) + 1).reduce((a, h) => a + target(h), 0) * 60000 : null);
      g.startT = start;
      const sumT = seq.reduce((a, h) => a + target(h), 0);
      g.delta = last != null && start != null ? (last - start) / 60000 - sumT : 0;
      g.onHole = last != null && !g.done ? (now - last) / 60000 : 0;
      if (!g.done && g.cur && g.onHole > target(g.cur)) g.delta += g.onHole - target(g.cur);   // still on it past its target
      g.roundMin = g.done && start != null && teeMs && !g.trailingBurst ? (last - start) / 60000 : null;
      g.quiet = !g.done && last != null && (now - last) / 60000 > 25;
      g.gone = !g.done && last != null && (now - last) / 60000 > 120;
    });
    const live = groups.filter(g => !g.typedIn && !g.done && !g.gone && g.played > 0);
    // live occupancy per hole
    const on = {};
    live.forEach(g => { if (g.cur && !g.quiet) (on[g.cur] = on[g.cur] || []).push(g); });
    // today's durations per hole (live-entered only)
    const durs = {};
    groups.filter(g => !g.typedIn).forEach(g => Object.keys(g.dur).forEach(h => (durs[h] = durs[h] || []).push(g.dur[h])));
    const holes = {};
    for (let h = 1; h <= 18; h++) {
      const t = target(h), here = (on[h] || []).sort((a, b) => b.onHole - a.onHole);
      const arr = durs[h] || [], avg = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
      let st = 'n';
      const lead = here.slice().sort((x, y) => x.lastT - y.lastT)[0];   // the group that got there first
      if (here.length >= 3) st = 'r';
      else if (here.length === 2) st = lead.onHole > t ? 'r' : 'a';    // a group waiting: backed up once the front one is over its time
      else if (here.length === 1) st = here[0].onHole > t + 5 ? 'r' : here[0].onHole > t + 2 ? 'a' : 'g';
      else if (avg != null) st = avg - t >= 4 ? 'r' : avg - t >= 2 ? 'a' : 'g';
      holes[h] = { h, par: pars[h - 1] || 4, target: t, here, avg, n: arr.length, st, live: here.length > 0 };
    }
    // the group ahead on the same hole order (for gaps): the latest group to finish this group's current hole before it
    live.forEach(g => {
      const prevHole = g.order[g.order.indexOf(g.cur) - 1];
      if (!prevHole) { g.gapAhead = null; return; }
      const mine = g.holes[prevHole] && g.holes[prevHole].t;
      let best = null;
      groups.forEach(o => { if (o === g || !o.holes[prevHole]) return; const t = o.holes[prevHole].t; if (t < mine && (best == null || t > best)) best = t; });
      g.gapAhead = best != null ? (mine - best) / 60000 : null;
    });
    // bottlenecks: backed-up holes first, then slowing, then quiet groups
    const bns = [];
    Object.values(holes).filter(x => x.live && (x.st === 'r' || x.st === 'a')).sort((a, b) => (b.st === 'r') - (a.st === 'r') || b.here.length - a.here.length || b.here[0].onHole - a.here[0].onHole).forEach(x => {
      const front = x.here.slice().sort((a, b) => a.lastT - b.lastT)[0];   // the group that got there first is the plug
      const cause = x.here.slice().sort((a, b) => b.delta - a.delta)[0];
      bns.push({ type: 'hole', hole: x, front, cause, waiting: Math.max(0, x.here.length - 1), over: front.onHole - x.target });
    });
    groups.filter(g => g.quiet && !g.gone && !g.typedIn).forEach(g => bns.push({ type: 'quiet', group: g }));
    const kpi = {
      on: live.length, players: live.reduce((a, g) => a + Math.max(g.players.length, 1), 0),
      avg: live.length ? live.reduce((a, g) => a + g.delta, 0) / live.length : null,
      worst: bns.find(b => b.type === 'hole') || null,
      caddy: live.filter(g => g.sources.includes('caddy')).length, score: live.filter(g => !g.sources.includes('caddy')).length,
      lastIn: null, lastTarget: null
    };
    const latest = live.slice().sort((a, b) => (b.startT || 0) - (a.startT || 0))[0];
    if (latest && latest.cur) {
      const rest = latest.order.slice(latest.order.indexOf(latest.cur)).reduce((a, h) => a + target(h), 0);
      kpi.lastIn = latest.lastT + (rest + Math.max(0, latest.delta)) * 60000;
      kpi.lastTarget = latest.startT != null ? latest.startT + latest.order.reduce((a, h) => a + target(h), 0) * 60000 : null;
    }
    return { day, groups, live, holes, bns, kpi, totalTarget: Array.from({ length: 18 }, (_, i) => target(i + 1)).reduce((a, b) => a + b, 0) };
  }

  /* ---------------------------------------------------------------- data */
  const sb = () => (W.SupabaseDB && W.SupabaseDB.client) || W.__trafficSb || null;
  const S = { slug: null, name: '', look: null, view: 'live', day: null, data: null, hist: null, histDay: null, chan: null, tick: null, seq: 0, by: 'Pro shop' };
  async function fetchDay(slug, from, to) {
    const c = sb(); if (!c) throw new Error('offline');
    const { data, error } = await c.rpc('traffic_marks', { p_slug: slug, p_from: from, p_to: to });
    if (error) throw error;
    return data || { pars: [], marks: [], nudges: [] };
  }

  /* ---------------------------------------------------------------- the course map (two loops) */
  const COL = { g: '#22c55e', a: '#f59e0b', r: '#ef4444', n: '#94a3b8' };
  function mapSVG(A, w, h, big) {
    const cx = w / 2, cy = h * 0.55;
    const loop = (ox, dir) => { const pts = []; for (let i = 0; i <= 9; i++) { const a = Math.PI * 0.5 + dir * (i / 9) * Math.PI * 2 * 0.92 + dir * 0.18; pts.push([ox + Math.cos(a) * w * 0.195, cy + Math.sin(a) * h * 0.37]); } return pts; };
    const L = loop(cx - w * 0.245, 1), R = loop(cx + w * 0.245, -1);
    let s = '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" style="display:block" role="img" aria-label="' + esc(T('title')) + '">';
    s += '<defs><filter id="trfSh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-opacity=".35"/></filter></defs>';
    s += '<ellipse cx="' + (cx - w * .245) + '" cy="' + cy + '" rx="' + w * .225 + '" ry="' + h * .41 + '" fill="var(--trf-grass)"/><ellipse cx="' + (cx + w * .245) + '" cy="' + cy + '" rx="' + w * .225 + '" ry="' + h * .41 + '" fill="var(--trf-grass)"/>';
    s += '<g transform="translate(' + cx + ',' + (h * .93) + ')"><rect x="-38" y="-12" width="76" height="22" rx="7" fill="var(--trf-card)" stroke="var(--trf-chipLine)"/><text y="4" text-anchor="middle" font-size="9" font-weight="800" fill="var(--trf-sub)" font-family="Inter,sans-serif">' + esc(T('clubhouse')) + '</text></g>';
    const segs = {};
    const seg = (a, b, hn) => {
      const x = A.holes[hn], c = COL[x.st];
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, k = 0.12, nx = -(b[1] - a[1]) * k, ny = (b[0] - a[0]) * k;
      const d = 'M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + ' Q' + (mx + nx).toFixed(1) + ' ' + (my + ny).toFixed(1) + ' ' + b[0].toFixed(1) + ' ' + b[1].toFixed(1);
      let g = '<g class="trf-hole" data-trf-hole="' + hn + '"><path d="' + d + '" stroke="var(--trf-road)" stroke-width="' + (big ? 15 : 12) + '" fill="none" stroke-linecap="round"/>';
      g += '<path d="' + d + '" stroke="' + c + '" stroke-width="' + (big ? 9 : 7) + '" fill="none" stroke-linecap="round" opacity="' + (x.live || x.st === 'n' ? 1 : .55) + '"/>';
      const tt = 0.16, tx = (1 - tt) * (1 - tt) * a[0] + 2 * (1 - tt) * tt * (mx + nx) + tt * tt * b[0], ty = (1 - tt) * (1 - tt) * a[1] + 2 * (1 - tt) * tt * (my + ny) + tt * tt * b[1];
      g += '<g transform="translate(' + tx.toFixed(1) + ',' + ty.toFixed(1) + ')"><circle r="' + (big ? 11 : 9) + '" fill="var(--trf-card)" stroke="' + c + '" stroke-width="2"/><text y="' + (big ? 4 : 3.4) + '" text-anchor="middle" font-size="' + (big ? 10.5 : 9) + '" font-weight="800" fill="var(--trf-ink)" font-family="JetBrains Mono,monospace">' + hn + '</text></g>';
      g += '<g transform="translate(' + b[0].toFixed(1) + ',' + b[1].toFixed(1) + ')"><line x1="0" y1="0" x2="0" y2="-9" stroke="var(--trf-sub)" stroke-width="1.3"/><path d="M0 -9 L6 -7 L0 -5 Z" fill="#ef4444"/></g></g>';
      segs[hn] = { a, b, mx: mx + nx, my: my + ny };
      return g;
    };
    for (let i = 0; i < 9; i++) s += seg(L[i], L[i + 1], i + 1);
    for (let i = 0; i < 9; i++) s += seg(R[i], R[i + 1], i + 10);
    const qpt = (o, t) => [(1 - t) * (1 - t) * o.a[0] + 2 * (1 - t) * t * o.mx + t * t * o.b[0], (1 - t) * (1 - t) * o.a[1] + 2 * (1 - t) * t * o.my + t * t * o.b[1]];
    Object.values(A.holes).forEach(x => {
      if (!x.here.length) return;
      const o = segs[x.h];
      const lead = x.here.slice().sort((a, b) => a.lastT - b.lastT)[0];
      x.here.forEach(g => {
        if (g !== lead) return;
        const p = qpt(o, Math.max(.42, Math.min(.9, .42 + Math.min(1, g.onHole / x.target) * .48)));
        const c = g.delta >= 9 ? COL.r : g.delta >= 5 ? COL.a : COL.g;
        s += '<g transform="translate(' + p[0].toFixed(1) + ',' + p[1].toFixed(1) + ')" filter="url(#trfSh)"><circle r="' + (big ? 9 : 7.5) + '" fill="#fff" stroke="' + c + '" stroke-width="3"/><circle r="' + (big ? 3.5 : 3) + '" fill="' + c + '"/></g>';
        if (big && g.tee) s += '<text x="' + (p[0] + 12).toFixed(1) + '" y="' + (p[1] - 8).toFixed(1) + '" font-size="10" font-weight="800" fill="var(--trf-ink)" font-family="JetBrains Mono,monospace">' + esc(g.tee) + '</text>';
      });
      const waiting = x.here.length - 1;
      if (waiting > 0) {
        const p = o.a, lc = x.h >= 10 ? [cx + w * .245, cy] : [cx - w * .245, cy];
        const vx = p[0] - lc[0], vy = p[1] - lc[1], vl = Math.hypot(vx, vy) || 1, px = p[0] + vx / vl * 26, py = p[1] + vy / vl * 18;
        s += '<line x1="' + p[0].toFixed(1) + '" y1="' + p[1].toFixed(1) + '" x2="' + px.toFixed(1) + '" y2="' + py.toFixed(1) + '" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="2 2"/>';
        s += '<g transform="translate(' + px.toFixed(1) + ',' + py.toFixed(1) + ')" filter="url(#trfSh)"><rect x="-17" y="-11" width="34" height="22" rx="11" fill="#ef4444"/><text y="4" text-anchor="middle" font-size="10.5" font-weight="900" fill="#fff" font-family="Inter,sans-serif">+' + waiting + ' ⏸</text></g>';
      }
    });
    // quiet groups: grey dot where they were last seen
    A.live.filter(g => g.quiet && g.cur).forEach(g => {
      const o = segs[g.cur]; if (!o) return; const p = qpt(o, .3);
      s += '<g transform="translate(' + p[0].toFixed(1) + ',' + p[1].toFixed(1) + ')" filter="url(#trfSh)"><circle r="' + (big ? 8 : 7) + '" fill="#fff" stroke="#94a3b8" stroke-width="3"/></g>';
    });
    s += '<text x="' + (cx - w * .245) + '" y="' + (h * .1) + '" text-anchor="middle" font-size="10" font-weight="900" letter-spacing="1.5" fill="var(--trf-mute)" font-family="Inter,sans-serif">' + esc(T('front')) + '</text>';
    s += '<text x="' + (cx + w * .245) + '" y="' + (h * .1) + '" text-anchor="middle" font-size="10" font-weight="900" letter-spacing="1.5" fill="var(--trf-mute)" font-family="Inter,sans-serif">' + esc(T('back')) + '</text>';
    return s + '</svg>';
  }

  /* ---------------------------------------------------------------- css */
  function css() {
    if (document.getElementById('trfCss')) return;
    const st = document.createElement('style'); st.id = 'trfCss';
    st.textContent = `
#trafficOverlay{position:fixed;inset:0;z-index:10070;overflow-y:auto;-webkit-overflow-scrolling:touch;font-family:Inter,system-ui,sans-serif;
  --trf-bg:#f3f5f4;--trf-card:#fff;--trf-card2:#f8fafc;--trf-ink:#0f172a;--trf-sub:#334155;--trf-mute:#64748b;--trf-line:#e2e8f0;--trf-chip:#fff;--trf-chipLine:#d1d5db;--trf-acc:#16a34a;--trf-shadow:0 4px 14px rgba(15,23,42,.07);--trf-road:#e2e8f0;--trf-map:#ecfdf3;--trf-grass:#dcfce7;--trf-hdr:#fff;
  background:var(--trf-bg);color:var(--trf-ink)}
#trafficOverlay[data-look=dark]{--trf-bg:#0b1220;--trf-card:#131c2e;--trf-card2:#0f1727;--trf-ink:#f8fafc;--trf-sub:#e2e8f0;--trf-mute:#94a3b8;--trf-line:rgba(148,163,184,.2);--trf-chip:#162036;--trf-chipLine:rgba(148,163,184,.28);--trf-acc:#22c55e;--trf-shadow:none;--trf-road:#1e293b;--trf-map:#0d1a14;--trf-grass:#12261a;--trf-hdr:#0f172a}
#trafficOverlay[data-look=glass]{--trf-bg:#0d2016;--trf-card:rgba(255,255,255,.085);--trf-card2:rgba(255,255,255,.06);--trf-ink:#f1f5f9;--trf-sub:#e2f0ce;--trf-mute:rgba(226,240,206,.8);--trf-line:rgba(255,255,255,.16);--trf-chip:rgba(255,255,255,.08);--trf-chipLine:rgba(255,255,255,.22);--trf-acc:#22c55e;--trf-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 10px 28px rgba(0,0,0,.28);--trf-road:rgba(255,255,255,.12);--trf-map:rgba(8,30,18,.55);--trf-grass:rgba(34,197,94,.10);--trf-hdr:rgba(8,19,14,.7);
  background:radial-gradient(120% 45% at 8% 0%,rgba(251,146,60,.28),transparent 60%),radial-gradient(90% 40% at 95% 35%,rgba(34,197,94,.22),transparent 60%),linear-gradient(170deg,#08130e 0%,#0d2016 50%,#132313 100%) fixed}
#trafficOverlay[data-look=glass] .trf-gl{backdrop-filter:blur(18px) saturate(1.2);-webkit-backdrop-filter:blur(18px) saturate(1.2)}
#trafficOverlay .material-symbols-outlined,.trf-cad .material-symbols-outlined{font-variation-settings:'FILL' 0,'wght' 500;line-height:1}
#trafficOverlay .trf-f,.trf-cad .trf-f{font-variation-settings:'FILL' 1,'wght' 500}
#trafficOverlay button{font-family:inherit;cursor:pointer}
.trf-in{max-width:1320px;margin:0 auto;padding:10px 14px calc(90px + env(safe-area-inset-bottom,0px))}
.trf-top{position:sticky;top:0;z-index:3;display:flex;align-items:center;gap:10px;padding:calc(env(safe-area-inset-top,0px) + 10px) 14px 10px;background:var(--trf-hdr);border-bottom:1px solid var(--trf-line)}
.trf-x{width:40px;height:40px;border-radius:50%;background:var(--trf-card);border:1px solid var(--trf-chipLine);display:flex;align-items:center;justify-content:center;color:var(--trf-ink);flex:none}
.trf-tt{flex:1;min-width:0}
.trf-tt b{display:block;font-size:19px;font-weight:900;letter-spacing:-.02em;line-height:1.05;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.trf-tt span{display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--trf-mute);font-weight:700;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.trf-livedot{width:8px;height:8px;border-radius:50%;background:#ef4444;box-shadow:0 0 0 3px rgba(239,68,68,.25);flex:none}
.trf-looks{display:flex;background:var(--trf-chip);border:1px solid var(--trf-chipLine);border-radius:999px;padding:3px;gap:2px;flex:none}
.trf-looks button{width:30px;height:28px;border-radius:999px;border:0;background:transparent;color:var(--trf-mute);display:flex;align-items:center;justify-content:center}
.trf-looks button .material-symbols-outlined{font-size:16px}
.trf-looks button.on{background:var(--trf-acc);color:#fff}
.trf-seg{display:flex;background:var(--trf-chip);border:1px solid var(--trf-chipLine);border-radius:999px;padding:3px;margin:10px 0}
.trf-seg button{flex:1;border:0;background:transparent;color:var(--trf-mute);font-weight:800;font-size:13px;padding:8px 6px;border-radius:999px}
.trf-seg button.on{background:var(--trf-ink);color:var(--trf-bg)}
#trafficOverlay[data-look=glass] .trf-seg button.on{background:#f1f5f9;color:#0d2016}
.trf-kpis{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;margin:0 -14px 10px;padding:0 14px}
.trf-kpis::-webkit-scrollbar{display:none}
.trf-kpi{flex:0 0 auto;min-width:112px;border-radius:14px;background:var(--trf-card);border:1px solid var(--trf-chipLine);padding:9px 11px;box-shadow:var(--trf-shadow)}
.trf-kpi small{display:block;font-size:9.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--trf-mute)}
.trf-kpi b{display:block;font:800 20px 'JetBrains Mono',monospace;letter-spacing:-.02em;margin-top:2px;white-space:nowrap}
.trf-kpi span{display:block;font-size:10.5px;font-weight:700;color:var(--trf-mute);margin-top:1px;white-space:nowrap}
.trf-red{color:#ef4444}.trf-amb{color:#f59e0b}.trf-grn{color:#22c55e}.trf-dim{color:var(--trf-mute)}
.trf-map{border-radius:18px;background:var(--trf-map);border:1px solid var(--trf-chipLine);overflow:hidden;box-shadow:var(--trf-shadow)}
.trf-legend{display:flex;gap:10px;flex-wrap:wrap;padding:6px 12px 10px;font-size:10.5px;font-weight:700;color:var(--trf-sub)}
.trf-legend span{display:flex;align-items:center;gap:4px}
.trf-legend i{width:16px;height:5px;border-radius:3px;display:inline-block}
.trf-sech{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin:14px 2px 8px}
.trf-sech b{font-size:15px;font-weight:900}
.trf-sech span{font-size:11.5px;color:var(--trf-mute);font-weight:700}
.trf-bn{border-radius:16px;background:var(--trf-card);border:1px solid var(--trf-chipLine);overflow:hidden;margin-bottom:10px;box-shadow:var(--trf-shadow)}
.trf-bn .h{display:flex;align-items:center;gap:10px;padding:10px 12px}
.trf-hn{width:42px;height:42px;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;flex:none;line-height:1}
.trf-hn b{font:800 18px 'JetBrains Mono',monospace}
.trf-hn small{font-size:8.5px;font-weight:800;opacity:.9}
.trf-bn .w{flex:1;min-width:0}
.trf-bn .w b{display:block;font-size:14px;font-weight:800}
.trf-bn .w span{display:block;font-size:12px;color:var(--trf-mute);font-weight:600;margin-top:2px;line-height:1.35}
.trf-bn .m{text-align:right;flex:none}
.trf-bn .m b{display:block;font:800 18px 'JetBrains Mono',monospace}
.trf-bn .m span{font-size:10px;font-weight:800;color:var(--trf-mute)}
.trf-why{margin:0 12px 10px;border-radius:10px;background:var(--trf-card2);border:1px solid var(--trf-line);padding:7px 10px;font-size:12px;font-weight:600;color:var(--trf-sub);display:flex;gap:6px;align-items:flex-start;line-height:1.4}
.trf-why .material-symbols-outlined{font-size:16px;color:#f59e0b;flex:none}
.trf-acts{display:flex;gap:8px;padding:0 12px 12px}
.trf-btn{flex:1;min-height:40px;border-radius:11px;border:0;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center;gap:6px;padding:0 8px}
.trf-btn .material-symbols-outlined{font-size:18px}
.trf-btn.red{background:#ef4444;color:#fff}
.trf-btn.gh{background:var(--trf-card2);color:var(--trf-ink);border:1px solid var(--trf-chipLine)}
.trf-btn:disabled{opacity:.55}
.trf-box{border-radius:16px;background:var(--trf-card);border:1px solid var(--trf-chipLine);box-shadow:var(--trf-shadow);overflow:hidden}
.trf-grp{display:flex;align-items:center;gap:10px;padding:9px 12px;border-top:1px solid var(--trf-line)}
.trf-grp:first-child{border-top:0}
.trf-grp .tt{font:800 14px 'JetBrains Mono',monospace;width:46px;flex:none}
.trf-grp .w{flex:1;min-width:0}
.trf-grp .w b{display:block;font-size:13px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.trf-grp .w span{display:flex;align-items:center;gap:4px;font-size:11px;color:var(--trf-mute);font-weight:700;margin-top:1px;flex-wrap:wrap}
.trf-grp .on{font:800 13px 'JetBrains Mono',monospace;background:var(--trf-card2);border:1px solid var(--trf-chipLine);border-radius:8px;padding:3px 6px;white-space:nowrap;flex:none}
.trf-grp .pc{font:800 13px 'JetBrains Mono',monospace;width:46px;text-align:right;flex:none}
.trf-src{display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:800;border-radius:999px;padding:2px 7px;background:var(--trf-card2);border:1px solid var(--trf-chipLine);color:var(--trf-sub)}
.trf-src .material-symbols-outlined{font-size:12px}
.trf-empty{border-radius:16px;border:1.5px dashed var(--trf-chipLine);padding:18px;text-align:center;color:var(--trf-mute);font-size:13px;font-weight:600;line-height:1.45}
.trf-empty b{display:block;color:var(--trf-ink);font-size:14px;margin-bottom:4px}
.trf-note{display:flex;gap:8px;align-items:flex-start;font-size:11.5px;font-weight:600;color:var(--trf-mute);line-height:1.45;margin-top:12px}
.trf-note .material-symbols-outlined{font-size:16px;color:var(--trf-acc);flex:none}
.trf-bars{display:flex;align-items:flex-end;gap:5px;padding:10px 12px 12px}
.trf-bars .b{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;min-width:0}
.trf-bars .bi{position:relative;width:100%;height:96px;display:flex;align-items:flex-end}
.trf-bars .bi i{display:block;width:100%;border-radius:5px 5px 2px 2px}
.trf-bars .tl{position:absolute;left:-2px;right:-2px;border-top:2px dashed var(--trf-ink);opacity:.5}
.trf-bars em{font-style:normal;font:700 9.5px 'JetBrains Mono',monospace;color:var(--trf-mute)}
.trf-bars s{text-decoration:none;font:800 10px 'JetBrains Mono',monospace}
.trf-heat{display:grid;grid-template-columns:62px repeat(18,minmax(0,1fr));gap:3px;padding:10px 12px 12px;font:700 9.5px 'JetBrains Mono',monospace}
.trf-heat .hl{color:var(--trf-mute);display:flex;align-items:center;white-space:nowrap;overflow:hidden;background:none;border:0;padding:0;text-align:left;font:inherit;cursor:pointer}
.trf-heat .hl.on{color:var(--trf-ink);font-weight:900}
.trf-heat .hh{color:var(--trf-mute);text-align:center}
.trf-heat i{height:20px;border-radius:4px;display:block}
.trf-dgrid{display:grid;grid-template-columns:1fr;gap:0}
@media (min-width:1024px){.trf-dgrid{grid-template-columns:1.25fr 1fr;gap:16px}.trf-kpis{margin:0 0 10px;padding:0}}
/* caddy card (rides the caddy's dark job page) */
.trf-cad{border-radius:22px;padding:14px;margin-top:10px;background:#0f1727;border:1px solid rgba(34,197,94,.35);color:#f1f5f9;font-family:Inter,system-ui,sans-serif}
.trf-cad .ban{border-radius:14px;background:rgba(249,115,22,.14);border:1.5px solid rgba(251,146,60,.55);padding:10px 12px;display:flex;gap:10px;margin-bottom:10px}
.trf-cad .ban .material-symbols-outlined{font-size:22px;color:#fb923c;flex:none}
.trf-cad .ban b{display:block;font-size:13px;font-weight:800}
.trf-cad .ban span{display:block;font-size:12px;font-weight:600;color:#fed7aa;margin-top:2px;line-height:1.4}
.trf-cad .big{border-radius:18px;padding:14px 12px;text-align:center;background:linear-gradient(160deg,#16a34a,#15803d);box-shadow:0 14px 30px rgba(22,163,74,.3)}
.trf-cad .big small{display:block;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;opacity:.9}
.trf-cad .big b{display:block;font:800 56px 'JetBrains Mono',monospace;line-height:1;margin:4px 0 2px}
.trf-cad .big span{display:block;font-size:13px;font-weight:700;opacity:.95}
.trf-cad .go{margin-top:12px;width:100%;background:#fff;color:#14532d;border:0;border-radius:16px;min-height:62px;display:flex;align-items:center;justify-content:center;gap:8px;font:900 19px Inter,sans-serif;cursor:pointer}
.trf-cad .go .material-symbols-outlined{font-size:26px}
.trf-cad .go:disabled{opacity:.6}
.trf-cad .start{display:flex;gap:8px;margin-top:8px}
.trf-cad .start button{flex:1;min-height:52px;border-radius:14px;border:1.5px solid rgba(255,255,255,.5);background:rgba(255,255,255,.12);color:#fff;font:900 16px Inter,sans-serif;cursor:pointer}
.trf-cad .hb{display:grid;grid-template-columns:repeat(9,1fr);gap:4px;margin-top:8px}
.trf-cad .hb button{height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font:800 11px 'JetBrains Mono',monospace;background:#162036;border:1px solid rgba(148,163,184,.28);color:#94a3b8;padding:0;cursor:pointer}
.trf-cad .hb button.d{background:rgba(34,197,94,.16);color:#86efac;border-color:rgba(34,197,94,.4)}
.trf-cad .hb button.s{background:rgba(251,191,36,.16);color:#fde68a;border-color:rgba(251,191,36,.45)}
.trf-cad .hb button.c{background:#22c55e;color:#052e16;border-color:#22c55e}
.trf-cad .hb button.u{background:#ef4444;color:#fff;border-color:#ef4444}
.trf-cad .hint{display:flex;gap:6px;align-items:flex-start;font-size:11.5px;color:#94a3b8;font-weight:600;margin-top:8px;line-height:1.4}
.trf-cad .hint .material-symbols-outlined{font-size:16px;color:#4ade80;flex:none}
`;
    document.head.appendChild(st);
  }

  /* ---------------------------------------------------------------- overlay */
  function lookNow() {
    try { const o = localStorage.getItem('mcipro_trafficLook'); if (o === 'white' || o === 'dark' || o === 'glass') return o; } catch (e) {}
    if (S.look) return S.look;
    try { const th = document.documentElement.getAttribute('data-theme'); if (th === 'light') return 'white'; if (th === 'dark' || th === 'glass') return th; } catch (e) {}
    try { const m = W.ThemeMode && W.ThemeMode.get ? W.ThemeMode.get() : 'light'; return m === 'glass' ? 'glass' : m === 'dark' ? 'dark' : 'white'; } catch (e) { return 'white'; }
  }
  function el() { return document.getElementById('trafficOverlay'); }
  function srcPill(g) {
    if (g.quiet) return '<span class="trf-src" style="color:#94a3b8">' + P('signal_disconnected') + esc(T('srcQuiet')) + '</span>';
    return g.sources.includes('caddy') ? '<span class="trf-src">' + P('person_pin_circle') + esc(T('srcCaddy')) + '</span>' : '<span class="trf-src">' + P('smartphone') + esc(T('srcScore')) + '</span>';
  }
  const paceCls = d => d >= 9 ? 'trf-red' : d >= 5 ? 'trf-amb' : 'trf-grn';
  function bnHtml(A, b, acts) {
    if (b.type === 'quiet') {
      const g = b.group, lastHole = g.order[g.order.indexOf(g.cur) - 1] || g.cur;
      return '<div class="trf-bn trf-gl"><div class="h"><div class="trf-hn" style="background:#94a3b8"><b>' + (g.cur || '–') + '</b><small>PAR ' + (A.holes[g.cur] ? A.holes[g.cur].par : '') + '</small></div><div class="w"><b>' +
        esc(T('quietT', { g: (g.tee || '') + ' ' + (g.label || ''), m: Math.round((Date.now() - g.lastT) / 60000) })) + '</b><span>' + esc(T('quietS', { h: lastHole })) + '</span></div><div class="m"><b class="trf-dim">?</b><span>' + esc(T('quiet')) + '</span></div></div></div>';
    }
    const x = b.hole, red = x.st === 'r', c = red ? '#ef4444' : '#f59e0b';
    const sub = x.here.length > 1 ? T('bnSub', { n: x.here.length, w: b.waiting, m: Math.round(b.front.onHole), t: x.target }) : T('bnSub1', { m: Math.round(b.front.onHole), t: x.target });
    const cg = b.cause, gapTxt = cg.gapAhead != null && cg.gapAhead > 0 ? T('gapAhead', { m: Math.round(cg.gapAhead) }) : '';
    const why = cg.delta > 2 ? '<div class="trf-why">' + P('error') + '<span>' + esc(T('why', { g: (cg.tee || '') + ' ' + (cg.label || ''), d: Math.round(cg.delta), gap: gapTxt })) + '</span></div>' : '';
    const key = cg.caddyKey || cg.keys[0];
    return '<div class="trf-bn trf-gl"><div class="h"><div class="trf-hn" style="background:' + c + '"><b>' + x.h + '</b><small>PAR ' + x.par + '</small></div><div class="w"><b>' + esc(T(red ? 'bnBacked' : 'bnSlow', { h: x.h })) + '</b><span>' + esc(sub) + '</span></div>' +
      '<div class="m"><b class="' + (red ? 'trf-red' : 'trf-amb') + '">' + sgn(b.over) + '</b><span>' + esc(T('minGroup')) + '</span></div></div>' + why +
      (acts ? '<div class="trf-acts"><button type="button" class="trf-btn red" data-trf="marshal" data-k="' + esc(key) + '" data-h="' + x.h + '" data-d="' + Math.round(cg.delta) + '">' + P('directions_car') + esc(T('marshal')) + '</button>' +
        '<button type="button" class="trf-btn gh" data-trf="nudge" data-k="' + esc(key) + '" data-h="' + x.h + '" data-d="' + Math.round(cg.delta) + '"' + (cg.caddyKey ? '' : ' title="' + esc(T('noCaddy')) + '"') + '>' + P('campaign') + esc(T('nudge')) + '</button></div>' : '') + '</div>';
  }
  function groupsHtml(A) {
    const list = A.live.slice().sort((a, b) => (a.startT || 0) - (b.startT || 0));
    if (!list.length) return '';
    return '<div class="trf-box trf-gl">' + list.map(g => '<div class="trf-grp"><span class="tt">' + esc(g.tee || hm(g.startT || g.lastT)) + '</span><div class="w"><b>' + esc(g.label || '—') + (g.players.length > 1 ? ' ×' + g.players.length : '') + '</b><span>' + srcPill(g) +
      (g.quiet ? '' : g.gapAhead != null ? esc(T('gap', { m: Math.round(g.gapAhead) })) : '') + '</span></div><span class="on">' + (A.holes[g.cur] && A.holes[g.cur].here.indexOf(g) > 0 ? '⏸ ' : '') + 'H' + (g.cur || '–') + (g.back ? '<small style="opacity:.6"> ↺10</small>' : '') + '</span>' +
      '<span class="pc ' + (g.quiet ? 'trf-dim' : paceCls(g.delta)) + '">' + sgn(g.delta) + '</span></div>').join('') + '</div>';
  }
  function kpisHtml(A) {
    const k = A.kpi, w = k.worst;
    return '<div class="trf-kpis">' +
      '<div class="trf-kpi trf-gl"><small>' + esc(T('onCourse')) + '</small><b>' + k.on + '</b><span>' + esc(T('groups')) + ' · ' + k.players + '</span></div>' +
      '<div class="trf-kpi trf-gl"><small>' + esc(T('avgPace')) + '</small><b class="' + (k.avg == null ? 'trf-dim' : paceCls(k.avg)) + '">' + (k.avg == null ? '—' : sgn(k.avg) + 'm') + '</b><span>' + esc(T('vsTarget', { t: dur(A.totalTarget) })) + '</span></div>' +
      '<div class="trf-kpi trf-gl"><small>' + esc(T('bottleneck')) + '</small><b class="' + (w ? (w.hole.st === 'r' ? 'trf-red' : 'trf-amb') : 'trf-grn') + '">' + (w ? 'H' + w.hole.h : esc(T('none'))) + '</b><span>' + (w ? esc(sgn(w.over) + ' ' + T('minGroup').toLowerCase()) : '&nbsp;') + '</span></div>' +
      (k.lastIn ? '<div class="trf-kpi trf-gl"><small>' + esc(T('lastIn')) + '</small><b>' + hm(k.lastIn) + '</b><span>' + (k.lastTarget ? esc(T('target', { t: hm(k.lastTarget) })) : '&nbsp;') + '</span></div>' : '') +
      '<div class="trf-kpi trf-gl"><small>' + esc(T('reporting')) + '</small><b>' + k.on + '</b><span>' + esc(T('reportingSub', { c: k.caddy, s: k.score })) + '</span></div></div>';
  }
  const legend = () => '<div class="trf-legend"><span><i style="background:#22c55e"></i>' + esc(T('flowing')) + '</span><span><i style="background:#f59e0b"></i>' + esc(T('slowing')) + '</span><span><i style="background:#ef4444"></i>' + esc(T('backed')) + '</span><span><i style="background:#94a3b8"></i>' + esc(T('nodata')) + '</span><span style="color:var(--trf-mute)">' + esc(T('waitLeg')) + '</span></div>';
  function barsHtml(A) {
    const max = Math.max(26, ...Object.values(A.holes).map(x => x.avg || 0));
    return '<div class="trf-box trf-gl"><div class="trf-sech" style="margin:10px 12px 0"><b>' + esc(T('minPerHole')) + '</b><span>' + esc(T('dashed')) + '</span></div><div class="trf-bars">' +
      Object.values(A.holes).map(x => {
        const tp = (x.target / max * 100).toFixed(0);
        if (x.avg == null) return '<div class="b"><s class="trf-dim">—</s><div class="bi"><i style="height:4px;background:var(--trf-line)"></i><span class="tl" style="bottom:' + tp + '%"></span></div><em>' + x.h + '</em></div>';
        const d = x.avg - x.target, c = d >= 4 ? '#ef4444' : d >= 2 ? '#f59e0b' : '#22c55e';
        return '<div class="b"><s style="color:' + c + '">' + Math.round(x.avg) + '</s><div class="bi"><i style="height:' + (x.avg / max * 100).toFixed(0) + '%;background:' + c + '"></i><span class="tl" style="bottom:' + tp + '%"></span></div><em>' + x.h + '</em></div>';
      }).join('') + '</div></div>';
  }
  function finishedHtml(A) {
    const fin = A.groups.filter(g => g.done && !g.typedIn && g.roundMin != null).sort((a, b) => a.lastT - b.lastT);
    const typed = A.groups.filter(g => g.typedIn).length;
    if (!fin.length && !typed) return '';
    return '<div class="trf-sech"><b>' + esc(T('finished')) + '</b><span>' + fin.length + '</span></div><div class="trf-box trf-gl">' +
      fin.map(g => '<div class="trf-grp"><span class="tt">' + esc(g.tee || hm(g.startT)) + '</span><div class="w"><b>' + esc(g.label || '—') + '</b><span>' + srcPill(g) + esc(T('done', { d: hm(g.lastT) })) + '</span></div><span class="on">' + dur(g.roundMin) + '</span><span class="pc ' + paceCls(g.roundMin - A.totalTarget) + '">' + sgn(g.roundMin - A.totalTarget) + '</span></div>').join('') +
      (typed ? '<div class="trf-grp"><span class="tt">' + typed + '</span><div class="w"><span>' + esc(T('entered')) + '</span></div></div>' : '') + '</div>';
  }
  function liveHtml() {
    const A = S.data; if (!A) return '<div class="trf-empty">…</div>';
    let h = kpisHtml(A);
    if (!A.live.length) h += '<div class="trf-empty"><b>' + esc(T('noGroups')) + '</b>' + esc(T('noGroupsSub')) + '</div>';
    const wide = W.innerWidth >= 1024;
    h += '<div class="trf-dgrid"><div><div class="trf-map trf-gl">' + mapSVG(A, wide ? 720 : 365, wide ? 470 : 330, wide) + legend() + '</div>' + (wide ? '<div style="height:12px"></div>' + barsHtml(A) : '') + '</div><div>';
    if (A.bns.length) h += '<div class="trf-sech"' + (wide ? ' style="margin-top:0"' : '') + '><b>' + esc(T('bnNow')) + '</b><span>' + esc(T('auto')) + '</span></div>' + A.bns.slice(0, 6).map(b => bnHtml(A, b, true)).join('');
    if (A.live.length) h += '<div class="trf-sech"><b>' + esc(T('groupsOn')) + '</b><span>' + esc(T('holeMin')) + '</span></div>' + groupsHtml(A);
    h += '</div></div><div class="trf-note">' + PF('lock') + '<span>' + esc(T('noGps')) + '</span></div>';
    return h;
  }
  function todayHtml() {
    const A = S.data; if (!A) return '<div class="trf-empty">…</div>';
    return kpisHtml(A) + barsHtml(A) + finishedHtml(A) + '<div class="trf-note">' + PF('lock') + '<span>' + esc(T('noGps')) + '</span></div>';
  }
  function histHtml() {
    const H = S.hist; if (!H) return '<div class="trf-empty">…</div>';
    const days = Object.keys(H.byDay).sort().reverse();
    if (!days.length) return '<div class="trf-empty"><b>' + esc(T('noHist')) + '</b>' + esc(T('noGroupsSub')) + '</div>';
    const cell = d => d == null ? 'var(--trf-line)' : d >= 4 ? '#ef4444' : d >= 2 ? '#f59e0b' : d >= 0 ? '#86efac' : '#22c55e';
    const hh = '<span></span>' + Array.from({ length: 18 }, (_, i) => '<span class="hh">' + (i + 1) + '</span>').join('');
    const over = {};   // per hole average over target across all days
    days.forEach(d => Object.values(H.byDay[d].holes).forEach(x => { if (x.avg != null) (over[x.h] = over[x.h] || []).push(x.avg - x.target); }));
    const avgOver = Object.keys(over).map(h => [+h, over[h].reduce((a, b) => a + b, 0) / over[h].length]).sort((a, b) => b[1] - a[1]);
    const rounds = days.reduce((a, d) => a.concat(H.byDay[d].groups.filter(g => g.done && !g.typedIn && g.roundMin != null).map(g => g.roundMin)), []);
    let h = '<div class="trf-kpis">' + (avgOver[0] ? '<div class="trf-kpi trf-gl"><small>' + esc(T('worst')) + '</small><b class="trf-red">H' + avgOver[0][0] + '</b><span>' + sgn(avgOver[0][1]) + ' ' + esc(T('minGroup').toLowerCase()) + '</span></div>' : '') +
      (avgOver[1] ? '<div class="trf-kpi trf-gl"><small>' + esc(T('next')) + '</small><b class="trf-amb">H' + avgOver[1][0] + '</b><span>' + sgn(avgOver[1][1]) + ' ' + esc(T('minGroup').toLowerCase()) + '</span></div>' : '') +
      (rounds.length ? '<div class="trf-kpi trf-gl"><small>' + esc(T('avgRound')) + '</small><b>' + dur(rounds.reduce((a, b) => a + b, 0) / rounds.length) + '</b><span>' + esc(T('target', { t: dur(H.totalTarget) })) + '</span></div>' : '') + '</div>';
    h += '<div class="trf-box trf-gl"><div class="trf-sech" style="margin:10px 12px 0"><b>' + esc(T('histT')) + '</b><span>' + esc(T('histSub')) + '</span></div><div class="trf-heat">' + hh +
      days.map(d => '<button type="button" class="hl' + (S.histDay === d ? ' on' : '') + '" data-trf="day" data-d="' + d + '">' + esc(new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })) + '</button>' +
        Object.values(H.byDay[d].holes).map(x => '<i style="background:' + cell(x.avg == null ? null : x.avg - x.target) + '" title="' + (x.avg == null ? '' : Math.round(x.avg) + 'm') + '"></i>').join('')).join('') + '</div></div>';
    const sel = S.histDay && H.byDay[S.histDay];
    if (sel) {
      const gs = sel.groups.filter(g => !g.typedIn && Object.keys(g.dur).length);
      h += '<div class="trf-sech"><b>' + esc(T('replay', { d: new Date(S.histDay + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }) })) + '</b><span>' + esc(T('replaySub', { n: gs.length })) + '</span></div>';
      h += '<div class="trf-box trf-gl"><div class="trf-heat">' + hh + gs.map(g => '<span class="hl">' + esc(g.tee || hm(g.startT || g.lastT)) + '</span>' +
        Array.from({ length: 18 }, (_, i) => { const m = g.dur[i + 1]; return '<i style="background:' + cell(m == null ? null : m - TGT(H.pars[i] || 4)) + '" title="' + (m == null ? '' : Math.round(m) + 'm') + '"></i>'; }).join('')).join('') + '</div>' +
        '<div style="padding:0 12px 12px;font-size:12px;font-weight:600;color:var(--trf-sub)">' + gs.map(g => esc((g.tee || '') + ' ' + (g.label || '')) + ': ' + (g.roundMin != null ? dur(g.roundMin) : '—')).join(' · ') + '</div></div>';
    } else h += '<div class="trf-note">' + P('touch_app') + '<span>' + esc(T('tapDay')) + '</span></div>';
    return h;
  }
  function paint() {
    const o = el(); if (!o) return;
    o.dataset.look = lookNow();
    const keep = o.scrollTop;
    o.innerHTML = '<div class="trf-top trf-gl"><button type="button" class="trf-x" data-trf="close" aria-label="' + esc(T('close')) + '">' + P('arrow_back') + '</button><div class="trf-tt"><b>' + esc(T('title')) + '</b><span>' +
      (S.view === 'live' ? '<i class="trf-livedot"></i>' + esc(T('live')) + ' · ' : '') + esc(S.name || S.slug) + ' · ' + esc(hm(Date.now())) + '</span></div>' +
      '<div class="trf-looks">' + [['white', 'light_mode'], ['dark', 'dark_mode'], ['glass', 'blur_on']].map(([k, ic]) => '<button type="button" data-trf="look" data-v="' + k + '" class="' + (lookNow() === k ? 'on' : '') + '" aria-label="' + k + '">' + P(ic) + '</button>').join('') + '</div></div>' +
      '<div class="trf-in"><div class="trf-seg">' + [['live', 'live2'], ['today', 'today'], ['hist', 'days30']].map(([v, k]) => '<button type="button" data-trf="view" data-v="' + v + '" class="' + (S.view === v ? 'on' : '') + '">' + esc(T(k)) + '</button>').join('') + '</div>' +
      (S.view === 'hist' ? histHtml() : S.view === 'today' ? todayHtml() : liveHtml()) + '</div>';
    o.scrollTop = keep;
  }
  async function refresh() {
    const seq = ++S.seq, day = bkkDate();
    try {
      const d = await fetchDay(S.slug, day, day);
      if (seq !== S.seq) return;
      S.pars = d.pars || [];
      S.data = analyse(day, d.marks || [], S.pars, Date.now());
      S.data.nudges = d.nudges || [];
    } catch (e) { console.warn('[CourseTraffic]', e.message || e); }
    paint();
  }
  async function loadHist() {
    const to = addDays(bkkDate(), -1), from = addDays(to, -29);
    try {
      const d = await fetchDay(S.slug, from, to);
      const byDay = {};
      const days = Array.from(new Set((d.marks || []).map(m => m.d)));
      days.forEach(day => { const A = analyse(day, d.marks, d.pars || [], new Date(day + 'T23:59:00+07:00').getTime()); if (A.groups.some(g => !g.typedIn && Object.keys(g.dur).length)) byDay[day] = A; });
      const tt = Array.from({ length: 18 }, (_, i) => TGT((d.pars || [])[i] || 4)).reduce((a, b) => a + b, 0);
      S.hist = { byDay, pars: d.pars || [], totalTarget: tt };
      if (!S.histDay) S.histDay = Object.keys(byDay).sort().reverse()[0] || null;
    } catch (e) { S.hist = { byDay: {}, pars: [], totalTarget: 252 }; }
    paint();
  }
  function subscribe() {
    const c = sb(); if (!c || typeof c.channel !== 'function') return;
    if (S.chan) { try { c.removeChannel(S.chan); } catch (e) {} S.chan = null; }
    let t = null;
    const bump = () => { if (t) return; t = setTimeout(() => { t = null; refresh(); }, 80); };
    S.chan = c.channel('traffic-' + S.slug + '-' + Math.random().toString(36).slice(2, 7))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'round_hole_marks', filter: 'play_date=eq.' + bkkDate() }, bump)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'traffic_nudges', filter: 'play_date=eq.' + bkkDate() }, bump)
      .subscribe();
  }
  function say(m, type) {
    try { if (W.NotificationManager) { W.NotificationManager.show(m, type || 'success'); return; } } catch (e) {}
    try { if (W.CourseLink && W.CourseLink.toast) { W.CourseLink.toast(m); return; } } catch (e) {}
    console.log('[CourseTraffic]', m);
  }
  async function onClick(e) {
    const a = e.target.closest('[data-trf]'); if (!a) return;
    const k = a.dataset.trf;
    if (k === 'close') return close();
    if (k === 'look') { try { localStorage.setItem('mcipro_trafficLook', a.dataset.v); } catch (er) {} return paint(); }
    if (k === 'view') { S.view = a.dataset.v; paint(); if (S.view === 'hist' && !S.hist) loadHist(); return; }
    if (k === 'day') { S.histDay = a.dataset.d; return paint(); }
    if (k === 'nudge' || k === 'marshal') {
      a.disabled = true;
      const h = +a.dataset.h, d = +a.dataset.d;
      const msg = k === 'marshal' ? T('cMarshal', { h }) : (d > 2 ? T('cNudge', { m: d }) : T('cNudgeNoMin'));
      try {
        const { data, error } = await sb().rpc('traffic_nudge', { p_slug: S.slug, p_group_key: a.dataset.k, p_kind: k, p_hole: h, p_message: msg, p_by: S.by });
        if (error) throw error;
        if (!data || !data.ok) { say(data && data.reason === 'just_sent' ? T('justSent') : T('cFail'), 'warning'); a.disabled = false; return; }
        say(k === 'marshal' ? T('marshalSent') : T('nudged'), 'success');
      } catch (er) { say(T('cFail'), 'error'); a.disabled = false; }
    }
  }
  function close() {
    const o = el(); if (o) o.remove();
    const c = sb(); if (S.chan && c) { try { c.removeChannel(S.chan); } catch (e) {} } S.chan = null;
    if (S.tick) { clearInterval(S.tick); S.tick = null; }
  }
  async function open(opts) {
    opts = opts || {};
    if (!opts.slug) { say(T('noGroups'), 'warning'); return; }
    css();
    close();
    Object.assign(S, { slug: opts.slug, name: opts.name || opts.slug, look: opts.look || null, view: 'live', data: null, hist: null, histDay: null, by: opts.by || 'Pro shop' });
    const o = document.createElement('div'); o.id = 'trafficOverlay'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true');
    o.addEventListener('click', onClick);
    document.body.appendChild(o);
    paint();
    subscribe();
    await refresh();
    // positions age every minute even with no new mark (time on hole, quiet groups)
    S.tick = setInterval(() => { if (!el()) { clearInterval(S.tick); S.tick = null; return; } if (S.view !== 'hist' && document.visibilityState !== 'hidden') refresh(); }, 60000);
  }

  /* ---------------------------------------------------------------- the caddy's card */
  const CJ = { state: {}, chan: null, chanSlug: null, armed: null };
  function caddyCard(job) {
    css();
    return '<div class="trf-cad" data-trf-job="' + esc(job.id) + '"><div style="font-size:12px;color:#94a3b8;font-weight:700">…</div></div>';
  }
  async function caddyFill(jobId) {
    const host = document.querySelector('.trf-cad[data-trf-job="' + (W.CSS && CSS.escape ? CSS.escape(jobId) : jobId) + '"]'); if (!host) return;
    const c = sb(); if (!c) return;
    try {
      const { data } = await c.rpc('traffic_caddy_state', { p_job: jobId });
      if (!data || !data.ok) { host.style.display = 'none'; return; }
      CJ.state[jobId] = data;
      caddyPaint(jobId);
      if (CJ.chanSlug !== data.slug) {
        if (CJ.chan) { try { c.removeChannel(CJ.chan); } catch (e) {} }
        CJ.chanSlug = data.slug;
        let t = null; const bump = () => { if (t) return; t = setTimeout(() => { t = null; document.querySelectorAll('.trf-cad[data-trf-job]').forEach(x => caddyFill(x.getAttribute('data-trf-job'))); }, 120); };
        CJ.chan = c.channel('traffic-cad-' + Math.random().toString(36).slice(2, 7))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'round_hole_marks', filter: 'play_date=eq.' + bkkDate() }, bump)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'traffic_nudges', filter: 'play_date=eq.' + bkkDate() }, bump)
          .subscribe();
      }
    } catch (e) { console.warn('[CourseTraffic] caddy', e.message || e); }
  }
  function caddyPaint(jobId) {
    const host = document.querySelector('.trf-cad[data-trf-job="' + (W.CSS && CSS.escape ? CSS.escape(jobId) : jobId) + '"]'); if (!host) return;
    const st = CJ.state[jobId]; if (!st) return;
    const pars = st.pars || [], marks = (st.marks || []).slice().sort((a, b) => new Date(a.at) - new Date(b.at));
    const doneSet = {}; marks.forEach(m => { if (!doneSet[m.hole]) doneSet[m.hole] = new Date(m.at).getTime(); });
    const startHint = (marks.find(m => m.start) || {}).start || null;
    const firstHole = marks.length ? marks[0].hole : null;
    const back = startHint ? startHint === 'back' : (firstHole != null && firstHole >= 10 && !marks.some(m => m.hole < 10));
    const order = back ? [10, 11, 12, 13, 14, 15, 16, 17, 18, 1, 2, 3, 4, 5, 6, 7, 8, 9] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
    const played = order.filter(h => doneSet[h]);
    const last = played.length ? played[played.length - 1] : null;
    const cur = last == null ? null : order[order.indexOf(last) + 1] || null;
    const finished = played.length >= 18 || (last != null && order.indexOf(last) === 17);
    const nowMs = Date.now();
    const nud = (st.nudges || [])[0];
    let h = '';
    if (nud && nowMs - new Date(nud.at).getTime() < 30 * 60000) h += '<div class="ban">' + PF(nud.kind === 'marshal' ? 'directions_car' : 'campaign') + '<div><b>' + esc(T('cProshop')) + ' · ' + esc(hm(new Date(nud.at).getTime())) + '</b><span>' + esc(nud.message || '') + '</span></div></div>';
    if (finished) {
      const start = marks.length ? new Date(marks[0].at).getTime() - TGT(pars[order[0] - 1] || 4) * 60000 : null;
      h += '<div class="big"><small>' + esc(T('cOn')) + '</small><b>✓</b><span>' + esc(T('cFinished', { d: start ? dur((doneSet[last] - start) / 60000) : '' })) + '</span></div>';
    } else if (last == null && CJ.pendingStart && CJ.pendingStart[jobId]) {
      return caddyStartPaint(jobId, CJ.pendingStart[jobId]);
    } else if (last == null) {
      h += '<div class="big"><small>' + esc(T('cStart')) + '</small><div class="start"><button type="button" data-trf-c="start" data-v="front">' + esc(T('c1')) + '</button><button type="button" data-trf-c="start" data-v="back">' + esc(T('c10')) + '</button></div></div>';
    } else {
      const t = TGT(pars[cur - 1] || 4), on = (nowMs - doneSet[last]) / 60000, nxt = order[order.indexOf(cur) + 1];
      h += '<div class="big"><small>' + esc(T('cOn')) + '</small><b>' + cur + '</b><span>' + esc(T('cPar', { p: pars[cur - 1] || 4 })) + ' · ' + esc(T('cHere', { m: Math.round(on), t })) + '</span>' +
        '<button type="button" class="go" data-trf-c="done" data-h="' + cur + '">' + PF('flag') + esc(nxt ? T('cDone', { h: nxt }) : T('cLast')) + '</button></div>';
    }
    const strip = (from) => '<div class="hb">' + Array.from({ length: 9 }, (_, i) => from + i).map(x => {
      const isDone = !!doneSet[x], i2 = order.indexOf(x), prevH = order[i2 - 1];
      const m = isDone && prevH && doneSet[prevH] ? (doneSet[x] - doneSet[prevH]) / 60000 : null;
      const slow = m != null && m - TGT(pars[x - 1] || 4) >= 3;
      const cls = CJ.armed === jobId + ':' + x ? 'u' : isDone ? (slow ? 's' : 'd') : x === cur ? 'c' : '';
      return '<button type="button" class="' + cls + '"' + (isDone ? ' data-trf-c="undo" data-h="' + x + '"' : '') + '>' + x + '</button>';
    }).join('') + '</div>';
    h += (back ? strip(10) + strip(1) : strip(1) + strip(10));
    h += '<div class="hint">' + PF('touch_app') + '<span>' + esc(CJ.armed && CJ.armed.indexOf(jobId + ':') === 0 ? T('cUndo', { h: CJ.armed.split(':')[1] }) : T('cHint')) + '</span></div>';
    host.innerHTML = h;
    if (!host._trfBound) { host._trfBound = true; host.addEventListener('click', ev => caddyTap(ev, jobId)); }
  }
  async function caddyTap(ev, jobId) {
    const a = ev.target.closest('[data-trf-c]'); if (!a) return;
    ev.stopPropagation();
    const k = a.dataset.trfC, st = CJ.state[jobId] || {};
    const actor = (W.AppState && W.AppState.currentUser && W.AppState.currentUser.lineUserId) || localStorage.getItem('line_user_id') || '';
    let hole = +a.dataset.h, undo = false, start = null;
    if (k === 'start') { start = a.dataset.v; hole = start === 'back' ? 10 : 1; }
    if (k === 'undo') {
      if (CJ.armed !== jobId + ':' + hole) { CJ.armed = jobId + ':' + hole; caddyPaint(jobId); setTimeout(() => { if (CJ.armed === jobId + ':' + hole) { CJ.armed = null; caddyPaint(jobId); } }, 4000); return; }
      CJ.armed = null; undo = true;
    }
    if (k === 'start') {
      // the group is now ON its first hole — nothing is finished yet; the start rides the first "Green done"
      CJ.pendingStart = CJ.pendingStart || {}; CJ.pendingStart[jobId] = start;
      return caddyStartPaint(jobId, start);
    }
    a.disabled = true;
    try {
      const ps = CJ.pendingStart && CJ.pendingStart[jobId];
      const { data, error } = await sb().rpc('traffic_caddy_mark', { p_job: jobId, p_hole: hole, p_actor: actor, p_undo: undo, p_start: ps || null });
      if (error || !data || !data.ok) throw new Error((error && error.message) || (data && data.reason) || 'x');
      if (ps) delete CJ.pendingStart[jobId];
      await caddyFill(jobId);
    } catch (er) { say(T('cFail') + ' (' + (er.message || er) + ')', 'error'); a.disabled = false; }
  }
  // after "1st tee / 10th tee": she is ON the first hole; the big button finishes it
  function caddyStartPaint(jobId, start) {
    const host = document.querySelector('.trf-cad[data-trf-job="' + (W.CSS && CSS.escape ? CSS.escape(jobId) : jobId) + '"]'); if (!host) return;
    const st = CJ.state[jobId] || {}, pars = st.pars || [], first = start === 'back' ? 10 : 1;
    host.innerHTML = '<div class="big"><small>' + esc(T('cOn')) + '</small><b>' + first + '</b><span>' + esc(T('cPar', { p: pars[first - 1] || 4 })) + '</span>' +
      '<button type="button" class="go" data-trf-c="done" data-h="' + first + '">' + PF('flag') + esc(T('cDone', { h: first + 1 })) + '</button></div>' +
      '<div class="hint">' + PF('touch_app') + '<span>' + esc(T('cHint')) + '</span></div>';
    if (!host._trfBound) { host._trfBound = true; host.addEventListener('click', ev => caddyTap(ev, jobId)); }
  }

  W.CourseTraffic = { open, close, caddyCard, caddyFill, _analyse: analyse, _merge: mergeGroups, _T: T };
})();

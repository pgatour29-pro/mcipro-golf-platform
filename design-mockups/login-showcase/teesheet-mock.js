/* SCREENSHOT-ONLY mock for the login showcase (design-mockups, never shipped).
   Runs inside proshop-teesheet.html in a throwaway agent-browser profile:
   1. WRITE BLOCK — every insert/upsert/update/delete and every rpc on supabaseClient becomes a no-op,
      so nothing (not even the legacy localStorage migration) can reach the live database.
   2. READ STUB — `bookings` selects return a generated full day with caddies; v2 (2026-10-01, the Caddy
      Desk shots) also stubs `caddy_profiles` (a 48-caddy roster), `caddy_bookings` (one job per seated
      caddy, linked to its tee time; open jobs for seats still needing one), `caddy_checkins`,
      `caddy_dayoff_requests` and `caddy_rotation_config`. All other reads are real (society events).
   3. CLOCK — `Date` is shifted to MOCK_NOW so the sheet is "today, mid-morning": caddies out on the
      course, loops back in, the NOW line inside the day.
   Names are fictional. Caddy = number + name (house rule). */
(function () {
 const MOCK_NOW = '2026-10-05T10:34:00+07:00';
 function clock() {
  if (window.__tsClock) return;
  const RD = Date, OFF = new RD(MOCK_NOW).getTime() - RD.now();
  window.Date = class extends RD { constructor(...a) { if (a.length) super(...a); else super(RD.now() + OFF); } static now() { return RD.now() + OFF; } };
  window.__tsClock = true;
 }
 function patch(C) {
  if (C.__tsMock) return C;
  const origFrom = C.from.bind(C);
  const noop = () => { const t = { then: (r) => Promise.resolve({ data: [], error: null }).then(r) };
    ['select', 'eq', 'neq', 'in', 'is', 'or', 'not', 'match', 'single', 'maybeSingle', 'order', 'limit', 'gte', 'lte', 'gt', 'lt', 'ilike'].forEach(m => t[m] = () => t); return t; };
  C.rpc = () => noop();

  const G = ['James Walker','Kenji Sato','Min-jun Kim','Oliver Brown','Somchai P.','Daniel Evans','Hiroshi Tanaka','Liam Murphy','Ji-ho Park','Lucas Meyer',
    'Anan W.','Ryan Cooper','Takeshi Mori','Noah Fischer','Sung-min Lee','Chris Taylor','Wei Chen','Thomas Wright','Yuto Kobayashi','Mark Hughes',
    'Niran S.','Peter Nielsen','Dong-hyun Choi','Adam Scott','Kaito Ito','Ben Carter','Hyun-woo Jung','Sam Wilson','Prasert K.','Jack Robinson',
    'David Lim','Matt King','Haruto Suzuki','Tom Baker','Kittisak R.','Paul Green','Joon-ho Han','Andrew Hall','Ren Watanabe','Luke Edwards'];
  const K = ['Noi','Ploy','Fon','Nok','Pim','Aom','Joy','Bee','Kwan','Mint','Nan','Dao','Oil','Pla','Som','Tik','Namwan','Fah','Jib','Ning',
    'Mai','Yui','Gift','Pang','Nam','Aim','Kai','Bua','Jum','Wan','Pui','Meen','Ice','Pear','Ann','Toey','Ying','Bell','Nid','Pom',
    'Kae','Lek','Tang','Fai','Nune','Jan','Ploy','Ohm'];
  const GROUPS = ['Korean Golf Tour', 'Tokyo Travel Club', 'Pattaya Expats'];
  // a 36-hole, two-tee day seats ~500 golfers: the roster is sized like a real big club's
  const N_CAD = 360, OFF_DAY = ['9', '31', '58', '102', '140', '233', '287'], NOT_IN = ['44', '46', '47', '119', '163', '201', '256', '310', '342'];
  let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const pick = a => a[Math.floor(rnd() * a.length)];
  const hhmm = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  const nowM = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  const todayS = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

  // ---- roster: 360 caddies, number + name, 06:00–16:00 sheets, 255-minute block ----
  const ROSTER = [];
  for (let i = 1; i <= N_CAD; i++) ROSTER.push({ id: 'mock-cad-' + i, name: K[(i - 1) % K.length], caddy_number: String(i), course_name: 'Pattaya Golf Club', course_id: 'pattaya-golf',
    rating: 4.5 + ((i * 7) % 5) / 10, languages: ['TH', 'EN'], photo_url: null, phone: '', is_active: true, is_mock: false, availability_status: 'available', block_minutes: 255,
    sheet_start: '06:00', sheet_end: '16:00', user_id: null, created_by: null });
  const byNum = {}; ROSTER.forEach(r => { byNum[r.caddy_number] = r; });

  // ---- the society on the sheet: the REAL TRGG event row (read live), a FICTIONAL field ----
  const EV = '78ab0dd5-6da6-4017-8e8c-34cccf53a143', EV_DATE = '2026-10-05', EV_TITLE = 'TRGG - Pattaya Country Club';
  const SOC_GROUPS = [
    ['09:05', [['Alan Reid', '3'], ['Brian Cole', '5'], ['Carl Jensen', '8'], ['John Smith', '12']]],
    ['09:12', [['Derek Moss', '2'], ['Eric Holt', '6'], ['Frank Dunn', ''], ['Gary Pike', '11']]],
    ['09:19', [['Harry Wells', '1'], ['Ian Frost', '7'], ['Jim Boyd', '10'], ['Keith Lane', '4']]]
  ];
  const SOC_UNPAIRED = [['Neil Marsh', '14'], ['Owen Price', '']];
  const SOC_ALL = []; SOC_GROUPS.forEach(g => g[1].forEach(p => SOC_ALL.push({ name: p[0], num: p[1], tee: g[0] })));
  SOC_UNPAIRED.forEach(p => SOC_ALL.push({ name: p[0], num: p[1], tee: '09:26' }));
  SOC_ALL.forEach((p, i) => { p.pid = 'mock-p-' + (i + 1); p.regId = 'mock-reg-' + (i + 1); });
  const socRegs = () => SOC_ALL.map((p, i) => ({ id: p.regId, event_id: EV, status: 'confirmed', created_at: '2026-10-0' + (1 + i % 3) + 'T0' + (2 + i % 7) + ':1' + (i % 6) + ':00Z', player_id: p.pid, player_name: p.name, caddy_numbers: p.num || null }));
  const socPairs = () => [{ event_id: EV, groups: SOC_GROUPS.map(g => ({ teeTime: g[0], players: g[1].map(x => { const p = SOC_ALL.find(a => a.name === x[0]); return { playerId: p.pid, playerName: p.name }; }) })) }];
  const socSlots = () => [{ id: 'mock-slot-1', event_id: EV, slots_given: 4, first_tee: '09:05', updated_at: '2026-10-03T02:40:00Z', updated_by: 'Pro shop' }];
  const socMsgs = () => [
    { id: 'mock-m-1', event_id: EV, side: 'society', kind: 'request', qty: 1, body: 'One more group has joined', ref_id: null, sender_name: 'TRGG', created_at: '2026-10-03T02:31:00Z' },
    { id: 'mock-m-2', event_id: EV, side: 'course', kind: 'approve', qty: 1, body: 'Course now holds 4 slot(s) from 09:05', ref_id: 'mock-m-1', sender_name: 'Pro shop', created_at: '2026-10-03T02:40:00Z' },
    { id: 'mock-m-3', event_id: EV, side: 'society', kind: 'message', qty: null, body: 'Thank you. 14 players, 12 caddies booked', ref_id: null, sender_name: 'TRGG', created_at: '2026-10-04T09:12:00Z' }
  ];

  const DAYS = {}, JOBS = {};
  function day(date) {
    if (DAYS[date]) return DAYS[date];
    seed = 7;
    const rows = [], jobs = []; let gi = 0, n = 0, ji = 0;
    const cols = [['A', 1, 0], ['A', 2, 1], ['B', 1, 2], ['B', 2, 3]];
    const busyUntil = {}; ROSTER.forEach(r => { busyUntil[r.caddy_number] = 0; });
    let rot = 16;   // rotation pointer (the caddy master's start number is 17)
    if (date === EV_DATE) SOC_ALL.forEach((p, i) => {   // the society's caddies: one confirmed job each, held off the general rotation
      if (!p.num) return;
      const tm = (+p.tee.slice(0, 2)) * 60 + (+p.tee.slice(3)), cad = byNum[p.num];
      busyUntil[p.num] = tm + 255;
      const isToday = date === todayS(), now = nowM(), out = isToday && tm <= now && now < tm + 255;
      jobs.push({ id: 'mock-evjob-' + i, caddy_id: cad.id, caddie_name: 'Caddy #' + p.num, booking_date: date, tee_time: p.tee, start_time: p.tee, end_time: hhmm(tm + 255),
        status: p.name === 'Neil Marsh' ? 'pending' : 'confirmed', payment_status: 'unpaid', payment_amount: 400, golfer_name: p.name, golfer_id: p.pid, user_id: p.pid,
        teesheet_booking_id: null, booking_source: 'proshop_event', confirmed_at: date + 'T00:00:00Z', started_at: out && p.name !== 'Neil Marsh' ? date + 'T' + p.tee + ':00+07:00' : null,
        completed_at: null, paid_at: null, special_requests: EV_TITLE, course_name: 'Pattaya Golf Club', course_id: 'pattaya-golf', created_at: '2026-10-03T03:00:00Z',
        caddy_profiles: { caddy_number: p.num, block_minutes: 255, name: cad.name, photo_url: null } });
    });
    const nextCaddy = (m) => {
      for (let k = 0; k < N_CAD; k++) {
        rot = rot % N_CAD + 1; const num = String(rot);
        if (OFF_DAY.includes(num) || NOT_IN.includes(num)) continue;
        if (busyUntil[num] <= m) { busyUntil[num] = m + 255; return num; }
      }
      return '';
    };
    for (let m = 6 * 60; m <= 16 * 60 + 40; m += 7) {
      const time = hhmm(m);
      cols.forEach(([course, tee, col]) => {
        const busy = 0.6 * (m < 9 * 60 ? 0.9 : m < 11 * 60 ? 0.78 : m < 13 * 60 ? 0.55 : 0.4);
        if (rnd() > busy) return;
        const size = rnd() < 0.55 ? 4 : rnd() < 0.6 ? 3 : 2;
        const grp = (m >= 7 * 60 && m < 7 * 60 + 35 && course === 'A') ? GROUPS[0] : (m >= 8 * 60 + 20 && m < 8 * 60 + 50 && course === 'B') ? GROUPS[1] : null;
        const id = 'mock-' + date + '-' + time + '-' + col;
        const golfers = []; let need = 0; for (let i = 0; i < size; i++) {
          const wants = rnd() < 0.9;
          const openSeat = wants && m >= 11 * 60 && (gi * 7 + i * 3) % 31 === 0;   // a few later seats still wait for the caddy master
          const num = wants && !openSeat ? nextCaddy(m) : '';
          if (wants && !num) need++;
          const cad = num ? byNum[num] : null;
          golfers.push({ name: G[gi++ % G.length], caddyId: cad ? cad.id : null, caddyNumber: num, caddyName: cad ? cad.name : '' });
          const isToday = date === todayS(), now = nowM();
          const end = m + 255, past = isToday && end <= now, out = isToday && m <= now && now < end;
          if (cad) jobs.push({ id: 'mock-job-' + date + '-' + (ji++), caddy_id: cad.id, caddie_name: 'Caddy #' + num, booking_date: date, tee_time: time, start_time: time, end_time: hhmm(end),
            status: past ? 'completed' : 'confirmed', payment_status: past && (ji * 37) % 10 < 8 ? 'paid' : 'unpaid', payment_amount: 400, golfer_name: golfers[i].name, golfer_id: null, user_id: null,
            teesheet_booking_id: id, booking_source: 'proshop_teesheet', confirmed_at: date + 'T00:00:00Z', started_at: out ? date + 'T' + time + ':00+07:00' : null,
            completed_at: past ? date + 'T' + hhmm(end) + ':00+07:00' : null, paid_at: null, special_requests: '', course_name: 'Pattaya Golf Club', course_id: 'pattaya-golf',
            caddy_profiles: { caddy_number: num, block_minutes: 255, name: cad.name, photo_url: null }, created_at: date + 'T00:00:00Z' });
          else if (wants && !past) jobs.push({ id: 'mock-job-' + date + '-' + (ji++), caddy_id: null, caddie_name: 'Caddy', booking_date: date, tee_time: time, start_time: time, end_time: hhmm(end),
            status: 'pending', payment_status: 'unpaid', payment_amount: 400, golfer_name: golfers[i].name, golfer_id: null, user_id: null, teesheet_booking_id: id, booking_source: 'proshop_teesheet',
            confirmed_at: null, started_at: null, completed_at: null, paid_at: null, special_requests: '', course_name: 'Pattaya Golf Club', course_id: 'pattaya-golf', caddy_profiles: null });
        }
        rows.push({ id, date, time, tee_number: tee, tee_sheet_course: course, booking_type: 'regular', group_id: id,
          name: golfers[0].name, golfer_name: golfers[0].name, source: 'teesheet', status: 'confirmed', notes: '', deleted: false,
          created_at: date + 'T00:00:00Z', updated_at: date + 'T00:00:00Z',
          booking_data: { col, golfers, caddiesNeeded: need, groupName: grp, groupIndex: null, groupTotal: null } });
        n++;
      });
    }
    DAYS[date] = rows; JOBS[date] = jobs;
    return rows;
  }
  const checkins = date => ROSTER.filter(r => !OFF_DAY.includes(r.caddy_number) && !NOT_IN.includes(r.caddy_number))
    .map(r => ({ caddy_id: r.id, check_date: date, checked_in_at: date + 'T05:' + String(30 + (+r.caddy_number % 25)).padStart(2, '0') + ':00+07:00', by_label: 'Caddy master' }));
  const dayoffs = () => OFF_DAY.map(n => ({ caddy_number: n, caddy_name: byNum[n].name, course_name: 'Pattaya Golf Club', status: 'approved', date_from: '2026-01-01', date_to: '2026-12-31' }));

  // generic read stub: eq/neq/in/gte/lte/is filters applied to the generated rows
  function stub(rowsFor) {
    const f = [];
    const t = { then: (r) => { const eqs = {}; f.forEach(x => { if (x[0] === 'eq') eqs[x[1]] = x[2]; });
        if (f.some(x => String(x[1]).includes('.'))) return Promise.resolve({ data: [], error: null }).then(r);   // embedded-table filters: not mocked
        let rows = rowsFor(eqs, f);
        f.forEach(([op, k, v]) => {
          if (op === 'eq') rows = rows.filter(r => String(r[k]) === String(v));
          else if (op === 'neq') rows = rows.filter(r => String(r[k]) !== String(v));
          else if (op === 'in') rows = rows.filter(r => v.map(String).includes(String(r[k])));
          else if (op === 'gte') rows = rows.filter(r => String(r[k]) >= String(v));
          else if (op === 'lte') rows = rows.filter(r => String(r[k]) <= String(v));
          else if (op === 'is') rows = rows.filter(r => r[k] == v);
        });
        return Promise.resolve({ data: rows, error: null }).then(r); } };
    ['eq', 'neq', 'in', 'gte', 'lte', 'is'].forEach(op => t[op] = (k, v) => { f.push([op, k, v]); return t; });
    ['select', 'not', 'or', 'order', 'limit', 'match', 'ilike', 'gt', 'lt', 'range'].forEach(m => t[m] = () => t);
    t.maybeSingle = () => ({ then: r => t.then(x => ({ data: (x.data || [])[0] || null, error: null })).then(r) });
    t.single = t.maybeSingle;
    ['insert', 'upsert', 'update', 'delete'].forEach(m => t[m] = () => noop());
    return t;
  }

  C.from = function (table) {
    const b = origFrom(table);
    ['insert', 'upsert', 'update', 'delete'].forEach(m => { b[m] = () => noop(); });   // WRITE BLOCK
    if (table === 'bookings') return stub(eqs => eqs.date ? day(eqs.date) : []);
    if (table === 'caddy_profiles') return stub(() => ROSTER);
    if (table === 'caddy_bookings') return stub((eqs, f) => {
      const inD = f.find(x => x[0] === 'in' && x[1] === 'booking_date');
      const ds = eqs.booking_date ? [eqs.booking_date] : inD ? inD[2] : [todayS()];
      return [].concat(...ds.map(d => { day(d); return JOBS[d] || []; }));
    });
    if (table === 'event_registrations') return stub(() => socRegs());
    if (table === 'event_pairings') return stub(() => socPairs());
    if (table === 'course_event_slots') return stub(() => socSlots());
    if (table === 'event_course_messages') return stub(() => socMsgs());
    if (table === 'caddy_checkins') return stub(eqs => checkins(eqs.check_date || todayS()));
    if (table === 'caddy_dayoff_requests') return stub(() => dayoffs());
    if (table === 'caddy_rotation_config') return stub(() => [{ course_name: 'Pattaya Golf Club', start_number: 17, active_count: 344, rotation_date: todayS() }]);
    return b;
  };
  C.__tsMock = true; window.__tsMockOn = (window.__tsMockOn || 0) + 1;
  return C;
 }
 clock();
 // The tee sheet page exposes its one client as window.__golferAvSb — patch that object in place.
 if (window.__golferAvSb) patch(window.__golferAvSb);
 return 'patched ' + window.__tsMockOn + ' now=' + new Date().toString();
})();

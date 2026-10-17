/* v1604 SIGN-UP DESK (Pete 2026-10-17)
 * Every sign-up is seated on the tee sheet by the database the moment it is saved
 * (sql/signup_autoseat_v1604.sql). This file is the people-facing side of that:
 *  - Organizer, Tee Sheet: "N new sign-ups since your last visit" popup (sign-ups AND withdrawals,
 *    each dated), GOT IT = acknowledged per event (tee_sheet_seen), never again until something new.
 *  - Organizer: SIGN-UP LOG sheet — every sign-up and withdrawal for the event, dated, CSV + print.
 *  - Golfer: registration RECEIPT right after signing up (and from the REGISTERED banner later).
 *    A golfer never sees a withdrawal record.
 * Receipt no. = "R-" + first 6 of the registration id, "#n" = sign-up order for the event.
 */
(function () {
    'use strict';
    var TZ = 'Asia/Bangkok';
    var L = {
        en: {
            ovl_new: 'NEW SIGN-UPS', h_new: 'new sign-ups since your last visit', h_act: 'changes since your last visit',
            last: 'YOUR LAST VISIT', since: 'SINCE', ok: 'Already on the sheet in the first open seats. Players can join or swap groups themselves — you can still move anyone.',
            together: 'REQUESTED TOGETHER', seated_tog: 'SEATED TOGETHER', log: 'SIGN-UP LOG', gotit: 'GOT IT',
            note: 'SHOWS AGAIN ONLY WHEN SOMEONE NEW SIGNS UP OR WITHDRAWS', withdrew: 'WITHDREW', pool: 'POOL', direct: 'DIRECT', van: 'VAN',
            van_unset: 'VAN ? · SET', ovl_log: 'SIGN-UP LOG', h_log: 'sign-ups for this event', meta_log: 'EVERY SIGN-UP AND WITHDRAWAL DATED + TIMED · SAME NO. AS THE PLAYER\'S RECEIPT',
            csv: 'CSV', print: 'PRINT', close: 'CLOSE', by_player: 'BY PLAYER', by_org: 'BY ORGANIZER', paid: 'PAID', hcp: 'HCP', empty: 'No sign-ups yet.',
            withdrawals: 'withdrawn', loading: 'Loading…',
            r_ovl: 'REGISTRATION RECEIPT', r_h: 'You\'re in — and on the tee sheet', r_h2: 'You\'re in', r_group: 'Your group', r_groupn: 'Group',
            r_tee: 'TEE', r_you: 'You', r_signed: 'Signed up', r_no: 'Receipt no.', r_dep: 'Departure', r_fee: 'Fee', r_pay: 'Payment',
            r_paid: 'PAID', r_unpaid: 'NOT PAID YET', r_info: 'Want to play with friends? Join an open seat or swap groups yourself — no need to wait for the organizer. This receipt stays in My Events.',
            r_move: 'Move / swap group', r_done: 'Done', r_none: 'No receipt found for this event.', receipt: 'RECEIPT'
        },
        th: {
            ovl_new: 'ผู้สมัครใหม่', h_new: 'ผู้สมัครใหม่ตั้งแต่ที่คุณเข้ามาครั้งล่าสุด', h_act: 'การเปลี่ยนแปลงตั้งแต่ที่คุณเข้ามาครั้งล่าสุด',
            last: 'เข้ามาครั้งล่าสุด', since: 'ตั้งแต่', ok: 'ลงในตารางที่ว่างแรกแล้ว ผู้เล่นย้ายหรือสลับกลุ่มเองได้ — คุณยังย้ายใครก็ได้',
            together: 'ขอเล่นด้วยกัน', seated_tog: 'จัดอยู่กลุ่มเดียวกัน', log: 'บันทึกการสมัคร', gotit: 'รับทราบ',
            note: 'จะแสดงอีกครั้งเมื่อมีคนสมัครใหม่หรือถอนตัวเท่านั้น', withdrew: 'ถอนตัว', pool: 'ยังไม่จัด', direct: 'ไปเอง', van: 'รถตู้',
            van_unset: 'รถตู้ ? · เลือก', ovl_log: 'บันทึกการสมัคร', h_log: 'การสมัครของอีเวนต์นี้', meta_log: 'ทุกการสมัครและถอนตัวมีวันที่และเวลา · เลขเดียวกับใบยืนยันของผู้เล่น',
            csv: 'CSV', print: 'พิมพ์', close: 'ปิด', by_player: 'โดยผู้เล่น', by_org: 'โดยผู้จัด', paid: 'ชำระแล้ว', hcp: 'HCP', empty: 'ยังไม่มีผู้สมัคร',
            withdrawals: 'ถอนตัว', loading: 'กำลังโหลด…',
            r_ovl: 'ใบยืนยันการสมัคร', r_h: 'สมัครแล้ว — และอยู่ในตารางออกรอบ', r_h2: 'สมัครแล้ว', r_group: 'กลุ่มของคุณ', r_groupn: 'กลุ่ม',
            r_tee: 'ออกรอบ', r_you: 'คุณ', r_signed: 'สมัครเมื่อ', r_no: 'เลขที่ใบยืนยัน', r_dep: 'ออกเดินทาง', r_fee: 'ค่าใช้จ่าย', r_pay: 'การชำระเงิน',
            r_paid: 'ชำระแล้ว', r_unpaid: 'ยังไม่ชำระ', r_info: 'อยากเล่นกับเพื่อน? ย้ายไปที่ว่างหรือสลับกลุ่มได้เอง — ไม่ต้องรอผู้จัด ใบยืนยันนี้อยู่ใน My Events',
            r_move: 'ย้าย / สลับกลุ่ม', r_done: 'เสร็จ', r_none: 'ไม่พบใบยืนยันสำหรับอีเวนต์นี้', receipt: 'ใบยืนยัน'
        },
        ko: {
            ovl_new: '신규 신청', h_new: '마지막 방문 이후 신규 신청', h_act: '마지막 방문 이후 변경 사항',
            last: '마지막 방문', since: '이후', ok: '이미 첫 빈자리에 배정되었습니다. 선수가 직접 조를 옮기거나 바꿀 수 있으며, 주최자도 언제든 옮길 수 있습니다.',
            together: '함께 요청', seated_tog: '같은 조 배정', log: '신청 기록', gotit: '확인',
            note: '새 신청이나 취소가 있을 때만 다시 표시됩니다', withdrew: '취소', pool: '미배정', direct: '직접', van: '밴',
            van_unset: '밴 ? · 선택', ovl_log: '신청 기록', h_log: '이 이벤트 신청', meta_log: '모든 신청과 취소에 날짜와 시간 기록 · 선수 영수증과 같은 번호',
            csv: 'CSV', print: '인쇄', close: '닫기', by_player: '선수가', by_org: '주최자가', paid: '결제 완료', hcp: 'HCP', empty: '아직 신청이 없습니다.',
            withdrawals: '취소', loading: '불러오는 중…',
            r_ovl: '신청 영수증', r_h: '신청 완료 — 티시트에 배정됨', r_h2: '신청 완료', r_group: '내 조', r_groupn: '조',
            r_tee: '티오프', r_you: '나', r_signed: '신청 시각', r_no: '영수증 번호', r_dep: '출발', r_fee: '요금', r_pay: '결제',
            r_paid: '결제 완료', r_unpaid: '미결제', r_info: '친구와 치고 싶나요? 빈자리로 옮기거나 직접 조를 바꾸세요 — 주최자를 기다릴 필요 없습니다. 이 영수증은 My Events에 보관됩니다.',
            r_move: '조 이동 / 교체', r_done: '완료', r_none: '이 이벤트의 영수증이 없습니다.', receipt: '영수증'
        },
        ja: {
            ovl_new: '新規申込', h_new: '前回の訪問以降の新規申込', h_act: '前回の訪問以降の変更',
            last: '前回の訪問', since: '以降', ok: '最初の空き枠に配置済みです。プレーヤーは自分で組の移動・交換ができます。主催者はいつでも移動できます。',
            together: '同組希望', seated_tog: '同じ組に配置', log: '申込記録', gotit: '確認',
            note: '新しい申込または取消があった時だけ再表示されます', withdrew: '取消', pool: '未配置', direct: '直行', van: 'バン',
            van_unset: 'バン ? · 選択', ovl_log: '申込記録', h_log: 'このイベントの申込', meta_log: 'すべての申込と取消に日時を記録 · プレーヤーの控えと同じ番号',
            csv: 'CSV', print: '印刷', close: '閉じる', by_player: '本人', by_org: '主催者', paid: '支払済', hcp: 'HCP', empty: 'まだ申込はありません。',
            withdrawals: '取消', loading: '読み込み中…',
            r_ovl: '申込控え', r_h: '申込完了 — ティーシートに配置済み', r_h2: '申込完了', r_group: 'あなたの組', r_groupn: '組',
            r_tee: 'ティー', r_you: 'あなた', r_signed: '申込日時', r_no: '控え番号', r_dep: '出発', r_fee: '料金', r_pay: '支払い',
            r_paid: '支払済', r_unpaid: '未払い', r_info: '仲間と回りたい？空き枠への移動や組の交換は自分でできます — 主催者を待つ必要はありません。この控えは My Events に残ります。',
            r_move: '組の移動 / 交換', r_done: '完了', r_none: 'このイベントの控えが見つかりません。', receipt: '控え'
        }
    };
    function lang() { try { var l = localStorage.getItem('mci-pro-language') || 'en'; return L[l] ? l : 'en'; } catch (e) { return 'en'; } }
    function T(k) { var d = L[lang()]; return (d && d[k]) || L.en[k] || k; }
    function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function loc() { try { return (typeof _lvLocale === 'function') ? _lvLocale() : 'en-GB'; } catch (e) { return 'en-GB'; } }
    function parts(iso) {
        var d = new Date(iso); if (isNaN(d.getTime())) return { day: '', time: '', full: '' };
        var o = { timeZone: TZ }, lc = loc();
        var wd = d.toLocaleDateString(lc, Object.assign({ weekday: 'short' }, o));
        var dm = d.toLocaleDateString(lc, Object.assign({ day: 'numeric', month: 'short' }, o));
        var tm = d.toLocaleTimeString('en-GB', Object.assign({ hour: '2-digit', minute: '2-digit', hour12: false }, o));
        var yr = d.toLocaleDateString('en-GB', Object.assign({ year: 'numeric' }, o));
        return { day: wd + ' ' + dm, time: tm, full: wd + ' ' + dm + ' · ' + tm, year: yr };
    }
    function up(s) { return lang() === 'en' ? String(s).toUpperCase() : String(s); }
    function rno(regId) { return regId ? 'R-' + String(regId).replace(/-/g, '').slice(0, 6).toUpperCase() : ''; }
    function baht(n) { var v = Number(n); return isFinite(v) && v > 0 ? '฿' + v.toLocaleString('en-US') : ''; }
    function ini(n) { var p = String(n || '').replace(/,/g, ' ').trim().split(/\s+/).filter(Boolean); return ((p[0] || '?')[0] + ((p[1] || '')[0] || '')).toUpperCase(); }
    function sb() { return window.SupabaseDB && window.SupabaseDB.client; }
    function viewer() {
        try { var u = window.AppState && AppState.currentUser; return String((u && (u.lineUserId || u.userId || u.id)) || localStorage.getItem('line_user_id') || ''); }
        catch (e) { return ''; }
    }
    function bodyLock(on) { try { document.documentElement.style.overflow = on ? 'hidden' : ''; } catch (e) {} }

    // ------------------------------------------------------------------ styles (one sheet, both themes)
    function css() {
        if (document.getElementById('sdCss')) return;
        var s = document.createElement('style'); s.id = 'sdCss';
        s.textContent =
        '#sdNew{position:fixed;inset:0;z-index:11500;background:rgba(10,13,16,.55);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;padding:16px;font-family:"Instrument Sans",sans-serif;overscroll-behavior:contain;}' +
        '#sdNew .bx{--t-card:#FFFFFF;--t-hair:rgba(15,23,42,.17);--t-ink:#10151B;--t-mut:#3E4956;--t-dim:#5C6875;--t-grn:#15803d;--t-amb:#b45309;--t-red:#be123c;--t-box:#EDF0F3;--t-solid:#FFFFFF;background:var(--t-solid);color:var(--t-ink);border:1px solid var(--t-hair);border-radius:20px;width:100%;max-width:480px;max-height:calc(100vh - 32px);max-height:calc(100dvh - 32px);display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.28);overflow:hidden;}' +
        'body:not(.theme-light) #sdNew .bx{--t-card:rgba(255,255,255,.06);--t-hair:rgba(255,255,255,.14);--t-ink:#F2F5F7;--t-mut:#B2BCC6;--t-dim:#8B97A3;--t-grn:#4ade80;--t-amb:#fbbf24;--t-red:#fb7185;--t-box:rgba(255,255,255,.07);--t-solid:#12171C;}' +
        '#sdNew .hd{padding:16px 18px 12px;border-bottom:1px solid var(--t-hair);flex:0 0 auto;}' +
        '#sdNew .ovl{font:600 9px/1 "JetBrains Mono",monospace;letter-spacing:.14em;color:var(--t-grn);margin-bottom:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
        '#sdNew .h1{font:600 19px/1.15 "Instrument Sans",sans-serif;letter-spacing:-.02em;}' +
        '#sdNew .h1 b{font:300 26px/1 Outfit,sans-serif;color:var(--t-grn);margin-right:4px;}' +
        '#sdNew .meta{font:500 10px/1.4 "JetBrains Mono",monospace;letter-spacing:.06em;color:var(--t-mut);margin-top:6px;}' +
        '#sdNew .ok{display:flex;gap:8px;align-items:flex-start;margin-top:10px;background:rgba(34,197,94,.10);border:1px solid rgba(22,163,74,.30);border-radius:11px;padding:8px 10px;font:500 12.5px/1.35 "Instrument Sans",sans-serif;color:var(--t-ink);}' +
        '#sdNew .ok .material-symbols-outlined{font-size:17px;color:var(--t-grn);}' +
        '#sdNew .ls{overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:10px 12px;display:flex;flex-direction:column;gap:8px;flex:1 1 auto;min-height:0;}' +
        '#sdNew .evh{font:700 9.5px/1 "JetBrains Mono",monospace;letter-spacing:.12em;color:var(--t-dim);margin:6px 4px 0;}' +
        '#sdNew .row{display:flex;gap:10px;align-items:center;background:var(--t-card);border:1px solid var(--t-hair);border-radius:13px;padding:10px;}' +
        '#sdNew .row.wd{background:transparent;border-style:dashed;}' +
        '#sdNew .av{flex:none;width:34px;height:34px;border-radius:50%;background:var(--t-box);border:1px solid var(--t-hair);display:flex;align-items:center;justify-content:center;font:700 11px/1 "JetBrains Mono",monospace;color:var(--t-grn);}' +
        '#sdNew .row.wd .av{color:var(--t-red);}' +
        '#sdNew .who{flex:1;min-width:0;}' +
        '#sdNew .n{font:600 14px/1.2 "Instrument Sans",sans-serif;display:flex;align-items:center;gap:6px;flex-wrap:wrap;overflow-wrap:anywhere;}' +
        '#sdNew .n .h{font:600 11px/1 "JetBrains Mono",monospace;color:var(--t-amb);}' +
        '#sdNew .when{font:600 10.5px/1.3 "JetBrains Mono",monospace;letter-spacing:.03em;color:var(--t-ink);margin-top:5px;display:flex;align-items:center;gap:4px;white-space:nowrap;}' +
        '#sdNew .when .material-symbols-outlined{font-size:13px;color:var(--t-grn);}' +
        '#sdNew .row.wd .when .material-symbols-outlined{color:var(--t-red);}' +
        '#sdNew .rc{font:500 9.5px/1.3 "JetBrains Mono",monospace;letter-spacing:.04em;color:var(--t-dim);margin-top:2px;}' +
        '#sdNew .rt{flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:6px;}' +
        '#sdNew .seat{font:700 11px/1 "JetBrains Mono",monospace;background:#16a34a;color:#fff;border-radius:8px;padding:6px 8px;white-space:nowrap;}' +
        '#sdNew .seat.pool{background:var(--t-box);color:var(--t-amb);border:1px solid var(--t-hair);}' +
        '#sdNew .seat.out{background:transparent;color:var(--t-red);border:1px solid var(--t-red);}' +
        '#sdNew .van{font:700 9.5px/1 "JetBrains Mono",monospace;border-radius:8px;padding:5px 7px;border:1px solid var(--t-hair);color:var(--t-mut);background:var(--t-box);white-space:nowrap;}' +
        '#sdNew .van.need{color:var(--t-amb);border-color:rgba(180,83,9,.45);background:rgba(251,191,36,.14);}' +
        '#sdNew .unit{border:1.5px solid rgba(22,163,74,.55);border-radius:14px;padding:8px;background:rgba(34,197,94,.06);display:flex;flex-direction:column;gap:6px;}' +
        '#sdNew .unit .lb{font:600 9px/1 "JetBrains Mono",monospace;letter-spacing:.12em;color:var(--t-grn);margin:2px 2px 0;display:flex;justify-content:space-between;gap:8px;}' +
        '#sdNew .unit .row{background:var(--t-solid);}' +
        '#sdNew .ft{padding:12px 14px 14px;border-top:1px solid var(--t-hair);display:flex;flex-direction:column;gap:8px;flex:0 0 auto;}' +
        '#sdNew .btns{display:flex;gap:8px;}' +
        '#sdNew .b{height:44px;border-radius:12px;border:1px solid var(--t-hair);background:var(--t-card);color:var(--t-mut);font:700 10.5px/1 "JetBrains Mono",monospace;letter-spacing:.08em;display:flex;align-items:center;justify-content:center;gap:6px;padding:0 14px;cursor:pointer;white-space:nowrap;}' +
        '#sdNew .b .material-symbols-outlined{font-size:16px;color:var(--t-grn);}' +
        '#sdNew .b.p{flex:1;background:#16a34a;border-color:#16a34a;color:#fff;font-size:12px;}#sdNew .b.p .material-symbols-outlined{color:#fff;}' +
        '#sdNew .note{font:500 9.5px/1.3 "JetBrains Mono",monospace;letter-spacing:.04em;color:var(--t-dim);text-align:center;}' +
        '#sdNew .bx.log{max-width:640px;}' +
        '#sdNew .lg{display:grid;grid-template-columns:auto 1fr auto;gap:2px 10px;align-items:center;padding:9px 6px;border-bottom:1px solid var(--t-hair);}' +
        '#sdNew .lg .t{font:600 10.5px/1.25 "JetBrains Mono",monospace;color:var(--t-mut);width:74px;}' +
        '#sdNew .lg .t span{color:var(--t-dim);font-weight:500;}' +
        '#sdNew .lg .nm{font:600 13.5px/1.2 "Instrument Sans",sans-serif;min-width:0;overflow-wrap:anywhere;}' +
        '#sdNew .lg .nm small{display:block;font:500 9.5px/1.3 "JetBrains Mono",monospace;color:var(--t-dim);margin-top:3px;letter-spacing:.03em;}' +
        '#sdNew .lg .st{font:700 10px/1 "JetBrains Mono",monospace;color:var(--t-grn);text-align:right;white-space:nowrap;}' +
        '#sdNew .lg .st small{display:block;font:600 9.5px/1 "JetBrains Mono",monospace;color:var(--t-mut);margin-top:5px;}' +
        '#sdNew .lg.isnew{background:rgba(34,197,94,.07);border-radius:10px;}' +
        '#sdNew .lg.wd .nm{color:var(--t-mut);}#sdNew .lg.wd .st{color:var(--t-red);}' +
        '#sdNew .div{display:flex;align-items:center;gap:8px;font:700 9px/1 "JetBrains Mono",monospace;letter-spacing:.12em;color:var(--t-amb);margin:10px 4px 2px;white-space:nowrap;}' +
        '#sdNew .div:before,#sdNew .div:after{content:"";flex:1;height:1px;background:rgba(180,83,9,.45);}' +
        '#sdNew .day{font:600 9.5px/1 "JetBrains Mono",monospace;letter-spacing:.14em;color:var(--t-dim);margin:12px 6px 4px;}' +
        '#sdNew .emp{padding:30px 10px;text-align:center;color:var(--t-mut);font:500 13px/1.4 "Instrument Sans",sans-serif;}' +
        '#teeSheetOverlay .sd-logbtn .cnt{background:#16a34a;color:#fff;border-radius:999px;padding:2px 6px;font-size:9px;margin-left:2px;}' +
        /* golfer receipt — GSV1 sheet look, light surface in both themes */
        '#sdRc{position:fixed;inset:0;z-index:12000;background:rgba(15,23,42,.62);display:flex;align-items:flex-end;justify-content:center;font-family:"Instrument Sans",sans-serif;overscroll-behavior:contain;}' +
        '@media (min-width:700px){#sdRc{align-items:center;padding:20px;}#sdRc .p{border-radius:22px !important;max-height:86vh !important;}}' +
        '#sdRc .p{background:#f4f7f5;color:#152430;width:100%;max-width:480px;max-height:92vh;border-radius:22px 22px 0 0;display:flex;flex-direction:column;box-shadow:0 -12px 40px rgba(0,0,0,.35);overflow:hidden;}' +
        '#sdRc .hd{display:flex;align-items:flex-start;gap:12px;padding:16px 16px 12px;background:#fff;border-bottom:1px solid rgba(22,35,46,.08);flex:0 0 auto;}' +
        '#sdRc .ck{width:40px;height:40px;border-radius:13px;background:linear-gradient(135deg,#15803d,#22c55e);color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px rgba(21,128,61,.35);flex:none;}' +
        '#sdRc .ovl{font:600 9px/1 "JetBrains Mono",monospace;letter-spacing:.14em;color:#15803d;margin-bottom:6px;}' +
        '#sdRc .h{font:800 20px/1.15 "Instrument Sans",sans-serif;letter-spacing:-.02em;}' +
        '#sdRc .sub{font:600 12.5px/1.35 "Instrument Sans",sans-serif;color:#3E4956;margin-top:4px;}' +
        '#sdRc .bd{padding:12px 14px;overflow-y:auto;-webkit-overflow-scrolling:touch;display:flex;flex-direction:column;gap:10px;flex:1 1 auto;min-height:0;}' +
        '#sdRc .seat{border-radius:18px;background:linear-gradient(130deg,#d9efe1 0%,#f2faf5 55%,#ffffff 130%);border:1px solid rgba(22,35,46,.08);box-shadow:0 2px 8px rgba(22,35,46,.07);padding:12px 13px;}' +
        '#sdRc .seat .k{font:800 8.5px/1 "Instrument Sans",sans-serif;letter-spacing:.11em;color:#4c6355;text-transform:uppercase;}' +
        '#sdRc .seat .big{display:flex;align-items:baseline;gap:10px;margin-top:6px;flex-wrap:wrap;}' +
        '#sdRc .seat .g{font:800 26px/1 "Instrument Sans",sans-serif;color:#15803d;letter-spacing:-.02em;}' +
        '#sdRc .seat .t{font:700 15px/1 "JetBrains Mono",monospace;color:#152430;}' +
        '#sdRc .seat .mates{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;}' +
        '#sdRc .seat .m{background:rgba(255,255,255,.85);border-radius:999px;padding:6px 10px;font:700 12.5px/1 "Instrument Sans",sans-serif;box-shadow:0 1px 3px rgba(22,35,46,.12);}' +
        '#sdRc .seat .m.me{background:#15803d;color:#fff;}' +
        '#sdRc .rcb{background:#fff;border:1px solid rgba(15,23,42,.17);border-radius:18px;padding:4px 13px;}' +
        '#sdRc .rw{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 0;border-bottom:1px dashed rgba(15,23,42,.17);font:600 13px/1.25 "Instrument Sans",sans-serif;}' +
        '#sdRc .rw:last-child{border-bottom:none;}' +
        '#sdRc .rw .k{color:#3E4956;}#sdRc .rw .v{font:700 12.5px/1.25 "JetBrains Mono",monospace;color:#10151B;text-align:right;}' +
        '#sdRc .rw .v.amb{color:#b45309;}#sdRc .rw .v.grn{color:#15803d;}' +
        '#sdRc .info{display:flex;gap:8px;align-items:flex-start;background:rgba(255,255,255,.7);border-radius:13px;padding:10px 12px;font:600 12px/1.4 "Instrument Sans",sans-serif;color:#3E4956;}' +
        '#sdRc .info .material-symbols-outlined{font-size:17px;color:#15803d;}' +
        '#sdRc .ft{display:flex;gap:8px;padding:12px 14px calc(18px + env(safe-area-inset-bottom,0px));background:#fff;border-top:1px solid rgba(22,35,46,.08);flex:0 0 auto;}' +
        '#sdRc .b{height:50px;border-radius:18px;border:1.5px solid #15803d;background:#fff;color:#15803d;font:800 13px/1 "Instrument Sans",sans-serif;display:flex;align-items:center;justify-content:center;gap:6px;padding:0 14px;flex:1;cursor:pointer;white-space:nowrap;}' +
        '#sdRc .b.p{background:linear-gradient(135deg,#15803d,#22c55e);border:none;color:#fff;flex:0 0 34%;}' +
        '#sdRc .emp{padding:28px 10px;text-align:center;color:#3E4956;font:600 13px/1.4 "Instrument Sans",sans-serif;}' +
        '.sd-rcbtn{margin-left:8px;border:1px solid currentColor;background:transparent;color:inherit;border-radius:999px;padding:3px 9px;font:800 9.5px/1 "Instrument Sans",sans-serif;letter-spacing:.08em;cursor:pointer;vertical-align:middle;}';
        document.head.appendChild(s);
    }

    // ------------------------------------------------------------------ organizer helpers
    function sheet() { return window.TeeSheet; }
    function sheetEvents() {
        var ts = sheet(); var list = [];
        try { list = (ts && ts._evSource && ts._evSource()) || []; } catch (e) { list = []; }
        var today = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
        var lo = new Date(Date.now() + 7 * 3600 * 1000 - 86400000).toISOString().slice(0, 10);
        return list.filter(function (e) { var d = String(e.date || e.event_date || '').slice(0, 10); return e && e.id && d >= lo && e.status !== 'cancelled'; })
                   .map(function (e) { return { id: String(e.id), name: String(e.name || e.title || '').replace(/&amp;/g, '&'), date: String(e.date || e.event_date || '').slice(0, 10), today: today }; });
    }
    function evShort(ev) {
        var nm = String(ev.name || '').replace(/^[A-Z]{2,6}\s*-\s*/, '').replace(/\s+(Country Club|Golf Club|Golf & Country Club|Golf Course)$/i, '');
        var dd = ''; try { dd = new Date(ev.date + 'T00:00:00+07:00').toLocaleDateString(loc(), { weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ }); } catch (e) {}
        return up(nm + (dd ? ' · ' + dd : ''));
    }
    function liveSeat(ts, evId, pid) {
        if (!ts || String(ts.eventId) !== String(evId)) return null;
        for (var i = 0; i < (ts.groups || []).length; i++) {
            var ps = ts.groups[i].players || [];
            for (var k = 0; k < ps.length; k++) if (String(ps[k].playerId) === String(pid)) {
                var tee = ''; try { tee = ts._teeOf ? ts._teeOf(i) : (ts.groups[i].teeTime || ''); } catch (e) { tee = ts.groups[i].teeTime || ''; }
                return 'G' + (i + 1) + (tee ? ' · ' + tee : '');
            }
        }
        return '';
    }
    function vanChip(ts, evId, r) {
        if (ts && String(ts.eventId) === String(evId) && ts._vanOf) {
            var v = ts._vanOf(r.player_id);
            if (v === 'own' || v == null) return '<span class="van">' + T('direct') + '</span>';
            if (v === '') return r.want_transport ? '<span class="van need">🚐 ' + T('van_unset') + '</span>' : '<span class="van">' + T('direct') + '</span>';
            var short = ''; try { short = ts._vanShort(r.player_id); } catch (e) { short = 'V' + v; }
            return '<span class="van">🚐 ' + esc(short) + '</span>';
        }
        return r.want_transport ? '<span class="van">🚐 ' + T('van') + '</span>' : '<span class="van">' + T('direct') + '</span>';
    }
    function prefLinks(ts, evId) {
        // player_id -> [player_id] for requested-together / booking-party links (current event only)
        var out = {}; if (!ts || String(ts.eventId) !== String(evId)) return out;
        var regs = ts.regs || [], byReg = {}, byName = {};
        regs.forEach(function (r) { byReg[String(r.id)] = String(r.playerId); byName[String(r.playerName || '').toLowerCase()] = String(r.playerId); });
        function link(a, b) { if (!a || !b || a === b) return; (out[a] = out[a] || []).push(b); (out[b] = out[b] || []).push(a); }
        regs.forEach(function (r) {
            var me = String(r.playerId), sr = r.specialRequests || r.special_requests || {};
            if (sr.hostId && sr.sameGroup !== false) link(me, String(sr.hostId));
            (r.partnerPrefs || r.partner_prefs || []).forEach(function (p) {
                var o = p; if (typeof p === 'string') { try { o = JSON.parse(p); } catch (e) { o = { playerId: p }; } }
                var id = o && o.playerId != null ? String(o.playerId) : '';
                link(me, byReg[id] || (regs.some(function (x) { return String(x.playerId) === id; }) ? id : '') || byName[String((o && o.playerName) || '').toLowerCase()]);
            });
        });
        return out;
    }

    function rowHtml(ts, evId, r) {
        var p = parts(r.at), wd = r.kind === 'withdraw';
        var seat = wd ? '' : liveSeat(ts, evId, r.player_id);
        if (seat === null) seat = r.seat_now || r.seat || '';
        var right = wd ? '<span class="seat out">' + T('withdrew') + '</span>'
                       : '<span class="seat' + (seat ? '' : ' pool') + '">' + esc(seat || T('pool')) + '</span>' + vanChip(ts, evId, r);
        var rc = [rno(r.reg_id), r.signup_no ? '#' + r.signup_no : '', baht(r.total_fee)].filter(Boolean).join(' · ');
        if (wd && r.by_player != null) rc += (rc ? ' · ' : '') + (r.by_player ? T('by_player') : T('by_org'));
        return '<div class="row' + (wd ? ' wd' : '') + '"><div class="av">' + esc(ini(r.player_name)) + '</div><div class="who">' +
            '<div class="n">' + esc(r.player_name || '') + (r.handicap != null ? ' <span class="h">' + esc(r.handicap) + '</span>' : '') + '</div>' +
            '<div class="when"><span class="material-symbols-outlined">' + (wd ? 'logout' : 'schedule') + '</span>' + esc(up(p.full)) + '</div>' +
            '<div class="rc">' + esc(rc) + '</div></div><div class="rt">' + right + '</div></div>';
    }

    var D = {
        _shownFor: null,
        // Called by TeeSheet.selectEvent after the organizer's sheet paints. Once per sheet open.
        onSheetLoaded: function (ts) {
            try {
                if (!ts || ts._golferMode) return;
                if (this._shownFor === ts._openToken) return;
                this._shownFor = ts._openToken;
                this.checkNews(ts);
            } catch (e) { console.warn('[SignupDesk] onSheetLoaded', e); }
        },
        checkNews: async function (ts) {
            var c = sb(), who = viewer(); if (!c || !who) return;
            var evs = sheetEvents(); if (!evs.length) return;
            var ids = evs.map(function (e) { return e.id; });
            var res = await c.rpc('signup_news', { p_events: ids, p_viewer: who });
            if (res.error || !Array.isArray(res.data) || !res.data.length) return;
            if (!document.getElementById('teeSheetOverlay')) return;   // closed meanwhile
            var cur = String(ts.eventId || ''), byId = {}; evs.forEach(function (e) { byId[e.id] = e; });
            var news = res.data.filter(function (n) { return byId[String(n.event_id)] && (n.rows || []).length; });
            news.sort(function (a, b) { if (String(a.event_id) === cur) return -1; if (String(b.event_id) === cur) return 1; return byId[a.event_id].date < byId[b.event_id].date ? -1 : 1; });
            if (!news.length) return;
            this._news = news; this._newsEvs = byId;
            this.showNews(ts);
        },
        showNews: function (ts) {
            css(); this.close();
            var news = this._news || [], byId = this._newsEvs || {}, cur = String((ts && ts.eventId) || '');
            var nSign = 0, nWd = 0, lastSeen = null;
            news.forEach(function (n) { (n.rows || []).forEach(function (r) { if (r.kind === 'withdraw') nWd++; else nSign++; }); if (n.seen_at && (!lastSeen || n.seen_at > lastSeen)) lastSeen = n.seen_at; });
            var multi = news.length > 1, html = '';
            news.forEach(function (n) {
                var evId = String(n.event_id), rows = (n.rows || []).slice();
                if (multi) html += '<div class="evh">' + esc(evShort(byId[evId])) + '</div>';
                var links = prefLinks(ts, evId), used = {};
                rows.forEach(function (r) {
                    if (used[r.id]) return; used[r.id] = 1;
                    var mates = (r.kind === 'signup' && links[String(r.player_id)]) ? rows.filter(function (x) { return !used[x.id] && x.kind === 'signup' && links[String(r.player_id)].indexOf(String(x.player_id)) >= 0; }) : [];
                    if (!mates.length) { html += rowHtml(ts, evId, r); return; }
                    mates.forEach(function (x) { used[x.id] = 1; });
                    var unit = [r].concat(mates).sort(function (a, b) { return a.at < b.at ? -1 : 1; });
                    var seats = unit.map(function (x) { var s = liveSeat(ts, evId, x.player_id); return String((s === null ? (x.seat_now || x.seat) : s) || '').split(' · ')[0]; });
                    var together = seats[0] && seats.every(function (s) { return s === seats[0]; });
                    html += '<div class="unit"><div class="lb"><span>' + T('together') + '</span><span>' + (together ? T('seated_tog') : '') + '</span></div>' +
                        unit.map(function (x) { return rowHtml(ts, evId, x); }).join('') + '</div>';
                });
            });
            var ev0 = byId[String(news[0].event_id)];
            var ovl = T('ovl_new') + (multi ? '' : ' · ' + evShort(ev0));
            var h = nSign ? ('<b>' + nSign + '</b>' + esc(T('h_new'))) : ('<b>' + nWd + '</b>' + esc(T('h_act')));
            var meta = lastSeen ? (T('last') + ' · ' + up(parts(lastSeen).full)) : '';
            var el = document.createElement('div'); el.id = 'sdNew';
            el.innerHTML = '<div class="bx" role="dialog" aria-modal="true"><div class="hd"><div class="ovl">' + esc(ovl) + '</div><div class="h1">' + h + '</div>' +
                (meta ? '<div class="meta">' + esc(meta) + '</div>' : '') +
                (nSign ? '<div class="ok"><span class="material-symbols-outlined">event_seat</span><div>' + esc(T('ok')) + '</div></div>' : '') + '</div>' +
                '<div class="ls">' + html + '</div>' +
                '<div class="ft"><div class="btns"><button class="b" onclick="SignupDesk.openLog()"><span class="material-symbols-outlined">receipt_long</span>' + esc(T('log')) + '</button>' +
                '<button class="b p" onclick="SignupDesk.ack()"><span class="material-symbols-outlined">check</span>' + esc(T('gotit')) + '</button></div>' +
                '<div class="note">' + esc(T('note')) + '</div></div></div>';
            document.body.appendChild(el); bodyLock(true);
        },
        ack: async function () {
            var news = this._news || [], ids = news.map(function (n) { return String(n.event_id); });
            this.close(); this._news = null;
            var c = sb(), who = viewer(); if (!c || !who || !ids.length) return;
            try { await c.rpc('tee_sheet_mark_seen', { p_events: ids, p_viewer: who }); } catch (e) { console.warn('[SignupDesk] ack', e); }
        },
        close: function () { var e = document.getElementById('sdNew'); if (e) { e.remove(); bodyLock(false); } },

        // ---------------- SIGN-UP LOG (organizer) ----------------
        openLog: async function (eventId) {
            var ts = sheet(); eventId = String(eventId || (ts && ts.eventId) || ''); if (!eventId) return;
            var fromNews = !!document.getElementById('sdNew') && this._news;
            css(); this.close();
            var el = document.createElement('div'); el.id = 'sdNew';
            el.innerHTML = '<div class="bx log"><div class="hd"><div class="ovl">' + esc(T('ovl_log')) + '</div><div class="h1">' + esc(T('loading')) + '</div></div></div>';
            document.body.appendChild(el); bodyLock(true);
            var c = sb(), res = null;
            try { res = await c.rpc('signup_log_for_event', { p_event: eventId, p_viewer: viewer() }); } catch (e) { res = { error: e }; }
            if (!document.getElementById('sdNew')) return;
            var data = (res && !res.error && res.data) || { rows: [] }, rows = data.rows || [];
            this._logRows = rows; this._logEvent = eventId; this._logBack = fromNews;
            var seen = data.seen_at || null, nSign = rows.filter(function (r) { return r.kind === 'signup'; }).length;
            var nWd = rows.length - nSign, html = '', day = '', divDone = !seen;
            var evName = ''; try { var ev = (ts._evSource() || []).find(function (e) { return String(e.id) === eventId; }); if (ev) evName = evShort({ name: ev.name || ev.title, date: String(ev.date || ev.event_date || '').slice(0, 10) }); } catch (e) {}
            rows.forEach(function (r) {
                var p = parts(r.at), wd = r.kind === 'withdraw';
                if (!divDone && r.at <= seen) { html += '<div class="div">' + esc(T('last') + ' · ' + up(parts(seen).full)) + '</div>'; divDone = true; day = ''; }
                if (p.day !== day) { html += '<div class="day">' + esc(up(p.day)) + '</div>'; day = p.day; }
                var seat = wd ? '' : liveSeat(ts, eventId, r.player_id); if (seat === null) seat = r.seat || '';
                var small = [rno(r.reg_id), T('hcp') + ' ' + (r.handicap != null ? r.handicap : '—'), baht(r.total_fee)].filter(Boolean).join(' · ');
                if (wd && r.by_player != null) small += ' · ' + (r.by_player ? T('by_player') : T('by_org'));
                var st = wd ? T('withdrew') : (seat || T('pool'));
                var sub = wd ? '' : (r.want_transport ? '🚐 ' + T('van') : T('direct'));
                html += '<div class="lg' + (seen && r.at > seen && !r.backfill ? ' isnew' : '') + (wd ? ' wd' : '') + '"><div class="t">' + esc(p.time) + '<br><span>' + (r.signup_no ? '#' + String(r.signup_no).padStart(2, '0') : '') + '</span></div>' +
                    '<div class="nm">' + esc(r.player_name || '') + '<small>' + esc(small) + '</small></div><div class="st">' + esc(st) + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div></div>';
            });
            if (!rows.length) html = '<div class="emp">' + esc(T('empty')) + '</div>';
            el.innerHTML = '<div class="bx log" role="dialog" aria-modal="true"><div class="hd"><div class="ovl">' + esc(T('ovl_log') + (evName ? ' · ' + evName : '')) + '</div>' +
                '<div class="h1"><b>' + nSign + '</b>' + esc(T('h_log')) + '</div>' +
                '<div class="meta">' + (nWd ? '<span style="color:var(--t-red);font-weight:700">' + nWd + ' ' + esc(up(T('withdrawals'))) + '</span> · ' : '') + esc(T('meta_log')) + '</div></div>' +
                '<div class="ls" style="gap:0">' + html + '</div>' +
                '<div class="ft"><div class="btns"><button class="b" onclick="SignupDesk.csv()"><span class="material-symbols-outlined">download</span>' + esc(T('csv')) + '</button>' +
                '<button class="b" onclick="SignupDesk.printLog()"><span class="material-symbols-outlined">print</span>' + esc(T('print')) + '</button>' +
                '<button class="b p" onclick="SignupDesk.closeLog()"><span class="material-symbols-outlined">close</span>' + esc(T('close')) + '</button></div></div></div>';
        },
        closeLog: function () { this.close(); if (this._logBack && this._news) this.showNews(sheet()); },
        _logTable: function () {
            var ts = sheet(), ev = this._logEvent;
            return (this._logRows || []).slice().reverse().map(function (r) {
                var p = parts(r.at), seat = r.kind === 'withdraw' ? '' : liveSeat(ts, ev, r.player_id); if (seat === null) seat = r.seat || '';
                return { date: p.day + ' ' + (p.year || ''), time: p.time, kind: r.kind === 'withdraw' ? T('withdrew') : 'SIGN-UP', no: r.signup_no || '', name: r.player_name || '',
                         hcp: r.handicap != null ? r.handicap : '', fee: r.total_fee || '', receipt: rno(r.reg_id), seat: seat || '', transport: r.want_transport ? T('van') : T('direct') };
            });
        },
        csv: function () {
            var rows = this._logTable(), head = ['date', 'time', 'kind', 'no', 'name', 'hcp', 'fee', 'receipt', 'seat', 'transport'];
            var q = function (v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
            var txt = '﻿' + head.join(',') + '\n' + rows.map(function (r) { return head.map(function (k) { return q(r[k]); }).join(','); }).join('\n');
            try {
                var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' }));
                a.download = 'signup-log-' + String(this._logEvent || '').slice(0, 8) + '.csv'; document.body.appendChild(a); a.click();
                setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
            } catch (e) { console.warn('[SignupDesk] csv', e); }
        },
        printLog: function () {
            var rows = this._logTable(), ts = sheet();
            var title = esc((ts && ts.eventName) || T('ovl_log'));
            var tr = rows.map(function (r) { return '<tr' + (r.kind !== 'SIGN-UP' ? ' class="w"' : '') + '><td>' + esc(r.date) + '</td><td>' + esc(r.time) + '</td><td>' + esc(r.kind) + '</td><td>' + esc(r.no) + '</td><td>' + esc(r.name) + '</td><td>' + esc(r.hcp) + '</td><td>' + esc(r.fee) + '</td><td>' + esc(r.receipt) + '</td><td>' + esc(r.seat) + '</td></tr>'; }).join('');
            var html = '<!doctype html><html><head><meta charset="utf-8"><title>' + title + '</title><style>body{font:12px/1.4 Arial,sans-serif;margin:12mm;color:#111}h1{font-size:16px;margin:0 0 4px}p{margin:0 0 10px;color:#444}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #ccc;padding:4px 6px;text-align:left}th{font-size:10px;text-transform:uppercase;color:#444}tr.w td{color:#b91c1c}</style></head><body><h1>' + title + ' — ' + esc(T('ovl_log')) + '</h1><p>' + esc(T('meta_log')) + '</p><table><thead><tr><th>Date</th><th>Time</th><th></th><th>#</th><th>Name</th><th>HCP</th><th>Fee</th><th>Receipt</th><th>Seat</th></tr></thead><tbody>' + tr + '</tbody></table><script>window.onload=function(){window.print();}<\/script></body></html>';
            try { var w = window.open('', '_blank'); if (w) { w.document.open(); w.document.write(html); w.document.close(); } } catch (e) { console.warn('[SignupDesk] print', e); }
        },
        logButton: function (ts) {
            if (!ts || ts._golferMode) return '';
            var n = (ts.regs || []).length;
            return '<button onclick="SignupDesk.openLog()" class="ts2-tbtn sd-logbtn"><span class="material-symbols-outlined">receipt_long</span>' + esc(T('log')) + (n ? '<span class="cnt">' + n + '</span>' : '') + '</button>';
        },

        // ---------------- GOLFER RECEIPT ----------------
        showReceipt: async function (eventId, opts) {
            eventId = String(eventId || ''); var me = viewer(), c = sb(); if (!eventId || !me || !c) return;
            css(); this.closeReceipt(true);
            this._rcAfter = (opts && typeof opts.after === 'function') ? opts.after : null;
            var el = document.createElement('div'); el.id = 'sdRc';
            el.onclick = function (e) { if (e.target === el) SignupDesk.closeReceipt(); };
            el.innerHTML = '<div class="p"><div class="emp">' + esc(T('loading')) + '</div></div>';
            document.body.appendChild(el); bodyLock(true);
            var G = window.GolferEventsSystem || {};
            var ev = ((G.allEvents || []).find(function (x) { return String(x.id) === eventId; })) || (G.currentEvent && String(G.currentEvent.id) === eventId ? G.currentEvent : null) || {};
            var rc = null, pairing = null;
            try {
                var out = await Promise.all([c.rpc('signup_receipt', { p_event: eventId, p_player: me }), window.SocietyGolfDB ? SocietyGolfDB.getPairings(eventId) : null]);
                rc = out[0] && !out[0].error ? out[0].data : null; pairing = out[1];
            } catch (e) { console.warn('[SignupDesk] receipt', e); }
            if (!document.getElementById('sdRc')) return;
            var panel = el.querySelector('.p');
            if (!rc) { panel.innerHTML = '<div class="emp">' + esc(T('r_none')) + '</div><div class="ft"><button class="b p" style="flex:1" onclick="SignupDesk.closeReceipt()">' + esc(T('r_done')) + '</button></div>'; return; }
            // my group + mates from the live sheet
            var gi = -1, mates = [], tee = '';
            var groups = (pairing && Array.isArray(pairing.groups)) ? pairing.groups : [];
            groups.forEach(function (g, i) { var ps = Array.isArray(g) ? g : (g.players || []); if (ps.some(function (p) { return String(p.playerId || p.id) === me; })) { gi = i; mates = ps; tee = (!Array.isArray(g) && g.teeTime) ? String(g.teeTime).slice(0, 5) : ''; } });
            if (!tee && rc.seat) tee = (String(rc.seat).split(' · ')[1] || '');
            var evName = String(ev.name || ev.title || '').replace(/&amp;/g, '&');
            var d = String(ev.date || ev.event_date || '').slice(0, 10), dd = '';
            try { if (d) dd = new Date(d + 'T00:00:00+07:00').toLocaleDateString(loc(), { weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ }); } catch (e) {}
            var sub = [evName.replace(/\s*-\s*/, ' · '), dd].filter(Boolean).join(' · ');
            var dep = String(ev.departureTime || ev.departure_time || '').slice(0, 5);
            var p = parts(rc.signed_up_at), paid = String(rc.payment_status || '').toLowerCase() === 'paid';
            var seatHtml = gi >= 0
                ? '<div class="seat"><div class="k">' + esc(T('r_group')) + '</div><div class="big"><span class="g">' + esc(T('r_groupn')) + ' ' + (gi + 1) + '</span>' + (tee ? '<span class="t">' + esc(T('r_tee')) + ' ' + esc(tee) + '</span>' : '') + '</div>' +
                  '<div class="mates">' + mates.filter(function (m) { return String(m.playerId || m.id) !== me; }).map(function (m) { return '<span class="m">' + esc(m.playerName || m.name || '') + '</span>'; }).join('') + '<span class="m me">' + esc(T('r_you')) + '</span></div></div>'
                : '';
            panel.innerHTML =
                '<div class="hd"><div class="ck"><span class="material-symbols-outlined">check</span></div><div style="flex:1;min-width:0"><div class="ovl">' + esc(T('r_ovl')) + '</div>' +
                '<div class="h">' + esc(gi >= 0 ? T('r_h') : T('r_h2')) + '</div><div class="sub">' + esc(sub) + '</div></div></div>' +
                '<div class="bd">' + seatHtml +
                '<div class="rcb">' +
                    '<div class="rw"><span class="k">' + esc(T('r_signed')) + '</span><span class="v">' + esc(up(p.day + ' ' + (p.year || '') + ' · ' + p.time)) + '</span></div>' +
                    '<div class="rw"><span class="k">' + esc(T('r_no')) + '</span><span class="v">' + esc(rno(rc.reg_id) + (rc.signup_no ? ' · #' + rc.signup_no : '')) + '</span></div>' +
                    (dep || rc.want_transport != null ? '<div class="rw"><span class="k">' + esc(T('r_dep')) + '</span><span class="v">' + esc([dep, rc.want_transport ? up(T('van')) : up(T('direct'))].filter(Boolean).join(' · ')) + '</span></div>' : '') +
                    (baht(rc.total_fee) ? '<div class="rw"><span class="k">' + esc(T('r_fee')) + '</span><span class="v">' + esc(baht(rc.total_fee)) + '</span></div>' : '') +
                    '<div class="rw"><span class="k">' + esc(T('r_pay')) + '</span><span class="v ' + (paid ? 'grn' : 'amb') + '">' + esc(paid ? T('r_paid') : T('r_unpaid')) + '</span></div>' +
                '</div>' +
                '<div class="info"><span class="material-symbols-outlined">swap_horiz</span><div>' + esc(T('r_info')) + '</div></div>' +
                '</div>' +
                '<div class="ft"><button class="b" onclick="SignupDesk.moveGroup(\'' + esc(eventId) + '\')"><span class="material-symbols-outlined">group</span>' + esc(T('r_move')) + '</button>' +
                '<button class="b p" onclick="SignupDesk.closeReceipt()">' + esc(T('r_done')) + '</button></div>';
        },
        closeReceipt: function (skipAfter) {
            var e = document.getElementById('sdRc'); if (e) { e.remove(); bodyLock(false); }
            var after = this._rcAfter; this._rcAfter = null;
            if (after && !skipAfter) { try { after(); } catch (x) {} }
        },
        moveGroup: function (eventId) {
            this.closeReceipt(true);
            try {
                if (typeof DashboardUpcomingEvents !== 'undefined' && DashboardUpcomingEvents.viewTeeSheet) { DashboardUpcomingEvents.viewTeeSheet(eventId); return; }
            } catch (e) {}
            try { window.GolferEventsSystem && GolferEventsSystem.openPlayersModal(); } catch (e) {}
        },
        receiptButton: function (eventId) {
            return '<button type="button" class="sd-rcbtn" onclick="event.stopPropagation();SignupDesk.showReceipt(\'' + esc(eventId) + '\')">' + esc(T('receipt')) + ' ›</button>';
        }
    };
    window.SignupDesk = D;
    css();
})();

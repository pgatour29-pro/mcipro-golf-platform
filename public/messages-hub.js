/* ============================================================================
   MESSAGES HUB (v1558) — the pro shop's inbox on the Tee sheet and the Caddy desk
   Pete 2026-10-13: "from the tee sheet and caddy desk: messaging system: messaging caddies and notifications along with
   adding caddies in the messages to the golfer if necessary. also in the message system we have folders but we need to
   be able to put them in those folders and the ability to Pin those chat threads to keep up on top".
   Built 1:1 from the approved mockups (mockups/messages-hub-20261013, mk.js):
     · Messages button + unread badge beside Societies → one inbox: golfers, caddies, societies, staff.
     · Folders Golfers / Caddies / Societies / Staff (who the other side is) + the course's own folders;
       PINNED threads on top; ⋯ = Pin to top / Mark unread / Move to folder / New folder.
       Pins + folders belong to the COURSE (every desk device sees the same ones): msg_thread_prefs owner 'desk:<course>'.
     · A golfer's thread: "+ Add caddy" (their caddy today first) → golfer + pro shop + caddy in ONE chat (group_chats,
       app + LINE). Messages from the hub go into that chat once a caddy is in it, else the course's direct message.
     · Message caddies: On duty / On course / Free / one caddy, quick messages, an honest count of who has the app.
   Every read and write = mh_* RPCs behind the course's OWN-PIN desk token (sql/messages_hub_v1558.sql).
   Society event threads are listed here and open in the Societies panel (CourseLink owns them).
   ============================================================================ */
(function () {
  'use strict';
  var W = window;
  if (W.MessagesHub) return;
  var E = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var P = {
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12z"/>',
    pin: '<path d="M9 4h6l-1 5 3 3v2H7v-2l3-3-1-5zM12 14v7"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    add: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>',
    send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
    back: '<path d="M15 18l-6-6 6-6"/>',
    unread: '<circle cx="12" cy="12" r="4"/>',
    people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 4 6"/>',
    line: '<rect x="3" y="4" width="18" height="16" rx="5"/><path d="M8 10v4M11 10v4l3-4v4M17 10h-2v4h2M15 12h2"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3"/>'
  };
  var I = function (n, s) { return '<svg viewBox="0 0 24 24" width="' + (s || 16) + '" height="' + (s || 16) + '" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + P[n] + '</svg>'; };
  var ini = function (n) { return String(n || '?').replace(/^#\S+\s+/, '').trim().split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase() || '?'; };
  var first = function (n) { return String(n || '').trim().split(/\s+/)[0] || ''; };
  var isUid = function (id) { return /^U[0-9a-f]{32}$/i.test(String(id || '')); };

  var STR = {
    en: {
      btn: 'Messages', title: 'Messages', search: 'Search names, caddy #, Call PIN', all: 'All', g: 'Golfers', c: 'Caddies', s: 'Societies', st: 'Staff',
      folder: 'Folder', pinned: 'Pinned', recent: 'Recent', foot: 'Golfers, caddies and societies in one place', newMsg: '+ New message',
      tagG: 'Golfer', tagGC: 'Golfer + caddy', tagC: 'Caddy', tagCs: 'Caddies', tagS: 'Society', tagSt: 'Staff', you: 'You:',
      pinTop: 'Pin to top', unpin: 'Unpin', markUnread: 'Mark unread', markRead: 'Mark read', moveTo: 'Move to folder', newFolder: 'New folder',
      folderName: 'Folder name', save: 'Save', cancel: 'Cancel', delFolder: 'Delete this folder', delFolderSub: 'Its chats go back to their own folders',
      empty: 'No messages yet. Golfers who write to the course, caddies and society chats show up here.', emptyF: 'Nothing in this folder yet.',
      inChat: 'In this chat', proshop: 'Pro shop', addCaddy: 'Add caddy', onBooking: 'On their booking today', theirCaddy: 'their caddy', groupCaddy: 'a caddy in their group',
      anyCaddy: 'Any caddy', caddySearch: 'Caddy # or name', appLine: 'App + LINE', app: 'App', noApp: 'No app yet', add: 'Add', added: 'In chat',
      write: 'Write a message…', goesTo: 'Goes to {who}', viaAppLine: 'app + LINE', viaApp: 'app', pinnedPill: 'Pinned', today: 'Today',
      sysAdded: 'Pro shop added caddy #{n} {name} · they see this chat from now on', caddyLbl: 'caddy',
      notSent: 'Not sent. Check the connection and try again.', noOne: 'Nobody got it: this person has no account yet.',
      msgCaddies: 'Message caddies', to: 'To', duty: 'On duty', course: 'On course', free: 'At course, free', oneCaddy: 'Or one caddy',
      quick: 'Quick message', q1: 'Come to the caddy desk', q2: 'Rain: wait at the shelter', q3: 'Your group moved to …', q4: 'Course closed this afternoon',
      q1t: 'Please come to the caddy desk now.', q2t: 'Rain is coming. Groups on the course: wait at the nearest shelter until the horn.', q3t: 'Your group has moved to ', q4t: 'The course is closed this afternoon. Please come back to the caddy desk.',
      getNow: '{n} get it now · app + LINE', getNowApp: '{n} get it now · app', noAppN: '{n} have no app yet', noAppSub: 'It waits in their Messages until they sign in with their caddy PIN (Staff › Caddy). Tell them at the desk.',
      savedIn: 'Saved in Messages › Caddies', sendTo: 'Send to {n}', sent: 'Sent to {n}', nobody: 'Pick who gets it', pins: 'Caddy PINs',
      pinsSub: 'Each caddy signs in with their own PIN: Staff › Caddy. Hand it to them in person, never by message.', signedIn: 'Signed in',
      typeMsg: 'Write the message first', bcLabel: { duty: 'Caddies on duty', course: 'Caddies on the course', free: 'Caddies free at the course', one: 'One caddy' },
      bcSent: 'Sent to {n} · {l} live', newTitle: 'New message', golferFind: 'Golfer name or Call PIN', results: 'Golfers', noMatch: 'No match',
      tokNeed: 'Messages are private to the course. Type the course\'s own pro shop PIN once on this device.', tokGo: 'Open Messages', tokBad: 'That PIN is not this course\'s own PIN.',
      offline: 'No connection. Try again.', loading: 'Loading…', openSoc: 'Opens in the Societies panel', now: 'now', yest: 'Yesterday'
    },
    th: {
      btn: 'ข้อความ', title: 'ข้อความ', search: 'ค้นหาชื่อ, เบอร์แคดดี้, Call PIN', all: 'ทั้งหมด', g: 'นักกอล์ฟ', c: 'แคดดี้', s: 'ก๊วน', st: 'พนักงาน',
      folder: 'โฟลเดอร์', pinned: 'ปักหมุด', recent: 'ล่าสุด', foot: 'นักกอล์ฟ แคดดี้ และก๊วน ในที่เดียว', newMsg: '+ ข้อความใหม่',
      tagG: 'นักกอล์ฟ', tagGC: 'นักกอล์ฟ + แคดดี้', tagC: 'แคดดี้', tagCs: 'แคดดี้', tagS: 'ก๊วน', tagSt: 'พนักงาน', you: 'คุณ:',
      pinTop: 'ปักหมุดไว้บนสุด', unpin: 'เลิกปักหมุด', markUnread: 'ทำเป็นยังไม่อ่าน', markRead: 'ทำเป็นอ่านแล้ว', moveTo: 'ย้ายไปโฟลเดอร์', newFolder: 'โฟลเดอร์ใหม่',
      folderName: 'ชื่อโฟลเดอร์', save: 'บันทึก', cancel: 'ยกเลิก', delFolder: 'ลบโฟลเดอร์นี้', delFolderSub: 'แชทจะกลับไปโฟลเดอร์เดิม',
      empty: 'ยังไม่มีข้อความ นักกอล์ฟที่เขียนถึงสนาม แคดดี้ และแชทก๊วนจะแสดงที่นี่', emptyF: 'ยังไม่มีอะไรในโฟลเดอร์นี้',
      inChat: 'ในแชทนี้', proshop: 'โปรช็อป', addCaddy: 'เพิ่มแคดดี้', onBooking: 'ในการจองวันนี้', theirCaddy: 'แคดดี้ของเขา', groupCaddy: 'แคดดี้ในกลุ่มเดียวกัน',
      anyCaddy: 'แคดดี้คนอื่น', caddySearch: 'เบอร์หรือชื่อแคดดี้', appLine: 'แอป + LINE', app: 'แอป', noApp: 'ยังไม่มีแอป', add: 'เพิ่ม', added: 'อยู่ในแชท',
      write: 'พิมพ์ข้อความ…', goesTo: 'ส่งถึง {who}', viaAppLine: 'แอป + LINE', viaApp: 'แอป', pinnedPill: 'ปักหมุด', today: 'วันนี้',
      sysAdded: 'โปรช็อปเพิ่มแคดดี้ #{n} {name} · เห็นแชทนี้ตั้งแต่ตอนนี้', caddyLbl: 'แคดดี้',
      notSent: 'ส่งไม่สำเร็จ ตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง', noOne: 'ไม่มีใครได้รับ: คนนี้ยังไม่มีบัญชี',
      msgCaddies: 'ส่งข้อความถึงแคดดี้', to: 'ถึง', duty: 'เข้างาน', course: 'อยู่ในสนาม', free: 'อยู่ที่สนาม ว่าง', oneCaddy: 'หรือแคดดี้คนเดียว',
      quick: 'ข้อความด่วน', q1: 'มาที่โต๊ะแคดดี้', q2: 'ฝนตก: รอที่ศาลา', q3: 'กลุ่มของคุณย้ายไป …', q4: 'สนามปิดบ่ายนี้',
      q1t: 'กรุณามาที่โต๊ะแคดดี้ตอนนี้', q2t: 'ฝนกำลังมา กลุ่มที่อยู่ในสนาม: รอที่ศาลาที่ใกล้ที่สุดจนกว่าจะได้ยินแตร', q3t: 'กลุ่มของคุณย้ายไปที่ ', q4t: 'สนามปิดบ่ายนี้ กรุณากลับมาที่โต๊ะแคดดี้',
      getNow: '{n} คนได้รับตอนนี้ · แอป + LINE', getNowApp: '{n} คนได้รับตอนนี้ · แอป', noAppN: '{n} คนยังไม่มีแอป', noAppSub: 'ข้อความรออยู่ในกล่องข้อความจนกว่าจะเข้าสู่ระบบด้วย PIN แคดดี้ (พนักงาน › แคดดี้) แจ้งที่โต๊ะ',
      savedIn: 'บันทึกใน ข้อความ › แคดดี้', sendTo: 'ส่งถึง {n} คน', sent: 'ส่งถึง {n} คนแล้ว', nobody: 'เลือกผู้รับ', pins: 'PIN แคดดี้',
      pinsSub: 'แคดดี้แต่ละคนเข้าสู่ระบบด้วย PIN ของตัวเอง: พนักงาน › แคดดี้ ให้กับตัว ห้ามส่งทางข้อความ', signedIn: 'เข้าสู่ระบบแล้ว',
      typeMsg: 'พิมพ์ข้อความก่อน', bcLabel: { duty: 'แคดดี้ที่เข้างาน', course: 'แคดดี้ที่อยู่ในสนาม', free: 'แคดดี้ที่ว่างอยู่ที่สนาม', one: 'แคดดี้หนึ่งคน' },
      bcSent: 'ส่งถึง {n} · ได้รับทันที {l}', newTitle: 'ข้อความใหม่', golferFind: 'ชื่อนักกอล์ฟหรือ Call PIN', results: 'นักกอล์ฟ', noMatch: 'ไม่พบ',
      tokNeed: 'ข้อความเป็นความลับของสนาม พิมพ์ PIN โปรช็อปของสนามหนึ่งครั้งบนเครื่องนี้', tokGo: 'เปิดข้อความ', tokBad: 'PIN นี้ไม่ใช่ PIN ของสนามนี้',
      offline: 'ไม่มีการเชื่อมต่อ ลองอีกครั้ง', loading: 'กำลังโหลด…', openSoc: 'เปิดในแผงก๊วน', now: 'ตอนนี้', yest: 'เมื่อวาน'
    },
    ko: {
      btn: '메시지', title: '메시지', search: '이름, 캐디 번호, Call PIN 검색', all: '전체', g: '골퍼', c: '캐디', s: '소사이어티', st: '직원',
      folder: '폴더', pinned: '고정됨', recent: '최근', foot: '골퍼, 캐디, 소사이어티를 한곳에서', newMsg: '+ 새 메시지',
      tagG: '골퍼', tagGC: '골퍼 + 캐디', tagC: '캐디', tagCs: '캐디', tagS: '소사이어티', tagSt: '직원', you: '나:',
      pinTop: '맨 위에 고정', unpin: '고정 해제', markUnread: '읽지 않음으로 표시', markRead: '읽음으로 표시', moveTo: '폴더로 이동', newFolder: '새 폴더',
      folderName: '폴더 이름', save: '저장', cancel: '취소', delFolder: '이 폴더 삭제', delFolderSub: '대화는 원래 폴더로 돌아갑니다',
      empty: '아직 메시지가 없습니다. 코스에 연락한 골퍼, 캐디, 소사이어티 대화가 여기에 표시됩니다.', emptyF: '이 폴더는 비어 있습니다.',
      inChat: '참여자', proshop: '프로숍', addCaddy: '캐디 추가', onBooking: '오늘 예약', theirCaddy: '본인 캐디', groupCaddy: '같은 조 캐디',
      anyCaddy: '다른 캐디', caddySearch: '캐디 번호 또는 이름', appLine: '앱 + LINE', app: '앱', noApp: '앱 없음', add: '추가', added: '참여 중',
      write: '메시지 입력…', goesTo: '{who}에게 전송', viaAppLine: '앱 + LINE', viaApp: '앱', pinnedPill: '고정됨', today: '오늘',
      sysAdded: '프로숍이 캐디 #{n} {name} 님을 추가했습니다 · 지금부터 이 대화를 봅니다', caddyLbl: '캐디',
      notSent: '보내지 못했습니다. 연결을 확인하고 다시 시도하세요.', noOne: '받은 사람이 없습니다: 아직 계정이 없습니다.',
      msgCaddies: '캐디에게 메시지', to: '받는 사람', duty: '근무 중', course: '코스에', free: '코스 대기', oneCaddy: '또는 캐디 한 명',
      quick: '빠른 메시지', q1: '캐디 데스크로 오세요', q2: '비: 쉼터에서 대기', q3: '조가 이동했습니다 …', q4: '오후 코스 폐장',
      q1t: '지금 캐디 데스크로 와 주세요.', q2t: '비가 옵니다. 코스에 있는 조는 경적이 울릴 때까지 가까운 쉼터에서 대기하세요.', q3t: '조가 이동했습니다: ', q4t: '오늘 오후 코스가 폐장합니다. 캐디 데스크로 돌아와 주세요.',
      getNow: '{n}명이 지금 받음 · 앱 + LINE', getNowApp: '{n}명이 지금 받음 · 앱', noAppN: '{n}명은 아직 앱이 없음', noAppSub: '캐디 PIN(직원 › 캐디)으로 로그인할 때까지 메시지함에서 기다립니다. 데스크에서 알려 주세요.',
      savedIn: '메시지 › 캐디에 저장', sendTo: '{n}명에게 보내기', sent: '{n}명에게 보냄', nobody: '받는 사람을 고르세요', pins: '캐디 PIN',
      pinsSub: '캐디는 각자의 PIN으로 로그인합니다: 직원 › 캐디. 메시지가 아닌 직접 전달하세요.', signedIn: '로그인함',
      typeMsg: '먼저 메시지를 입력하세요', bcLabel: { duty: '근무 중 캐디', course: '코스에 있는 캐디', free: '코스 대기 캐디', one: '캐디 한 명' },
      bcSent: '{n}명에게 보냄 · 즉시 {l}', newTitle: '새 메시지', golferFind: '골퍼 이름 또는 Call PIN', results: '골퍼', noMatch: '결과 없음',
      tokNeed: '메시지는 코스 전용입니다. 이 기기에서 코스 자체 프로숍 PIN을 한 번 입력하세요.', tokGo: '메시지 열기', tokBad: '이 코스의 PIN이 아닙니다.',
      offline: '연결 없음. 다시 시도하세요.', loading: '불러오는 중…', openSoc: '소사이어티 패널에서 열림', now: '방금', yest: '어제'
    },
    ja: {
      btn: 'メッセージ', title: 'メッセージ', search: '名前、キャディ番号、Call PINで検索', all: 'すべて', g: 'ゴルファー', c: 'キャディ', s: 'ソサエティ', st: 'スタッフ',
      folder: 'フォルダ', pinned: 'ピン留め', recent: '最近', foot: 'ゴルファー、キャディ、ソサエティを一か所で', newMsg: '+ 新しいメッセージ',
      tagG: 'ゴルファー', tagGC: 'ゴルファー + キャディ', tagC: 'キャディ', tagCs: 'キャディ', tagS: 'ソサエティ', tagSt: 'スタッフ', you: 'あなた:',
      pinTop: '一番上にピン留め', unpin: 'ピン留めを外す', markUnread: '未読にする', markRead: '既読にする', moveTo: 'フォルダへ移動', newFolder: '新しいフォルダ',
      folderName: 'フォルダ名', save: '保存', cancel: 'キャンセル', delFolder: 'このフォルダを削除', delFolderSub: 'チャットは元のフォルダに戻ります',
      empty: 'メッセージはまだありません。コースに連絡したゴルファー、キャディ、ソサエティのチャットがここに表示されます。', emptyF: 'このフォルダはまだ空です。',
      inChat: 'このチャットの参加者', proshop: 'プロショップ', addCaddy: 'キャディを追加', onBooking: '本日の予約', theirCaddy: '本人のキャディ', groupCaddy: '同じ組のキャディ',
      anyCaddy: 'ほかのキャディ', caddySearch: 'キャディ番号または名前', appLine: 'アプリ + LINE', app: 'アプリ', noApp: 'アプリなし', add: '追加', added: '参加中',
      write: 'メッセージを入力…', goesTo: '{who} に送信', viaAppLine: 'アプリ + LINE', viaApp: 'アプリ', pinnedPill: 'ピン留め', today: '今日',
      sysAdded: 'プロショップがキャディ #{n} {name} を追加しました · 今からこのチャットを見られます', caddyLbl: 'キャディ',
      notSent: '送信できませんでした。接続を確認してもう一度お試しください。', noOne: '誰にも届きませんでした: まだアカウントがありません。',
      msgCaddies: 'キャディにメッセージ', to: '宛先', duty: '出勤中', course: 'コース上', free: 'コースで待機', oneCaddy: 'またはキャディ1人',
      quick: 'クイックメッセージ', q1: 'キャディデスクへ来てください', q2: '雨: 避難所で待機', q3: '組が移動しました …', q4: '午後はコース閉鎖',
      q1t: '今すぐキャディデスクへ来てください。', q2t: '雨が来ます。コース上の組はホーンが鳴るまで最寄りの避難所で待機してください。', q3t: '組の移動先: ', q4t: '本日午後はコース閉鎖です。キャディデスクへ戻ってください。',
      getNow: '{n}人が今受け取ります · アプリ + LINE', getNowApp: '{n}人が今受け取ります · アプリ', noAppN: '{n}人はまだアプリなし', noAppSub: 'キャディPIN(スタッフ › キャディ)でサインインするまでメッセージ欄で待ちます。デスクで伝えてください。',
      savedIn: 'メッセージ › キャディに保存', sendTo: '{n}人に送信', sent: '{n}人に送信しました', nobody: '宛先を選んでください', pins: 'キャディPIN',
      pinsSub: 'キャディは各自のPINでサインインします: スタッフ › キャディ。メッセージではなく直接渡してください。', signedIn: 'サインイン済み',
      typeMsg: '先にメッセージを入力してください', bcLabel: { duty: '出勤中のキャディ', course: 'コース上のキャディ', free: 'コースで待機中のキャディ', one: 'キャディ1人' },
      bcSent: '{n}人に送信 · すぐに届いたのは{l}人', newTitle: '新しいメッセージ', golferFind: 'ゴルファー名またはCall PIN', results: 'ゴルファー', noMatch: '該当なし',
      tokNeed: 'メッセージはコース専用です。この端末でコース自身のプロショップPINを一度入力してください。', tokGo: 'メッセージを開く', tokBad: 'このコースのPINではありません。',
      offline: '接続がありません。もう一度お試しください。', loading: '読み込み中…', openSoc: 'ソサエティパネルで開きます', now: '今', yest: '昨日'
    }
  };

  var CSS = [
    '#mh-dialog{margin:12px 12px 12px auto;width:480px;max-width:calc(100vw - 24px);height:calc(100vh - 24px);max-height:calc(100vh - 24px);padding:0;display:flex;flex-direction:column;overflow:hidden}',
    '#mh-dialog:not([open]){display:none}',
    '#mh-dialog::backdrop{background:rgba(0,0,0,.28)}',
    '#mh-dialog .modal-header h2{display:flex;align-items:center;gap:8px}#mh-dialog .modal-header h2 svg{color:var(--brand)}',
    '#mh-dialog .mh-bd{flex:1;min-height:0;overflow:auto;padding:12px 14px 14px;position:relative}',
    '.mh-srch{display:flex;align-items:center;gap:8px;border:1px solid var(--line-2);border-radius:12px;background:var(--panel-solid);padding:0 12px;color:var(--muted);margin-bottom:10px}',
    '.mh-srch input{flex:1;min-width:0;border:0;background:transparent;color:var(--ink);font-size:13.5px;font-weight:600;font-family:inherit;padding:10px 0;outline:none}',
    '.mh-srch input::placeholder{color:var(--muted)}',
    '.mh-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;align-items:center}',
    '.mh-chips button{flex:none;display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line-2);background:var(--card);color:var(--ink);border-radius:999px;padding:6px 12px;font-weight:700;font-size:12.5px;line-height:1.2;font-family:inherit;cursor:pointer;white-space:nowrap}',
    '.mh-chips button.on{background:#16a34a;border-color:#16a34a;color:#fff}',
    '.mh-chips button i{font-style:normal;font-size:10.5px;font-weight:800;background:#22c55e;color:#04140d;border-radius:9px;padding:1px 6px}',
    '.mh-chips button.on i{background:#fff;color:#15803d}',
    '.mh-chips button.add{border-style:dashed;color:var(--muted)}',
    '.mh-nf{display:inline-flex;gap:6px;align-items:center}',
    '.mh-nf input{width:150px;border:1px solid #22c55e;border-radius:999px;background:var(--card);color:var(--ink);padding:6px 12px;font-size:12.5px;font-weight:700;font-family:inherit;outline:none}',
    '.mh-nf button.ok{background:#16a34a;border-color:#16a34a;color:#fff}',
    '.mh-sec{display:flex;align-items:center;gap:6px;font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:10px 2px 6px}',
    '.mh-sec svg{width:12px;height:12px}',
    '.mh-row{position:relative;display:flex;gap:10px;align-items:center;width:100%;text-align:left;border:1px solid var(--line-2);background:var(--card);color:var(--ink);border-radius:12px;padding:9px 10px;margin-bottom:6px;font-family:inherit;cursor:pointer}',
    '.mh-row.pin{border-color:color-mix(in srgb,#22c55e 45%,var(--line-2));background:color-mix(in srgb,#22c55e 6%,var(--card))}',
    '.mh-row.sel{outline:2px solid var(--brand)}',
    '.mh-av{position:relative;flex:none;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:14px;background:color-mix(in srgb,var(--ink) 10%,var(--card));color:var(--ink)}',
    '.mh-av img{position:absolute;inset:0;width:100%;height:100%;border-radius:inherit;object-fit:cover}',
    '.mh-av.cad{background:#0f3d24;color:#86efac;font-size:13px}.mh-av.soc{border-radius:11px;background:#0c2a3d;color:#7dd3fc}.mh-av.grp{background:#3a2a08;color:#fcd34d}',
    '.mh-av .n{position:absolute;right:-3px;bottom:-3px;font:800 9.5px/1 "IBM Plex Mono",ui-monospace,monospace;background:#22c55e;color:#04140d;border-radius:6px;padding:2px 3px;border:2px solid var(--card);z-index:1}',
    '.mh-w{flex:1;min-width:0}',
    '.mh-t{display:flex;align-items:center;gap:6px;font-size:14px;font-weight:800;white-space:nowrap;overflow:hidden}',
    '.mh-t .nm{overflow:hidden;text-overflow:ellipsis}',
    '.mh-t .tag,.mh-tg2 .tag{flex:none;font-size:10px;font-weight:800;letter-spacing:.04em;padding:2px 6px;border-radius:6px;background:color-mix(in srgb,var(--ink) 9%,var(--card));color:var(--muted)}',
    '.mh-t .tag.cad,.mh-tg2 .tag.cad{background:#0f3d24;color:#86efac}.mh-t .tag.soc,.mh-tg2 .tag.soc{background:#0c2a3d;color:#7dd3fc}.mh-t .tag.fu,.mh-tg2 .tag.fu{background:#3a2a08;color:#fcd34d}',
    '.mh-l{font-size:12.5px;color:var(--muted);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}',
    '.mh-l b{color:var(--ink);font-weight:800}',
    '.mh-r{flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:5px}',
    '.mh-tm{font-size:11.5px;color:var(--muted);font-weight:700}.mh-row.un .mh-tm{color:#22c55e}',
    '.mh-r .ic{display:flex;gap:6px;align-items:center;color:var(--muted)}',
    '.mh-r .ic .pn{color:#22c55e;display:inline-flex}',
    '.mh-r .u{min-width:18px;height:18px;border-radius:9px;background:#22c55e;color:#04140d;font-size:11px;font-weight:800;display:grid;place-items:center;padding:0 5px}',
    '.mh-r .u.dot{min-width:10px;width:10px;height:10px;padding:0}',
    '.mh-more{border:0;background:transparent;color:var(--muted);padding:2px;cursor:pointer;border-radius:6px;display:inline-flex}',
    '.mh-more:hover{color:var(--ink)}',
    '.mh-empty{padding:18px 6px;font-size:13px;font-weight:600;color:var(--muted);text-align:center}',
    '.mh-delf{display:flex;align-items:center;gap:8px;margin:10px auto 0;border:1px dashed var(--line-2);background:transparent;color:var(--muted);border-radius:10px;padding:8px 12px;font-weight:700;font-size:12.5px;font-family:inherit;cursor:pointer}',
    '.mh-delf small{font-weight:600}',
    /* action menu */
    '.mh-menu{position:absolute;right:8px;top:44px;z-index:5;width:290px;background:var(--panel-solid);border:1px solid var(--line-2);border-radius:14px;box-shadow:0 18px 40px rgba(0,0,0,.45);padding:6px;font-family:inherit;cursor:default}',
    '.mh-menu .it{display:flex;align-items:center;gap:10px;width:100%;border:0;background:transparent;color:var(--ink);font-weight:700;font-size:13.5px;line-height:1.2;font-family:inherit;padding:10px 10px;border-radius:9px;text-align:left;cursor:pointer}',
    '.mh-menu .it svg{color:var(--muted);flex:none}.mh-menu .it.hl{background:color-mix(in srgb,#22c55e 13%,transparent)}.mh-menu .it.hl svg{color:#22c55e}',
    '.mh-menu .hd{font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);padding:8px 10px 4px;border-top:1px solid var(--line-2);margin-top:4px}',
    '.mh-menu .it.new{color:#22c55e}.mh-menu .it.new svg{color:#22c55e}',
    '.mh-menu .fg{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:2px}',
    '.mh-menu .fg .it{border:1px solid var(--line-2);padding:8px 9px;font-size:12.5px;gap:7px;min-width:0}.mh-menu .fg .it span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.mh-menu .fg .it.cur{border-color:#22c55e;color:#22c55e}.mh-menu .fg .it.cur svg{color:#22c55e}',
    '.mh-menu .fg .it.new{border-style:dashed}',
    '.mh-menu .nfm{grid-column:1/-1;display:flex;gap:6px}.mh-menu .nfm input{flex:1;min-width:0;border:1px solid #22c55e;border-radius:9px;background:var(--card);color:var(--ink);padding:8px 10px;font-size:13px;font-weight:700;font-family:inherit;outline:none}',
    '.mh-menu .nfm button{border:0;background:#16a34a;color:#fff;border-radius:9px;padding:0 12px;font-weight:800;font-size:12.5px;font-family:inherit;cursor:pointer}',
    '.mh-dim{display:none}',
    /* thread */
    '.mh-th-hd{display:flex;align-items:center;gap:10px;padding-bottom:10px;border-bottom:1px solid var(--line-2);margin-bottom:10px}',
    '.mh-th-hd .bk{border:1px solid var(--line-2);background:var(--card);color:var(--ink);border-radius:9px;width:32px;height:32px;display:grid;place-items:center;flex:none;cursor:pointer}',
    '.mh-th-hd .pn{flex:none;display:inline-flex;align-items:center;gap:4px;font-size:11.5px;font-weight:800;color:#22c55e;border:1px solid color-mix(in srgb,#22c55e 45%,var(--line-2));border-radius:999px;padding:4px 9px;background:transparent;font-family:inherit;cursor:pointer}',
    '.mh-th-hd .pn.off{color:var(--muted);border-color:var(--line-2)}',
    '.mh-ppl{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:10px}',
    '.mh-ppl .k{font-size:11px;font-weight:800;color:var(--muted);letter-spacing:.06em;text-transform:uppercase;margin-right:2px}',
    '.mh-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line-2);background:var(--card);border-radius:999px;padding:3px 10px 3px 3px;font-size:12.5px;font-weight:700;color:var(--ink)}',
    '.mh-chip .a{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:10px;font-weight:800;background:color-mix(in srgb,var(--ink) 10%,var(--card))}',
    '.mh-chip.cad .a{background:#0f3d24;color:#86efac}.mh-chip.new{border-color:#22c55e;background:color-mix(in srgb,#22c55e 10%,var(--card))}',
    '.mh-chip.addc{border-style:dashed;border-color:#22c55e;color:#22c55e;padding:5px 11px;background:transparent;font-family:inherit;cursor:pointer}',
    '.mh-pick{border:1px solid var(--line-2);border-radius:12px;background:var(--panel-solid);padding:10px;margin-bottom:10px}',
    '.mh-pick h5{margin:0 0 8px;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}',
    '.mh-pk{display:flex;align-items:center;gap:10px;padding:7px 4px;border-top:1px solid var(--line)}',
    '.mh-pk:first-of-type{border-top:0}',
    '.mh-pk .num{font:800 13px "IBM Plex Mono",ui-monospace,monospace;color:#86efac;width:38px;flex:none}',
    '.mh-pk .w{flex:1;min-width:0;font-size:13.5px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mh-pk .w small{display:block;font-size:11.5px;color:var(--muted);font-weight:600}',
    '.mh-pk .ok{font-size:11px;font-weight:800;color:#22c55e;display:inline-flex;gap:4px;align-items:center;flex:none}',
    '.mh-pk .no{font-size:11px;font-weight:800;color:#fbbf24;flex:none}',
    '.mh-pk button{flex:none;border:1px solid #16a34a;background:#16a34a;color:#fff;border-radius:8px;padding:5px 10px;font-weight:800;font-size:12px;line-height:1;font-family:inherit;cursor:pointer}',
    '.mh-pk button.off{background:transparent;border-color:var(--line-2);color:var(--muted)}',
    '.mh-pk button:disabled{opacity:.6;cursor:default}',
    '.mh-msgs{display:flex;flex-direction:column;gap:8px}',
    '.mh-b{max-width:82%;padding:8px 11px;border-radius:14px;font-size:13.5px;line-height:1.35;font-weight:500;white-space:pre-wrap;word-break:break-word}',
    '.mh-b small{display:block;font-size:10.5px;font-weight:800;margin-bottom:2px;opacity:.8}',
    '.mh-b.in{align-self:flex-start;background:var(--card);border:1px solid var(--line-2);color:var(--ink);border-bottom-left-radius:4px}',
    '.mh-b.in.cad small{color:#86efac}',
    '.mh-b.me{align-self:flex-end;background:#16a34a;color:#fff;border-bottom-right-radius:4px}',
    '.mh-b.me.fail{background:#7f1d1d}',
    '.mh-b .tm{display:block;font-size:10.5px;opacity:.7;margin-top:3px;text-align:right}',
    '.mh-sys{align-self:center;font-size:11.5px;font-weight:700;color:var(--muted);background:color-mix(in srgb,var(--ink) 6%,transparent);border-radius:999px;padding:4px 11px;text-align:center}',
    '.mh-day{align-self:center;font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-top:4px}',
    '.mh-comp{display:flex;gap:8px;align-items:flex-end;border-top:1px solid var(--line-2);padding:10px 14px;background:var(--panel-solid)}',
    '.mh-comp textarea{flex:1;resize:none;border:1px solid var(--line-2);border-radius:12px;background:var(--card);color:var(--ink);padding:10px 12px;font-size:13.5px;font-weight:600;font-family:inherit;min-height:42px;max-height:120px;outline:none}',
    '.mh-comp textarea:focus{border-color:#22c55e}',
    '.mh-comp .go{border:0;background:#16a34a;color:#fff;border-radius:12px;width:44px;height:42px;display:grid;place-items:center;flex:none;cursor:pointer}',
    '.mh-comp .go:disabled{opacity:.5}',
    '.mh-dl{font-size:11.5px;color:var(--muted);font-weight:700;padding:8px 14px 0;background:var(--panel-solid);display:flex;gap:6px;align-items:center;border-top:1px solid var(--line-2)}',
    '.mh-dl + .mh-comp{border-top:0;padding-top:8px}',
    '.mh-dl svg{color:#22c55e;flex:none}',
    '.mh-err{font-size:12px;font-weight:700;color:#f87171;padding:0 14px 8px;background:var(--panel-solid)}',
    /* header button + badge (the badge sits ON the corner, never widens the chip) */
    '#mh-btn{display:inline-flex;align-items:center;gap:6px;position:relative}#mh-btn svg{width:14px;height:14px}',
    '#mh-btn .b{position:absolute;top:-7px;right:-7px;min-width:18px;height:18px;border-radius:9px;background:#ef4444;color:#fff;font-weight:800;font-size:10.5px;line-height:18px;font-family:inherit;text-align:center;padding:0 5px;box-shadow:0 0 0 2px var(--board,#0a0e17);pointer-events:none}',
    '#mh-btn .b:empty{display:none}',
    /* caddy compose */
    '.mh-aud{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-bottom:10px}',
    '.mh-aud button{border:1px solid var(--line-2);background:var(--card);color:var(--ink);border-radius:12px;padding:9px 6px;font-family:inherit;text-align:center;cursor:pointer}',
    '.mh-aud button b{display:block;font-size:20px;font-weight:800;font-family:"IBM Plex Mono",ui-monospace,monospace}',
    '.mh-aud button span{font-size:11px;font-weight:800;color:var(--muted);letter-spacing:.04em;text-transform:uppercase}',
    '.mh-aud button.on{border:2px solid #22c55e;background:color-mix(in srgb,#22c55e 9%,var(--card))}',
    '.mh-qk{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}',
    '.mh-qk button{border:1px solid var(--line-2);background:var(--card);color:var(--ink);border-radius:999px;padding:6px 11px;font-weight:700;font-size:12.5px;line-height:1.2;font-family:inherit;cursor:pointer}',
    '.mh-qk button.on{border-color:#22c55e;color:#22c55e}',
    '.mh-ta{display:block;width:100%;box-sizing:border-box;border:1px solid var(--line-2);border-radius:12px;background:var(--card);color:var(--ink);padding:10px 12px;font-size:14px;font-weight:600;font-family:inherit;min-height:72px;margin-bottom:10px;resize:vertical;outline:none}',
    '.mh-ta:focus,.mh-ta.on{border-color:#22c55e}',
    '.mh-rep{border:1px solid var(--line-2);border-radius:12px;background:var(--panel-solid);padding:10px 12px;font-size:12.5px;font-weight:700;color:var(--ink);display:flex;flex-direction:column;gap:6px}',
    '.mh-rep div{display:flex;gap:8px;align-items:flex-start}.mh-rep svg{flex:none;margin-top:1px}',
    '.mh-rep .g svg{color:#22c55e}.mh-rep .y svg{color:#fbbf24}.mh-rep small{display:block;color:var(--muted);font-weight:600;font-size:11.5px}',
    '.mh-rep .lk{border:0;background:transparent;color:#22c55e;font-weight:800;font-size:11.5px;font-family:inherit;padding:2px 0 0;cursor:pointer;display:inline-flex;gap:4px;align-items:center}',
    '.mh-one{display:flex;flex-wrap:wrap;gap:6px;align-items:center}',
    '.mh-one input{width:170px;border:1px dashed #22c55e;border-radius:999px;background:transparent;color:var(--ink);padding:5px 12px;font-size:12.5px;font-weight:700;font-family:inherit;outline:none}',
    '.mh-one .mh-chip button{border:0;background:transparent;color:var(--muted);font-size:15px;line-height:1;padding:0 0 0 2px;cursor:pointer}',
    '.mh-hits{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 2px}',
    '.mh-hits button{border:1px solid var(--line-2);background:var(--card);color:var(--ink);border-radius:999px;padding:4px 10px;font-weight:700;font-size:12px;font-family:inherit;cursor:pointer}',
    '.mh-foot{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 14px;border-top:1px solid var(--line-2);background:var(--panel-solid)}',
    '.mh-foot small{font-size:12px;color:var(--muted);font-weight:700}',
    '.mh-foot .go{border:0;background:#16a34a;color:#fff;border-radius:10px;padding:11px 18px;font-weight:800;font-size:14px;line-height:1;font-family:inherit;cursor:pointer;white-space:nowrap}',
    '.mh-foot .go:disabled{opacity:.5;cursor:default}',
    '.mh-foot .done{color:#22c55e}',
    '.mh-pins .mh-pk .pin{font:800 15px "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.08em;color:var(--ink);flex:none}',
    '.mh-big{display:flex;align-items:center;gap:12px;width:100%;border:1px solid var(--line-2);background:var(--card);color:var(--ink);border-radius:12px;padding:12px;margin-bottom:10px;font-family:inherit;text-align:left;cursor:pointer}',
    '.mh-big b{display:block;font-size:14px;font-weight:800}.mh-big small{display:block;font-size:12px;color:var(--muted);font-weight:600}',
    '.mh-tok input{width:100%;box-sizing:border-box;border:1px solid var(--line-2);border-radius:12px;background:var(--card);color:var(--ink);padding:12px;font:800 20px "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.3em;text-align:center;margin:10px 0;outline:none}',
    '.mh-tok p{font-size:13px;font-weight:600;color:var(--muted);margin:0}',
    '.mh-tok .go{width:100%;border:0;background:#16a34a;color:#fff;border-radius:12px;padding:12px;font-weight:800;font-size:14px;font-family:inherit;cursor:pointer}',
    '.mh-tg2{display:none}',
    '@media (max-width:600px){.mh-t .tag{display:none}.mh-tg2{display:flex;gap:4px;margin-top:3px}' +
    '.mh-foot small{display:none}.mh-foot .go{flex:1}' +
    '.mh-menu{position:fixed;left:0;right:0;bottom:0;top:auto;width:auto;border-radius:18px 18px 0 0;padding:10px 12px 16px;box-shadow:0 -12px 40px rgba(0,0,0,.55);z-index:20}.mh-menu .fg .it{padding:11px 10px;font-size:13.5px}' +
    '.mh-dim{display:block;position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:19}}',
    '@media (max-width:600px){#mh-dialog{margin:auto 0 0 0;width:100vw;max-width:100vw;height:94vh;height:94dvh;max-height:94vh;border-radius:18px 18px 0 0}#mh-dialog .mh-bd{padding:10px 12px}}'
  ].join('');

  var MH = W.MessagesHub = {
    _v: 1558,
    api: null, D: null, caddies: null, S: null, _t: 0, _poll: 0, _chan: null, _busy: false,

    t: function (k, v) {
      var l = (this.api && this.api.lang && this.api.lang()) || 'en';
      var s = (STR[l] || STR.en)[k]; if (s == null) s = STR.en[k] != null ? STR.en[k] : k;
      if (v && typeof s === 'string') Object.keys(v).forEach(function (x) { s = s.split('{' + x + '}').join(v[x]); });
      return s;
    },
    sb: function () { return (this.api && this.api.sb && this.api.sb()) || (W.SupabaseDB && W.SupabaseDB.client) || null; },
    tok: function () { try { return localStorage.getItem('ps_desk_token_v1') || ''; } catch (e) { return ''; } },
    slug: function () { return (this.api && this.api.slug && this.api.slug()) || ''; },
    by: function () { return String((this.api && this.api.courseName && this.api.courseName()) || this.slug() || 'Pro shop').slice(0, 80); },
    loc: function () { var l = (this.api && this.api.lang && this.api.lang()) || 'en'; return l === 'en' ? 'en-GB' : l; },
    css: function () { if (document.getElementById('mhCss')) return; var s = document.createElement('style'); s.id = 'mhCss'; s.textContent = CSS; document.head.appendChild(s); },

    // ---------- boot (proshop-teesheet.html hands its internals over, both modes) ----------
    init: function (api) {
      this.api = api; var self = this;
      this.css();
      var soc = document.getElementById('societies-btn');
      if (soc && !document.getElementById('mh-btn')) {
        var b = document.createElement('button'); b.id = 'mh-btn'; b.type = 'button'; b.className = 'today-btn';
        b.innerHTML = I('chat', 14) + '<span class="l"></span><span class="b"></span>';
        soc.parentNode.insertBefore(b, soc);
        b.addEventListener('click', function () { self.open(); });
      }
      this.label();
      var d = this.dlg();
      d.addEventListener('click', function (e) { self.onClick(e); });
      d.addEventListener('input', function (e) { self.onInput(e); });
      d.addEventListener('keydown', function (e) { self.onKey(e); });
      d.addEventListener('cancel', function (e) {   // Escape: close the menu / step back before closing the inbox
        var S = self.S; if (!S) return;
        if (S.menu || S.nf) { e.preventDefault(); S.menu = null; S.nf = false; self.paint(); return; }
        if (S.view !== 'list') { e.preventDefault(); self.back(); }
      });
      d.addEventListener('close', function () { if (self.S) { self.S.menu = null; self.S.view = 'list'; self.S.open = null; } });
      if (api.onCourse) api.onCourse(function () { self.D = null; self.caddies = null; self.unsub(); self.refresh(); });
      if (api.onLang) api.onLang(function () { setTimeout(function () { self.label(); if (self.S && self.isOpen()) self.paint(); }, 0); });
      this.refresh();
      this._poll = setInterval(function () { if (!document.hidden) self.refresh(); }, 30000);
      document.addEventListener('visibilitychange', function () { if (!document.hidden) self.refresh(); });
    },
    label: function () {
      var b = document.getElementById('mh-btn'); if (!b) return;
      b.querySelector('.l').textContent = this.t('btn');
      var n = this.D ? this.unreadCount() : 0;
      b.querySelector('.b').textContent = n ? (n > 99 ? '99+' : String(n)) : '';
      b.style.display = this.slug() ? '' : 'none';
    },
    dlg: function () {
      var d = document.getElementById('mh-dialog');
      if (!d) { d = document.createElement('dialog'); d.id = 'mh-dialog'; d.className = 'modal'; document.body.appendChild(d); }
      return d;
    },

    // ---------- data ----------
    refresh: function () {
      var self = this;
      clearTimeout(this._t);
      return new Promise(function (res) { self._t = setTimeout(function () { self.load().then(res, res); }, 250); });
    },
    load: async function () {
      var sb = this.sb(), tok = this.tok();
      if (!sb || !this.slug()) { this.label(); return; }
      if (!tok) { this.D = null; this.label(); if (this.S && this.isOpen()) this.paint(); return; }
      try {
        var r = await sb.rpc('mh_inbox', { p_token: tok });
        var d = r && r.data;
        if (d && d.ok === false && d.reason === 'token') { try { localStorage.removeItem('ps_desk_token_v1'); } catch (e) { } this.D = null; }
        else if (d && d.ok) { this.D = d; this.sub(); }
      } catch (e) { console.warn('[MessagesHub] inbox', e); }
      this.label();
      if (this.S && this.isOpen() && this.S.view === 'list' && !this.S.menu && !this.S.nf) this.paint();
    },
    loadCaddies: async function (pins) {
      var sb = this.sb(); if (!sb || !this.tok()) return [];
      try {
        var r = await sb.rpc('mh_caddies', { p_token: this.tok(), p_pins: !!pins });
        if (r && r.data && r.data.ok) { if (!pins) this.caddies = r.data.caddies || []; return r.data.caddies || []; }
      } catch (e) { }
      return this.caddies || [];
    },
    sub: function () {
      var sb = this.sb(), self = this; if (!sb || this._chan || !this.D) return;
      var keys = this.D.keys || [this.slug()];
      var name = 'mh-' + String(keys[0] || 'x').replace(/[^A-Za-z0-9_-]/g, '');
      try { (sb.getChannels ? sb.getChannels() : []).forEach(function (c) { if (c.topic === 'realtime:' + name) sb.removeChannel(c); }); } catch (e) { }
      var ch = sb.channel(name), kick = function () { self.refresh(); if (self.S && self.S.view === 'thread' && self.isOpen()) self.loadThread(true); };
      keys.slice(0, 6).forEach(function (k) {
        ch = ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: 'recipient_line_id=eq.COURSE-' + k }, kick);
      });
      ch = ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_chat_messages' }, function (p) {
        var gid = p && p.new && p.new.group_id; if (!gid || !self.D) return;
        if ((self.D.groups || []).some(function (g) { return g.id === gid; })) kick();
      });
      ch = ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_course_pings' }, function () { self.refresh(); });
      this._chan = ch.subscribe();
    },
    unsub: function () { var sb = this.sb(); if (this._chan && sb) { try { sb.removeChannel(this._chan); } catch (e) { } } this._chan = null; },

    // every thread of the course: people (+ their course chat), society events, caddy round-robins
    threads: function () {
      var D = this.D; if (!D) return [];
      var self = this, P = D.prefs || {}, out = [], byPeer = {};
      (D.dms || []).forEach(function (d) {
        var t = { key: 'u:' + d.peer, peer: d.peer, kind: d.kind || 'g', name: d.name, num: d.num, photo: d.photo, text: d.text, mine: d.mine, at: d.at, unread: +d.unread || 0 };
        byPeer[d.peer] = t; out.push(t);
      });
      (D.groups || []).forEach(function (g) {
        var t = byPeer[g.golfer];
        if (!t) { t = byPeer[g.golfer] = { key: 'u:' + g.golfer, peer: g.golfer, kind: 'g', name: g.gname || 'Golfer', photo: g.gphoto, text: '', at: null, unread: 0 }; out.push(t); }
        t.grp = g; t.unread += +g.unread || 0;
        var L = g.last;
        if (L && (!t.at || new Date(L.at) >= new Date(t.at))) { t.text = L.text; t.mine = L.mine; t.by = L.mine ? null : L.by; t.at = L.at; t.sys = L.kind === 'system'; }
      });
      (D.events || []).forEach(function (e) {
        out.push({ key: 'e:' + e.event_id, ev: e.event_id, kind: 's', name: e.title || '', date: e.date, text: e.text, mine: e.mine, by: e.mine ? null : e.by, at: e.at, unread: +e.unread || 0 });
      });
      (D.bcasts || []).forEach(function (b) {
        out.push({ key: 'b:' + b.aud, aud: b.aud, kind: 'b', name: (self.t('bcLabel') || {})[b.aud] || b.label, text: b.text, mine: true, at: b.at, unread: 0, n: b.n });
      });
      out.forEach(function (t) {
        var p = P[t.key] || {};
        t.pin = p.pin || null; t.mark = !!p.unread; t.f = p.folder || null;
        t.home = { g: 'g', c: 'c', b: 'c', s: 's', st: 'st' }[t.kind] || 'g';
        t.folder = t.f || t.home;
      });
      return out.sort(function (a, b) { return new Date(b.at || 0) - new Date(a.at || 0); });
    },
    unreadCount: function () { return this.threads().filter(function (t) { return t.unread > 0 || t.mark; }).length; },
    folders: function () {
      var self = this, base = ['g', 'c', 's', 'st'].map(function (k) { return { k: k, name: self.t(k) }; });
      return base.concat(((this.D && this.D.folders) || []).map(function (f) { return { k: 'f:' + f.id, name: f.name, own: true }; }));
    },
    fname: function (k) { var f = this.folders().filter(function (x) { return x.k === k; })[0]; return f ? f.name : ''; },

    // ---------- open / views ----------
    isOpen: function () { var d = document.getElementById('mh-dialog'); return !!(d && d.open); },
    open: function (view) {
      if (!this.slug()) return;
      this.css();
      this.S = { view: view || 'list', folder: (this.S && this.S.folder) || 'all', q: '', menu: null, nf: false, open: null, th: null, pick: false, cq: '' };
      if (!this.tok()) this.S.view = 'tok';
      if (this.S.view === 'cad') this.S.cad = { aud: 'duty', one: null, text: '', qk: null, oq: '' };
      this.paint();
      var d = this.dlg(); if (!d.open) d.showModal();
      if (this.S.view === 'list') this.refresh();
      if (this.S.view === 'cad') this.openCaddies();
    },
    back: function () {
      var S = this.S; if (!S) return;
      if (S.view === 'pins') { S.view = 'cad'; this.paint(); return; }
      S.view = 'list'; S.open = null; S.th = null; S.pick = false; S.err = null; this.paint(); this.refresh();
    },
    shell: function (title, body, foot) {
      var d = this.dlg();
      var bd = d.querySelector('.mh-bd'), keepScroll = bd && this._lastView === this.S.view + ':' + (this.S.open || '') ? bd.scrollTop : null;
      d.innerHTML = '<div class="modal-header"><h2>' + I('chat', 16) + ' ' + E(title) + '</h2><button class="modal-close" type="button" data-a="x" aria-label="Close">&times;</button></div>' +
        '<div class="mh-bd">' + body + '</div>' + (foot || '');
      this._lastView = this.S.view + ':' + (this.S.open || '');
      var nb = d.querySelector('.mh-bd'); if (nb && keepScroll != null) nb.scrollTop = keepScroll;
      return d;
    },
    paint: function (keepFocus) {
      var S = this.S; if (!S) return;
      var d = this.dlg(), fx = keepFocus || (document.activeElement && d.contains(document.activeElement) ? document.activeElement.getAttribute('data-f') : null);
      var caret = null; if (fx && document.activeElement && 'selectionStart' in document.activeElement) { try { caret = document.activeElement.selectionStart; } catch (e) { } }
      if (S.view === 'tok') this.vTok();
      else if (S.view === 'thread') this.vThread();
      else if (S.view === 'bc') this.vBcast();
      else if (S.view === 'cad') this.vCaddies();
      else if (S.view === 'pins') this.vPins();
      else if (S.view === 'new') this.vNew();
      else this.vList();
      if (fx) { var f = d.querySelector('[data-f="' + fx + '"]'); if (f) { f.focus(); if (caret != null) { try { f.setSelectionRange(caret, caret); } catch (e) { } } } }
    },

    ago: function (ts) {
      if (!ts) return '';
      var d = new Date(ts), now = new Date(), m = Math.floor((now - d) / 60000);
      if (m < 1) return this.t('now');
      if (d.toDateString() === now.toDateString()) return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      var y = new Date(now); y.setDate(y.getDate() - 1);
      if (d.toDateString() === y.toDateString()) return this.t('yest');
      if (now - d < 6 * 864e5) { try { return d.toLocaleDateString(this.loc(), { weekday: 'short' }); } catch (e) { } }
      try { return d.toLocaleDateString(this.loc(), { day: 'numeric', month: 'short' }); } catch (e) { return d.toISOString().slice(5, 10); }
    },
    hm: function (ts) { var d = new Date(ts); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); },
    tag: function (t) {
      if (t.kind === 'g') return t.grp && (t.grp.caddies || []).length ? [this.t('tagGC'), 'cad'] : [this.t('tagG'), ''];
      if (t.kind === 'c') return [this.t('tagC'), 'cad'];
      if (t.kind === 'b') return [this.t('tagCs'), 'cad'];
      if (t.kind === 's') return [this.t('tagS'), 'soc'];
      if (t.kind === 'st') return [this.t('tagSt'), ''];
      return null;
    },
    avatar: function (t, big) {
      var ph = t.photo ? '<img src="' + E(t.photo) + '" alt="" onerror="this.remove()">' : '';
      if (t.kind === 'c') return '<div class="mh-av cad">' + E(t.num ? '#' + t.num : ini(t.name)) + '</div>';
      if (t.kind === 'b') return '<div class="mh-av grp">' + I('people', 18) + '</div>';
      if (t.kind === 's') return '<div class="mh-av soc">' + E(ini(t.name)) + '</div>';
      var c = (t.grp && t.grp.caddies) || [];
      return '<div class="mh-av">' + E(ini(t.name)) + ph + (c.length && !big ? '<span class="n">#' + E(c[c.length - 1].num) + '</span>' : '') + '</div>';
    },
    row: function (t) {
      var S = this.S, tg = this.tag(t), own = t.f && t.f.indexOf('f:') === 0 ? this.fname(t.f) : '';
      var tags = (tg ? '<span class="tag ' + tg[1] + '">' + E(tg[0]) + '</span>' : '') + (own ? '<span class="tag fu">' + E(own) + '</span>' : '');
      var who = t.sys ? '' : t.mine ? '<b>' + E(this.t('you')) + '</b> ' : t.by ? '<b>' + E(t.by) + ':</b> ' : '';
      var un = t.unread > 0 || t.mark;
      return '<div class="mh-row' + (t.pin ? ' pin' : '') + (un ? ' un' : '') + (S.menu === t.key ? ' sel' : '') + '" data-a="row" data-k="' + E(t.key) + '">' + this.avatar(t) +
        '<div class="mh-w"><div class="mh-t"><span class="nm">' + E(t.name) + '</span>' + tags + '</div><div class="mh-tg2">' + tags + '</div><div class="mh-l">' + who + E(t.text || (t.date || '')) + '</div></div>' +
        '<div class="mh-r"><span class="mh-tm">' + E(this.ago(t.at)) + '</span><span class="ic">' + (t.pin ? '<span class="pn">' + I('pin', 13) + '</span>' : '') +
        (t.unread > 0 ? '<span class="u">' + (t.unread > 99 ? '99+' : t.unread) + '</span>' : t.mark ? '<span class="u dot"></span>' : '') +
        '<button class="mh-more" type="button" data-a="more" data-k="' + E(t.key) + '" aria-label="More">' + I('more', 16) + '</button></span></div>' +
        (S.menu === t.key ? this.menu(t) : '') + '</div>';
    },
    menu: function (t) {
      var self = this, S = this.S, cur = t.folder;
      var fl = this.folders().map(function (f) {
        return '<button class="it' + (f.k === cur ? ' cur' : '') + '" type="button" data-a="mv" data-k="' + E(t.key) + '" data-v="' + E(f.k) + '">' + I(f.k === cur ? 'check' : 'folder', 14) + '<span>' + E(f.name) + '</span></button>';
      }).join('');
      var nf = S.nfm ? '<div class="nfm"><input data-f="nfm" maxlength="40" placeholder="' + E(this.t('folderName')) + '"><button type="button" data-a="nfmok" data-k="' + E(t.key) + '">' + E(this.t('save')) + '</button></div>'
        : '<button class="it new" type="button" data-a="nfm">' + I('add', 14) + '<span>' + E(this.t('newFolder')) + '</span></button>';
      return '<div class="mh-dim" data-a="dim"></div><div class="mh-menu" data-a="menu">' +
        '<button class="it hl" type="button" data-a="pin" data-k="' + E(t.key) + '">' + I('pin', 16) + ' ' + E(t.pin ? self.t('unpin') : self.t('pinTop')) + '</button>' +
        (t.ev ? '' : '<button class="it" type="button" data-a="unr" data-k="' + E(t.key) + '">' + I('unread', 16) + ' ' + E(t.mark || t.unread ? self.t('markRead') : self.t('markUnread')) + '</button>') +
        '<div class="hd">' + E(this.t('moveTo')) + '</div><div class="fg">' + fl + nf + '</div></div>';
    },

    vTok: function () {
      var S = this.S;
      var b = '<div class="mh-tok"><p>' + E(this.t('tokNeed')) + '</p>' +
        '<input data-f="tok" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" class="pin-mask" autocomplete="one-time-code" data-lpignore="true" data-1p-ignore placeholder="••••••">' +
        (S.err ? '<p style="color:#f87171;font-weight:700;margin-bottom:10px">' + E(S.err) + '</p>' : '') +
        '<button class="go" type="button" data-a="tok">' + E(this.t('tokGo')) + '</button></div>';
      this.shell(this.t('title'), b);
      var f = this.dlg().querySelector('[data-f="tok"]'); if (f) f.focus();
    },
    tokenGo: async function () {
      var S = this.S, sb = this.sb(), f = this.dlg().querySelector('[data-f="tok"]');
      var pin = String((f && f.value) || '').replace(/\D/g, '');
      if (!/^\d{6}$/.test(pin) || pin === '000000') { S.err = this.t('tokBad'); this.paint(); return; }
      try {
        var r = await sb.rpc('proshop_pin_login', { p_pin: pin }), data = r && r.data, lock = null;
        try { lock = JSON.parse(localStorage.getItem('ps_pin_lock_v1') || 'null'); } catch (e) { }
        // the PIN must be THIS device's course (a pinned pro shop) — a token for another course would read its messages
        var ok = data && data.desk_token && (!lock || lock.id === data.course_id || (lock.facility_id && lock.facility_id === data.facility_id));
        if (!ok) { S.err = this.t('tokBad'); this.paint(); return; }
        localStorage.setItem('ps_desk_token_v1', data.desk_token);
        S.err = null; S.view = 'list'; this.paint(); this.load();
      } catch (e) { S.err = this.t('offline'); this.paint(); }
    },

    vList: function () {
      var self = this, S = this.S, all = this.threads(), q = (S.q || '').trim().toLowerCase();
      var count = function (k) { return k === 'all' ? all.length : all.filter(function (t) { return t.folder === k; }).length; };
      var chips = [{ k: 'all', name: this.t('all') }].concat(this.folders()).map(function (f) {
        var n = count(f.k);
        return '<button type="button" class="' + (S.folder === f.k ? 'on' : '') + '" data-a="fold" data-v="' + E(f.k) + '">' + E(f.name) + (n ? '<i>' + n + '</i>' : '') + '</button>';
      }).join('') + (S.nf ? '<span class="mh-nf"><input data-f="nf" maxlength="40" placeholder="' + E(this.t('folderName')) + '"><button type="button" class="ok" data-a="nfok">' + E(this.t('save')) + '</button></span>'
        : '<button type="button" class="add" data-a="nf">' + I('add', 12) + ' ' + E(this.t('folder')) + '</button>');
      var shown = all.filter(function (t) {
        if (S.folder !== 'all' && t.folder !== S.folder) return false;
        if (!q) return true;
        return String(t.name || '').toLowerCase().indexOf(q) !== -1 || (t.num && ('#' + t.num).indexOf(q.replace(/^#?/, '#')) === 0) || String(t.text || '').toLowerCase().indexOf(q) !== -1;
      });
      var pinned = shown.filter(function (t) { return t.pin; }), rest = shown.filter(function (t) { return !t.pin; });
      var b = '<div class="mh-srch">' + I('search', 15) + '<input data-f="q" type="search" autocomplete="off" placeholder="' + E(this.t('search')) + '" value="' + E(S.q || '') + '"></div>' +
        '<div class="mh-chips">' + chips + '</div>';
      if (!this.D) b += '<div class="mh-empty">' + E(this.t('loading')) + '</div>';
      else if (!shown.length) b += '<div class="mh-empty">' + E(all.length ? this.t('emptyF') : this.t('empty')) + '</div>';
      else {
        if (pinned.length) b += '<div class="mh-sec">' + I('pin', 12) + ' ' + E(this.t('pinned')) + '</div>' + pinned.map(function (t) { return self.row(t); }).join('');
        if (rest.length) b += (pinned.length ? '<div class="mh-sec">' + E(this.t('recent')) + '</div>' : '') + rest.map(function (t) { return self.row(t); }).join('');
      }
      // a 6-digit search = a Call PIN: offer that golfer's thread
      if (/^\d{3}\s?\d{3}$/.test(q) && S.pinHit && S.pinHit.q === q) {
        b += S.pinHit.g ? '<div class="mh-sec">' + E(this.t('results')) + '</div><button class="mh-big" type="button" data-a="person" data-id="' + E(S.pinHit.g.id) + '" data-n="' + E(S.pinHit.g.name) + '"><div class="mh-av">' + E(ini(S.pinHit.g.name)) + '</div><span><b>' + E(S.pinHit.g.name) + '</b><small>Call PIN ' + E(q) + '</small></span></button>'
          : '<div class="mh-empty">' + E(this.t('noMatch')) + '</div>';
      }
      if (S.folder.indexOf('f:') === 0) b += '<button class="mh-delf" type="button" data-a="delf" data-v="' + E(S.folder) + '">' + I('trash', 14) + '<span>' + E(this.t('delFolder')) + '<small> · ' + E(this.t('delFolderSub')) + '</small></span></button>';
      this.shell(this.t('title'), b, '<div class="mh-foot"><small>' + E(this.t('foot')) + '</small><button class="go" type="button" data-a="new">' + E(this.t('newMsg')) + '</button></div>');
      var nf = this.dlg().querySelector('[data-f="nf"],[data-f="nfm"]'); if (nf) nf.focus();
    },

    // ---------- a person's thread ----------
    openThread: async function (peer, hint) {
      var S = this.S;
      S.view = 'thread'; S.open = peer; S.th = null; S.pick = false; S.menu = null; S.err = null; S.hint = hint || null; S.cq = '';
      this.paint();
      await this.loadThread();
      var t = this.threads().filter(function (x) { return x.peer === peer; })[0];
      if (t && (t.unread || t.mark)) {
        try { await this.sb().rpc('mh_read', { p_token: this.tok(), p_peer: peer }); } catch (e) { }
        this.refresh();
      }
      var ta = this.dlg().querySelector('[data-f="msg"]'); if (ta && window.innerWidth > 600) ta.focus();
    },
    loadThread: async function (quiet) {
      var S = this.S, peer = S && S.open; if (!peer) return;
      try {
        var r = await this.sb().rpc('mh_thread', { p_token: this.tok(), p_peer: peer });
        if (!this.S || this.S.open !== peer) return;
        if (r && r.data && r.data.ok) { S.th = r.data; S.pending = (S.pending || []).filter(function (p) { return p.fail; }); }
      } catch (e) { }
      if (this.S.view === 'thread') { this.paint(); this.scrollEnd(); }
      if (quiet && this.S.th) { try { await this.sb().rpc('mh_read', { p_token: this.tok(), p_peer: peer }); } catch (e) { } }
    },
    scrollEnd: function () { var bd = this.dlg().querySelector('.mh-bd'); if (bd && !this.S.pick) bd.scrollTop = bd.scrollHeight; },
    vThread: function () {
      var self = this, S = this.S, th = S.th, peer = S.open;
      var t = this.threads().filter(function (x) { return x.peer === peer; })[0] || {};
      var who = (th && th.who) || { id: peer, name: t.name || (S.hint && S.hint.name) || '…', kind: t.kind || 'g' };
      var cads = (th && th.group && th.group.caddies) || [];
      var mineToday = ((th && th.today) || []).filter(function (x) { return x.mine; })[0];
      var sub = who.kind === 'c' ? this.t('tagC') + (who.num ? ' #' + who.num : '') : mineToday ? this.t('today') + ' ' + mineToday.time + (mineToday.num ? ' · #' + mineToday.num : '') : this.t('tagG');
      var b = '<div class="mh-th-hd"><button class="bk" type="button" data-a="back" aria-label="Back">' + I('back', 16) + '</button>' + this.avatar({ kind: who.kind, name: who.name, num: who.num, photo: who.photo }, true) +
        '<div class="mh-w"><div class="mh-t"><span class="nm">' + E(who.name) + '</span></div><div class="mh-l">' + E(sub) + '</div></div>' +
        '<button class="pn' + (t.pin ? '' : ' off') + '" type="button" data-a="pin" data-k="' + E('u:' + peer) + '">' + I('pin', 12) + ' ' + E(t.pin ? this.t('pinnedPill') : this.t('pinTop')) + '</button></div>';
      if (who.kind !== 'c') {
        b += '<div class="mh-ppl"><span class="k">' + E(this.t('inChat')) + '</span><span class="mh-chip"><span class="a">' + E(ini(who.name)) + '</span>' + E(who.name) + '</span>' +
          '<span class="mh-chip"><span class="a">PS</span>' + E(this.t('proshop')) + '</span>' +
          cads.map(function (c) { return '<span class="mh-chip cad' + (S.justAdded === c.uid ? ' new' : '') + '"><span class="a">#' + E(c.num) + '</span>#' + E(c.num) + ' ' + E(first(c.name)) + '</span>'; }).join('') +
          (th ? '<button class="mh-chip addc" type="button" data-a="pick">' + I('add', 12) + ' ' + E(this.t('addCaddy')) + '</button>' : '') + '</div>';
        if (S.pick) b += this.vPick(th, cads);
      }
      // the 1:1 messages and the course chat, one timeline
      var items = [];
      ((th && th.msgs) || []).forEach(function (m) { items.push({ at: m.at, mine: m.mine, text: m.text, by: m.mine ? null : who.name }); });
      ((th && th.gmsgs) || []).forEach(function (m) { items.push({ at: m.at, mine: m.mine, text: m.text, by: m.mine ? null : m.by, cad: m.cad, sys: m.kind === 'system' }); });
      (S.pending || []).forEach(function (p) { items.push({ at: p.at, mine: true, text: p.text, fail: p.fail }); });
      items.sort(function (a, b) { return new Date(a.at) - new Date(b.at); });
      var lastDay = '';
      b += '<div class="mh-msgs">' + (th ? '' : '<div class="mh-empty">' + E(this.t('loading')) + '</div>') + items.map(function (m) {
        var dd = new Date(m.at).toDateString(), sep = '';
        if (dd !== lastDay) { lastDay = dd; sep = '<div class="mh-day">' + E(dd === new Date().toDateString() ? self.t('today') : self.ago(m.at)) + '</div>'; }
        if (m.sys) {
          var mm = String(m.text || '').match(/caddy #(\S+) (.+?) to this chat/);
          return sep + '<div class="mh-sys">' + E(mm ? self.t('sysAdded', { n: mm[1], name: mm[2] }) : m.text) + '</div>';
        }
        if (m.mine) return sep + '<div class="mh-b me' + (m.fail ? ' fail' : '') + '">' + E(m.text) + '<span class="tm">' + E(self.hm(m.at)) + '</span></div>';
        return sep + '<div class="mh-b in' + (m.cad ? ' cad' : '') + '"><small>' + E((m.by || '') + (m.cad ? ' · ' + self.t('caddyLbl') : '')) + '</small>' + E(m.text) + '<span class="tm">' + E(self.hm(m.at)) + '</span></div>';
      }).join('') + '</div>';
      // who gets it
      var names = [who.name].concat(cads.map(function (c) { return '#' + c.num + ' ' + first(c.name); }));
      var line = who.line || isUid(peer);
      var foot = '<div class="mh-dl">' + I('bell', 13) + ' ' + E(this.t('goesTo', { who: names.join(', ') })) + ' · ' + E(line ? this.t('viaAppLine') : this.t('viaApp')) + '</div>' +
        (S.err ? '<div class="mh-err">' + E(S.err) + '</div>' : '') +
        '<div class="mh-comp"><textarea data-f="msg" rows="1" maxlength="2000" placeholder="' + E(this.t('write')) + '">' + E(S.draft || '') + '</textarea><button class="go" type="button" data-a="send" aria-label="Send">' + I('send', 18) + '</button></div>';
      this.shell(this.t('title'), b, foot);
    },
    vPick: function (th, cads) {
      var self = this, S = this.S, inChat = {};
      cads.forEach(function (c) { inChat[c.uid] = 1; });
      var st = function (x) {
        return x.live ? '<span class="ok">' + I('check', 12) + ' ' + E(isUid(x.uid) ? self.t('appLine') : self.t('app')) + '</span>' : '<span class="no">' + E(self.t('noApp')) + '</span>';
      };
      var btn = function (id, uid, live) {
        return inChat[uid] ? '<button type="button" disabled class="off">' + E(self.t('added')) + '</button>'
          : '<button type="button" class="' + (live ? '' : 'off') + '" data-a="addc" data-id="' + E(id) + '">' + E(self.t('add')) + '</button>';
      };
      var today = (th && th.today) || [], seen = {};
      var h = '<div class="mh-pick">';
      if (today.length) {
        h += '<h5>' + E(this.t('onBooking')) + '</h5>' + today.map(function (x) {
          seen[x.caddy] = 1;
          return '<div class="mh-pk"><span class="num">#' + E(x.num) + '</span><span class="w">' + E(x.name) + '<small>' + E((x.time || '') + ' · ' + (x.mine ? self.t('theirCaddy') : self.t('groupCaddy'))) + '</small></span>' + st(x) + btn(x.caddy, x.uid, x.live) + '</div>';
        }).join('');
      }
      h += '<h5' + (today.length ? ' style="margin-top:10px"' : '') + '>' + E(this.t('anyCaddy')) + '</h5><div class="mh-srch" style="margin:0 0 4px">' + I('search', 15) + '<input data-f="cq" autocomplete="off" placeholder="' + E(this.t('caddySearch')) + '" value="' + E(S.cq || '') + '"></div>';
      var q = (S.cq || '').trim().toLowerCase().replace(/^#/, '');
      if (q) {
        var hits = (this.caddies || []).filter(function (c) { return !seen[c.id] && (String(c.num || '').toLowerCase() === q || String(c.num || '').toLowerCase().indexOf(q) === 0 || String(c.name || '').toLowerCase().indexOf(q) !== -1); }).slice(0, 6);
        h += hits.length ? hits.map(function (c) { return '<div class="mh-pk"><span class="num">#' + E(c.num) + '</span><span class="w">' + E(c.name) + '</span>' + st(c) + btn(c.id, c.uid, c.live) + '</div>'; }).join('')
          : '<div class="mh-empty" style="padding:8px">' + E(this.t('noMatch')) + '</div>';
      }
      return h + '</div>';
    },
    send: async function () {
      var S = this.S, ta = this.dlg().querySelector('[data-f="msg"]'); if (!ta || this._busy) return;
      var text = ta.value.trim(); if (!text) return;
      this._busy = true; S.err = null; S.draft = '';
      var p = { at: new Date().toISOString(), text: text }; S.pending = (S.pending || []).concat([p]);
      this.paint(); this.scrollEnd();
      try {
        var r = await this.sb().rpc('mh_send', { p_token: this.tok(), p_slug: this.slug(), p_peer: S.open, p_body: text, p_by: this.by() });
        var d = r && r.data;
        if (!d || !d.ok) throw new Error((d && d.reason) || (r && r.error && r.error.message) || 'send');
        if (d.via === 'direct' && !d.delivered) { S.err = this.t('noOne'); }
        await this.loadThread();
        this.refresh();
      } catch (e) {
        console.warn('[MessagesHub] send', e);
        p.fail = true; S.err = this.t('notSent'); S.draft = text; this.paint();
      } finally { this._busy = false; }
    },
    addCaddy: async function (id, btn) {
      var S = this.S; if (btn) btn.disabled = true;
      try {
        var r = await this.sb().rpc('mh_add_caddy', { p_token: this.tok(), p_slug: this.slug(), p_golfer: S.open, p_caddy: id, p_by: this.by() });
        var d = r && r.data;
        if (!d || !d.ok) throw new Error((d && d.reason) || 'add');
        var c = (this.caddies || []).filter(function (x) { return x.id === id; })[0] || ((S.th && S.th.today) || []).filter(function (x) { return x.caddy === id; })[0];
        S.justAdded = c && c.uid; S.pick = false; S.cq = '';
        await this.loadThread(); this.refresh();
      } catch (e) { console.warn('[MessagesHub] add caddy', e); S.err = this.t('notSent'); if (btn) btn.disabled = false; this.paint(); }
    },

    // ---------- a caddy round-robin thread ----------
    openBcast: async function (aud) {
      var S = this.S; S.view = 'bc'; S.open = 'b:' + aud; S.bc = null; S.menu = null; this.paint();
      try { var r = await this.sb().rpc('mh_thread', { p_token: this.tok(), p_peer: 'b:' + aud }); if (r && r.data && r.data.ok) S.bc = r.data.bcasts || []; } catch (e) { }
      if (this.S.view === 'bc') { this.paint(); this.scrollEnd(); }
    },
    vBcast: function () {
      var self = this, S = this.S, aud = String(S.open || '').slice(2), t = this.threads().filter(function (x) { return x.key === S.open; })[0] || {};
      var name = (this.t('bcLabel') || {})[aud] || '';
      var b = '<div class="mh-th-hd"><button class="bk" type="button" data-a="back" aria-label="Back">' + I('back', 16) + '</button><div class="mh-av grp">' + I('people', 18) + '</div>' +
        '<div class="mh-w"><div class="mh-t"><span class="nm">' + E(name) + '</span></div><div class="mh-l">' + E(this.t('tagCs')) + '</div></div>' +
        '<button class="pn' + (t.pin ? '' : ' off') + '" type="button" data-a="pin" data-k="' + E(S.open) + '">' + I('pin', 12) + ' ' + E(t.pin ? this.t('pinnedPill') : this.t('pinTop')) + '</button></div>';
      b += '<div class="mh-msgs">' + (S.bc ? S.bc.map(function (m) {
        return '<div class="mh-b me">' + E(m.text) + '<span class="tm">' + E(self.ago(m.at) + ' · ' + self.t('bcSent', { n: m.n, l: m.live })) + '</span></div>';
      }).join('') : '<div class="mh-empty">' + E(this.t('loading')) + '</div>') + '</div>';
      this.shell(this.t('title'), b, '<div class="mh-foot"><small>' + E(this.t('savedIn')) + '</small><button class="go" type="button" data-a="cad">' + E(this.t('msgCaddies')) + '</button></div>');
    },

    // ---------- new message ----------
    vNew: function () {
      var self = this, S = this.S;
      var b = '<div class="mh-th-hd"><button class="bk" type="button" data-a="back" aria-label="Back">' + I('back', 16) + '</button><div class="mh-w"><div class="mh-t"><span class="nm">' + E(this.t('newTitle')) + '</span></div></div></div>' +
        '<button class="mh-big" type="button" data-a="cad"><div class="mh-av grp">' + I('people', 18) + '</div><span><b>' + E(this.t('msgCaddies')) + '</b><small>' + E(this.t('duty') + ' · ' + this.t('course') + ' · ' + this.t('free')) + '</small></span></button>' +
        '<div class="mh-srch">' + I('search', 15) + '<input data-f="gq" type="search" autocomplete="off" placeholder="' + E(this.t('golferFind')) + '" value="' + E(S.gq || '') + '"></div>';
      var hits = S.gHits;
      if (S.gq && hits) {
        b += hits.length ? '<div class="mh-sec">' + E(this.t('results')) + '</div>' + hits.map(function (g) {
          return '<button class="mh-big" type="button" data-a="person" data-id="' + E(g.id) + '" data-n="' + E(g.name) + '"><div class="mh-av">' + E(ini(g.name)) + '</div><span><b>' + E(g.name) + '</b>' + (g.sub ? '<small>' + E(g.sub) + '</small>' : '') + '</span></button>';
        }).join('') : '<div class="mh-empty">' + E(this.t('noMatch')) + '</div>';
      }
      var cq = (S.gq || '').trim().toLowerCase().replace(/^#/, '');
      if (cq && this.caddies) {
        var ch = this.caddies.filter(function (c) { return c.uid && (String(c.num || '').toLowerCase() === cq || String(c.name || '').toLowerCase().indexOf(cq) !== -1); }).slice(0, 5);
        if (ch.length) b += '<div class="mh-sec">' + E(this.t('c')) + '</div>' + ch.map(function (c) {
          return '<button class="mh-big" type="button" data-a="person" data-id="' + E(c.uid) + '" data-n="' + E(c.name) + '"><div class="mh-av cad">#' + E(c.num) + '</div><span><b>' + E(c.name) + '</b><small>' + E(c.live ? (isUid(c.uid) ? self.t('appLine') : self.t('app')) : self.t('noApp')) + '</small></span></button>';
        }).join('');
      }
      this.shell(this.t('newTitle'), b);
    },
    findGolfers: async function (q) {
      var S = this.S, sb = this.sb(); q = String(q || '').trim();
      if (q.length < 2) { S.gHits = null; this.paint(); return; }
      var seq = this._gseq = (this._gseq || 0) + 1, out = [];
      try {
        if (/^\d{3}\s?\d{3}$/.test(q) && W.PhoneDesk && W.PhoneDesk.findPin) out = (await W.PhoneDesk.findPin(q)).map(function (g) { return { id: g.id, name: g.name, sub: 'Call PIN ' + q }; });
        else if (!/^#?\d{1,4}$/.test(q) && W.searchProfilesByName) out = (await W.searchProfilesByName(sb, q, 8)).filter(function (g) { return !/^(COURSE-|CADDY-)/.test(g.id); }).map(function (g) { return { id: g.id, name: g.name }; });
      } catch (e) { }
      if (seq !== this._gseq || !this.S || this.S.view !== 'new') return;
      S.gHits = out; this.paint();
    },

    // ---------- message caddies ----------
    openCaddies: async function () {
      var S = this.S; S.view = 'cad'; S.cad = S.cad || { aud: 'duty', one: null, text: '', qk: null, oq: '' }; S.sent = null; S.err = null;
      this.paint();
      await this.loadCaddies(false);
      await this.dayState();
      if (this.S.view === 'cad') this.paint();
    },
    dayState: async function () {
      var api = this.api, S = this.S, now = new Date();
      var iso = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
      var hm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
      var st = { off: {}, out: {} };
      try { if (api && api.dayState) st = (await api.dayState(iso, hm)) || st; } catch (e) { }
      S.ds = st;
    },
    audiences: function () {
      var S = this.S, st = S.ds || { off: {}, out: {} }, list = (this.caddies || []), nowM = new Date().getHours() * 60 + new Date().getMinutes();
      var key = function (n) { var x = parseInt(n, 10); return isNaN(x) ? String(n || '').trim() : String(x); };
      var off = {}, out = {};
      Object.keys(st.off || {}).forEach(function (n) { off[key(n)] = 1; });
      Object.keys(st.out || {}).forEach(function (n) {
        var o = st.out[n], m = String((o && o.at) || '').match(/^(\d{1,2}):(\d{2})/);
        if (!m || (+m[1]) * 60 + (+m[2]) <= nowM) out[key(n)] = 1;   // teed off already = on the course now
      });
      var duty = list.filter(function (c) { return !off[key(c.num)]; });
      return { duty: duty, course: duty.filter(function (c) { return out[key(c.num)]; }), free: duty.filter(function (c) { return !out[key(c.num)]; }) };
    },
    targets: function () {
      var S = this.S, c = S.cad; if (!c) return [];
      if (c.aud === 'one') return c.one ? [c.one] : [];
      return this.audiences()[c.aud] || [];
    },
    vCaddies: function () {
      var self = this, S = this.S, c = S.cad, A = this.audiences(), ready = !!this.caddies;
      var aud = ['duty', 'course', 'free'].map(function (k) {
        return '<button type="button" class="' + (c.aud === k ? 'on' : '') + '" data-a="aud" data-v="' + k + '"><b>' + (ready ? A[k].length : '–') + '</b><span>' + E(self.t(k)) + '</span></button>';
      }).join('');
      var one = c.one ? '<span class="mh-chip cad new"><span class="a">#' + E(c.one.num) + '</span>#' + E(c.one.num) + ' ' + E(first(c.one.name)) + '<button type="button" data-a="oneX" aria-label="Remove">&times;</button></span>'
        : '<input data-f="oq" autocomplete="off" placeholder="+ ' + E(this.t('caddySearch')) + '" value="' + E(c.oq || '') + '">';
      var oq = (c.oq || '').trim().toLowerCase().replace(/^#/, ''), hits = '';
      if (!c.one && oq) {
        var hs = (this.caddies || []).filter(function (x) { return String(x.num || '').toLowerCase() === oq || String(x.num || '').toLowerCase().indexOf(oq) === 0 || String(x.name || '').toLowerCase().indexOf(oq) !== -1; }).slice(0, 8);
        hits = '<div class="mh-hits">' + (hs.length ? hs.map(function (x) { return '<button type="button" data-a="one" data-id="' + E(x.id) + '">#' + E(x.num) + ' ' + E(first(x.name)) + '</button>'; }).join('') : '<span class="mh-empty" style="padding:4px">' + E(this.t('noMatch')) + '</span>') + '</div>';
      }
      var qk = ['q1', 'q2', 'q3', 'q4'].map(function (k) { return '<button type="button" class="' + (c.qk === k ? 'on' : '') + '" data-a="qk" data-v="' + k + '">' + E(self.t(k)) + '</button>'; }).join('');
      var tg = this.targets(), live = tg.filter(function (x) { return x.live; }), wait = tg.filter(function (x) { return !x.live; });
      var anyLine = live.some(function (x) { return isUid(x.uid); });
      var nm = function (arr) { return arr.slice(0, 6).map(function (x) { return '#' + x.num + ' ' + first(x.name); }).join(', ') + (arr.length > 6 ? ' +' + (arr.length - 6) : ''); };
      var rep = '<div class="mh-rep">' +
        '<div class="g">' + I('line', 15) + '<span>' + E(this.t(anyLine ? 'getNow' : 'getNowApp', { n: live.length })) + (live.length ? '<small>' + E(nm(live)) + '</small>' : '') + '</span></div>' +
        (wait.length ? '<div class="y">' + I('bell', 15) + '<span>' + E(this.t('noAppN', { n: wait.length })) + '<small>' + E(this.t('noAppSub')) + '</small><button class="lk" type="button" data-a="pins">' + I('key', 12) + ' ' + E(this.t('pins')) + '</button></span></div>' : '') + '</div>';
      var b = '<div class="mh-sec" style="margin-top:0">' + E(this.t('to')) + '</div><div class="mh-aud">' + aud + '</div>' +
        '<div class="mh-ppl mh-one"><span class="k">' + E(this.t('oneCaddy')) + '</span>' + one + '</div>' + hits +
        '<div class="mh-sec">' + E(this.t('quick')) + '</div><div class="mh-qk">' + qk + '</div>' +
        '<textarea class="mh-ta' + (c.text ? ' on' : '') + '" data-f="ctext" maxlength="2000" placeholder="' + E(this.t('write')) + '">' + E(c.text || '') + '</textarea>' + (ready ? rep : '');
      var n = tg.filter(function (x) { return x.uid; }).length;
      var foot = (S.err ? '<div class="mh-err" style="padding-top:8px">' + E(S.err) + '</div>' : '') + '<div class="mh-foot"><small>' + E(this.t('savedIn')) + '</small>' +
        (S.sent ? '<button class="go done" type="button" disabled>' + I('check', 14) + ' ' + E(this.t('sent', { n: S.sent.sent })) + '</button>'
          : '<button class="go" type="button" data-a="csend"' + (n && ready ? '' : ' disabled') + '>' + E(n ? this.t('sendTo', { n: n }) : this.t('nobody')) + '</button>') + '</div>';
      this.shell(this.t('msgCaddies'), '<div class="mh-th-hd" style="border:0;padding:0;margin:0 0 6px"><button class="bk" type="button" data-a="back" aria-label="Back">' + I('back', 16) + '</button></div>' + b, foot);
    },
    sendCaddies: async function () {
      var S = this.S, c = S.cad, tg = this.targets().filter(function (x) { return x.uid || x.id; });
      var text = String(c.text || '').trim();
      if (!text) { S.err = this.t('typeMsg'); this.paint(); return; }
      if (!tg.length || this._busy) return;
      this._busy = true; S.err = null;
      var label = (this.t('bcLabel') || {})[c.aud] || '';
      if (c.aud === 'one' && c.one) label = '#' + c.one.num + ' ' + first(c.one.name);
      try {
        var r = await this.sb().rpc('mh_caddy_send', { p_token: this.tok(), p_slug: this.slug(), p_aud: c.aud, p_label: label, p_ids: tg.map(function (x) { return x.id; }), p_body: text, p_by: this.by() });
        var d = r && r.data;
        if (!d || !d.ok) throw new Error((d && d.reason) || (r && r.error && r.error.message) || 'send');
        S.sent = d; c.text = ''; c.qk = null;
        this.paint(); this.refresh();
        var self = this; setTimeout(function () { if (self.S && self.S.view === 'cad' && self.S.sent === d) { self.S.sent = null; self.paint(); } }, 4000);
      } catch (e) { console.warn('[MessagesHub] caddies', e); S.err = this.t('notSent'); this.paint(); }
      finally { this._busy = false; }
    },
    openPins: async function () {
      var S = this.S; S.view = 'pins'; S.pins = null; this.paint();
      S.pins = await this.loadCaddies(true);
      if (this.S.view === 'pins') this.paint();
    },
    vPins: function () {
      var self = this, S = this.S;
      var b = '<div class="mh-th-hd"><button class="bk" type="button" data-a="back" aria-label="Back">' + I('back', 16) + '</button><div class="mh-w"><div class="mh-t"><span class="nm">' + E(this.t('pins')) + '</span></div><div class="mh-l" style="white-space:normal">' + E(this.t('pinsSub')) + '</div></div></div>' +
        '<div class="mh-pins">' + (S.pins ? S.pins.map(function (c) {
          return '<div class="mh-pk"><span class="num">#' + E(c.num) + '</span><span class="w">' + E(c.name) + '<small>' + E(c.live ? self.t('signedIn') : self.t('noApp')) + '</small></span>' +
            (c.pin ? '<span class="pin">' + E(c.pin.slice(0, 3) + ' ' + c.pin.slice(3)) + '</span>' : '<span class="ok">' + I('check', 12) + ' ' + E(isUid(c.uid) ? 'LINE' : self.t('app')) + '</span>') + '</div>';
        }).join('') : '<div class="mh-empty">' + E(this.t('loading')) + '</div>') + '</div>';
      this.shell(this.t('pins'), b);
    },

    // ---------- events ----------
    pref: async function (key, action, folder) {
      var D = this.D; if (!D) return;
      var P = D.prefs || (D.prefs = {}), p = P[key] || (P[key] = {});   // instant, then the server
      if (action === 'pin') p.pin = new Date().toISOString(); else if (action === 'unpin') p.pin = null;
      else if (action === 'unread') p.unread = true; else if (action === 'read') p.unread = false;
      else if (action === 'move') p.folder = folder || null;
      this.paint(); this.label();
      try { await this.sb().rpc('mh_pref', { p_token: this.tok(), p_key: key, p_action: action, p_folder: folder || null }); } catch (e) { }
      this.load();
    },
    newFolder: async function (name, thenMove) {
      name = String(name || '').trim(); if (!name) return;
      try {
        var r = await this.sb().rpc('mh_folder', { p_token: this.tok(), p_action: 'create', p_name: name });
        var d = r && r.data; if (!d || !d.ok) return;
        if (this.D) { this.D.folders = (this.D.folders || []).filter(function (f) { return f.id !== d.id; }).concat([{ id: d.id, name: d.name }]); }
        if (thenMove) await this.pref(thenMove, 'move', 'f:' + d.id); else { this.S.folder = 'f:' + d.id; this.paint(); }
      } catch (e) { }
    },
    onClick: function (e) {
      var S = this.S; if (!S) return;
      var a = e.target.closest('[data-a]'), act = a && a.getAttribute('data-a');
      // an open ⋯ menu: a tap outside it (or on the dim behind the phone sheet) only closes it
      if (S.menu && (act === 'dim' || (!e.target.closest('.mh-menu') && act !== 'more' && act !== 'x'))) { S.menu = null; S.nfm = false; this.paint(); return; }
      if (!a) return;
      var k = a.getAttribute('data-k'), v = a.getAttribute('data-v');
      switch (act) {
        case 'x': this.dlg().close(); break;
        case 'back': this.back(); break;
        case 'menu': break;
        case 'tok': this.tokenGo(); break;
        case 'fold': S.folder = v; S.nf = false; this.paint(); break;
        case 'nf': S.nf = true; this.paint(); break;
        case 'nfok': { var inp = this.dlg().querySelector('[data-f="nf"]'); S.nf = false; this.newFolder(inp && inp.value); this.paint(); break; }
        case 'delf': { var id = String(v).slice(2); S.folder = 'all'; if (this.D) this.D.folders = (this.D.folders || []).filter(function (f) { return f.id !== id; }); this.paint(); this.sb().rpc('mh_folder', { p_token: this.tok(), p_action: 'delete', p_id: id }).then(this.load.bind(this)); break; }
        case 'more': e.stopPropagation(); S.menu = S.menu === k ? null : k; S.nfm = false; this.paint(); break;
        case 'pin': { var t = this.threads().filter(function (x) { return x.key === k; })[0]; S.menu = null; this.pref(k, t && t.pin ? 'unpin' : 'pin'); break; }
        case 'unr': { var t2 = this.threads().filter(function (x) { return x.key === k; })[0]; S.menu = null;
          if (t2 && (t2.mark || t2.unread)) { if (t2.peer && t2.unread) this.sb().rpc('mh_read', { p_token: this.tok(), p_peer: t2.peer }).then(this.load.bind(this)); this.pref(k, 'read'); }
          else this.pref(k, 'unread'); break; }
        case 'mv': { var t3 = this.threads().filter(function (x) { return x.key === k; })[0]; S.menu = null; this.pref(k, 'move', t3 && v === t3.home ? null : v); break; }
        case 'nfm': S.nfm = true; this.paint('nfm'); break;
        case 'nfmok': { var i2 = this.dlg().querySelector('[data-f="nfm"]'); S.menu = null; S.nfm = false; this.newFolder(i2 && i2.value, k); break; }
        case 'row': {
          if (e.target.closest('.mh-menu')) break;
          var t4 = this.threads().filter(function (x) { return x.key === k; })[0]; if (!t4) break;
          if (t4.ev) { this.dlg().close(); if (W.CourseLink && CourseLink.openPanel) CourseLink.openPanel(t4.ev); if (t4.mark) this.pref(k, 'read'); }
          else if (t4.aud) this.openBcast(t4.aud);
          else this.openThread(t4.peer);
          break;
        }
        case 'new': S.view = 'new'; S.gq = ''; S.gHits = null; this.paint(); if (!this.caddies) this.loadCaddies(false).then(this.paint.bind(this)); break;
        case 'person': S.gq = ''; S.gHits = null; this.openThread(a.getAttribute('data-id'), { name: a.getAttribute('data-n') }); break;
        case 'send': this.send(); break;
        case 'pick': S.pick = !S.pick; S.cq = ''; this.paint(); if (S.pick && !this.caddies) this.loadCaddies(false).then(this.paint.bind(this)); break;
        case 'addc': this.addCaddy(a.getAttribute('data-id'), a); break;
        case 'cad': this.openCaddies(); break;
        case 'aud': S.cad.aud = v; S.cad.one = null; S.sent = null; this.paint(); break;
        case 'one': { var c = (this.caddies || []).filter(function (x) { return x.id === a.getAttribute('data-id'); })[0]; if (c) { S.cad.one = c; S.cad.aud = 'one'; S.cad.oq = ''; S.sent = null; } this.paint(); break; }
        case 'oneX': S.cad.one = null; S.cad.aud = 'duty'; this.paint(); break;
        case 'qk': S.cad.qk = v; S.cad.text = this.t(v + 't'); S.err = null; this.paint(); { var ta = this.dlg().querySelector('[data-f="ctext"]'); if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); } } break;
        case 'csend': this.sendCaddies(); break;
        case 'pins': this.openPins(); break;
      }
    },
    onInput: function (e) {
      var S = this.S, f = e.target.getAttribute && e.target.getAttribute('data-f'); if (!S || !f) return;
      var self = this;
      if (f === 'q') {
        S.q = e.target.value;
        var q = S.q.trim();
        if (/^\d{3}\s?\d{3}$/.test(q) && W.PhoneDesk && W.PhoneDesk.findPin) {
          W.PhoneDesk.findPin(q).then(function (r) { if (self.S && self.S.q.trim() === q) { self.S.pinHit = { q: q.toLowerCase(), g: r && r[0] }; self.paint('q'); } });
        }
        this.paint('q');
      }
      else if (f === 'cq') { S.cq = e.target.value; this.paint('cq'); }
      else if (f === 'oq') { S.cad.oq = e.target.value; this.paint('oq'); }
      else if (f === 'ctext') { S.cad.text = e.target.value; S.cad.qk = null; S.err = null; var b = this.dlg().querySelector('[data-a="csend"]'); if (b) b.disabled = !this.targets().length; e.target.classList.toggle('on', !!e.target.value); }
      else if (f === 'msg') { S.draft = e.target.value; e.target.style.height = 'auto'; e.target.style.height = Math.min(120, e.target.scrollHeight) + 'px'; }
      else if (f === 'gq') { S.gq = e.target.value; clearTimeout(this._gt); this._gt = setTimeout(function () { self.findGolfers(S.gq); }, 250); this.paint('gq'); }
      else if (f === 'tok' && /^\d{6}$/.test(e.target.value)) this.tokenGo();
    },
    onKey: function (e) {
      var f = e.target.getAttribute && e.target.getAttribute('data-f'); if (!f) return;
      if (e.key === 'Enter' && !e.shiftKey) {
        if (f === 'msg') { e.preventDefault(); this.send(); }
        else if (f === 'nf') { e.preventDefault(); this.S.nf = false; this.newFolder(e.target.value); this.paint(); }
        else if (f === 'nfm') { e.preventDefault(); var k = this.S.menu; this.S.menu = null; this.S.nfm = false; this.newFolder(e.target.value, k); }
        else if (f === 'tok') { e.preventDefault(); this.tokenGo(); }
      }
    }
  };
})();

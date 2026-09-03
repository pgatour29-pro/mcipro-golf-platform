/* =====================================================================================
   1on1 (oo-1on1.js) — JOA enterprise private playing-partner booking. v1089 → v1091 (2026-09-03).
   Spec: project-memory/2026-09-03 1on1 Spec.md · DB: sql/oo_schema_20260903.sql

   Members  = approved Korean golfers (normal golfer profiles). Invite link ?oo=CODE is the ONLY door.
   Partners = caddies who opt in from their caddie dashboard. Can decline + cancel.
   Bookings = a DATE RANGE anchored to a course / society event. State changes = SECURITY DEFINER RPCs.
   Everything here rides the Auth v2 session (RLS keyed on the line_id claim) — anon sees nothing.

   v1091 STRUCTURE (Pete: "the dashboard needs to be structured differently"): 1on1 is its OWN
   dashboard screen `#ooDashboard` — the same MHV shell as the caddie dashboard (green app bar,
   phone cube home + bottom dock + More sheet, desktop tab strip). ONE screen, TWO personas:
   OneOnOne.enter('member') from the golfer cube / desktop rail, OneOnOne.enter('partner') from
   the caddie cube / tab / drawer. The golfer + caddie dashboards keep ONLY those entry points.
   Views — member: browse → partner → book · mine · calendar · admin(oo_admins) · messages(exits)
           partner: requests · calendar · profile · photos · earnings · messages(exits)
   Back (FAB / hardware / header ◀) = OneOnOne.handleBack(): ask sheet → More sheet → internal
   view stack → phone cube home → exit to the dashboard that opened it.
   ===================================================================================== */
(function () {
  'use strict';
  var DICT = {
    en: {
      'oo.title': '1on1', 'oo.cube.desc': 'Private playing partners', 'oo.cube.pending': 'Pending approval',
      'oo.cube.open': 'Find a partner', 'oo.cube.upcoming': '{n} upcoming', 'oo.cube.partner': 'Partner requests',
      'oo.seg.browse': 'Browse', 'oo.seg.mine': 'My bookings', 'oo.seg.admin': 'Admin',
      'oo.seg.requests': 'Requests', 'oo.seg.calendar': 'Calendar', 'oo.seg.profile': 'Profile', 'oo.seg.earnings': 'Earnings',
      'oo.from': 'From', 'oo.to': 'To', 'oo.search': 'Search', 'oo.course': 'Course', 'oo.language': 'Language', 'oo.any': 'Any',
      'oo.days': '{n} days', 'oo.day': '1 day', 'oo.perday': '/day', 'oo.photos': '{n} photos', 'oo.noresults': 'No partners free for those dates.',
      'oo.pickdates': 'Pick your dates to see who is free.', 'oo.pending.msg': 'Your 1on1 access is awaiting approval. You will be notified.',
      'oo.suspended.msg': 'Your 1on1 access is suspended.', 'oo.expired.msg': 'Your 1on1 membership has expired.',
      'oo.signin.msg': 'Please log out and log in again to activate 1on1.',
      'oo.book': 'Book', 'oo.bio': 'About', 'oo.tips': 'Local knowledge', 'oo.knows': 'Courses I know', 'oo.hcp': 'HCP', 'oo.home': 'Home course',
      'oo.langs': 'Languages', 'oo.rate': 'Day rate', 'oo.total': 'Total', 'oo.holes': 'Holes', 'oo.teetime': 'Tee time', 'oo.notes': 'Notes',
      'oo.event': 'Joining an event', 'oo.noevent': 'No event (my own round)', 'oo.send': 'Send request', 'oo.cancel': 'Cancel',
      'oo.cancelq': 'Cancel this booking?', 'oo.reasonlbl': 'Reason', 'oo.reason': 'Reason (optional)', 'oo.message': 'Message', 'oo.msgsent': 'Message sent',
      'oo.st.requested': 'Requested', 'oo.st.accepted': 'Accepted', 'oo.st.declined': 'Declined', 'oo.st.cancelled': 'Cancelled',
      'oo.st.completed': 'Completed', 'oo.st.expired': 'Expired', 'oo.paid': 'Paid', 'oo.unpaid': 'Unpaid',
      'oo.nobookings': 'No bookings yet.', 'oo.requested.ok': 'Request sent. The partner will accept or decline.',
      'oo.accept': 'Accept', 'oo.decline': 'Decline', 'oo.declineq': 'Decline this request?', 'oo.markpaid': 'Mark paid', 'oo.markunpaid': 'Mark unpaid',
      'oo.complete': 'Mark completed', 'oo.norequests': 'No requests yet.', 'oo.by': 'by',
      'oo.optin.title': 'Offer 1on1 playing-partner service', 'oo.optin.desc': 'Play rounds with members and share your local knowledge. Prefilled from your caddie profile — edit anything.',
      'oo.optin.submit': 'Submit for approval', 'oo.awaiting': 'Awaiting approval', 'oo.approved': 'Approved — visible to members', 'oo.suspended': 'Suspended',
      'oo.save': 'Save', 'oo.saved': 'Saved', 'oo.displayname': 'Display name', 'oo.availdays': 'Days I can play', 'oo.blackouts': 'Unavailable dates',
      'oo.addblackout': 'Add', 'oo.note': 'Note', 'oo.gallery': 'Photos', 'oo.addphoto': 'Add photo', 'oo.cover': 'Cover', 'oo.setcover': 'Set as cover',
      'oo.delete': 'Delete', 'oo.deleteq': 'Delete this photo?', 'oo.posts': 'Posts', 'oo.addpost': 'Add post', 'oo.caption': 'Caption', 'oo.body': 'Text',
      'oo.earn.total': 'Accepted', 'oo.earn.paid': 'Paid', 'oo.earn.unpaid': 'Unpaid', 'oo.uploading': 'Uploading…', 'oo.maxphotos': 'Maximum 12 photos.',
      'oo.legend.booked': 'Booked', 'oo.legend.requested': 'Requested', 'oo.legend.off': 'Unavailable',
      'oo.adm.members': 'Members', 'oo.adm.partners': 'Partners', 'oo.adm.invites': 'Invites', 'oo.adm.bookings': 'Bookings', 'oo.adm.media': 'Photo review', 'oo.adm.reports': 'Reports',
      'oo.adm.approve': 'Approve', 'oo.adm.suspend': 'Suspend', 'oo.adm.reactivate': 'Reactivate', 'oo.adm.newinvite': 'New invite', 'oo.adm.kind': 'Type',
      'oo.adm.member': 'Member', 'oo.adm.partner': 'Partner', 'oo.adm.uses': 'Uses', 'oo.adm.auto': 'Auto-approve', 'oo.adm.days': 'Valid days', 'oo.adm.create': 'Create',
      'oo.adm.copy': 'Copy link', 'oo.adm.copied': 'Link copied', 'oo.adm.hide': 'Hide', 'oo.adm.show': 'Show', 'oo.adm.none': 'Nothing here.', 'oo.adm.expires': 'Expires',
      'oo.report': 'Report', 'oo.reportq': 'Report a problem with this booking', 'oo.reported': 'Report sent',
      'oo.err.partner_busy': 'That partner is no longer free for those dates.', 'oo.err.already_requested': 'You already have a request for those dates.',
      'oo.err.bad_range': 'Pick a valid date range (today or later, up to 90 days).', 'oo.err.not_a_member': 'Your 1on1 access is not active.',
      'oo.err.invite_invalid': 'That invite code is not valid.', 'oo.err.invite_expired': 'That invite code has expired.', 'oo.err.invite_used_up': 'That invite code has been used up.',
      'oo.err.not_a_caddie': 'Only caddies can offer 1on1.', 'oo.err.generic': 'Something went wrong. Please try again.',
      'oo.invite.ok': '1on1 invite accepted.', 'oo.invite.partner.ok': '1on1 partner profile created.',
      'oo.push.requested': 'New 1on1 request from {name}: {range} at {course}. Open MyCaddiPro to accept or decline.',
      'oo.push.accepted': '{name} accepted your 1on1 booking: {range} at {course}.', 'oo.push.declined': '{name} declined your 1on1 request for {range}.',
      'oo.push.cancelled': '{name} cancelled the 1on1 booking for {range}.', 'oo.push.member_ok': 'Your 1on1 access is approved. Open MyCaddiPro to find a partner.',
      'oo.push.partner_ok': 'Your 1on1 partner profile is approved. Members can now book you.'
    },
    th: {
      'oo.title': '1on1', 'oo.cube.desc': 'คู่เล่นส่วนตัว', 'oo.cube.pending': 'รออนุมัติ', 'oo.cube.open': 'หาคู่เล่น', 'oo.cube.upcoming': 'กำลังมา {n}', 'oo.cube.partner': 'คำขอคู่เล่น',
      'oo.seg.browse': 'ค้นหา', 'oo.seg.mine': 'การจองของฉัน', 'oo.seg.admin': 'ผู้ดูแล', 'oo.seg.requests': 'คำขอ', 'oo.seg.calendar': 'ปฏิทิน', 'oo.seg.profile': 'โปรไฟล์', 'oo.seg.earnings': 'รายได้',
      'oo.from': 'จาก', 'oo.to': 'ถึง', 'oo.search': 'ค้นหา', 'oo.course': 'สนาม', 'oo.language': 'ภาษา', 'oo.any': 'ทั้งหมด', 'oo.days': '{n} วัน', 'oo.day': '1 วัน', 'oo.perday': '/วัน',
      'oo.photos': '{n} รูป', 'oo.noresults': 'ไม่มีคู่เล่นว่างในวันดังกล่าว', 'oo.pickdates': 'เลือกวันที่เพื่อดูว่าใครว่าง', 'oo.pending.msg': 'สิทธิ์ 1on1 ของคุณกำลังรออนุมัติ',
      'oo.suspended.msg': 'สิทธิ์ 1on1 ของคุณถูกระงับ', 'oo.expired.msg': 'สมาชิก 1on1 ของคุณหมดอายุแล้ว', 'oo.signin.msg': 'กรุณาออกจากระบบและเข้าสู่ระบบใหม่เพื่อเปิดใช้ 1on1',
      'oo.book': 'จอง', 'oo.bio': 'เกี่ยวกับ', 'oo.tips': 'ความรู้ท้องถิ่น', 'oo.knows': 'สนามที่รู้จัก', 'oo.hcp': 'HCP', 'oo.home': 'สนามประจำ', 'oo.langs': 'ภาษา', 'oo.rate': 'ราคาต่อวัน',
      'oo.total': 'รวม', 'oo.holes': 'หลุม', 'oo.teetime': 'เวลาออกรอบ', 'oo.notes': 'หมายเหตุ', 'oo.event': 'ร่วมรายการแข่ง', 'oo.noevent': 'ไม่มีรายการ (รอบของฉันเอง)', 'oo.send': 'ส่งคำขอ',
      'oo.cancel': 'ยกเลิก', 'oo.cancelq': 'ยกเลิกการจองนี้?', 'oo.reasonlbl': 'เหตุผล', 'oo.reason': 'เหตุผล (ไม่บังคับ)', 'oo.message': 'ข้อความ', 'oo.msgsent': 'ส่งข้อความแล้ว',
      'oo.st.requested': 'รอตอบรับ', 'oo.st.accepted': 'ตอบรับแล้ว', 'oo.st.declined': 'ปฏิเสธ', 'oo.st.cancelled': 'ยกเลิก', 'oo.st.completed': 'เสร็จสิ้น', 'oo.st.expired': 'หมดอายุ',
      'oo.paid': 'จ่ายแล้ว', 'oo.unpaid': 'ยังไม่จ่าย', 'oo.nobookings': 'ยังไม่มีการจอง', 'oo.requested.ok': 'ส่งคำขอแล้ว คู่เล่นจะตอบรับหรือปฏิเสธ',
      'oo.accept': 'ตอบรับ', 'oo.decline': 'ปฏิเสธ', 'oo.declineq': 'ปฏิเสธคำขอนี้?', 'oo.markpaid': 'ทำเครื่องหมายจ่ายแล้ว', 'oo.markunpaid': 'ทำเครื่องหมายยังไม่จ่าย',
      'oo.complete': 'ทำเครื่องหมายเสร็จสิ้น', 'oo.norequests': 'ยังไม่มีคำขอ', 'oo.by': 'โดย',
      'oo.optin.title': 'เปิดบริการคู่เล่น 1on1', 'oo.optin.desc': 'ออกรอบกับสมาชิกและแบ่งปันความรู้ท้องถิ่น ข้อมูลเติมจากโปรไฟล์แคดดี้ แก้ไขได้ทุกอย่าง',
      'oo.optin.submit': 'ส่งเพื่อขออนุมัติ', 'oo.awaiting': 'รออนุมัติ', 'oo.approved': 'อนุมัติแล้ว — สมาชิกมองเห็น', 'oo.suspended': 'ถูกระงับ',
      'oo.save': 'บันทึก', 'oo.saved': 'บันทึกแล้ว', 'oo.displayname': 'ชื่อที่แสดง', 'oo.availdays': 'วันที่เล่นได้', 'oo.blackouts': 'วันที่ไม่ว่าง', 'oo.addblackout': 'เพิ่ม', 'oo.note': 'หมายเหตุ',
      'oo.gallery': 'รูปภาพ', 'oo.addphoto': 'เพิ่มรูป', 'oo.cover': 'ปก', 'oo.setcover': 'ตั้งเป็นรูปปก', 'oo.delete': 'ลบ', 'oo.deleteq': 'ลบรูปนี้?', 'oo.posts': 'โพสต์', 'oo.addpost': 'เพิ่มโพสต์',
      'oo.caption': 'คำบรรยาย', 'oo.body': 'ข้อความ', 'oo.earn.total': 'ตอบรับแล้ว', 'oo.earn.paid': 'จ่ายแล้ว', 'oo.earn.unpaid': 'ยังไม่จ่าย', 'oo.uploading': 'กำลังอัปโหลด…', 'oo.maxphotos': 'สูงสุด 12 รูป',
      'oo.legend.booked': 'จองแล้ว', 'oo.legend.requested': 'รอตอบรับ', 'oo.legend.off': 'ไม่ว่าง',
      'oo.adm.members': 'สมาชิก', 'oo.adm.partners': 'คู่เล่น', 'oo.adm.invites': 'คำเชิญ', 'oo.adm.bookings': 'การจอง', 'oo.adm.media': 'ตรวจรูป', 'oo.adm.reports': 'รายงาน',
      'oo.adm.approve': 'อนุมัติ', 'oo.adm.suspend': 'ระงับ', 'oo.adm.reactivate': 'เปิดใช้อีกครั้ง', 'oo.adm.newinvite': 'สร้างคำเชิญ', 'oo.adm.kind': 'ประเภท', 'oo.adm.member': 'สมาชิก', 'oo.adm.partner': 'คู่เล่น',
      'oo.adm.uses': 'จำนวนครั้ง', 'oo.adm.auto': 'อนุมัติอัตโนมัติ', 'oo.adm.days': 'ใช้ได้ (วัน)', 'oo.adm.create': 'สร้าง', 'oo.adm.copy': 'คัดลอกลิงก์', 'oo.adm.copied': 'คัดลอกแล้ว', 'oo.adm.hide': 'ซ่อน', 'oo.adm.show': 'แสดง',
      'oo.adm.none': 'ไม่มีข้อมูล', 'oo.adm.expires': 'หมดอายุ', 'oo.report': 'รายงาน', 'oo.reportq': 'รายงานปัญหาการจองนี้', 'oo.reported': 'ส่งรายงานแล้ว',
      'oo.err.partner_busy': 'คู่เล่นไม่ว่างในวันดังกล่าวแล้ว', 'oo.err.already_requested': 'คุณมีคำขอในวันดังกล่าวอยู่แล้ว', 'oo.err.bad_range': 'เลือกช่วงวันที่ให้ถูกต้อง (วันนี้ขึ้นไป ไม่เกิน 90 วัน)',
      'oo.err.not_a_member': 'สิทธิ์ 1on1 ของคุณยังไม่เปิดใช้', 'oo.err.invite_invalid': 'รหัสเชิญไม่ถูกต้อง', 'oo.err.invite_expired': 'รหัสเชิญหมดอายุ', 'oo.err.invite_used_up': 'รหัสเชิญถูกใช้ครบแล้ว',
      'oo.err.not_a_caddie': 'เฉพาะแคดดี้เท่านั้นที่เปิดบริการ 1on1 ได้', 'oo.err.generic': 'เกิดข้อผิดพลาด กรุณาลองใหม่', 'oo.invite.ok': 'รับคำเชิญ 1on1 แล้ว', 'oo.invite.partner.ok': 'สร้างโปรไฟล์คู่เล่น 1on1 แล้ว',
      'oo.push.requested': 'คำขอ 1on1 ใหม่จาก {name}: {range} ที่ {course} เปิด MyCaddiPro เพื่อตอบรับหรือปฏิเสธ', 'oo.push.accepted': '{name} ตอบรับการจอง 1on1: {range} ที่ {course}',
      'oo.push.declined': '{name} ปฏิเสธคำขอ 1on1 สำหรับ {range}', 'oo.push.cancelled': '{name} ยกเลิกการจอง 1on1 สำหรับ {range}', 'oo.push.member_ok': 'สิทธิ์ 1on1 ของคุณได้รับอนุมัติแล้ว',
      'oo.push.partner_ok': 'โปรไฟล์คู่เล่น 1on1 ของคุณได้รับอนุมัติแล้ว สมาชิกจองคุณได้แล้ว'
    },
    ko: {
      'oo.title': '1on1', 'oo.cube.desc': '프라이빗 라운딩 파트너', 'oo.cube.pending': '승인 대기 중', 'oo.cube.open': '파트너 찾기', 'oo.cube.upcoming': '예정 {n}건', 'oo.cube.partner': '파트너 요청',
      'oo.seg.browse': '찾기', 'oo.seg.mine': '내 예약', 'oo.seg.admin': '관리자', 'oo.seg.requests': '요청', 'oo.seg.calendar': '캘린더', 'oo.seg.profile': '프로필', 'oo.seg.earnings': '수입',
      'oo.from': '시작일', 'oo.to': '종료일', 'oo.search': '검색', 'oo.course': '골프장', 'oo.language': '언어', 'oo.any': '전체', 'oo.days': '{n}일', 'oo.day': '1일', 'oo.perday': '/일',
      'oo.photos': '사진 {n}장', 'oo.noresults': '해당 날짜에 가능한 파트너가 없습니다.', 'oo.pickdates': '날짜를 선택하면 가능한 파트너가 표시됩니다.', 'oo.pending.msg': '1on1 이용 승인을 기다리고 있습니다. 승인되면 알려드립니다.',
      'oo.suspended.msg': '1on1 이용이 정지되었습니다.', 'oo.expired.msg': '1on1 멤버십이 만료되었습니다.', 'oo.signin.msg': '1on1을 활성화하려면 로그아웃 후 다시 로그인해 주세요.',
      'oo.book': '예약', 'oo.bio': '소개', 'oo.tips': '현지 정보', 'oo.knows': '잘 아는 골프장', 'oo.hcp': '핸디', 'oo.home': '홈 코스', 'oo.langs': '언어', 'oo.rate': '1일 요금',
      'oo.total': '합계', 'oo.holes': '홀', 'oo.teetime': '티오프', 'oo.notes': '메모', 'oo.event': '이벤트 참가', 'oo.noevent': '이벤트 없음 (개인 라운딩)', 'oo.send': '요청 보내기',
      'oo.cancel': '취소', 'oo.cancelq': '이 예약을 취소할까요?', 'oo.reasonlbl': '사유', 'oo.reason': '사유 (선택)', 'oo.message': '메시지', 'oo.msgsent': '메시지를 보냈습니다',
      'oo.st.requested': '요청됨', 'oo.st.accepted': '수락됨', 'oo.st.declined': '거절됨', 'oo.st.cancelled': '취소됨', 'oo.st.completed': '완료', 'oo.st.expired': '만료',
      'oo.paid': '결제 완료', 'oo.unpaid': '미결제', 'oo.nobookings': '예약이 없습니다.', 'oo.requested.ok': '요청을 보냈습니다. 파트너가 수락 또는 거절합니다.',
      'oo.accept': '수락', 'oo.decline': '거절', 'oo.declineq': '이 요청을 거절할까요?', 'oo.markpaid': '결제 완료 표시', 'oo.markunpaid': '미결제로 표시', 'oo.complete': '완료 표시', 'oo.norequests': '요청이 없습니다.', 'oo.by': '·',
      'oo.optin.title': '1on1 라운딩 파트너 서비스 제공', 'oo.optin.desc': '회원과 라운딩하고 현지 정보를 공유하세요. 캐디 프로필에서 자동 입력됩니다. 모두 수정 가능합니다.',
      'oo.optin.submit': '승인 요청', 'oo.awaiting': '승인 대기 중', 'oo.approved': '승인됨 — 회원에게 공개', 'oo.suspended': '정지됨',
      'oo.save': '저장', 'oo.saved': '저장됨', 'oo.displayname': '표시 이름', 'oo.availdays': '라운딩 가능 요일', 'oo.blackouts': '불가능한 날짜', 'oo.addblackout': '추가', 'oo.note': '메모',
      'oo.gallery': '사진', 'oo.addphoto': '사진 추가', 'oo.cover': '대표', 'oo.setcover': '대표 사진으로', 'oo.delete': '삭제', 'oo.deleteq': '이 사진을 삭제할까요?', 'oo.posts': '게시글', 'oo.addpost': '게시글 추가',
      'oo.caption': '제목', 'oo.body': '내용', 'oo.earn.total': '수락됨', 'oo.earn.paid': '결제 완료', 'oo.earn.unpaid': '미결제', 'oo.uploading': '업로드 중…', 'oo.maxphotos': '사진은 최대 12장입니다.',
      'oo.legend.booked': '예약됨', 'oo.legend.requested': '요청됨', 'oo.legend.off': '불가',
      'oo.adm.members': '회원', 'oo.adm.partners': '파트너', 'oo.adm.invites': '초대', 'oo.adm.bookings': '예약', 'oo.adm.media': '사진 검토', 'oo.adm.reports': '신고',
      'oo.adm.approve': '승인', 'oo.adm.suspend': '정지', 'oo.adm.reactivate': '재활성화', 'oo.adm.newinvite': '새 초대', 'oo.adm.kind': '유형', 'oo.adm.member': '회원', 'oo.adm.partner': '파트너',
      'oo.adm.uses': '사용 횟수', 'oo.adm.auto': '자동 승인', 'oo.adm.days': '유효 기간(일)', 'oo.adm.create': '생성', 'oo.adm.copy': '링크 복사', 'oo.adm.copied': '링크가 복사되었습니다', 'oo.adm.hide': '숨김', 'oo.adm.show': '표시',
      'oo.adm.none': '내용이 없습니다.', 'oo.adm.expires': '만료', 'oo.report': '신고', 'oo.reportq': '이 예약의 문제를 신고합니다', 'oo.reported': '신고가 접수되었습니다',
      'oo.err.partner_busy': '해당 파트너는 그 날짜에 더 이상 가능하지 않습니다.', 'oo.err.already_requested': '해당 날짜에 이미 요청이 있습니다.', 'oo.err.bad_range': '올바른 날짜 범위를 선택하세요 (오늘 이후, 최대 90일).',
      'oo.err.not_a_member': '1on1 이용 권한이 활성화되지 않았습니다.', 'oo.err.invite_invalid': '초대 코드가 올바르지 않습니다.', 'oo.err.invite_expired': '초대 코드가 만료되었습니다.', 'oo.err.invite_used_up': '초대 코드가 모두 사용되었습니다.',
      'oo.err.not_a_caddie': '캐디만 1on1을 제공할 수 있습니다.', 'oo.err.generic': '문제가 발생했습니다. 다시 시도해 주세요.', 'oo.invite.ok': '1on1 초대가 수락되었습니다.', 'oo.invite.partner.ok': '1on1 파트너 프로필이 생성되었습니다.',
      'oo.push.requested': '{name}님의 새 1on1 요청: {range}, {course}. MyCaddiPro에서 수락 또는 거절하세요.', 'oo.push.accepted': '{name}님이 1on1 예약을 수락했습니다: {range}, {course}.',
      'oo.push.declined': '{name}님이 {range} 1on1 요청을 거절했습니다.', 'oo.push.cancelled': '{name}님이 {range} 1on1 예약을 취소했습니다.', 'oo.push.member_ok': '1on1 이용이 승인되었습니다. MyCaddiPro에서 파트너를 찾아보세요.',
      'oo.push.partner_ok': '1on1 파트너 프로필이 승인되었습니다. 이제 회원이 예약할 수 있습니다.'
    },
    ja: {
      'oo.title': '1on1', 'oo.cube.desc': 'プライベートな同伴者', 'oo.cube.pending': '承認待ち', 'oo.cube.open': '同伴者を探す', 'oo.cube.upcoming': '予定 {n}件', 'oo.cube.partner': '同伴リクエスト',
      'oo.seg.browse': '検索', 'oo.seg.mine': '予約', 'oo.seg.admin': '管理', 'oo.seg.requests': 'リクエスト', 'oo.seg.calendar': 'カレンダー', 'oo.seg.profile': 'プロフィール', 'oo.seg.earnings': '収入',
      'oo.from': '開始', 'oo.to': '終了', 'oo.search': '検索', 'oo.course': 'コース', 'oo.language': '言語', 'oo.any': 'すべて', 'oo.days': '{n}日', 'oo.day': '1日', 'oo.perday': '/日',
      'oo.photos': '写真{n}枚', 'oo.noresults': 'その日程で空いている同伴者はいません。', 'oo.pickdates': '日程を選ぶと空いている同伴者が表示されます。', 'oo.pending.msg': '1on1の利用承認を待っています。',
      'oo.suspended.msg': '1on1の利用が停止されています。', 'oo.expired.msg': '1on1の会員期限が切れています。', 'oo.signin.msg': '1on1を有効にするには、ログアウトして再度ログインしてください。',
      'oo.book': '予約', 'oo.bio': '紹介', 'oo.tips': 'ローカル情報', 'oo.knows': '知っているコース', 'oo.hcp': 'HCP', 'oo.home': 'ホームコース', 'oo.langs': '言語', 'oo.rate': '1日料金',
      'oo.total': '合計', 'oo.holes': 'ホール', 'oo.teetime': 'ティータイム', 'oo.notes': 'メモ', 'oo.event': 'イベント参加', 'oo.noevent': 'イベントなし（自分のラウンド）', 'oo.send': 'リクエスト送信',
      'oo.cancel': 'キャンセル', 'oo.cancelq': 'この予約をキャンセルしますか？', 'oo.reasonlbl': '理由', 'oo.reason': '理由（任意）', 'oo.message': 'メッセージ', 'oo.msgsent': '送信しました',
      'oo.st.requested': 'リクエスト済', 'oo.st.accepted': '承諾', 'oo.st.declined': '辞退', 'oo.st.cancelled': 'キャンセル', 'oo.st.completed': '完了', 'oo.st.expired': '期限切れ',
      'oo.paid': '支払済', 'oo.unpaid': '未払い', 'oo.nobookings': '予約はありません。', 'oo.requested.ok': 'リクエストを送りました。同伴者が承諾または辞退します。',
      'oo.accept': '承諾', 'oo.decline': '辞退', 'oo.declineq': 'このリクエストを辞退しますか？', 'oo.markpaid': '支払済にする', 'oo.markunpaid': '未払いにする', 'oo.complete': '完了にする', 'oo.norequests': 'リクエストはありません。', 'oo.by': '·',
      'oo.optin.title': '1on1同伴サービスを提供', 'oo.optin.desc': '会員とラウンドし、ローカル情報を共有します。キャディプロフィールから自動入力。すべて編集できます。',
      'oo.optin.submit': '承認を申請', 'oo.awaiting': '承認待ち', 'oo.approved': '承認済 — 会員に公開', 'oo.suspended': '停止中',
      'oo.save': '保存', 'oo.saved': '保存しました', 'oo.displayname': '表示名', 'oo.availdays': 'プレー可能な曜日', 'oo.blackouts': '不可日', 'oo.addblackout': '追加', 'oo.note': 'メモ',
      'oo.gallery': '写真', 'oo.addphoto': '写真を追加', 'oo.cover': 'カバー', 'oo.setcover': 'カバーにする', 'oo.delete': '削除', 'oo.deleteq': 'この写真を削除しますか？', 'oo.posts': '投稿', 'oo.addpost': '投稿を追加',
      'oo.caption': 'タイトル', 'oo.body': '本文', 'oo.earn.total': '承諾', 'oo.earn.paid': '支払済', 'oo.earn.unpaid': '未払い', 'oo.uploading': 'アップロード中…', 'oo.maxphotos': '写真は最大12枚です。',
      'oo.legend.booked': '予約済', 'oo.legend.requested': 'リクエスト', 'oo.legend.off': '不可',
      'oo.adm.members': '会員', 'oo.adm.partners': '同伴者', 'oo.adm.invites': '招待', 'oo.adm.bookings': '予約', 'oo.adm.media': '写真確認', 'oo.adm.reports': '通報',
      'oo.adm.approve': '承認', 'oo.adm.suspend': '停止', 'oo.adm.reactivate': '再開', 'oo.adm.newinvite': '新規招待', 'oo.adm.kind': '種類', 'oo.adm.member': '会員', 'oo.adm.partner': '同伴者',
      'oo.adm.uses': '使用回数', 'oo.adm.auto': '自動承認', 'oo.adm.days': '有効日数', 'oo.adm.create': '作成', 'oo.adm.copy': 'リンクをコピー', 'oo.adm.copied': 'コピーしました', 'oo.adm.hide': '非表示', 'oo.adm.show': '表示',
      'oo.adm.none': '何もありません。', 'oo.adm.expires': '期限', 'oo.report': '通報', 'oo.reportq': 'この予約の問題を通報', 'oo.reported': '通報しました',
      'oo.err.partner_busy': 'その同伴者はその日程では空いていません。', 'oo.err.already_requested': 'その日程のリクエストは既にあります。', 'oo.err.bad_range': '有効な日程を選んでください（今日以降、最大90日）。',
      'oo.err.not_a_member': '1on1の利用が有効ではありません。', 'oo.err.invite_invalid': '招待コードが無効です。', 'oo.err.invite_expired': '招待コードの期限が切れています。', 'oo.err.invite_used_up': '招待コードは使い切られています。',
      'oo.err.not_a_caddie': '1on1を提供できるのはキャディのみです。', 'oo.err.generic': 'エラーが発生しました。もう一度お試しください。', 'oo.invite.ok': '1on1の招待を受け付けました。', 'oo.invite.partner.ok': '1on1同伴者プロフィールを作成しました。',
      'oo.push.requested': '{name}さんから新しい1on1リクエスト：{range}、{course}。MyCaddiProで承諾または辞退してください。', 'oo.push.accepted': '{name}さんが1on1予約を承諾しました：{range}、{course}。',
      'oo.push.declined': '{name}さんが{range}の1on1リクエストを辞退しました。', 'oo.push.cancelled': '{name}さんが{range}の1on1予約をキャンセルしました。', 'oo.push.member_ok': '1on1の利用が承認されました。',
      'oo.push.partner_ok': '1on1同伴者プロフィールが承認されました。会員が予約できます。'
    }
  };
  try { if (typeof translations !== 'undefined') Object.keys(DICT).forEach(function (l) { if (translations[l]) Object.assign(translations[l], DICT[l]); }); } catch (e) {}

  /* ---------- helpers ---------- */
  var T = function (k, fb) { try { if (typeof _lvT === 'function') return _lvT(k, fb); } catch (e) {} return fb; };
  var TT = function (k, vars) { var s = T(k, DICT.en[k] || k); Object.keys(vars || {}).forEach(function (v) { s = s.split('{' + v + '}').join(vars[v]); }); return s; };
  var TL = function (lang, k, vars) { var d = DICT[lang] || DICT.en; var s = d[k] || DICT.en[k] || k; Object.keys(vars || {}).forEach(function (v) { s = s.split('{' + v + '}').join(vars[v]); }); return s; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var sb = function () { return window.SupabaseDB && window.SupabaseDB.client; };
  var uid = function () { try { return (window.AppState && AppState.currentUser && (AppState.currentUser.lineUserId || AppState.currentUser.userId)) || localStorage.getItem('line_user_id'); } catch (e) { return null; } };
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var ymd = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var today = function () { return ymd(new Date()); };                       // device-local = Bangkok for our users
  var addDays = function (s, n) { var d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return ymd(d); };
  var dayCount = function (a, b) { return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000) + 1; };
  var loc = function () { try { return (typeof _lvLocale === 'function') ? _lvLocale() : undefined; } catch (e) { return undefined; } };
  var fmtD = function (s) { try { return new Date(s + 'T00:00:00').toLocaleDateString(loc(), { month: 'short', day: 'numeric' }); } catch (e) { return s; } };
  var fmtRange = function (a, b) { return a === b ? fmtD(a) : fmtD(a) + ' – ' + fmtD(b); };
  var money = function (n, cur) { if (n == null) return ''; return (cur || 'THB') === 'THB' ? '฿' + Number(n).toLocaleString() : Number(n).toLocaleString() + ' ' + cur; };
  var toast = function (msg, kind) { try { window.NotificationManager.show(msg, kind || 'info'); } catch (e) { try { alert(msg); } catch (_) {} } };
  var errMsg = function (e) { var m = String((e && (e.message || e.error_description || e.details)) || e || ''); var k = m.match(/[a-z_]+/); var key = k && DICT.en['oo.err.' + k[0]] ? 'oo.err.' + k[0] : 'oo.err.generic'; return T(key, DICT.en[key]); };
  var STATUS_CLS = { requested: 'bg-amber-50 text-amber-800', accepted: 'bg-green-50 text-green-700', declined: 'bg-red-50 text-red-700', cancelled: 'bg-gray-100 text-gray-700', completed: 'bg-sky-50 text-sky-700', expired: 'bg-gray-100 text-gray-700' };
  var stChip = function (s) { return '<span class="text-[11px] font-bold px-2 py-0.5 rounded-full ' + (STATUS_CLS[s] || 'bg-gray-100 text-gray-700') + '">' + esc(T('oo.st.' + s, s)) + '</span>'; };
  var LANGS = ['Korean', 'English', 'Thai', 'Japanese', 'Chinese'];
  var DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  var dayLabel = function (d) { var i = DAYS.indexOf(d); var base = new Date('2026-08-31T00:00:00'); base.setDate(base.getDate() + i); try { return base.toLocaleDateString(loc(), { weekday: 'short' }); } catch (e) { return d; } };
  var initials = function (name) { return String(name || '?').split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase() || '?'; };

  async function rpc(name, args) {
    var c = sb(); if (!c) throw new Error('generic');
    var r = await c.rpc(name, args || {});
    if (r.error) throw r.error;
    return r.data;
  }

  /* signed URLs for the PRIVATE bucket (cache 50 min; the policy is the gate, never a public URL) */
  var _signed = {};
  async function signedUrls(paths) {
    var need = paths.filter(function (p) { return p && !(_signed[p] && _signed[p].exp > Date.now()); });
    if (need.length) {
      try {
        var r = await sb().storage.from('oo-media').createSignedUrls(need, 3600);
        (r.data || []).forEach(function (row, i) { if (row && row.signedUrl) _signed[need[i]] = { url: row.signedUrl, exp: Date.now() + 50 * 60000 }; });
      } catch (e) { console.warn('[1on1] signed urls', e); }
    }
    var out = {}; paths.forEach(function (p) { out[p] = _signed[p] ? _signed[p].url : null; }); return out;
  }

  /* push through the EXISTING channels: KAKAO- ids → kakao-push, LINE U… → line-push-notification system_alert.
     Google users have no push channel (in-app badge only). Language = recipient's user_profiles.language. */
  async function push(recipientId, key, vars) {
    try {
      if (!recipientId) return;
      var lang = 'en';
      try { var r = await sb().from('user_profiles').select('language').eq('line_user_id', recipientId).maybeSingle(); lang = (r.data && r.data.language) || (recipientId.indexOf('KAKAO-') === 0 ? 'ko' : 'en'); } catch (e) {}
      var msg = TL(lang, key, vars);
      if (recipientId.indexOf('KAKAO-') === 0) { await sb().functions.invoke('kakao-push', { body: { recipient_id: recipientId, message: msg } }); }
      else if (recipientId.charAt(0) === 'U') { await sb().functions.invoke('line-push-notification', { body: { type: 'system_alert', recipient_id: recipientId, message: msg } }); }
    } catch (e) { console.warn('[1on1] push', e); }
  }

  async function sendDm(recipientId) {
    var text = await ask(T('oo.message', 'Message'), '');
    if (!text) return;
    try { await window.SecureDM.send(uid(), recipientId, text); toast(T('oo.msgsent', 'Message sent'), 'success'); } catch (e) { toast(errMsg(e), 'error'); }
  }

  /* tiny body-mounted ask sheet (no native prompt(); .screen transforms trap fixed modals → mount on body) */
  function ask(title, placeholder, opts) {
    opts = opts || {};
    return new Promise(function (res) {
      var w = document.createElement('div');
      w.id = 'ooAsk';
      w.style.cssText = 'position:fixed;inset:0;z-index:99990;background:rgba(15,23,42,.55);display:flex;align-items:flex-end;justify-content:center;padding:12px';
      w.innerHTML = '<div style="background:#fff;border-radius:16px;width:100%;max-width:440px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.25)">' +
        '<div style="font-weight:800;color:#0f172a;margin-bottom:10px">' + esc(title) + '</div>' +
        '<textarea id="ooAskIn" rows="3" placeholder="' + esc(placeholder || '') + '" style="width:100%;border:1px solid #cbd5e1;border-radius:10px;padding:10px;font-size:15px;color:#0f172a"></textarea>' +
        '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px">' +
        '<button type="button" id="ooAskNo" style="border:1px solid #cbd5e1;background:#fff;color:#334155;border-radius:10px;padding:8px 14px;font-weight:700">' + esc(T('oo.cancel', 'Cancel')) + '</button>' +
        '<button type="button" id="ooAskOk" style="background:#16a34a;color:#fff;border-radius:10px;padding:8px 14px;font-weight:700">' + esc(opts.ok || 'OK') + '</button></div></div>';
      document.body.appendChild(w);
      var done = function (v) { try { w.remove(); } catch (e) {} res(v); };
      w.querySelector('#ooAskNo').onclick = function () { done(null); };
      w.querySelector('#ooAskOk').onclick = function () { done(w.querySelector('#ooAskIn').value.trim() || (opts.allowEmpty ? '' : null)); };
      w.addEventListener('click', function (ev) { if (ev.target === w) done(null); });
      setTimeout(function () { try { w.querySelector('#ooAskIn').focus(); } catch (e) {} }, 50);
    });
  }
  function confirmSheet(title, okLabel) { return ask(title, T('oo.reason', 'Reason (optional)'), { ok: okLabel || 'OK', allowEmpty: true }).then(function (v) { return v === null ? null : v; }); }


  /* ---------- v1091 shell strings (EN/TH/KO/JA parity) ---------- */
  var DICT2 = {
    en: { 'oo.sub': 'JOA · Private playing partners', 'oo.dock.home': 'Home', 'oo.more': 'More', 'oo.exit': 'Back to my dashboard', 'oo.role.admin': 'Admin',
      'oo.cube.find.chip': 'Pick dates · browse', 'oo.cube.mine.chip': 'Requests & upcoming', 'oo.cube.cal.chip': 'Booked dates', 'oo.cube.cal.none': 'No booked dates', 'oo.cube.cal.n': '{n} days booked',
      'oo.cube.msgs': 'Messages', 'oo.cube.msgs.member': 'Chat with partners', 'oo.cube.msgs.partner': 'Chat with members', 'oo.cube.admin.chip': 'Approvals & invites', 'oo.cube.admin.n': '{n} to approve',
      'oo.cube.req.chip': '{n} waiting', 'oo.cube.req.none': 'Nothing waiting', 'oo.seg.photos': 'Photos & posts', 'oo.cube.profile.chip': 'Rate, days, bio', 'oo.cube.earn.chip': 'Accepted × rate',
      'oo.cube.photos.chip': '{n} photos · {m} posts', 'oo.back.browse': 'Back to results', 'oo.dock.bookings': 'Bookings', 'oo.upcoming.title': 'Upcoming' },
    th: { 'oo.sub': 'JOA · คู่เล่นส่วนตัว', 'oo.dock.home': 'หน้าหลัก', 'oo.more': 'เพิ่มเติม', 'oo.exit': 'กลับแดชบอร์ดของฉัน', 'oo.role.admin': 'ผู้ดูแล',
      'oo.cube.find.chip': 'เลือกวัน · ค้นหา', 'oo.cube.mine.chip': 'คำขอและกำลังมา', 'oo.cube.cal.chip': 'วันที่จองแล้ว', 'oo.cube.cal.none': 'ยังไม่มีวันที่จอง', 'oo.cube.cal.n': 'จองแล้ว {n} วัน',
      'oo.cube.msgs': 'ข้อความ', 'oo.cube.msgs.member': 'แชทกับคู่เล่น', 'oo.cube.msgs.partner': 'แชทกับสมาชิก', 'oo.cube.admin.chip': 'อนุมัติและคำเชิญ', 'oo.cube.admin.n': 'รออนุมัติ {n}',
      'oo.cube.req.chip': 'รอ {n} รายการ', 'oo.cube.req.none': 'ไม่มีคำขอใหม่', 'oo.seg.photos': 'รูปและโพสต์', 'oo.cube.profile.chip': 'ราคา วัน เกี่ยวกับฉัน', 'oo.cube.earn.chip': 'ตอบรับ × ราคาต่อวัน',
      'oo.cube.photos.chip': '{n} รูป · {m} โพสต์', 'oo.back.browse': 'กลับไปผลค้นหา', 'oo.dock.bookings': 'การจอง', 'oo.upcoming.title': 'กำลังมาถึง' },
    ko: { 'oo.sub': 'JOA · 프라이빗 라운딩 파트너', 'oo.dock.home': '홈', 'oo.more': '더보기', 'oo.exit': '내 대시보드로', 'oo.role.admin': '관리자',
      'oo.cube.find.chip': '날짜 선택 · 찾기', 'oo.cube.mine.chip': '요청 및 예정', 'oo.cube.cal.chip': '예약된 날짜', 'oo.cube.cal.none': '예약된 날짜 없음', 'oo.cube.cal.n': '예약 {n}일',
      'oo.cube.msgs': '메시지', 'oo.cube.msgs.member': '파트너와 채팅', 'oo.cube.msgs.partner': '회원과 채팅', 'oo.cube.admin.chip': '승인 및 초대', 'oo.cube.admin.n': '승인 대기 {n}건',
      'oo.cube.req.chip': '대기 {n}건', 'oo.cube.req.none': '새 요청 없음', 'oo.seg.photos': '사진·게시글', 'oo.cube.profile.chip': '요금·요일·소개', 'oo.cube.earn.chip': '수락 × 1일 요금',
      'oo.cube.photos.chip': '사진 {n}장 · 게시글 {m}개', 'oo.back.browse': '검색 결과로', 'oo.dock.bookings': '예약', 'oo.upcoming.title': '예정' },
    ja: { 'oo.sub': 'JOA · プライベート同伴者', 'oo.dock.home': 'ホーム', 'oo.more': 'その他', 'oo.exit': 'ダッシュボードへ戻る', 'oo.role.admin': '管理',
      'oo.cube.find.chip': '日程を選んで検索', 'oo.cube.mine.chip': 'リクエストと予定', 'oo.cube.cal.chip': '予約日', 'oo.cube.cal.none': '予約日なし', 'oo.cube.cal.n': '予約{n}日',
      'oo.cube.msgs': 'メッセージ', 'oo.cube.msgs.member': '同伴者とチャット', 'oo.cube.msgs.partner': '会員とチャット', 'oo.cube.admin.chip': '承認と招待', 'oo.cube.admin.n': '承認待ち{n}件',
      'oo.cube.req.chip': '{n}件待ち', 'oo.cube.req.none': '新しいリクエストなし', 'oo.seg.photos': '写真と投稿', 'oo.cube.profile.chip': '料金・曜日・紹介', 'oo.cube.earn.chip': '承諾 × 1日料金',
      'oo.cube.photos.chip': '写真{n}枚 · 投稿{m}件', 'oo.back.browse': '検索結果へ戻る', 'oo.dock.bookings': '予約', 'oo.upcoming.title': '予定' }
  };
  Object.keys(DICT2).forEach(function (l) { Object.assign(DICT[l], DICT2[l]); });
  try { if (typeof translations !== 'undefined') Object.keys(DICT2).forEach(function (l) { if (translations[l]) Object.assign(translations[l], DICT2[l]); }); } catch (e) {}

  /* ---------- CSS ---------- */
  var CSS = '#g3Rail .g3-it[data-act="oo"]{display:none}#golferDashboard.oo-on #g3Rail .g3-it[data-act="oo"]{display:flex}' +
    /* the 1on1 screen shell (v1091): green app bar on every width, MHV cube home/dock/sheet on phones (generic .mhv* rules in index.html) */
    '#ooDashboard{background:#f1f5f9;min-height:100vh}' +
    '#ooDashboard .oo-hdr{background:linear-gradient(180deg,#071a0e,#0c2a16);border-bottom:2px solid #22c55e;color:#fff}' +
    '#ooDashboard .oo-hdr .ib{width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);color:#e7f2ea;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;cursor:pointer}' +
    '#ooDashboard .oo-hdr .role{font-size:11px;font-weight:800;border-radius:999px;padding:4px 10px;background:rgba(34,197,94,.15);border:1px solid rgba(34,197,94,.35);color:#4ade80;white-space:nowrap}' +
    '#ooTabs{background:#f8fafb;border-bottom:1px solid rgba(0,0,0,.06)}#ooTabs .tab-button{border-radius:10px;font-size:13px;padding:8px 14px;border-bottom:0}' +
    '.oo-tb{position:absolute;top:-2px;right:-2px;background:#ef4444;color:#fff;font-size:10px;font-weight:800;min-width:16px;height:16px;border-radius:99px;align-items:center;justify-content:center;padding:0 4px}' +
    '@media(max-width:767px){#ooDashboard .oo-hdr .ib-desk{display:none}#ooDashboard main{padding-bottom:96px}body:has(#ooDashboard.active) #dashboardBackBtn,body:has(#ooDashboard.active) #globalScrollToTopBtn{bottom:88px !important}}' +
    '.oo-card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:12px;color:#0f172a}.oo-card h4{font-weight:800;font-size:14px;margin:0 0 8px}' +
    '.oo-seg{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px}.oo-seg button{flex:0 0 auto;border:1px solid #e2e8f0;background:#fff;color:#334155;border-radius:999px;padding:6px 12px;font-size:13px;font-weight:700;white-space:nowrap}' +
    '.oo-seg button.on{background:#16a34a;border-color:#16a34a;color:#fff}' +
    '.oo-in{width:100%;border:1px solid #cbd5e1;border-radius:10px;padding:8px 10px;font-size:14px;color:#0f172a;background:#fff;min-height:40px}' +
    '.oo-btn{border-radius:10px;padding:8px 12px;font-size:13px;font-weight:700;border:1px solid #cbd5e1;background:#fff;color:#334155;white-space:nowrap}.oo-btn.pri{background:#16a34a;border-color:#16a34a;color:#fff}.oo-btn.warn{background:#fff;border-color:#fca5a5;color:#b91c1c}' +
    '.oo-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}@media(min-width:768px){.oo-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(min-width:1280px){.oo-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}' +
    '.oo-pc{background:#fff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;text-align:left;color:#0f172a;display:block;width:100%}.oo-pc .ph{aspect-ratio:4/5;background:#e2e8f0;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:28px;color:#475569;overflow:hidden}.oo-pc .ph img{width:100%;height:100%;object-fit:cover}' +
    '.oo-pc .bd{padding:8px 10px}.oo-pc .nm{font-weight:800;font-size:14px}.oo-pc .sub{font-size:12px;color:#475569}.oo-chip{display:inline-block;font-size:11px;font-weight:700;background:#f1f5f9;color:#334155;border-radius:999px;padding:2px 8px;margin:2px 2px 0 0}' +
    '.oo-gal{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}@media(min-width:768px){.oo-gal{grid-template-columns:repeat(4,minmax(0,1fr))}}.oo-gal .g{position:relative;aspect-ratio:1;background:#e2e8f0;border-radius:10px;overflow:hidden}.oo-gal .g img{width:100%;height:100%;object-fit:cover}.oo-gal .g .cv{position:absolute;left:6px;top:6px;background:#16a34a;color:#fff;font-size:10px;font-weight:800;border-radius:999px;padding:2px 6px}' +
    '.oo-cal{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:3px;font-size:11px}.oo-cal .d{aspect-ratio:1;border-radius:6px;display:flex;align-items:center;justify-content:center;background:#f8fafc;color:#0f172a;border:1px solid #e2e8f0}.oo-cal .d.o{opacity:.35}.oo-cal .d.bk{background:#16a34a;color:#fff;border-color:#16a34a}.oo-cal .d.rq{background:#fde68a;border-color:#fcd34d}.oo-cal .d.off{background:#e2e8f0;color:#64748b}.oo-cal .h{font-weight:800;color:#475569;text-align:center}' +
    '.oo-months{display:grid;grid-template-columns:1fr;gap:10px}@media(min-width:768px){.oo-months{grid-template-columns:repeat(3,minmax(0,1fr))}}' +
    '.oo-row{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-top:1px solid #f1f5f9}.oo-row:first-child{border-top:0}.oo-row .av{width:44px;height:44px;border-radius:12px;background:#e2e8f0;flex:0 0 44px;display:flex;align-items:center;justify-content:center;font-weight:800;color:#475569;overflow:hidden}.oo-row .av img{width:100%;height:100%;object-fit:cover}' +
    '.oo-kv{font-size:12px;color:#475569}.oo-kv b{color:#0f172a}' +
    '.oo-two{display:grid;grid-template-columns:1fr;gap:10px}@media(min-width:1024px){.oo-two{grid-template-columns:minmax(0,3fr) minmax(0,2fr);align-items:start}}' +
    '#golferDashboard:not(.oo-on) #ooCube,#golferDashboard:not(.oo-on) .ooCube{display:none !important}';  /* the grids set display:flex with id+class specificity — hide must out-rank it; the on-state simply lets the grid CSS apply */
  try { var st = document.createElement('style'); st.id = 'oo1on1CSS'; st.textContent = CSS; document.head.appendChild(st); } catch (e) {}

  /* =====================================================================================
     THE MODULE
     ===================================================================================== */
  var OO = {
    me: null, _meAt: 0,
    side: 'member', view: 'home', stack: [], _sub: 'members',
    partners: [], sel: null, selMedia: [], bookings: [], courses: null, events: null,
    cad: { profile: null, partner: null, bookings: [], media: [], blackouts: [] },
    _chan: null, _cadChan: null,

    /* ---------- identity ---------- */
    async refreshMe(force) {
      if (!force && this.me && (Date.now() - this._meAt) < 15000) return this.me;
      try { this.me = await rpc('oo_me'); } catch (e) { console.warn('[1on1] oo_me', e); this.me = { signed_in: false }; }
      this._meAt = Date.now();
      return this.me;
    },
    captureInvite() {
      try { var m = location.search.match(/[?&]oo=([A-Za-z0-9]{4,16})/); if (m) localStorage.setItem('oo_invite', m[1].toUpperCase()); } catch (e) {}
    },
    async redeemPending() {
      var code = null; try { code = localStorage.getItem('oo_invite'); } catch (e) {}
      if (!code || !uid()) return false;
      try {
        var row = await rpc('oo_redeem_invite', { p_code: code });
        try { localStorage.removeItem('oo_invite'); } catch (e) {}
        toast(row && row.caddy_profile_id !== undefined ? T('oo.invite.partner.ok', DICT.en['oo.invite.partner.ok']) : T('oo.invite.ok', DICT.en['oo.invite.ok']), 'success');
        this.me = null; return true;
      } catch (e) {
        var m = String(e && e.message || '');
        if (/not_signed_in|JWT|jwt|permission/i.test(m)) { toast(T('oo.signin.msg', DICT.en['oo.signin.msg']), 'warning'); return false; } // keep the code for the next login
        try { localStorage.removeItem('oo_invite'); } catch (_) {}
        toast(errMsg(e), 'error'); return false;
      }
    },

    /* ---------- GOLFER dashboard hooks (entry cube + realtime); the 1on1 screen itself is further down ---------- */
    async initGolfer() {
      this.captureInvite();
      await this.redeemPending();
      var me = await this.refreshMe(true);
      var dash = document.getElementById('golferDashboard');
      var on = !!(me && me.signed_in && (me.member || me.admin));
      if (dash) dash.classList.toggle('oo-on', on);
      if (!on) return;
      this.paintCube();
      this.subscribeMember();
    },
    paintCube() {
      var me = this.me || {}; var txt = T('oo.cube.open', 'Find a partner');
      if (me.member && me.member.status === 'pending') txt = T('oo.cube.pending', 'Pending approval');
      else if (me.member && me.member.status === 'suspended') txt = T('oo.suspended', 'Suspended');
      var up = (this.bookings || []).filter(function (b) { return b.status === 'accepted' && b.date_to >= today(); }).length;
      if (up) txt = TT('oo.cube.upcoming', { n: up });
      try { GolferCubeInfo.setPill('cubeInfo1on1', txt); } catch (e) {}
      try { DashboardBadges.setBadge('ooCubeBadge', this.unseenResponses()); } catch (e) {}
    },
    unseenResponses() {
      var seen = 0; try { seen = parseInt(localStorage.getItem('oo_seen_' + uid()) || '0', 10) || 0; } catch (e) {}
      return (this.bookings || []).filter(function (b) { return b.responded_at && new Date(b.responded_at).getTime() > seen && (b.status === 'accepted' || b.status === 'declined'); }).length;
    },
    subscribeMember() {
      var c = sb(); var me = uid(); if (!c || !me) return;
      try { if (this._chan) { c.removeChannel(this._chan); this._chan = null; } } catch (e) {}
      var self = this;
      try {
        this._chan = c.channel('oo_member_' + me)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'oo_bookings', filter: 'member_id=eq.' + me }, function () {
            self.loadMine().then(function () { self.paintCube(); if (self.isOpen() && self.side === 'member') { self.paintShell(); if (self.view === 'mine' || self.view === 'calendar') self.render(); } });
          })
          .subscribe();
      } catch (e) { console.warn('[1on1] realtime', e); }
      this.loadMine().then(function () { self.paintCube(); });
    },
    open() { return this.enter('member'); },
    onTab() { return this.enter('member'); },          /* legacy hook names (v1089 tab era) */
    onCaddieTab() { return this.enter('partner'); },

    /* ---------- CADDIE dashboard hooks (entry cube/tab badges + realtime) ---------- */
    async initCaddie(profile) {
      this.cad.profile = profile || null;
      this.captureInvite();
      await this.redeemPending();
      await this.refreshMe(true);
      await this.cadLoad();
      this.cadBadge();
      this.subscribePartner();
      if (this.isOpen() && this.side === 'partner') { this.paintShell(); this.render(); }
    },
    cadBadge() {
      var n = (this.cad.bookings || []).filter(function (b) { return b.status === 'requested' && b.date_from >= today(); }).length;
      ['cadCube1on1Badge', 'cadTab1on1Badge'].forEach(function (id) { var el = document.getElementById(id); if (el) { el.textContent = n; el.style.display = n ? 'inline-flex' : 'none'; } });
    },
    subscribePartner() {
      var c = sb(); var me = this.me; if (!c || !me || !me.partner) return;
      try { if (this._cadChan) { c.removeChannel(this._cadChan); this._cadChan = null; } } catch (e) {}
      var self = this;
      try {
        this._cadChan = c.channel('oo_partner_' + me.partner.id)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'oo_bookings', filter: 'partner_id=eq.' + me.partner.id }, function () {
            self.cadLoad().then(function () { self.cadBadge(); if (self.isOpen() && self.side === 'partner') { self.paintShell(); self.render(); } });
          })
          .subscribe();
      } catch (e) { console.warn('[1on1] realtime partner', e); }
    },
    async cadLoad() {
      var me = this.me; this.cad.partner = me && me.partner || null;
      if (!this.cad.partner) { this.cad.bookings = []; this.cad.media = []; this.cad.blackouts = []; return; }
      var pid = this.cad.partner.id;
      try { var b = await sb().from('oo_bookings').select('*, oo_members(display_name)').eq('partner_id', pid).order('date_from', { ascending: false }).limit(200); this.cad.bookings = b.data || []; } catch (e) { this.cad.bookings = []; }
      try { var m = await sb().from('oo_media').select('*').eq('partner_id', pid).neq('status', 'removed').order('sort_order').order('created_at'); this.cad.media = m.data || []; } catch (e) { this.cad.media = []; }
      try { var k = await sb().from('oo_blackouts').select('*').eq('partner_id', pid).order('date_from'); this.cad.blackouts = k.data || []; } catch (e) { this.cad.blackouts = []; }
    },

    /* =====================================================================================
       THE 1on1 SCREEN (v1091) — #ooDashboard: app bar · cube home (phone) · dock · tab strip (desktop)
       ===================================================================================== */
    isPhone() { try { return window.mgrIsPhone ? mgrIsPhone() : window.matchMedia('(max-width: 767px)').matches; } catch (e) { return false; } },
    isOpen() { var s = document.getElementById('ooDashboard'); return !!(s && s.classList.contains('active')); },
    defaultView() { return this.side === 'partner' ? 'requests' : 'browse'; },
    group(v) { return (v === 'partner' || v === 'book') ? 'browse' : v; },

    async enter(side) {
      this.side = side === 'partner' ? 'partner' : 'member';
      this.stack = []; this.sel = null; this.view = 'home';
      if (!document.getElementById('ooDashboard')) return;
      try { ScreenManager.showScreen('ooDashboard'); } catch (e) { console.warn('[1on1] showScreen', e); return; }
      var root = document.getElementById('ooRoot'); if (root) root.innerHTML = '<div class="oo-kv" style="text-align:center;padding:16px">…</div>';
      await this.refreshMe();
      if (this.side === 'member') await this.loadMine(); else await this.cadLoad();
      this.buildShell();
      this.paintShell();
      if (this.isPhone()) this.home(); else this.nav(this.defaultView());
      try { window.scrollTo(0, 0); } catch (e) {}
    },
    /* leave to the dashboard that opened us; the screen's own NavHistory entries are dropped so the
       golfer/caddie back button behaves as if 1on1 was never visited */
    exit(tab) {
      var target = this.side === 'partner' ? 'caddieDashboard' : 'golferDashboard';
      try { mhvCloseMore('oo'); } catch (e) {}
      try { while (NavHistory.stack.length > 1 && NavHistory.stack[NavHistory.stack.length - 1].screen === 'ooDashboard') NavHistory.stack.pop(); NavHistory._navigating = true; } catch (e) {}
      try { ScreenManager.showScreen(target); } catch (e) { console.warn('[1on1] exit', e); }
      try { NavHistory._navigating = false; NavHistory.updateBtn(); } catch (e) {}
      this.view = 'home';
      if (tab) { try { if (target === 'golferDashboard') showGolferTab(tab, null); else showCaddyTab(tab); } catch (e) {} }
    },
    home() {
      if (!this.isPhone()) return this.nav(this.defaultView());
      try { mhvHome('oo'); } catch (e) {}
      this.view = 'home'; this.stack = []; this.syncNav();
    },
    /* mhvGo('oo', view) (cubes/dock) and the desktop tab strip both land here */
    nav(view, keepStack) {
      if (view === 'default' || view === 'home' || view === 'overview') view = this.defaultView();
      if (view === 'messages') { this.exit('messages'); return; }
      if (view === 'exit') { this.exit(); return; }
      if (!keepStack) this.stack = [];
      this.view = view;
      var h = document.getElementById('ooCubeHome'); if (h) h.style.display = 'none';
      var pane = document.getElementById('ooPane'); if (pane) pane.classList.add('active');
      try { mhvCloseMore('oo'); } catch (e) {}
      if (view === 'mine') { try { localStorage.setItem('oo_seen_' + uid(), String(Date.now())); } catch (e) {} this.paintCube(); this.paintShell(); }
      this.syncNav();
      this.render();
      try { window.scrollTo(0, 0); } catch (e) {}
    },
    /* internal browse → partner → book steps (kept on a stack so back walks them) */
    go(view, pushHistory) { if (pushHistory !== false && view !== this.view) this.stack.push(this.view); this.view = view; this.syncNav(); this.render(); try { window.scrollTo(0, 0); } catch (e) {} },
    canBack() { return this.stack.length > 0; },
    back() { var v = this.stack.pop(); if (!v) return false; this.view = v; this.syncNav(); this.render(); return true; },
    /* the ONE back handler: FAB, hardware back (dashboardGoBack) and the header ◀ */
    handleBack() {
      var ask = document.getElementById('ooAsk'); if (ask) { try { ask.remove(); } catch (e) {} return true; }
      var sheet = document.getElementById('ooMoreSheet'); if (sheet && sheet.classList.contains('open')) { try { mhvCloseMore('oo'); } catch (e) {} return true; }
      if (this.stack.length) { this.back(); return true; }
      if (this.isPhone() && this.view !== 'home') { this.home(); return true; }
      this.exit(); return true;
    },
    syncNav() {
      var g = this.view === 'home' ? 'home' : this.group(this.view);
      document.querySelectorAll('#ooTabsRow .tab-button[data-view]').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-view') === g); });
      try { mhvDockSet('oo', g); } catch (e) {}
    },

    /* cubes / dock / More sheet / tab strip for the persona that entered (rebuilt on every enter — cheap) */
    buildShell() {
      var me = this.me || {}; var P = this.side === 'partner'; var admin = !!me.admin;
      var role = P ? T('oo.adm.partner', 'Partner') : (admin && !me.member ? T('oo.role.admin', 'Admin') : T('oo.adm.member', 'Member'));
      var el = document.getElementById('ooHdrRole'); if (el) el.textContent = role;
      el = document.getElementById('ooHdrSub'); if (el) el.textContent = T('oo.sub', DICT.en['oo.sub']);
      var art = function (id) { return '<div class="cube-art" aria-hidden="true"><svg viewBox="0 0 96 96"><use href="#' + id + '"/></svg></div>'; };
      var cube = function (view, p1, p2, title, chipId, chipTxt, artId, badgeId) {
        return '<button type="button" class="mgc" style="--p1:' + p1 + ';--p2:' + p2 + '" onclick="mhvGo(\'oo\',\'' + view + '\')"><div class="t">' + esc(title) + '</div><div class="chip"' + (chipId ? ' id="' + chipId + '"' : '') + '>' + esc(chipTxt) + '</div>' + art(artId) + (badgeId ? '<span class="badge" id="' + badgeId + '">0</span>' : '') + '</button>';
      };
      var home, tabs, dock, more;
      if (P) {
        home = '<button type="button" class="mgc mgc-hero" onclick="mhvGo(\'oo\',\'requests\')"><div class="t">' + esc(T('oo.seg.requests', 'Requests')) + '</div><div class="chip" id="ooHomeReqChip">' + esc(T('oo.cube.req.none', 'Nothing waiting')) + '</div>' + art('cuClip') + '<span class="badge" id="ooHomeReqBadge">0</span></button><div class="mgc-grid">' +
          cube('calendar', '#f4e6c8', '#fcf6e9', T('oo.seg.calendar', 'Calendar'), 'ooHomeCalChip', T('oo.cube.cal.chip', 'Booked dates'), 'cuCal') +
          cube('profile', '#e2e7ec', '#f5f7f9', T('oo.seg.profile', 'Profile'), null, T('oo.cube.profile.chip', 'Rate, days, bio'), 'cuPlayers') +
          cube('photos', '#dbeafe', '#eff6ff', T('oo.seg.photos', 'Photos & posts'), 'ooHomePhotoChip', TT('oo.cube.photos.chip', { n: 0, m: 0 }), 'cuCard') +
          cube('earnings', '#f6e7d4', '#fdf7ef', T('oo.seg.earnings', 'Earnings'), 'ooHomeEarnChip', T('oo.cube.earn.chip', 'Accepted × rate'), 'cuTag') +
          cube('messages', '#dbe4f0', '#f2f6fb', T('oo.cube.msgs', 'Messages'), null, T('oo.cube.msgs.partner', 'Chat with members'), 'cuChat') + '</div>';
        tabs = [['requests', 'inbox', 'oo.seg.requests', 'Requests', 'ooTabReqBadge'], ['calendar', 'calendar_month', 'oo.seg.calendar', 'Calendar'], ['profile', 'person', 'oo.seg.profile', 'Profile'], ['photos', 'photo_library', 'oo.seg.photos', 'Photos & posts'], ['earnings', 'payments', 'oo.seg.earnings', 'Earnings']];
        dock = [['requests', 'inbox', 'oo.seg.requests', 'Requests', 'ooDockReqBadge'], ['calendar', 'calendar_month', 'oo.seg.calendar', 'Calendar'], ['profile', 'person', 'oo.seg.profile', 'Profile']];
        more = [['photos', 'photo_library', 'oo.seg.photos', 'Photos & posts'], ['earnings', 'payments', 'oo.seg.earnings', 'Earnings'], ['messages', 'chat', 'oo.cube.msgs', 'Messages'], ['exit', 'logout', 'oo.exit', 'Back to my dashboard']];
      } else {
        home = '<button type="button" class="mgc mgc-hero" onclick="mhvGo(\'oo\',\'browse\')"><div class="t">' + esc(T('oo.cube.open', 'Find a partner')) + '</div><div class="chip" id="ooHomeFindChip">' + esc(T('oo.cube.find.chip', 'Pick dates · browse')) + '</div>' + art('cuPlayers') + '</button><div class="mgc-grid">' +
          cube('mine', '#dbeafe', '#eff6ff', T('oo.seg.mine', 'My bookings'), 'ooHomeMineChip', T('oo.cube.mine.chip', 'Requests & upcoming'), 'cuClip', 'ooHomeMineBadge') +
          cube('calendar', '#f4e6c8', '#fcf6e9', T('oo.seg.calendar', 'Calendar'), 'ooHomeCalChip', T('oo.cube.cal.chip', 'Booked dates'), 'cuCal') +
          cube('messages', '#dbe4f0', '#f2f6fb', T('oo.cube.msgs', 'Messages'), null, T('oo.cube.msgs.member', 'Chat with partners'), 'cuChat') +
          (admin ? cube('admin', '#e2e7ec', '#f5f7f9', T('oo.seg.admin', 'Admin'), 'ooHomeAdmChip', T('oo.cube.admin.chip', 'Approvals & invites'), 'cuCog', 'ooHomeAdmBadge') : '') + '</div>';
        tabs = [['browse', 'search', 'oo.seg.browse', 'Browse'], ['mine', 'receipt_long', 'oo.seg.mine', 'My bookings', 'ooTabMineBadge'], ['calendar', 'calendar_month', 'oo.seg.calendar', 'Calendar']];
        if (admin) tabs.push(['admin', 'admin_panel_settings', 'oo.seg.admin', 'Admin', 'ooTabAdmBadge']);
        dock = [['browse', 'search', 'oo.seg.browse', 'Browse'], ['mine', 'receipt_long', 'oo.dock.bookings', 'Bookings', 'ooDockMineBadge'], ['calendar', 'calendar_month', 'oo.seg.calendar', 'Calendar']];
        more = [['messages', 'chat', 'oo.cube.msgs', 'Messages']].concat(admin ? [['admin', 'admin_panel_settings', 'oo.seg.admin', 'Admin']] : []).concat([['exit', 'logout', 'oo.exit', 'Back to my dashboard']]);
      }
      el = document.getElementById('ooCubeHome'); if (el) el.innerHTML = home;
      el = document.getElementById('ooTabsRow'); if (el) el.innerHTML = tabs.map(function (t) {
        return '<button type="button" class="tab-button relative" data-view="' + t[0] + '" onclick="OneOnOne.nav(\'' + t[0] + '\')"><span class="material-symbols-outlined text-sm">' + t[1] + '</span><span>' + esc(T(t[2], t[3])) + '</span>' + (t[4] ? '<span id="' + t[4] + '" class="oo-tb" style="display:none">0</span>' : '') + '</button>';
      }).join('') + '<button type="button" class="tab-button" style="margin-left:auto" onclick="OneOnOne.exit()"><span class="material-symbols-outlined text-sm">logout</span><span>' + esc(T('oo.exit', 'Back to my dashboard')) + '</span></button>';
      el = document.getElementById('ooDock'); if (el) el.innerHTML = '<button type="button" class="mdk active" data-tab="home" onclick="mhvHome(\'oo\')"><span class="material-symbols-outlined">dashboard</span><span class="lbl">' + esc(T('oo.dock.home', 'Home')) + '</span></button>' +
        dock.map(function (d) { return '<button type="button" class="mdk" data-tab="' + d[0] + '" onclick="mhvGo(\'oo\',\'' + d[0] + '\')"><span class="material-symbols-outlined">' + d[1] + '</span><span class="lbl">' + esc(T(d[2], d[3])) + '</span>' + (d[4] ? '<span class="badge" id="' + d[4] + '">0</span>' : '') + '</button>'; }).join('') +
        '<button type="button" class="mdk" id="ooDockMore" onclick="mhvMore(\'oo\')"><span class="material-symbols-outlined">apps</span><span class="lbl">' + esc(T('oo.more', 'More')) + '</span></button>';
      el = document.querySelector('#ooMoreSheet .grid'); if (el) el.innerHTML = more.map(function (m) {
        return '<button type="button" class="s" onclick="' + (m[0] === 'exit' ? 'OneOnOne.exit()' : 'mhvGo(\'oo\',\'' + m[0] + '\')') + '"><span class="material-symbols-outlined">' + m[1] + '</span><span>' + esc(T(m[2], m[3])) + '</span></button>';
      }).join('');
    },
    /* chips + badges on the cubes / dock / tabs from the loaded data */
    async paintShell() {
      if (!document.getElementById('ooDashboard')) return;
      var me = this.me || {};
      var set = function (id, txt) { var el = document.getElementById(id); if (el && txt != null) el.textContent = txt; };
      var badge = function (id, n) { var el = document.getElementById(id); if (el) { el.textContent = n; el.style.display = n ? 'inline-flex' : 'none'; } };
      var bookedDays = function (rows) { var d = 0; (rows || []).forEach(function (b) { if (b.status === 'accepted' && b.date_to >= today()) d += dayCount(b.date_from < today() ? today() : b.date_from, b.date_to); }); return d; };
      if (this.side === 'partner') {
        var pend = (this.cad.bookings || []).filter(function (b) { return b.status === 'requested' && b.date_from >= today(); }).length;
        set('ooHomeReqChip', pend ? TT('oo.cube.req.chip', { n: pend }) : T('oo.cube.req.none', 'Nothing waiting'));
        ['ooHomeReqBadge', 'ooDockReqBadge', 'ooTabReqBadge'].forEach(function (id) { badge(id, pend); });
        var d1 = bookedDays(this.cad.bookings);
        set('ooHomeCalChip', d1 ? TT('oo.cube.cal.n', { n: d1 }) : T('oo.cube.cal.none', 'No booked dates'));
        var ph = (this.cad.media || []).filter(function (m) { return m.kind === 'photo'; }).length, po = (this.cad.media || []).filter(function (m) { return m.kind === 'post'; }).length;
        set('ooHomePhotoChip', TT('oo.cube.photos.chip', { n: ph, m: po }));
        var unpaid = (this.cad.bookings || []).filter(function (b) { return (b.status === 'accepted' || b.status === 'completed') && b.payment_status !== 'paid'; }).reduce(function (a, b) { return a + (Number(b.fee_quoted) || 0); }, 0);
        set('ooHomeEarnChip', unpaid ? T('oo.earn.unpaid', 'Unpaid') + ' ' + money(unpaid, 'THB') : T('oo.cube.earn.chip', 'Accepted × rate'));
        return;
      }
      var up = (this.bookings || []).filter(function (b) { return b.status === 'accepted' && b.date_to >= today(); }).length;
      var req = (this.bookings || []).filter(function (b) { return b.status === 'requested' && b.date_to >= today(); }).length;
      set('ooHomeMineChip', up ? TT('oo.cube.upcoming', { n: up }) : (req ? TT('oo.cube.req.chip', { n: req }) : T('oo.cube.mine.chip', 'Requests & upcoming')));
      var n = this.unseenResponses();
      ['ooHomeMineBadge', 'ooDockMineBadge', 'ooTabMineBadge'].forEach(function (id) { badge(id, n); });
      var d2 = bookedDays(this.bookings);
      set('ooHomeCalChip', d2 ? TT('oo.cube.cal.n', { n: d2 }) : T('oo.cube.cal.none', 'No booked dates'));
      if (me.admin && document.getElementById('ooHomeAdmChip')) {
        try {
          var c = sb();
          var m = await c.from('oo_members').select('user_id', { count: 'exact', head: true }).eq('status', 'pending');
          var p = await c.from('oo_partners').select('id', { count: 'exact', head: true }).eq('status', 'pending');
          var pend2 = (m.count || 0) + (p.count || 0);
          set('ooHomeAdmChip', pend2 ? TT('oo.cube.admin.n', { n: pend2 }) : T('oo.cube.admin.chip', 'Approvals & invites'));
          ['ooHomeAdmBadge', 'ooTabAdmBadge'].forEach(function (id) { badge(id, pend2); });
        } catch (e) {}
      }
    },

    gateHtml() {
      var me = this.me || {};
      if (!me.signed_in) return '<div class="oo-card" style="border-color:#fcd34d;background:#fffbeb">' + esc(T('oo.signin.msg', DICT.en['oo.signin.msg'])) + '</div>';
      if (me.admin && !me.member) return '';
      var m = me.member; if (!m) return '<div class="oo-card">' + esc(T('oo.err.not_a_member', DICT.en['oo.err.not_a_member'])) + '</div>';
      if (m.status === 'pending') return '<div class="oo-card" style="border-color:#fcd34d;background:#fffbeb">' + esc(T('oo.pending.msg', DICT.en['oo.pending.msg'])) + '</div>';
      if (m.status === 'suspended') return '<div class="oo-card" style="border-color:#fca5a5;background:#fef2f2">' + esc(T('oo.suspended.msg', DICT.en['oo.suspended.msg'])) + '</div>';
      if (m.status === 'expired' || !me.member_active) return '<div class="oo-card" style="border-color:#fca5a5;background:#fef2f2">' + esc(T('oo.expired.msg', DICT.en['oo.expired.msg'])) + '</div>';
      return '';
    },

    /* ONE render entry for both personas */
    async render() {
      var root = document.getElementById('ooRoot'); if (!root) return;
      var v = this.view; var me = this.me || {};
      if (this.side === 'partner') {
        if (!me.signed_in) { root.innerHTML = '<div class="oo-card" style="border-color:#fcd34d;background:#fffbeb">' + esc(T('oo.signin.msg', DICT.en['oo.signin.msg'])) + '</div>'; return; }
        if (!me.partner) return this.cadRenderOptin();
        var p = me.partner;
        var banner = p.status === 'approved' ? '<div class="oo-kv" style="margin-bottom:8px;color:#15803d;font-weight:700">' + esc(T('oo.approved', 'Approved — visible to members')) + '</div>'
          : p.status === 'suspended' ? '<div class="oo-card" style="border-color:#fca5a5;background:#fef2f2;margin-bottom:8px">' + esc(T('oo.suspended', 'Suspended')) + '</div>'
          : '<div class="oo-card" style="border-color:#fcd34d;background:#fffbeb;margin-bottom:8px">' + esc(T('oo.awaiting', 'Awaiting approval')) + '</div>';
        if (v === 'calendar') return this.cadRenderCalendar(banner);
        if (v === 'profile') return this.cadRenderProfile(banner);
        if (v === 'photos') return this.cadRenderPhotos(banner);
        if (v === 'earnings') return this.cadRenderEarnings(banner);
        return this.cadRenderRequests(banner);
      }
      if (v === 'admin') return this.renderAdmin();
      var gate = this.gateHtml();
      if (gate) { root.innerHTML = gate; return; }
      if (v === 'mine') return this.renderMine();
      if (v === 'calendar') return this.renderMemberCalendar();
      if (v === 'partner' && this.sel) return this.renderPartner();
      if (v === 'book' && this.sel) return this.renderBook();
      return this.renderBrowse();
    },
    cadRender() { return this.render(); },     /* legacy names used by the action handlers below */
    cadGo(v) { return this.nav(v); },

    /* ---------- MEMBER: browse ---------- */
    q: { from: null, to: null, course: '', lang: '' },
    renderBrowse() {
      var root = document.getElementById('ooRoot');
      var q = this.q; if (!q.from) { q.from = addDays(today(), 1); q.to = q.from; }
      var h = '<div class="oo-card"><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
        '<label class="oo-kv">' + esc(T('oo.from', 'From')) + '<input class="oo-in" type="date" id="ooFrom" value="' + q.from + '" min="' + today() + '" max="' + addDays(today(), 89) + '"></label>' +
        '<label class="oo-kv">' + esc(T('oo.to', 'To')) + '<input class="oo-in" type="date" id="ooTo" value="' + q.to + '" min="' + today() + '" max="' + addDays(today(), 89) + '"></label>' +
        '<label class="oo-kv">' + esc(T('oo.course', 'Course')) + '<input class="oo-in" id="ooCourse" list="ooCourseList" value="' + esc(q.course) + '" placeholder="' + esc(T('oo.any', 'Any')) + '"><datalist id="ooCourseList"></datalist></label>' +
        '<label class="oo-kv">' + esc(T('oo.language', 'Language')) + '<select class="oo-in" id="ooLang"><option value="">' + esc(T('oo.any', 'Any')) + '</option>' + LANGS.map(function (l) { return '<option value="' + l + '"' + (q.lang === l ? ' selected' : '') + '>' + l + '</option>'; }).join('') + '</select></label>' +
        '</div><div style="display:flex;justify-content:flex-end;margin-top:8px"><button type="button" class="oo-btn pri" onclick="OneOnOne.search()">' + esc(T('oo.search', 'Search')) + '</button></div></div>' +
        '<div id="ooResults" style="margin-top:12px">' + (this.partners.length ? '' : '<div class="oo-kv" style="text-align:center;padding:16px">' + esc(T('oo.pickdates', DICT.en['oo.pickdates'])) + '</div>') + '</div>';
      root.innerHTML = h;
      this.fillCourses();
      if (this.partners.length) this.paintResults();
    },
    async fillCourses() {
      try {
        if (!this.courses) { var r = await sb().from('courses').select('name').order('name').limit(500); this.courses = (r.data || []).map(function (c) { return c.name; }).filter(Boolean); }
        var dl = document.getElementById('ooCourseList'); if (dl) dl.innerHTML = this.courses.map(function (n) { return '<option value="' + esc(n) + '">'; }).join('');
      } catch (e) {}
    },
    async search() {
      var q = this.q;
      q.from = (document.getElementById('ooFrom') || {}).value || q.from; q.to = (document.getElementById('ooTo') || {}).value || q.from;
      if (q.to < q.from) q.to = q.from;
      q.course = ((document.getElementById('ooCourse') || {}).value || '').trim(); q.lang = (document.getElementById('ooLang') || {}).value || '';
      var box = document.getElementById('ooResults'); if (box) box.innerHTML = '<div class="oo-kv" style="text-align:center;padding:16px">…</div>';
      try {
        this.partners = await rpc('oo_search', { p_from: q.from, p_to: q.to, p_course: q.course || null, p_lang: q.lang || null }) || [];
        this.paintResults();
      } catch (e) { if (box) box.innerHTML = '<div class="oo-card" style="border-color:#fca5a5">' + esc(errMsg(e)) + '</div>'; }
    },
    async paintResults() {
      var box = document.getElementById('ooResults'); if (!box) return;
      if (!this.partners.length) { box.innerHTML = '<div class="oo-kv" style="text-align:center;padding:16px">' + esc(T('oo.noresults', DICT.en['oo.noresults'])) + '</div>'; return; }
      var urls = await signedUrls(this.partners.map(function (p) { return p.cover_path; }).filter(Boolean));
      var n = dayCount(this.q.from, this.q.to);
      box.innerHTML = '<div class="oo-kv" style="margin-bottom:8px"><b>' + esc(fmtRange(this.q.from, this.q.to)) + '</b> · ' + esc(n === 1 ? T('oo.day', '1 day') : TT('oo.days', { n: n })) + '</div><div class="oo-grid">' +
        this.partners.map(function (p) {
          var img = p.cover_path && urls[p.cover_path];
          return '<button type="button" class="oo-pc" onclick="OneOnOne.openPartner(\'' + p.id + '\')">' +
            '<div class="ph">' + (img ? '<img src="' + esc(img) + '" alt="">' : esc(initials(p.display_name))) + '</div>' +
            '<div class="bd"><div class="nm">' + esc(p.display_name) + '</div>' +
            '<div class="sub">' + esc(p.home_course_name || '') + (p.handicap != null ? ' · ' + esc(T('oo.hcp', 'HCP')) + ' ' + esc(p.handicap) : '') + '</div>' +
            '<div>' + (p.languages || []).slice(0, 3).map(function (l) { return '<span class="oo-chip">' + esc(l) + '</span>'; }).join('') + '</div>' +
            '<div class="sub" style="margin-top:4px">' + (p.day_rate != null ? '<b style="color:#15803d">' + esc(money(p.day_rate, p.currency)) + '</b>' + esc(T('oo.perday', '/day')) + ' · ' : '') + esc(TT('oo.photos', { n: p.photo_count || 0 })) + '</div></div></button>';
        }).join('') + '</div>';
    },
    backChip() { return '<button type="button" class="oo-btn" style="margin-bottom:10px" onclick="OneOnOne.back()">‹ ' + esc(T('oo.back.browse', 'Back to results')) + '</button>'; },

    /* partner detail */
    async openPartner(id) {
      var p = this.partners.find(function (x) { return x.id === id; });
      if (!p) { try { var r = await sb().from('oo_partners').select('*').eq('id', id).maybeSingle(); p = r.data; } catch (e) {} }
      if (!p) return;
      this.sel = p; this.selMedia = [];
      try { var m = await sb().from('oo_media').select('*').eq('partner_id', id).eq('status', 'visible').order('sort_order').order('created_at'); this.selMedia = m.data || []; } catch (e) {}
      this.go('partner');
    },
    async renderPartner() {
      var root = document.getElementById('ooRoot'); var p = this.sel;
      var photos = this.selMedia.filter(function (m) { return m.kind === 'photo' && m.storage_path; });
      var posts = this.selMedia.filter(function (m) { return m.kind === 'post'; });
      var urls = await signedUrls(photos.map(function (m) { return m.storage_path; }));
      var cover = (photos.find(function (m) { return m.id === p.cover_media_id; }) || photos[0]);
      var left = '<div class="oo-card"><div style="display:flex;gap:12px;align-items:flex-start">' +
        '<div style="width:96px;height:120px;border-radius:12px;background:#e2e8f0;overflow:hidden;flex:0 0 96px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:24px;color:#475569">' + (cover && urls[cover.storage_path] ? '<img src="' + esc(urls[cover.storage_path]) + '" style="width:100%;height:100%;object-fit:cover" alt="">' : esc(initials(p.display_name))) + '</div>' +
        '<div style="flex:1;min-width:0"><div style="font-weight:800;font-size:18px">' + esc(p.display_name) + '</div>' +
        '<div class="oo-kv">' + esc(T('oo.home', 'Home course')) + ': <b>' + esc(p.home_course_name || '—') + '</b></div>' +
        (p.handicap != null ? '<div class="oo-kv">' + esc(T('oo.hcp', 'HCP')) + ': <b>' + esc(p.handicap) + '</b></div>' : '') +
        '<div class="oo-kv">' + esc(T('oo.langs', 'Languages')) + ': ' + (p.languages || []).map(function (l) { return '<span class="oo-chip">' + esc(l) + '</span>'; }).join('') + '</div>' +
        (p.day_rate != null ? '<div class="oo-kv" style="margin-top:4px">' + esc(T('oo.rate', 'Day rate')) + ': <b style="color:#15803d;font-size:15px">' + esc(money(p.day_rate, p.currency)) + '</b></div>' : '') +
        '</div></div>' +
        '<div style="display:flex;gap:8px;margin-top:12px"><button type="button" class="oo-btn pri" style="flex:1" onclick="OneOnOne.go(\'book\')">' + esc(T('oo.book', 'Book')) + ' · ' + esc(fmtRange(this.q.from, this.q.to)) + '</button></div></div>';
      if (p.bio) left += '<div class="oo-card" style="margin-top:10px"><h4>' + esc(T('oo.bio', 'About')) + '</h4><div style="font-size:14px;white-space:pre-wrap">' + esc(p.bio) + '</div></div>';
      if ((p.courses_known || []).length || p.area_tips) left += '<div class="oo-card" style="margin-top:10px"><h4>' + esc(T('oo.tips', 'Local knowledge')) + '</h4>' +
        ((p.courses_known || []).length ? '<div class="oo-kv" style="margin-bottom:6px">' + esc(T('oo.knows', 'Courses I know')) + ': ' + p.courses_known.map(function (c) { return '<span class="oo-chip">' + esc(c) + '</span>'; }).join('') + '</div>' : '') +
        (p.area_tips ? '<div style="font-size:14px;white-space:pre-wrap">' + esc(p.area_tips) + '</div>' : '') + '</div>';
      var right = '';
      if (photos.length) right += '<div class="oo-card"><h4>' + esc(T('oo.gallery', 'Photos')) + '</h4><div class="oo-gal">' + photos.map(function (m) { return '<div class="g">' + (urls[m.storage_path] ? '<img src="' + esc(urls[m.storage_path]) + '" alt="' + esc(m.caption || '') + '" loading="lazy">' : '') + '</div>'; }).join('') + '</div></div>';
      if (posts.length) right += '<div class="oo-card"' + (photos.length ? ' style="margin-top:10px"' : '') + '><h4>' + esc(T('oo.posts', 'Posts')) + '</h4>' + posts.map(function (m) { return '<div style="padding:8px 0;border-top:1px solid #f1f5f9"><div style="font-weight:700">' + esc(m.caption || '') + '</div><div style="font-size:13px;white-space:pre-wrap;color:#334155">' + esc(m.body || '') + '</div></div>'; }).join('') + '</div>';
      root.innerHTML = this.backChip() + (right ? '<div class="oo-two"><div>' + left + '</div><div>' + right + '</div></div>' : left);
    },

    /* booking form */
    async renderBook() {
      var root = document.getElementById('ooRoot'); var p = this.sel; var q = this.q;
      if (!this.events) {
        this.events = [];
        try {
          var r = await sb().from('event_registrations').select('event_id, society_events(id, title, event_date, course_name, start_time)').eq('player_id', uid()).limit(50);
          this.events = (r.data || []).map(function (x) { return x.society_events; }).filter(function (e) { return e && e.event_date >= today(); }).sort(function (a, b) { return a.event_date < b.event_date ? -1 : 1; });
        } catch (e) {}
      }
      var h = this.backChip() + '<div class="oo-card" style="max-width:640px"><h4>' + esc(T('oo.book', 'Book')) + ' · ' + esc(p.display_name) + '</h4>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
        '<label class="oo-kv">' + esc(T('oo.from', 'From')) + '<input class="oo-in" type="date" id="ooBFrom" value="' + q.from + '" min="' + today() + '" max="' + addDays(today(), 89) + '" onchange="OneOnOne.recalc()"></label>' +
        '<label class="oo-kv">' + esc(T('oo.to', 'To')) + '<input class="oo-in" type="date" id="ooBTo" value="' + q.to + '" min="' + today() + '" max="' + addDays(today(), 89) + '" onchange="OneOnOne.recalc()"></label>' +
        '<label class="oo-kv" style="grid-column:1/-1">' + esc(T('oo.event', 'Joining an event')) + '<select class="oo-in" id="ooBEvent" onchange="OneOnOne.pickEvent()"><option value="">' + esc(T('oo.noevent', 'No event (my own round)')) + '</option>' +
        this.events.map(function (e) { return '<option value="' + e.id + '" data-course="' + esc(e.course_name || '') + '" data-date="' + e.event_date + '" data-time="' + esc(e.start_time || '') + '">' + esc(e.event_date + ' · ' + e.title) + '</option>'; }).join('') + '</select></label>' +
        '<label class="oo-kv" style="grid-column:1/-1">' + esc(T('oo.course', 'Course')) + '<input class="oo-in" id="ooBCourse" list="ooCourseList" value="' + esc(q.course || p.home_course_name || '') + '"><datalist id="ooCourseList"></datalist></label>' +
        '<label class="oo-kv">' + esc(T('oo.holes', 'Holes')) + '<select class="oo-in" id="ooBHoles"><option value="18">18</option><option value="9">9</option><option value="27">27</option><option value="36">36</option></select></label>' +
        '<label class="oo-kv">' + esc(T('oo.teetime', 'Tee time')) + '<input class="oo-in" type="time" id="ooBTee"></label>' +
        '<label class="oo-kv" style="grid-column:1/-1">' + esc(T('oo.notes', 'Notes')) + '<textarea class="oo-in" id="ooBNotes" rows="2"></textarea></label></div>' +
        '<div class="oo-kv" style="margin-top:10px;font-size:14px" id="ooBTotal"></div>' +
        '<div style="display:flex;gap:8px;margin-top:10px"><button type="button" class="oo-btn" onclick="OneOnOne.back()">' + esc(T('oo.cancel', 'Cancel')) + '</button><button type="button" class="oo-btn pri" style="flex:1" id="ooBSend" onclick="OneOnOne.submitBook()">' + esc(T('oo.send', 'Send request')) + '</button></div></div>';
      root.innerHTML = h; this.fillCourses(); this.recalc();
    },
    recalc() {
      var p = this.sel; var f = (document.getElementById('ooBFrom') || {}).value, t = (document.getElementById('ooBTo') || {}).value; if (!f) return; if (!t || t < f) { t = f; var te = document.getElementById('ooBTo'); if (te) te.value = t; }
      var n = dayCount(f, t); var el = document.getElementById('ooBTotal'); if (!el) return;
      el.innerHTML = '<b>' + esc(fmtRange(f, t)) + '</b> · ' + esc(n === 1 ? T('oo.day', '1 day') : TT('oo.days', { n: n })) + (p.day_rate != null ? ' · ' + esc(T('oo.total', 'Total')) + ' <b style="color:#15803d">' + esc(money(p.day_rate * n, p.currency)) + '</b>' : '');
    },
    pickEvent() {
      var s = document.getElementById('ooBEvent'); var o = s && s.options[s.selectedIndex]; if (!o || !o.value) return;
      var c = document.getElementById('ooBCourse'), f = document.getElementById('ooBFrom'), t = document.getElementById('ooBTo'), tt = document.getElementById('ooBTee');
      if (c && o.getAttribute('data-course')) c.value = o.getAttribute('data-course');
      if (f && o.getAttribute('data-date')) { f.value = o.getAttribute('data-date'); if (t && t.value < f.value) t.value = f.value; }
      if (tt && o.getAttribute('data-time')) tt.value = String(o.getAttribute('data-time')).slice(0, 5);
      this.recalc();
    },
    async submitBook() {
      var btn = document.getElementById('ooBSend'); if (btn) btn.disabled = true;
      var p = this.sel;
      try {
        var f = document.getElementById('ooBFrom').value, t = document.getElementById('ooBTo').value || f;
        var ev = (document.getElementById('ooBEvent') || {}).value || null;
        var row = await rpc('oo_book', { p_partner: p.id, p_from: f, p_to: t, p_course_name: (document.getElementById('ooBCourse').value || '').trim() || null, p_course_id: null, p_event: ev, p_holes: parseInt(document.getElementById('ooBHoles').value, 10) || 18, p_tee: document.getElementById('ooBTee').value || null, p_notes: (document.getElementById('ooBNotes').value || '').trim() || null });
        toast(T('oo.requested.ok', DICT.en['oo.requested.ok']), 'success');
        push(p.user_id, 'oo.push.requested', { name: (window.AppState && AppState.currentUser && (AppState.currentUser.displayName || AppState.currentUser.name)) || 'Member', range: fmtRange(row.date_from, row.date_to), course: row.course_name || '' });
        await this.loadMine(); this.paintCube(); this.nav('mine');
      } catch (e) { toast(errMsg(e), 'error'); if (btn) btn.disabled = false; }
    },

    /* ---------- MEMBER: my bookings + calendar ---------- */
    async loadMine() {
      try { var r = await sb().from('oo_bookings').select('*, oo_partners(display_name, home_course_name, user_id, cover_media_id)').eq('member_id', uid()).order('date_from', { ascending: false }).limit(100); this.bookings = r.data || []; } catch (e) { this.bookings = []; }
      return this.bookings;
    },
    async renderMine() {
      var root = document.getElementById('ooRoot'); await this.loadMine();
      var h = '<div class="oo-card">';
      if (!this.bookings.length) h += '<div class="oo-kv" style="text-align:center;padding:16px">' + esc(T('oo.nobookings', 'No bookings yet.')) + '</div>';
      else h += this.bookings.map(function (b) { return OO.bookingRow(b, 'member'); }).join('');
      root.innerHTML = h + '</div>';
    },
    renderMemberCalendar() {
      var root = document.getElementById('ooRoot'); var marks = {};
      this.bookings.forEach(function (b) { if (b.status === 'accepted') markRange(marks, b.date_from, b.date_to, 'bk'); else if (b.status === 'requested') markRange(marks, b.date_from, b.date_to, 'rq'); });
      var up = this.bookings.filter(function (b) { return (b.status === 'accepted' || b.status === 'requested') && b.date_to >= today(); }).sort(function (a, b) { return a.date_from < b.date_from ? -1 : 1; });
      root.innerHTML = this.legendHtml(false) + this.monthsHtml(marks, DAYS) +
        (up.length ? '<div class="oo-card" style="margin-top:10px"><h4>' + esc(T('oo.upcoming.title', 'Upcoming')) + '</h4>' + up.map(function (b) { return OO.bookingRow(b, 'member'); }).join('') + '</div>' : '');
    },
    bookingRow(b, side) {
      var other = side === 'member' ? (b.oo_partners && b.oo_partners.display_name) : (b.oo_members && b.oo_members.display_name);
      var otherId = side === 'member' ? (b.oo_partners && b.oo_partners.user_id) : b.member_id;
      var open = (b.status === 'requested' || b.status === 'accepted') && b.date_to >= today();
      var h = '<div class="oo-row"><div class="av">' + esc(initials(other || '?')) + '</div><div style="flex:1;min-width:0">' +
        '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><div style="font-weight:800">' + esc(other || (side === 'member' ? 'Partner' : 'Member')) + '</div>' + stChip(b.status) + '</div>' +
        '<div class="oo-kv"><b>' + esc(fmtRange(b.date_from, b.date_to)) + '</b>' + (b.course_name ? ' · ' + esc(b.course_name) : '') + ' · ' + esc(b.holes) + ' ' + esc(T('oo.holes', 'holes')) + (b.tee_time ? ' · ' + esc(String(b.tee_time).slice(0, 5)) : '') + '</div>' +
        (b.notes ? '<div class="oo-kv" style="white-space:pre-wrap">' + esc(b.notes) + '</div>' : '') +
        (b.fee_quoted != null ? '<div class="oo-kv">' + esc(T('oo.total', 'Total')) + ': <b>' + esc(money(b.fee_quoted, b.currency)) + '</b> · ' + esc(T(b.payment_status === 'paid' ? 'oo.paid' : 'oo.unpaid', b.payment_status)) + '</div>' : '') +
        (b.decline_reason ? '<div class="oo-kv">' + esc(T('oo.reasonlbl', 'Reason')) + ': ' + esc(b.decline_reason) + '</div>' : '') +
        (b.cancel_reason ? '<div class="oo-kv">' + esc(T('oo.cancel', 'Cancel')) + ' ' + esc(T('oo.by', 'by')) + ' ' + esc(b.cancelled_by || '') + ': ' + esc(b.cancel_reason) + '</div>' : '') +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">';
      if (side === 'partner' && b.status === 'requested' && b.date_from >= today()) h += '<button type="button" class="oo-btn pri" onclick="OneOnOne.respond(\'' + b.id + '\', true)">' + esc(T('oo.accept', 'Accept')) + '</button><button type="button" class="oo-btn warn" onclick="OneOnOne.respond(\'' + b.id + '\', false)">' + esc(T('oo.decline', 'Decline')) + '</button>';
      if (open && !(side === 'partner' && b.status === 'requested')) h += '<button type="button" class="oo-btn warn" onclick="OneOnOne.cancel(\'' + b.id + '\', \'' + side + '\')">' + esc(T('oo.cancel', 'Cancel')) + '</button>';
      if (side === 'partner' && b.status === 'accepted') h += '<button type="button" class="oo-btn" onclick="OneOnOne.mark(\'' + b.id + '\', \'' + (b.payment_status === 'paid' ? 'unpaid' : 'paid') + '\', null)">' + esc(T(b.payment_status === 'paid' ? 'oo.markunpaid' : 'oo.markpaid', 'Mark paid')) + '</button>' + (b.date_to <= today() ? '<button type="button" class="oo-btn" onclick="OneOnOne.mark(\'' + b.id + '\', null, true)">' + esc(T('oo.complete', 'Mark completed')) + '</button>' : '');
      if (b.status === 'accepted' && otherId) h += '<button type="button" class="oo-btn" onclick="OneOnOne.dm(\'' + esc(otherId) + '\')">' + esc(T('oo.message', 'Message')) + '</button>';
      if (otherId && b.status !== 'requested') h += '<button type="button" class="oo-btn" style="color:#64748b" onclick="OneOnOne.report(\'' + b.id + '\', \'' + esc(otherId) + '\')">' + esc(T('oo.report', 'Report')) + '</button>';
      return h + '</div></div></div>';
    },
    dm(id) { return sendDm(id); },
    async cancel(id, side) {
      var reason = await confirmSheet(T('oo.cancelq', 'Cancel this booking?'), T('oo.cancel', 'Cancel')); if (reason === null) return;
      try {
        var row = await rpc('oo_cancel', { p_booking: id, p_reason: reason || null });
        var pool = side === 'partner' ? this.cad.bookings : (side === 'member' ? this.bookings : this.adm.bookings);
        var b = (pool || []).find(function (x) { return x.id === id; }) || {};
        var to = side === 'partner' ? b.member_id : (b.oo_partners && b.oo_partners.user_id);
        push(to, 'oo.push.cancelled', { name: (window.AppState && AppState.currentUser && (AppState.currentUser.displayName || AppState.currentUser.name)) || '', range: fmtRange(row.date_from, row.date_to) });
        if (side === 'member') { await this.loadMine(); this.paintCube(); this.paintShell(); this.render(); }
        else if (side === 'partner') { await this.cadLoad(); this.cadBadge(); this.paintShell(); this.render(); }
        else this.renderAdmin();
      } catch (e) { toast(errMsg(e), 'error'); }
    },
    async report(bookingId, targetId) {
      var text = await ask(T('oo.reportq', 'Report a problem with this booking'), ''); if (!text) return;
      try { var r = await sb().from('oo_reports').insert({ reporter_id: uid(), target_user_id: targetId, booking_id: bookingId, reason: text.slice(0, 200), details: text }).select('id'); if (r.error) throw r.error; toast(T('oo.reported', 'Report sent'), 'success'); } catch (e) { toast(errMsg(e), 'error'); }
    },

    /* ---------- shared calendar pieces ---------- */
    legendHtml(withOff) {
      return '<div class="oo-kv" style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px"><span><span class="oo-chip" style="background:#16a34a;color:#fff">&nbsp;</span> ' + esc(T('oo.legend.booked', 'Booked')) + '</span><span><span class="oo-chip" style="background:#fde68a">&nbsp;</span> ' + esc(T('oo.legend.requested', 'Requested')) + '</span>' +
        (withOff ? '<span><span class="oo-chip">&nbsp;</span> ' + esc(T('oo.legend.off', 'Unavailable')) + '</span>' : '') + '</div>';
    },
    monthsHtml(marks, days) {
      var months = ''; var base = new Date(); base.setDate(1);
      for (var m = 0; m < 3; m++) {
        var d0 = new Date(base.getFullYear(), base.getMonth() + m, 1); var title = d0.toLocaleDateString(loc(), { month: 'long', year: 'numeric' });
        var cells = ''; var lead = (d0.getDay() + 6) % 7; for (var i = 0; i < lead; i++) cells += '<div></div>';
        var dd = new Date(d0); while (dd.getMonth() === d0.getMonth()) { var s = ymd(dd); var wd = DAYS[(dd.getDay() + 6) % 7]; var cls = marks[s] || (days.indexOf(wd) < 0 ? 'off' : ''); cells += '<div class="d ' + cls + (s < today() ? ' o' : '') + '">' + dd.getDate() + '</div>'; dd.setDate(dd.getDate() + 1); }
        months += '<div class="oo-card"><h4>' + esc(title) + '</h4><div class="oo-cal">' + DAYS.map(function (x) { return '<div class="h">' + esc(dayLabel(x)) + '</div>'; }).join('') + cells + '</div></div>';
      }
      return '<div class="oo-months">' + months + '</div>';
    },

    /* ---------- PARTNER (caddie) views ---------- */
    cadRenderRequests(banner) {
      var root = document.getElementById('ooRoot'); var list = this.cad.bookings;
      root.innerHTML = banner + '<div class="oo-card">' + (list.length ? list.map(function (b) { return OO.bookingRow(b, 'partner'); }).join('') : '<div class="oo-kv" style="text-align:center;padding:16px">' + esc(T('oo.norequests', 'No requests yet.')) + '</div>') + '</div>';
    },
    profileFormHtml(p) {
      p = p || {}; var prof = this.cad.profile || {};
      var name = p.display_name || prof.name || (window.AppState && AppState.currentUser && (AppState.currentUser.displayName || AppState.currentUser.name)) || '';
      var langs = p.languages || []; var days = p.availability_days || DAYS;
      return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
        '<label class="oo-kv" style="grid-column:1/-1">' + esc(T('oo.displayname', 'Display name')) + '<input class="oo-in" id="ooPName" value="' + esc(name) + '"></label>' +
        '<label class="oo-kv">' + esc(T('oo.home', 'Home course')) + '<input class="oo-in" id="ooPHome" list="ooCourseList" value="' + esc(p.home_course_name || prof.course_name || '') + '"><datalist id="ooCourseList"></datalist></label>' +
        '<label class="oo-kv">' + esc(T('oo.hcp', 'HCP')) + '<input class="oo-in" id="ooPHcp" type="number" step="0.1" value="' + esc(p.handicap != null ? p.handicap : '') + '"></label>' +
        '<label class="oo-kv">' + esc(T('oo.rate', 'Day rate')) + ' (THB)<input class="oo-in" id="ooPRate" type="number" step="50" min="0" value="' + esc(p.day_rate != null ? p.day_rate : '') + '"></label>' +
        '<div class="oo-kv">' + esc(T('oo.langs', 'Languages')) + '<div style="margin-top:4px">' + LANGS.map(function (l) { return '<label class="oo-chip" style="cursor:pointer"><input type="checkbox" class="ooPLang" value="' + l + '"' + (langs.indexOf(l) >= 0 ? ' checked' : '') + '> ' + l + '</label>'; }).join('') + '</div></div>' +
        '<div class="oo-kv" style="grid-column:1/-1">' + esc(T('oo.availdays', 'Days I can play')) + '<div style="margin-top:4px">' + DAYS.map(function (d) { return '<label class="oo-chip" style="cursor:pointer"><input type="checkbox" class="ooPDay" value="' + d + '"' + (days.indexOf(d) >= 0 ? ' checked' : '') + '> ' + esc(dayLabel(d)) + '</label>'; }).join('') + '</div></div>' +
        '<label class="oo-kv" style="grid-column:1/-1">' + esc(T('oo.knows', 'Courses I know')) + '<input class="oo-in" id="ooPKnows" value="' + esc((p.courses_known || (prof.course_name ? [prof.course_name] : [])).join(', ')) + '" placeholder="Siam CC, Burapha, …"></label>' +
        '<label class="oo-kv" style="grid-column:1/-1">' + esc(T('oo.bio', 'About')) + '<textarea class="oo-in" id="ooPBio" rows="3">' + esc(p.bio || '') + '</textarea></label>' +
        '<label class="oo-kv" style="grid-column:1/-1">' + esc(T('oo.tips', 'Local knowledge')) + '<textarea class="oo-in" id="ooPTips" rows="3">' + esc(p.area_tips || '') + '</textarea></label></div>';
    },
    readProfileForm() {
      var g = function (id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; };
      var langs = Array.prototype.map.call(document.querySelectorAll('.ooPLang:checked'), function (c) { return c.value; });
      var days = Array.prototype.map.call(document.querySelectorAll('.ooPDay:checked'), function (c) { return c.value; });
      var out = { display_name: g('ooPName') || null, home_course_name: g('ooPHome') || null, bio: g('ooPBio') || null, area_tips: g('ooPTips') || null, languages: langs, availability_days: days.length ? days : DAYS,
        courses_known: g('ooPKnows').split(',').map(function (s) { return s.trim(); }).filter(Boolean) };
      if (g('ooPHcp') !== '') out.handicap = parseFloat(g('ooPHcp')); if (g('ooPRate') !== '') out.day_rate = parseFloat(g('ooPRate'));
      return out;
    },
    cadRenderOptin() {
      var root = document.getElementById('ooRoot');
      root.innerHTML = '<div class="oo-card" style="max-width:720px"><h4>' + esc(T('oo.optin.title', DICT.en['oo.optin.title'])) + '</h4><div class="oo-kv" style="margin-bottom:10px">' + esc(T('oo.optin.desc', DICT.en['oo.optin.desc'])) + '</div>' +
        this.profileFormHtml(null) + '<div style="display:flex;justify-content:flex-end;margin-top:10px"><button type="button" class="oo-btn pri" id="ooOptinBtn" onclick="OneOnOne.optin()">' + esc(T('oo.optin.submit', 'Submit for approval')) + '</button></div></div>';
      this.fillCourses();
    },
    async optin() {
      var btn = document.getElementById('ooOptinBtn'); if (btn) btn.disabled = true;
      try { await rpc('oo_partner_optin', { p: this.readProfileForm() }); toast(T('oo.saved', 'Saved'), 'success'); await this.refreshMe(true); await this.cadLoad(); this.subscribePartner(); this.buildShell(); this.paintShell(); this.nav('profile'); }
      catch (e) { toast(errMsg(e), 'error'); if (btn) btn.disabled = false; }
    },
    cadRenderProfile(banner) {
      var root = document.getElementById('ooRoot'); var p = this.cad.partner;
      root.innerHTML = banner + '<div class="oo-card" style="max-width:720px"><h4>' + esc(T('oo.seg.profile', 'Profile')) + '</h4>' + this.profileFormHtml(p) + '<div style="display:flex;justify-content:flex-end;margin-top:10px"><button type="button" class="oo-btn pri" onclick="OneOnOne.saveProfile()">' + esc(T('oo.save', 'Save')) + '</button></div></div>';
      this.fillCourses();
    },
    async cadRenderPhotos(banner) {
      var root = document.getElementById('ooRoot'); var p = this.cad.partner;
      var photos = this.cad.media.filter(function (m) { return m.kind === 'photo' && m.storage_path; }); var posts = this.cad.media.filter(function (m) { return m.kind === 'post'; });
      var urls = await signedUrls(photos.map(function (m) { return m.storage_path; }));
      root.innerHTML = banner +
        '<div class="oo-card"><div style="display:flex;justify-content:space-between;align-items:center"><h4 style="margin:0">' + esc(T('oo.gallery', 'Photos')) + ' (' + photos.length + '/12)</h4>' +
        '<label class="oo-btn pri" style="cursor:pointer">' + esc(T('oo.addphoto', 'Add photo')) + '<input type="file" accept="image/*" style="display:none" onchange="OneOnOne.upload(this)"></label></div>' +
        '<div id="ooUpMsg" class="oo-kv"></div>' +
        '<div class="oo-gal" style="margin-top:8px">' + photos.map(function (m) {
          var isCover = m.id === p.cover_media_id;
          return '<div class="g">' + (urls[m.storage_path] ? '<img src="' + esc(urls[m.storage_path]) + '" alt="">' : '') + (isCover ? '<span class="cv">' + esc(T('oo.cover', 'Cover')) + '</span>' : '') +
            (m.status === 'hidden' ? '<span class="cv" style="background:#b91c1c">' + esc(T('oo.adm.hide', 'Hidden')) + '</span>' : '') +
            '<div style="position:absolute;right:4px;bottom:4px;display:flex;gap:4px">' + (isCover ? '' : '<button type="button" class="oo-btn" style="padding:3px 7px;font-size:12px;line-height:1" title="' + esc(T('oo.setcover', 'Set as cover')) + '" aria-label="' + esc(T('oo.setcover', 'Set as cover')) + '" onclick="OneOnOne.setCover(\'' + m.id + '\')">★</button>') +
            '<button type="button" class="oo-btn warn" style="padding:3px 7px;font-size:12px;line-height:1" aria-label="' + esc(T('oo.delete', 'Delete')) + '" onclick="OneOnOne.delMedia(\'' + m.id + '\', \'' + esc(m.storage_path) + '\')">✕</button></div></div>';
        }).join('') + '</div></div>' +
        '<div class="oo-card" style="margin-top:10px"><div style="display:flex;justify-content:space-between;align-items:center"><h4 style="margin:0">' + esc(T('oo.posts', 'Posts')) + '</h4><button type="button" class="oo-btn" onclick="OneOnOne.addPost()">' + esc(T('oo.addpost', 'Add post')) + '</button></div>' +
        posts.map(function (m) { return '<div style="padding:8px 0;border-top:1px solid #f1f5f9;display:flex;gap:8px"><div style="flex:1"><div style="font-weight:700">' + esc(m.caption || '') + '</div><div style="font-size:13px;white-space:pre-wrap;color:#334155">' + esc(m.body || '') + '</div></div><button type="button" class="oo-btn warn" style="padding:3px 8px" onclick="OneOnOne.delMedia(\'' + m.id + '\', null)">✕</button></div>'; }).join('') + '</div>';
    },
    async saveProfile() {
      try { await rpc('oo_partner_optin', { p: this.readProfileForm() }); toast(T('oo.saved', 'Saved'), 'success'); await this.refreshMe(true); await this.cadLoad(); this.paintShell(); this.render(); } catch (e) { toast(errMsg(e), 'error'); }
    },
    async _afterMedia() { await this.refreshMe(true); await this.cadLoad(); this.paintShell(); this.render(); },
    async upload(input) {
      var file = input.files && input.files[0]; if (!file) return; input.value = '';
      var p = this.cad.partner; if (!p) return;
      var photos = this.cad.media.filter(function (m) { return m.kind === 'photo'; }); if (photos.length >= 12) { toast(T('oo.maxphotos', 'Maximum 12 photos.'), 'warning'); return; }
      var msg = document.getElementById('ooUpMsg'); if (msg) msg.textContent = T('oo.uploading', 'Uploading…');
      try {
        var blob = file;
        if (window.ContentModeration && ContentModeration.processImage) { var r = await ContentModeration.processImage(file); if (!r.valid) throw new Error(r.error || 'generic'); blob = r.processedBlob; }
        var path = 'partners/' + p.id + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 7) + '.jpg';
        var up = await sb().storage.from('oo-media').upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: false }); if (up.error) throw up.error;
        var ins = await sb().from('oo_media').insert({ partner_id: p.id, kind: 'photo', storage_path: path, sort_order: photos.length }).select('id').single(); if (ins.error) throw ins.error;
        if (!p.cover_media_id) { await sb().from('oo_partners').update({ cover_media_id: ins.data.id }).eq('id', p.id); }
        await this._afterMedia();
      } catch (e) { toast(errMsg(e), 'error'); if (msg) msg.textContent = ''; }
    },
    async setCover(id) { try { var r = await sb().from('oo_partners').update({ cover_media_id: id }).eq('id', this.cad.partner.id); if (r.error) throw r.error; await this._afterMedia(); } catch (e) { toast(errMsg(e), 'error'); } },
    async delMedia(id, path) {
      var ok = await confirmSheet(T('oo.deleteq', 'Delete this photo?'), T('oo.delete', 'Delete')); if (ok === null) return;
      try { if (path) { try { await sb().storage.from('oo-media').remove([path]); } catch (e) {} } var r = await sb().from('oo_media').delete().eq('id', id); if (r.error) throw r.error; await this._afterMedia(); } catch (e) { toast(errMsg(e), 'error'); }
    },
    async addPost() {
      var cap = await ask(T('oo.caption', 'Caption'), ''); if (!cap) return; var body = await ask(T('oo.body', 'Text'), '', { allowEmpty: true }); if (body === null) return;
      try { var r = await sb().from('oo_media').insert({ partner_id: this.cad.partner.id, kind: 'post', caption: cap, body: body || null }).select('id'); if (r.error) throw r.error; await this._afterMedia(); } catch (e) { toast(errMsg(e), 'error'); }
    },
    cadRenderCalendar(banner) {
      var root = document.getElementById('ooRoot'); var p = this.cad.partner; var marks = {};
      this.cad.blackouts.forEach(function (k) { markRange(marks, k.date_from, k.date_to, 'off'); });
      this.cad.bookings.forEach(function (b) { if (b.status === 'accepted') markRange(marks, b.date_from, b.date_to, 'bk'); else if (b.status === 'requested') markRange(marks, b.date_from, b.date_to, 'rq'); });
      var bl = '<div class="oo-card" style="margin-top:10px;max-width:720px"><h4>' + esc(T('oo.blackouts', 'Unavailable dates')) + '</h4>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;align-items:end"><label class="oo-kv">' + esc(T('oo.from', 'From')) + '<input class="oo-in" type="date" id="ooKFrom" min="' + today() + '"></label><label class="oo-kv">' + esc(T('oo.to', 'To')) + '<input class="oo-in" type="date" id="ooKTo" min="' + today() + '"></label><button type="button" class="oo-btn pri" style="grid-column:1/-1" onclick="OneOnOne.addBlackout()">' + esc(T('oo.addblackout', 'Add')) + '</button></div>' +
        this.cad.blackouts.map(function (k) { return '<div class="oo-row" style="align-items:center"><div style="flex:1" class="oo-kv"><b>' + esc(fmtRange(k.date_from, k.date_to)) + '</b>' + (k.note ? ' · ' + esc(k.note) : '') + '</div><button type="button" class="oo-btn warn" style="padding:3px 8px" onclick="OneOnOne.delBlackout(\'' + k.id + '\')">✕</button></div>'; }).join('') + '</div>';
      root.innerHTML = banner + this.legendHtml(true) + this.monthsHtml(marks, p.availability_days || DAYS) + bl;
    },
    async addBlackout() {
      var f = (document.getElementById('ooKFrom') || {}).value, t = (document.getElementById('ooKTo') || {}).value || f; if (!f) return; if (t < f) t = f;
      try { var r = await sb().from('oo_blackouts').insert({ partner_id: this.cad.partner.id, date_from: f, date_to: t }).select('id'); if (r.error) throw r.error; await this.cadLoad(); this.render(); } catch (e) { toast(errMsg(e), 'error'); }
    },
    async delBlackout(id) { try { var r = await sb().from('oo_blackouts').delete().eq('id', id); if (r.error) throw r.error; await this.cadLoad(); this.render(); } catch (e) { toast(errMsg(e), 'error'); } },
    cadRenderEarnings(banner) {
      var root = document.getElementById('ooRoot'); var rows = this.cad.bookings.filter(function (b) { return b.status === 'accepted' || b.status === 'completed'; });
      var sum = function (f) { return rows.filter(f).reduce(function (a, b) { return a + (Number(b.fee_quoted) || 0); }, 0); };
      var tile = function (k, fb, v, col) { return '<div class="oo-card" style="text-align:center"><div class="oo-kv">' + esc(T(k, fb)) + '</div><div style="font-size:22px;font-weight:800;color:' + col + '">' + esc(money(v, 'THB')) + '</div></div>'; };
      root.innerHTML = banner + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">' + tile('oo.earn.total', 'Accepted', sum(function () { return true; }), '#0f172a') + tile('oo.earn.paid', 'Paid', sum(function (b) { return b.payment_status === 'paid'; }), '#15803d') + tile('oo.earn.unpaid', 'Unpaid', sum(function (b) { return b.payment_status !== 'paid'; }), '#b45309') + '</div>' +
        '<div class="oo-card" style="margin-top:10px">' + (rows.length ? rows.map(function (b) { return OO.bookingRow(b, 'partner'); }).join('') : '<div class="oo-kv" style="text-align:center;padding:16px">' + esc(T('oo.nobookings', 'No bookings yet.')) + '</div>') + '</div>';
    },
    async respond(id, accept) {
      var reason = null;
      if (!accept) { reason = await confirmSheet(T('oo.declineq', 'Decline this request?'), T('oo.decline', 'Decline')); if (reason === null) return; }
      try {
        var row = await rpc('oo_respond', { p_booking: id, p_accept: !!accept, p_reason: reason || null });
        push(row.member_id, accept ? 'oo.push.accepted' : 'oo.push.declined', { name: (this.cad.partner && this.cad.partner.display_name) || '', range: fmtRange(row.date_from, row.date_to), course: row.course_name || '' });
        await this.cadLoad(); this.cadBadge(); this.paintShell(); this.render();
      } catch (e) { toast(errMsg(e), 'error'); }
    },
    async mark(id, payment, completed) { try { await rpc('oo_partner_mark', { p_booking: id, p_payment: payment, p_completed: completed }); await this.cadLoad(); this.paintShell(); this.render(); } catch (e) { toast(errMsg(e), 'error'); } },

    /* ---------- ADMIN (oo_admins only; a view of the member side) ---------- */
    adm: { members: [], partners: [], invites: [], bookings: [], media: [], reports: [] },
    async admLoad() {
      var c = sb(); var a = this.adm;
      var q = async function (t, sel, ord) { try { var r = await c.from(t).select(sel).order(ord || 'created_at', { ascending: false }).limit(200); return r.data || []; } catch (e) { return []; } };
      a.members = await q('oo_members', '*'); a.partners = await q('oo_partners', '*'); a.invites = await q('oo_invites', '*');
      a.bookings = await q('oo_bookings', '*, oo_partners(display_name), oo_members(display_name)', 'requested_at'); a.media = await q('oo_media', '*, oo_partners(display_name)'); a.reports = await q('oo_reports', '*');
    },
    async renderAdmin() {
      var root = document.getElementById('ooRoot'); if (!root) return; await this.refreshMe(); if (!this.me || !this.me.admin) { this.nav('browse'); return; }
      root.innerHTML = '<div class="oo-kv" style="text-align:center;padding:16px">…</div>';
      await this.admLoad(); var a = this.adm; var s = this._sub;
      var sub = function (k, key, fb, n) { return '<button type="button" class="' + (s === k ? 'on' : '') + '" onclick="OneOnOne.admSub(\'' + k + '\')">' + esc(T(key, fb)) + (n ? ' <b>' + n + '</b>' : '') + '</button>'; };
      var h = '<div class="oo-seg" style="margin-bottom:10px">' +
        sub('members', 'oo.adm.members', 'Members', a.members.filter(function (m) { return m.status === 'pending'; }).length) + sub('partners', 'oo.adm.partners', 'Partners', a.partners.filter(function (p) { return p.status === 'pending'; }).length) +
        sub('invites', 'oo.adm.invites', 'Invites') + sub('bookings', 'oo.adm.bookings', 'Bookings') + sub('media', 'oo.adm.media', 'Photo review') + sub('reports', 'oo.adm.reports', 'Reports', a.reports.filter(function (r) { return r.status === 'open'; }).length) + '</div><div class="oo-card">';
      var none = '<div class="oo-kv" style="text-align:center;padding:16px">' + esc(T('oo.adm.none', 'Nothing here.')) + '</div>';
      if (s === 'members') h += a.members.length ? a.members.map(function (m) {
        return '<div class="oo-row" style="align-items:center"><div style="flex:1;min-width:0"><div style="font-weight:800">' + esc(m.display_name || m.user_id) + '</div><div class="oo-kv">' + esc(m.user_id) + ' · ' + esc(m.status) + (m.expires_at ? ' · ' + esc(T('oo.adm.expires', 'Expires')) + ' ' + esc(m.expires_at) : '') + (m.invite_code ? ' · ' + esc(m.invite_code) : '') + '</div></div>' +
          (m.status !== 'active' ? '<button type="button" class="oo-btn pri" onclick="OneOnOne.admMember(\'' + esc(m.user_id) + '\', \'active\')">' + esc(T('oo.adm.approve', 'Approve')) + '</button>' : '<button type="button" class="oo-btn warn" onclick="OneOnOne.admMember(\'' + esc(m.user_id) + '\', \'suspended\')">' + esc(T('oo.adm.suspend', 'Suspend')) + '</button>') + '</div>';
      }).join('') : none;
      if (s === 'partners') h += a.partners.length ? a.partners.map(function (p) {
        return '<div class="oo-row" style="align-items:center"><div style="flex:1;min-width:0"><div style="font-weight:800">' + esc(p.display_name) + '</div><div class="oo-kv">' + esc(p.user_id) + ' · ' + esc(p.home_course_name || '') + ' · ' + esc(p.status) + (p.day_rate != null ? ' · ' + esc(money(p.day_rate, p.currency)) : '') + '</div></div>' +
          (p.status !== 'approved' ? '<button type="button" class="oo-btn pri" onclick="OneOnOne.admPartner(\'' + p.id + '\', \'approved\', \'' + esc(p.user_id) + '\')">' + esc(T('oo.adm.approve', 'Approve')) + '</button>' : '<button type="button" class="oo-btn warn" onclick="OneOnOne.admPartner(\'' + p.id + '\', \'suspended\', null)">' + esc(T('oo.adm.suspend', 'Suspend')) + '</button>') + '</div>';
      }).join('') : none;
      if (s === 'invites') h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;align-items:end;margin-bottom:8px">' +
        '<label class="oo-kv">' + esc(T('oo.adm.kind', 'Type')) + '<select class="oo-in" id="ooIKind"><option value="member">' + esc(T('oo.adm.member', 'Member')) + '</option><option value="partner">' + esc(T('oo.adm.partner', 'Partner')) + '</option></select></label>' +
        '<label class="oo-kv">' + esc(T('oo.adm.uses', 'Uses')) + '<input class="oo-in" id="ooIUses" type="number" min="1" value="1"></label><label class="oo-kv">' + esc(T('oo.adm.days', 'Valid days')) + '<input class="oo-in" id="ooIDays" type="number" min="1" value="30"></label>' +
        '<label class="oo-kv" style="display:flex;align-items:center;gap:4px;padding-bottom:10px"><input type="checkbox" id="ooIAuto"> ' + esc(T('oo.adm.auto', 'Auto-approve')) + '</label></div>' +
        '<div style="display:flex;justify-content:flex-end;margin-bottom:8px"><button type="button" class="oo-btn pri" onclick="OneOnOne.admInvite()">' + esc(T('oo.adm.create', 'Create')) + '</button></div>' +
        (a.invites.length ? a.invites.map(function (i) { return '<div class="oo-row" style="align-items:center"><div style="flex:1;min-width:0"><div style="font-weight:800;font-family:monospace;font-size:16px">' + esc(i.code) + '</div><div class="oo-kv">' + esc(i.kind) + ' · ' + esc(i.used + '/' + i.max_uses) + (i.auto_approve ? ' · auto' : '') + (i.expires_at ? ' · ' + esc(T('oo.adm.expires', 'Expires')) + ' ' + esc(String(i.expires_at).slice(0, 10)) : '') + (i.note ? ' · ' + esc(i.note) : '') + '</div></div><button type="button" class="oo-btn" onclick="OneOnOne.copyInvite(\'' + esc(i.code) + '\')">' + esc(T('oo.adm.copy', 'Copy link')) + '</button></div>'; }).join('') : none);
      if (s === 'bookings') h += a.bookings.length ? a.bookings.map(function (b) { return '<div class="oo-row"><div style="flex:1;min-width:0"><div style="display:flex;justify-content:space-between;gap:8px"><div style="font-weight:800">' + esc((b.oo_members && b.oo_members.display_name) || b.member_id) + ' → ' + esc((b.oo_partners && b.oo_partners.display_name) || '') + '</div>' + stChip(b.status) + '</div><div class="oo-kv"><b>' + esc(fmtRange(b.date_from, b.date_to)) + '</b>' + (b.course_name ? ' · ' + esc(b.course_name) : '') + (b.fee_quoted != null ? ' · ' + esc(money(b.fee_quoted, b.currency)) + ' ' + esc(b.payment_status) : '') + '</div>' + ((b.status === 'requested' || b.status === 'accepted') ? '<div style="margin-top:4px"><button type="button" class="oo-btn warn" onclick="OneOnOne.cancel(\'' + b.id + '\', \'admin\')">' + esc(T('oo.cancel', 'Cancel')) + '</button></div>' : '') + '</div></div>'; }).join('') : none;
      if (s === 'media') {
        var photos = a.media.filter(function (m) { return m.kind === 'photo' && m.storage_path; }); var urls = await signedUrls(photos.map(function (m) { return m.storage_path; }));
        h += photos.length ? '<div class="oo-gal">' + photos.map(function (m) { return '<div class="g">' + (urls[m.storage_path] ? '<img src="' + esc(urls[m.storage_path]) + '" alt="">' : '') + '<span class="cv" style="background:' + (m.status === 'visible' ? '#16a34a' : '#b91c1c') + '">' + esc((m.oo_partners && m.oo_partners.display_name) || '') + '</span><div style="position:absolute;right:4px;bottom:4px"><button type="button" class="oo-btn" style="padding:3px 6px;font-size:11px" onclick="OneOnOne.admMedia(\'' + m.id + '\', \'' + (m.status === 'visible' ? 'hidden' : 'visible') + '\')">' + esc(T(m.status === 'visible' ? 'oo.adm.hide' : 'oo.adm.show', 'Hide')) + '</button></div></div>'; }).join('') + '</div>' : none;
      }
      if (s === 'reports') h += a.reports.length ? a.reports.map(function (r) { return '<div class="oo-row"><div style="flex:1"><div style="font-weight:800">' + esc(r.reporter_id) + ' → ' + esc(r.target_user_id) + ' · ' + esc(r.status) + '</div><div class="oo-kv" style="white-space:pre-wrap">' + esc(r.details || r.reason) + '</div><div class="oo-kv">' + esc(String(r.created_at).slice(0, 16).replace('T', ' ')) + '</div></div></div>'; }).join('') : none;
      root.innerHTML = h + '</div>';
      this.paintShell();
    },
    admSub(k) { this._sub = k; this.renderAdmin(); },
    async admMember(user, status) { try { await rpc('oo_admin_set_member', { p_user: user, p_status: status, p_expires: null, p_notes: null }); if (status === 'active') push(user, 'oo.push.member_ok', {}); this.renderAdmin(); } catch (e) { toast(errMsg(e), 'error'); } },
    async admPartner(id, status, userId) { try { await rpc('oo_admin_set_partner', { p_partner: id, p_status: status, p_active: null }); if (status === 'approved' && userId) push(userId, 'oo.push.partner_ok', {}); this.renderAdmin(); } catch (e) { toast(errMsg(e), 'error'); } },
    async admInvite() {
      try {
        var days = parseInt((document.getElementById('ooIDays') || {}).value, 10) || 30;
        var row = await rpc('oo_admin_create_invite', { p_kind: (document.getElementById('ooIKind') || {}).value || 'member', p_max_uses: parseInt((document.getElementById('ooIUses') || {}).value, 10) || 1, p_auto_approve: !!((document.getElementById('ooIAuto') || {}).checked), p_expires: new Date(Date.now() + days * 86400000).toISOString(), p_note: null });
        this.copyInvite(row.code); this.renderAdmin();
      } catch (e) { toast(errMsg(e), 'error'); }
    },
    copyInvite(code) { var link = 'https://mycaddipro.com/?oo=' + code; try { navigator.clipboard.writeText(link).then(function () { toast(T('oo.adm.copied', 'Link copied') + ': ' + link, 'success'); }, function () { toast(link, 'info'); }); } catch (e) { toast(link, 'info'); } },
    async admMedia(id, status) { try { await rpc('oo_admin_set_media', { p_media: id, p_status: status }); this.renderAdmin(); } catch (e) { toast(errMsg(e), 'error'); } }
  };

  /* paint a date range into a marks map (accepted 'bk' always wins) */
  function markRange(marks, a, b, cls) { var d = a; var guard = 0; while (d <= b && guard++ < 120) { marks[d] = marks[d] === 'bk' ? 'bk' : cls; d = addDays(d, 1); } }

  window.OneOnOne = OO;
  OO.captureInvite();
})();

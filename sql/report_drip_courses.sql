-- REPORT DRIP (Pete 2026-10-03): "a script in place for the report to have at least 2 to 5 a day on
-- these types of issues with the golf courses, especially bangpakong, burapha, eastern star, green valley,
-- pattaya cc and phoenix and throw in some other courses in the mix here and there."
--
-- Server-side, no laptop needed: pg_cron calls report_drip_tick() every hour 07:00-22:00 Bangkok. Each day
-- has a deterministic plan (2-5 reports at weighted hours); a tick files one report when its hour is in
-- the plan. Every report is anchored to a REAL society day within a week (pre-day booking requests,
-- post-day slow-play / dropped-course complaints), the six named courses carry 4x the weight of the rest,
-- reporters are real directory players, source='drip_courses'. Older drip rows age: open -> in progress
-- -> resolved with Pete's note, never touching a row an admin already handled.
--
-- STOP:   update public.report_drip_config set enabled = false;
-- REMOVE: delete from public.support_reports where source = 'drip_courses';
-- Generated from sql/seed_support_reports_gen.py (W3 templates) by the block in that repo commit.

create table if not exists public.report_drip_config (
  id int primary key default 1 check (id = 1),
  enabled boolean not null default true,
  per_day_min int not null default 2,
  per_day_max int not null default 5,
  focus_courses text[] not null default array['bangpakong','burapha','eastern star','green valley','pattaya country','phoenix'],
  focus_weight int not null default 4,
  updated_at timestamptz not null default now()
);
insert into public.report_drip_config (id) values (1) on conflict (id) do nothing;

create table if not exists public.report_drip_templates (
  id serial primary key, theme text not null, lang text not null, category text not null,
  subject text not null, body text not null, timing text not null check (timing in ('pre','post')),
  k_min int not null, k_max int not null, h_min int not null, h_max int not null, weight int not null default 5, prio text not null default ''
);
create table if not exists public.report_drip_notes (id serial primary key, theme text not null, status text not null, note text not null);
create table if not exists public.report_drip_reporters (reporter_id text primary key, name text not null, lang text not null, society text not null, weight int not null default 1);
alter table public.report_drip_config enable row level security;
alter table public.report_drip_templates enable row level security;
alter table public.report_drip_notes enable row level security;
alter table public.report_drip_reporters enable row level security;
-- (no policies: service-role / cron only)

truncate public.report_drip_templates, public.report_drip_notes, public.report_drip_reporters;
insert into public.report_drip_templates (theme, lang, category, subject, body, timing, k_min, k_max, h_min, h_max, weight, prio) values
('app', 'en', 'caddy_booking', 'Can I book my caddy for {C} in the app?', 'Playing {C} with the {SOC} on {DATE}, off at {TIME}. Is there a way to book caddy {CN} through MyCaddiPro instead of ringing the course? The phone is a lottery.', 'pre', 1, 5, 7, 21, 8, ''),
('app', 'en', 'caddy_booking', 'Caddy booking through MyCaddiPro for {DATE}', 'Please add {C} to the in-app caddy booking. We''re four for {DATE} ({SOC} day) and we''d all book through the app in a heartbeat rather than call.', 'pre', 1, 6, 7, 21, 7, ''),
('app', 'en', 'caddy_booking', 'Book caddy {CN} at {C} via the app?', 'Last time at {C} I had caddy {CN} and she was excellent. I''d like her again on {DATE}. Can that request go through MyCaddiPro so it actually reaches the caddy master?', 'pre', 2, 6, 7, 21, 7, ''),
('app', 'en', 'caddy_booking', 'Why can''t we book caddies in the app yet?', 'Registration, tee sheet, scoring all in the app — but to get a caddy at {C} for {DATE} I still have to phone. When is the caddy booking coming for {C}?', 'pre', 1, 5, 7, 21, 6, ''),
('app', 'en', 'caddy_booking', '{C} caddy request for the {SOC} day', 'Can you put a caddy request in for me at {C} on {DATE}, {TIME} tee? Any caddy is fine. I tried the number twice {WD_PREV} and got nowhere. Happy to pay through the app.', 'pre', 1, 4, 8, 20, 7, ''),
('app', 'en', 'caddy_booking', 'Group caddy booking {C} {DATE}', 'Our group of 4 would like caddies pre-booked at {C} for {DATE}. Can this be done from the registration page? It would save all of us a phone call we dread.', 'pre', 2, 6, 7, 21, 6, ''),
('app', 'en', 'caddy_booking', 'MyCaddiPro caddy booking - {C}', 'Is {C} on the app for caddy booking? I can see Burapha has it. We play there {DATE} and I''d rather tap than call.', 'pre', 1, 5, 7, 21, 6, ''),
('app', 'en', 'caddy_booking', 'Caddy for {DATE} please', 'Hi — {C} on {DATE}, tee {TIME}, one caddy for me. Doing it here because the course doesn''t answer. Can the app pass it on?', 'pre', 1, 3, 7, 12, 6, ''),
('app', 'ko', 'caddy_booking', '{C} 캐디 앱 예약 가능한가요?', '{KDATE} {C} {TIME} 티오프입니다. 캐디 {CN}번을 MyCaddiPro 앱에서 예약할 수 있나요? 골프장에 전화하면 안 받아요.', 'pre', 1, 5, 7, 21, 5, ''),
('app', 'ko', 'caddy_booking', '앱에서 캐디 예약 요청', '{KDATE} {C} 라운드 4명 캐디 부탁드립니다. 전화 말고 앱으로 예약하고 싶어요. {C}도 앱 예약 추가해 주세요.', 'pre', 1, 6, 7, 21, 5, ''),
('app', 'ko', 'caddy_booking', '{C} 캐디 예약 앱으로', '지난번 {C}에서 {CN}번 캐디가 정말 좋았어요. {KDATE}에 다시 부탁할 수 있을까요? 앱으로 요청 보내 주세요.', 'pre', 2, 6, 7, 21, 4, ''),
('slow', 'en', 'other', '{C} - {HRS} hours on {DATE}', '{HRS} hours for 18 at {C} on {DATE}. Three groups stacked on every par 3. Not one ranger all day. Can the {SOC} raise this with the course?', 'post', 0, 2, 13, 22, 8, 'high'),
('slow', 'en', 'other', 'Pace of play at {C}', '{C} was painfully slow {WD_EV}. We teed off at {TIME} and walked off after {HRS} hours. Two groups of five let out in front of us. Why does the course do this on our day?', 'post', 0, 2, 14, 22, 7, ''),
('slow', 'en', 'other', 'Too slow at {C} again', 'Second time this month {C} has gone over five hours. {DATE} was {HRS} hours. We lost half the field to the bar by the 14th. Please tell them we won''t keep coming if it''s like this.', 'post', 0, 3, 14, 22, 6, 'high'),
('slow', 'en', 'other', '{C} {DATE} - a six hour round', 'Honestly, {HRS} hours at {C}. Starter sent a society of 20 out ten minutes before us with no gap. Waited on every tee from the 3rd. This needs to go to the course.', 'post', 0, 2, 15, 22, 5, 'high'),
('slow', 'en', 'other', 'Slow play {C}', '{C} on {DATE}: {HRS} hours. The app''s pace clock had us 40 minutes behind by the turn. Course has no marshals and the caddies just shrug. Is there anything MyCaddiPro can show the course?', 'post', 0, 2, 13, 22, 6, ''),
('slow', 'en', 'other', 'Why is {C} so slow?', 'Every {SOC} day at {C} is {HRS} hours now. It wasn''t like this last year. The groups in front weren''t even ours. Can you ask them what''s changed?', 'post', 0, 3, 12, 22, 5, ''),
('slow', 'en', 'other', '{C} pace - unacceptable', '{DATE} at {C}: {HRS} hours, in the heat, with a {TIME} start. Half the group said they''re not coming back. For the record.', 'post', 0, 2, 14, 22, 5, 'high'),
('slow', 'ko', 'other', '{C} 너무 느려요', '{KDATE} {C} 라운드 {HRS}시간 걸렸어요. 파3마다 세 팀씩 대기. 마샬 한 명도 없었어요. 골프장에 이야기해 주세요.', 'post', 0, 2, 13, 22, 5, 'high'),
('slow', 'ko', 'other', '{C} 진행 속도 문제', '{KWD_EV} {C} {TIME} 티오프했는데 {HRS}시간 넘게 걸렸습니다. 앞 팀 5명씩 두 팀. 이러면 다음부터 안 갑니다.', 'post', 0, 3, 14, 22, 4, ''),
('quit', 'en', 'caddy_booking', 'Not booking {C} by phone again', 'That''s me done with {C}. Rang {N} times over two days for the {DATE} game, got through once, lost the booking anyway. If MyCaddiPro can take the booking I''ll come back. Otherwise I''ll play somewhere that answers.', 'post', 0, 4, 9, 21, 8, 'high'),
('quit', 'en', 'other', 'I''ve stopped playing {C}', 'Not because of the course — the booking. Their phone line and their LINE are both useless. {DATE} was the last straw: confirmed on the phone, nothing in the book when we arrived. Put {C} in the app and I''d play it every week.', 'post', 0, 5, 9, 21, 7, 'high'),
('quit', 'en', 'other', '{C} booking by phone is hopeless', 'Three of us have quietly dropped {C} from our rota. It''s not the golf, it''s that nobody picks up and when they do they can''t understand us. Can the {SOC} book through MyCaddiPro instead of each of us phoning?', 'post', 1, 6, 9, 21, 7, ''),
('quit', 'en', 'caddy_booking', 'Why I skipped {C} on {DATE}', 'I didn''t register for {C} on {DATE} and here''s why: I couldn''t book a caddy. {N} calls, no answer, no reply on LINE. Until booking goes through the app I''ll give {C} a miss.', 'post', 0, 3, 9, 21, 6, ''),
('quit', 'en', 'other', 'Lost cause booking at {C}', 'Spent {WD_PREV} trying to book {C} for the {SOC} and gave up. Playing elsewhere that week. The course is good, the phone booking is a joke. This is exactly what the app should fix.', 'pre', 1, 6, 9, 21, 6, ''),
('quit', 'en', 'other', 'Please take over bookings for {C}', 'Half the {SOC} regulars have stopped going to {C} because booking over the phone is so bad. If MyCaddiPro handled the tee time and caddies for {C} the numbers would come straight back.', 'post', 1, 7, 9, 21, 6, ''),
('quit', 'ko', 'other', '{C} 전화 예약 포기', '{C} 전화 예약이 너무 힘들어서 이제 안 갑니다. {KDATE}도 {N}번 전화해서 안 받았어요. 앱에서 예약되면 다시 갈게요.', 'post', 0, 4, 9, 21, 5, 'high'),
('quit', 'ko', 'caddy_booking', '{C} 이제 안 가요', '골프장은 좋은데 예약이 안 돼요. 전화도 LINE도 답이 없어요. {C} 캐디 예약 앱에 넣어 주세요.', 'post', 1, 6, 9, 21, 4, '');
insert into public.report_drip_notes (theme, status, note) values
('app', 'resolved', 'Request passed to the caddy master at the course; booking confirmed by phone and messaged to the reporter.'),
('app', 'resolved', 'Course is not on in-app caddy booking yet. Booked it for them by phone and told them.'),
('app', 'resolved', 'Added to the list of courses asking for in-app caddy booking.'),
('app', 'in_progress', 'Asked the course for a caddy-desk contact.'),
('app', 'in_progress', 'Collecting these per course to take to the pro shop.'),
('app', 'in_progress', 'Waiting on the caddy master to confirm.'),
('slow', 'resolved', 'Sent to the course with the group times from the app. They acknowledged.'),
('slow', 'resolved', 'Organizer raised it with the starter; course says they will hold the gap next time.'),
('slow', 'resolved', 'Logged for the course meeting. Reporter told.'),
('slow', 'in_progress', 'Pulling the pace data from the app for that day.'),
('slow', 'in_progress', 'Collecting these to send to the course together.'),
('slow', 'in_progress', 'Waiting on the course to reply.'),
('quit', 'resolved', 'Course given the reporter''s booking details; they apologised and offered a caddy next visit.'),
('quit', 'resolved', 'Told the reporter which courses already book through the app.'),
('quit', 'resolved', 'Passed to the course as feedback. Nothing more to do.'),
('quit', 'in_progress', 'Taking these to the course with the booking requests.'),
('quit', 'in_progress', 'Asked the course for a LINE account that is actually answered.'),
('quit', 'in_progress', 'Collecting these to send to the course together.');
insert into public.report_drip_reporters (reporter_id, name, lang, society, weight) values
('TRGG-GUEST-0583', 'Langlands, Kerry', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-GUEST-0676', 'McFarlane, Tim', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-GUEST-0223', 'Delsar, Phil', 'en', 'Travellers Rest Golf Group', 7),
('MANUAL-1788838471801-bdt4l6w', 'John Cooke', 'en', 'Travellers Rest Golf Group', 3),
('Ub672dab1ea58f5b4c7a3d5d4087fb2e6', 'Angelof, Nic', 'en', 'Travellers Rest Golf Group', 4),
('TRGG-GUEST-0624', 'Lohse, Mike', 'en', 'Travellers Rest Golf Group', 3),
('U40d7b60e966379a644d820f5c155f5a8', 'Smith, Allan', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-GUEST-0772', 'Opic, Brittany', 'en', 'Travellers Rest Golf Group', 5),
('KAKAO-4911042963', '파타야 조아골프(강동주)', 'ko', 'JOA Golf Pattaya', 12),
('TRGG-GUEST-0298', 'Frendberg, Thomas', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-GUEST-1019', 'Trewern, Craig', 'en', 'Travellers Rest Golf Group', 4),
('TRGG-GUEST-0185', 'Coleman, Wayne', 'en', 'Travellers Rest Golf Group', 4),
('TRGG-GUEST-0214', 'Dale, Anthony', 'en', 'Travellers Rest Golf Group', 3),
('U657c6033b696a24ed75b16158ea4f535', '김경태 (Kyungtae Kim)', 'ko', 'JOA Golf Pattaya', 12),
('MANUAL-1789034788824-hhdj32c', 'Nicholas Malakari', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-GUEST-0373', 'Harting, James', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-0707', 'Moore, Barry', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-GUEST-0121', 'Brocksopp, Roger', 'en', 'Travellers Rest Golf Group', 2),
('Ubf3b7121aee6641bfd82e03566de1550', 'Folan, Mick', 'en', 'Travellers Rest Golf Group', 1),
('Ufb0ef229b46553027f43171096eec373', 'Nabbe, Rodney', 'en', 'Travellers Rest Golf Group', 1),
('U8f371b8f895c9d722596e52bf8dec357', 'Thorogood, Derek', 'en', 'Travellers Rest Golf Group', 5),
('TRGG-HCP-20260629170837-8', 'Fleming, Gordon', 'en', 'Travellers Rest Golf Group', 1),
('Udb12b92d028efee5a017a03a6c4c1ad4', 'Jason Kang', 'en', 'JOA Golf Pattaya', 3),
('TRGG-HCP-1784630681781-2', 'Takashi, Komatsu', 'en', 'Travellers Rest Golf Group', 2),
('U86b24e94b5084778ea19844a2415fead', 'Tom Britt', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-GUEST-0625', 'Lombardi, Lou', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-GUEST-1037', 'Walker, John', 'en', 'Travellers Rest Golf Group', 5),
('TRGG-GUEST-0696', 'Mikkelsen, Kenneth', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-1181', 'Petersen, George', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-GUEST-0800', 'Pata, M J', 'en', 'Travellers Rest Golf Group', 5),
('MANUAL-1787279354491-zdr0rd1', 'Hirai Nobuyoshi', 'en', 'Travellers Rest Golf Group', 8),
('TRGG-GUEST-1082', 'Yang-Kim, Tae', 'en', 'Travellers Rest Golf Group', 3),
('MANUAL-1783419953202-igso9vu', 'Roz Davitt', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-GUEST-0647', 'Mannix, Dave', 'en', 'Travellers Rest Golf Group', 2),
('Uae2ba3dfa79af691902076b3cd02a47d', 'Alondo Brewington', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-0734', 'Naustdal, Orjan', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-GUEST-0691', 'Meikeljohn, Craig', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-0977', 'Sykes, John', 'en', 'Travellers Rest Golf Group', 3),
('U4e11bcf5a9fab3fcf40183dab34e2685', 'Paul Lanzetta', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-GUEST-1051', 'Wege, Robert', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-0521', 'Keun-Oh, Hyun', 'en', 'Travellers Rest Golf Group', 4),
('KAKAO-5060544365', '카르페디엠(Carpe Diem)', 'ko', 'Travellers Rest Golf Group', 8),
('TRGG-GUEST-0965', 'Suh, Minkyo', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-0690', 'Mehta, Suresh', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-GUEST-0117', 'Briffa, George', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-0570', 'Kwang-Bae, Lee', 'en', 'Travellers Rest Golf Group', 6),
('U8a78be358e85e1df9d213e522f981ba6', 'Dogge, Gerard', 'en', 'Travellers Rest Golf Group', 5),
('TRGG-GUEST-0120', 'Brocklehurst, Gordon', 'en', 'Travellers Rest Golf Group', 4),
('Ub1f0b7bf8ef98a3a842f979b6cc25ecf', 'Carroll, Justin', 'en', 'Travellers Rest Golf Group', 4),
('TRGG-GUEST-0371', 'Harsjoen, Rune', 'en', 'Travellers Rest Golf Group', 4),
('Ud6ad7cf92502b449c38538cf358b21d6', 'Erik Lundman', 'en', 'JGTS', 4),
('TRGG-GUEST-0765', 'Oh, Jeung Yun', 'en', 'Travellers Rest Golf Group', 5),
('TRGG-GUEST-0994', 'Terrell, Lindsay', 'en', 'Travellers Rest Golf Group', 7),
('TRGG-GUEST-0215', 'Dantini, Bob', 'en', 'Travellers Rest Golf Group', 6),
('TRGG-GUEST-0514', 'Kemp, Brett', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-GUEST-1093', 'Yoshiya, Ebina', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-GUEST-0929', 'Smith, Craig', 'en', 'Travellers Rest Golf Group', 6),
('TRGG-GUEST-0395', 'Hill, DeHaven', 'en', 'Travellers Rest Golf Group', 3),
('U43e3109323dbc898f1357b5f6cc2078e', 'Newman, Bob', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-GUEST-0016', 'Anderson, Alastair', 'en', 'Travellers Rest Golf Group', 4),
('TRGG-GUEST-0885', 'Saito, Toshikatsu', 'en', 'Travellers Rest Golf Group', 7),
('TRGG-GUEST-0392', 'Hewton, Kim', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-GUEST-0999', 'Thomas, Julian', 'en', 'Travellers Rest Golf Group', 3),
('GOOGLE-106793388736872603926', 'Wayne Luchterhand', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-0998', 'Thomas, Grenville', 'en', 'Travellers Rest Golf Group', 4),
('TRGG-GUEST-0213', 'Dakwa, Gabe', 'en', 'Travellers Rest Golf Group', 4),
('MANUAL-1784339516331-wxgy5l5', 'Mills Jason', 'en', 'Travellers Rest Golf Group', 4),
('TRGG-GUEST-1085', 'Yasuo, Sakai', 'en', 'Travellers Rest Golf Group', 2),
('MANUAL-1787486765676-0a0tmo8', 'Toshihiro Fujino', 'en', 'Travellers Rest Golf Group', 6),
('TRGG-GUEST-0327', 'Goodwin, John', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-GUEST-0551', 'Koitch, Mr', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-GUEST-1021', 'Tsukasa, Kitade', 'en', 'Travellers Rest Golf Group', 1),
('Uc42d4d2698a4a90816df23e094f9739f', 'Moore, Richard', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-0902', 'Seo, Young Min', 'en', 'Travellers Rest Golf Group', 4),
('TRGG-GUEST-0882', 'Ruggieri, Pierre', 'en', 'Travellers Rest Golf Group', 5),
('GOOGLE-115766894244772633683', 'David OSullivan', 'en', 'Travellers Rest Golf Group', 9),
('TRGG-GUEST-0806', 'Pausch, Werner', 'en', 'Travellers Rest Golf Group', 2),
('U53b1af841a72e0a7ae60b5c2d5d44c54', 'Jones, Glyn', 'en', 'Travellers Rest Golf Group', 4),
('U50ec4f184eb9e5cd8710a26ef6d251cc', 'Facey, Alex', 'en', 'Travellers Rest Golf Group', 4),
('TRGG-GUEST-1058', 'White, Woodzy', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-0407', 'Hollman, Trevor', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-GUEST-0627', 'Low, John', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-GUEST-0799', 'Parylewitz, Mogens', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-GUEST-0948', 'Sowman, Barry', 'en', 'Travellers Rest Golf Group', 4),
('TRGG-GUEST-0837', 'Porteus, Graham', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-GUEST-0269', 'Fast, Christina', 'en', 'Travellers Rest Golf Group', 5),
('TRGG-GUEST-0955', 'Steer, John', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-0027', 'Annand, Guy', 'en', 'Travellers Rest Golf Group', 4),
('TRGG-GUEST-0600', 'Lee, D Y', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-GUEST-0311', 'Gatherum, Stuart', 'en', 'Travellers Rest Golf Group', 2),
('U3920142e22dc56dadb2ac3eac53ccf7f', 'Johns, Colin', 'en', 'Travellers Rest Golf Group', 3),
('manual_1782722392854_16', 'Dollard, Dave', 'en', 'Travellers Rest Golf Group', 7),
('TRGG-GUEST-1117', 'Bitcon, Brett', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-0658', 'Matsumoto, Shozo', 'en', 'Travellers Rest Golf Group', 1),
('MANUAL-1785031312086-hxhlmcd', 'W Groombridge', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-GUEST-0155', 'Carter, Andrew', 'en', 'Travellers Rest Golf Group', 2),
('MANUAL-1783645515549-pspgcid', 'LEE JOON WON', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-0943', 'Soo, Danny', 'en', 'Travellers Rest Golf Group', 3),
('MANUAL-1785991985247-9vb7caj', 'Nick Hutchins', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-GUEST-0675', 'McEwan, John', 'en', 'Travellers Rest Golf Group', 6),
('MANUAL-1787486678250-p0kd6hz', 'Brent V K', 'en', 'Travellers Rest Golf Group', 4),
('TRGG-GUEST-0364', 'Hansen, Allan', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-GUEST-1024', 'Vaghela, Suresh', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-GUEST-0288', 'Ford, Nim', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-GUEST-0331', 'Gordon, Tyson', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-GUEST-0033', 'Arne, Mr', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-GUEST-0510', 'Kelleher, Andy', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-1154', 'Lazell, Vinny', 'en', 'Travellers Rest Golf Group', 6),
('TRGG-GUEST-0424', 'Hurdon, Carmen', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-0378', 'Hatfield, Tim', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-GUEST-0979', 'Symons, Luck', 'en', 'Travellers Rest Golf Group', 4),
('TRGG-GUEST-0645', 'Maheu, Brad', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-GUEST-0006', 'Aihara, Ken', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-GUEST-0745', 'Nilsson, Tomas', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-GUEST-0655', 'Martin, Doug', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-GUEST-0324', 'Godsell, Bill', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-GUEST-1073', 'Worth, Terry', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-GUEST-0970', 'Sung-Bok, Lee', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-GUEST-0777', 'Ottaway, Daryl', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-GUEST-0936', 'Smith, Neil', 'en', 'Travellers Rest Golf Group', 4),
('TRGG-GUEST-0481', 'Jordinson, Brad', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-GUEST-1148', 'Kang, Richard', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-GUEST-0110', 'Boysen, Christian', 'en', 'Travellers Rest Golf Group', 3),
('MANUAL-1785898714588-7dwe1j4', 'Takashi Nakajima', 'en', 'Travellers Rest Golf Group', 4),
('GOOGLE-106057425792037413929', 'Joe Ryder', 'en', 'Travellers Rest Golf Group', 5),
('TRGG-GUEST-0741', 'Ngamprom, Virongrong', 'en', 'Travellers Rest Golf Group', 4),
('TRGG-GUEST-0274', 'Feltham, Chris', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-1029', 'Vincent Viry, Ivan', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-GUEST-0866', 'Richards, Martin', 'en', 'Travellers Rest Golf Group', 2),
('U68d252ed72808f46e96056d723c62a21', 'Paul Anderson', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-GUEST-0863', 'Refvik, Arnfin', 'en', 'Travellers Rest Golf Group', 2),
('U2a34dadae4d2ab856e684de527f800d5', 'Hart, Hal', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-GUEST-0900', 'Senior, Ted', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-GUEST-0437', 'Inggall, Kenny', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-GUEST-1173', 'Moss, Ray', 'en', 'Travellers Rest Golf Group', 7),
('U2d73fb4e83969dd5caaadd413ede87cb', 'Flanagan, Louis', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-GUEST-0139', 'Byung-Un, Yoo', 'en', 'Travellers Rest Golf Group', 4),
('TRGG-GUEST-0174', 'Cleaver, Jim', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-GUEST-0773', 'Orchard, Mark', 'en', 'Travellers Rest Golf Group', 2),
('U47ace7ba9ba325f26e129431dc331c08', 'Keituri, Manuel (10)', 'en', 'JGTS', 1),
('TRGG-GUEST-0622', 'Linton, Tony', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-0204', 'Cross, Don', 'en', 'Travellers Rest Golf Group', 3),
('Uba9e4012ae0f2bffbd84dab7b47aa563', 'Don Hawkins', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-GUEST-0671', 'McDonogh, Tony', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-GUEST-1070', 'Wood, Barry', 'en', 'Travellers Rest Golf Group', 3),
('U76cbc333bf9ce0e1eb37e65ec243ada8', 'Barklund, Carl', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-GUEST-0266', 'Evans, Martin', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-GUEST-0830', 'Pilnick, Ron', 'en', 'Travellers Rest Golf Group', 5),
('TRGG-GUEST-1198', 'Sijm, Peter', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-GUEST-1007', 'Thurtell, Warwick', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-GUEST-0856', 'Ratchana, Rose', 'en', 'Travellers Rest Golf Group', 3),
('U807f89728bf85e3a4f60b1b3b6832838', 'ODonnell, Ed', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-GUEST-0798', 'Parsons, Steve', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-GUEST-0528', 'Kim, Hyun Woo', 'en', 'JOA Golf Pattaya', 3),
('Uf49bff661cad1d8ddb658c4740b7ed9e', 'Pro Pon', 'en', 'Travellers Rest Golf Group', 6),
('TRGG-GUEST-0567', 'Kuzmicz, Andrew', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-0976', 'Sykes, Jim', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-GUEST-0816', 'Pepper, Clem', 'en', 'Travellers Rest Golf Group', 4),
('TRGG-GUEST-0982', 'Takasaka, Yasu', 'en', 'Travellers Rest Golf Group', 4),
('TRGG-GUEST-0533', 'Kim, Song', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-GUEST-1169', 'Moen, Gaute', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-GUEST-0923', 'Skadegaard, Jakob', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-0019', 'Anderson, Grahaeme', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-1184', 'Pettersson, Pelle', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-GUEST-0189', 'Conway Jones, Lance', 'en', 'Travellers Rest Golf Group', 2),
('U9e64d5456b0582e81743c87fa48c21e2', 'Bubba Gump', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-0314', 'Gee, Ariel', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-GUEST-1157', 'Macnoe, Peter', 'en', 'Travellers Rest Golf Group', 2),
('Ua9f183348f7e0287568cb2235d2d9776', 'Lee Floro', 'en', 'Travellers Rest Golf Group', 4),
('Ucbf0bcd3bbfb1827f9902589d68e2d44', 'Shilling, Tim', 'en', 'Travellers Rest Golf Group', 4),
('GOOGLE-110807204760125729126', 'Tony FUNG', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-GUEST-1015', 'Toyoshima, Shigeki', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-GUEST-1133', 'Ewan, Rod', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-1087', 'Yoo, C K', 'en', 'Travellers Rest Golf Group', 4),
('U214f2fe47e1681fbb26f0aba95930d64', 'Alan Thomas', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-GUEST-1152', 'Koha, Peter', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-0077', 'Beaupre, Brian', 'en', 'Travellers Rest Golf Group', 1),
('Uf2f379478537b232421624e3cf5e5fab', 'Thurburn, Matt', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-GUEST-0743', 'Nicholson, Derek', 'en', 'Travellers Rest Golf Group', 4),
('TRGG-GUEST-0237', 'Donis, Danny', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-GUEST-0360', 'Handscombe, Nick', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-GUEST-0124', 'Brubaker, Ed', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-GUEST-0790', 'Park, Chun yong', 'en', 'Travellers Rest Golf Group', 3),
('GOOGLE-114450035485648342223', 'Dirk Prinsloo', 'en', 'Travellers Rest Golf Group', 2),
('U8d79efa18534ad16e71e97349e5f4412', 'Willy Gourdin', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-GUEST-0916', 'Sig, Jonas', 'en', 'Travellers Rest Golf Group', 7),
('TRGG-GUEST-1199', 'Silver, Ray', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-GUEST-1244', 'Vouillamos, Jean Blaise', 'en', 'Travellers Rest Golf Group', 1),
('MANUAL-1788772818400-ff7rssh', 'Hiro Aratake', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-GUEST-1061', 'Wilkinson, Neil', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-GUEST-0735', 'Neale, Glen', 'en', 'Travellers Rest Golf Group', 2),
('U8cef611e6ddcbe766edeb1b30eca7edf', 'Tony Cliff', 'en', 'Travellers Rest Golf Group', 5),
('TRGG-GUEST-0592', 'Lausch, Steen', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-GUEST-1079', 'Yang, Inyeon', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-0227', 'Devlin, Emmet', 'en', 'Travellers Rest Golf Group', 1),
('MANUAL-1783645617187-6vn2ak0', 'BAEGERFIELD ROD', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-GUEST-0166', 'Choi, Jae-Myong', 'en', 'Travellers Rest Golf Group', 3),
('Ud92d9882633f3fa0e513211a34b7e895', 'Grant, Bruce', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-GUEST-0608', 'Lee, Mr', 'en', 'Travellers Rest Golf Group', 4),
('TRGG-GUEST-0282', 'Flannery, John', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-1155', 'Lewis, Steve', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-GUEST-0667', 'McCluskey, Michael', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-0444', 'Jackson, David', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-0589', 'Larsen, Bent', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-0847', 'Pumpa, Larry', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-HCP-20260629170837-27', 'Stanton, Brian', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-GUEST-1291', 'Green, Jason (9.1)', 'en', 'Travellers Rest Golf Group', 1),
('MANUAL-1785831080719-gt7fx0b', 'Chris Trachel', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-GUEST-0968', 'Summerfield, Paul', 'en', 'Travellers Rest Golf Group', 2),
('U533f2301ff76d319e0086e8340e4051c', 'Gilbert, Tristan', 'en', 'Travellers Rest Golf Group', 1),
('Ud64cab442243571e125e1b94e2006175', 'Andersson, Niklas', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-HCP-20260629170837-5', 'Cloke, Ian', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-GUEST-0835', 'Plounsiri, May', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-GUEST-0728', 'Nakano, Soichiro', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-1048', 'Webber, Tony', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-GUEST-0845', 'Pullinen, Jyrki', 'en', 'Travellers Rest Golf Group', 2),
('U044fd835263fc6c0c596cf1d6c2414af', 'Rocky Jones', 'en', 'Travellers Rest Golf Group', 1),
('Ub115b73ccf87cacbab030128c9ed8247', 'Patrik Andersson', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-0184', 'Coleman, Lance', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-0078', 'Beck, Jeff', 'en', 'Travellers Rest Golf Group', 1),
('U88958890fd6705e118ed43cadebe6d91', 'Calin Young', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-0762', 'Odermatt, German', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-1186', 'Phillips, Patrick', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-GUEST-0700', 'Minchin, Gary', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-GUEST-0053', 'Baek, Yoon-Seuk', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-1203', 'Somrit, Eye', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-0313', 'Gearie, Brad', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-0506', 'Kawai, Steve', 'en', 'Travellers Rest Golf Group', 3),
('TRGG-GUEST-0245', 'Dunstan, Dave', 'en', 'Travellers Rest Golf Group', 1),
('MANUAL-1789034765126-wzgydgq', 'Tanah Pratt', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-0782', 'Palmer, Dave', 'en', 'Travellers Rest Golf Group', 2),
('TRGG-GUEST-1023', 'Un, Jung-Nan', 'en', 'Travellers Rest Golf Group', 1),
('MANUAL-1788076041554-90q4jpa', 'Rod Knight', 'en', 'Travellers Rest Golf Group', 2),
('GOOGLE-108536347231196444758', 'Marco Beer', 'en', 'Travellers Rest Golf Group', 1),
('MANUAL-1785031290697-s005j53', 'Lindsay Pyke', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-0268', 'Farrell, Seamus', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-0679', 'McHale, Mick', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-0491', 'Kamata, Koichi', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-1260', 'Young, Chul', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-1046', 'Watts, Simon', 'en', 'Travellers Rest Golf Group', 1),
('U52e2027819244a204c43127e8a4d29df', 'Alex ', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-0851', 'Raavi, Janne', 'en', 'Travellers Rest Golf Group', 2),
('Ue2e8d0624f400d568cc6fe2e6342780b', 'See-Hoe, Perry', 'en', 'Travellers Rest Golf Group', 1),
('TRGG-GUEST-0015', 'An, Sang Jin', 'en', 'Travellers Rest Golf Group', 1);

-- short course name as golfers write it
create or replace function public.report_drip_short_course(p text) returns text language sql immutable as $$
  select case
    when p ilike '%bangpakong%' then 'Bangpakong'
    when p ilike '%burapha%' then 'Burapha'
    when p ilike '%eastern star%' then 'Eastern Star'
    when p ilike '%green valley%' then 'Green Valley'
    when p ilike '%pattaya country%' or p ilike '%pattaya cc%' then 'Pattaya CC'
    when p ilike '%phoenix%' then 'Phoenix'
    when p ilike '%greenwood%' or p ilike '%green wood%' then 'Greenwood'
    when p ilike '%st andrews%' then 'St Andrews 2000'
    when p ilike '%khao kheow%' then 'Khao Kheow'
    when p ilike '%plutaluang%' or p ilike '%putaluang%' then 'Plutaluang'
    when p ilike '%treasure hill%' then 'Treasure Hill'
    when p ilike '%siam plantation%' then 'Siam Plantation'
    when p ilike '%siam old%' then 'Siam Old Course'
    when p ilike '%bangpra%' then 'Bangpra'
    when p ilike '%laem chabang%' then 'Laem Chabang'
    when p ilike '%hermes%' then 'Hermes'
    when p ilike '%pattavia%' then 'Pattavia'
    when p ilike '%royal lakeside%' then 'Royal Lakeside'
    when p ilike '%pleasant valley%' then 'Pleasant Valley'
    when p ilike '%mountain shadow%' then 'Mountain Shadow'
    when p ilike '%crystal bay%' then 'Crystal Bay'
    else null end
$$;

-- the day's plan: how many (per_day_min..max) and at which Bangkok hours, fixed per date
create or replace function public.report_drip_plan(p_day date) returns int[] language plpgsql stable as $$
declare cfg record; n int; seed bigint; hours int[] := '{}'; pool int[] := array[7,8,8,9,9,10,11,12,13,14,15,16,17,17,18,18,19,19,20,21]; pick int; i int := 0;
begin
  select * into cfg from public.report_drip_config where id = 1;
  seed := ('x' || substr(md5(p_day::text || 'drip'), 1, 12))::bit(48)::bigint;
  n := cfg.per_day_min + (seed % (cfg.per_day_max - cfg.per_day_min + 1))::int;
  while array_length(hours, 1) is null or array_length(hours, 1) < n loop
    i := i + 1;
    seed := ('x' || substr(md5(p_day::text || 'h' || i), 1, 12))::bit(48)::bigint;
    pick := pool[1 + (seed % array_length(pool, 1))::int];
    if not (pick = any(hours)) then hours := hours || pick; end if;
    exit when i > 60;
  end loop;
  return hours;
end $$;

create or replace function public.report_drip_tick(p_force boolean default false) returns text
language plpgsql security definer set search_path = public as $$
declare
  cfg record; now_bkk timestamptz := now(); today date; hr int; plan int[]; done_today int;
  ev record; t record; rep record; nt record;
  created timestamptz; day_txt text; kday_txt text; tee_txt text; cname text; soc text; subj text; body text; prio text;
  wd_en text[] := array['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  wd_ko text[] := array['월요일','화요일','수요일','목요일','금요일','토요일','일요일'];
  prev_d date; ev_day date; hrs text; n_calls int; cn int; v_lang text; v_theme text; v_timing text; k int; aged int := 0;
begin
  select * into cfg from public.report_drip_config where id = 1;
  if cfg is null or not cfg.enabled then return 'drip disabled'; end if;
  today := (now_bkk at time zone 'Asia/Bangkok')::date;
  hr := extract(hour from now_bkk at time zone 'Asia/Bangkok')::int;

  -- 1. age older drip rows so the queue breathes (never a row an admin touched: admin_note null + status open)
  update public.support_reports set status = 'in_progress', updated_at = now(),
         admin_note = (select note from public.report_drip_notes dn where dn.status = 'in_progress' order by random() limit 1)
   where source = 'drip_courses' and status = 'open' and admin_note is null and created_at < now() - interval '36 hours' and random() < 0.35;
  get diagnostics aged = row_count;
  update public.support_reports set status = 'resolved', resolved_at = least(now(), created_at + (random() * interval '2 days') + interval '1 day'),
         resolved_by = 'U2b6d976f19bca4b2f4374ae0e10ed873', updated_at = now(),
         admin_note = (select note from public.report_drip_notes dn where dn.status = 'resolved' order by random() limit 1)
   where source = 'drip_courses' and status in ('open','in_progress') and created_at < now() - interval '4 days' and random() < 0.5
     and (admin_note is null or admin_note in (select note from public.report_drip_notes));

  -- 2. is this hour in today's plan, and is today's quota still open?
  plan := public.report_drip_plan(today);
  select count(*) into done_today from public.support_reports where source = 'drip_courses' and (created_at at time zone 'Asia/Bangkok')::date = today;
  if not p_force then
    if not (hr = any(plan)) then return format('not this hour (plan %s, done %s, aged %s)', plan, done_today, aged); end if;
    if done_today >= array_length(plan, 1) then return format('quota met (%s)', done_today); end if;
    -- one per planned hour: skip if a row already landed this hour
    if exists (select 1 from public.support_reports where source = 'drip_courses' and (created_at at time zone 'Asia/Bangkok')::date = today
               and extract(hour from created_at at time zone 'Asia/Bangkok')::int = hr) then return 'this hour done'; end if;
  end if;

  -- 3. theme + language (app 40 / slow 30 / quit 30; ko ~15%)
  v_theme := case when random() < 0.40 then 'app' when random() < 0.5 then 'slow' else 'quit' end;
  v_lang := case when random() < 0.15 then 'ko' else 'en' end;
  v_timing := case when v_theme = 'app' then 'pre' else 'post' end;
  if v_theme = 'quit' and random() < 0.2 then v_timing := 'pre'; end if;

  -- 4. a REAL society day within a week, the six focus courses weighted up
  select e.event_date, coalesce(e.start_time, '09:00'::time) as tee, public.report_drip_short_course(coalesce(e.course_name, e.title)) as cshort,
         sp.society_name as society
    into ev
    from public.society_events e join public.society_profiles sp on sp.id = e.society_id
   where coalesce(e.status, '') not in ('cancelled', 'draft')
     and public.report_drip_short_course(coalesce(e.course_name, e.title)) is not null
     and sp.society_name in ('Travellers Rest Golf Group', 'JOA Golf Pattaya')
     and ((v_timing = 'pre'  and e.event_date between today + 1 and today + 7)
       or (v_timing = 'post' and e.event_date between today - 6 and today
           and (e.event_date < today or (now_bkk at time zone 'Asia/Bangkok') > (e.event_date + coalesce(e.start_time, '09:00'::time) + interval '4 hours'))))
   order by random() / (case when exists (select 1 from unnest(cfg.focus_courses) f where coalesce(e.course_name, e.title) ilike '%' || f || '%') then cfg.focus_weight else 1 end)
   limit 1;
  if ev is null then return 'no society day to anchor to'; end if;
  soc := case when ev.society = 'JOA Golf Pattaya' then 'JOA Golf Pattaya' else 'Travellers Rest Golf Group' end;

  -- 5. template, reporter (same society), fields
  select * into t from public.report_drip_templates d where d.theme = v_theme and d.lang = v_lang and d.timing = v_timing order by random() / d.weight limit 1;
  if t is null then select * into t from public.report_drip_templates d where d.theme = v_theme and d.lang = v_lang order by random() / d.weight limit 1; end if;
  select * into rep from public.report_drip_reporters r where r.lang = v_lang and r.society = soc order by random() / r.weight limit 1;
  if rep is null then select * into rep from public.report_drip_reporters r where r.lang = v_lang order by random() / r.weight limit 1; end if;

  created := now_bkk - (random() * interval '25 minutes');
  ev_day := ev.event_date; cname := ev.cshort;
  day_txt := extract(day from ev_day)::int || ' ' || to_char(ev_day, 'Mon');
  kday_txt := extract(month from ev_day)::int || '월 ' || extract(day from ev_day)::int || '일';
  tee_txt := extract(hour from ev.tee)::int || ':' || lpad(extract(minute from ev.tee)::int::text, 2, '0');
  prev_d := today - (1 + floor(random() * 2))::int;
  hrs := case when v_lang = 'en' then (array['5','5','5¼','5½','5½','5¾','6','nearly 6'])[1 + floor(random() * 8)::int] else (array['5','5.5','6'])[1 + floor(random() * 3)::int] end;
  n_calls := 4 + floor(random() * 6)::int; cn := 7 + floor(random() * 112)::int;

  subj := t.subject; body := t.body;
  subj := replace(replace(replace(replace(replace(replace(replace(replace(subj, '{C}', cname), '{SOC}', soc), '{DATE}', day_txt), '{KDATE}', kday_txt), '{TIME}', tee_txt), '{HRS}', hrs), '{N}', n_calls::text), '{CN}', cn::text);
  body := replace(replace(replace(replace(replace(replace(replace(replace(body, '{C}', cname), '{SOC}', soc), '{DATE}', day_txt), '{KDATE}', kday_txt), '{TIME}', tee_txt), '{HRS}', hrs), '{N}', n_calls::text), '{CN}', cn::text);
  body := replace(replace(replace(replace(body, '{WD_PREV}', wd_en[1 + extract(isodow from prev_d)::int - 1]), '{KWD_PREV}', wd_ko[1 + extract(isodow from prev_d)::int - 1]),
                  '{WD_EV}', wd_en[1 + extract(isodow from ev_day)::int - 1]), '{KWD_EV}', wd_ko[1 + extract(isodow from ev_day)::int - 1]);
  subj := replace(replace(subj, '{WD_EV}', wd_en[1 + extract(isodow from ev_day)::int - 1]), '{WD_PREV}', wd_en[1 + extract(isodow from prev_d)::int - 1]);
  prio := case when t.prio <> '' then t.prio when random() < 0.2 then 'high' when random() < 0.12 then 'low' else 'normal' end;

  insert into public.support_reports (reporter_id, reporter_name, lang, category, subject, body, society_name, status, priority, source, created_at, updated_at)
  values (rep.reporter_id, rep.name, v_lang, t.category, subj, body, soc, 'open', prio, 'drip_courses', created, created);
  return format('filed: %s | %s | %s (plan %s, done %s -> %s, aged %s)', cname, v_theme, rep.name, plan, done_today, done_today + 1, aged);
end $$;

revoke all on function public.report_drip_tick(boolean) from public, anon, authenticated;
revoke all on function public.report_drip_plan(date) from public, anon, authenticated;

-- hourly, 07:00-22:00 Bangkok = 00:00-15:00 UTC, at :23
select cron.unschedule(jobid) from cron.job where jobname = 'report-drip-courses';
select cron.schedule('report-drip-courses', '23 0-15 * * *', $$select public.report_drip_tick()$$);

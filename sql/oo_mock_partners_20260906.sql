-- 1on1 MOCK TEST DATA (2026-09-06) — Pete: "there are no members or female golfers ... use those 20 images and
-- create mock profiles for testing purposes so we can test the 1on1 process of searching and booking with
-- confirmations". Seeds 20 approved partner profiles built on the 20 mockup caddy portraits already deployed at
-- https://mycaddipro.com/images/caddies/caddyNN.jpg (oo_media.storage_path takes a full URL — signedUrls() in
-- public/oo-1on1.js passes http(s)/data URLs straight through, so nothing lands in the private oo-media bucket).
--
-- EVERY seeded row is keyed 'MOCK-OO-%'. Remove the whole set with sql/oo_mock_partners_cleanup_20260906.sql.
-- Also grants the two 1on1 admins (Pete, JOA) an ACTIVE member row so they can browse/search/book as members —
-- terms are deliberately left UNACCEPTED so the real consent gate is part of the test.
-- Run: npx supabase db query --linked -f sql/oo_mock_partners_20260906.sql   (one transaction)

-- ---------- 0. clear any previous mock seed ----------
delete from public.oo_reviews  where member_id like 'MOCK-OO-%' or partner_id in (select id from public.oo_partners where user_id like 'MOCK-OO-%');
delete from public.oo_likes    where member_id like 'MOCK-OO-%' or partner_id in (select id from public.oo_partners where user_id like 'MOCK-OO-%');
delete from public.oo_bookings where member_id like 'MOCK-OO-%' or partner_id in (select id from public.oo_partners where user_id like 'MOCK-OO-%');
delete from public.oo_blackouts where partner_id in (select id from public.oo_partners where user_id like 'MOCK-OO-%');
update public.oo_partners set cover_media_id = null where user_id like 'MOCK-OO-%';
delete from public.oo_media    where partner_id in (select id from public.oo_partners where user_id like 'MOCK-OO-%');
delete from public.oo_partners where user_id like 'MOCK-OO-%';
delete from public.oo_members  where user_id like 'MOCK-OO-%';

-- ---------- 1. the roster ----------
create temp table mock_p (
  uid text, nm text, img text, hcp numeric, home text, known text[], langs text[], days text[], rate numeric,
  bio text, tips text
) on commit drop;

insert into mock_p values
('MOCK-OO-P01','Ploy Suwannarat','caddy2',8.4,'Khao Kheow - Course A',
 array['Khao Kheow - Course A','Khao Kheow - Course C','Laem Chabang (Mountain+Lake)'],
 array['Thai','English','Korean'], array['mon','tue','wed','thu','fri','sat','sun'], 3200,
 'Plays off single figures and has looped the Khao Kheow nines since she was a junior. Calm, quick around the course and happy to keep score for the group.',
 'On the A nine everything breaks away from the mountain. Take one more club into the back pins after 11am when the sea breeze gets up.'),
('MOCK-OO-P02','Mint Chaidee','caddy3',12.0,'Burapha Golf Club - East Course',
 array['Burapha Golf Club - East Course','Burapha Golf Club - West Course','Pattavia Golf Club'],
 array['Thai','English'], array['mon','tue','wed','thu','fri','sat','sun'], 2800,
 'Burapha regular who knows both loops hole by hole. Steady partner for a relaxed 18 and good company for a first visit to the course.',
 'East course front nine plays a club longer than the card in the morning dew. Bunkers on 6 and 15 are deeper than they look from the tee.'),
('MOCK-OO-P03','Fern Wongkham','caddy6',6.2,'Siam Old Course',
 array['Siam Old Course','Siam Waterside','Siam Rolling Hills'],
 array['Thai','English','Korean'], array['mon','tue','wed','thu','fri','sat','sun'], 4000,
 'Competitive amateur off a low single-figure handicap and a Siam Country Club regular. Comfortable playing from the back tees or keeping it easy.',
 'Old Course greens are firmer than any other Siam layout. Land it short and let it run, and never go long on 17.'),
('MOCK-OO-P04','Nam Rattanakorn','caddy7',15.5,'Pattaya Country Club',
 array['Pattaya Country Club','Crystal Bay Golf Club','Mountain Shadow Golf Club'],
 array['Thai','English'], array['mon','tue','wed','thu','fri'], 2500,
 'Weekday player who knows the quieter Pattaya courses and how to get round them in under four hours. Friendly, patient and used to mixed-ability groups.',
 'Pattaya Country Club has the softest greens in the area after rain. Crystal Bay is the best value if you want a late tee time.'),
('MOCK-OO-P05','Bee Srisai','caddy9',10.8,'Phoenix Gold - Ocean Nine',
 array['Phoenix Gold - Ocean Nine','Phoenix Gold - Lake Nine','Pattaya Country Club'],
 array['Thai','English','Japanese'], array['mon','tue','wed','thu','fri','sat','sun'], 3000,
 'Grew up beside the Phoenix nines and plays there most weeks. Keeps a good pace and reads the coastal wind well.',
 'Ocean nine is all about the wind off the water. Club up on 4 and 7, and take the left side on the par 5s.'),
('MOCK-OO-P06','Gift Boonmee','caddy10',18.2,'Pattana Golf Resort & Spa',
 array['Pattana Golf Resort & Spa','Green Valley Rayong Country Club','Eastern Star Golf Course'],
 array['Thai','English'], array['mon','tue','wed','thu','fri','sat','sun'], 2400,
 'Relaxed mid-handicap player who enjoys a social round. Knows the Rayong side courses and where to eat afterwards.',
 'Pattana is three separate nines with three different characters. The Andreas nine is the one to play if the group is tired.'),
('MOCK-OO-P07','Aom Intharat','caddy12',4.8,'Laem Chabang (Mountain+Lake)',
 array['Laem Chabang (Mountain+Lake)','Laem Chabang (Lake+Valley)','Khao Kheow - Course A'],
 array['Thai','English','Korean'], array['mon','tue','wed','thu','fri','sat','sun'], 4500,
 'Scratch-level amateur and the strongest player on the list. Plays the Nicklaus layout at Laem Chabang off the tips and can help a low handicapper work on their game.',
 'The Mountain nine punishes anything right. Keep it below the hole on the Lake greens or you will three-putt.'),
('MOCK-OO-P08','Nan Charoensuk','caddy13',14.0,'Crystal Bay Golf Club',
 array['Crystal Bay Golf Club','Pattaya Country Club','Bangpra International Golf Club'],
 array['Thai','Korean'], array['fri','sat','sun'], 2600,
 'Weekend player, Korean speaking, used to playing with visiting groups. Happy to walk a guest through the local rules and pace.',
 'Crystal Bay has three nines and they rotate. Ask at the pro shop which two you are on before you buy the yardage book.'),
('MOCK-OO-P09','Praew Thanakit','caddy14',9.6,'Chee Chan Golf Resort',
 array['Chee Chan Golf Resort','Khao Kheow - Course B (with A)','Plutaluang Royal Thai Navy Golf Course'],
 array['Thai','English','Korean'], array['mon','tue','wed','thu','fri','sat','sun'], 3600,
 'Single-figure player who splits her golf between Chee Chan and Khao Kheow. Good company for an early tee time and quick around the greens.',
 'Chee Chan looks flat from the fairway but every green sits above you. Take the extra club and putt from the front.'),
('MOCK-OO-P10','June Nopparat','caddy15',20.4,'St. Andrews 2000 Golf Club',
 array['St. Andrews 2000 Golf Club','Treasure Hill Golf & Country Club','Mountain Shadow Golf Club'],
 array['Thai','English'], array['mon','tue','wed','thu','fri','sat','sun'], 2200,
 'Improving higher-handicap player who enjoys a friendly game. Best match for a social round rather than a card and pencil.',
 'St Andrews 2000 gets very firm in the dry season. The run-offs around the greens are the whole test.'),
('MOCK-OO-P11','Pim Sangthong','caddy16',7.5,'Siam Waterside',
 array['Siam Waterside','Siam Plantation Golf Club','Siam Bangkok'],
 array['Thai','English','Chinese'], array['mon','tue','wed','thu','fri','sat','sun'], 3400,
 'Plays the Siam courses week in week out and knows every pin position. Low single-figure ball striker with a quiet, easy manner.',
 'Waterside is all water off the tee on the back nine. Play to the fat side and take your par.'),
('MOCK-OO-P12','Noon Pattarapon','caddy17',16.8,'Eastern Star Golf Course',
 array['Eastern Star Golf Course','Green Valley Rayong Country Club','Pattana Golf Resort & Spa'],
 array['Thai','English'], array['mon','tue','wed','thu','fri','sat','sun'], 2300,
 'Rayong-side regular who likes an unhurried round and a good lunch afterwards. Comfortable with beginners and with mixed groups.',
 'Eastern Star is a proper links-style wind test after 10am. Book the earliest tee time you can get.'),
('MOCK-OO-P13','Mai Sirikul','caddy18',11.2,'Bangpra International Golf Club',
 array['Bangpra International Golf Club','Khao Kheow - Course C','Burapha Golf Club - West Course'],
 array['Thai','English','Korean'], array['mon','tue','wed','thu','fri','sat','sun'], 3000,
 'Consistent mid-single-figure to low-teens player, Korean speaking, plays most of her golf around Sriracha. Reliable and easy to play with.',
 'Bangpra is hillier than the card suggests. Buggy paths are steep after rain, so allow a little extra time.'),
('MOCK-OO-P14','Bua Ketsuwan','caddy19',5.4,'Khao Kheow - Course C',
 array['Khao Kheow - Course C','Khao Kheow - Course A','Laem Chabang (Lake+Valley)'],
 array['Thai','English','Japanese'], array['mon','tue','wed','thu','fri','sat'], 4200,
 'Former junior squad player off a low handicap who now plays for enjoyment. Strong iron player and good on a difficult green.',
 'The C nine at Khao Kheow is the toughest of the three. Anything above the hole on 3 and 8 is a give-up putt.'),
('MOCK-OO-P15','Ying Amnuay','caddy20',13.6,'Treasure Hill Golf & Country Club',
 array['Treasure Hill Golf & Country Club','Chee Chan Golf Resort','Plutaluang Royal Thai Navy Golf Course'],
 array['Thai','English'], array['mon','tue','wed','thu','fri','sat','sun'], 2700,
 'Plays the hill courses east of Pattaya and knows the tricky lies they give you. Cheerful, steady company for 18 holes.',
 'Treasure Hill has almost no flat lies. Grip down and swing easy, and the ball will finish nearer than you think.'),
('MOCK-OO-P16','Tan Phromma','caddy21',22.0,'Greenwood Golf & Resort - Course A',
 array['Greenwood Golf & Resort - Course A','Greenwood Golf & Resort - Course B','Bangpakong Riverside Country Club'],
 array['Thai','English'], array['mon','tue','wed','thu','fri','sat','sun'], 2000,
 'Newer to the game and playing off a high handicap, so a relaxed social round suits her best. Knows the Chachoengsao courses well.',
 'Greenwood is flat and walkable and the three nines all play differently. Course B is the quietest at the weekend.'),
('MOCK-OO-P17','Fah Kanchana','caddy22',9.0,'Pattavia Golf Club',
 array['Pattavia Golf Club','Burapha Golf Club - East Course','Royal Lakeside Golf Club'],
 array['Thai','English','Korean'], array['mon','tue','wed','thu','fri','sat','sun'], 3300,
 'Single-figure player, Korean speaking, plays a lot of society golf around the Eastern Seaboard. Knows how the local formats are scored.',
 'Pattavia greens are small and firm. Miss on the short side and you will not get it up and down.'),
('MOCK-OO-P18','Bam Chanthara','caddy23',17.4,'Plutaluang Royal Thai Navy Golf Course',
 array['Plutaluang Royal Thai Navy Golf Course','Chee Chan Golf Resort','Mountain Shadow Golf Club'],
 array['Thai','English'], array['mon','tue','wed','thu','fri','sat','sun'], 2400,
 'Easy-going mid-handicap player who grew up next to the navy course. Good pick for a straightforward, unhurried round.',
 'Plutaluang has four nines and the North and West pair is the best test. It is the best value round in the province.'),
('MOCK-OO-P19','Pear Sudarat','caddy24',12.8,'Green Valley Rayong Country Club',
 array['Green Valley Rayong Country Club','Eastern Star Golf Course','Pattana Golf Resort & Spa'],
 array['Thai','English','Korean'], array['mon','tue','wed','thu','fri','sat','sun'], 2900,
 'Plays most of her golf on the Rayong courses and is used to visiting groups. Korean speaking and comfortable keeping the scorecard.',
 'Green Valley is exposed and the afternoon wind is real. The par 3s are the whole round, so pick the right club.'),
('MOCK-OO-P20','Jib Thepsiri','caddy25',6.8,'Siam Rolling Hills',
 array['Siam Rolling Hills','Siam Old Course','Siam Bangkok'],
 array['Thai','English','Japanese','Korean'], array['mon','tue','wed','thu','fri','sat','sun'], 3800,
 'Low single-figure player and the most travelled of the group, with four languages and a lot of tournament rounds behind her.',
 'Rolling Hills is the most severe of the Siam layouts. Play to the middle of every green and let the slopes do the work.');

insert into public.oo_partners (user_id, display_name, bio, languages, handicap, home_course_name, courses_known,
                                area_tips, availability_days, day_rate, currency, status, is_active,
                                approved_by, approved_at, terms_version, terms_accepted_at)
select uid, nm, bio, langs, hcp, home, known, tips, days, rate, 'THB', 'approved', true,
       'seed:mock-20260906', now(), public.oo_terms_version(), now()
from mock_p;

-- ---------- 2. one profile photo each (the deployed mockup portraits) ----------
insert into public.oo_media (partner_id, kind, storage_path, sort_order, status)
select op.id, 'photo', 'https://mycaddipro.com/images/caddies/' || m.img || '.jpg', 0, 'visible'
from mock_p m join public.oo_partners op on op.user_id = m.uid;

update public.oo_partners op set cover_media_id = md.id
from public.oo_media md
where md.partner_id = op.id and op.user_id like 'MOCK-OO-P%';

-- ---------- 3. two partners are away next week (so the date filter has something to hide) ----------
insert into public.oo_blackouts (partner_id, date_from, date_to, note)
select op.id, public.oo_today() + 8, public.oo_today() + 12, 'Away'
from public.oo_partners op where op.user_id in ('MOCK-OO-P03','MOCK-OO-P14');

-- ---------- 4. four mock members, only as the counterparty of past rounds ----------
insert into public.oo_members (user_id, status, display_name, approved_by, approved_at, terms_version, terms_accepted_at)
values ('MOCK-OO-M01','active','JOA Test Golfer 1','seed:mock-20260906', now() - interval '90 days', public.oo_terms_version(), now() - interval '90 days'),
       ('MOCK-OO-M02','active','JOA Test Golfer 2','seed:mock-20260906', now() - interval '90 days', public.oo_terms_version(), now() - interval '90 days'),
       ('MOCK-OO-M03','active','JOA Test Golfer 3','seed:mock-20260906', now() - interval '90 days', public.oo_terms_version(), now() - interval '90 days'),
       ('MOCK-OO-M04','active','JOA Test Golfer 4','seed:mock-20260906', now() - interval '90 days', public.oo_terms_version(), now() - interval '90 days');

-- ---------- 5. completed rounds + ratings (search ranks on review count, cards show the stars) ----------
create temp table mock_h (uid text, mem text, d_ago int, course text, rating int, cmt text) on commit drop;
insert into mock_h values
('MOCK-OO-P01','MOCK-OO-M01',12,'Khao Kheow - Course A',5,'Knows every break on the A nine. Great pace of play.'),
('MOCK-OO-P01','MOCK-OO-M03',33,'Laem Chabang (Mountain+Lake)',5,'Played well and kept the group moving.'),
('MOCK-OO-P03','MOCK-OO-M02',7,'Siam Old Course',5,'Excellent player, very easy round.'),
('MOCK-OO-P03','MOCK-OO-M04',26,'Siam Waterside',4,'Good company and helpful on the greens.'),
('MOCK-OO-P05','MOCK-OO-M01',19,'Phoenix Gold - Ocean Nine',4,'Read the wind better than any of us.'),
('MOCK-OO-P07','MOCK-OO-M02',5,'Laem Chabang (Mountain+Lake)',5,'Serious player. Learned a lot in one round.'),
('MOCK-OO-P07','MOCK-OO-M03',41,'Khao Kheow - Course A',5,'Best round of the trip.'),
('MOCK-OO-P09','MOCK-OO-M04',15,'Chee Chan Golf Resort',5,'Punctual, friendly and a very good player.'),
('MOCK-OO-P11','MOCK-OO-M01',22,'Siam Waterside',4,'Quiet and steady, exactly what I wanted.'),
('MOCK-OO-P13','MOCK-OO-M02',30,'Bangpra International Golf Club',5,'Spoke Korean with my friend the whole way round.'),
('MOCK-OO-P14','MOCK-OO-M03',9,'Khao Kheow - Course C',5,'Very strong iron player.'),
('MOCK-OO-P15','MOCK-OO-M04',37,'Treasure Hill Golf & Country Club',4,'Cheerful and good on the hill lies.'),
('MOCK-OO-P17','MOCK-OO-M01',17,'Pattavia Golf Club',5,'Knew the format and kept our scores straight.'),
('MOCK-OO-P19','MOCK-OO-M02',28,'Green Valley Rayong Country Club',4,'Easy day out, would play again.'),
('MOCK-OO-P20','MOCK-OO-M03',11,'Siam Rolling Hills',5,'Excellent golfer and great company.'),
('MOCK-OO-P20','MOCK-OO-M04',44,'Siam Old Course',5,'Made the round for us.');

insert into public.oo_bookings (partner_id, member_id, date_from, date_to, course_name, holes, status,
                                fee_quoted, currency, payment_status, requested_at, responded_at, completed_at)
select op.id, h.mem, public.oo_today() - h.d_ago, public.oo_today() - h.d_ago, h.course, 18, 'completed',
       op.day_rate, 'THB', 'paid',
       now() - make_interval(days => h.d_ago + 3), now() - make_interval(days => h.d_ago + 2), now() - make_interval(days => h.d_ago)
from mock_h h join public.oo_partners op on op.user_id = h.uid;

insert into public.oo_reviews (booking_id, member_id, partner_id, rating, comment, created_at)
select k.id, k.member_id, k.partner_id, h.rating, h.cmt, now() - make_interval(days => h.d_ago)
from mock_h h
join public.oo_partners op on op.user_id = h.uid
join public.oo_bookings k on k.partner_id = op.id and k.member_id = h.mem
                         and k.date_from = public.oo_today() - h.d_ago;

-- ---------- 6. the two 1on1 admins get an ACTIVE member row so they can search + book ----------
--   (terms left NULL on purpose: accepting them is part of the flow being tested)
insert into public.oo_members (user_id, status, display_name, approved_by, approved_at)
values ('U2b6d976f19bca4b2f4374ae0e10ed873','active','Pete Park','seed:mock-20260906', now()),
       ('KAKAO-4911042963','active','JOA Golf Pattaya','seed:mock-20260906', now())
on conflict (user_id) do update set status = 'active', approved_at = coalesce(oo_members.approved_at, now());

select (select count(*) from public.oo_partners where user_id like 'MOCK-OO-P%') as partners,
       (select count(*) from public.oo_media m join public.oo_partners p on p.id = m.partner_id where p.user_id like 'MOCK-OO-P%') as photos,
       (select count(*) from public.oo_bookings where member_id like 'MOCK-OO-M%') as past_rounds,
       (select count(*) from public.oo_reviews where member_id like 'MOCK-OO-M%') as reviews,
       (select count(*) from public.oo_members where status = 'active') as active_members;

-- 2026-10-03 (Pete via Telegram): a fictional golfer "Jamie" messages Pete's inbox on Thursday 1 Oct
-- about a cancelled Thai Airways flight, a refund, and a new arrival in BKK on Tuesday 13 Oct.
-- Seed rules: obviously fictional id (MANUAL-), coherent timestamps (Thu 1 Oct 14:20 Bangkok),
-- LINE push trigger OFF for the insert (a seed is never pushed), everything in one transaction.
begin;
insert into user_profiles (line_user_id, name, display_name, role, user_role, created_at, updated_at)
values ('MANUAL-1790000000000-jamie', 'Jamie', 'Jamie', 'golfer', 'golfer', '2026-09-20 03:10:00+00', '2026-09-20 03:10:00+00')
on conflict (line_user_id) do nothing;

alter table direct_messages disable trigger trigger_new_message_notification;
insert into direct_messages (sender_line_id, recipient_line_id, message_text, created_at, is_read)
values ('MANUAL-1790000000000-jamie', 'U2b6d976f19bca4b2f4374ae0e10ed873',
 'Hi Pete, bad news — Thai Airways just cancelled my flight. I''m on the phone with them now trying to get the refund sorted so I can book with another airline. Looking at options that get me into BKK on Tuesday the 13th. Will send you the new flight details as soon as it''s booked. Sorry for the hassle!',
 '2026-10-01 07:20:00+00', false);
alter table direct_messages enable trigger trigger_new_message_notification;
commit;
select id, sender_line_id, created_at at time zone 'Asia/Bangkok' bkk, is_read from direct_messages where sender_line_id='MANUAL-1790000000000-jamie';

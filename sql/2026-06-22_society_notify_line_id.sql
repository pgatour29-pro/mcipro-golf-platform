-- Dedicated LINE id for ORGANIZER notifications, separate from organizer_id (the login gate).
-- Needed when the organizer logs in via a non-LINE provider (e.g. JOA's Jason uses Kakao) but
-- still has a push-capable LINE account. _notifyThread prefers notify_line_id over organizer_id.

alter table public.society_profiles add column if not exists notify_line_id text;

-- JOA Golf Pattaya: Jason logs in via Kakao (organizer_id=KAKAO-4911042963) but has a LINE
-- account with a messaging_user_id, so route his message notifications there.
update public.society_profiles
   set notify_line_id = 'Udb12b92d028efee5a017a03a6c4c1ad4'
 where id = '0f5472a5-5d29-4c08-a16f-8c3dd1d6b22b';

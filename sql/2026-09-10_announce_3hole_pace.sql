-- Platform announcement: 3-hole scoring pace (v1151-v1153).
-- Posted to the Announcements board for every society, as the safety net for anyone who
-- dismissed or missed the one-time What's New notice.
--
-- DELIBERATELY inserted here and NOT through Messages > compose: that path also calls the
-- line-push-notification edge function, which would push this to every connected member's
-- LINE. Pete has not asked for a push. Rows only, no phones buzzing.
--
-- Title prefix is the plain 🌐 character the earlier platform announcements used, NOT
-- micon('language'): the board escapes the title on render, so HTML there shows as raw markup.
insert into announcements (society_id, sender_line_id, title, message_text, priority, is_pinned)
select
    sp.id,
    'U2b6d976f19bca4b2f4374ae0e10ed873',
    '🌐 New: score every 3 holes',
    $msg$You no longer have to open your phone on every hole.

HOW IT WORKS
Open the Live Scorecard and tap EVERY 3 HOLES at the top of the screen. Enter one player's three holes, then the next player's — no more asking everyone what they scored on every hole.

Every tap still saves on its own. There is no save button, and nothing is lost if your phone dies mid-round.

Blocks start where you turn it on. Switch on after the 4th and they run 5-6-7, then 8-9-10. The last block is shorter if it does not divide evenly.

It works whether you are scoring only yourself, your team, or the whole group.

WANT TO TRY IT FIRST?
Play Golf > Demo is a full practice round with every button working. Tap anything, make mistakes, try any game. Nothing is saved — your handicap, your history and the leaderboards are never touched.

Prefer the old way? Leave it on EVERY HOLE. Nothing changes.$msg$,
    'important',
    false
from society_profiles sp
where not exists (
    select 1 from announcements a
    where a.society_id = sp.id and a.title = '🌐 New: score every 3 holes'
);

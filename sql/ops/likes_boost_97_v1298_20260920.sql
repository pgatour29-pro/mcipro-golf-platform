-- Pete, 2026-09-20 16:48: "Lets get the likes count to 97 and make sure to match the numbers
-- in other sections".
--
-- The post shows real like rows + `likes_boost`, so the boost is the TARGET MINUS the real rows —
-- never the target itself (2 real: Patrik Andersson + Pete's own) → 97 - 2 = 95.
--
-- Every other surface derives from that same sum, so they move together:
--   * post card heart + grid tile overlay  → gfd_post_json 'likes'          = real + boost
--   * Activity headline "{n} likes on your post" → golf_activity 'total'    = real + boost
--   * Activity "Likes" chip (size = r.total) → the same 'total'
-- The fresh slice is a SUBSET of that total and has to move with it, or the post gains 5 likes
-- that arrived at no time at all: likes_boost_recent 17 → 22 (+1 real = "23 in the past 6 hours").
-- likes_boost_recent_at stays NULL on purpose — a pinned instant ages into "the past 20 hours".

update public.golf_posts
   set likes_boost        = 95,
       likes_boost_recent = 22
 where id = 'a9982da5-29fd-4b24-b280-2f0ae9070934'
   and author_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

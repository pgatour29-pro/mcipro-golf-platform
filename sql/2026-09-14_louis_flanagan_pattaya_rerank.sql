-- Louis Flanagan 9th -> 2nd in Division 1 of the Sep 14 Pattaya event (Pete: "You do it").
-- He scored 37 off 14, not 29 off 7. Willy KEEPS the win on countback: back nine 21 v 20
-- (_cmpFull compares sb9 then sb6/sb3/sb1). Leon Tioke drops to 3rd because he has no
-- hole-by-hole at all and a null countback loses every tie in that comparator.
-- DIVISION 2 IS DELIBERATELY UNTOUCHED: four of its players tie on 32 and the original
-- publish separated them by an ordering I cannot reconstruct, so a full re-rank would have
-- silently rewritten their chips too. Positions below are a surgical shift, preserving every
-- existing tie-break. Chip pool stays 101.

update public.event_results set position=2, points_earned=18, score=37 where event_id='6a962fa3-b5a0-4fe2-bb38-26467ad14047' and player_id='U2d73fb4e83969dd5caaadd413ede87cb';
update public.event_results set position=3, points_earned=15, score=37 where event_id='6a962fa3-b5a0-4fe2-bb38-26467ad14047' and player_id='MANUAL-1789034799521-zlurj4q';
update public.event_results set position=4, points_earned=12, score=36 where event_id='6a962fa3-b5a0-4fe2-bb38-26467ad14047' and player_id='MANUAL-1784505649151-i8bfb4w';
update public.event_results set position=5, points_earned=10, score=35 where event_id='6a962fa3-b5a0-4fe2-bb38-26467ad14047' and player_id='GOOGLE-115766894244772633683';
update public.event_results set position=6, points_earned=8, score=33 where event_id='6a962fa3-b5a0-4fe2-bb38-26467ad14047' and player_id='U2b6d976f19bca4b2f4374ae0e10ed873';
update public.event_results set position=7, points_earned=6, score=33 where event_id='6a962fa3-b5a0-4fe2-bb38-26467ad14047' and player_id='U47ace7ba9ba325f26e129431dc331c08';
update public.event_results set position=8, points_earned=4, score=31 where event_id='6a962fa3-b5a0-4fe2-bb38-26467ad14047' and player_id='TRGG-GUEST-0439';
update public.event_results set position=9, points_earned=2, score=29 where event_id='6a962fa3-b5a0-4fe2-bb38-26467ad14047' and player_id='TRGG-GUEST-1193';

update public.event_winnings set amount=18 where event_id='6a962fa3-b5a0-4fe2-bb38-26467ad14047' and player_id='U2d73fb4e83969dd5caaadd413ede87cb';  -- Flanagan, Louis
update public.event_winnings set amount=15 where event_id='6a962fa3-b5a0-4fe2-bb38-26467ad14047' and player_id='MANUAL-1789034799521-zlurj4q';  -- Leon Tioke
update public.event_winnings set amount=12 where event_id='6a962fa3-b5a0-4fe2-bb38-26467ad14047' and player_id='MANUAL-1784505649151-i8bfb4w';  -- newell Mike
update public.event_winnings set amount=10 where event_id='6a962fa3-b5a0-4fe2-bb38-26467ad14047' and player_id='GOOGLE-115766894244772633683';  -- David OSullivan
update public.event_winnings set amount=8 where event_id='6a962fa3-b5a0-4fe2-bb38-26467ad14047' and player_id='U2b6d976f19bca4b2f4374ae0e10ed873';  -- Pete Park
update public.event_winnings set amount=6 where event_id='6a962fa3-b5a0-4fe2-bb38-26467ad14047' and player_id='U47ace7ba9ba325f26e129431dc331c08';  -- Manuel Keituri
update public.event_winnings set amount=4 where event_id='6a962fa3-b5a0-4fe2-bb38-26467ad14047' and player_id='TRGG-GUEST-0439';  -- Isometsa, Juha
update public.event_winnings set amount=2 where event_id='6a962fa3-b5a0-4fe2-bb38-26467ad14047' and player_id='TRGG-GUEST-1193';  -- Rozentals, Peter

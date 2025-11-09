-- Update existing caddy profiles to use actual images from /images/caddies/
-- Run this to fix the placeholder pravatar.cc URLs

-- Update Burapha Golf Club caddies
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy1.jpg' WHERE name = 'Somchai "Eagle" Prasert';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy2.jpg' WHERE name = 'Nattaya "Birdie" Saengthong';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy3.jpg' WHERE name = 'Pramote "Ace" Wongsawat';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy4.jpg' WHERE name = 'Kulap "Rose" Boonmee';

-- Update Pleasant Valley Golf & Country Club caddies
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy5.jpg' WHERE name = 'Chaiwat "Tiger" Siriporn';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy6.jpg' WHERE name = 'Siriporn "Diamond" Chaiyot';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy7.jpg' WHERE name = 'Boonlert "Pro" Rattana';

-- Update Laem Chabang International Country Club caddies
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy8.jpg' WHERE name = 'Somying "Precision" Kaewkla';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy9.jpg' WHERE name = 'Wichit "Navigator" Pongpat';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy10.jpg' WHERE name = 'Anong "Swift" Thongsuk';

-- Update Phoenix Gold Golf & Country Club caddies
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy11.jpg' WHERE name = 'Thongchai "Phoenix" Manee';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy12.jpg' WHERE name = 'Suwanna "Golden" Prateep';

-- Update Siam Country Club (Pattaya Old Course) caddies
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy13.jpg' WHERE name = 'Prasit "Legend" Boonsri';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy14.jpg' WHERE name = 'Kanya "Classic" Siriwan';

-- Update St Andrews 2000 caddies
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy15.jpg' WHERE name = 'Narong "Highland" Suwan';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy16.jpg' WHERE name = 'Pornthip "Heather" Wongsa';

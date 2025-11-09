-- Populate demo caddy profiles for booking system
-- Premium luxury caddies for demonstration
-- Matches actual caddy_profiles table schema

-- Insert premium demo caddies for Burapha Golf Club
INSERT INTO caddy_profiles (name, course_name, photo_url, rating, experience_years, languages, specialties, bio, is_active)
VALUES
    ('Somchai "Eagle" Prasert', 'Burapha Golf Club', 'https://i.pravatar.cc/300?img=12', 4.95, 15, ARRAY['Thai', 'English', 'Chinese'], ARRAY['Course Strategy', 'Club Selection', 'Green Reading'], 'Master caddy with 15 years experience at Burapha. Former professional golfer who knows every break on these greens. Specializes in tournament preparation and competitive play.', true),
    ('Nattaya "Birdie" Saengthong', 'Burapha Golf Club', 'https://i.pravatar.cc/300?img=47', 4.98, 12, ARRAY['Thai', 'English', 'Japanese'], ARRAY['Mental Game', 'Course Management', 'Short Game'], 'Elite caddy known for exceptional green reading and mental game coaching. Worked with multiple tour professionals. Calm demeanor under pressure.', true),
    ('Pramote "Ace" Wongsawat', 'Burapha Golf Club', 'https://i.pravatar.cc/300?img=15', 4.92, 10, ARRAY['Thai', 'English'], ARRAY['Distance Control', 'Wind Reading', 'Club Fitting'], 'Technical expert specializing in club selection and distance control. Uses modern technology and traditional knowledge. Perfect for players focused on improvement.', true),
    ('Kulap "Rose" Boonmee', 'Burapha Golf Club', 'https://i.pravatar.cc/300?img=32', 4.97, 8, ARRAY['Thai', 'English', 'Korean'], ARRAY['Beginner Friendly', 'Pace of Play', 'Rules Expert'], 'Patient and encouraging caddy perfect for beginners and intermediate players. Excellent communicator with deep rules knowledge. Creates enjoyable experiences.', true),

    -- Pleasant Valley Golf & Country Club
    ('Chaiwat "Tiger" Siriporn', 'Pleasant Valley Golf & Country Club', 'https://i.pravatar.cc/300?img=33', 4.96, 18, ARRAY['Thai', 'English', 'Mandarin'], ARRAY['Championship Play', 'Course Record', 'Tournament Strategy'], 'Legendary caddy at Pleasant Valley with 18 years experience. Has worked 50+ professional tournaments. Known for strategic brilliance and ice-cold composure.', true),
    ('Siriporn "Diamond" Chaiyot', 'Pleasant Valley Golf & Country Club', 'https://i.pravatar.cc/300?img=44', 5.00, 14, ARRAY['Thai', 'English', 'Japanese', 'Korean'], ARRAY['VIP Service', 'Luxury Experience', 'Corporate Golf'], 'Premium VIP caddy service. Multilingual professional specializing in corporate golf and high-profile clients. Discreet, professional, and detail-oriented.', true),
    ('Boonlert "Pro" Rattana', 'Pleasant Valley Golf & Country Club', 'https://i.pravatar.cc/300?img=56', 4.94, 11, ARRAY['Thai', 'English'], ARRAY['Long Drive', 'Power Game', 'Fitness Coaching'], 'Former college athlete specializing in power game and fitness. Helps players maximize distance while maintaining accuracy. High energy and motivational.', true),

    -- Laem Chabang International Country Club
    ('Somying "Precision" Kaewkla', 'Laem Chabang International Country Club', 'https://i.pravatar.cc/300?img=26', 4.93, 13, ARRAY['Thai', 'English'], ARRAY['Wind Strategy', 'Links Golf', 'Coastal Conditions'], 'Coastal golf specialist who understands Laem Chabang winds better than anyone. Essential for players wanting to score well on this challenging course.', true),
    ('Wichit "Navigator" Pongpat', 'Laem Chabang International Country Club', 'https://i.pravatar.cc/300?img=58', 4.91, 9, ARRAY['Thai', 'English', 'German'], ARRAY['Course Navigation', 'Hazard Avoidance', 'Shot Shaping'], 'Expert navigator who knows every hidden hazard and landing area. Helps players avoid trouble and find the best angles. Detail-oriented and methodical.', true),
    ('Anong "Swift" Thongsuk', 'Laem Chabang International Country Club', 'https://i.pravatar.cc/300?img=29', 4.89, 7, ARRAY['Thai', 'English'], ARRAY['Fast Play', 'Efficiency', 'Time Management'], 'Speed specialist perfect for busy executives. Maintains excellent pace while providing full caddy services. Organized and highly efficient.', true),

    -- Phoenix Gold Golf & Country Club
    ('Thongchai "Phoenix" Manee', 'Phoenix Gold Golf & Country Club', 'https://i.pravatar.cc/300?img=51', 4.99, 16, ARRAY['Thai', 'English', 'Chinese', 'Russian'], ARRAY['Elite Service', 'International Clients', 'Premium Experience'], 'Elite international caddy with global tournament experience. Multilingual professional who has worked with champions worldwide. White-glove service standards.', true),
    ('Suwanna "Golden" Prateep', 'Phoenix Gold Golf & Country Club', 'https://i.pravatar.cc/300?img=41', 4.96, 12, ARRAY['Thai', 'English', 'Japanese'], ARRAY['Ladies Golf', 'Social Golf', 'Entertainment'], 'Specialist in ladies golf and social play. Creates wonderful atmosphere while maintaining professional standards. Perfect for leisure rounds and groups.', true),

    -- Siam Country Club (Pattaya Old Course)
    ('Prasit "Legend" Boonsri', 'Siam Country Club (Pattaya Old Course)', 'https://i.pravatar.cc/300?img=68', 5.00, 22, ARRAY['Thai', 'English'], ARRAY['Historic Course', 'Traditional Golf', 'Heritage Knowledge'], 'Living legend at Siam Country Club. 22 years of experience on this historic course. Has caddied for countless champions and celebrities. Living encyclopedia of course history.', true),
    ('Kanya "Classic" Siriwan', 'Siam Country Club (Pattaya Old Course)', 'https://i.pravatar.cc/300?img=38', 4.95, 14, ARRAY['Thai', 'English', 'French'], ARRAY['Classic Play', 'Etiquette', 'Traditional Values'], 'Traditional golf specialist who emphasizes etiquette and classic play. Sophisticated and refined approach. Perfect for purists and heritage golf enthusiasts.', true),

    -- St Andrews 2000
    ('Narong "Highland" Suwan', 'St Andrews 2000', 'https://i.pravatar.cc/300?img=53', 4.94, 10, ARRAY['Thai', 'English', 'Scottish Gaelic'], ARRAY['Links Style', 'Scottish Golf', 'Traditional Caddy'], 'Links golf specialist trained in Scottish traditions. Brings authentic St Andrews experience to Thailand. Expert in bump-and-run and traditional shot-making.', true),
    ('Pornthip "Heather" Wongsa', 'St Andrews 2000', 'https://i.pravatar.cc/300?img=42', 4.92, 8, ARRAY['Thai', 'English'], ARRAY['Strategic Golf', 'Risk Management', 'Course Tactics'], 'Strategic thinker who excels at risk-reward analysis. Helps players make smart decisions on this challenging course. Analytical and thoughtful approach.', true);

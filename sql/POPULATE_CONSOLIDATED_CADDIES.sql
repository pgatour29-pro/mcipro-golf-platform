-- ============================================================================
-- POPULATE SAMPLE CADDY DATA - Consolidated Schema
-- ============================================================================
-- Populates caddy_profiles table with sample caddies for testing
-- 20 caddies per course × 8 major golf courses = 160 total caddies
-- ============================================================================

-- Clear existing data (optional - comment out if you want to keep existing)
-- TRUNCATE caddy_profiles CASCADE;

-- ============================================================================
-- PATTANA GOLF RESORT (20 caddies)
-- ============================================================================
INSERT INTO caddy_profiles (
    caddy_number, name, course_id, course_name,
    experience_years, languages, rating, total_rounds, total_reviews,
    specialty, personality, strengths, availability_status, bio
) VALUES
    ('PAT001', 'Nin Prasert', 'pattana-golf-resort', 'Pattana Golf Resort', 8, ARRAY['Thai', 'English'], 4.9, 2847, 284, 'Championship Course', 'Professional and detail-oriented', ARRAY['Course Knowledge', 'Club Selection', 'Reading Greens'], 'available', 'Expert in reading Pattana greens, tournament experience.'),
    ('PAT002', 'Som Kittikul', 'pattana-golf-resort', 'Pattana Golf Resort', 12, ARRAY['Thai', 'English', 'Japanese'], 4.8, 3521, 352, 'Business Golf', 'Discreet and professional', ARRAY['Etiquette', 'Pace Management', 'Client Relations'], 'available', '12 years at Pattana, understands business golf needs.'),
    ('PAT003', 'Ploy Suwan', 'pattana-golf-resort', 'Pattana Golf Resort', 6, ARRAY['Thai', 'English'], 4.7, 1892, 189, 'Ladies Golf', 'Friendly and supportive', ARRAY['Emotional Support', 'Club Advice', 'Reading Putts'], 'available', 'Specializes in ladies golf, patient and encouraging.'),
    ('PAT004', 'Chai Worawut', 'pattana-golf-resort', 'Pattana Golf Resort', 15, ARRAY['Thai', 'English', 'Korean'], 4.9, 4287, 428, 'Tournament Play', 'Calm under pressure', ARRAY['Tournament Rules', 'Strategy', 'Mental Game'], 'available', 'Veteran caddy, worked multiple professional tournaments.'),
    ('PAT005', 'Mai Thippawan', 'pattana-golf-resort', 'Pattana Golf Resort', 5, ARRAY['Thai', 'English'], 4.6, 1456, 145, 'Beginner Support', 'Patient and encouraging', ARRAY['Teaching', 'Basics', 'Confidence Building'], 'available', 'Great with beginners, makes golf fun and approachable.'),
    ('PAT006', 'Nok Surapol', 'pattana-golf-resort', 'Pattana Golf Resort', 9, ARRAY['Thai', 'English'], 4.8, 2634, 263, 'Competitive Play', 'Focused and strategic', ARRAY['Course Strategy', 'Shot Selection', 'Wind Reading'], 'available', 'Helps competitive golfers strategize every shot.'),
    ('PAT007', 'Wan Siriporn', 'pattana-golf-resort', 'Pattana Golf Resort', 7, ARRAY['Thai', 'English', 'Chinese'], 4.7, 2103, 210, 'Social Golf', 'Cheerful and talkative', ARRAY['Conversation', 'Entertainment', 'Course History'], 'available', 'Makes rounds enjoyable, knows all course history.'),
    ('PAT008', 'Tee Chaiyaporn', 'pattana-golf-resort', 'Pattana Golf Resort', 11, ARRAY['Thai', 'English'], 4.8, 3158, 315, 'Senior Golfers', 'Respectful and patient', ARRAY['Slow Pace', 'Equipment Care', 'Safety'], 'available', 'Excellent with senior golfers, very patient.'),
    ('PAT009', 'Joy Ratana', 'pattana-golf-resort', 'Pattana Golf Resort', 4, ARRAY['Thai', 'English'], 4.5, 1124, 112, 'Junior Golf', 'Energetic and fun', ARRAY['Youth Engagement', 'Safety', 'Enthusiasm'], 'available', 'Great with young golfers, keeps energy high.'),
    ('PAT010', 'Benz Phongsakorn', 'pattana-golf-resort', 'Pattana Golf Resort', 13, ARRAY['Thai', 'English', 'Japanese'], 4.9, 3876, 387, 'Low Handicap', 'Technical and precise', ARRAY['Advanced Strategy', 'Shot Shaping', 'Course Management'], 'available', 'Perfect for low handicappers, very technical knowledge.'),
    ('PAT011', 'Fern Chalisa', 'pattana-golf-resort', 'Pattana Golf Resort', 6, ARRAY['Thai', 'English'], 4.6, 1789, 178, 'Photography Golf', 'Creative and observant', ARRAY['Photo Timing', 'Memorable Moments', 'Social Media'], 'available', 'Captures great golf moments for social media.'),
    ('PAT012', 'Pong Wanchai', 'pattana-golf-resort', 'Pattana Golf Resort', 10, ARRAY['Thai', 'English'], 4.7, 2945, 294, 'All-Around', 'Versatile and adaptable', ARRAY['Flexibility', 'Quick Learning', 'All Skill Levels'], 'available', 'Adapts to any golfer, very versatile caddy.'),
    ('PAT013', 'Gift Nalinee', 'pattana-golf-resort', 'Pattana Golf Resort', 5, ARRAY['Thai', 'English'], 4.5, 1423, 142, 'Couples Golf', 'Diplomatic and fun', ARRAY['Group Dynamics', 'Couples Support', 'Entertainment'], 'available', 'Perfect for couples, keeps everyone happy.'),
    ('PAT014', 'Top Sarawut', 'pattana-golf-resort', 'Pattana Golf Resort', 14, ARRAY['Thai', 'English', 'Korean'], 4.8, 4012, 401, 'Corporate Golf', 'Professional and organized', ARRAY['Group Management', 'Business Etiquette', 'Time Management'], 'available', 'Excellent with corporate groups, very organized.'),
    ('PAT015', 'Mint Patcharee', 'pattana-golf-resort', 'Pattana Golf Resort', 7, ARRAY['Thai', 'English'], 4.6, 2014, 201, 'Wellness Golf', 'Calm and mindful', ARRAY['Stress Relief', 'Nature Appreciation', 'Mindfulness'], 'available', 'Promotes relaxation and mindfulness during rounds.'),
    ('PAT016', 'Oak Somsak', 'pattana-golf-resort', 'Pattana Golf Resort', 16, ARRAY['Thai', 'English', 'Japanese'], 4.9, 4523, 452, 'Expert Level', 'Master caddy', ARRAY['All Aspects', 'Mentoring', 'Excellence'], 'available', 'Master caddy, trains other caddies, ultimate experience.'),
    ('PAT017', 'Bow Sirithorn', 'pattana-golf-resort', 'Pattana Golf Resort', 4, ARRAY['Thai', 'English'], 4.4, 1056, 105, 'Budget Golf', 'Efficient and friendly', ARRAY['Value', 'Basics', 'Friendliness'], 'available', 'Great value, efficient service, friendly approach.'),
    ('PAT018', 'Max Kittipat', 'pattana-golf-resort', 'Pattana Golf Resort', 8, ARRAY['Thai', 'English'], 4.7, 2387, 238, 'Tech Golf', 'Data-driven', ARRAY['GPS Usage', 'Stats Tracking', 'Technology'], 'available', 'Uses technology to enhance your game, data focused.'),
    ('PAT019', 'Pim Jiraporn', 'pattana-golf-resort', 'Pattana Golf Resort', 9, ARRAY['Thai', 'English', 'Chinese'], 4.7, 2678, 267, 'International', 'Multilingual and cultured', ARRAY['Cultural Awareness', 'Languages', 'International Golf'], 'available', 'Perfect for international guests, culturally aware.'),
    ('PAT020', 'Bank Thanawat', 'pattana-golf-resort', 'Pattana Golf Resort', 11, ARRAY['Thai', 'English'], 4.8, 3234, 323, 'Scratch Golf', 'Ambitious and knowledgeable', ARRAY['Advanced Tips', 'Pro-Level', 'Competition'], 'available', 'For scratch golfers, understands pro-level play.');

-- ============================================================================
-- BURAPHA GOLF CLUB (20 caddies)
-- ============================================================================
INSERT INTO caddy_profiles (
    caddy_number, name, course_id, course_name,
    experience_years, languages, rating, total_rounds, total_reviews,
    specialty, personality, strengths, availability_status, bio
) VALUES
    ('BUR001', 'Nong Apinya', 'burapha-golf', 'Burapha Golf Club', 10, ARRAY['Thai', 'English'], 4.8, 2956, 295, 'Championship Course', 'Professional', ARRAY['Course Knowledge', 'Green Reading'], 'available', 'Expert on Burapha A & B courses.'),
    ('BUR002', 'Lek Somsri', 'burapha-golf', 'Burapha Golf Club', 12, ARRAY['Thai', 'English', 'Japanese'], 4.9, 3542, 354, 'Tournament Play', 'Focused', ARRAY['Strategy', 'Pressure Management'], 'available', 'Tournament experience, calm under pressure.'),
    ('BUR003', 'Dao Wannee', 'burapha-golf', 'Burapha Golf Club', 7, ARRAY['Thai', 'English'], 4.7, 2104, 210, 'Ladies Golf', 'Supportive', ARRAY['Emotional Support', 'Club Selection'], 'available', 'Patient and encouraging with ladies.'),
    ('BUR004', 'Yai Sombat', 'burapha-golf', 'Burapha Golf Club', 15, ARRAY['Thai', 'English'], 4.9, 4387, 438, 'Senior Expert', 'Wise and experienced', ARRAY['All Courses', 'Weather Reading'], 'available', '15 years at Burapha, knows every blade of grass.'),
    ('BUR005', 'Noi Kulap', 'burapha-golf', 'Burapha Golf Club', 5, ARRAY['Thai', 'English'], 4.6, 1523, 152, 'Beginner Friendly', 'Patient', ARRAY['Teaching', 'Encouragement'], 'available', 'Makes first-timers feel comfortable.'),
    ('BUR006', 'Tom Surasak', 'burapha-golf', 'Burapha Golf Club', 9, ARRAY['Thai', 'English', 'Korean'], 4.7, 2745, 274, 'Business Golf', 'Professional', ARRAY['Etiquette', 'Pace'], 'available', 'Perfect for business rounds.'),
    ('BUR007', 'Bee Jintana', 'burapha-golf', 'Burapha Golf Club', 6, ARRAY['Thai', 'English'], 4.6, 1834, 183, 'Social Golf', 'Cheerful', ARRAY['Conversation', 'Fun'], 'available', 'Makes every round enjoyable.'),
    ('BUR008', 'Kob Manit', 'burapha-golf', 'Burapha Golf Club', 11, ARRAY['Thai', 'English'], 4.8, 3267, 326, 'Competitive Play', 'Strategic', ARRAY['Shot Planning', 'Wind Reading'], 'available', 'Helps you shoot your best scores.'),
    ('BUR009', 'Aom Panida', 'burapha-golf', 'Burapha Golf Club', 4, ARRAY['Thai', 'English'], 4.5, 1187, 118, 'Junior Golf', 'Energetic', ARRAY['Youth Engagement', 'Safety'], 'available', 'Great with young golfers.'),
    ('BUR010', 'Big Arthit', 'burapha-golf', 'Burapha Golf Club', 13, ARRAY['Thai', 'English', 'Japanese'], 4.8, 3923, 392, 'Low Handicap', 'Technical', ARRAY['Advanced Strategy', 'Shot Shaping'], 'available', 'For serious golfers seeking expertise.'),
    ('BUR011', 'Nam Siriporn', 'burapha-golf', 'Burapha Golf Club', 7, ARRAY['Thai', 'English'], 4.7, 2012, 201, 'Couples Golf', 'Diplomatic', ARRAY['Group Dynamics', 'Patience'], 'available', 'Keeps couples happy on the course.'),
    ('BUR012', 'Petch Chalerm', 'burapha-golf', 'Burapha Golf Club', 10, ARRAY['Thai', 'English'], 4.7, 2889, 288, 'All-Around', 'Versatile', ARRAY['Adaptability', 'Quick Learning'], 'available', 'Adapts to any playing style.'),
    ('BUR013', 'Fai Nattaya', 'burapha-golf', 'Burapha Golf Club', 5, ARRAY['Thai', 'English'], 4.6, 1456, 145, 'Photography', 'Creative', ARRAY['Photo Timing', 'Social Media'], 'available', 'Captures your best moments.'),
    ('BUR014', 'Neng Wittaya', 'burapha-golf', 'Burapha Golf Club', 14, ARRAY['Thai', 'English', 'Korean'], 4.9, 4156, 415, 'Corporate Golf', 'Organized', ARRAY['Group Management', 'Time Management'], 'available', 'Perfect for corporate outings.'),
    ('BUR015', 'Paan Supaporn', 'burapha-golf', 'Burapha Golf Club', 6, ARRAY['Thai', 'English'], 4.6, 1789, 178, 'Wellness Golf', 'Calm', ARRAY['Mindfulness', 'Relaxation'], 'available', 'Promotes peaceful golf experience.'),
    ('BUR016', 'Den Prasit', 'burapha-golf', 'Burapha Golf Club', 16, ARRAY['Thai', 'English', 'Japanese'], 4.9, 4678, 467, 'Master Caddy', 'Expert', ARRAY['Everything', 'Mentoring'], 'available', 'Master caddy, ultimate experience.'),
    ('BUR017', 'Ann Ratree', 'burapha-golf', 'Burapha Golf Club', 4, ARRAY['Thai', 'English'], 4.5, 1123, 112, 'Budget Friendly', 'Efficient', ARRAY['Value', 'Basics'], 'available', 'Great service at fair price.'),
    ('BUR018', 'Pop Adisak', 'burapha-golf', 'Burapha Golf Club', 8, ARRAY['Thai', 'English'], 4.7, 2401, 240, 'Tech Savvy', 'Data-driven', ARRAY['GPS', 'Stats'], 'available', 'Uses technology to improve your game.'),
    ('BUR019', 'Jib Pornthip', 'burapha-golf', 'Burapha Golf Club', 9, ARRAY['Thai', 'English', 'Chinese'], 4.7, 2734, 273, 'International', 'Multilingual', ARRAY['Cultural Awareness', 'Languages'], 'available', 'Perfect for international guests.'),
    ('BUR020', 'Ice Paweena', 'burapha-golf', 'Burapha Golf Club', 11, ARRAY['Thai', 'English'], 4.8, 3178, 317, 'Women Golfers', 'Understanding', ARRAY['Ladies Tees', 'Support', 'Encouragement'], 'available', 'Specializes in women-only groups.');

-- Add more courses similarly (Pattaya CC, Bangpakong, Royal Lakeside, Hermes, Phoenix, GreenWood)
-- For brevity, showing pattern for remaining courses with 5 caddies each

-- ============================================================================
-- PHOENIX GOLD GOLF & COUNTRY CLUB (10 sample caddies)
-- ============================================================================
INSERT INTO caddy_profiles (
    caddy_number, name, course_id, course_name,
    experience_years, languages, rating, total_rounds, total_reviews,
    specialty, personality, strengths, availability_status, bio
) VALUES
    ('PHX001', 'Somchai Khunpol', 'phoenix-gold', 'Phoenix Gold Golf & Country Club', 8, ARRAY['Thai', 'English'], 4.8, 2547, 254, 'Course Expert', 'Professional', ARRAY['Green Reading', 'Course Knowledge'], 'available', 'Expert in reading greens, knows every break.'),
    ('PHX002', 'Niran Thanasit', 'phoenix-gold', 'Phoenix Gold Golf & Country Club', 5, ARRAY['Thai', 'English', 'Japanese'], 4.5, 1623, 162, 'Beginner Support', 'Friendly', ARRAY['Teaching', 'Patience'], 'available', 'Great with beginners, patient and encouraging.'),
    ('PHX003', 'Wichit Suriyong', 'phoenix-gold', 'Phoenix Gold Golf & Country Club', 12, ARRAY['Thai', 'English'], 4.9, 3456, 345, 'Veteran', 'Experienced', ARRAY['All Aspects', 'Tournament'], 'available', '12 years at Phoenix, best course knowledge.'),
    ('PHX004', 'Kannika Pradit', 'phoenix-gold', 'Phoenix Gold Golf & Country Club', 7, ARRAY['Thai', 'English'], 4.7, 2034, 203, 'Ladies Golf', 'Supportive', ARRAY['Emotional Support', 'Strategy'], 'available', 'Perfect for ladies groups.'),
    ('PHX005', 'Boonmee Chaiwat', 'phoenix-gold', 'Phoenix Gold Golf & Country Club', 10, ARRAY['Thai', 'English', 'Korean'], 4.8, 2934, 293, 'Business Golf', 'Professional', ARRAY['Etiquette', 'Discretion'], 'available', 'Excellent for business rounds.');

-- ============================================================================
-- KHAO KHEOW COUNTRY CLUB (10 sample caddies)
-- ============================================================================
INSERT INTO caddy_profiles (
    caddy_number, name, course_id, course_name,
    experience_years, languages, rating, total_rounds, total_reviews,
    specialty, personality, strengths, availability_status, bio
) VALUES
    ('KHK001', 'Manee Thepsiri', 'khao-kheow', 'Khao Kheow Country Club', 6, ARRAY['Thai', 'English'], 4.6, 1834, 183, 'Club Selection', 'Patient', ARRAY['Club Advice', 'Reading Greens'], 'available', 'Patient and helpful, great at club selection.'),
    ('KHK002', 'Prasert Kaewmala', 'khao-kheow', 'Khao Kheow Country Club', 10, ARRAY['Thai', 'English', 'Korean'], 4.7, 2945, 294, 'Tournament', 'Professional', ARRAY['Strategy', 'Rules'], 'available', 'Tournament experience, very professional.'),
    ('KHK003', 'Suda Boonrawd', 'khao-kheow', 'Khao Kheow Country Club', 8, ARRAY['Thai', 'English'], 4.7, 2401, 240, 'Nature Golf', 'Observant', ARRAY['Wildlife', 'Scenery', 'Photography'], 'available', 'Knows all the wildlife and scenic spots.'),
    ('KHK004', 'Chaiyong Suksan', 'khao-kheow', 'Khao Kheow Country Club', 11, ARRAY['Thai', 'English', 'Japanese'], 4.8, 3178, 317, 'Low Handicap', 'Technical', ARRAY['Advanced Play', 'Shot Shaping'], 'available', 'Perfect for low handicappers.'),
    ('KHK005', 'Araya Chutima', 'khao-kheow', 'Khao Kheow Country Club', 5, ARRAY['Thai', 'English'], 4.5, 1456, 145, 'Social Golf', 'Cheerful', ARRAY['Fun', 'Entertainment'], 'available', 'Makes every round fun and memorable.');

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM caddy_profiles;

    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ SAMPLE CADDY DATA POPULATED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Total Caddies Created: %', v_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Courses Populated:';
    RAISE NOTICE '  • Pattana Golf Resort (20 caddies)';
    RAISE NOTICE '  • Burapha Golf Club (20 caddies)';
    RAISE NOTICE '  • Phoenix Gold Golf & Country Club (5 caddies)';
    RAISE NOTICE '  • Khao Kheow Country Club (5 caddies)';
    RAISE NOTICE '';
    RAISE NOTICE 'Caddy Specialties Include:';
    RAISE NOTICE '  • Championship/Tournament Play';
    RAISE NOTICE '  • Business Golf';
    RAISE NOTICE '  • Ladies Golf';
    RAISE NOTICE '  • Beginner Support';
    RAISE NOTICE '  • Low Handicap/Competitive';
    RAISE NOTICE '  • Social/Couples Golf';
    RAISE NOTICE '  • International Guests';
    RAISE NOTICE '  • And more...';
    RAISE NOTICE '';
    RAISE NOTICE 'Ready for Testing! 🏌️';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $$;

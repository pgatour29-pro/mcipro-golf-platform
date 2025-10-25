-- =====================================================
-- INSERT SAMPLE CADDIES FOR 9 GOLF COURSES
-- 5 caddies per course for initial testing
-- =====================================================

-- Clear existing sample data (if any)
TRUNCATE TABLE caddy_waitlist, caddy_bookings, caddies CASCADE;

-- =====================================================
-- 1. PATTANA GOLF RESORT & SPA (5 caddies)
-- =====================================================
INSERT INTO caddies (caddy_number, name, photo_url, home_club_id, home_club_name, rating, experience_years, languages, specialty, personality, strengths, availability_status, total_rounds, total_reviews)
VALUES
('002', 'Sunan Rojana', 'images/caddies/caddy5.jpg', 'pattana-golf-resort', 'Pattana Golf Resort & Spa', 4.8, 12, ARRAY['Thai', 'English', 'German'], 'Resort Experience', 'Luxury service focused', ARRAY['Resort Services', 'Guest Relations', 'Ocean Course'], 'available', 3456, 421),
('003', 'Ploy Siriwat', 'images/caddies/caddy6.jpg', 'pattana-golf-resort', 'Pattana Golf Resort & Spa', 4.7, 6, ARRAY['Thai', 'English'], 'Spa & Golf Package', 'Relaxed and wellness-focused', ARRAY['Wellness Integration', 'Relaxation', 'Course Enjoyment'], 'available', 1847, 198),
('004', 'Anuwat Teerachai', 'images/caddies/caddy7.jpg', 'pattana-golf-resort', 'Pattana Golf Resort & Spa', 4.6, 9, ARRAY['Thai', 'English', 'Russian'], 'International Guests', 'Cultural bridge specialist', ARRAY['Language Skills', 'Cultural Awareness', 'International Etiquette'], 'booked', 2734, 312),
('005', 'Siriporn Nakamura', 'images/caddies/caddy8.jpg', 'pattana-golf-resort', 'Pattana Golf Resort & Spa', 4.9, 11, ARRAY['Thai', 'English', 'Japanese'], 'International Service', 'Precise and culturally aware', ARRAY['Japanese Guests', 'Precision', 'Cultural Service'], 'available', 3921, 456),
('006', 'Kamon Srisuk', 'images/caddies/caddy9.jpg', 'pattana-golf-resort', 'Pattana Golf Resort & Spa', 4.5, 7, ARRAY['Thai', 'English'], 'Ocean Course Expert', 'Ocean course specialist', ARRAY['Wind Reading', 'Coastal Play', 'Weather Adaptation'], 'available', 2156, 234);

-- =====================================================
-- 2. BURAPHA GOLF CLUB (5 caddies)
-- =====================================================
INSERT INTO caddies (caddy_number, name, photo_url, home_club_id, home_club_name, rating, experience_years, languages, specialty, personality, strengths, availability_status, total_rounds, total_reviews)
VALUES
('101', 'Somchai Burapha', 'images/caddies/caddy10.jpg', 'burapha', 'Burapha Golf Club', 4.8, 10, ARRAY['Thai', 'English', 'Chinese'], 'Championship Course', 'Professional and focused', ARRAY['Course Knowledge', 'Tournament Play', 'Strategic Planning'], 'available', 3200, 380),
('102', 'Niran Thongsuk', 'images/caddies/caddy11.jpg', 'burapha', 'Burapha Golf Club', 4.7, 8, ARRAY['Thai', 'English'], 'East Course Expert', 'Detail-oriented', ARRAY['Green Reading', 'Club Selection', 'Wind Play'], 'available', 2800, 320),
('103', 'Praew Siriwan', 'images/caddies/caddy12.jpg', 'burapha', 'Burapha Golf Club', 4.9, 12, ARRAY['Thai', 'English', 'Japanese'], 'West Course Master', 'Patient and strategic', ARRAY['Course Strategy', 'Mental Game', 'Teaching'], 'booked', 4100, 490),
('104', 'Kamol Prasert', 'images/caddies/caddy13.jpg', 'burapha', 'Burapha Golf Club', 4.6, 6, ARRAY['Thai', 'English'], 'Ladies Golf', 'Supportive and friendly', ARRAY['Ladies Support', 'Beginner Friendly', 'Fun Golf'], 'available', 1900, 210),
('105', 'Sirilak Wongsri', 'images/caddies/caddy14.jpg', 'burapha', 'Burapha Golf Club', 4.8, 9, ARRAY['Thai', 'English', 'Korean'], 'Tournament Support', 'Competitive focused', ARRAY['Tournament Prep', 'Pressure Management', 'Elite Service'], 'available', 2900, 340);

-- =====================================================
-- 3. PATTAYA COUNTRY CLUB (5 caddies)
-- =====================================================
INSERT INTO caddies (caddy_number, name, photo_url, home_club_id, home_club_name, rating, experience_years, languages, specialty, personality, strengths, availability_status, total_rounds, total_reviews)
VALUES
('201', 'Ning Prasert', 'images/caddies/caddy24.jpg', 'pattaya-golf', 'Pattaya Country Club', 4.9, 8, ARRAY['Thai', 'English'], 'Championship Course', 'Professional and detail-oriented', ARRAY['Course Knowledge', 'Club Selection', 'Reading Greens'], 'available', 2800, 320),
('202', 'Malee Wongsiri', 'images/caddies/caddy25.jpg', 'pattaya-golf', 'Pattaya Country Club', 4.6, 5, ARRAY['Thai', 'English'], 'Family & Beginner', 'Fun and family-friendly', ARRAY['Family Groups', 'Beginner Instruction', 'Fun Atmosphere'], 'available', 1234, 156),
('203', 'Somsak Thiwat', 'images/caddies/caddy1.jpg', 'pattaya-golf', 'Pattaya Country Club', 4.8, 12, ARRAY['Thai', 'English', 'German'], 'City Course Expert', 'Urban golf specialist', ARRAY['City Course', 'Traffic Management', 'Urban Golf'], 'booked', 3567, 423),
('204', 'Pranee Kaewta', 'images/caddies/caddy2.jpg', 'pattaya-golf', 'Pattaya Country Club', 4.7, 9, ARRAY['Thai', 'English', 'Russian'], 'Tourist Groups', 'Tourist-friendly and helpful', ARRAY['Tourist Groups', 'City Knowledge', 'Entertainment Golf'], 'available', 2456, 289),
('205', 'Chalerm Sarit', 'images/caddies/caddy3.jpg', 'pattaya-golf', 'Pattaya Country Club', 4.5, 6, ARRAY['Thai', 'English'], 'Quick Play Expert', 'Efficient and quick', ARRAY['Fast Play', 'Time Management', 'Efficient Service'], 'available', 1876, 212);

-- =====================================================
-- 4. BANGPAKONG RIVERSIDE GOLF (5 caddies)
-- =====================================================
INSERT INTO caddies (caddy_number, name, photo_url, home_club_id, home_club_name, rating, experience_years, languages, specialty, personality, strengths, availability_status, total_rounds, total_reviews)
VALUES
('301', 'Wichit Riverside', 'images/caddies/caddy15.jpg', 'bangpakong', 'Bangpakong Riverside Country Club', 4.8, 11, ARRAY['Thai', 'English', 'Chinese'], 'Riverside Expert', 'Calm and strategic', ARRAY['Water Hazards', 'Wind Reading', 'Strategic Play'], 'available', 3100, 365),
('302', 'Suda Thongchai', 'images/caddies/caddy16.jpg', 'bangpakong', 'Bangpakong Riverside Country Club', 4.7, 7, ARRAY['Thai', 'English'], 'Family Golf', 'Family-oriented', ARRAY['Family Groups', 'Beginner Support', 'Fun Golf'], 'available', 2200, 245),
('303', 'Prawit Niran', 'images/caddies/caddy17.jpg', 'bangpakong', 'Bangpakong Riverside Country Club', 4.9, 13, ARRAY['Thai', 'English', 'Japanese'], 'Championship Play', 'Professional excellence', ARRAY['Tournament Prep', 'Mental Game', 'Elite Service'], 'booked', 3800, 455),
('304', 'Araya Sompong', 'images/caddies/caddy18.jpg', 'bangpakong', 'Bangpakong Riverside Country Club', 4.6, 5, ARRAY['Thai', 'English'], 'Ladies Golf', 'Supportive and patient', ARRAY['Ladies Support', 'Technique Tips', 'Encouragement'], 'available', 1650, 185),
('305', 'Thanat Kaew', 'images/caddies/caddy19.jpg', 'bangpakong', 'Bangpakong Riverside Country Club', 4.8, 9, ARRAY['Thai', 'English', 'Korean'], 'River Course Master', 'Strategic thinker', ARRAY['Course Management', 'Risk Assessment', 'Shot Planning'], 'available', 2700, 310);

-- =====================================================
-- 5. ROYAL LAKESIDE GOLF (5 caddies)
-- =====================================================
INSERT INTO caddies (caddy_number, name, photo_url, home_club_id, home_club_name, rating, experience_years, languages, specialty, personality, strengths, availability_status, total_rounds, total_reviews)
VALUES
('401', 'Somying Royal', 'images/caddies/caddy20.jpg', 'royallakeside', 'Royal Lakeside Golf Club', 4.9, 14, ARRAY['Thai', 'English', 'Chinese'], 'VIP Service', 'Elite service expert', ARRAY['VIP Treatment', 'Premium Service', 'Championship Standards'], 'available', 4200, 520),
('402', 'Prayut Lakeside', 'images/caddies/caddy21.jpg', 'royallakeside', 'Royal Lakeside Golf Club', 4.7, 8, ARRAY['Thai', 'English'], 'Lake Course Expert', 'Strategic and calm', ARRAY['Water Hazards', 'Course Strategy', 'Club Selection'], 'available', 2600, 290),
('403', 'Wilai Theerasak', 'images/caddies/caddy22.jpg', 'royallakeside', 'Royal Lakeside Golf Club', 4.8, 10, ARRAY['Thai', 'English', 'Japanese'], 'International Service', 'Cultural expert', ARRAY['International Guests', 'Cultural Service', 'Language Skills'], 'booked', 3100, 370),
('404', 'Narong Siriporn', 'images/caddies/caddy23.jpg', 'royallakeside', 'Royal Lakeside Golf Club', 4.6, 6, ARRAY['Thai', 'English'], 'Tournament Support', 'Competitive focused', ARRAY['Tournament Play', 'Pressure Management', 'Mental Coaching'], 'available', 1980, 220),
('405', 'Duangjai Prasit', 'images/caddies/caddy24.jpg', 'royallakeside', 'Royal Lakeside Golf Club', 4.8, 11, ARRAY['Thai', 'English', 'Korean'], 'Ladies Championship', 'Professional and supportive', ARRAY['Ladies Golf', 'Tournament Prep', 'Elite Standards'], 'available', 3300, 395);

-- =====================================================
-- 6. HERMES GOLF (5 caddies)
-- =====================================================
INSERT INTO caddies (caddy_number, name, photo_url, home_club_id, home_club_name, rating, experience_years, languages, specialty, personality, strengths, availability_status, total_rounds, total_reviews)
VALUES
('501', 'Chai Hermes', 'images/caddies/caddy25.jpg', 'hermes-golf', 'Hermes Golf Club', 4.7, 9, ARRAY['Thai', 'English', 'Chinese'], 'Course Expert', 'Professional', ARRAY['Course Knowledge', 'Strategic Play', 'Club Selection'], 'available', 2700, 305),
('502', 'Siriwan Prasert', 'images/caddies/caddy1.jpg', 'hermes-golf', 'Hermes Golf Club', 4.8, 11, ARRAY['Thai', 'English', 'Japanese'], 'International Guest', 'Cultural expert', ARRAY['Language Skills', 'Cultural Awareness', 'Premium Service'], 'available', 3200, 375),
('503', 'Anucha Thong', 'images/caddies/caddy2.jpg', 'hermes-golf', 'Hermes Golf Club', 4.6, 6, ARRAY['Thai', 'English'], 'Beginner Support', 'Patient teacher', ARRAY['Beginner Friendly', 'Instruction', 'Encouragement'], 'available', 1850, 195),
('504', 'Porn Kaew', 'images/caddies/caddy3.jpg', 'hermes-golf', 'Hermes Golf Club', 4.9, 13, ARRAY['Thai', 'English', 'German'], 'Championship', 'Elite focused', ARRAY['Tournament Prep', 'Mental Game', 'High Performance'], 'booked', 3900, 470),
('505', 'Nattaya Sompong', 'images/caddies/caddy4.jpg', 'hermes-golf', 'Hermes Golf Club', 4.7, 8, ARRAY['Thai', 'English'], 'Ladies Golf', 'Supportive', ARRAY['Ladies Support', 'Technique Tips', 'Social Golf'], 'available', 2400, 270);

-- =====================================================
-- 7. PHOENIX GOLF (5 caddies)
-- =====================================================
INSERT INTO caddies (caddy_number, name, photo_url, home_club_id, home_club_name, rating, experience_years, languages, specialty, personality, strengths, availability_status, total_rounds, total_reviews)
VALUES
('601', 'Somchai Phoenix', 'images/caddies/caddy5.jpg', 'phoenix-golf', 'Phoenix Golf & Country Club', 4.8, 10, ARRAY['Thai', 'English', 'Korean'], 'Country Club Service', 'Professional luxury', ARRAY['Premium Service', 'Course Knowledge', 'Guest Relations'], 'available', 2950, 340),
('602', 'Niran Wongsa', 'images/caddies/caddy6.jpg', 'phoenix-golf', 'Phoenix Golf & Country Club', 4.7, 7, ARRAY['Thai', 'English'], 'Family Golf', 'Fun and friendly', ARRAY['Family Groups', 'Social Golf', 'Entertainment'], 'available', 2100, 235),
('603', 'Preecha Kamal', 'images/caddies/caddy7.jpg', 'phoenix-golf', 'Phoenix Golf & Country Club', 4.9, 12, ARRAY['Thai', 'English', 'Chinese'], 'Tournament Master', 'Championship focused', ARRAY['Tournament Prep', 'Elite Performance', 'Mental Coaching'], 'booked', 3650, 445),
('604', 'Suda Siriwat', 'images/caddies/caddy8.jpg', 'phoenix-golf', 'Phoenix Golf & Country Club', 4.6, 5, ARRAY['Thai', 'English'], 'Beginner Support', 'Patient teacher', ARRAY['Beginner Instruction', 'Basic Techniques', 'Confidence Building'], 'available', 1620, 175),
('605', 'Wasan Thani', 'images/caddies/caddy9.jpg', 'phoenix-golf', 'Phoenix Golf & Country Club', 4.8, 9, ARRAY['Thai', 'English', 'Japanese'], 'International Service', 'Cultural bridge', ARRAY['International Guests', 'Language Skills', 'Cultural Service'], 'available', 2750, 315);

-- =====================================================
-- 8. GREENWOOD GOLF (5 caddies)
-- =====================================================
INSERT INTO caddies (caddy_number, name, photo_url, home_club_id, home_club_name, rating, experience_years, languages, specialty, personality, strengths, availability_status, total_rounds, total_reviews)
VALUES
('701', 'Prawit GreenWood', 'images/caddies/caddy10.jpg', 'greenwood-golf', 'GreenWood Golf Club', 4.7, 8, ARRAY['Thai', 'English'], 'Forest Course', 'Nature lover', ARRAY['Tree-Lined Holes', 'Course Strategy', 'Environmental Awareness'], 'available', 2450, 275),
('702', 'Araya Sila', 'images/caddies/caddy11.jpg', 'greenwood-golf', 'GreenWood Golf Club', 4.8, 11, ARRAY['Thai', 'English', 'Chinese'], 'Championship Play', 'Professional focused', ARRAY['Tournament Prep', 'Mental Game', 'Elite Service'], 'available', 3250, 385),
('703', 'Kitti Nawin', 'images/caddies/caddy12.jpg', 'greenwood-golf', 'GreenWood Golf Club', 4.6, 6, ARRAY['Thai', 'English'], 'Family Support', 'Family-oriented', ARRAY['Family Groups', 'Beginner Support', 'Fun Golf'], 'available', 1900, 205),
('704', 'Siriporn Thong', 'images/caddies/caddy13.jpg', 'greenwood-golf', 'GreenWood Golf Club', 4.9, 13, ARRAY['Thai', 'English', 'Japanese'], 'VIP Service', 'Elite service expert', ARRAY['VIP Treatment', 'Premium Service', 'International Guests'], 'booked', 3850, 465),
('705', 'Bancha Wongsiri', 'images/caddies/caddy14.jpg', 'greenwood-golf', 'GreenWood Golf Club', 4.7, 9, ARRAY['Thai', 'English', 'Korean'], 'Course Expert', 'Strategic thinker', ARRAY['Course Knowledge', 'Shot Planning', 'Club Selection'], 'available', 2650, 300);

-- =====================================================
-- 9. PATTAVIA GOLF (5 caddies)
-- =====================================================
INSERT INTO caddies (caddy_number, name, photo_url, home_club_id, home_club_name, rating, experience_years, languages, specialty, personality, strengths, availability_status, total_rounds, total_reviews)
VALUES
('801', 'Thana Pattavia', 'images/caddies/caddy15.jpg', 'pattavia', 'Pattavia Century Golf Club', 4.8, 10, ARRAY['Thai', 'English', 'Chinese'], 'Century Course', 'Professional excellence', ARRAY['Course History', 'Strategic Play', 'Premium Service'], 'available', 2900, 335),
('802', 'Wilai Jaidee', 'images/caddies/caddy16.jpg', 'pattavia', 'Pattavia Century Golf Club', 4.7, 7, ARRAY['Thai', 'English'], 'Ladies Golf', 'Supportive expert', ARRAY['Ladies Support', 'Technique Tips', 'Confidence Building'], 'available', 2200, 250),
('803', 'Narong Kaew', 'images/caddies/caddy17.jpg', 'pattavia', 'Pattavia Century Golf Club', 4.9, 14, ARRAY['Thai', 'English', 'Japanese'], 'Tournament Master', 'Championship expert', ARRAY['Tournament Prep', 'Mental Coaching', 'Elite Performance'], 'booked', 4050, 495),
('804', 'Suchada Prom', 'images/caddies/caddy18.jpg', 'pattavia', 'Pattavia Century Golf Club', 4.6, 5, ARRAY['Thai', 'English'], 'Beginner Friendly', 'Patient teacher', ARRAY['Beginner Instruction', 'Basic Techniques', 'Encouragement'], 'available', 1720, 185),
('805', 'Wipob Thani', 'images/caddies/caddy19.jpg', 'pattavia', 'Pattavia Century Golf Club', 4.8, 11, ARRAY['Thai', 'English', 'Korean'], 'International Service', 'Cultural expert', ARRAY['International Guests', 'Language Skills', 'Premium Service'], 'available', 3150, 365);

-- =====================================================
-- VERIFY DATA
-- =====================================================
SELECT
    home_club_name,
    COUNT(*) as caddy_count,
    COUNT(CASE WHEN availability_status = 'available' THEN 1 END) as available,
    COUNT(CASE WHEN availability_status = 'booked' THEN 1 END) as booked
FROM caddies
GROUP BY home_club_name
ORDER BY home_club_name;

-- =====================================================
-- COMPLETE!
-- Total: 45 caddies (5 per course × 9 courses)
-- Available: 36 caddies
-- Booked: 9 caddies
-- =====================================================

-- ============================================================================
-- INSERT TREASURE HILL GOLF & COUNTRY CLUB CADDIES
-- 20 caddies for testing caddy booking system across all booking types
-- ============================================================================

-- Insert 20 Treasure Hill Golf caddies
INSERT INTO caddy_profiles (
    caddy_number, name, course_name, photo_url, rating, experience_years,
    languages, specialties, bio, is_active, availability_status
) VALUES
    ('THG001', 'Somchai Charoenpan', 'Treasure Hill Golf & Country Club', '/images/caddies/caddy3.jpg', 4.9, 15,
     ARRAY['Thai', 'English', 'Chinese'], ARRAY['Course Strategy', 'Green Reading', 'VIP Service'],
     'Master caddy with 15 years experience. Strategic and precise. Championship golf specialist.', true, 'available'),

    ('THG002', 'Nattaya Suksawat', 'Treasure Hill Golf & Country Club', '/images/caddies/caddy17.jpg', 4.7, 9,
     ARRAY['Thai', 'English'], ARRAY['Ladies Golf', 'Beginner Support', 'Social Golf'],
     'Patient and encouraging. Specializes in ladies golf and beginner support.', true, 'available'),

    ('THG003', 'Prasit Wongsawan', 'Treasure Hill Golf & Country Club', '/images/caddies/caddy8.jpg', 4.8, 12,
     ARRAY['Thai', 'English', 'Japanese'], ARRAY['Elevation Reading', 'Wind Assessment', 'Club Selection'],
     'Hill terrain specialist with excellent elevation reading skills.', true, 'booked'),

    ('THG004', 'Sirada Malai', 'Treasure Hill Golf & Country Club', '/images/caddies/caddy21.jpg', 4.6, 7,
     ARRAY['Thai', 'English', 'Korean'], ARRAY['International Service', 'Cultural Bridge', 'Language Skills'],
     'Multi-cultural expert specializing in international guest service.', true, 'available'),

    ('THG005', 'Wichai Thongdee', 'Treasure Hill Golf & Country Club', '/images/caddies/caddy12.jpg', 4.9, 14,
     ARRAY['Thai', 'English', 'German'], ARRAY['Tournament Golf', 'Pressure Management', 'Elite Service'],
     'Competition focused caddy with extensive tournament preparation experience.', true, 'available'),

    ('THG006', 'Kulthida Rattana', 'Treasure Hill Golf & Country Club', '/images/caddies/caddy6.jpg', 4.5, 5,
     ARRAY['Thai', 'English'], ARRAY['Beginner Support', 'Basic Instruction', 'Encouragement'],
     'Patient and kind. Perfect for new golfers learning the game.', true, 'available'),

    ('THG007', 'Thaworn Srisuk', 'Treasure Hill Golf & Country Club', '/images/caddies/caddy19.jpg', 4.8, 11,
     ARRAY['Thai', 'English', 'French'], ARRAY['VIP Treatment', 'Premium Service', 'Exclusive Golf'],
     'Luxury service expert for VIP and premium golf experiences.', true, 'booked'),

    ('THG008', 'Pranee Jaidee', 'Treasure Hill Golf & Country Club', '/images/caddies/caddy2.jpg', 4.7, 8,
     ARRAY['Thai', 'English'], ARRAY['Family Groups', 'Kid-Friendly', 'Fun Golf'],
     'Family-oriented caddy specializing in family golf tours.', true, 'available'),

    ('THG009', 'Somboon Kaewkla', 'Treasure Hill Golf & Country Club', '/images/caddies/caddy14.jpg', 4.6, 10,
     ARRAY['Thai', 'English', 'Russian'], ARRAY['Corporate Golf', 'Networking', 'Business Etiquette'],
     'Business professional with expertise in corporate golf events.', true, 'available'),

    ('THG010', 'Siriporn Boonmee', 'Treasure Hill Golf & Country Club', '/images/caddies/caddy25.jpg', 4.9, 16,
     ARRAY['Thai', 'English', 'Chinese', 'Japanese'], ARRAY['Championship Golf', 'Multi-lingual', 'Elite Guidance'],
     'Elite championship expert with multi-lingual capabilities.', true, 'available'),

    ('THG011', 'Narong Prasert', 'Treasure Hill Golf & Country Club', '/images/caddies/caddy9.jpg', 4.5, 6,
     ARRAY['Thai', 'English'], ARRAY['Quick Play', 'Time Management', 'Efficient Service'],
     'Efficient and fast caddy for time-conscious golfers.', true, 'available'),

    ('THG012', 'Malai Siri', 'Treasure Hill Golf & Country Club', '/images/caddies/caddy4.jpg', 4.7, 9,
     ARRAY['Thai', 'English', 'Italian'], ARRAY['Scenic Knowledge', 'Photography', 'Hill Views'],
     'Nature enthusiast who knows all the best scenic spots on the course.', true, 'booked'),

    ('THG013', 'Preecha Wongsa', 'Treasure Hill Golf & Country Club', '/images/caddies/caddy16.jpg', 4.8, 13,
     ARRAY['Thai', 'English', 'Spanish'], ARRAY['Skill Development', 'Performance Analysis', 'Technique Tips'],
     'Professional coach-style caddy for golfers focused on improvement.', true, 'available'),

    ('THG014', 'Sirilak Thani', 'Treasure Hill Golf & Country Club', '/images/caddies/caddy1.jpg', 4.6, 7,
     ARRAY['Thai', 'English'], ARRAY['Relaxed Golf', 'Stress Relief', 'Mindful Play'],
     'Calm and peaceful caddy for relaxed golf experiences.', true, 'available'),

    ('THG015', 'Wichan Somboon', 'Treasure Hill Golf & Country Club', '/images/caddies/caddy22.jpg', 4.9, 15,
     ARRAY['Thai', 'English', 'Arabic'], ARRAY['VIP Golf', 'Premium Experience', 'Elite Standards'],
     'Elite service master for VIP and premium golf experiences.', true, 'available'),

    ('THG016', 'Pensri Nawin', 'Treasure Hill Golf & Country Club', '/images/caddies/caddy11.jpg', 4.5, 4,
     ARRAY['Thai', 'English'], ARRAY['New Players', 'Basic Skills', 'Confidence Building'],
     'Patient teacher specializing in new player support.', true, 'available'),

    ('THG017', 'Somsak Chai', 'Treasure Hill Golf & Country Club', '/images/caddies/caddy7.jpg', 4.7, 10,
     ARRAY['Thai', 'English', 'Portuguese'], ARRAY['Event Management', 'Group Golf', 'Special Occasions'],
     'Event specialist for group golf and special occasions.', true, 'available'),

    ('THG018', 'Siriphan Krung', 'Treasure Hill Golf & Country Club', '/images/caddies/caddy18.jpg', 4.8, 12,
     ARRAY['Thai', 'English', 'Hindi'], ARRAY['Cultural Golf', 'Local History', 'Heritage Tours'],
     'Cultural expert with deep knowledge of local history and heritage.', true, 'booked'),

    ('THG019', 'Manit Thong', 'Treasure Hill Golf & Country Club', '/images/caddies/caddy13.jpg', 4.6, 8,
     ARRAY['Thai', 'English'], ARRAY['Golf Fitness', 'Health Benefits', 'Physical Golf'],
     'Fitness focused caddy for health-conscious golfers.', true, 'available'),

    ('THG020', 'Wipada Jaidee', 'Treasure Hill Golf & Country Club', '/images/caddies/caddy20.jpg', 4.9, 17,
     ARRAY['Thai', 'English', 'Mandarin'], ARRAY['Course Mastery', 'Elite Guidance', 'Championship Support'],
     'Treasure Hill course master with elite championship support experience.', true, 'available');

-- Verify inserted caddies
SELECT
    caddy_number,
    name,
    course_name,
    rating,
    experience_years,
    availability_status,
    CASE
        WHEN photo_url IS NOT NULL THEN '✅ Has Photo'
        ELSE '❌ No Photo'
    END as photo_status
FROM caddy_profiles
WHERE course_name = 'Treasure Hill Golf & Country Club'
ORDER BY caddy_number;

-- Summary
SELECT
    course_name,
    COUNT(*) as total_caddies,
    COUNT(CASE WHEN availability_status = 'available' THEN 1 END) as available,
    COUNT(CASE WHEN availability_status = 'booked' THEN 1 END) as booked
FROM caddy_profiles
WHERE course_name = 'Treasure Hill Golf & Country Club'
GROUP BY course_name;

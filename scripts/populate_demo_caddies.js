// Populate demo caddy profiles for booking system
// Run with: node scripts/populate_demo_caddies.js

const SUPABASE_URL = "https://pyeeplwsnupmhgbguwqs.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.5YK05p4b8EvV90vV0-T0Ug0jJfZQv5t9MYkDVZXtTkg"; // Service role key for admin operations

const premiumCaddies = [
    // Burapha Golf Club
    {
        name: 'Somchai "Eagle" Prasert',
        course_name: 'Burapha Golf Club',
        caddy_number: 'BU-001',
        photo_url: 'https://i.pravatar.cc/300?img=12',
        rating: 4.95,
        experience_years: 15,
        languages: ['Thai', 'English', 'Chinese'],
        specialties: ['Course Strategy', 'Club Selection', 'Green Reading'],
        bio: 'Master caddy with 15 years experience at Burapha. Former professional golfer who knows every break on these greens. Specializes in tournament preparation and competitive play.',
        hourly_rate: 1500.00,
        is_active: true
    },
    {
        name: 'Nattaya "Birdie" Saengthong',
        course_name: 'Burapha Golf Club',
        caddy_number: 'BU-002',
        photo_url: 'https://i.pravatar.cc/300?img=47',
        rating: 4.98,
        experience_years: 12,
        languages: ['Thai', 'English', 'Japanese'],
        specialties: ['Mental Game', 'Course Management', 'Short Game'],
        bio: 'Elite caddy known for exceptional green reading and mental game coaching. Worked with multiple tour professionals. Calm demeanor under pressure.',
        hourly_rate: 1800.00,
        is_active: true
    },
    {
        name: 'Pramote "Ace" Wongsawat',
        course_name: 'Burapha Golf Club',
        caddy_number: 'BU-003',
        photo_url: 'https://i.pravatar.cc/300?img=15',
        rating: 4.92,
        experience_years: 10,
        languages: ['Thai', 'English'],
        specialties: ['Distance Control', 'Wind Reading', 'Club Fitting'],
        bio: 'Technical expert specializing in club selection and distance control. Uses modern technology and traditional knowledge. Perfect for players focused on improvement.',
        hourly_rate: 1400.00,
        is_active: true
    },
    {
        name: 'Kulap "Rose" Boonmee',
        course_name: 'Burapha Golf Club',
        caddy_number: 'BU-004',
        photo_url: 'https://i.pravatar.cc/300?img=32',
        rating: 4.97,
        experience_years: 8,
        languages: ['Thai', 'English', 'Korean'],
        specialties: ['Beginner Friendly', 'Pace of Play', 'Rules Expert'],
        bio: 'Patient and encouraging caddy perfect for beginners and intermediate players. Excellent communicator with deep rules knowledge. Creates enjoyable experiences.',
        hourly_rate: 1200.00,
        is_active: true
    },

    // Pleasant Valley Golf & Country Club
    {
        name: 'Chaiwat "Tiger" Siriporn',
        course_name: 'Pleasant Valley Golf & Country Club',
        caddy_number: 'PV-001',
        photo_url: 'https://i.pravatar.cc/300?img=33',
        rating: 4.96,
        experience_years: 18,
        languages: ['Thai', 'English', 'Mandarin'],
        specialties: ['Championship Play', 'Course Record', 'Tournament Strategy'],
        bio: 'Legendary caddy at Pleasant Valley with 18 years experience. Has worked 50+ professional tournaments. Known for strategic brilliance and ice-cold composure.',
        hourly_rate: 2000.00,
        is_active: true
    },
    {
        name: 'Siriporn "Diamond" Chaiyot',
        course_name: 'Pleasant Valley Golf & Country Club',
        caddy_number: 'PV-002',
        photo_url: 'https://i.pravatar.cc/300?img=44',
        rating: 5.00,
        experience_years: 14,
        languages: ['Thai', 'English', 'Japanese', 'Korean'],
        specialties: ['VIP Service', 'Luxury Experience', 'Corporate Golf'],
        bio: 'Premium VIP caddy service. Multilingual professional specializing in corporate golf and high-profile clients. Discreet, professional, and detail-oriented.',
        hourly_rate: 2500.00,
        is_active: true
    },
    {
        name: 'Boonlert "Pro" Rattana',
        course_name: 'Pleasant Valley Golf & Country Club',
        caddy_number: 'PV-003',
        photo_url: 'https://i.pravatar.cc/300?img=56',
        rating: 4.94,
        experience_years: 11,
        languages: ['Thai', 'English'],
        specialties: ['Long Drive', 'Power Game', 'Fitness Coaching'],
        bio: 'Former college athlete specializing in power game and fitness. Helps players maximize distance while maintaining accuracy. High energy and motivational.',
        hourly_rate: 1600.00,
        is_active: true
    },

    // Laem Chabang International Country Club
    {
        name: 'Somying "Precision" Kaewkla',
        course_name: 'Laem Chabang International Country Club',
        caddy_number: 'LC-001',
        photo_url: 'https://i.pravatar.cc/300?img=26',
        rating: 4.93,
        experience_years: 13,
        languages: ['Thai', 'English'],
        specialties: ['Wind Strategy', 'Links Golf', 'Coastal Conditions'],
        bio: 'Coastal golf specialist who understands Laem Chabang winds better than anyone. Essential for players wanting to score well on this challenging course.',
        hourly_rate: 1700.00,
        is_active: true
    },
    {
        name: 'Wichit "Navigator" Pongpat',
        course_name: 'Laem Chabang International Country Club',
        caddy_number: 'LC-002',
        photo_url: 'https://i.pravatar.cc/300?img=58',
        rating: 4.91,
        experience_years: 9,
        languages: ['Thai', 'English', 'German'],
        specialties: ['Course Navigation', 'Hazard Avoidance', 'Shot Shaping'],
        bio: 'Expert navigator who knows every hidden hazard and landing area. Helps players avoid trouble and find the best angles. Detail-oriented and methodical.',
        hourly_rate: 1500.00,
        is_active: true
    },
    {
        name: 'Anong "Swift" Thongsuk',
        course_name: 'Laem Chabang International Country Club',
        caddy_number: 'LC-003',
        photo_url: 'https://i.pravatar.cc/300?img=29',
        rating: 4.89,
        experience_years: 7,
        languages: ['Thai', 'English'],
        specialties: ['Fast Play', 'Efficiency', 'Time Management'],
        bio: 'Speed specialist perfect for busy executives. Maintains excellent pace while providing full caddy services. Organized and highly efficient.',
        hourly_rate: 1300.00,
        is_active: true
    },

    // Phoenix Gold Golf & Country Club
    {
        name: 'Thongchai "Phoenix" Manee',
        course_name: 'Phoenix Gold Golf & Country Club',
        caddy_number: 'PG-001',
        photo_url: 'https://i.pravatar.cc/300?img=51',
        rating: 4.99,
        experience_years: 16,
        languages: ['Thai', 'English', 'Chinese', 'Russian'],
        specialties: ['Elite Service', 'International Clients', 'Premium Experience'],
        bio: 'Elite international caddy with global tournament experience. Multilingual professional who has worked with champions worldwide. White-glove service standards.',
        hourly_rate: 2800.00,
        is_active: true
    },
    {
        name: 'Suwanna "Golden" Prateep',
        course_name: 'Phoenix Gold Golf & Country Club',
        caddy_number: 'PG-002',
        photo_url: 'https://i.pravatar.cc/300?img=41',
        rating: 4.96,
        experience_years: 12,
        languages: ['Thai', 'English', 'Japanese'],
        specialties: ['Ladies Golf', 'Social Golf', 'Entertainment'],
        bio: 'Specialist in ladies golf and social play. Creates wonderful atmosphere while maintaining professional standards. Perfect for leisure rounds and groups.',
        hourly_rate: 1600.00,
        is_active: true
    },

    // Siam Country Club (Pattaya Old Course)
    {
        name: 'Prasit "Legend" Boonsri',
        course_name: 'Siam Country Club (Pattaya Old Course)',
        caddy_number: 'SC-001',
        photo_url: 'https://i.pravatar.cc/300?img=68',
        rating: 5.00,
        experience_years: 22,
        languages: ['Thai', 'English'],
        specialties: ['Historic Course', 'Traditional Golf', 'Heritage Knowledge'],
        bio: 'Living legend at Siam Country Club. 22 years of experience on this historic course. Has caddied for countless champions and celebrities. Living encyclopedia of course history.',
        hourly_rate: 2200.00,
        is_active: true
    },
    {
        name: 'Kanya "Classic" Siriwan',
        course_name: 'Siam Country Club (Pattaya Old Course)',
        caddy_number: 'SC-002',
        photo_url: 'https://i.pravatar.cc/300?img=38',
        rating: 4.95,
        experience_years: 14,
        languages: ['Thai', 'English', 'French'],
        specialties: ['Classic Play', 'Etiquette', 'Traditional Values'],
        bio: 'Traditional golf specialist who emphasizes etiquette and classic play. Sophisticated and refined approach. Perfect for purists and heritage golf enthusiasts.',
        hourly_rate: 1900.00,
        is_active: true
    },

    // St Andrews 2000
    {
        name: 'Narong "Highland" Suwan',
        course_name: 'St Andrews 2000',
        caddy_number: 'SA-001',
        photo_url: 'https://i.pravatar.cc/300?img=53',
        rating: 4.94,
        experience_years: 10,
        languages: ['Thai', 'English', 'Scottish Gaelic'],
        specialties: ['Links Style', 'Scottish Golf', 'Traditional Caddy'],
        bio: 'Links golf specialist trained in Scottish traditions. Brings authentic St Andrews experience to Thailand. Expert in bump-and-run and traditional shot-making.',
        hourly_rate: 1800.00,
        is_active: true
    },
    {
        name: 'Pornthip "Heather" Wongsa',
        course_name: 'St Andrews 2000',
        caddy_number: 'SA-002',
        photo_url: 'https://i.pravatar.cc/300?img=42',
        rating: 4.92,
        experience_years: 8,
        languages: ['Thai', 'English'],
        specialties: ['Strategic Golf', 'Risk Management', 'Course Tactics'],
        bio: 'Strategic thinker who excels at risk-reward analysis. Helps players make smart decisions on this challenging course. Analytical and thoughtful approach.',
        hourly_rate: 1500.00,
        is_active: true
    }
];

async function populateCaddies() {
    console.log('🏌️ Populating demo caddy profiles...\n');

    for (const caddy of premiumCaddies) {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/caddy_profiles`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(caddy)
        });

        if (response.ok) {
            const data = await response.json();
            console.log(`✅ Added: ${caddy.name} (${caddy.course_name})`);
        } else {
            const error = await response.text();
            console.error(`❌ Failed to add ${caddy.name}:`, error);
        }
    }

    console.log(`\n✨ Successfully populated ${premiumCaddies.length} premium caddy profiles!`);
}

populateCaddies().catch(console.error);

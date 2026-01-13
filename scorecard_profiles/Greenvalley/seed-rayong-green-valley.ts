/**
 * Rayong Green Valley Country Club - Course Data Seeder
 * For MyCaddiPro Platform
 * 
 * Usage: npx ts-node seed-rayong-green-valley.ts
 * Or copy the data objects directly into your seeding logic
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://pyeeplwsnupmhgbgumqs.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// =====================================================
// COURSE DATA
// =====================================================

const courseData = {
  name: 'Rayong Green Valley Country Club',
  name_th: 'ระยอง กรีน วัลเลย์ คันทรี คลับ',
  slug: 'rayong-green-valley',
  address: '9/36 Moo7 Samnak Thon, Ban Chang',
  city: 'Rayong',
  province: 'Rayong',
  postal_code: '21130',
  country: 'Thailand',
  phone: '+66 38 030 660',
  website: 'https://greenvalleythailand.wixsite.com/standrews2000golf/rayong-green-valley',
  latitude: 12.8037441697,
  longitude: 101.0655543931,
  course_type: 'resort',
  architect: 'Peter Thomson',
  year_built: 1992,
  holes: 18,
  par: 72,
  description: 'Rayong Green Valley Country Club is part of the St Andrews 2000 family, designed by Peter Thomson to cater to players of all standards. Set among rolling hills near the Gulf of Thailand, this hilly course features natural rocky outcrops, boulders, and sloping fairways with strategically placed bunkers and two-tier greens.',
  description_th: 'สนามกอล์ฟระยอง กรีน วัลเลย์ เป็นส่วนหนึ่งของกลุ่ม St Andrews 2000 ออกแบบโดย Peter Thomson เพื่อรองรับนักกอล์ฟทุกระดับ ตั้งอยู่ท่ามกลางเนินเขาใกล้อ่าวไทย',
  amenities: {
    driving_range: true,
    putting_green: true,
    golf_carts: true,
    caddies: true,
    club_rental: true,
    shoe_rental: true,
    pro_shop: true,
    restaurant: true,
    swimming_pool: true,
    spa: false,
    accommodation: true,
    night_golf: false,
    golf_lessons: true
  },
  policies: {
    dress_code: 'standard',
    metal_spikes_allowed: false,
    fivesomes_allowed: true,
    fivesomes_notes: 'Except on Weekends & Holidays',
    credit_cards_accepted: true
  },
  green_fees: {
    weekday: 1000,
    weekend: 1200,
    twilight: 800,
    caddy_fee: 400,
    cart_fee: 700,
    currency: 'THB'
  },
  status: 'active'
};

// =====================================================
// TEE DATA
// =====================================================

const teesData = [
  {
    tee_name: 'Blue',
    tee_color: '#0066CC',
    gender: 'M',
    par: 72,
    total_yards: 6971,
    total_meters: 6375,
    course_rating: 73.1,
    slope_rating: 123
  },
  {
    tee_name: 'White',
    tee_color: '#FFFFFF',
    gender: 'M',
    par: 72,
    total_yards: 6570,
    total_meters: 6008,
    course_rating: 70.7,
    slope_rating: 121
  },
  {
    tee_name: 'Yellow',
    tee_color: '#FFD700',
    gender: 'M',
    par: 72,
    total_yards: 6032,
    total_meters: 5516,
    course_rating: 69.2,
    slope_rating: 117
  },
  {
    tee_name: 'Red',
    tee_color: '#CC0000',
    gender: 'F',
    par: 72,
    total_yards: 5175,
    total_meters: 4732,
    course_rating: 69.2,
    slope_rating: 117
  }
];

// =====================================================
// HOLE DATA
// =====================================================

const holesData = [
  { hole_number: 1, par: 4, handicap_index: 1, description: 'Long uphill par 4 with water carry off the tee and small green. The hardest hole on the course.', distances: { blue: 448, white: 428, yellow: 373, red: 309 } },
  { hole_number: 2, par: 4, handicap_index: 13, description: null, distances: { blue: 387, white: 378, yellow: 360, red: 311 } },
  { hole_number: 3, par: 4, handicap_index: 17, description: 'Right-angled dogleg left. Drive must clear water but stop short of bunker.', distances: { blue: 382, white: 355, yellow: 322, red: 266 } },
  { hole_number: 4, par: 5, handicap_index: 7, description: null, distances: { blue: 551, white: 526, yellow: 489, red: 461 } },
  { hole_number: 5, par: 3, handicap_index: 11, description: null, distances: { blue: 220, white: 192, yellow: 159, red: 121 } },
  { hole_number: 6, par: 4, handicap_index: 9, description: null, distances: { blue: 367, white: 350, yellow: 328, red: 303 } },
  { hole_number: 7, par: 5, handicap_index: 5, description: 'Monster par 5, the longest hole on the course.', distances: { blue: 584, white: 569, yellow: 545, red: 440 } },
  { hole_number: 8, par: 3, handicap_index: 15, description: null, distances: { blue: 149, white: 139, yellow: 124, red: 101 } },
  { hole_number: 9, par: 4, handicap_index: 3, description: null, distances: { blue: 414, white: 398, yellow: 377, red: 314 } },
  { hole_number: 10, par: 5, handicap_index: 6, description: null, distances: { blue: 541, white: 516, yellow: 482, red: 433 } },
  { hole_number: 11, par: 3, handicap_index: 16, description: null, distances: { blue: 179, white: 161, yellow: 134, red: 116 } },
  { hole_number: 12, par: 4, handicap_index: 14, description: null, distances: { blue: 387, white: 363, yellow: 333, red: 274 } },
  { hole_number: 13, par: 4, handicap_index: 2, description: 'Second hardest hole on the course. Challenging par 4.', distances: { blue: 448, white: 403, yellow: 362, red: 316 } },
  { hole_number: 14, par: 5, handicap_index: 8, description: null, distances: { blue: 509, white: 489, yellow: 428, red: 388 } },
  { hole_number: 15, par: 4, handicap_index: 4, description: null, distances: { blue: 434, white: 403, yellow: 385, red: 360 } },
  { hole_number: 16, par: 3, handicap_index: 18, description: 'Easiest hole on the course. Short par 3.', distances: { blue: 172, white: 144, yellow: 125, red: 100 } },
  { hole_number: 17, par: 4, handicap_index: 10, description: null, distances: { blue: 382, white: 366, yellow: 344, red: 298 } },
  { hole_number: 18, par: 4, handicap_index: 12, description: 'Finishing hole with elevated green.', distances: { blue: 417, white: 390, yellow: 362, red: 264 } }
];

// =====================================================
// SEED FUNCTION
// =====================================================

async function seedRayongGreenValley() {
  console.log('🏌️ Seeding Rayong Green Valley Country Club...\n');

  try {
    // 1. Insert Course
    console.log('📍 Inserting course...');
    const { data: course, error: courseError } = await supabase
      .from('golf_courses')
      .upsert(courseData, { onConflict: 'slug' })
      .select()
      .single();

    if (courseError) throw courseError;
    console.log(`✅ Course inserted: ${course.name} (ID: ${course.id})`);

    // 2. Insert Tees
    console.log('\n🎯 Inserting tees...');
    for (const tee of teesData) {
      const { error: teeError } = await supabase
        .from('course_tees')
        .upsert(
          { ...tee, course_id: course.id },
          { onConflict: 'course_id,tee_name' }
        );

      if (teeError) throw teeError;
      console.log(`  ✅ ${tee.tee_name} tees: ${tee.total_yards} yards`);
    }

    // 3. Insert Holes
    console.log('\n⛳ Inserting holes...');
    for (const hole of holesData) {
      const { error: holeError } = await supabase
        .from('course_holes')
        .upsert(
          { ...hole, course_id: course.id },
          { onConflict: 'course_id,hole_number' }
        );

      if (holeError) throw holeError;
      console.log(`  ✅ Hole ${hole.hole_number}: Par ${hole.par}, SI ${hole.handicap_index}`);
    }

    console.log('\n🎉 Rayong Green Valley seeded successfully!');
    console.log(`   Course ID: ${course.id}`);
    console.log(`   Tees: ${teesData.length}`);
    console.log(`   Holes: ${holesData.length}`);

    return course;

  } catch (error) {
    console.error('❌ Error seeding course:', error);
    throw error;
  }
}

// =====================================================
// EXPORT FOR USE IN OTHER FILES
// =====================================================

export { courseData, teesData, holesData, seedRayongGreenValley };

// Run if executed directly
if (require.main === module) {
  seedRayongGreenValley()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

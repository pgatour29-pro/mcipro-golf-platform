// Migrate existing GPS data from caddy_completed_rounds to course_gps_data
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pyeeplwsnupmhgbguwqs.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.yz1WTV7h_qpaJu3kQ0pEKHMF3rw-_fSLmdne_3Rb6Yc';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function migrateData() {
    console.log('Migrating existing GPS data from caddy_completed_rounds...');

    const { data: rows, error } = await supabase
        .from('caddy_completed_rounds')
        .select('caddy_id, total_time, holes_completed, created_at')
        .like('caddy_id', 'gps_data_%');

    if (error) {
        console.error('Migration query error:', error);
        return;
    }

    if (!rows || rows.length === 0) {
        console.log('No existing GPS data to migrate.');
        return;
    }

    console.log(`Found ${rows.length} courses with GPS data to migrate.`);

    for (const row of rows) {
        const courseId = row.caddy_id.replace('gps_data_', '');
        try {
            const parsed = JSON.parse(row.total_time || '[]');
            if (!parsed || parsed.length === 0) continue;

            const upsertRows = parsed.map(h => ({
                course_id: courseId,
                hole_number: h.hole_number,
                tee_lat: h.tee_lat,
                tee_lng: h.tee_lng,
                samples: h.samples || 1,
                updated_at: row.created_at || new Date().toISOString()
            }));

            const { error: upsertError } = await supabase
                .from('course_gps_data')
                .upsert(upsertRows, { onConflict: 'course_id,hole_number' });

            if (upsertError) {
                console.error(`Error migrating ${courseId}:`, upsertError);
            } else {
                console.log(`Migrated ${courseId}: ${parsed.length} holes`);
            }
        } catch (e) {
            console.error(`Parse error for ${courseId}:`, e.message);
        }
    }

    console.log('Migration complete!');
}

async function main() {
    await migrateData();

    // Verify
    const { data, error } = await supabase
        .from('course_gps_data')
        .select('course_id, hole_number')
        .limit(10);

    console.log(`Verification: ${data ? data.length : 0} rows in course_gps_data`, error || '');
    if (data && data.length > 0) {
        console.log('Sample data:', JSON.stringify(data.slice(0, 3)));
    }

    process.exit(0);
}

main();

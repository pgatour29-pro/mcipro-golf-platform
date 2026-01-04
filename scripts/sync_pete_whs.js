const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pyeeplwsnupmhgbguwqs.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.yz1WTV7h_qpaJu3kQ0pEKHMF3rw-_fSLmdne_3Rb6Yc');

const PETE_ID = 'U2b6d976f19bca4b2f4374ae0e10ed873';
const TRGG = '7c0e4b72-d925-44bc-afda-38259a7ba346';

async function sync() {
    console.log('Syncing Pete\'s TRGG handicap to WHS 8-of-20...\n');

    // Get WHS calculation
    const { data: whs, error } = await supabase.rpc('calculate_whs_handicap_index', {
        p_golfer_id: PETE_ID
    });

    if (error) {
        console.log('Error:', error.message);
        return;
    }

    console.log('WHS Calculation:', whs.new_handicap_index);
    console.log('Rounds used:', whs.rounds_used);
    console.log('Best differentials:', whs.best_differentials);

    // Update TRGG society handicap
    const { error: updateError } = await supabase
        .from('society_handicaps')
        .update({
            handicap_index: whs.new_handicap_index,
            rounds_count: whs.rounds_used,
            calculation_method: 'WHS-8of20',
            last_calculated_at: new Date().toISOString()
        })
        .eq('golfer_id', PETE_ID)
        .eq('society_id', TRGG);

    if (updateError) {
        console.log('Update error:', updateError.message);
    } else {
        console.log('\n✅ Pete\'s TRGG handicap synced to:', whs.new_handicap_index);
    }
}

sync().catch(console.error);

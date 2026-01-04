const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pyeeplwsnupmhgbguwqs.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.yz1WTV7h_qpaJu3kQ0pEKHMF3rw-_fSLmdne_3Rb6Yc');

const PETE_ID = 'U2b6d976f19bca4b2f4374ae0e10ed873';
const UNIVERSAL_HCP = 3.6;
const TRGG_HCP = 2.5;
const TRGG_SOCIETY_ID = '7c0e4b72-d925-44bc-afda-38259a7ba346';

(async () => {
    console.log('=== FORCE FIXING ALL PETE PARK HANDICAP DATA ===\n');

    // 1. Get current profile
    const { data: profile } = await supabase.from('user_profiles')
        .select('*')
        .eq('line_user_id', PETE_ID)
        .single();

    console.log('Current profile_data:', JSON.stringify(profile?.profile_data, null, 2));

    // 2. Update user_profiles.profile_data with correct values
    const updatedProfileData = {
        ...profile.profile_data,
        handicap: String(UNIVERSAL_HCP),
        golfInfo: {
            ...profile.profile_data?.golfInfo,
            handicap: String(UNIVERSAL_HCP),
            lastHandicapUpdate: new Date().toISOString()
        }
    };

    // Remove any legacy/old handicap fields that might exist
    delete updatedProfileData.oldHandicap;
    delete updatedProfileData.previousHandicap;
    delete updatedProfileData.calculatedHandicap;
    if (updatedProfileData.golfInfo) {
        delete updatedProfileData.golfInfo.oldHandicap;
        delete updatedProfileData.golfInfo.previousHandicap;
        delete updatedProfileData.golfInfo.calculatedHandicap;
    }

    const { error: updateError } = await supabase.from('user_profiles')
        .update({
            profile_data: updatedProfileData,
            handicap_index: UNIVERSAL_HCP  // Also set the direct column
        })
        .eq('line_user_id', PETE_ID);

    if (updateError) {
        console.error('Error updating profile:', updateError);
    } else {
        console.log('✅ Updated user_profiles.profile_data');
    }

    // 3. Verify/Update society_handicaps - Universal
    const { data: universalHcp } = await supabase.from('society_handicaps')
        .select('*')
        .eq('golfer_id', PETE_ID)
        .is('society_id', null)
        .single();

    if (universalHcp) {
        if (universalHcp.handicap_index !== UNIVERSAL_HCP) {
            await supabase.from('society_handicaps')
                .update({ handicap_index: UNIVERSAL_HCP })
                .eq('id', universalHcp.id);
            console.log('✅ Updated universal handicap:', universalHcp.handicap_index, '->', UNIVERSAL_HCP);
        } else {
            console.log('✓ Universal handicap already correct:', UNIVERSAL_HCP);
        }
    } else {
        // Create universal handicap record
        await supabase.from('society_handicaps')
            .insert({
                golfer_id: PETE_ID,
                society_id: null,
                handicap_index: UNIVERSAL_HCP
            });
        console.log('✅ Created universal handicap:', UNIVERSAL_HCP);
    }

    // 4. Verify/Update society_handicaps - TRGG
    const { data: trggHcp } = await supabase.from('society_handicaps')
        .select('*')
        .eq('golfer_id', PETE_ID)
        .eq('society_id', TRGG_SOCIETY_ID)
        .single();

    if (trggHcp) {
        if (trggHcp.handicap_index !== TRGG_HCP) {
            await supabase.from('society_handicaps')
                .update({ handicap_index: TRGG_HCP })
                .eq('id', trggHcp.id);
            console.log('✅ Updated TRGG handicap:', trggHcp.handicap_index, '->', TRGG_HCP);
        } else {
            console.log('✓ TRGG handicap already correct:', TRGG_HCP);
        }
    } else {
        // Create TRGG handicap record
        await supabase.from('society_handicaps')
            .insert({
                golfer_id: PETE_ID,
                society_id: TRGG_SOCIETY_ID,
                handicap_index: TRGG_HCP
            });
        console.log('✅ Created TRGG handicap:', TRGG_HCP);
    }

    // 5. Check ALL tables for any 1.0 handicap values for Pete
    console.log('\n=== SEARCHING ALL TABLES FOR +1.0 ===');

    // Check event_registrations
    const { data: regs } = await supabase.from('event_registrations')
        .select('*')
        .eq('user_id', PETE_ID);

    for (const reg of regs || []) {
        if (reg.handicap === 1.0 || reg.handicap === -1.0 || reg.handicap === 1) {
            console.log('Found 1.0 in event_registrations:', reg.id, reg.handicap);
            // Fix it
            await supabase.from('event_registrations')
                .update({ handicap: TRGG_HCP })
                .eq('id', reg.id);
            console.log('  -> Fixed to', TRGG_HCP);
        }
    }

    // Check rounds
    const { data: rounds } = await supabase.from('rounds')
        .select('*')
        .eq('golfer_id', PETE_ID);

    for (const round of rounds || []) {
        if (round.handicap_used === 1.0 || round.handicap_used === -1.0 || round.handicap_used === 1) {
            console.log('Found 1.0 in rounds:', round.id, round.handicap_used);
            // Fix it
            await supabase.from('rounds')
                .update({ handicap_used: TRGG_HCP })
                .eq('id', round.id);
            console.log('  -> Fixed to', TRGG_HCP);
        }
    }

    // 6. Final verification
    console.log('\n=== FINAL VERIFICATION ===');

    const { data: finalProfile } = await supabase.from('user_profiles')
        .select('profile_data, handicap_index')
        .eq('line_user_id', PETE_ID)
        .single();

    console.log('profile_data.handicap:', finalProfile?.profile_data?.handicap);
    console.log('profile_data.golfInfo.handicap:', finalProfile?.profile_data?.golfInfo?.handicap);
    console.log('handicap_index column:', finalProfile?.handicap_index);

    const { data: finalHcps } = await supabase.from('society_handicaps')
        .select('*')
        .eq('golfer_id', PETE_ID);

    console.log('\nsociety_handicaps:');
    for (const h of finalHcps || []) {
        console.log('  ', h.society_id || 'UNIVERSAL', ':', h.handicap_index);
    }

    console.log('\n✅ DONE');
})();

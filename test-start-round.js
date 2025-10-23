// =====================================================================
// TEST START ROUND - Diagnose why it's not working
// =====================================================================
// Paste this in console to debug the Start Round issue
// =====================================================================

(async function() {
    console.log('===== START ROUND DIAGNOSTIC TEST =====');

    // Test 1: Check if LiveScorecardManager exists
    console.log('\n1. Checking LiveScorecardManager...');
    if (window.LiveScorecardManager) {
        console.log('✅ LiveScorecardManager found');
    } else {
        console.error('❌ LiveScorecardManager NOT FOUND');
        return;
    }

    // Test 2: Check players
    console.log('\n2. Checking players...');
    console.log('Players count:', window.LiveScorecardManager.players.length);
    console.log('Players:', window.LiveScorecardManager.players);

    // Test 3: Check course selection
    console.log('\n3. Checking course selection...');
    const courseSelect = document.getElementById('scorecardCourseSelect');
    if (courseSelect) {
        console.log('Course select value:', courseSelect.value);
        console.log('Course select options count:', courseSelect.options.length);
    } else {
        console.error('❌ scorecardCourseSelect element not found');
    }

    // Test 4: Check tee marker selection
    console.log('\n4. Checking tee marker selection...');
    const teeMarker = document.querySelector('input[name="teeMarker"]:checked');
    if (teeMarker) {
        console.log('Tee marker selected:', teeMarker.value);
    } else {
        console.error('❌ No tee marker selected');
    }

    // Test 5: Check scoring format
    console.log('\n5. Checking scoring format...');
    const formats = document.querySelectorAll('input[name="scoringFormat"]:checked');
    console.log('Formats selected:', formats.length);
    formats.forEach(f => console.log('  -', f.value));

    // Test 6: Check database connection
    console.log('\n6. Checking database...');
    if (window.SocietyGolfDB) {
        console.log('✅ SocietyGolfDB found');
    } else {
        console.error('❌ SocietyGolfDB NOT FOUND');
    }

    if (window.SupabaseDB) {
        console.log('✅ SupabaseDB found');
        console.log('   Ready:', window.SupabaseDB.ready);
    } else {
        console.error('❌ SupabaseDB NOT FOUND');
    }

    // Test 7: Try to call startRound
    console.log('\n7. Attempting to call startRound()...');
    try {
        await window.LiveScorecardManager.startRound();
        console.log('✅ startRound() completed');
    } catch (error) {
        console.error('❌ startRound() failed:', error);
        console.error('Error stack:', error.stack);
    }

    console.log('\n===== DIAGNOSTIC COMPLETE =====');
})();

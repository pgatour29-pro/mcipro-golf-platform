// =====================================================================
// MANUAL SOCIETY SELECTOR TEST
// =====================================================================
// Paste this in console to manually open the modal and see societies
// =====================================================================

(async function() {
    console.log('===== MANUAL SOCIETY SELECTOR TEST =====');

    // Step 1: Check if system exists
    if (!window.SocietySelectorSystem) {
        console.error('❌ SocietySelectorSystem not found!');
        return;
    }

    // Step 2: Initialize and load societies
    console.log('Loading societies from database...');
    await window.SocietySelectorSystem.init();

    // Step 3: Show what was loaded
    console.log('Societies loaded:', window.SocietySelectorSystem.societies.length);
    window.SocietySelectorSystem.societies.forEach((society, index) => {
        console.log(`  ${index + 1}. ${society.society_name || society.name}`);
        console.log(`     LINE ID: ${society.line_user_id}`);
        console.log(`     Role: ${society.role}`);
    });

    // Step 4: Open the modal
    console.log('Opening modal...');
    window.SocietySelectorSystem.openModal();

    console.log('✅ Modal should now be visible on screen!');
    console.log('Click a society card to test selection.');
})();

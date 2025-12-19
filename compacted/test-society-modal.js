// =====================================================================
// DIAGNOSTIC TEST FOR SOCIETY SELECTOR MODAL
// =====================================================================
// Copy and paste this entire script into your browser console
// This will test if the Netflix modal is working correctly
// =====================================================================

console.log('='.repeat(80));
console.log('SOCIETY SELECTOR MODAL DIAGNOSTIC TEST');
console.log('='.repeat(80));

// Test 1: Check if modal HTML exists
console.log('\n1. Checking if modal HTML exists...');
const modal = document.getElementById('societySelectorModal');
if (modal) {
    console.log('✅ Modal HTML found:', modal);
} else {
    console.error('❌ Modal HTML NOT FOUND - modal does not exist in DOM');
}

// Test 2: Check if SocietySelectorSystem exists
console.log('\n2. Checking if SocietySelectorSystem exists...');
if (window.SocietySelectorSystem) {
    console.log('✅ SocietySelectorSystem found:', window.SocietySelectorSystem);
} else {
    console.error('❌ SocietySelectorSystem NOT FOUND - JavaScript not loaded');
}

// Test 3: Check if DevMode exists
console.log('\n3. Checking if DevMode exists...');
if (window.DevMode) {
    console.log('✅ DevMode found:', window.DevMode);
} else {
    console.error('❌ DevMode NOT FOUND');
}

// Test 4: Check DevMode.switchToRole function
console.log('\n4. Checking DevMode.switchToRole function...');
if (window.DevMode && window.DevMode.switchToRole) {
    console.log('✅ DevMode.switchToRole found');
    console.log('   Function source (first 200 chars):', window.DevMode.switchToRole.toString().substring(0, 200));
} else {
    console.error('❌ DevMode.switchToRole NOT FOUND');
}

// Test 5: Check database connection
console.log('\n5. Checking Supabase connection...');
if (window.SupabaseDB) {
    console.log('✅ SupabaseDB found');
    console.log('   Ready:', window.SupabaseDB.ready);
} else {
    console.error('❌ SupabaseDB NOT FOUND');
}

// Test 6: Try to load societies
console.log('\n6. Attempting to load societies from database...');
if (window.SocietySelectorSystem) {
    (async () => {
        try {
            await window.SocietySelectorSystem.init();
            console.log('✅ Societies loaded:', window.SocietySelectorSystem.societies.length);
            console.log('   Societies:', window.SocietySelectorSystem.societies);
        } catch (error) {
            console.error('❌ Error loading societies:', error);
        }
    })();
} else {
    console.error('❌ Cannot test - SocietySelectorSystem not found');
}

// Test 7: Try to manually open the modal
console.log('\n7. Attempting to manually open modal...');
if (window.SocietySelectorSystem && window.SocietySelectorSystem.openModal) {
    setTimeout(() => {
        console.log('Opening modal in 3 seconds...');
        window.SocietySelectorSystem.openModal();
        console.log('✅ Modal open command sent - check if modal appeared on screen');
    }, 3000);
} else {
    console.error('❌ Cannot open modal - SocietySelectorSystem.openModal not found');
}

console.log('\n' + '='.repeat(80));
console.log('DIAGNOSTIC TEST COMPLETE');
console.log('='.repeat(80));
console.log('\nIf modal appears in 3 seconds, the system is working!');
console.log('If not, check the errors above.');

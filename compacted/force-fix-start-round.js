// =====================================================================
// FORCE FIX START ROUND - RUN THIS IN CONSOLE NOW
// =====================================================================

(async function() {
    console.log('========================================');
    console.log('FORCING START ROUND TO WORK');
    console.log('========================================');

    // Step 1: Check page version
    console.log('Current page version: Check console for PAGE VERSION');

    // Step 2: Find the button
    const button = document.querySelector('button[onclick*="startRound"]');
    if (!button) {
        console.error('❌ START ROUND BUTTON NOT FOUND!');
        console.log('You might be on the wrong screen. Go to: Golfer Dashboard > Live Scorecard');
        return;
    }
    console.log('✅ Button found:', button);

    // Step 3: Check if LiveScorecardManager exists
    if (!window.LiveScorecardManager) {
        console.error('❌ LiveScorecardManager NOT FOUND - page not loaded correctly');
        console.log('SOLUTION: Hard refresh with Ctrl+Shift+F5');
        return;
    }
    console.log('✅ LiveScorecardManager exists');

    // Step 4: Replace the button's onclick with a working version
    console.log('Fixing button onclick...');
    button.onclick = async function(e) {
        e.preventDefault();
        console.log('🎯 START ROUND CLICKED!');

        try {
            await window.LiveScorecardManager.startRound();
            console.log('✅ Start Round completed');
        } catch (error) {
            console.error('❌ Start Round error:', error);
            alert('Error: ' + error.message);
        }
    };
    console.log('✅ Button onclick fixed');

    // Step 5: Add a test button
    console.log('Adding TEST START ROUND button to page...');
    const testButton = document.createElement('button');
    testButton.textContent = '🔧 TEST START ROUND';
    testButton.className = 'fixed bottom-4 right-4 z-[9999] bg-red-600 text-white px-6 py-3 rounded-lg shadow-2xl text-xl font-bold';
    testButton.onclick = async function() {
        console.log('🔧 TEST BUTTON CLICKED');
        try {
            await window.LiveScorecardManager.startRound();
            alert('Start Round worked!');
        } catch (error) {
            console.error('Error:', error);
            alert('Error: ' + error.message);
        }
    };
    document.body.appendChild(testButton);
    console.log('✅ Red TEST button added to bottom-right corner');

    console.log('========================================');
    console.log('READY TO TEST');
    console.log('========================================');
    console.log('1. Click the red TEST START ROUND button in bottom-right');
    console.log('2. Or click the normal Start Round button');
    console.log('3. Watch console for errors');
})();

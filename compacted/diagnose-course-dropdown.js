// =====================================================================
// DIAGNOSE COURSE DROPDOWN - WHY IS IT EMPTY?
// =====================================================================
// Paste this in browser console to see what's wrong with course selection
// =====================================================================

(function() {
    console.log('========================================');
    console.log('COURSE DROPDOWN DIAGNOSIS');
    console.log('========================================');

    // 1. Check if dropdown exists
    const dropdown = document.getElementById('scorecardCourseSelect');
    if (!dropdown) {
        console.error('❌ COURSE DROPDOWN NOT FOUND! Element does not exist in DOM!');
        console.log('Expected ID: scorecardCourseSelect');
        return;
    }
    console.log('✅ Dropdown found:', dropdown);

    // 2. Check current value
    console.log('\n📊 DROPDOWN STATE:');
    console.log('  Current value:', dropdown.value || '(EMPTY - THIS IS THE PROBLEM!)');
    console.log('  Value length:', dropdown.value.length);
    console.log('  Is empty?', dropdown.value === '');

    // 3. Show all available options
    console.log('\n📋 AVAILABLE COURSES:');
    const options = Array.from(dropdown.options);
    options.forEach((opt, index) => {
        const marker = opt.value === dropdown.value ? '👉' : '  ';
        console.log(`${marker} ${index}: value="${opt.value}" text="${opt.text}"`);
    });

    // 4. Check if dropdown is visible
    const isVisible = dropdown.offsetParent !== null;
    const rect = dropdown.getBoundingClientRect();
    console.log('\n👁️ VISIBILITY:');
    console.log('  Is visible?', isVisible);
    console.log('  Position:', rect);
    console.log('  Display:', window.getComputedStyle(dropdown).display);

    // 5. Check if dropdown is disabled
    console.log('\n🔒 DISABLED STATUS:');
    console.log('  Is disabled?', dropdown.disabled);
    console.log('  Is readonly?', dropdown.readOnly);

    // 6. Add visual indicators
    console.log('\n🎨 ADDING VISUAL INDICATORS...');
    dropdown.style.border = '5px solid red';
    dropdown.style.backgroundColor = 'yellow';
    dropdown.style.fontSize = '18px';
    dropdown.style.fontWeight = 'bold';

    // 7. Add change listener
    dropdown.addEventListener('change', function(e) {
        console.log('🔔 COURSE CHANGED!');
        console.log('  New value:', e.target.value);
        console.log('  Selected option:', e.target.options[e.target.selectedIndex].text);
    });

    console.log('✅ Yellow dropdown with red border added');

    // 8. Test setting a value
    console.log('\n🧪 TEST: Setting dropdown to Pattana Golf...');
    dropdown.value = 'pattana_golf';
    console.log('  After setting: dropdown.value =', dropdown.value);

    if (dropdown.value === 'pattana_golf') {
        console.log('  ✅ Setting value WORKS!');
        console.log('  🤔 User needs to SELECT a course from the dropdown before clicking Start Round');
    } else {
        console.error('  ❌ Setting value FAILED! Dropdown might be broken');
    }

    console.log('\n========================================');
    console.log('💡 NEXT STEPS:');
    console.log('========================================');
    console.log('1. Look for the yellow dropdown with red border on the page');
    console.log('2. SELECT A COURSE from the dropdown');
    console.log('3. Make sure you see the course name in the dropdown');
    console.log('4. Then click Start Round');
    console.log('');
    console.log('IF DROPDOWN IS EMPTY:');
    console.log('  The user must MANUALLY SELECT a course before clicking Start Round');
    console.log('  The dropdown starts empty by default (value="")');
    console.log('========================================');
})();

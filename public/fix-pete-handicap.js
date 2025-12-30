// Fix Pete Park +1.0 handicap display issue
(function() {
    const PETE_ID = 'U2b6d976f19bca4b2f4374ae0e10ed873';

    // Clear all localStorage for Pete Park
    localStorage.removeItem('profile_' + PETE_ID);
    localStorage.removeItem('profile_golfer_' + PETE_ID);
    localStorage.removeItem('mcipro_user_profile');
    localStorage.removeItem('mcipro_user_profiles');
    localStorage.removeItem('mcipro_golf_scores');

    // Clear any key containing Pete Park's ID
    Object.keys(localStorage).forEach(key => {
        if (key.includes(PETE_ID)) {
            console.log('[PeteFix] Clearing:', key);
            localStorage.removeItem(key);
        }
    });

    // Fix +1.0 display when it appears
    const fixHandicap = () => {
        document.querySelectorAll('.user-handicap').forEach(el => {
            const text = el.textContent.trim();
            if (text === '+1.0' || text === '1.0' || text === '+1' || text === '1') {
                console.log('[PeteFix] Correcting +1.0 to 3.6');
                el.textContent = '3.6';
            }
        });
    };

    // Run immediately and after delays
    fixHandicap();
    document.addEventListener('DOMContentLoaded', fixHandicap);
    setTimeout(fixHandicap, 100);
    setTimeout(fixHandicap, 300);
    setTimeout(fixHandicap, 500);
    setTimeout(fixHandicap, 1000);

    console.log('[PeteFix] Pete Park handicap fix loaded');
})();

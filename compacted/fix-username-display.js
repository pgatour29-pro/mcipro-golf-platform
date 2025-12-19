// Update username displays
const usernameElements = document.querySelectorAll('.user-username-display');
usernameElements.forEach(element => {
    // Don't show LINE User IDs (they start with "U" and are 33 chars)
    const username = AppState.currentUser.username;
    if (username && !(username.startsWith('U') && username.length === 33)) {
        element.textContent = username;
    } else {
        element.textContent = '';
    }
});

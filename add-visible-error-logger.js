// ============================================================================
// VISIBLE ERROR LOGGER FOR MOBILE DEBUGGING
// Add this to index.html to see errors on screen
// ============================================================================

// Create visible error display at top of screen
const errorDisplay = document.createElement('div');
errorDisplay.id = 'mobileErrorDisplay';
errorDisplay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: #dc2626;
    color: white;
    padding: 12px;
    font-size: 12px;
    font-family: monospace;
    z-index: 99999;
    max-height: 200px;
    overflow-y: auto;
    display: none;
`;
document.body.appendChild(errorDisplay);

// Create success display
const successDisplay = document.createElement('div');
successDisplay.id = 'mobileSuccessDisplay';
successDisplay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: #10b981;
    color: white;
    padding: 12px;
    font-size: 12px;
    font-family: monospace;
    z-index: 99999;
    max-height: 200px;
    overflow-y: auto;
    display: none;
`;
document.body.appendChild(successDisplay);

// Override console.error to show on screen
const originalError = console.error;
console.error = function(...args) {
    originalError.apply(console, args);

    const message = args.map(arg => {
        if (typeof arg === 'object') {
            return JSON.stringify(arg, null, 2);
        }
        return String(arg);
    }).join(' ');

    errorDisplay.innerHTML += `<div style="border-bottom: 1px solid rgba(255,255,255,0.3); padding: 4px 0;">
        ${new Date().toLocaleTimeString()}: ${message}
    </div>`;
    errorDisplay.style.display = 'block';

    // Auto-hide after 10 seconds
    setTimeout(() => {
        errorDisplay.style.display = 'none';
    }, 10000);
};

// Override console.log for success messages
const originalLog = console.log;
console.log = function(...args) {
    originalLog.apply(console, args);

    const message = args.join(' ');

    // Only show specific success messages
    if (message.includes('✅') || message.includes('Saved round to database')) {
        successDisplay.innerHTML += `<div style="border-bottom: 1px solid rgba(255,255,255,0.3); padding: 4px 0;">
            ${new Date().toLocaleTimeString()}: ${message}
        </div>`;
        successDisplay.style.display = 'block';

        // Auto-hide after 5 seconds
        setTimeout(() => {
            successDisplay.style.display = 'none';
        }, 5000);
    }
};

console.log('✅ Mobile error logger installed');

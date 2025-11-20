import { PWAGuard } from './pwa-guard.js';

// Simplified History API for PWA navigation
// Allows us to control the back button behavior
export function initializeHistory() {
    let _silent = false;
    let _blockBack = false;

    window.history.pushState = new Proxy(window.history.pushState, {
        apply: (target, thisArg, args) => {
            if (!_silent) {
                target.apply(thisArg, args);
            }
            _silent = false;
        }
    });

    window.addEventListener('popstate', (event) => {
        if (_blockBack) {
            event.stopImmediatePropagation();
            history.forward();
            // Or show a message
            console.log("[History] Back navigation is blocked.");
            return false;
        }

        if (PWAGuard.checkDirty()) {
            // Prevent default back navigation
            history.pushState(null, '', location.href);

            // Show confirmation modal
            PWAGuard.showUnsavedModal(() => {
                PWAGuard.setDirty(false); // Reset dirty flag
                _silent = true;
                window.history.back(); // Go back for real
            });
        }
    });

    window.blockBackButton = (block) => {
        _blockBack = block;
        if (block) {
            history.pushState(null, '', location.href); // Push a state to block
        }
    };
}

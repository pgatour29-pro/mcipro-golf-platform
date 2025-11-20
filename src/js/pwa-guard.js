// ===== PWA BACK-BUTTON PROTECTION SYSTEM =====
// Prevents data loss from accidental back taps on mobile PWA
export const PWAGuard = {
    isDirty: false,
    currentView: null,
    autosaveTimers: {},

    // Mark form/state as dirty (unsaved changes)
    setDirty(dirty = true) {
        this.isDirty = dirty;
        console.log(`[PWAGuard] Dirty state: ${dirty}`);
    },

    // Check if there are unsaved changes
    checkDirty() {
        return this.isDirty;
    },

    // Show unsaved changes confirmation modal
    showUnsavedModal(onConfirm) {
        const modal = document.createElement('div');
        modal.id = 'unsavedChangesModal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl p-6 m-4 max-w-sm w-full">
                <h3 class="text-lg font-bold mb-2">Unsaved Changes</h3>
                <p class="text-gray-600 mb-4">You have unsaved changes. Are you sure you want to leave?</p>
                <div class="flex justify-end space-x-2">
                    <button id="cancelLeave" class="px-4 py-2 bg-gray-200 rounded">Stay</button>
                    <button id="confirmLeave" class="px-4 py-2 bg-red-500 text-white rounded">Leave</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('confirmLeave').onclick = () => {
            onConfirm();
            modal.remove();
        };
        document.getElementById('cancelLeave').onclick = () => modal.remove();
    },

    // Start autosave for a specific key
    startAutosave(key, dataCallback, interval = 3000) {
        if (this.autosaveTimers[key]) {
            clearInterval(this.autosaveTimers[key]);
        }
        this.autosaveTimers[key] = setInterval(() => {
            const data = dataCallback();
            localStorage.setItem(`autosave_${key}`, JSON.stringify(data));
            console.log(`[PWAGuard] Autosaved data for ${key}`);
        }, interval);
    },

    // Stop autosave for a specific key and clear data
    stopAutosave(key) {
        if (this.autosaveTimers[key]) {
            clearInterval(this.autosaveTimers[key]);
            delete this.autosaveTimers[key];
        }
        localStorage.removeItem(`autosave_${key}`);
        console.log(`[PWAGuard] Stopped autosave and cleared data for ${key}`);
    },

    // Restore autosaved data
    restoreAutosave(key) {
        const savedData = localStorage.getItem(`autosave_${key}`);
        if (savedData) {
            try {
                return JSON.parse(savedData);
            } catch (e) {
                console.error(`[PWAGuard] Failed to parse autosaved data for ${key}`, e);
                return null;
            }
        }
        return null;
    }
};

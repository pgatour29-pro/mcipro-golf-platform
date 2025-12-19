#!/usr/bin/env python3
"""
FIX: Move Scramble Drive Buttons Next to Keypad
================================================

ISSUE: Drive selection buttons are on the right side or below keypad
Users have to scroll and it's confusing

FIX: Move drive buttons ABOVE the keypad in the same column
Everything in one place - no scrolling needed
"""

def fix_index_html():
    print("FIX: Move Scramble Drive Buttons to Keypad Area")
    print("=" * 60)

    with open('index.html', 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # ========================================================================
    # FIX 1: ADD DRIVE BUTTONS ABOVE KEYPAD IN LEFT COLUMN
    # ========================================================================
    print("\n[1/2] Adding drive buttons above keypad...")

    old_keypad_header = """                                <!-- Left Column: Phone Keypad -->
                                <div>
                                    <div class="mb-3">
                                        <div class="text-sm font-medium text-gray-600 mb-1">Entering score for:</div>
                                        <div class="text-lg font-bold text-gray-900" id="activePlayerName">Select a player above</div>
                                    </div>

                                    <!-- Keypad -->"""

    new_keypad_header = """                                <!-- Left Column: Phone Keypad -->
                                <div>
                                    <div class="mb-3">
                                        <div class="text-sm font-medium text-gray-600 mb-1">Entering score for:</div>
                                        <div class="text-lg font-bold text-gray-900" id="activePlayerName">Select a player above</div>
                                    </div>

                                    <!-- SCRAMBLE: Drive Selection (shown ABOVE keypad for easy access) -->
                                    <div id="scrambleDriveButtonsCompact" class="mb-4 p-3 bg-blue-50 rounded-lg" style="display: none;">
                                        <div class="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                                            <span class="material-symbols-outlined text-sm">golf_course</span>
                                            Whose drive?
                                        </div>
                                        <div id="scrambleDriveButtonsMain" class="space-y-2">
                                            <!-- Drive buttons will be rendered here by renderScramblePanel() -->
                                        </div>
                                    </div>

                                    <!-- Keypad -->"""

    if old_keypad_header in content:
        content = content.replace(old_keypad_header, new_keypad_header)
        print("   [OK] Added drive buttons area above keypad")
    else:
        print("   [WARN] Keypad header not found or already modified")

    # ========================================================================
    # FIX 2: UPDATE renderScramblePanel() TO USE NEW LOCATION
    # ========================================================================
    print("\n[2/2] Updating renderScramblePanel() to use new location...")

    # Find the renderScramblePanel method
    old_render_scramble = """    renderScramblePanel() {
        // Hide scramble panel if scramble format is not selected
        const panel = document.getElementById('scrambleTrackingPanel');
        if (!this.scoringFormats.includes('scramble')) {
            if (panel) panel.style.display = 'none';
            return;
        }

        // Show the panel
        if (panel) panel.style.display = 'block';

        // Initialize data structures
        if (!this.scrambleDriveData) this.scrambleDriveData = {};
        if (!this.scramblePuttData) this.scramblePuttData = {};
        if (!this.scrambleDriveCount) this.scrambleDriveCount = {};

        // Render drive buttons with usage counters
        const driveButtonsContainer = document.getElementById('scrambleDriveButtons');
        if (driveButtonsContainer && this.scrambleConfig?.trackDrives) {"""

    new_render_scramble = """    renderScramblePanel() {
        // Hide/show scramble UI elements
        const panel = document.getElementById('scrambleTrackingPanel');
        const compactPanel = document.getElementById('scrambleDriveButtonsCompact');

        if (!this.scoringFormats.includes('scramble')) {
            if (panel) panel.style.display = 'none';
            if (compactPanel) compactPanel.style.display = 'none';
            return;
        }

        // Show the main panel (right side - optional tracking)
        if (panel) panel.style.display = 'block';

        // Show compact drive buttons ABOVE keypad (main UI)
        if (compactPanel && this.scrambleConfig?.trackDrives) {
            compactPanel.style.display = 'block';
        } else if (compactPanel) {
            compactPanel.style.display = 'none';
        }

        // Initialize data structures
        if (!this.scrambleDriveData) this.scrambleDriveData = {};
        if (!this.scramblePuttData) this.scramblePuttData = {};
        if (!this.scrambleDriveCount) this.scrambleDriveCount = {};

        // Render drive buttons with usage counters (BOTH locations)
        const driveButtonsMain = document.getElementById('scrambleDriveButtonsMain');
        const driveButtonsRight = document.getElementById('scrambleDriveButtons');

        if (this.scrambleConfig?.trackDrives) {
            const driveButtonsHTML = this.generateDriveButtonsHTML();

            // Render in MAIN location (above keypad)
            if (driveButtonsMain) {
                driveButtonsMain.innerHTML = driveButtonsHTML;
            }

            // Also render in RIGHT panel for reference
            if (driveButtonsRight) {
                driveButtonsRight.innerHTML = driveButtonsHTML;
            }
        }

        // Continue with putt buttons in right panel...
        const puttButtonsContainer = document.getElementById('scramblePuttButtons');
        if (puttButtonsContainer && this.scrambleConfig?.trackPutts) {"""

    if old_render_scramble in content:
        content = content.replace(old_render_scramble, new_render_scramble)
        print("   [OK] Updated renderScramblePanel()")
    else:
        print("   [WARN] renderScramblePanel not found or already modified")

    # ========================================================================
    # FIX 3: ADD HELPER METHOD TO GENERATE DRIVE BUTTONS HTML
    # ========================================================================
    print("\n[3/3] Adding helper method for drive buttons HTML...")

    # Find a good place to insert the helper method (before renderScramblePanel)
    insert_marker = """    renderScramblePanel() {"""

    helper_method = """    generateDriveButtonsHTML() {
        // Generate HTML for drive selection buttons with counters
        const minDrives = this.scrambleConfig.minDrivesPerPlayer || 0;
        return this.players.map(player => {
            const used = this.scrambleDriveCount[player.id] || 0;
            const isSelected = this.scrambleDriveData[this.currentHole]?.player_id === player.id;
            const remaining = Math.max(0, minDrives - used);

            return `
                <button onclick="LiveScorecardManager.selectScrambleDrive('${player.id}')"
                    class="w-full flex items-center justify-between p-2 rounded-lg border-2 transition ${
                        isSelected
                            ? 'border-blue-500 bg-blue-100 text-blue-900'
                            : 'border-gray-300 bg-white hover:border-blue-400'
                    }">
                    <span class="font-medium text-sm">${player.name}</span>
                    <div class="flex items-center gap-2">
                        ${minDrives > 0 ? `<span class="text-xs ${remaining > 0 ? 'text-red-600 font-bold' : 'text-green-600'}">${used}/${minDrives}</span>` : `<span class="text-xs text-gray-600">${used}x</span>`}
                        ${isSelected ? '<span class="material-symbols-outlined text-sm text-blue-600">check_circle</span>' : ''}
                    </div>
                </button>
            `;
        }).join('');
    }

    renderScramblePanel() {"""

    if insert_marker in content:
        content = content.replace(insert_marker, helper_method)
        print("   [OK] Added generateDriveButtonsHTML() helper method")
    else:
        print("   [WARN] Insert marker not found")

    # ========================================================================
    # SAVE CHANGES
    # ========================================================================
    if content != original_content:
        with open('index.html', 'w', encoding='utf-8') as f:
            f.write(content)
        print("\n" + "=" * 60)
        print("ALL FIXES APPLIED!")
        print("=" * 60)
        return True
    else:
        print("\n" + "=" * 60)
        print("NO CHANGES MADE")
        print("=" * 60)
        return False

if __name__ == '__main__':
    import os
    os.chdir(r'C:\Users\pete\Documents\MciPro')

    print("Starting Scramble UI layout fix...\n")
    success = fix_index_html()

    if success:
        print("\nWHAT WAS FIXED:")
        print("   1. Drive buttons now appear ABOVE the keypad")
        print("   2. Everything in one place - no scrolling needed")
        print("   3. Compact design with player names + drive counts")
        print("   4. Shows X/Y format (e.g., 2/4 drives used)")
        print("\nNEXT STEPS:")
        print("   1. Deploy: bash deploy.sh \"Scramble UX: Drive buttons above keypad\"")
        print("   2. Test scramble - drive buttons right there with score entry")
    else:
        print("\nFix script didn't make changes - manual review needed")

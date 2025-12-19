#!/usr/bin/env python3
"""
EMERGENCY FIX: Scramble drive tracking and end round
=====================================================

Issues reported:
1. Drive usage not working
2. End round not working

Quick diagnostic fixes:
1. Add aggressive error logging to selectScrambleDrive
2. Add aggressive error logging to completeRound
3. Ensure renderScramblePanel is being called
"""

import re

def emergency_fix():
    print("EMERGENCY FIX: Scramble + End Round")
    print("=" * 60)

    with open('index.html', 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    changes = 0

    # ========================================================================
    # FIX 1: ADD LOGGING TO selectScrambleDrive
    # ========================================================================
    print("\n[1/3] Adding error logging to selectScrambleDrive...")

    old_select = """    selectScrambleDrive(playerId) {
        if (!this.scrambleDriveData) this.scrambleDriveData = {};

        const player = this.players.find(p => p.id === playerId);
        if (!player) return;"""

    new_select = """    selectScrambleDrive(playerId) {
        console.log('[SCRAMBLE] selectScrambleDrive called for player:', playerId);
        if (!this.scrambleDriveData) this.scrambleDriveData = {};

        const player = this.players.find(p => p.id === playerId);
        if (!player) {
            console.error('[SCRAMBLE] Player not found:', playerId);
            alert('ERROR: Player not found: ' + playerId);
            return;
        }
        console.log('[SCRAMBLE] Player found:', player.name);"""

    if old_select in content:
        content = content.replace(old_select, new_select)
        changes += 1
        print("   [OK] Added logging to selectScrambleDrive")
    else:
        print("   [WARN] selectScrambleDrive pattern not found")

    # ========================================================================
    # FIX 2: ADD LOGGING TO renderScramblePanel
    # ========================================================================
    print("\n[2/3] Adding logging to renderScramblePanel...")

    old_render_panel = """    renderScramblePanel() {
        const panel = document.getElementById('scrambleTrackingPanel');
        const compactPanel = document.getElementById('scrambleDriveButtonsCompact');

        // Show/hide panels based on scramble format
        if (!this.scoringFormats.includes('scramble')) {
            if (panel) panel.style.display = 'none';
            if (compactPanel) compactPanel.style.display = 'none';
            return;
        }"""

    new_render_panel = """    renderScramblePanel() {
        console.log('[SCRAMBLE] renderScramblePanel called');
        const panel = document.getElementById('scrambleTrackingPanel');
        const compactPanel = document.getElementById('scrambleDriveButtonsCompact');

        console.log('[SCRAMBLE] Panel elements:', { panel: !!panel, compactPanel: !!compactPanel });

        // Show/hide panels based on scramble format
        if (!this.scoringFormats.includes('scramble')) {
            console.log('[SCRAMBLE] Not scramble format, hiding panels');
            if (panel) panel.style.display = 'none';
            if (compactPanel) compactPanel.style.display = 'none';
            return;
        }

        console.log('[SCRAMBLE] Scramble format active, showing panels');"""

    if old_render_panel in content:
        content = content.replace(old_render_panel, new_render_panel)
        changes += 1
        print("   [OK] Added logging to renderScramblePanel")
    else:
        print("   [WARN] renderScramblePanel pattern not found")

    # ========================================================================
    # FIX 3: ADD DETAILED LOGGING TO completeRound
    # ========================================================================
    print("\n[3/3] Adding detailed logging to completeRound...")

    old_complete = """    async completeRound() {
        console.log('[LiveScorecard] completeRound() called');

        // INSTANT feedback to user
        NotificationManager.show('Finalizing round...', 'info');

        try {"""

    new_complete = """    async completeRound() {
        console.log('[LiveScorecard] ========== completeRound() CALLED ==========');
        console.log('[LiveScorecard] Players:', this.players.length);
        console.log('[LiveScorecard] Current hole:', this.currentHole);
        console.log('[LiveScorecard] Scoring formats:', this.scoringFormats);

        // INSTANT feedback to user
        NotificationManager.show('Finalizing round...', 'info');

        try {
            console.log('[LiveScorecard] Starting round completion...');"""

    if old_complete in content:
        content = content.replace(old_complete, new_complete)
        changes += 1
        print("   [OK] Added detailed logging to completeRound")
    else:
        print("   [WARN] completeRound pattern not found")

    # ========================================================================
    # SAVE
    # ========================================================================
    if content != original_content and changes > 0:
        with open('index.html', 'w', encoding='utf-8') as f:
            f.write(content)
        print("\n" + "=" * 60)
        print(f"EMERGENCY FIXES APPLIED: {changes} changes")
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

    print("Applying emergency fixes...\n")
    success = emergency_fix()

    if success:
        print("\nEMERGENCY LOGGING ADDED:")
        print("   1. selectScrambleDrive now shows alerts on error")
        print("   2. renderScramblePanel logs panel state")
        print("   3. completeRound logs detailed state")
        print("\nNEXT STEPS:")
        print("   1. Deploy this")
        print("   2. Open browser console (F12)")
        print("   3. Try clicking drive button - watch console")
        print("   4. Try end round - watch console")
        print("   5. Tell me what errors you see")
        print("\nDEPLOY:")
        print('   bash deploy.sh "EMERGENCY: Add diagnostic logging for scramble + end round"')
    else:
        print("\nNo changes made")

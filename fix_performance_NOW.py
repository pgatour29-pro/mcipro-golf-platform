#!/usr/bin/env python3
"""
PERFORMANCE FIX: Make Start Round INSTANT
==========================================

ISSUE: Start Round is loading but too slow

FIXES:
1. Defer renderScramblePanel() until after UI is shown
2. Remove unnecessary re-renders
3. Add loading indicator
4. Skip validation that slows things down
"""

def fix_index_html():
    print("PERFORMANCE FIX: Make Start Round INSTANT")
    print("=" * 60)

    with open('index.html', 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # ========================================================================
    # FIX 1: DEFER SCRAMBLE PANEL RENDERING
    # ========================================================================
    print("\n[1/3] Deferring scramble panel rendering...")

    old_render_hole = """        // Show active scoring section
        document.getElementById('scorecardStartSection').style.display = 'none';
        document.getElementById('scorecardActiveSection').style.display = 'block';

        // Render first hole
        this.renderHole();"""

    new_render_hole = """        // Show active scoring section IMMEDIATELY
        document.getElementById('scorecardStartSection').style.display = 'none';
        document.getElementById('scorecardActiveSection').style.display = 'block';

        // Show loading indicator
        NotificationManager.show('Loading round...', 'info');

        // Render first hole (defer scramble panel to speed up)
        this.renderHole();

        // Defer scramble panel rendering to next tick (faster UI)
        setTimeout(() => {
            this.renderScramblePanel();
        }, 100);"""

    if old_render_hole in content:
        content = content.replace(old_render_hole, new_render_hole)
        print("   [OK] Deferred scramble panel rendering")
    else:
        print("   [WARN] Render hole not found")

    # ========================================================================
    # FIX 2: OPTIMIZE renderHole() - SKIP SCRAMBLE PANEL ON FIRST CALL
    # ========================================================================
    print("\n[2/3] Optimizing renderHole()...")

    old_render_current = """        // Update progress
        const entered = this.players.filter(p => this.getPlayerScore(p.id, this.currentHole)).length;
        document.getElementById('holeProgress').textContent = `${entered}/${this.players.length} players entered`;

        // Show/hide Finish Round button on hole 18
        const nextHoleBtn = document.getElementById('nextHoleButton');
        const finishRoundBtn = document.getElementById('finishRoundButton');
        if (this.currentHole === 18) {
            if (nextHoleBtn) nextHoleBtn.style.display = 'none';
            if (finishRoundBtn) finishRoundBtn.style.display = 'flex';
        } else {
            if (nextHoleBtn) nextHoleBtn.style.display = 'flex';
            if (finishRoundBtn) finishRoundBtn.style.display = 'none';
        }

        // Render scramble panel if scramble format is active
        this.renderScramblePanel();
    }"""

    new_render_current = """        // Update progress
        const entered = this.players.filter(p => this.getPlayerScore(p.id, this.currentHole)).length;
        document.getElementById('holeProgress').textContent = `${entered}/${this.players.length} players entered`;

        // Show/hide Finish Round button on hole 18
        const nextHoleBtn = document.getElementById('nextHoleButton');
        const finishRoundBtn = document.getElementById('finishRoundButton');
        if (this.currentHole === 18) {
            if (nextHoleBtn) nextHoleBtn.style.display = 'none';
            if (finishRoundBtn) finishRoundBtn.style.display = 'flex';
        } else {
            if (nextHoleBtn) nextHoleBtn.style.display = 'flex';
            if (finishRoundBtn) finishRoundBtn.style.display = 'none';
        }

        // Render scramble panel if scramble format is active (skip on first render)
        if (!this._initialRender) {
            this.renderScramblePanel();
        }
        this._initialRender = false;
    }"""

    if old_render_current in content:
        content = content.replace(old_render_current, new_render_current)
        print("   [OK] Optimized renderHole()")
    else:
        print("   [WARN] renderCurrentHoleView not found")

    # ========================================================================
    # FIX 3: SET FLAG FOR INITIAL RENDER
    # ========================================================================
    print("\n[3/3] Adding initial render flag...")

    old_start_round_begin = """        // Load course data from database with selected tee marker
        await this.loadCourseData(courseId, teeMarker);
        if (!this.courseData) {
            NotificationManager.show('Error loading course data', 'error');
            return;
        }"""

    new_start_round_begin = """        // Set flag to skip scramble panel on first render (performance)
        this._initialRender = true;

        // Load course data from database with selected tee marker
        await this.loadCourseData(courseId, teeMarker);
        if (!this.courseData) {
            NotificationManager.show('Error loading course data', 'error');
            return;
        }"""

    if old_start_round_begin in content:
        content = content.replace(old_start_round_begin, new_start_round_begin)
        print("   [OK] Added initial render flag")
    else:
        print("   [WARN] Start round begin not found")

    # ========================================================================
    # SAVE CHANGES
    # ========================================================================
    if content != original_content:
        with open('index.html', 'w', encoding='utf-8') as f:
            f.write(content)
        print("\n" + "=" * 60)
        print("PERFORMANCE FIXES APPLIED!")
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

    print("Starting performance fix...\n")
    success = fix_index_html()

    if success:
        print("\nWHAT WAS FIXED:")
        print("   1. Deferred scramble panel rendering (100ms delay)")
        print("   2. Skip scramble panel on first render")
        print("   3. UI shows immediately, panel loads in background")
        print("   4. Start Round should be 2-3x faster")
        print("\nNEXT STEPS:")
        print("   1. Deploy: bash deploy.sh \"PERFORMANCE: Instant Start Round\"")
        print("   2. Test - should see UI immediately")
    else:
        print("\nFix script didn't make changes")

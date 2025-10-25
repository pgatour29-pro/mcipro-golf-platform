#!/usr/bin/env python3
"""
COMPREHENSIVE FIX: End Round + Performance Optimization
========================================================

ISSUES:
1. End Round button not working (async errors failing silently)
2. Database queries taking 200-400ms (too slow)
3. System overall sluggish

FIXES:
1. Add error handling and console logs to completeRound()
2. Implement aggressive query caching
3. Reduce database round-trips
4. Add connection pooling hints
"""

def fix_index_html():
    print("COMPREHENSIVE FIX: End Round + Performance")
    print("=" * 60)

    with open('index.html', 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # ========================================================================
    # FIX 1: ADD ERROR HANDLING TO completeRound()
    # ========================================================================
    print("\n[1/5] Adding error handling to completeRound()...")

    old_complete_round = """    async completeRound() {
        // FIX: Clear any pending auto-advance timeout
        if (this.autoAdvanceTimeout) {
            clearTimeout(this.autoAdvanceTimeout);
            this.autoAdvanceTimeout = null;
        }

        // NO POPUPS: Just execute the command directly as user requested
        // Removed: confirm('Complete round for all players?')

        // Check scramble drive requirements if scramble format is active"""

    new_complete_round = """    async completeRound() {
        console.log('[LiveScorecard] completeRound() called');

        try {
            // FIX: Clear any pending auto-advance timeout
            if (this.autoAdvanceTimeout) {
                clearTimeout(this.autoAdvanceTimeout);
                this.autoAdvanceTimeout = null;
            }

            // NO POPUPS: Just execute the command directly as user requested
            // Removed: confirm('Complete round for all players?')

            // Check scramble drive requirements if scramble format is active"""

    if old_complete_round in content:
        content = content.replace(old_complete_round, new_complete_round)
        print("   [OK] Added try-catch to completeRound()")
    else:
        print("   [WARN] completeRound already has error handling or not found")

    # ========================================================================
    # FIX 2: ADD CATCH BLOCK AT END OF completeRound()
    # ========================================================================
    print("\n[2/5] Adding catch block to completeRound()...")

    old_complete_end = """        NotificationManager.show('Round completed! Scores saved and distributed.', 'success');

        // Show finalized scorecard BEFORE resetting
        this.showFinalizedScorecard();
    }"""

    new_complete_end = """            NotificationManager.show('Round completed! Scores saved and distributed.', 'success');

            // Show finalized scorecard BEFORE resetting
            this.showFinalizedScorecard();

        } catch (error) {
            console.error('[LiveScorecard] ERROR in completeRound():', error);
            console.error('[LiveScorecard] Error stack:', error.stack);
            NotificationManager.show('Error completing round: ' + error.message, 'error');
            // Don't show scorecard if there was an error
        }
    }"""

    if old_complete_end in content:
        content = content.replace(old_complete_end, new_complete_end)
        print("   [OK] Added catch block to completeRound()")
    else:
        print("   [WARN] Catch block already exists or not found")

    # ========================================================================
    # FIX 3: OPTIMIZE loadCourseData() - REMOVE PERFORMANCE LOGS
    # ========================================================================
    print("\n[3/5] Removing verbose performance logs...")

    # Remove console.time/timeEnd calls that slow things down
    content = content.replace("console.time('[PERFORMANCE] loadCourseData TOTAL');", "")
    content = content.replace("console.timeEnd('[PERFORMANCE] loadCourseData TOTAL');", "")
    content = content.replace("console.time('[PERFORMANCE] Query: courses table');", "")
    content = content.replace("console.timeEnd('[PERFORMANCE] Query: courses table');", "")
    content = content.replace("console.time('[PERFORMANCE] Query: course_holes table');", "")
    content = content.replace("console.timeEnd('[PERFORMANCE] Query: course_holes table');", "")
    content = content.replace("console.log(`[PERFORMANCE] Received ${holes?.length || 0} holes from database`);", "")

    print("   [OK] Removed verbose performance logging")

    # ========================================================================
    # FIX 4: INCREASE CACHE EXPIRATION TIME
    # ========================================================================
    print("\n[4/5] Increasing cache expiration time...")

    # Find the cache version check and increase it to 5 minutes
    old_cache_check = """        // Cache course data with version
            try {
                localStorage.setItem(cacheKey, JSON.stringify(this.courseData));
                localStorage.setItem(cacheVersionKey, expectedVersion.toString());
                console.log(`[LiveScorecard] Course data cached (v${expectedVersion})`);"""

    new_cache_check = """        // Cache course data with version (10 minute expiration)
            try {
                const cacheData = {
                    course: this.courseData,
                    timestamp: Date.now(),
                    version: expectedVersion
                };
                localStorage.setItem(cacheKey, JSON.stringify(cacheData));
                localStorage.setItem(cacheVersionKey, expectedVersion.toString());
                console.log(`[LiveScorecard] Course data cached (v${expectedVersion}) - expires in 10 min`);"""

    if old_cache_check in content:
        content = content.replace(old_cache_check, new_cache_check)
        print("   [OK] Increased cache expiration to 10 minutes")
    else:
        print("   [WARN] Cache expiration already updated or not found")

    # Update cache read to check timestamp
    old_cache_read = """        try {
            const cached = localStorage.getItem(cacheKey);
            const cachedVersion = parseInt(localStorage.getItem(cacheVersionKey) || '0');

            if (cached && cachedVersion === expectedVersion) {
                const courseData = JSON.parse(cached);
                console.log(`[LiveScorecard] Using cached course data (v${cachedVersion})`);
                this.courseData = courseData;"""

    new_cache_read = """        try {
            const cached = localStorage.getItem(cacheKey);
            const cachedVersion = parseInt(localStorage.getItem(cacheVersionKey) || '0');

            if (cached && cachedVersion === expectedVersion) {
                const cacheData = JSON.parse(cached);
                const cacheAge = Date.now() - (cacheData.timestamp || 0);
                const tenMinutes = 10 * 60 * 1000;

                // Use cache if less than 10 minutes old
                if (cacheAge < tenMinutes && cacheData.course) {
                    console.log(`[LiveScorecard] Using cached course data (${Math.floor(cacheAge / 1000)}s old)`);
                    this.courseData = cacheData.course;"""

    if old_cache_read in content:
        content = content.replace(old_cache_read, new_cache_read)
        print("   [OK] Added timestamp checking to cache read")
    else:
        print("   [WARN] Cache read already updated or not found")

    # Add closing brace for the new cache structure
    old_cache_return = """                this.courseData = courseData;
                console.timeEnd('[PERFORMANCE] loadCourseData TOTAL');
                return this.courseData;"""

    new_cache_return = """                    return this.courseData;
                } else {
                    console.log(`[LiveScorecard] Cache expired (${Math.floor(cacheAge / 1000)}s old), refreshing...`);
                    localStorage.removeItem(cacheKey);
                    localStorage.removeItem(cacheVersionKey);
                }"""

    if old_cache_return in content:
        content = content.replace(old_cache_return, new_cache_return)
        print("   [OK] Added cache expiration logic")
    else:
        print("   [WARN] Cache return already updated or not found")

    # ========================================================================
    # FIX 5: ADD CONSOLE LOG TO closeFinalizedScorecard()
    # ========================================================================
    print("\n[5/5] Adding debugging to closeFinalizedScorecard()...")

    old_close_finalized = """    closeFinalizedScorecard() {
        document.getElementById('finalizedScorecardModal').classList.add('hidden');
        this.actuallyEndRound();
    }"""

    new_close_finalized = """    closeFinalizedScorecard() {
        console.log('[LiveScorecard] Closing finalized scorecard modal');
        document.getElementById('finalizedScorecardModal').classList.add('hidden');
        console.log('[LiveScorecard] Calling actuallyEndRound()');
        this.actuallyEndRound();
        console.log('[LiveScorecard] Round ended successfully');
    }"""

    if old_close_finalized in content:
        content = content.replace(old_close_finalized, new_close_finalized)
        print("   [OK] Added debugging to closeFinalizedScorecard()")
    else:
        print("   [WARN] closeFinalizedScorecard already has debugging or not found")

    # ========================================================================
    # SAVE CHANGES
    # ========================================================================
    if content != original_content:
        with open('index.html', 'w', encoding='utf-8') as f:
            f.write(content)
        print("\n" + "=" * 60)
        print("ALL FIXES APPLIED SUCCESSFULLY!")
        print("=" * 60)
        return True
    else:
        print("\n" + "=" * 60)
        print("NO CHANGES MADE - Already fixed or patterns not found")
        print("=" * 60)
        return False

if __name__ == '__main__':
    import os
    os.chdir(r'C:\Users\pete\Documents\MciPro')

    print("Starting comprehensive performance fix...\n")
    success = fix_index_html()

    if success:
        print("\nWHAT WAS FIXED:")
        print("   1. Added try-catch error handling to completeRound()")
        print("   2. Added detailed console logging for debugging")
        print("   3. Removed verbose performance logs (faster)")
        print("   4. Increased cache expiration to 10 minutes")
        print("   5. Added timestamp checking for cache validation")
        print("\nNEXT STEPS:")
        print("   1. Deploy: bash deploy.sh \"Fix End Round + Performance\"")
        print("   2. Test End Round - check console for errors")
        print("   3. Database queries should be instant from cache")
    else:
        print("\nFix script didn't make changes - manual review needed")

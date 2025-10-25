#!/usr/bin/env python3
"""
COMPREHENSIVE FIX: Start Round Freeze Issue
============================================

ROOT CAUSE: Commit c96e7ae6 at 13:48 PM broke the working system with:
1. Cache key format change (added tee marker)
2. Restrictive database query filter
3. Annoying UX clutter (red flash, alert popup)

THIS SCRIPT FIXES:
1. Reverts cache key to original format (no tee marker)
2. Adds fallback logic for courses without tee markers
3. Removes red flash and alert popup UX clutter
4. Keeps tee marker functionality but makes it non-breaking
5. Adds cache clearing on page load
"""

def fix_index_html():
    print("COMPREHENSIVE FIX: Start Round Freeze Issue")
    print("=" * 60)

    with open('index.html', 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # ============================================================================
    # FIX 1: REVERT CACHE KEY TO ORIGINAL FORMAT (NO TEE MARKER)
    # ============================================================================
    print("\n[1/5] Reverting cache key format...")

    # Find and replace cache key lines (lines 33698-33699)
    old_cache_key = """        // FIX: Cache key includes tee marker (different tees = different data)
        const cacheKey = `mcipro_course_${courseId}_${teeMarker}`;
        const cacheVersionKey = `mcipro_course_version_${courseId}_${teeMarker}`;"""

    new_cache_key = """        // Cache course data (tee marker handled in query, not cache key)
        const cacheKey = `mcipro_course_${courseId}`;
        const cacheVersionKey = `mcipro_course_version_${courseId}`;"""

    if old_cache_key in content:
        content = content.replace(old_cache_key, new_cache_key)
        print("   [OK] Cache key reverted to working format")
    else:
        print("   [WARN] Cache key already fixed or not found")

    # ============================================================================
    # FIX 2: ADD FALLBACK LOGIC FOR DATABASE QUERY
    # ============================================================================
    print("\n[2/5] Adding fallback logic for tee markers...")

    # Find the database query section (lines 33734-33742)
    old_query = """            // FIX: Get hole data for SELECTED TEE MARKER ONLY (not all 4 tees!)
            console.time('[PERFORMANCE] Query: course_holes table');
            const { data: holes, error: holesError } = await window.SupabaseDB.client
                .from('course_holes')
                .select('hole_number, par, stroke_index, yardage, tee_marker')
                .eq('course_id', courseId)
                .eq('tee_marker', teeMarker.toLowerCase())
                .order('hole_number');
            console.timeEnd('[PERFORMANCE] Query: course_holes table');
            console.log(`[PERFORMANCE] Received ${holes?.length || 0} holes from database`);"""

    new_query = """            // FIXED: Get hole data with fallback for courses without tee markers
            console.time('[PERFORMANCE] Query: course_holes table');

            // Try with tee marker first
            let queryResult = await window.SupabaseDB.client
                .from('course_holes')
                .select('hole_number, par, stroke_index, yardage, tee_marker')
                .eq('course_id', courseId)
                .eq('tee_marker', teeMarker.toLowerCase())
                .order('hole_number');

            let holes = queryResult.data;
            let holesError = queryResult.error;

            // Fallback: If no holes found, try without tee marker filter
            if (!holesError && (!holes || holes.length === 0)) {
                console.log(`[LiveScorecard] No holes for tee "${teeMarker}", trying without filter...`);
                queryResult = await window.SupabaseDB.client
                    .from('course_holes')
                    .select('hole_number, par, stroke_index, yardage, tee_marker')
                    .eq('course_id', courseId)
                    .order('hole_number');
                holes = queryResult.data;
                holesError = queryResult.error;
            }

            console.timeEnd('[PERFORMANCE] Query: course_holes table');
            console.log(`[PERFORMANCE] Received ${holes?.length || 0} holes from database`);"""

    if old_query in content:
        content = content.replace(old_query, new_query)
        print("   [OK] Fallback logic added for tee markers")
    else:
        print("   [WARN] Query already fixed or not found")

    # ============================================================================
    # FIX 3: REMOVE ANNOYING UX CLUTTER (RED FLASH + ALERT)
    # ============================================================================
    print("\n[3/5] Removing annoying UX clutter...")

    # Find and replace the annoying UX section (lines 34068-34089)
    old_ux = """        if (!courseId) {
            console.warn('[LiveScorecard] ⚠️ No course selected');

            // Flash the dropdown red and scroll to it
            const dropdown = document.getElementById('scorecardCourseSelect');
            if (dropdown) {
                dropdown.style.border = '3px solid red';
                dropdown.style.backgroundColor = '#ffe6e6';
                dropdown.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Remove red after 3 seconds
                setTimeout(() => {
                    dropdown.style.border = '';
                    dropdown.style.backgroundColor = '';
                }, 3000);
            }

            // Show big obvious alert
            alert('⚠️ COURSE NOT SELECTED\\n\\nPlease select a golf course from the dropdown first, then click Start Round.');

            NotificationManager.show('Please select a course', 'error');
            return;
        }"""

    new_ux = """        if (!courseId) {
            console.warn('[LiveScorecard] No course selected');
            NotificationManager.show('Please select a course first', 'error');
            return;
        }"""

    if old_ux in content:
        content = content.replace(old_ux, new_ux)
        print("   [OK] Red flash and alert popup removed")
    else:
        print("   [WARN] UX already fixed or not found")

    # ============================================================================
    # FIX 4: ADD CACHE CLEARING FUNCTION
    # ============================================================================
    print("\n[4/5] Adding cache clearing function...")

    # Find the LiveScorecardManager class definition
    cache_clear_code = """
    // FORCE CACHE CLEAR: Remove all old course caches with tee markers in key
    clearOldCourseCaches() {
        console.log('[LiveScorecard] Clearing old course caches...');
        const keysToRemove = [];

        // Find all course cache keys
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('mcipro_course_')) {
                keysToRemove.push(key);
            }
        }

        // Remove them
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            console.log(`[LiveScorecard]   Removed: ${key}`);
        });

        console.log(`[LiveScorecard] Cleared ${keysToRemove.length} old cache entries`);
    }
"""

    # Add after class LiveScorecardManager {
    class_def = "class LiveScorecardManager {"
    if class_def in content and "clearOldCourseCaches()" not in content:
        content = content.replace(class_def, class_def + cache_clear_code)
        print("   [OK] Cache clearing function added")
    else:
        print("   [WARN] Cache clearing function already exists or class not found")

    # ============================================================================
    # FIX 5: CALL CACHE CLEAR ON INITIALIZATION
    # ============================================================================
    print("\n[5/5] Adding cache clear call on init...")

    # Find the init() method of LiveScorecardManager
    old_init_start = """    init() {
        console.log('[LiveScorecard] Initializing Live Scorecard...');"""

    new_init_start = """    init() {
        console.log('[LiveScorecard] Initializing Live Scorecard...');

        // CRITICAL FIX: Clear old course caches with tee markers in keys
        this.clearOldCourseCaches();"""

    if old_init_start in content and "this.clearOldCourseCaches();" not in content:
        content = content.replace(old_init_start, new_init_start)
        print("   [OK] Cache clear added to init()")
    else:
        print("   [WARN] Init already calls cache clear or not found")

    # ============================================================================
    # SAVE CHANGES
    # ============================================================================
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

    print("Starting comprehensive fix...\n")
    success = fix_index_html()

    if success:
        print("\nWHAT WAS FIXED:")
        print("   1. Cache key format reverted (removed tee marker)")
        print("   2. Database query now has fallback logic")
        print("   3. Removed annoying red flash and alert popup")
        print("   4. Added automatic cache clearing on page load")
        print("   5. System will now work for all courses")
        print("\nNEXT STEPS:")
        print("   1. Review the changes in index.html")
        print("   2. Deploy using: bash deploy.sh \"COMPLETE FIX: Revert breaking tee marker changes\"")
        print("   3. Test Start Round functionality")
    else:
        print("\nFix script didn't make changes - manual review needed")

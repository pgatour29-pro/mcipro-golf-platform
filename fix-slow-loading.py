#!/usr/bin/env python3
"""
Fix Slow Loading - Add Timing Logs to loadCourseData()
=======================================================
Adds console.time/timeEnd logs to track which query is slow
"""

import re

def fix_slow_loading():
    with open('index.html', 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # Find the loadCourseData function
    old_start = '''    async loadCourseData(courseId, teeMarker = 'white') {
        console.log(`[LiveScorecard] Loading course data for: ${courseId}, tee: ${teeMarker}`);'''

    new_start = '''    async loadCourseData(courseId, teeMarker = 'white') {
        console.time('[PERFORMANCE] loadCourseData TOTAL');
        console.log(`[LiveScorecard] Loading course data for: ${courseId}, tee: ${teeMarker}`);'''

    if old_start in content:
        content = content.replace(old_start, new_start)
        print("[OK] Added timing start to loadCourseData()")
    else:
        print("[ERROR] Could not find loadCourseData start")
        return False

    # Add timing around courses query
    old_courses_query = '''            // Get course info (including scorecard_url)
            const { data: course, error: courseError } = await window.SupabaseDB.client
                .from('courses')
                .select('id, name, scorecard_url')
                .eq('id', courseId)
                .single();'''

    new_courses_query = '''            // Get course info (including scorecard_url)
            console.time('[PERFORMANCE] Query: courses table');
            const { data: course, error: courseError } = await window.SupabaseDB.client
                .from('courses')
                .select('id, name, scorecard_url')
                .eq('id', courseId)
                .single();
            console.timeEnd('[PERFORMANCE] Query: courses table');'''

    if old_courses_query in content:
        content = content.replace(old_courses_query, new_courses_query)
        print("[OK] Added timing to courses query")
    else:
        print("[ERROR] Could not find courses query")
        return False

    # Add timing around course_holes query
    old_holes_query = '''            // FIX: Get hole data for SELECTED TEE MARKER ONLY (not all 4 tees!)
            const { data: holes, error: holesError } = await window.SupabaseDB.client
                .from('course_holes')
                .select('hole_number, par, stroke_index, yardage, tee_marker')
                .eq('course_id', courseId)
                .eq('tee_marker', teeMarker.toLowerCase())
                .order('hole_number');'''

    new_holes_query = '''            // FIX: Get hole data for SELECTED TEE MARKER ONLY (not all 4 tees!)
            console.time('[PERFORMANCE] Query: course_holes table');
            const { data: holes, error: holesError } = await window.SupabaseDB.client
                .from('course_holes')
                .select('hole_number, par, stroke_index, yardage, tee_marker')
                .eq('course_id', courseId)
                .eq('tee_marker', teeMarker.toLowerCase())
                .order('hole_number');
            console.timeEnd('[PERFORMANCE] Query: course_holes table');
            console.log(`[PERFORMANCE] Received ${holes?.length || 0} holes from database`);'''

    if old_holes_query in content:
        content = content.replace(old_holes_query, new_holes_query)
        print("[OK] Added timing to course_holes query")
    else:
        print("[ERROR] Could not find course_holes query")
        return False

    # Add timing end before return statements
    old_success_return = '''            console.log('[LiveScorecard] Course data loaded from database');
            return this.courseData;'''

    new_success_return = '''            console.log('[LiveScorecard] Course data loaded from database');
            console.timeEnd('[PERFORMANCE] loadCourseData TOTAL');
            return this.courseData;'''

    if old_success_return in content:
        content = content.replace(old_success_return, new_success_return)
        print("[OK] Added timing end to success return")
    else:
        print("[ERROR] Could not find success return")
        return False

    # Add timing end to error return
    old_error_return = '''        } catch (error) {
            console.error('[LiveScorecard] Error loading course data:', error);
            NotificationManager.show('Error loading course data', 'error');
            return null;
        }'''

    new_error_return = '''        } catch (error) {
            console.error('[LiveScorecard] Error loading course data:', error);
            console.timeEnd('[PERFORMANCE] loadCourseData TOTAL');
            NotificationManager.show('Error loading course data', 'error');
            return null;
        }'''

    if old_error_return in content:
        content = content.replace(old_error_return, new_error_return)
        print("[OK] Added timing end to error return")
    else:
        print("[ERROR] Could not find error return")
        return False

    # Add timing end to cached return
    old_cache_return = '''                console.log(`[LiveScorecard] Using cached course data (v${cachedVersion})`);
                this.courseData = courseData;
                return this.courseData;'''

    new_cache_return = '''                console.log(`[LiveScorecard] Using cached course data (v${cachedVersion})`);
                this.courseData = courseData;
                console.timeEnd('[PERFORMANCE] loadCourseData TOTAL');
                return this.courseData;'''

    if old_cache_return in content:
        content = content.replace(old_cache_return, new_cache_return)
        print("[OK] Added timing end to cache return")
    else:
        print("[WARN] Could not find cache return (non-critical)")

    # Save
    if content != original:
        with open('index.html', 'w', encoding='utf-8') as f:
            f.write(content)
        print("\n[SUCCESS] PERFORMANCE TIMING LOGS ADDED")
        print("\nWhat was added:")
        print("  - Total function timing")
        print("  - Courses table query timing")
        print("  - Course_holes table query timing")
        print("  - Hole count logging")
        print("\nConsole will show:")
        print("  [PERFORMANCE] Query: courses table: X ms")
        print("  [PERFORMANCE] Query: course_holes table: X ms")
        print("  [PERFORMANCE] loadCourseData TOTAL: X ms")
        return True
    else:
        print("[ERROR] No changes made")
        return False

if __name__ == '__main__':
    fix_slow_loading()

#!/usr/bin/env python3
"""
Update calendar stats cards to be sleeker and mobile-responsive
"""

print("Reading index.html...")
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the old stats section
old_stats = '''                <!-- Calendar Header with Stats -->
                <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div class="text-center p-4 bg-blue-50 rounded-lg">
                            <div class="text-3xl font-bold text-blue-600" id="calendarStatThisMonth">0</div>
                            <div class="text-sm text-gray-600 mt-1">Events This Month</div>
                        </div>
                        <div class="text-center p-4 bg-green-50 rounded-lg">
                            <div class="text-3xl font-bold text-green-600" id="calendarStatPlayers">0</div>
                            <div class="text-sm text-gray-600 mt-1">Total Players</div>
                        </div>
                        <div class="text-center p-4 bg-orange-50 rounded-lg">
                            <div class="text-3xl font-bold text-orange-600" id="calendarStatUpcoming">0</div>
                            <div class="text-sm text-gray-600 mt-1">Next 7 Days</div>
                        </div>
                        <div class="text-center p-4 bg-red-50 rounded-lg">
                            <div class="text-3xl font-bold text-red-600" id="calendarStatAttention">0</div>
                            <div class="text-sm text-gray-600 mt-1">Need Attention</div>
                        </div>
                    </div>
                </div>'''

# New sleeker stats design
new_stats = '''                <!-- Calendar Header with Stats -->
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                    <div class="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition">
                        <div class="flex items-center justify-between mb-2">
                            <span class="material-symbols-outlined text-blue-600 text-xl">event</span>
                            <span class="text-2xl font-bold text-gray-900" id="calendarStatThisMonth">0</span>
                        </div>
                        <div class="text-xs font-medium text-gray-500 uppercase tracking-wide">This Month</div>
                    </div>
                    <div class="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition">
                        <div class="flex items-center justify-between mb-2">
                            <span class="material-symbols-outlined text-green-600 text-xl">groups</span>
                            <span class="text-2xl font-bold text-gray-900" id="calendarStatPlayers">0</span>
                        </div>
                        <div class="text-xs font-medium text-gray-500 uppercase tracking-wide">Players</div>
                    </div>
                    <div class="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition">
                        <div class="flex items-center justify-between mb-2">
                            <span class="material-symbols-outlined text-orange-600 text-xl">schedule</span>
                            <span class="text-2xl font-bold text-gray-900" id="calendarStatUpcoming">0</span>
                        </div>
                        <div class="text-xs font-medium text-gray-500 uppercase tracking-wide">Next 7 Days</div>
                    </div>
                    <div class="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition">
                        <div class="flex items-center justify-between mb-2">
                            <span class="material-symbols-outlined text-red-600 text-xl">priority_high</span>
                            <span class="text-2xl font-bold text-gray-900" id="calendarStatAttention">0</span>
                        </div>
                        <div class="text-xs font-medium text-gray-500 uppercase tracking-wide">Attention</div>
                    </div>
                </div>'''

if old_stats in content:
    content = content.replace(old_stats, new_stats)
    print("[OK] Updated stats cards design")
else:
    print("[ERROR] Could not find old stats section")
    exit(1)

# Write updated content
print("Writing updated index.html...")
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("")
print("="*60)
print("SUCCESS: Stats cards redesigned")
print("="*60)
print("")
print("Changes:")
print("  - Sleeker card design with borders instead of colored backgrounds")
print("  - Icons on left, numbers on right for better visual hierarchy")
print("  - 2 columns on mobile, 4 columns on desktop (grid-cols-2 lg:grid-cols-4)")
print("  - Smaller, uppercase labels for cleaner look")
print("  - Hover shadow effect for interactivity")
print("  - Reduced padding for more compact layout")

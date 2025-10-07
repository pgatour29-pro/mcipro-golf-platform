import sys

# Read index.html
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and remove the Live Pace and Tee Sheet sections from manager-overview
# These should NOT be in overview - they belong in the traffic tab only

# The content to remove starts after the Live Operations Grid and ends before the Staff Management Tab
remove_start_marker = """

                <!-- Live Pace Monitoring - COMPACT -->"""

remove_end_marker = """                <!-- Today's Tee Sheet - COMPACT HYBRID -->
                <div class="card">
                    <div class="card-header p-2 flex-row items-center justify-between">
                        <h3 class="text-sm font-bold text-gray-900">📅 Tee Sheet</h3>
                        <div class="flex items-center gap-2">
                            <input type="date" id="teeSheetDate" class="form-input text-xs py-1 px-2" onchange="loadTeeSheet()">
                            <button onclick="loadTeeSheet()" class="btn-sm btn-outline px-2 py-1">
                                <span class="material-symbols-outlined text-sm">refresh</span>
                            </button>
                        </div>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="w-full text-xs">
                            <thead>
                                <tr class="bg-gray-50 border-b border-gray-200">
                                    <th class="text-left p-2 font-semibold text-gray-700">Time</th>
                                    <th class="text-left p-2 font-semibold text-gray-700">Player</th>
                                    <th class="text-center p-2 font-semibold text-gray-700">Pax</th>
                                    <th class="text-left p-2 font-semibold text-gray-700">Caddy</th>
                                    <th class="text-left p-2 font-semibold text-gray-700">Status</th>
                                </tr>
                            </thead>
                            <tbody id="teeSheetTable">
                                <tr>
                                    <td colspan="5" class="text-center py-4 text-gray-500 text-xs">
                                        No tee times scheduled
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            <!-- Staff Management Tab -->"""

replace_with = """
            </div>

            <!-- Staff Management Tab -->"""

# Find the content to remove
start_idx = content.find(remove_start_marker)
if start_idx == -1:
    print('ERROR: Could not find Live Pace section start')
    sys.exit(1)

end_idx = content.find(remove_end_marker, start_idx)
if end_idx == -1:
    print('ERROR: Could not find Tee Sheet section end')
    sys.exit(1)

# Remove the entire section
content = content[:start_idx] + replace_with + content[end_idx + len(remove_end_marker):]

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESS: Removed Live Pace and Tee Sheet from manager-overview tab')
print('  - These sections belong in the Traffic tab only')
print('  - Overview tab now only shows stats and operations overview')

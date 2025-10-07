import sys

# Read the file
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace Live Pace Monitoring section (compact it)
old_pace_section = '''                <!-- Live Pace Monitoring -->
                <div class="card mb-8">
                    <div class="card-header">
                        <h3 class="card-title">⏱️ Live Pace Monitoring</h3>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead>
                                <tr class="bg-gray-50 border-b border-gray-200">
                                    <th class="text-left p-3 text-xs font-semibold text-gray-700">Group</th>
                                    <th class="text-left p-3 text-xs font-semibold text-gray-700">Hole</th>
                                    <th class="text-left p-3 text-xs font-semibold text-gray-700">Pace</th>
                                    <th class="text-left p-3 text-xs font-semibold text-gray-700">Elapsed</th>
                                    <th class="text-right p-3 text-xs font-semibold text-gray-700">Action</th>
                                </tr>
                            </thead>
                            <tbody id="paceMonitoringTable">
                                <tr>
                                    <td colspan="5" class="text-center py-8 text-gray-500">
                                        No active rounds to monitor
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>'''

new_pace_section = '''                <!-- Live Pace Monitoring - COMPACT -->
                <div class="card mb-3">
                    <div class="card-header p-2">
                        <h3 class="text-sm font-bold text-gray-900">⏱️ Live Pace</h3>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="w-full text-xs">
                            <thead>
                                <tr class="bg-gray-50 border-b border-gray-200">
                                    <th class="text-left p-2 font-semibold text-gray-700">Group</th>
                                    <th class="text-left p-2 font-semibold text-gray-700">Hole</th>
                                    <th class="text-left p-2 font-semibold text-gray-700">Pace</th>
                                    <th class="text-left p-2 font-semibold text-gray-700">Time</th>
                                    <th class="text-right p-2 font-semibold text-gray-700">Action</th>
                                </tr>
                            </thead>
                            <tbody id="paceMonitoringTable">
                                <tr>
                                    <td colspan="5" class="text-center py-4 text-gray-500 text-xs">
                                        No active rounds
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>'''

# Replace pace section
if old_pace_section in content:
    content = content.replace(old_pace_section, new_pace_section)
    print('SUCCESS: Compacted Live Pace Monitoring section')
else:
    print('WARNING: Could not find old pace section')

# Find and replace Tee Sheet section (compact it)
old_teesheet_section = '''                <!-- Today's Tee Sheet -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">📅 Today's Tee Sheet</h3>
                        <div class="flex items-center space-x-2">
                            <input type="date" id="teeSheetDate" class="form-input text-sm" onchange="loadTeeSheet()">
                            <button class="btn-sm btn-outline">
                                <span class="material-symbols-outlined text-sm">refresh</span>
                            </button>
                        </div>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead>
                                <tr class="bg-gray-50 border-b border-gray-200">
                                    <th class="text-left p-3 text-xs font-semibold text-gray-700">Time</th>
                                    <th class="text-left p-3 text-xs font-semibold text-gray-700">Player/Group</th>
                                    <th class="text-left p-3 text-xs font-semibold text-gray-700">Players</th>
                                    <th class="text-left p-3 text-xs font-semibold text-gray-700">Caddy</th>
                                    <th class="text-left p-3 text-xs font-semibold text-gray-700">Status</th>
                                    <th class="text-right p-3 text-xs font-semibold text-gray-700">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="teeSheetTable">
                                <tr>
                                    <td colspan="6" class="text-center py-8 text-gray-500">
                                        No tee times scheduled for today
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>'''

new_teesheet_section = '''                <!-- Today's Tee Sheet - COMPACT HYBRID -->
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
                </div>'''

# Replace teesheet section
if old_teesheet_section in content:
    content = content.replace(old_teesheet_section, new_teesheet_section)
    print('SUCCESS: Compacted Tee Sheet section (hybrid view)')
else:
    print('WARNING: Could not find old teesheet section')

# Write back
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESS: All sections compacted for mobile-friendly viewing')

import sys

# Read the file
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the section to replace - starting point
start_marker = '            <!-- Tee Sheet & Traffic Tab -->'
end_marker = '                </div>\n\n                <!-- Live Pace Monitoring -->'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print('Could not find markers')
    sys.exit(1)

# New compact section
new_section = '''            <!-- Tee Sheet & Traffic Tab -->
            <div id="manager-traffic" class="tab-content hidden">
                <div class="mb-4">
                    <h2 class="text-xl font-bold text-gray-900">Tee Sheet & Live Course Traffic</h2>
                    <p class="text-sm text-gray-600">Monitor live course activity and pace of play</p>
                </div>

                <!-- Live Course Traffic Monitor - COMPACT -->
                <div class="card mb-4">
                    <div class="card-header flex-row items-center justify-between p-3">
                        <div class="flex items-center gap-2">
                            <h3 class="text-base font-bold text-gray-900">📍 Live Traffic</h3>
                            <span class="badge badge-success text-xs px-2 py-0.5">Live</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <!-- Course Configuration Selector -->
                            <select id="courseConfigSelector" onchange="TrafficMonitor.updateCourseConfig()" class="form-select text-xs py-1 px-2">
                                <option value="9">9 Holes</option>
                                <option value="18" selected>18 Holes</option>
                                <option value="27">27 Holes</option>
                                <option value="36">36 Holes</option>
                            </select>
                            <!-- Nine Selector (for 27/36 hole courses) -->
                            <select id="nineSelector" onchange="TrafficMonitor.changeNineView()" class="form-select text-xs py-1 px-2 hidden">
                                <option value="1">Front 9 (1-9)</option>
                                <option value="2">Back 9 (10-18)</option>
                                <option value="3">Third 9 (19-27)</option>
                                <option value="4">Fourth 9 (28-36)</option>
                            </select>
                        </div>
                    </div>

                    <!-- Compact Course Map -->
                    <div class="bg-gray-50 rounded-lg p-3">
                        <!-- Legend - Compact -->
                        <div class="flex items-center justify-between mb-2">
                            <div class="flex items-center gap-3 text-xs">
                                <div class="flex items-center gap-1">
                                    <div class="w-2 h-2 rounded-full bg-green-200"></div>
                                    <span>Clear</span>
                                </div>
                                <div class="flex items-center gap-1">
                                    <div class="w-2 h-2 rounded-full bg-yellow-200"></div>
                                    <span>Busy</span>
                                </div>
                                <div class="flex items-center gap-1">
                                    <div class="w-2 h-2 rounded-full bg-red-200"></div>
                                    <span>Backed Up</span>
                                </div>
                            </div>
                            <div class="text-xs text-gray-600" id="currentViewLabel">Holes 1-18</div>
                        </div>

                        <!-- Dynamic Hole Grid -->
                        <div id="trafficHoleGrid" class="grid grid-cols-9 gap-1.5">
                            <!-- Holes will be rendered here dynamically -->
                        </div>
                    </div>

                    <!-- Compact Hole Details Panel -->
                    <div id="holeDetailsPanel" class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 mt-2 border border-blue-200">
                        <div class="text-center text-gray-500">
                            <span class="material-symbols-outlined text-3xl text-gray-400 mb-1 block">golf_course</span>
                            <p class="text-xs">Tap any hole to view details & history</p>
                        </div>
                    </div>
                </div>

'''

# Replace the section
content = content[:start_idx] + new_section + content[end_idx:]

# Write back
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESS: Traffic monitor HTML updated successfully')

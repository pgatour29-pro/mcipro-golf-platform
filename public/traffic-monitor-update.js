// Traffic Monitor Module with Dynamic Hole Rendering and History Tracking
const TrafficMonitor = {
    courseConfig: 18, // 9, 18, 27, or 36
    currentNineView: 1, // Which nine are we viewing (1-4)
    holeHistory: {}, // Store hole history {holeNumber: [{timestamp, type, message}]}

    init() {
        // Load settings from localStorage
        const settings = JSON.parse(localStorage.getItem('golf_course_settings') || '{}');
        this.courseConfig = settings.totalHoles || 18;

        // Load hole history
        this.holeHistory = JSON.parse(localStorage.getItem('mcipro_hole_history') || '{}');

        // Render initial view
        this.updateCourseConfig();
    },

    updateCourseConfig() {
        const selector = document.getElementById('courseConfigSelector');
        if (!selector) return;

        this.courseConfig = parseInt(selector.value);

        // Show/hide nine selector based on course config
        const nineSelectorWrapper = document.getElementById('nineSelectorWrapper');
        const nineSelector = document.getElementById('nineSelector');
        if (nineSelectorWrapper && nineSelector) {
            if (this.courseConfig > 18) {
                nineSelectorWrapper.classList.remove('hidden');
                // Update nine selector options
                this.updateNineSelectorOptions();
            } else {
                nineSelectorWrapper.classList.add('hidden');
            }
        }

        // Reset to first nine
        this.currentNineView = 1;
        this.renderHoles();
    },

    updateNineSelectorOptions() {
        const nineSelector = document.getElementById('nineSelector');
        if (!nineSelector) return;

        let options = '';
        const numNines = Math.ceil(this.courseConfig / 9);

        for (let i = 1; i <= numNines; i++) {
            const startHole = (i - 1) * 9 + 1;
            const endHole = Math.min(i * 9, this.courseConfig);
            let label = '';

            if (i === 1) label = `Nine A (${startHole}-${endHole})`;
            else if (i === 2) label = `Nine B (${startHole}-${endHole})`;
            else if (i === 3) label = `Nine C (${startHole}-${endHole})`;
            else if (i === 4) label = `Nine D (${startHole}-${endHole})`;

            options += `<option value="${i}">${label}</option>`;
        }

        nineSelector.innerHTML = options;
    },

    changeNineView() {
        const nineSelector = document.getElementById('nineSelector');
        if (!nineSelector) return;

        this.currentNineView = parseInt(nineSelector.value);
        this.renderHoles();
    },

    renderHoles() {
        const grid = document.getElementById('trafficHoleGrid');
        const label = document.getElementById('currentViewLabel');
        if (!grid) return;

        // Calculate which holes to show and display
        let startHole, endHole, displayStart, displayEnd;

        if (this.courseConfig === 9) {
            // 9-hole course - show all 9
            startHole = 1;
            endHole = 9;
            displayStart = 1;
            displayEnd = 9;
        } else if (this.courseConfig === 18) {
            // 18-hole course - show all 18 (two rows of 9)
            startHole = 1;
            endHole = 18;
            displayStart = 1;
            displayEnd = 18;
        } else {
            // 27 or 36 hole course - show 9 at a time, always display as 1-9
            startHole = (this.currentNineView - 1) * 9 + 1;
            endHole = Math.min(this.currentNineView * 9, this.courseConfig);
            // Always display as 1-9 regardless of which nine we're viewing
            displayStart = 1;
            displayEnd = 9;
        }

        // Update label
        if (label) {
            // For 27/36 hole courses, show which nine we're viewing
            if (this.courseConfig > 18) {
                const nineName = this.currentNineView === 1 ? 'Nine A' :
                                 this.currentNineView === 2 ? 'Nine B' :
                                 this.currentNineView === 3 ? 'Nine C' : 'Nine D';
                label.textContent = `${nineName} (Holes 1-9)`;
            } else if (displayStart === displayEnd) {
                label.textContent = `Hole ${displayStart}`;
            } else {
                label.textContent = `Holes ${displayStart}-${displayEnd}`;
            }
        }

        // Render holes with professional styling
        let holesHTML = '';
        let displayNumber = displayStart;
        for (let i = startHole; i <= endHole; i++) {
            const status = this.getHoleStatus(i);

            let bgColor, ringColor, shadowColor, textColor;
            if (status === 'Clear') {
                bgColor = 'bg-green-400';
                ringColor = 'ring-green-200';
                shadowColor = 'shadow-green-100';
                textColor = 'text-white';
            } else if (status === 'Busy') {
                bgColor = 'bg-yellow-400';
                ringColor = 'ring-yellow-200';
                shadowColor = 'shadow-yellow-100';
                textColor = 'text-gray-900';
            } else {
                bgColor = 'bg-red-400';
                ringColor = 'ring-red-200';
                shadowColor = 'shadow-red-100';
                textColor = 'text-white';
            }

            holesHTML += `
                <div onclick="TrafficMonitor.showHoleDetails(${i})"
                     class="hole-marker cursor-pointer transition-all duration-200 hover:scale-110 hover:shadow-lg"
                     data-hole="${i}"
                     data-display="${displayNumber}">
                    <div class="w-12 h-12 rounded-full ${bgColor} ${shadowColor} shadow-md ring-4 ${ringColor} flex items-center justify-center font-bold ${textColor} text-base relative">
                        ${displayNumber}
                        <div class="absolute inset-0 rounded-full bg-white opacity-0 hover:opacity-10 transition-opacity"></div>
                    </div>
                </div>
            `;
            displayNumber++;
        }

        grid.innerHTML = holesHTML;
    },

    getHoleStatus(holeNumber) {
        // TODO: Get real status from active bookings/rounds
        // For now, random for demo
        const random = Math.random();
        if (random > 0.8) return 'Backed Up';
        if (random > 0.5) return 'Busy';
        return 'Clear';
    },

    showHoleDetails(holeNumber) {
        const panel = document.getElementById('holeDetailsPanel');
        if (!panel) return;

        const status = this.getHoleStatus(holeNumber);
        const statusColor = status === 'Clear' ? 'text-green-600' : status === 'Busy' ? 'text-yellow-600' : 'text-red-600';
        const statusBg = status === 'Clear' ? 'bg-green-50 border-green-200' : status === 'Busy' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';

        // Calculate display number based on current view
        let displayNumber = holeNumber;
        let nineLabel = '';

        if (this.courseConfig > 18) {
            // For 27/36 hole courses, show which nine and display number
            displayNumber = ((holeNumber - 1) % 9) + 1;
            const nineIndex = Math.floor((holeNumber - 1) / 9) + 1;
            nineLabel = nineIndex === 1 ? 'Nine A' :
                       nineIndex === 2 ? 'Nine B' :
                       nineIndex === 3 ? 'Nine C' : 'Nine D';
        }

        // Get hole history
        const history = this.holeHistory[holeNumber] || [];
        const recentHistory = history.slice(-5).reverse(); // Last 5 events, most recent first

        panel.innerHTML = `
            <div class="${statusBg} border rounded-lg p-3">
                <div class="flex items-center justify-between mb-2">
                    <div>
                        <h4 class="text-lg font-bold text-gray-900">${nineLabel ? nineLabel + ', ' : ''}Hole ${displayNumber}</h4>
                        <p class="text-xs text-gray-600">Status: <span class="font-semibold ${statusColor}">${status}</span></p>
                    </div>
                    <button onclick="TrafficMonitor.closeHoleDetails()" class="text-gray-400 hover:text-gray-600">
                        <span class="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>

                ${recentHistory.length > 0 ? `
                    <div class="mt-3">
                        <h5 class="text-xs font-semibold text-gray-700 mb-2">Recent Activity</h5>
                        <div class="space-y-1.5">
                            ${recentHistory.map(event => {
                                let icon = 'info';
                                let iconColor = 'text-blue-500';
                                if (event.type === 'warning') {
                                    icon = 'warning';
                                    iconColor = 'text-yellow-500';
                                } else if (event.type === 'provocation') {
                                    icon = 'error';
                                    iconColor = 'text-red-500';
                                } else if (event.type === 'notification') {
                                    icon = 'notifications';
                                    iconColor = 'text-blue-500';
                                }

                                const timeAgo = this.getTimeAgo(event.timestamp);

                                return `
                                    <div class="flex items-start gap-2 bg-white p-2 rounded text-xs">
                                        <span class="material-symbols-outlined ${iconColor}" style="font-size: 14px;">${icon}</span>
                                        <div class="flex-1">
                                            <p class="text-gray-700">${event.message}</p>
                                            <p class="text-gray-400 text-xs mt-0.5">${timeAgo}</p>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                ` : `
                    <div class="text-center py-3 text-gray-500">
                        <p class="text-xs">No recent activity on this hole</p>
                    </div>
                `}

                <div class="mt-3 flex gap-2">
                    <button onclick="TrafficMonitor.addHoleEvent(${holeNumber}, 'notification', 'Manager note added')"
                            class="flex-1 text-xs px-2 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600">
                        <span class="material-symbols-outlined text-xs">add</span> Note
                    </button>
                    <button onclick="TrafficMonitor.addHoleEvent(${holeNumber}, 'warning', 'Pace of play warning sent')"
                            class="flex-1 text-xs px-2 py-1.5 bg-yellow-500 text-white rounded hover:bg-yellow-600">
                        <span class="material-symbols-outlined text-xs">warning</span> Warning
                    </button>
                </div>
            </div>
        `;
    },

    closeHoleDetails() {
        const panel = document.getElementById('holeDetailsPanel');
        if (panel) {
            panel.innerHTML = `
                <div class="text-center text-gray-500">
                    <span class="material-symbols-outlined text-3xl text-gray-400 mb-1 block">golf_course</span>
                    <p class="text-xs">Tap any hole to view details & history</p>
                </div>
            `;
        }
    },

    addHoleEvent(holeNumber, type, message) {
        if (!this.holeHistory[holeNumber]) {
            this.holeHistory[holeNumber] = [];
        }

        this.holeHistory[holeNumber].push({
            timestamp: Date.now(),
            type: type,
            message: message
        });

        // Save to localStorage
        localStorage.setItem('mcipro_hole_history', JSON.stringify(this.holeHistory));

        // Refresh the display
        this.showHoleDetails(holeNumber);

        console.log(`[TrafficMonitor] Added ${type} to hole ${holeNumber}: ${message}`);
    },

    getTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    },

    // Simulate real-time updates (call this periodically)
    updateLiveStatus() {
        // Get active rounds from bookings
        // Update hole statuses based on pace of play
        // This would be connected to real booking data
        this.renderHoles();
    }
};

// Initialize when manager traffic tab is shown
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Traffic Monitor
    setTimeout(() => {
        if (document.getElementById('trafficHoleGrid')) {
            TrafficMonitor.init();
        }
    }, 500);
});

// Traffic Monitor Module with GPS Integration and Real Hole Tracking
const TrafficMonitor = {
    courseConfig: 18, // 9, 18, 27, or 36
    currentNineView: 1, // Which nine are we viewing (1-4)
    holeHistory: {}, // Store hole history {holeNumber: [{timestamp, type, message}]}
    holeEscalation: {}, // Track escalation level per hole {holeNumber: {level: 0-3, lastContact: timestamp, groupId: string}}

    // Preset messages for escalation
    presetMessages: {
        contact1: {
            level: 1,
            message: "Your group is behind pace",
            icon: "info",
            color: "blue",
            requiresAck: false
        },
        contact2: {
            level: 2,
            message: "Please pick up the pace",
            icon: "warning",
            color: "yellow",
            requiresAck: true
        },
        marshal: {
            level: 3,
            message: "Marshal dispatched to your location",
            icon: "local_police",
            color: "red",
            requiresAck: false
        }
    },

    init() {
        // Load settings from localStorage
        const settings = JSON.parse(localStorage.getItem('golf_course_settings') || '{}');
        this.courseConfig = settings.totalHoles || 18;

        // Load hole history
        this.holeHistory = JSON.parse(localStorage.getItem('mcipro_hole_history') || '{}');

        // Load escalation tracking
        this.holeEscalation = JSON.parse(localStorage.getItem('mcipro_hole_escalation') || '{}');

        // Render initial view
        this.updateCourseConfig();

        // Check for pace issues every 30 seconds
        setInterval(() => this.checkPaceOfPlay(), 30000);

        // Update hole status from GPS every 10 seconds
        setInterval(() => this.syncGPSWithBookings(), 10000);
    },

    syncGPSWithBookings() {
        // Update bookings with GPS hole positions from caddy tracking
        if (!window.GPSNavigationSystem) return;

        const bookings = JSON.parse(localStorage.getItem('mcipro_bookings_cloud') || '{"bookings": []}');
        const gpsPositions = JSON.parse(localStorage.getItem('mcipro_gps_positions') || '{}');

        let updated = false;

        bookings.bookings.forEach(booking => {
            if (booking.status !== 'confirmed' && booking.status !== 'checked-in') return;
            if (!booking.caddyNumber) return;

            // Check if this caddy has GPS position data
            const caddyPos = gpsPositions[booking.caddyNumber];
            if (caddyPos && caddyPos.currentHole) {
                if (booking.currentHole !== caddyPos.currentHole) {
                    booking.currentHole = caddyPos.currentHole;
                    booking.lastHoleUpdate = Date.now();
                    updated = true;
                    console.log(`[TrafficMonitor] Updated booking ${booking.id} to hole ${caddyPos.currentHole} from GPS`);
                }
            }
        });

        if (updated) {
            localStorage.setItem('mcipro_bookings_cloud', JSON.stringify(bookings));
            this.renderHoles(); // Refresh display
        }
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
            startHole = 1; endHole = 9;
            displayStart = 1; displayEnd = 9;
        } else if (this.courseConfig === 18) {
            startHole = 1; endHole = 18;
            displayStart = 1; displayEnd = 18;
        } else {
            // 27 or 36 hole course - show 9 at a time, always display as 1-9
            startHole = (this.currentNineView - 1) * 9 + 1;
            endHole = Math.min(this.currentNineView * 9, this.courseConfig);
            displayStart = 1;
            displayEnd = 9;
        }

        // Update label
        if (label) {
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
        // Get real status from active bookings with GPS-tracked hole positions
        const bookings = JSON.parse(localStorage.getItem('mcipro_bookings_cloud') || '{"bookings": []}');
        const activeBookingsOnHole = bookings.bookings.filter(b =>
            (b.status === 'confirmed' || b.status === 'checked-in') && b.currentHole === holeNumber
        );

        // Check escalation status first
        const escalation = this.holeEscalation[holeNumber];
        if (escalation) {
            if (escalation.level >= 2) return 'Backed Up';
            if (escalation.level === 1) return 'Busy';
        }

        // If bookings on this hole, it's busy
        if (activeBookingsOnHole.length > 0) return 'Busy';

        // Otherwise it's clear
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
            displayNumber = ((holeNumber - 1) % 9) + 1;
            const nineIndex = Math.floor((holeNumber - 1) / 9) + 1;
            nineLabel = nineIndex === 1 ? 'Nine A' :
                       nineIndex === 2 ? 'Nine B' :
                       nineIndex === 3 ? 'Nine C' : 'Nine D';
        }

        // Get group info on this hole
        const groupInfo = this.getGroupOnHole(holeNumber);

        // Get escalation status
        const escalation = this.holeEscalation[holeNumber] || { level: 0 };

        // Get hole history
        const history = this.holeHistory[holeNumber] || [];
        const recentHistory = history.slice(-5).reverse();

        panel.innerHTML = `
            <div class="${statusBg} border rounded-lg p-3">
                <div class="flex items-center justify-between mb-2">
                    <div>
                        <h4 class="text-lg font-bold text-gray-900">${nineLabel ? nineLabel + ', ' : ''}Hole ${displayNumber}</h4>
                        <p class="text-xs text-gray-600">Status: <span class="font-semibold ${statusColor}">${status}</span></p>
                        ${groupInfo ? `<p class="text-xs text-gray-500 mt-1">📍 ${groupInfo}</p>` : ''}
                        ${escalation.level > 0 ? `<p class="text-xs text-orange-600 font-semibold mt-1">⚠️ Escalation Level ${escalation.level}</p>` : ''}
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
                                } else if (event.type === 'marshal') {
                                    icon = 'local_police';
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

                <div class="mt-3 space-y-2">
                    <!-- Escalation Contacts -->
                    <div class="flex gap-2">
                        <button onclick="TrafficMonitor.sendPresetMessage(${holeNumber}, 'contact1')"
                                class="flex-1 text-xs px-2 py-1.5 ${escalation.level >= 1 ? 'bg-gray-300 text-gray-600' : 'bg-blue-500 text-white hover:bg-blue-600'} rounded"
                                ${escalation.level >= 1 ? 'disabled' : ''}>
                            <span class="material-symbols-outlined text-xs">info</span> Contact 1
                        </button>
                        <button onclick="TrafficMonitor.sendPresetMessage(${holeNumber}, 'contact2')"
                                class="flex-1 text-xs px-2 py-1.5 ${escalation.level >= 2 ? 'bg-gray-300 text-gray-600' : escalation.level === 0 ? 'bg-gray-300 text-gray-600' : 'bg-yellow-500 text-white hover:bg-yellow-600'} rounded"
                                ${escalation.level !== 1 ? 'disabled' : ''}>
                            <span class="material-symbols-outlined text-xs">warning</span> Contact 2
                        </button>
                    </div>

                    <!-- Send Marshal Now -->
                    <button onclick="TrafficMonitor.sendMarshalNow(${holeNumber})"
                            class="w-full text-xs px-2 py-1.5 bg-red-500 text-white rounded hover:bg-red-600">
                        <span class="material-symbols-outlined text-xs">local_police</span> Send Marshal Now
                    </button>

                    <!-- View Group Details -->
                    <button onclick="TrafficMonitor.viewGroupDetails(${holeNumber})"
                            class="w-full text-xs px-2 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                        <span class="material-symbols-outlined text-xs">group</span> View Group Details
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

    sendPresetMessage(holeNumber, contactType) {
        const preset = this.presetMessages[contactType];
        if (!preset) return;

        const groupInfo = this.getGroupOnHole(holeNumber) || `Unknown Group (Hole ${holeNumber})`;

        // Update escalation tracking
        if (!this.holeEscalation[holeNumber]) {
            this.holeEscalation[holeNumber] = { level: 0 };
        }
        this.holeEscalation[holeNumber].level = preset.level;
        this.holeEscalation[holeNumber].lastContact = Date.now();
        this.holeEscalation[holeNumber].groupId = groupInfo;
        localStorage.setItem('mcipro_hole_escalation', JSON.stringify(this.holeEscalation));

        // Add to hole history
        this.addHoleEvent(holeNumber, contactType === 'contact1' ? 'notification' : 'warning', preset.message);

        // Send notification to caddies via alert system
        this.sendPaceNotification(holeNumber, preset, groupInfo);

        // Show confirmation
        if (typeof NotificationManager !== 'undefined') {
            NotificationManager.show(`${preset.message} sent to ${groupInfo}`, 'success');
        }

        // Refresh display
        this.showHoleDetails(holeNumber);

        console.log(`[TrafficMonitor] Sent ${contactType} to hole ${holeNumber}: ${preset.message}`);
    },

    sendMarshalNow(holeNumber) {
        const preset = this.presetMessages.marshal;
        const groupInfo = this.getGroupOnHole(holeNumber);

        // Update escalation to marshal level
        if (!this.holeEscalation[holeNumber]) {
            this.holeEscalation[holeNumber] = { level: 0 };
        }
        this.holeEscalation[holeNumber].level = 3;
        this.holeEscalation[holeNumber].lastContact = Date.now();
        this.holeEscalation[holeNumber].groupId = groupInfo || 'Unknown Group';
        localStorage.setItem('mcipro_hole_escalation', JSON.stringify(this.holeEscalation));

        // Add to hole history
        this.addHoleEvent(holeNumber, 'marshal', preset.message);

        // Send marshal notification
        this.sendMarshalNotification(holeNumber, preset, groupInfo);

        // Show confirmation
        if (typeof NotificationManager !== 'undefined') {
            NotificationManager.show(`Marshal dispatched to hole ${holeNumber}`, 'success');
        }

        // Refresh display
        this.showHoleDetails(holeNumber);

        console.log(`[TrafficMonitor] Marshal dispatched to hole ${holeNumber}`);
    },

    sendPaceNotification(holeNumber, preset, groupInfo) {
        // Use existing alert notification infrastructure (like Stop Play, Lightning, Cart Alerts)
        const notification = {
            id: 'PACE' + Date.now().toString().slice(-6),
            type: 'pace_warning',
            level: preset.level,
            hole: holeNumber,
            message: preset.message,
            groupInfo: groupInfo,
            timestamp: new Date().toISOString(),
            requiresAck: preset.requiresAck,
            icon: preset.icon,
            color: preset.color
        };

        // Store in pace notifications
        const paceNotifications = JSON.parse(localStorage.getItem('mcipro_pace_notifications') || '[]');
        paceNotifications.push(notification);
        localStorage.setItem('mcipro_pace_notifications', JSON.stringify(paceNotifications));

        // TODO: Send to caddies via notification system (not chat)
        // This would integrate with EmergencySystem or NotificationManager for delivery
        console.log('[TrafficMonitor] Pace notification created:', notification);
    },

    sendMarshalNotification(holeNumber, preset, groupInfo) {
        const notification = {
            id: 'MRSH' + Date.now().toString().slice(-6),
            type: 'marshal_dispatch',
            hole: holeNumber,
            message: preset.message,
            groupInfo: groupInfo || 'Unknown Group',
            timestamp: new Date().toISOString(),
            icon: preset.icon,
            color: preset.color
        };

        // Store marshal dispatches
        const marshalDispatches = JSON.parse(localStorage.getItem('mcipro_marshal_dispatches') || '[]');
        marshalDispatches.push(notification);
        localStorage.setItem('mcipro_marshal_dispatches', JSON.stringify(marshalDispatches));

        // TODO: Send to marshal dashboard and caddies
        console.log('[TrafficMonitor] Marshal notification created:', notification);
    },

    getGroupOnHole(holeNumber) {
        // Get real group from bookings based on GPS-tracked currentHole
        const bookings = JSON.parse(localStorage.getItem('mcipro_bookings_cloud') || '{"bookings": []}');
        const activeBooking = bookings.bookings.find(b =>
            (b.status === 'confirmed' || b.status === 'checked-in') && b.currentHole === holeNumber
        );

        if (activeBooking) {
            const caddyInfo = activeBooking.caddyNumber ? ` (Caddy #${activeBooking.caddyNumber})` : '';
            return `${activeBooking.name || 'Unknown'}${caddyInfo} - Tee Time: ${activeBooking.teeTime || 'N/A'}`;
        }

        return null;
    },

    viewGroupDetails(holeNumber) {
        const groupInfo = this.getGroupOnHole(holeNumber) || `No group identified on Hole ${holeNumber}`;

        // TODO: Show modal with full group details
        // For now, just show notification
        if (typeof NotificationManager !== 'undefined') {
            NotificationManager.show(`Group on Hole ${holeNumber}: ${groupInfo}`, 'info');
        } else {
            alert(`Group on Hole ${holeNumber}: ${groupInfo}`);
        }

        console.log(`[TrafficMonitor] Viewing group details for hole ${holeNumber}: ${groupInfo}`);
    },

    checkPaceOfPlay() {
        // Auto-escalate groups that are 1.5 holes behind expected position
        const bookings = JSON.parse(localStorage.getItem('mcipro_bookings_cloud') || '{"bookings": []}');
        const activeBookings = bookings.bookings.filter(b =>
            (b.status === 'confirmed' || b.status === 'checked-in') && b.currentHole
        );

        activeBookings.forEach(booking => {
            const expectedHole = this.calculateExpectedHole(booking);
            const actualHole = booking.currentHole;
            const holesBehind = expectedHole - actualHole;

            // If 1.5+ holes behind, auto-escalate
            if (holesBehind >= 1.5) {
                const escalation = this.holeEscalation[actualHole];

                // Only auto-escalate if already at Contact 2 level and 10+ minutes have passed
                if (escalation && escalation.level === 2) {
                    const timeSinceContact = Date.now() - escalation.lastContact;
                    const tenMinutes = 10 * 60 * 1000;

                    if (timeSinceContact > tenMinutes) {
                        console.log(`[TrafficMonitor] Auto-escalating hole ${actualHole} to marshal (${holesBehind.toFixed(1)} holes behind)`);
                        this.sendMarshalNow(actualHole);
                    }
                }
            }
        });
    },

    calculateExpectedHole(booking) {
        // Calculate expected hole based on tee time
        if (!booking.teeTime || !booking.date) return 1;

        // Parse tee time (format: HH:MM)
        const [hours, minutes] = booking.teeTime.split(':').map(Number);
        const teeDateTime = new Date(booking.date);
        teeDateTime.setHours(hours, minutes, 0, 0);

        // Calculate elapsed time since tee time
        const now = new Date();
        const elapsedMinutes = (now - teeDateTime) / (1000 * 60);

        // Average 15 minutes per hole
        const expectedHole = Math.floor(elapsedMinutes / 15) + 1;

        // Cap at 18 (or courseConfig)
        return Math.min(expectedHole, this.courseConfig);
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

        localStorage.setItem('mcipro_hole_history', JSON.stringify(this.holeHistory));

        console.log(`[TrafficMonitor] Added ${type} to hole ${holeNumber}: ${message}`);
    },

    getTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    },

    updateLiveStatus() {
        this.renderHoles();
    }
};

// Initialize when manager traffic tab is shown
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (document.getElementById('trafficHoleGrid')) {
            TrafficMonitor.init();
        }
    }, 500);
});

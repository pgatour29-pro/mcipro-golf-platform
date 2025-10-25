// MciPro Staff Security & Registration System
// Handles golf course codes, employee verification, and approval queues

const StaffSecurity = {
    // ========================================
    // GOLF COURSE CODE MANAGEMENT
    // ========================================

    getCourseSettings() {
        return JSON.parse(localStorage.getItem('golf_course_settings') || '{"staffRegistrationCode": "0000", "courseName": "Your Golf Course"}');
    },

    saveCourseSettings(settings) {
        localStorage.setItem('golf_course_settings', JSON.stringify(settings));
    },

    showChangeCodeModal() {
        const currentSettings = this.getCourseSettings();

        const modal = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" id="code-modal">
                <div class="bg-white rounded-xl shadow-2xl max-w-md w-full">
                    <div class="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center rounded-t-xl">
                        <h3 class="text-xl font-bold text-white">Change Staff Registration Code</h3>
                        <button onclick="StaffSecurity.closeModal()" class="text-white hover:text-gray-200">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    <div class="p-6">
                        <form onsubmit="StaffSecurity.saveNewCode(event)">
                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-700 mb-2">New 4-Digit Code *</label>
                                <input type="text"
                                       id="newCode"
                                       name="code"
                                       maxlength="4"
                                       pattern="[0-9]{4}"
                                       required
                                       class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-center text-2xl font-bold tracking-widest"
                                       placeholder="0000"
                                       value="${currentSettings.staffRegistrationCode !== 'Not Set' ? currentSettings.staffRegistrationCode : ''}">
                                <p class="text-xs text-gray-500 mt-2">Enter exactly 4 digits (e.g., 1234, 9876)</p>
                            </div>

                            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                                <div class="flex gap-2">
                                    <span class="material-symbols-outlined text-yellow-600 text-sm">warning</span>
                                    <p class="text-sm text-gray-700">
                                        Changing this code will prevent new registrations with the old code.
                                        Existing staff accounts are not affected.
                                    </p>
                                </div>
                            </div>

                            <div class="flex gap-3">
                                <button type="button"
                                        onclick="StaffSecurity.closeModal()"
                                        class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                                    Cancel
                                </button>
                                <button type="submit"
                                        class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                    Save Code
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modal);
        document.getElementById('newCode').focus();
    },

    saveNewCode(event) {
        event.preventDefault();
        const code = event.target.code.value.trim();

        if (code.length !== 4 || !/^\d{4}$/.test(code)) {
            alert('❌ Code must be exactly 4 digits');
            return;
        }

        const settings = this.getCourseSettings();
        settings.staffRegistrationCode = code;
        settings.lastCodeUpdate = new Date().toISOString();
        this.saveCourseSettings(settings);

        this.closeModal();
        StaffManagement.showNotification('Staff registration code updated successfully!', 'success');
        StaffManagement.renderStaffList();
    },

    // ========================================
    // EMPLOYEE ID VALIDATION
    // ========================================

    getEmployeeIdFormat() {
        return {
            'caddy': { prefix: 'PAT', length: 3, example: 'PAT-001' },
            'proshop': { prefix: 'PS', length: 3, example: 'PS-001' },
            'fnb': { prefix: 'FB', length: 3, example: 'FB-001' },
            'maintenance': { prefix: 'MAINT', length: 3, example: 'MAINT-001' },
            'management': { prefix: 'MGR', length: 3, example: 'MGR-001' },
            'reception': { prefix: 'RCP', length: 3, example: 'RCP-001' },
            'security': { prefix: 'SEC', length: 3, example: 'SEC-001' }
        };
    },

    validateEmployeeId(employeeId, department) {
        const formats = this.getEmployeeIdFormat();
        const format = formats[department];

        if (!format) return false;

        const regex = new RegExp(`^${format.prefix}-\\d{${format.length}}$`);
        return regex.test(employeeId);
    },

    generateEmployeeId(department) {
        const formats = this.getEmployeeIdFormat();
        const format = formats[department];

        if (!format) return null;

        // Get all staff in this department
        const staff = JSON.parse(localStorage.getItem('staff_members') || '[]');
        const deptStaff = staff.filter(s => s.department === department);

        // Find highest number
        let maxNum = 0;
        deptStaff.forEach(s => {
            const match = s.employeeId.match(/\d+$/);
            if (match) {
                const num = parseInt(match[0]);
                if (num > maxNum) maxNum = num;
            }
        });

        const nextNum = (maxNum + 1).toString().padStart(format.length, '0');
        return `${format.prefix}-${nextNum}`;
    },

    // ========================================
    // APPROVAL QUEUE
    // ========================================

    getPendingApprovals() {
        const staff = JSON.parse(localStorage.getItem('staff_members') || '[]');
        return staff.filter(s => s.status === 'pending_approval');
    },

    requiresApproval(department, position) {
        const sensitiveRoles = ['management', 'proshop'];
        const sensitivePositions = ['manager', 'accounting', 'acct', 'pro shop'];

        return sensitiveRoles.includes(department) ||
               sensitivePositions.some(role => position.toLowerCase().includes(role));
    },

    approveStaff(staffId) {
        const staff = JSON.parse(localStorage.getItem('staff_members') || '[]');
        const staffIndex = staff.findIndex(s => s.id === staffId);

        if (staffIndex === -1) {
            alert('❌ Staff member not found');
            return;
        }

        staff[staffIndex].status = 'active';
        staff[staffIndex].approvedAt = new Date().toISOString();
        staff[staffIndex].approvedBy = AppState.currentUser.name || 'Manager';

        localStorage.setItem('staff_members', JSON.stringify(staff));

        StaffManagement.showNotification(`${staff[staffIndex].firstName} ${staff[staffIndex].lastName} has been approved!`, 'success');
        StaffManagement.renderStaffList();
    },

    rejectStaff(staffId) {
        if (!confirm('Are you sure you want to reject this staff registration? This cannot be undone.')) {
            return;
        }

        const staff = JSON.parse(localStorage.getItem('staff_members') || '[]');
        const filteredStaff = staff.filter(s => s.id !== staffId);

        localStorage.setItem('staff_members', JSON.stringify(filteredStaff));

        StaffManagement.showNotification('Staff registration rejected', 'info');
        StaffManagement.renderStaffList();
    },

    renderPendingApprovalsUI() {
        const pending = this.getPendingApprovals();

        if (pending.length === 0) {
            return '';
        }

        return `
            <div class="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-6 mb-6">
                <h3 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span class="material-symbols-outlined text-yellow-600">pending_actions</span>
                    Pending Approvals (${pending.length})
                </h3>

                <div class="space-y-3">
                    ${pending.map(s => `
                        <div class="bg-white rounded-lg p-4 border border-yellow-200">
                            <div class="flex items-start justify-between flex-wrap gap-4">
                                <div class="flex-1">
                                    <div class="flex items-center gap-3 mb-2">
                                        <div class="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                                            <span class="material-symbols-outlined text-yellow-600 text-sm">person</span>
                                        </div>
                                        <div>
                                            <h4 class="font-semibold text-gray-900">${s.firstName} ${s.lastName}</h4>
                                            <p class="text-sm text-gray-500">${s.position} • ${s.department.toUpperCase()}</p>
                                        </div>
                                    </div>

                                    <div class="ml-13 space-y-1 text-sm text-gray-600">
                                        <div class="flex items-center gap-2">
                                            <span class="material-symbols-outlined text-xs">badge</span>
                                            <span>Employee ID: ${s.employeeId}</span>
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <span class="material-symbols-outlined text-xs">phone</span>
                                            <span>${s.phone}</span>
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <span class="material-symbols-outlined text-xs">email</span>
                                            <span>${s.email || 'Not provided'}</span>
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <span class="material-symbols-outlined text-xs text-green-600">check_circle</span>
                                            <span class="text-green-600 font-medium">LINE Verified ✓</span>
                                        </div>
                                    </div>
                                </div>

                                <div class="flex gap-2">
                                    <button onclick="StaffSecurity.approveStaff('${s.id}')"
                                            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                                        <span class="material-symbols-outlined text-sm">check</span>
                                        Approve
                                    </button>
                                    <button onclick="StaffSecurity.rejectStaff('${s.id}')"
                                            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2">
                                        <span class="material-symbols-outlined text-sm">close</span>
                                        Reject
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    // ========================================
    // STAFF VERIFICATION (Pre-LINE)
    // ========================================

    verifyStaffCredentials(courseCode, employeeId, department) {
        const settings = this.getCourseSettings();

        // Check course code
        if (courseCode !== settings.staffRegistrationCode) {
            return { success: false, error: 'Invalid golf course registration code' };
        }

        // Check employee ID format
        if (!this.validateEmployeeId(employeeId, department)) {
            const format = this.getEmployeeIdFormat()[department];
            return { success: false, error: `Invalid Employee ID format. Expected: ${format.example}` };
        }

        // Check if employee ID already exists
        const staff = JSON.parse(localStorage.getItem('staff_members') || '[]');
        const exists = staff.find(s => s.employeeId === employeeId);

        if (exists) {
            return { success: false, error: 'This Employee ID is already registered' };
        }

        return { success: true };
    },

    // ========================================
    // UTILITIES
    // ========================================

    closeModal() {
        const modal = document.getElementById('code-modal');
        if (modal) modal.remove();
    }
};

// Export for use in staff-management.js
if (typeof window !== 'undefined') {
    window.StaffSecurity = StaffSecurity;
}

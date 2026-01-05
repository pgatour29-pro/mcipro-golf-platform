// MciPro Staff Management System
// Complete staff management with GPS tracking, scheduling, payroll, and more

const StaffManagement = {
    // ========================================
    // DATA STORAGE & RETRIEVAL
    // ========================================

    getAllStaff() {
        return JSON.parse(localStorage.getItem('staff_members') || '[]');
    },

    saveStaff(staff) {
        localStorage.setItem('staff_members', JSON.stringify(staff));
        this.updateStaffCounts();
    },

    getStaffById(id) {
        const staff = this.getAllStaff();
        return staff.find(s => s.id === id);
    },

    getDepartments() {
        return [
            { id: 'caddy', name: 'Caddies', icon: 'golf_course', color: 'green' },
            { id: 'fnb', name: 'F&B Staff', icon: 'restaurant', color: 'orange' },
            { id: 'proshop', name: 'Pro Shop', icon: 'shopping_bag', color: 'teal' },
            { id: 'maintenance', name: 'Maintenance', icon: 'build', color: 'blue' },
            { id: 'reception', name: 'Reception', icon: 'desk', color: 'blue' },
            { id: 'security', name: 'Security', icon: 'security', color: 'red' },
            { id: 'management', name: 'Management', icon: 'business_center', color: 'gray' }
        ];
    },

    // ========================================
    // STAFF CRUD OPERATIONS
    // ========================================

    showAddStaffModal() {
        const departments = this.getDepartments();

        const modal = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" id="staff-modal">
                <div class="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                    <div class="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
                        <h3 class="text-xl font-bold text-white">Add New Staff Member</h3>
                        <button onclick="StaffManagement.closeModal()" class="text-white hover:text-gray-200">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    <div class="p-6">
                        <form id="add-staff-form" onsubmit="StaffManagement.submitAddStaff(event)">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <!-- Basic Information -->
                                <div class="md:col-span-2">
                                    <h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <span class="material-symbols-outlined">person</span>
                                        Basic Information
                                    </h4>
                                </div>

                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                                    <input type="text" name="firstName" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                </div>

                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                                    <input type="text" name="lastName" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                </div>

                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Employee ID *</label>
                                    <input type="text" name="employeeId" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                </div>

                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Department *</label>
                                    <select name="department" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" onchange="StaffManagement.handleDepartmentChange(this.value)">
                                        <option value="">Select Department</option>
                                        ${departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
                                    </select>
                                </div>

                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Position/Role *</label>
                                    <input type="text" name="position" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                </div>

                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                                    <input type="date" name="startDate" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                </div>

                                <!-- Contact Information -->
                                <div class="md:col-span-2 mt-4">
                                    <h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <span class="material-symbols-outlined">contact_phone</span>
                                        Contact Information
                                    </h4>
                                </div>

                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                                    <input type="tel" name="phone" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                </div>

                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                    <input type="email" name="email" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                </div>

                                <div class="md:col-span-2">
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Address</label>
                                    <textarea name="address" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"></textarea>
                                </div>

                                <!-- Employment Details -->
                                <div class="md:col-span-2 mt-4">
                                    <h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <span class="material-symbols-outlined">work</span>
                                        Employment Details
                                    </h4>
                                </div>

                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Employment Type *</label>
                                    <select name="employmentType" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                        <option value="full-time">Full-Time</option>
                                        <option value="part-time">Part-Time</option>
                                        <option value="contract">Contract</option>
                                        <option value="seasonal">Seasonal</option>
                                    </select>
                                </div>

                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Base Salary (฿/month)</label>
                                    <input type="number" name="baseSalary" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                </div>

                                <!-- Caddy-specific fields (hidden by default) -->
                                <div id="caddy-fields" class="md:col-span-2 hidden">
                                    <div class="bg-green-50 p-4 rounded-lg border border-green-200">
                                        <h5 class="font-semibold text-green-900 mb-3">Caddy-Specific Information</h5>
                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-2">Caddy License Number</label>
                                                <input type="text" name="caddyLicense" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                                            </div>
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-2">Experience Level</label>
                                                <select name="experienceLevel" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                                                    <option value="beginner">Beginner (< 1 year)</option>
                                                    <option value="intermediate">Intermediate (1-3 years)</option>
                                                    <option value="experienced">Experienced (3-5 years)</option>
                                                    <option value="expert">Expert (5+ years)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-2">GPS Tracker ID</label>
                                                <input type="text" name="gpsTrackerId" class="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="e.g., GPS-001">
                                            </div>
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-2">Languages Spoken</label>
                                                <input type="text" name="languages" class="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="e.g., Thai, English, Chinese">
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="mt-6 flex justify-end gap-3">
                                <button type="button" onclick="StaffManagement.closeModal()" class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                                    Cancel
                                </button>
                                <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                    Add Staff Member
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modal);
    },

    handleDepartmentChange(department) {
        const caddyFields = document.getElementById('caddy-fields');
        if (caddyFields) {
            if (department === 'caddy') {
                caddyFields.classList.remove('hidden');
            } else {
                caddyFields.classList.add('hidden');
            }
        }
    },

    submitAddStaff(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);

        const staff = this.getAllStaff();
        const newStaff = {
            id: 'STAFF-' + Date.now(),
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            employeeId: formData.get('employeeId'),
            department: formData.get('department'),
            position: formData.get('position'),
            startDate: formData.get('startDate'),
            phone: formData.get('phone'),
            email: formData.get('email'),
            address: formData.get('address'),
            employmentType: formData.get('employmentType'),
            baseSalary: parseFloat(formData.get('baseSalary')) || 0,
            status: 'active',
            createdAt: new Date().toISOString(),

            // Caddy-specific fields
            caddyLicense: formData.get('caddyLicense') || null,
            experienceLevel: formData.get('experienceLevel') || null,
            gpsTrackerId: formData.get('gpsTrackerId') || null,
            languages: formData.get('languages') || null,

            // Working status for caddies
            workingStatus: 'off-duty',
            currentLocation: null,
            currentBooking: null,

            // Performance metrics
            rating: 5.0,
            totalAssignments: 0,
            totalTips: 0,

            // Attendance
            attendanceRecords: [],

            // Training & Certifications
            certifications: [],
            trainingRecords: []
        };

        staff.push(newStaff);
        this.saveStaff(staff);
        this.closeModal();
        this.renderStaffList();

        // Show success message
        this.showNotification('Staff member added successfully!', 'success');
    },

    // ========================================
    // STAFF LIST & DISPLAY
    // ========================================

    renderStaffList(filterDepartment = null) {
        let staff = this.getAllStaff();

        if (filterDepartment) {
            staff = staff.filter(s => s.department === filterDepartment);
        }

        const container = document.getElementById('staff-list-container');
        if (!container) return;

        // Get golf course code settings
        const courseSettings = JSON.parse(localStorage.getItem("golf_course_settings") || "{}");
        const staffCode = courseSettings.staffRegistrationCode || "Not Set";

        // Build Golf Course Code Management UI
        let codeManagementHTML = `
            <div class="bg-gradient-to-r from-blue-50 to-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
                <div class="flex items-center justify-between gap-4">
                    <div class="flex items-center gap-4">
                        <div class="bg-white rounded-lg p-3 border-2 border-blue-300">
                            <div class="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Current Code</div>
                            <div class="text-2xl font-bold text-blue-600 font-mono tracking-wider">${staffCode}</div>
                        </div>
                        <div>
                            <h3 class="font-semibold text-gray-900 flex items-center gap-2">
                                <span class="material-symbols-outlined text-blue-600 text-lg">vpn_key</span>
                                Staff Registration Code
                            </h3>
                            <p class="text-xs text-gray-600">Share with new staff to register via LINE</p>
                        </div>
                    </div>
                    <button onclick="StaffManagement.showChangeCodeModal()"
                            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 whitespace-nowrap">
                        <span class="material-symbols-outlined text-sm">edit</span>
                        Change Code
                    </button>
                </div>
            </div>
            ${this.renderPendingApprovals()}
        `;

        if (staff.length === 0) {
            container.innerHTML = codeManagementHTML + `
                <div class="text-center py-20">
                    <span class="material-symbols-outlined text-8xl text-gray-300 mb-4 block">groups</span>
                    <h3 class="text-2xl font-bold text-gray-900 mb-2">No Staff Members Yet</h3>
                    <p class="text-gray-500 mb-6">Add your first staff member to get started.</p>
                    <button onclick="StaffManagement.showAddStaffModal()" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <span class="material-symbols-outlined text-sm mr-2">add</span>
                        Add Staff Member
                    </button>
                </div>
            `;
            return;
        }

        const departments = this.getDepartments();
        const deptMap = {};
        departments.forEach(d => deptMap[d.id] = d);

        container.innerHTML = codeManagementHTML + `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${staff.map(s => {
                    const dept = deptMap[s.department] || { name: 'Unknown', color: 'gray', icon: 'person' };
                    const statusColor = s.workingStatus === 'on-duty' ? 'green' : s.workingStatus === 'busy' ? 'yellow' : 'gray';

                    return `
                        <div class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer" onclick="StaffManagement.showStaffDetails('${s.id}')">
                            <div class="flex items-start justify-between mb-3">
                                <div class="flex items-center gap-3">
                                    <div class="w-12 h-12 bg-${dept.color}-100 rounded-full flex items-center justify-center">
                                        <span class="material-symbols-outlined text-${dept.color}-600">${dept.icon}</span>
                                    </div>
                                    <div>
                                        <h4 class="font-semibold text-gray-900">${s.firstName} ${s.lastName}</h4>
                                        <p class="text-xs text-gray-500">${s.position}</p>
                                    </div>
                                </div>
                                <span class="px-2 py-1 rounded-full text-xs font-medium bg-${statusColor}-100 text-${statusColor}-700">
                                    ${s.workingStatus.replace('-', ' ')}
                                </span>
                            </div>

                            <div class="space-y-2 text-sm">
                                <div class="flex items-center gap-2 text-gray-600">
                                    <span class="material-symbols-outlined text-xs">badge</span>
                                    <span>${s.employeeId}</span>
                                </div>
                                <div class="flex items-center gap-2 text-gray-600">
                                    <span class="material-symbols-outlined text-xs">phone</span>
                                    <span>${s.phone}</span>
                                </div>
                                ${s.department === 'caddy' ? `
                                    <div class="flex items-center gap-2 text-gray-600">
                                        <span class="material-symbols-outlined text-xs">star</span>
                                        <span>${s.rating.toFixed(1)} Rating • ${s.totalAssignments} Assignments</span>
                                    </div>
                                ` : ''}
                            </div>

                            <div class="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                                <span class="text-xs text-${dept.color}-600 bg-${dept.color}-50 px-2 py-1 rounded">${dept.name}</span>
                                <button onclick="event.stopPropagation(); StaffManagement.showStaffActions('${s.id}')" class="text-gray-400 hover:text-gray-600">
                                    <span class="material-symbols-outlined text-sm">more_vert</span>
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    },

    updateStaffCounts() {
        const staff = this.getAllStaff();
        const departments = this.getDepartments();

        departments.forEach(dept => {
            const count = staff.filter(s => s.department === dept.id && s.status === 'active').length;
            const element = document.getElementById(`${dept.id}-count`);
            if (element) {
                element.textContent = count;
            }
        });
    },

    // ========================================
    // UTILITIES
    // ========================================

    closeModal() {
        const modal = document.getElementById('staff-modal');
        if (modal) modal.remove();
    },

    showNotification(message, type = 'info') {
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            info: 'bg-blue-500'
        };

        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => notification.remove(), 3000);
    },

    // ========================================
    // STAFF DETAILS & PROFILE
    // ========================================

    showStaffDetails(staffId) {
        const staff = this.getStaffById(staffId);
        if (!staff) return;

        const dept = this.getDepartments().find(d => d.id === staff.department) || {};

        const modal = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" id="staff-modal">
                <div class="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                    <div class="bg-gradient-to-r from-${dept.color}-600 to-${dept.color}-700 px-6 py-4 flex justify-between items-center">
                        <div class="flex items-center gap-4">
                            <div class="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                                <span class="material-symbols-outlined text-white text-3xl">${dept.icon}</span>
                            </div>
                            <div>
                                <h3 class="text-2xl font-bold text-white">${staff.firstName} ${staff.lastName}</h3>
                                <p class="text-${dept.color}-100">${staff.position} • ${staff.employeeId}</p>
                            </div>
                        </div>
                        <button onclick="StaffManagement.closeModal()" class="text-white hover:text-gray-200">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    <!-- Tabs -->
                    <div class="border-b border-gray-200">
                        <nav class="flex px-6 gap-4">
                            <button onclick="StaffManagement.showStaffTab('overview')" class="staff-tab-btn py-3 px-4 border-b-2 border-blue-600 text-blue-600 font-medium" data-tab="overview">
                                Overview
                            </button>
                            ${staff.department === 'caddy' ? `
                            <button onclick="StaffManagement.showStaffTab('gps')" class="staff-tab-btn py-3 px-4 border-b-2 border-transparent hover:border-gray-300" data-tab="gps">
                                GPS Tracking
                            </button>
                            ` : ''}
                            <button onclick="StaffManagement.showStaffTab('schedule')" class="staff-tab-btn py-3 px-4 border-b-2 border-transparent hover:border-gray-300" data-tab="schedule">
                                Schedule
                            </button>
                            <button onclick="StaffManagement.showStaffTab('performance')" class="staff-tab-btn py-3 px-4 border-b-2 border-transparent hover:border-gray-300" data-tab="performance">
                                Performance
                            </button>
                            <button onclick="StaffManagement.showStaffTab('payroll')" class="staff-tab-btn py-3 px-4 border-b-2 border-transparent hover:border-gray-300" data-tab="payroll">
                                Payroll
                            </button>
                            <button onclick="StaffManagement.showStaffTab('attendance')" class="staff-tab-btn py-3 px-4 border-b-2 border-transparent hover:border-gray-300" data-tab="attendance">
                                Attendance
                            </button>
                        </nav>
                    </div>

                    <div class="p-6">
                        ${this.renderStaffOverview(staff)}
                        ${staff.department === 'caddy' ? this.renderCaddyGPSTracking(staff) : ''}
                        ${this.renderStaffSchedule(staff)}
                        ${this.renderStaffPerformance(staff)}
                        ${this.renderStaffPayroll(staff)}
                        ${this.renderStaffAttendance(staff)}
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modal);
        this.showStaffTab('overview');
    },

    showStaffTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.staff-tab-btn').forEach(btn => {
            if (btn.getAttribute('data-tab') === tabName) {
                btn.className = 'staff-tab-btn py-3 px-4 border-b-2 border-blue-600 text-blue-600 font-medium';
            } else {
                btn.className = 'staff-tab-btn py-3 px-4 border-b-2 border-transparent hover:border-gray-300';
            }
        });

        // Show/hide tab content
        document.querySelectorAll('.staff-tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        const activeTab = document.getElementById(`staff-tab-${tabName}`);
        if (activeTab) activeTab.classList.remove('hidden');
    },

    renderStaffOverview(staff) {
        return `
            <div id="staff-tab-overview" class="staff-tab-content">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <!-- Contact Info -->
                    <div class="bg-gray-50 rounded-lg p-4">
                        <h4 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <span class="material-symbols-outlined text-sm">contact_phone</span>
                            Contact Information
                        </h4>
                        <div class="space-y-2 text-sm">
                            <div>
                                <span class="text-gray-600">Phone:</span>
                                <p class="font-medium">${staff.phone}</p>
                            </div>
                            ${staff.email ? `
                            <div>
                                <span class="text-gray-600">Email:</span>
                                <p class="font-medium">${staff.email}</p>
                            </div>
                            ` : ''}
                            ${staff.address ? `
                            <div>
                                <span class="text-gray-600">Address:</span>
                                <p class="font-medium">${staff.address}</p>
                            </div>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Employment Details -->
                    <div class="bg-gray-50 rounded-lg p-4">
                        <h4 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <span class="material-symbols-outlined text-sm">work</span>
                            Employment Details
                        </h4>
                        <div class="space-y-2 text-sm">
                            <div>
                                <span class="text-gray-600">Start Date:</span>
                                <p class="font-medium">${new Date(staff.startDate).toLocaleDateString()}</p>
                            </div>
                            <div>
                                <span class="text-gray-600">Type:</span>
                                <p class="font-medium capitalize">${staff.employmentType.replace('-', ' ')}</p>
                            </div>
                            <div>
                                <span class="text-gray-600">Base Salary:</span>
                                <p class="font-medium">฿${staff.baseSalary.toLocaleString()}/month</p>
                            </div>
                        </div>
                    </div>

                    <!-- Performance Stats -->
                    <div class="bg-gray-50 rounded-lg p-4">
                        <h4 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <span class="material-symbols-outlined text-sm">trending_up</span>
                            Quick Stats
                        </h4>
                        <div class="space-y-2 text-sm">
                            ${staff.department === 'caddy' ? `
                            <div>
                                <span class="text-gray-600">Rating:</span>
                                <p class="font-medium">${staff.rating.toFixed(1)} ⭐</p>
                            </div>
                            <div>
                                <span class="text-gray-600">Total Assignments:</span>
                                <p class="font-medium">${staff.totalAssignments}</p>
                            </div>
                            <div>
                                <span class="text-gray-600">Total Tips:</span>
                                <p class="font-medium">฿${staff.totalTips.toLocaleString()}</p>
                            </div>
                            ` : `
                            <div>
                                <span class="text-gray-600">Status:</span>
                                <p class="font-medium capitalize">${staff.workingStatus.replace('-', ' ')}</p>
                            </div>
                            `}
                        </div>
                    </div>
                </div>

                ${staff.department === 'caddy' && (staff.caddyLicense || staff.languages) ? `
                <div class="mt-6 bg-green-50 rounded-lg p-4 border border-green-200">
                    <h4 class="font-semibold text-green-900 mb-3">Caddy Information</h4>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        ${staff.caddyLicense ? `
                        <div>
                            <span class="text-gray-600">License:</span>
                            <p class="font-medium">${staff.caddyLicense}</p>
                        </div>
                        ` : ''}
                        ${staff.experienceLevel ? `
                        <div>
                            <span class="text-gray-600">Experience:</span>
                            <p class="font-medium capitalize">${staff.experienceLevel}</p>
                        </div>
                        ` : ''}
                        ${staff.gpsTrackerId ? `
                        <div>
                            <span class="text-gray-600">GPS Tracker:</span>
                            <p class="font-medium">${staff.gpsTrackerId}</p>
                        </div>
                        ` : ''}
                        ${staff.languages ? `
                        <div>
                            <span class="text-gray-600">Languages:</span>
                            <p class="font-medium">${staff.languages}</p>
                        </div>
                        ` : ''}
                    </div>
                </div>
                ` : ''}

                <div class="mt-6 flex gap-3">
                    <button onclick="StaffManagement.editStaff('${staff.id}')" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Edit Profile
                    </button>
                    <button onclick="StaffManagement.toggleStaffStatus('${staff.id}')" class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                        ${staff.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                </div>
            </div>
        `;
    },

    renderCaddyGPSTracking(staff) {
        // Simulate GPS coordinates for demo (in production, this would come from actual GPS devices)
        const holeLocations = [
            { hole: 1, lat: 12.9236, lng: 100.8825 },
            { hole: 2, lat: 12.9240, lng: 100.8830 },
            { hole: 3, lat: 12.9244, lng: 100.8835 },
            { hole: 4, lat: 12.9248, lng: 100.8840 },
            { hole: 5, lat: 12.9252, lng: 100.8845 },
            { hole: 6, lat: 12.9256, lng: 100.8850 },
            { hole: 7, lat: 12.9260, lng: 100.8855 },
            { hole: 8, lat: 12.9264, lng: 100.8860 },
            { hole: 9, lat: 12.9268, lng: 100.8865 },
            { hole: 10, lat: 12.9272, lng: 100.8870 },
            { hole: 11, lat: 12.9276, lng: 100.8875 },
            { hole: 12, lat: 12.9280, lng: 100.8880 },
            { hole: 13, lat: 12.9284, lng: 100.8885 },
            { hole: 14, lat: 12.9288, lng: 100.8890 },
            { hole: 15, lat: 12.9292, lng: 100.8895 },
            { hole: 16, lat: 12.9296, lng: 100.8900 },
            { hole: 17, lat: 12.9300, lng: 100.8905 },
            { hole: 18, lat: 12.9304, lng: 100.8910 }
        ];

        const currentHole = staff.currentLocation ? staff.currentLocation.hole : null;
        const currentLat = staff.currentLocation ? staff.currentLocation.lat : null;
        const currentLng = staff.currentLocation ? staff.currentLocation.lng : null;

        return `
            <div id="staff-tab-gps" class="staff-tab-content hidden">
                <div class="mb-4 flex justify-between items-center">
                    <h4 class="font-semibold text-gray-900">Real-Time GPS Location</h4>
                    <div class="flex gap-2">
                        <span class="px-3 py-1 rounded-full text-sm font-medium ${staff.workingStatus === 'on-duty' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}">
                            ${staff.workingStatus === 'on-duty' ? '🟢 On Duty' : '⚪ Off Duty'}
                        </span>
                        ${currentHole ? `
                        <span class="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                            📍 Hole ${currentHole}
                        </span>
                        ` : ''}
                    </div>
                </div>

                ${staff.gpsTrackerId ? `
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <div class="flex items-center gap-3">
                            <span class="material-symbols-outlined text-blue-600">info</span>
                            <div class="text-sm">
                                <p class="font-semibold text-blue-900">GPS Tracker: ${staff.gpsTrackerId}</p>
                                <p class="text-blue-700">Last updated: ${currentLat ? 'Just now' : 'Not tracking'}</p>
                            </div>
                        </div>
                    </div>
                ` : `
                    <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                        <div class="flex items-center gap-3">
                            <span class="material-symbols-outlined text-yellow-600">warning</span>
                            <div class="text-sm">
                                <p class="font-semibold text-yellow-900">No GPS Tracker Assigned</p>
                                <p class="text-yellow-700">Assign a GPS tracker to enable real-time location tracking</p>
                            </div>
                        </div>
                    </div>
                `}

                <!-- Course Map -->
                <div class="bg-gray-100 rounded-lg overflow-hidden" style="height: 500px;">
                    <div id="caddy-gps-map-${staff.id}" class="w-full h-full relative">
                        ${currentLat && currentLng ? `
                            <!-- Live map will be rendered here with Leaflet -->
                            <div class="absolute inset-0 flex items-center justify-center">
                                <div class="text-center">
                                    <span class="material-symbols-outlined text-6xl text-green-600 animate-pulse">location_on</span>
                                    <p class="text-lg font-semibold mt-2">Currently at Hole ${currentHole}</p>
                                    <p class="text-sm text-gray-600">${currentLat.toFixed(6)}, ${currentLng.toFixed(6)}</p>
                                </div>
                            </div>
                        ` : `
                            <div class="absolute inset-0 flex items-center justify-center">
                                <div class="text-center">
                                    <span class="material-symbols-outlined text-6xl text-gray-400">location_off</span>
                                    <p class="text-lg font-semibold mt-2 text-gray-600">Location Not Available</p>
                                    <p class="text-sm text-gray-500">Caddy is currently off-duty or GPS is not active</p>
                                </div>
                            </div>
                        `}
                    </div>
                </div>

                <!-- Course Layout Reference -->
                <div class="mt-6">
                    <h5 class="font-semibold text-gray-900 mb-3">18-Hole Course Layout</h5>
                    <div class="grid grid-cols-6 md:grid-cols-9 gap-2">
                        ${holeLocations.map(loc => `
                            <div class="p-3 rounded-lg text-center ${currentHole === loc.hole ? 'bg-green-500 text-white' : 'bg-gray-100'}">
                                <div class="text-xs font-semibold">Hole</div>
                                <div class="text-lg font-bold">${loc.hole}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                ${currentHole && staff.currentBooking ? `
                <div class="mt-6 bg-white border border-gray-200 rounded-lg p-4">
                    <h5 class="font-semibold text-gray-900 mb-3">Current Assignment</h5>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <span class="text-gray-600">Player:</span>
                            <p class="font-medium">${staff.currentBooking.playerName}</p>
                        </div>
                        <div>
                            <span class="text-gray-600">Tee Time:</span>
                            <p class="font-medium">${staff.currentBooking.teeTime}</p>
                        </div>
                        <div>
                            <span class="text-gray-600">Progress:</span>
                            <p class="font-medium">${currentHole}/18 Holes</p>
                        </div>
                        <div>
                            <span class="text-gray-600">Duration:</span>
                            <p class="font-medium">${Math.round((currentHole / 18) * 240)} min</p>
                        </div>
                    </div>
                </div>
                ` : ''}

                <div class="mt-6">
                    <button onclick="StaffManagement.simulateCaddyMovement('${staff.id}')" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        <span class="material-symbols-outlined text-sm mr-2">play_arrow</span>
                        Simulate Movement (Demo)
                    </button>
                </div>
            </div>
        `;
    },

    renderStaffSchedule(staff) {
        return `
            <div id="staff-tab-schedule" class="staff-tab-content hidden">
                <h4 class="font-semibold text-gray-900 mb-4">Weekly Schedule</h4>
                <p class="text-gray-500">Schedule management coming soon...</p>
            </div>
        `;
    },

    renderStaffPerformance(staff) {
        return `
            <div id="staff-tab-performance" class="staff-tab-content hidden">
                <h4 class="font-semibold text-gray-900 mb-4">Performance Metrics</h4>
                <p class="text-gray-500">Performance tracking coming soon...</p>
            </div>
        `;
    },

    renderStaffPayroll(staff) {
        return `
            <div id="staff-tab-payroll" class="staff-tab-content hidden">
                <h4 class="font-semibold text-gray-900 mb-4">Payroll & Compensation</h4>
                <p class="text-gray-500">Payroll management coming soon...</p>
            </div>
        `;
    },

    renderStaffAttendance(staff) {
        return `
            <div id="staff-tab-attendance" class="staff-tab-content hidden">
                <h4 class="font-semibold text-gray-900 mb-4">Attendance Records</h4>
                <p class="text-gray-500">Attendance tracking coming soon...</p>
            </div>
        `;
    },

    simulateCaddyMovement(staffId) {
        const staff = this.getStaffById(staffId);
        if (!staff) return;

        const allStaff = this.getAllStaff();
        const staffIndex = allStaff.findIndex(s => s.id === staffId);

        // Simulate movement to a random hole
        const randomHole = Math.floor(Math.random() * 18) + 1;
        const holeLocation = {
            hole: randomHole,
            lat: 12.9236 + (randomHole * 0.0004),
            lng: 100.8825 + (randomHole * 0.0005)
        };

        allStaff[staffIndex].workingStatus = 'on-duty';
        allStaff[staffIndex].currentLocation = holeLocation;
        allStaff[staffIndex].currentBooking = {
            playerName: 'Demo Player',
            teeTime: '08:00'
        };

        this.saveStaff(allStaff);
        this.closeModal();
        this.showStaffDetails(staffId);
        this.showStaffTab('gps');

        this.showNotification(`GPS location updated! ${staff.firstName} is now at Hole ${randomHole}`, 'success');
    },

    initialize() {
        this.updateStaffCounts();
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    StaffManagement.initialize();
});

window.StaffManagement = StaffManagement;

// ===== SECURITY INTEGRATION =====
StaffManagement.renderPendingApprovals = function() {
    if (typeof StaffSecurity !== 'undefined') {
        return StaffSecurity.renderPendingApprovalsUI();
    }
    return '';
};

StaffManagement.showChangeCodeModal = function() {
    if (typeof StaffSecurity !== 'undefined') {
        StaffSecurity.showChangeCodeModal();
    } else {
        alert('Staff security module not loaded');
    }
};

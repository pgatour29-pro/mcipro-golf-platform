/**
 * MAINTENANCE MANAGEMENT SYSTEM
 * Handles work orders, course conditions, equipment tracking
 * Integrates with weather data for maintenance scheduling
 */

const MaintenanceManagement = {

    // State management
    state: {
        workOrders: [],
        courseConditions: {
            greens: 'excellent',
            fairways: 'good',
            bunkers: 'fair',
            cartPaths: 'excellent',
            tees: 'good',
            rough: 'good'
        },
        staff: [
            { id: 'mike-wilson', name: 'Mike Wilson', department: 'Maintenance', available: true },
            { id: 'tom-johnson', name: 'Tom Johnson', department: 'Maintenance', available: true },
            { id: 'dave-miller', name: 'Dave Miller', department: 'Equipment', available: true },
            { id: 'grounds-crew', name: 'Grounds Crew', department: 'Maintenance', available: true },
            { id: 'external', name: 'External Contractor', department: 'Contract', available: true }
        ],
        metrics: {
            totalWorkOrders: 0,
            activeWorkOrders: 0,
            completedToday: 0,
            criticalIssues: 0
        }
    },

    STORAGE_KEY: 'mcipro_maintenance_data',

    // ============================================
    // INITIALIZATION
    // ============================================

    init() {
        console.log('[MaintenanceManagement] Initializing...');
        this.loadFromStorage();
        this.renderDashboard();
    },

    loadFromStorage() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                this.state.workOrders = data.workOrders || [];
                this.state.courseConditions = data.courseConditions || this.state.courseConditions;
            } else {
                // Initialize with sample data
                this.initializeSampleData();
            }
        } catch (error) {
            console.error('[MaintenanceManagement] Error loading from storage:', error);
            this.initializeSampleData();
        }
    },

    saveToStorage() {
        try {
            const data = {
                workOrders: this.state.workOrders,
                courseConditions: this.state.courseConditions,
                lastUpdated: new Date().toISOString()
            };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            console.error('[MaintenanceManagement] Error saving to storage:', error);
        }
    },

    initializeSampleData() {
        const now = new Date();
        this.state.workOrders = [
            {
                id: Date.now() + 1,
                title: 'Sprinkler Head Repair - Hole 7',
                description: 'Sprinkler head damaged during mowing, needs immediate replacement',
                priority: 'high',
                status: 'in-progress',
                assignee: 'tom-johnson',
                created: new Date(now.getTime() - 3600000 * 2).toISOString(),
                dueDate: new Date(now.getTime() + 3600000 * 4).toISOString(),
                progress: 65,
                category: 'irrigation',
                location: 'Hole 7, Fairway'
            },
            {
                id: Date.now() + 2,
                title: 'Cart #23 - Battery Replacement',
                description: 'Battery not holding charge, replacement ordered',
                priority: 'medium',
                status: 'pending',
                assignee: 'dave-miller',
                created: new Date(now.getTime() - 3600000).toISOString(),
                dueDate: new Date(now.getTime() + 3600000 * 8).toISOString(),
                progress: 0,
                category: 'equipment',
                location: 'Cart Storage'
            },
            {
                id: Date.now() + 3,
                title: 'Bunker Sand Replenishment',
                description: 'Holes 3, 7, and 14 need sand replenishment',
                priority: 'medium',
                status: 'pending',
                assignee: 'grounds-crew',
                created: new Date(now.getTime() - 7200000).toISOString(),
                dueDate: new Date(now.getTime() + 86400000).toISOString(),
                progress: 0,
                category: 'course',
                location: 'Holes 3, 7, 14'
            }
        ];
        this.saveToStorage();
    },

    // ============================================
    // DASHBOARD RENDERING
    // ============================================

    renderDashboard() {
        this.updateMetrics();
        this.renderMetricsCards();
        this.renderWorkOrders();
        this.renderCourseConditions();

        // Sync with weather data if available
        if (typeof WeatherIntegration !== 'undefined') {
            this.syncWithWeather();
        }
    },

    updateMetrics() {
        const activeOrders = this.state.workOrders.filter(wo => wo.status !== 'completed');
        const completedToday = this.state.workOrders.filter(wo => {
            if (wo.status === 'completed' && wo.completedAt) {
                const today = new Date().toISOString().split('T')[0];
                const completedDate = wo.completedAt.split('T')[0];
                return today === completedDate;
            }
            return false;
        });
        const critical = activeOrders.filter(wo => wo.priority === 'high');

        this.state.metrics = {
            totalWorkOrders: this.state.workOrders.length,
            activeWorkOrders: activeOrders.length,
            completedToday: completedToday.length,
            criticalIssues: critical.length
        };
    },

    renderMetricsCards() {
        const container = document.getElementById('maintenance-metrics-container');
        if (!container) return;

        const metrics = [
            {
                label: 'Active Work Orders',
                value: this.state.metrics.activeWorkOrders,
                icon: 'assignment',
                color: 'blue'
            },
            {
                label: 'Critical Issues',
                value: this.state.metrics.criticalIssues,
                icon: 'priority_high',
                color: 'red'
            },
            {
                label: 'Completed Today',
                value: this.state.metrics.completedToday,
                icon: 'check_circle',
                color: 'green'
            },
            {
                label: 'Course Condition',
                value: this.getOverallCourseCondition(),
                icon: 'emoji_events',
                color: 'yellow'
            }
        ];

        container.innerHTML = metrics.map(metric => `
            <div class="bg-white rounded-lg border border-gray-200 p-4">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-sm text-gray-600">${metric.label}</span>
                    <span class="material-symbols-outlined text-${metric.color}-600">${metric.icon}</span>
                </div>
                <div class="text-2xl font-bold text-gray-900">${metric.value}</div>
            </div>
        `).join('');
    },

    getOverallCourseCondition() {
        const conditions = Object.values(this.state.courseConditions);
        const scores = {
            'excellent': 4,
            'good': 3,
            'fair': 2,
            'poor': 1
        };

        const avgScore = conditions.reduce((sum, cond) => sum + (scores[cond] || 0), 0) / conditions.length;

        if (avgScore >= 3.5) return 'Excellent';
        if (avgScore >= 2.5) return 'Good';
        if (avgScore >= 1.5) return 'Fair';
        return 'Poor';
    },

    // ============================================
    // WORK ORDERS
    // ============================================

    renderWorkOrders(filter = 'all') {
        const container = document.getElementById('work-orders-container');
        if (!container) return;

        let workOrders = this.state.workOrders.filter(wo => wo.status !== 'completed');

        if (filter !== 'all') {
            workOrders = workOrders.filter(wo => wo.status === filter);
        }

        if (workOrders.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <span class="material-symbols-outlined text-5xl mb-2">task_alt</span>
                    <p>No active work orders</p>
                </div>
            `;
            return;
        }

        container.innerHTML = workOrders.map(wo => this.createWorkOrderCard(wo)).join('');
    },

    createWorkOrderCard(workOrder) {
        const priorityColors = {
            high: 'red',
            medium: 'yellow',
            low: 'green'
        };

        const statusColors = {
            pending: 'gray',
            'in-progress': 'blue',
            'on-hold': 'yellow',
            completed: 'green'
        };

        const staffName = this.getStaffName(workOrder.assignee);
        const dueDate = new Date(workOrder.dueDate);
        const isOverdue = dueDate < new Date() && workOrder.status !== 'completed';

        return `
            <div class="border border-gray-200 rounded-lg p-4 mb-4 hover:shadow-md transition-shadow">
                <div class="flex items-start justify-between mb-3">
                    <div class="flex-1">
                        <h4 class="font-semibold text-gray-900 mb-1">${workOrder.title}</h4>
                        <p class="text-sm text-gray-600 mb-2">${workOrder.description}</p>
                        <div class="flex gap-2 flex-wrap">
                            <span class="px-2 py-1 bg-${priorityColors[workOrder.priority]}-100 text-${priorityColors[workOrder.priority]}-800 text-xs rounded-full font-medium">
                                ${workOrder.priority.toUpperCase()}
                            </span>
                            <span class="px-2 py-1 bg-${statusColors[workOrder.status]}-100 text-${statusColors[workOrder.status]}-800 text-xs rounded-full">
                                ${workOrder.status.replace('-', ' ').toUpperCase()}
                            </span>
                            ${isOverdue ? '<span class="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">OVERDUE</span>' : ''}
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4 mb-3 text-sm text-gray-600">
                    <div>
                        <strong>Assigned:</strong> ${staffName}
                    </div>
                    <div>
                        <strong>Due:</strong> ${this.formatDateTime(dueDate)}
                    </div>
                    <div>
                        <strong>Category:</strong> ${workOrder.category || 'general'}
                    </div>
                    <div>
                        <strong>Location:</strong> ${workOrder.location || 'N/A'}
                    </div>
                </div>

                <div class="mb-3">
                    <div class="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>${workOrder.progress}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                        <div class="bg-blue-600 h-2 rounded-full transition-all" style="width: ${workOrder.progress}%"></div>
                    </div>
                </div>

                <div class="flex gap-2 flex-wrap">
                    <button onclick="MaintenanceManagement.updateProgress(${workOrder.id})" class="btn-sm btn-secondary">
                        Update Progress
                    </button>
                    <button onclick="MaintenanceManagement.reassignWorkOrder(${workOrder.id})" class="btn-sm btn-secondary">
                        Reassign
                    </button>
                    <button onclick="MaintenanceManagement.changeStatus(${workOrder.id})" class="btn-sm btn-secondary">
                        Change Status
                    </button>
                    <button onclick="MaintenanceManagement.viewDetails(${workOrder.id})" class="btn-sm btn-primary">
                        Details
                    </button>
                </div>
            </div>
        `;
    },

    filterWorkOrders(filter) {
        this.renderWorkOrders(filter);
    },

    // ============================================
    // COURSE CONDITIONS
    // ============================================

    renderCourseConditions() {
        const container = document.getElementById('course-conditions-container');
        if (!container) return;

        const conditions = [
            { name: 'Greens Quality', key: 'greens', icon: 'golf_course' },
            { name: 'Fairway Condition', key: 'fairways', icon: 'landscape' },
            { name: 'Bunker Condition', key: 'bunkers', icon: 'spa' },
            { name: 'Cart Path Condition', key: 'cartPaths', icon: 'route' },
            { name: 'Tee Condition', key: 'tees', icon: 'flag' },
            { name: 'Rough Condition', key: 'rough', icon: 'grass' }
        ];

        container.innerHTML = conditions.map(condition => {
            const currentCondition = this.state.courseConditions[condition.key];
            const colorClass = this.getConditionColorClass(currentCondition);

            return `
                <div class="flex items-center justify-between p-3 border border-gray-200 rounded-lg mb-2">
                    <div class="flex items-center gap-3">
                        <span class="material-symbols-outlined text-gray-600">${condition.icon}</span>
                        <span class="font-medium">${condition.name}</span>
                    </div>
                    <select onchange="MaintenanceManagement.updateCourseCondition('${condition.key}', this.value)"
                            class="form-select text-sm ${colorClass}">
                        <option value="excellent" ${currentCondition === 'excellent' ? 'selected' : ''}>Excellent</option>
                        <option value="good" ${currentCondition === 'good' ? 'selected' : ''}>Good</option>
                        <option value="fair" ${currentCondition === 'fair' ? 'selected' : ''}>Fair</option>
                        <option value="poor" ${currentCondition === 'poor' ? 'selected' : ''}>Poor</option>
                    </select>
                </div>
            `;
        }).join('');
    },

    getConditionColorClass(condition) {
        const colors = {
            'excellent': 'bg-green-100 text-green-800',
            'good': 'bg-blue-100 text-blue-800',
            'fair': 'bg-yellow-100 text-yellow-800',
            'poor': 'bg-red-100 text-red-800'
        };
        return colors[condition] || 'bg-gray-100 text-gray-800';
    },

    updateCourseCondition(key, value) {
        this.state.courseConditions[key] = value;
        this.saveToStorage();
        this.renderDashboard();

        // Show notification
        this.showToast(`Course condition updated: ${key} is now ${value}`, 'success');
    },

    // ============================================
    // WEATHER INTEGRATION
    // ============================================

    syncWithWeather() {
        if (typeof WeatherIntegration === 'undefined') return;

        const weather = WeatherIntegration.getCurrentWeather();
        if (!weather) return;

        // Update maintenance weather widget
        const tempEl = document.getElementById('maint-weather-temp');
        const descEl = document.getElementById('maint-weather-desc');
        const detailsEl = document.getElementById('maint-weather-details');

        if (tempEl) tempEl.textContent = `${weather.temperature}°C`;
        if (descEl) descEl.textContent = weather.description;
        if (detailsEl) {
            detailsEl.textContent = `Humidity: ${weather.humidity}% • Wind: ${weather.windSpeed} km/h`;
        }

        // Update recommendations based on weather
        this.updateWeatherRecommendations(weather);
    },

    updateWeatherRecommendations(weather) {
        const container = document.getElementById('maintenance-weather-recommendations');
        if (!container) return;

        const recommendations = this.getWeatherBasedRecommendations(weather);

        container.innerHTML = recommendations.map(rec => `
            <div class="p-3 bg-${rec.type === 'warning' ? 'yellow' : 'blue'}-50 border border-${rec.type === 'warning' ? 'yellow' : 'blue'}-200 rounded-lg">
                <div class="flex items-start gap-2">
                    <span class="material-symbols-outlined text-${rec.type === 'warning' ? 'yellow' : 'blue'}-600 text-sm">
                        ${rec.type === 'warning' ? 'warning' : 'info'}
                    </span>
                    <div class="text-sm">
                        <div class="font-semibold mb-1">${rec.title}</div>
                        <div class="text-gray-700">${rec.message}</div>
                    </div>
                </div>
            </div>
        `).join('');
    },

    getWeatherBasedRecommendations(weather) {
        const recommendations = [];

        // Temperature-based
        if (weather.temperature > 35) {
            recommendations.push({
                type: 'warning',
                title: 'High Temperature Alert',
                message: 'Avoid heavy maintenance during peak hours (11am-3pm). Ensure crew hydration.'
            });
        }

        // Rain-based
        if (weather.condition === 'rain' || weather.humidity > 85) {
            recommendations.push({
                type: 'warning',
                title: 'Wet Conditions',
                message: 'Delay mowing operations. Focus on indoor equipment maintenance.'
            });
        } else if (weather.humidity < 50) {
            recommendations.push({
                type: 'info',
                title: 'Optimal Watering Conditions',
                message: 'Good conditions for irrigation system testing and adjustments.'
            });
        }

        // Wind-based
        if (weather.windSpeed > 20) {
            recommendations.push({
                type: 'warning',
                title: 'High Wind Alert',
                message: 'Postpone spraying operations and tall equipment use.'
            });
        }

        // Good conditions
        if (weather.temperature >= 20 && weather.temperature <= 30 && weather.condition === 'clear') {
            recommendations.push({
                type: 'info',
                title: 'Optimal Working Conditions',
                message: 'Perfect weather for outdoor maintenance tasks and course improvements.'
            });
        }

        return recommendations.length > 0 ? recommendations : [{
            type: 'info',
            title: 'Normal Conditions',
            message: 'Weather conditions suitable for regular maintenance schedule.'
        }];
    },

    // ============================================
    // WORK ORDER ACTIONS
    // ============================================

    showCreateWorkOrderModal() {
        // Create modal HTML
        const modal = document.createElement('div');
        modal.id = 'create-work-order-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content max-w-2xl">
                <div class="modal-header">
                    <h3 class="text-xl font-bold">Create Work Order</h3>
                    <button onclick="MaintenanceManagement.closeModal('create-work-order-modal')" class="modal-close">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <form id="create-work-order-form" onsubmit="MaintenanceManagement.createWorkOrder(event)">
                    <div class="space-y-4">
                        <div>
                            <label class="form-label">Title</label>
                            <input type="text" name="title" class="form-input" required>
                        </div>
                        <div>
                            <label class="form-label">Description</label>
                            <textarea name="description" class="form-textarea" rows="3" required></textarea>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="form-label">Priority</label>
                                <select name="priority" class="form-select" required>
                                    <option value="low">Low</option>
                                    <option value="medium" selected>Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                            <div>
                                <label class="form-label">Category</label>
                                <select name="category" class="form-select" required>
                                    <option value="course">Course</option>
                                    <option value="equipment">Equipment</option>
                                    <option value="irrigation">Irrigation</option>
                                    <option value="facility">Facility</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="form-label">Assign To</label>
                                <select name="assignee" class="form-select" required>
                                    ${this.state.staff.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="form-label">Due Date</label>
                                <input type="datetime-local" name="dueDate" class="form-input" required>
                            </div>
                        </div>
                        <div>
                            <label class="form-label">Location</label>
                            <input type="text" name="location" class="form-input" placeholder="e.g., Hole 7, Cart Storage">
                        </div>
                    </div>
                    <div class="flex justify-end gap-2 mt-6">
                        <button type="button" onclick="MaintenanceManagement.closeModal('create-work-order-modal')" class="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" class="btn-primary">
                            Create Work Order
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('active'), 10);
    },

    createWorkOrder(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);

        const workOrder = {
            id: Date.now(),
            title: formData.get('title'),
            description: formData.get('description'),
            priority: formData.get('priority'),
            category: formData.get('category'),
            assignee: formData.get('assignee'),
            dueDate: new Date(formData.get('dueDate')).toISOString(),
            location: formData.get('location') || 'N/A',
            status: 'pending',
            progress: 0,
            created: new Date().toISOString()
        };

        this.state.workOrders.push(workOrder);
        this.saveToStorage();
        this.renderDashboard();
        this.closeModal('create-work-order-modal');
        this.showToast('Work order created successfully', 'success');
    },

    updateProgress(workOrderId) {
        const workOrder = this.state.workOrders.find(wo => wo.id === workOrderId);
        if (!workOrder) return;

        const newProgress = prompt(`Update progress for "${workOrder.title}" (0-100):`, workOrder.progress);
        if (newProgress !== null) {
            const progress = Math.min(100, Math.max(0, parseInt(newProgress) || 0));
            workOrder.progress = progress;

            if (progress === 100 && workOrder.status !== 'completed') {
                workOrder.status = 'completed';
                workOrder.completedAt = new Date().toISOString();
            }

            this.saveToStorage();
            this.renderDashboard();
            this.showToast('Progress updated', 'success');
        }
    },

    reassignWorkOrder(workOrderId) {
        const workOrder = this.state.workOrders.find(wo => wo.id === workOrderId);
        if (!workOrder) return;

        const staffOptions = this.state.staff.map((s, i) => `${i + 1}. ${s.name}`).join('\n');
        const selection = prompt(`Reassign "${workOrder.title}" to:\n\n${staffOptions}\n\nEnter number:`);

        if (selection) {
            const index = parseInt(selection) - 1;
            if (index >= 0 && index < this.state.staff.length) {
                workOrder.assignee = this.state.staff[index].id;
                this.saveToStorage();
                this.renderDashboard();
                this.showToast('Work order reassigned', 'success');
            }
        }
    },

    changeStatus(workOrderId) {
        const workOrder = this.state.workOrders.find(wo => wo.id === workOrderId);
        if (!workOrder) return;

        const status = prompt(`Change status for "${workOrder.title}":\n\n1. Pending\n2. In Progress\n3. On Hold\n4. Completed\n\nEnter number:`, '2');

        const statusMap = {
            '1': 'pending',
            '2': 'in-progress',
            '3': 'on-hold',
            '4': 'completed'
        };

        if (statusMap[status]) {
            workOrder.status = statusMap[status];
            if (status === '4') {
                workOrder.completedAt = new Date().toISOString();
                workOrder.progress = 100;
            }
            this.saveToStorage();
            this.renderDashboard();
            this.showToast('Status updated', 'success');
        }
    },

    viewDetails(workOrderId) {
        const workOrder = this.state.workOrders.find(wo => wo.id === workOrderId);
        if (!workOrder) return;

        const staffName = this.getStaffName(workOrder.assignee);
        const created = new Date(workOrder.created);
        const dueDate = new Date(workOrder.dueDate);

        alert(`Work Order Details:\n\nTitle: ${workOrder.title}\nDescription: ${workOrder.description}\nPriority: ${workOrder.priority}\nStatus: ${workOrder.status}\nAssigned to: ${staffName}\nCategory: ${workOrder.category}\nLocation: ${workOrder.location}\nCreated: ${this.formatDateTime(created)}\nDue: ${this.formatDateTime(dueDate)}\nProgress: ${workOrder.progress}%`);
    },

    scheduleMaintenanceWindow() {
        alert('Maintenance scheduling feature coming soon!\n\nThis will allow you to:\n- Schedule preventive maintenance\n- Block tee times for course work\n- Coordinate with weather forecasts\n- Notify staff and golfers');
    },

    generateMaintenanceReport() {
        alert('Maintenance report generation coming soon!\n\nReports will include:\n- Work order statistics\n- Course condition history\n- Equipment maintenance logs\n- Cost tracking and analysis');
    },

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    getStaffName(staffId) {
        const staff = this.state.staff.find(s => s.id === staffId);
        return staff ? staff.name : 'Unknown';
    },

    formatDateTime(date) {
        const options = {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return date.toLocaleString('en-US', options);
    },

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        }
    },

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

// Export to window
window.MaintenanceManagement = MaintenanceManagement;

console.log('[MaintenanceManagement] Module loaded');

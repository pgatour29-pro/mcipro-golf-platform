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
                label: 'Active',
                value: this.state.metrics.activeWorkOrders,
                icon: 'assignment',
                color: 'blue'
            },
            {
                label: 'Critical',
                value: this.state.metrics.criticalIssues,
                icon: 'priority_high',
                color: 'red'
            },
            {
                label: 'Done',
                value: this.state.metrics.completedToday,
                icon: 'check_circle',
                color: 'green'
            },
            {
                label: 'Condition',
                value: this.getOverallCourseCondition(),
                icon: 'emoji_events',
                color: 'yellow'
            }
        ];

        container.innerHTML = metrics.map(metric => `
            <div class="bg-white rounded-lg border border-gray-200 p-3">
                <div class="flex items-center justify-between mb-1">
                    <span class="text-xs text-gray-500">${metric.label}</span>
                    <span class="material-symbols-outlined text-sm text-${metric.color}-600">${metric.icon}</span>
                </div>
                <div class="text-xl font-bold text-gray-900">${metric.value}</div>
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
            <div class="border border-gray-200 rounded p-3 mb-3 hover:border-gray-300 transition-colors">
                <div class="flex items-start justify-between mb-2">
                    <div class="flex-1">
                        <h4 class="font-semibold text-sm text-gray-900 mb-1">${workOrder.title}</h4>
                        <div class="flex gap-1 mb-2">
                            <span class="px-1.5 py-0.5 bg-${priorityColors[workOrder.priority]}-100 text-${priorityColors[workOrder.priority]}-800 text-xs rounded">
                                ${workOrder.priority}
                            </span>
                            <span class="px-1.5 py-0.5 bg-${statusColors[workOrder.status]}-100 text-${statusColors[workOrder.status]}-800 text-xs rounded">
                                ${workOrder.status.replace('-', ' ')}
                            </span>
                            ${isOverdue ? '<span class="px-1.5 py-0.5 bg-red-100 text-red-800 text-xs rounded">overdue</span>' : ''}
                        </div>
                    </div>
                </div>

                <div class="text-xs text-gray-600 mb-2 space-y-0.5">
                    <div><strong>Assigned:</strong> ${staffName}</div>
                    <div><strong>Due:</strong> ${this.formatDateTime(dueDate)}</div>
                </div>

                <div class="mb-2">
                    <div class="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Progress</span>
                        <span>${workOrder.progress}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-1.5">
                        <div class="bg-blue-600 h-1.5 rounded-full transition-all" style="width: ${workOrder.progress}%"></div>
                    </div>
                </div>

                <div class="flex gap-1">
                    <select onchange="MaintenanceManagement.handleAction(${workOrder.id}, 'progress', this.value); this.value=''" class="form-select text-xs flex-1">
                        <option value="">Progress...</option>
                        <option value="0">0%</option>
                        <option value="25">25%</option>
                        <option value="50">50%</option>
                        <option value="75">75%</option>
                        <option value="100">100%</option>
                    </select>
                    <select onchange="MaintenanceManagement.handleAction(${workOrder.id}, 'status', this.value); this.value=''" class="form-select text-xs flex-1">
                        <option value="">Status...</option>
                        <option value="pending">Pending</option>
                        <option value="in-progress">In Progress</option>
                        <option value="on-hold">On Hold</option>
                        <option value="completed">Completed</option>
                    </select>
                    <select onchange="MaintenanceManagement.handleAction(${workOrder.id}, 'assign', this.value); this.value=''" class="form-select text-xs flex-1">
                        <option value="">Assign...</option>
                        ${this.state.staff.map(s => `<option value="${s.id}">${s.name.split(' ')[0]}</option>`).join('')}
                    </select>
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
            { name: 'Greens', key: 'greens' },
            { name: 'Fairways', key: 'fairways' },
            { name: 'Bunkers', key: 'bunkers' },
            { name: 'Paths', key: 'cartPaths' },
            { name: 'Tees', key: 'tees' },
            { name: 'Rough', key: 'rough' }
        ];

        container.innerHTML = conditions.map(condition => {
            const currentCondition = this.state.courseConditions[condition.key];
            const colorClass = this.getConditionColorClass(currentCondition);

            return `
                <div class="flex items-center justify-between p-2 border border-gray-100 rounded mb-1.5">
                    <span class="text-xs font-medium text-gray-700">${condition.name}</span>
                    <select onchange="MaintenanceManagement.updateCourseCondition('${condition.key}', this.value)"
                            class="form-select text-xs ${colorClass}">
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

        if (recommendations.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = recommendations.slice(0, 2).map(rec => {
            const color = rec.type === 'warning' ? 'yellow' : 'blue';
            return `
                <div class="flex items-start gap-2 p-2 bg-${color}-50 rounded text-xs border border-${color}-200">
                    <span class="material-symbols-outlined text-sm text-${color}-600">${rec.type === 'warning' ? 'warning' : 'info'}</span>
                    <div class="text-${color}-900">${rec.title}</div>
                </div>
            `;
        }).join('');
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

    handleAction(workOrderId, actionType, value) {
        if (!value) return;

        const workOrder = this.state.workOrders.find(wo => wo.id === workOrderId);
        if (!workOrder) return;

        switch(actionType) {
            case 'progress':
                const progress = parseInt(value);
                workOrder.progress = progress;
                if (progress === 100 && workOrder.status !== 'completed') {
                    workOrder.status = 'completed';
                    workOrder.completedAt = new Date().toISOString();
                }
                this.showToast(`Progress updated to ${progress}%`, 'success');
                break;

            case 'status':
                workOrder.status = value;
                if (value === 'completed') {
                    workOrder.completedAt = new Date().toISOString();
                    workOrder.progress = 100;
                }
                this.showToast(`Status changed to ${value.replace('-', ' ')}`, 'success');
                break;

            case 'assign':
                const newStaffName = this.getStaffName(value);
                workOrder.assignee = value;
                this.showToast(`Reassigned to ${newStaffName}`, 'success');
                break;
        }

        this.saveToStorage();
        this.renderDashboard();
    },

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
    },

    // ============================================
    // TASK MANAGEMENT TAB
    // ============================================

    showCreateTaskModal() {
        const modalHTML = `
            <div id="create-task-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onclick="if(event.target.id === 'create-task-modal') MaintenanceManagement.closeModal('create-task-modal')">
                <div class="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                    <div class="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center rounded-t-xl">
                        <h3 class="text-lg font-bold text-white">Create New Task</h3>
                        <button onclick="MaintenanceManagement.closeModal('create-task-modal')" class="text-white hover:text-gray-200">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <form onsubmit="MaintenanceManagement.createTask(event)" class="p-6 space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Task Title *</label>
                            <input type="text" id="taskTitle" required class="form-input w-full" placeholder="Enter task title">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea id="taskDescription" rows="3" class="form-input w-full" placeholder="Task description..."></textarea>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Priority *</label>
                                <select id="taskPriority" required class="form-select w-full">
                                    <option value="low">Low</option>
                                    <option value="medium" selected>Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <select id="taskCategory" class="form-select w-full">
                                    <option value="course">Course Maintenance</option>
                                    <option value="equipment">Equipment</option>
                                    <option value="irrigation">Irrigation</option>
                                    <option value="facility">Facility</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Assign To *</label>
                                <select id="taskAssignee" required class="form-select w-full">
                                    ${this.state.staff.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
                                <input type="datetime-local" id="taskDueDate" required class="form-input w-full">
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Location</label>
                            <input type="text" id="taskLocation" class="form-input w-full" placeholder="e.g., Hole 7 Fairway">
                        </div>
                        <div class="flex justify-end gap-3 pt-4">
                            <button type="button" onclick="MaintenanceManagement.closeModal('create-task-modal')" class="btn-secondary">Cancel</button>
                            <button type="submit" class="btn-primary">Create Task</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },

    createTask(event) {
        event.preventDefault();
        const task = {
            id: Date.now(),
            title: document.getElementById('taskTitle').value,
            description: document.getElementById('taskDescription').value,
            priority: document.getElementById('taskPriority').value,
            category: document.getElementById('taskCategory').value,
            assignee: document.getElementById('taskAssignee').value,
            dueDate: document.getElementById('taskDueDate').value,
            location: document.getElementById('taskLocation').value,
            status: 'pending',
            progress: 0,
            created: new Date().toISOString()
        };
        this.state.workOrders.push(task);
        this.saveToStorage();
        this.closeModal('create-task-modal');
        this.renderTasksTable();
        this.showToast('Task created successfully!', 'success');
    },

    renderTasksTable() {
        const statusFilter = document.getElementById('taskFilterStatus')?.value || 'all';
        const priorityFilter = document.getElementById('taskFilterPriority')?.value || 'all';

        let filtered = [...this.state.workOrders];
        if (statusFilter !== 'all') filtered = filtered.filter(t => t.status === statusFilter);
        if (priorityFilter !== 'all') filtered = filtered.filter(t => t.priority === priorityFilter);

        // Update stats
        const total = this.state.workOrders.length;
        const pending = this.state.workOrders.filter(t => t.status === 'pending').length;
        const inProgress = this.state.workOrders.filter(t => t.status === 'in-progress').length;
        const completed = this.state.workOrders.filter(t => t.status === 'completed').length;

        const totalEl = document.getElementById('tasks-total');
        const pendingEl = document.getElementById('tasks-pending');
        const inProgressEl = document.getElementById('tasks-inprogress');
        const completedEl = document.getElementById('tasks-completed');

        if (totalEl) totalEl.textContent = total;
        if (pendingEl) pendingEl.textContent = pending;
        if (inProgressEl) inProgressEl.textContent = inProgress;
        if (completedEl) completedEl.textContent = completed;

        const tbody = document.getElementById('tasksTableBody');
        const emptyState = document.getElementById('tasksEmptyState');
        if (!tbody) return;

        if (filtered.length === 0) {
            tbody.innerHTML = '';
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }

        if (emptyState) emptyState.classList.add('hidden');

        tbody.innerHTML = filtered.map(task => {
            const priorityColors = { high: 'red', medium: 'yellow', low: 'green' };
            const statusColors = { pending: 'gray', 'in-progress': 'blue', completed: 'green' };
            const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-';

            return `
                <tr class="hover:bg-gray-50">
                    <td class="px-4 py-3">
                        <div class="font-medium text-gray-900">${task.title}</div>
                        <div class="text-xs text-gray-500">${task.location || 'No location'}</div>
                    </td>
                    <td class="px-4 py-3">
                        <span class="px-2 py-1 rounded-full text-xs font-medium bg-${priorityColors[task.priority]}-100 text-${priorityColors[task.priority]}-700">${task.priority}</span>
                    </td>
                    <td class="px-4 py-3">
                        <select onchange="MaintenanceManagement.updateTaskStatus(${task.id}, this.value)" class="text-xs border rounded px-2 py-1">
                            <option value="pending" ${task.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="in-progress" ${task.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                            <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Completed</option>
                        </select>
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-600">${this.getStaffName(task.assignee)}</td>
                    <td class="px-4 py-3 text-sm text-gray-600">${dueDate}</td>
                    <td class="px-4 py-3">
                        <div class="flex items-center gap-2">
                            <div class="flex-1 bg-gray-200 rounded-full h-2">
                                <div class="bg-blue-600 h-2 rounded-full" style="width: ${task.progress}%"></div>
                            </div>
                            <span class="text-xs text-gray-500">${task.progress}%</span>
                        </div>
                    </td>
                    <td class="px-4 py-3">
                        <button onclick="MaintenanceManagement.deleteTask(${task.id})" class="text-red-600 hover:text-red-800">
                            <span class="material-symbols-outlined text-sm">delete</span>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    filterTasks() {
        this.renderTasksTable();
    },

    updateTaskStatus(taskId, newStatus) {
        const task = this.state.workOrders.find(t => t.id === taskId);
        if (task) {
            task.status = newStatus;
            if (newStatus === 'completed') {
                task.progress = 100;
                task.completedAt = new Date().toISOString();
            }
            this.saveToStorage();
            this.renderTasksTable();
        }
    },

    deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
            this.state.workOrders = this.state.workOrders.filter(t => t.id !== taskId);
            this.saveToStorage();
            this.renderTasksTable();
            this.showToast('Task deleted', 'info');
        }
    },

    // ============================================
    // EQUIPMENT MANAGEMENT TAB
    // ============================================

    toggleEquipmentSection(section) {
        const sectionEl = document.getElementById(`${section}-section`);
        const chevron = document.getElementById(`${section}-chevron`);
        if (sectionEl) {
            sectionEl.classList.toggle('hidden');
            if (chevron) {
                chevron.textContent = sectionEl.classList.contains('hidden') ? 'expand_more' : 'expand_less';
            }
        }
    },

    showAddEquipmentModal() {
        const modalHTML = `
            <div id="add-equipment-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onclick="if(event.target.id === 'add-equipment-modal') MaintenanceManagement.closeModal('add-equipment-modal')">
                <div class="bg-white rounded-xl shadow-2xl max-w-lg w-full">
                    <div class="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex justify-between items-center rounded-t-xl">
                        <h3 class="text-lg font-bold text-white">Add Equipment</h3>
                        <button onclick="MaintenanceManagement.closeModal('add-equipment-modal')" class="text-white hover:text-gray-200">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <div class="p-6 space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Equipment Name *</label>
                            <input type="text" id="equipName" class="form-input w-full" placeholder="e.g., Golf Cart #25">
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <select id="equipCategory" class="form-select w-full">
                                    <option value="carts">Golf Carts</option>
                                    <option value="mowers">Mowers</option>
                                    <option value="irrigation">Irrigation</option>
                                    <option value="tools">Tools</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select id="equipStatus" class="form-select w-full">
                                    <option value="operational">Operational</option>
                                    <option value="needs-attention">Needs Attention</option>
                                    <option value="in-repair">In Repair</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                            <textarea id="equipNotes" rows="2" class="form-input w-full" placeholder="Additional notes..."></textarea>
                        </div>
                        <div class="flex justify-end gap-3 pt-4">
                            <button onclick="MaintenanceManagement.closeModal('add-equipment-modal')" class="btn-secondary">Cancel</button>
                            <button onclick="MaintenanceManagement.addEquipment()" class="btn-primary">Add Equipment</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },

    addEquipment() {
        const name = document.getElementById('equipName')?.value;
        if (!name) {
            this.showToast('Please enter equipment name', 'error');
            return;
        }
        this.closeModal('add-equipment-modal');
        this.showToast('Equipment added successfully!', 'success');
    },

    filterEquipment() {
        const filter = document.getElementById('equipmentFilter')?.value || 'all';
        console.log('[MaintenanceManagement] Filtering equipment by:', filter);
    },

    // ============================================
    // SCHEDULE TAB
    // ============================================

    scheduleCurrentWeek: new Date(),

    renderScheduleCalendar() {
        const grid = document.getElementById('scheduleCalendarGrid');
        const titleEl = document.getElementById('scheduleWeekTitle');
        if (!grid) return;

        const weekStart = this.getWeekStart(this.scheduleCurrentWeek);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        if (titleEl) {
            const options = { month: 'short', day: 'numeric' };
            titleEl.textContent = `${weekStart.toLocaleDateString('en-US', options)} - ${weekEnd.toLocaleDateString('en-US', options)}, ${weekStart.getFullYear()}`;
        }

        let html = '';
        for (let i = 0; i < 7; i++) {
            const day = new Date(weekStart);
            day.setDate(day.getDate() + i);
            const isToday = day.toDateString() === new Date().toDateString();

            html += `
                <div class="p-2 min-h-[150px] ${isToday ? 'bg-blue-50' : ''}">
                    <div class="text-center mb-2">
                        <span class="text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-600'}">${day.getDate()}</span>
                    </div>
                    ${this.getScheduledItemsForDay(day)}
                </div>
            `;
        }
        grid.innerHTML = html;
    },

    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    },

    getScheduledItemsForDay(date) {
        const dayOfWeek = date.getDay();
        const items = [];

        // Daily items
        items.push({ time: '5:30', title: 'Greens Mowing', color: 'green' });

        // Mon, Wed, Fri
        if ([1, 3, 5].includes(dayOfWeek)) {
            items.push({ time: '6:00', title: 'Irrigation Check', color: 'blue' });
        }

        // Sunday
        if (dayOfWeek === 0) {
            items.push({ time: '16:00', title: 'Cart Battery Check', color: 'yellow' });
        }

        return items.map(item => `
            <div class="text-xs p-1 mb-1 rounded bg-${item.color}-100 text-${item.color}-700 truncate">
                ${item.time} ${item.title}
            </div>
        `).join('');
    },

    prevWeek() {
        this.scheduleCurrentWeek.setDate(this.scheduleCurrentWeek.getDate() - 7);
        this.renderScheduleCalendar();
    },

    nextWeek() {
        this.scheduleCurrentWeek.setDate(this.scheduleCurrentWeek.getDate() + 7);
        this.renderScheduleCalendar();
    },

    setScheduleView(view) {
        console.log('[MaintenanceManagement] Setting schedule view:', view);
        document.querySelectorAll('.schedule-view-btn').forEach(btn => {
            btn.classList.remove('bg-white', 'shadow-sm', 'active');
        });
        event.target.classList.add('bg-white', 'shadow-sm', 'active');
    },

    showScheduleEventModal() {
        const modalHTML = `
            <div id="schedule-event-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onclick="if(event.target.id === 'schedule-event-modal') MaintenanceManagement.closeModal('schedule-event-modal')">
                <div class="bg-white rounded-xl shadow-2xl max-w-lg w-full">
                    <div class="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-4 flex justify-between items-center rounded-t-xl">
                        <h3 class="text-lg font-bold text-white">Schedule Maintenance Activity</h3>
                        <button onclick="MaintenanceManagement.closeModal('schedule-event-modal')" class="text-white hover:text-gray-200">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <div class="p-6 space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Activity Name *</label>
                            <input type="text" id="scheduleTitle" class="form-input w-full" placeholder="e.g., Fairway Aeration">
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                <input type="date" id="scheduleDate" class="form-input w-full">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Time</label>
                                <select id="scheduleTime" class="form-input w-full" data-time-picker data-default="08:00"></select>
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Recurrence</label>
                            <select id="scheduleRecurrence" class="form-select w-full">
                                <option value="once">One-time</option>
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                            </select>
                        </div>
                        <div class="flex justify-end gap-3 pt-4">
                            <button onclick="MaintenanceManagement.closeModal('schedule-event-modal')" class="btn-secondary">Cancel</button>
                            <button onclick="MaintenanceManagement.saveScheduledEvent()" class="btn-primary">Schedule</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        // Initialize time picker
        if (window.TimePickerUtils) {
            const modal = document.getElementById('schedule-event-modal');
            if (modal) window.TimePickerUtils.initAll(modal);
        }
    },

    saveScheduledEvent() {
        const title = document.getElementById('scheduleTitle')?.value;
        if (!title) {
            this.showToast('Please enter activity name', 'error');
            return;
        }
        this.closeModal('schedule-event-modal');
        this.showToast('Activity scheduled successfully!', 'success');
        this.renderScheduleCalendar();
    }
};

// Export to window
window.MaintenanceManagement = MaintenanceManagement;

console.log('[MaintenanceManagement] Module loaded');

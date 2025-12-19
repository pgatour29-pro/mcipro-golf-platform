#!/usr/bin/env python3
"""
Add Golf Course Caddy Management Dashboard

FEATURES:
- 2-tier PIN authentication (Super Admin + Staff)
- Dashboard overview with stats
- Caddy directory management
- Today's bookings view
- Waitlist management
- Real-time updates

GOLF COURSES (9):
1. Pattana Golf Resort (PIN: 888888 / 8888)
2. Burapha Golf Club (PIN: 777777 / 7777)
3. Pattaya Country Club (PIN: 666666 / 6666)
4. Bangpakong Riverside (PIN: 555555 / 5555)
5. Royal Lakeside (PIN: 444444 / 4444)
6. Hermes Golf (PIN: 333333 / 3333)
7. Phoenix Golf (PIN: 222222 / 2222)
8. GreenWood Golf (PIN: 111111 / 1111)
9. Pattavia Golf (PIN: 999999 / 9999)
"""

import re

# Read the file
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# STEP 1: Add Course Dashboard HTML after Society Organizer section
# Find the end of society organizer section
insertion_point = r'(<!-- END: Society Organizer Dashboard -->)'

dashboard_html = r'''\1

        <!-- ===================================================================== -->
        <!-- GOLF COURSE CADDY MANAGEMENT DASHBOARD -->
        <!-- ===================================================================== -->
        <div id="courseAdminDashboard" class="dashboard-section hidden">
            <!-- Course Admin PIN Login -->
            <div id="courseAdminPinLogin" class="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
                <div class="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
                    <div class="text-center mb-8">
                        <div class="inline-block p-4 bg-green-100 rounded-full mb-4">
                            <span class="material-symbols-outlined text-5xl text-green-600">golf_course</span>
                        </div>
                        <h1 class="text-3xl font-bold text-gray-900 mb-2">Golf Course Admin</h1>
                        <p class="text-gray-600">Caddy Management Dashboard</p>
                    </div>

                    <!-- Course Selection -->
                    <div class="mb-6">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Select Golf Course</label>
                        <select id="courseAdminCourseSelect" class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none">
                            <option value="">-- Select Course --</option>
                            <option value="pattana-golf-resort">Pattana Golf Resort & Spa</option>
                            <option value="burapha">Burapha Golf Club</option>
                            <option value="pattaya-golf">Pattaya Country Club</option>
                            <option value="bangpakong">Bangpakong Riverside Golf</option>
                            <option value="royallakeside">Royal Lakeside Golf Club</option>
                            <option value="hermes-golf">Hermes Golf Club</option>
                            <option value="phoenix-golf">Phoenix Golf & Country Club</option>
                            <option value="greenwood-golf">GreenWood Golf Club</option>
                            <option value="pattavia">Pattavia Century Golf Club</option>
                        </select>
                    </div>

                    <!-- PIN Input -->
                    <div class="mb-6">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Enter PIN</label>
                        <input type="password" id="courseAdminPinInput" maxlength="6" placeholder="Super Admin (6 digits) or Staff (4 digits)" class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none text-2xl tracking-widest text-center">
                        <p class="text-xs text-gray-500 mt-2 text-center">
                            Super Admin PIN: Full access | Staff PIN: View & Confirm only
                        </p>
                    </div>

                    <!-- Login Button -->
                    <button onclick="CourseAdminSystem.loginWithPin()" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2">
                        <span class="material-symbols-outlined">login</span>
                        <span>Login</span>
                    </button>

                    <!-- Error Message -->
                    <div id="courseAdminPinError" class="hidden mt-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm text-center"></div>

                    <!-- Info -->
                    <div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p class="text-xs text-gray-700 text-center">
                            <strong>New User?</strong> Contact your course manager for PIN access.
                        </p>
                    </div>
                </div>
            </div>

            <!-- Course Admin Main Dashboard (Hidden until logged in) -->
            <div id="courseAdminMain" class="hidden min-h-screen bg-gray-50">
                <!-- Header -->
                <div class="bg-green-600 text-white shadow-lg">
                    <div class="container mx-auto px-4 py-4">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <span class="material-symbols-outlined text-4xl">golf_course</span>
                                <div>
                                    <h1 id="courseAdminCourseName" class="text-2xl font-bold">Golf Course Admin</h1>
                                    <p id="courseAdminRole" class="text-sm text-green-100">Loading...</p>
                                </div>
                            </div>
                            <button onclick="CourseAdminSystem.logout()" class="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-800 rounded-lg transition-colors">
                                <span class="material-symbols-outlined">logout</span>
                                <span class="hidden md:inline">Logout</span>
                            </button>
                        </div>

                        <!-- Tabs -->
                        <div class="flex gap-2 mt-4 overflow-x-auto">
                            <button onclick="CourseAdminSystem.showTab('overview')" data-tab="overview" class="course-admin-tab px-4 py-2 rounded-t-lg bg-white text-green-600 font-medium whitespace-nowrap">
                                <span class="material-symbols-outlined text-sm align-middle">dashboard</span> Overview
                            </button>
                            <button onclick="CourseAdminSystem.showTab('caddies')" data-tab="caddies" class="course-admin-tab px-4 py-2 rounded-t-lg bg-green-700 text-white hover:bg-green-800 whitespace-nowrap">
                                <span class="material-symbols-outlined text-sm align-middle">group</span> Caddies
                            </button>
                            <button onclick="CourseAdminSystem.showTab('bookings')" data-tab="bookings" class="course-admin-tab px-4 py-2 rounded-t-lg bg-green-700 text-white hover:bg-green-800 whitespace-nowrap">
                                <span class="material-symbols-outlined text-sm align-middle">event</span> Today's Bookings
                            </button>
                            <button onclick="CourseAdminSystem.showTab('waitlist')" data-tab="waitlist" class="course-admin-tab px-4 py-2 rounded-t-lg bg-green-700 text-white hover:bg-green-800 whitespace-nowrap">
                                <span class="material-symbols-outlined text-sm align-middle">hourglass_empty</span> Waitlist
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Content -->
                <div class="container mx-auto px-4 py-6">
                    <!-- Overview Tab -->
                    <div id="courseAdminOverviewTab" class="course-admin-tab-content">
                        <h2 class="text-2xl font-bold text-gray-900 mb-6">Dashboard Overview</h2>

                        <!-- Stats Cards -->
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            <div class="bg-white rounded-lg shadow p-6">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-gray-600 text-sm">Total Caddies</span>
                                    <span class="material-symbols-outlined text-blue-600">group</span>
                                </div>
                                <div id="statTotalCaddies" class="text-3xl font-bold text-gray-900">--</div>
                            </div>
                            <div class="bg-white rounded-lg shadow p-6">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-gray-600 text-sm">Available Now</span>
                                    <span class="material-symbols-outlined text-green-600">check_circle</span>
                                </div>
                                <div id="statAvailableCaddies" class="text-3xl font-bold text-green-600">--</div>
                            </div>
                            <div class="bg-white rounded-lg shadow p-6">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-gray-600 text-sm">Today's Bookings</span>
                                    <span class="material-symbols-outlined text-orange-600">event</span>
                                </div>
                                <div id="statTodaysBookings" class="text-3xl font-bold text-orange-600">--</div>
                            </div>
                            <div class="bg-white rounded-lg shadow p-6">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-gray-600 text-sm">Waitlist</span>
                                    <span class="material-symbols-outlined text-purple-600">hourglass_empty</span>
                                </div>
                                <div id="statWaitlist" class="text-3xl font-bold text-purple-600">--</div>
                            </div>
                        </div>

                        <!-- Quick Actions -->
                        <div class="bg-white rounded-lg shadow p-6 mb-8">
                            <h3 class="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <button onclick="CourseAdminSystem.showTab('caddies')" class="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors">
                                    <span class="material-symbols-outlined text-2xl text-green-600">person_add</span>
                                    <div class="text-left">
                                        <div class="font-medium text-gray-900">Add New Caddy</div>
                                        <div class="text-xs text-gray-500">Register new caddy profile</div>
                                    </div>
                                </button>
                                <button onclick="CourseAdminSystem.showTab('bookings')" class="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors">
                                    <span class="material-symbols-outlined text-2xl text-orange-600">add_circle</span>
                                    <div class="text-left">
                                        <div class="font-medium text-gray-900">Manual Booking</div>
                                        <div class="text-xs text-gray-500">Create booking for walk-in</div>
                                    </div>
                                </button>
                                <button onclick="CourseAdminSystem.showTab('waitlist')" class="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors">
                                    <span class="material-symbols-outlined text-2xl text-purple-600">notifications</span>
                                    <div class="text-left">
                                        <div class="font-medium text-gray-900">Review Waitlist</div>
                                        <div class="text-xs text-gray-500">Approve pending requests</div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Caddies Tab -->
                    <div id="courseAdminCaddiesTab" class="course-admin-tab-content hidden">
                        <div class="flex items-center justify-between mb-6">
                            <h2 class="text-2xl font-bold text-gray-900">Caddy Directory</h2>
                            <button onclick="CourseAdminSystem.openAddCaddyModal()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                                <span class="material-symbols-outlined">person_add</span>
                                Add New Caddy
                            </button>
                        </div>

                        <!-- Search/Filter -->
                        <div class="bg-white rounded-lg shadow p-4 mb-6">
                            <div class="flex flex-col md:flex-row gap-4">
                                <input type="text" id="caddySearchInput" placeholder="Search by name or number..." onkeyup="CourseAdminSystem.filterCaddies()" class="flex-1 px-4 py-2 border rounded-lg">
                                <select id="caddyStatusFilter" onchange="CourseAdminSystem.filterCaddies()" class="px-4 py-2 border rounded-lg">
                                    <option value="all">All Status</option>
                                    <option value="available">Available</option>
                                    <option value="booked">Booked</option>
                                    <option value="off_duty">Off Duty</option>
                                </select>
                            </div>
                        </div>

                        <!-- Caddies Table -->
                        <div class="bg-white rounded-lg shadow overflow-hidden">
                            <div class="overflow-x-auto">
                                <table class="w-full">
                                    <thead class="bg-gray-100">
                                        <tr>
                                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">#</th>
                                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Name</th>
                                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Rating</th>
                                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Experience</th>
                                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Specialty</th>
                                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="caddiesTableBody" class="divide-y divide-gray-200">
                                        <tr>
                                            <td colspan="7" class="px-4 py-8 text-center text-gray-500">
                                                <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-green-500 border-t-transparent"></div>
                                                <p class="mt-2">Loading caddies...</p>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- Today's Bookings Tab -->
                    <div id="courseAdminBookingsTab" class="course-admin-tab-content hidden">
                        <div class="flex items-center justify-between mb-6">
                            <h2 class="text-2xl font-bold text-gray-900">Today's Caddy Bookings</h2>
                            <button onclick="CourseAdminSystem.openManualBookingModal()" class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                                <span class="material-symbols-outlined">add_circle</span>
                                Manual Booking
                            </button>
                        </div>

                        <!-- Bookings Table -->
                        <div class="bg-white rounded-lg shadow overflow-hidden">
                            <div class="overflow-x-auto">
                                <table class="w-full">
                                    <thead class="bg-gray-100">
                                        <tr>
                                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Time</th>
                                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Caddy</th>
                                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Golfer</th>
                                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Holes</th>
                                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="bookingsTableBody" class="divide-y divide-gray-200">
                                        <tr>
                                            <td colspan="6" class="px-4 py-8 text-center text-gray-500">
                                                <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent"></div>
                                                <p class="mt-2">Loading bookings...</p>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- Waitlist Tab -->
                    <div id="courseAdminWaitlistTab" class="course-admin-tab-content hidden">
                        <h2 class="text-2xl font-bold text-gray-900 mb-6">Waitlist Requests</h2>

                        <!-- Waitlist Table -->
                        <div class="bg-white rounded-lg shadow overflow-hidden">
                            <div class="overflow-x-auto">
                                <table class="w-full">
                                    <thead class="bg-gray-100">
                                        <tr>
                                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Date</th>
                                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Caddy</th>
                                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Golfer</th>
                                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Requested</th>
                                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="waitlistTableBody" class="divide-y divide-gray-200">
                                        <tr>
                                            <td colspan="6" class="px-4 py-8 text-center text-gray-500">
                                                <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
                                                <p class="mt-2">Loading waitlist...</p>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>'''

content = re.sub(insertion_point, dashboard_html, content, flags=re.DOTALL)

# Write the updated content
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("[ADDED] Golf Course Caddy Management Dashboard HTML")
print("[ADDED] PIN Login screen for 9 golf courses")
print("[ADDED] Dashboard tabs: Overview, Caddies, Bookings, Waitlist")
print("")
print("NEXT: Add JavaScript for Course AdminSystem")

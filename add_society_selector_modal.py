#!/usr/bin/env python3
"""
Add Netflix-style Society Selector Modal to MciPro
Allows admin to choose which society to access without using LINE account
"""

def add_society_selector_modal():
    """Insert society selector modal after society organizer dashboard"""

    file_path = 'index.html'

    # Read the file
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Find insertion point (after line 28102: </div> after society organizer dashboard)
    insert_line = 28102

    # Create the society selector modal HTML + JavaScript
    modal_code = '''
    <!-- ============================================== -->
    <!-- SOCIETY SELECTOR MODAL (Netflix-style) -->
    <!-- ============================================== -->
    <div id="societySelectorModal" class="modal-overlay" style="display: none;">
        <div class="modal-content max-w-5xl">
            <div class="mb-6">
                <div class="flex items-center justify-between">
                    <div>
                        <h2 class="text-3xl font-bold text-gray-900">Select Golf Society</h2>
                        <p class="text-gray-600 mt-2">Choose which society dashboard to access</p>
                    </div>
                    <button onclick="SocietySelectorSystem.closeModal()" class="text-gray-400 hover:text-gray-600 p-2">
                        <span class="material-symbols-outlined text-3xl">close</span>
                    </button>
                </div>
            </div>

            <!-- Society Cards Grid (Netflix-style) -->
            <div id="societyCardsGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <!-- Society cards will be populated here -->
                <div class="text-center py-12 col-span-full">
                    <span class="material-symbols-outlined text-6xl text-gray-300">groups</span>
                    <p class="text-gray-500 mt-4">Loading societies...</p>
                </div>
            </div>
        </div>
    </div>

    <!-- Society Selector System JavaScript -->
    <script>
        const SocietySelectorSystem = {
            societies: [],

            async init() {
                console.log('[SocietySelectorSystem] Initializing...');
                await this.loadSocieties();
            },

            async loadSocieties() {
                try {
                    // Load all organizer profiles from database
                    const { data, error } = await window.SupabaseDB.client
                        .from('user_profiles')
                        .select('*')
                        .eq('role', 'organizer')
                        .order('society_name');

                    if (error) {
                        console.error('[SocietySelectorSystem] Database error:', error);
                        throw error;
                    }

                    console.log('[SocietySelectorSystem] Loaded', data?.length || 0, 'societies');
                    this.societies = data || [];

                    // Count events per society
                    await this.enrichSocietiesWithCounts();

                } catch (error) {
                    console.error('[SocietySelectorSystem] Error loading societies:', error);
                    this.societies = [];
                }
            },

            async enrichSocietiesWithCounts() {
                // Count events for each society
                for (const society of this.societies) {
                    try {
                        const { count, error } = await window.SupabaseDB.client
                            .from('golf_events')
                            .select('*', { count: 'exact', head: true })
                            .eq('organizer_id', society.line_user_id);

                        society.eventCount = count || 0;
                    } catch (e) {
                        console.warn('[SocietySelectorSystem] Could not count events for', society.society_name);
                        society.eventCount = 0;
                    }
                }
            },

            openModal() {
                console.log('[SocietySelectorSystem] Opening modal...');
                this.renderSocietyCards();
                const modal = document.getElementById('societySelectorModal');
                if (modal) {
                    modal.style.display = 'flex';
                }
            },

            closeModal() {
                const modal = document.getElementById('societySelectorModal');
                if (modal) {
                    modal.style.display = 'none';
                }
            },

            renderSocietyCards() {
                const grid = document.getElementById('societyCardsGrid');
                if (!grid) return;

                if (this.societies.length === 0) {
                    grid.innerHTML = `
                        <div class="text-center py-12 col-span-full">
                            <span class="material-symbols-outlined text-6xl text-gray-300">group_off</span>
                            <p class="text-gray-500 mt-4">No golf societies found</p>
                            <p class="text-sm text-gray-400 mt-2">Add society organizer profiles to get started</p>
                        </div>
                    `;
                    return;
                }

                // Render society cards
                grid.innerHTML = this.societies.map(society => {
                    const logo = society.profile_data?.organizationInfo?.societyLogo || null;
                    const website = society.profile_data?.organizationInfo?.website || null;
                    const description = society.profile_data?.organizationInfo?.description || '';
                    const societyName = society.society_name || society.name;
                    const eventCount = society.eventCount || 0;

                    return `
                        <div class="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 border-2 border-gray-200 hover:border-sky-500 hover:shadow-xl transition-all duration-300 cursor-pointer group"
                             onclick="SocietySelectorSystem.selectSociety('${society.line_user_id}')">
                            <!-- Society Logo -->
                            <div class="flex items-center justify-center mb-4">
                                ${logo ? `
                                    <img src="${logo}" alt="${societyName}"
                                         class="w-32 h-32 object-contain rounded-xl border-2 border-gray-200 group-hover:border-sky-500 transition-all"
                                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                    <div class="w-32 h-32 bg-gradient-to-br from-sky-100 to-sky-200 rounded-xl flex items-center justify-center" style="display: none;">
                                        <span class="material-symbols-outlined text-6xl text-sky-600">groups</span>
                                    </div>
                                ` : `
                                    <div class="w-32 h-32 bg-gradient-to-br from-sky-100 to-sky-200 rounded-xl flex items-center justify-center">
                                        <span class="material-symbols-outlined text-6xl text-sky-600">groups</span>
                                    </div>
                                `}
                            </div>

                            <!-- Society Name -->
                            <h3 class="text-xl font-bold text-gray-900 text-center mb-2 group-hover:text-sky-600 transition-colors">
                                ${societyName}
                            </h3>

                            <!-- Description -->
                            ${description ? `
                                <p class="text-sm text-gray-600 text-center mb-4 line-clamp-2">${description}</p>
                            ` : ''}

                            <!-- Stats -->
                            <div class="flex items-center justify-center gap-4 text-sm text-gray-500 mb-4">
                                <div class="flex items-center gap-1">
                                    <span class="material-symbols-outlined text-sm">event</span>
                                    <span>${eventCount} events</span>
                                </div>
                            </div>

                            <!-- Website -->
                            ${website ? `
                                <div class="text-center text-xs text-sky-600 truncate">${website}</div>
                            ` : ''}

                            <!-- Enter Button -->
                            <div class="mt-4 flex items-center justify-center">
                                <div class="px-6 py-2 bg-sky-500 text-white rounded-lg font-semibold group-hover:bg-sky-600 transition-colors">
                                    <span class="material-symbols-outlined text-sm mr-1">arrow_forward</span>
                                    Enter Dashboard
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            },

            async selectSociety(organizerId) {
                console.log('[SocietySelectorSystem] Selected society:', organizerId);

                // Find the selected society
                const society = this.societies.find(s => s.line_user_id === organizerId);
                if (!society) {
                    console.error('[SocietySelectorSystem] Society not found:', organizerId);
                    return;
                }

                // Store selected society in AppState
                AppState.selectedSociety = {
                    organizerId: society.line_user_id,
                    name: society.society_name || society.name,
                    logo: society.profile_data?.organizationInfo?.societyLogo || null,
                    website: society.profile_data?.organizationInfo?.website || null,
                    profile_data: society.profile_data
                };

                // Store in localStorage for persistence
                localStorage.setItem('mcipro_selected_society', JSON.stringify(AppState.selectedSociety));

                console.log('[SocietySelectorSystem] AppState.selectedSociety:', AppState.selectedSociety);

                // Close modal
                this.closeModal();

                // Navigate to society organizer dashboard
                showScreen('societyOrganizerDashboard');

                // Initialize society organizer system with selected society
                if (window.SocietyOrganizerSystem) {
                    await SocietyOrganizerSystem.init();
                }

                NotificationManager.show(`Accessing ${AppState.selectedSociety.name} dashboard`, 'success');
            }
        };

        // Modify DevMode.switchToRole to show society selector when switching to society_organizer
        const originalSwitchToRole = DevMode.switchToRole.bind(DevMode);
        DevMode.switchToRole = async function(role) {
            if (role === 'society_organizer') {
                // Load societies and show selector modal
                await SocietySelectorSystem.init();
                SocietySelectorSystem.openModal();
            } else {
                // Use original function for other roles
                originalSwitchToRole(role);
            }
        };

        // Initialize on page load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => SocietySelectorSystem.init());
        } else {
            SocietySelectorSystem.init();
        }

        // Expose for external access
        window.SocietySelectorSystem = SocietySelectorSystem;

        console.log('[SocietySelectorSystem] Module loaded');
    </script>

'''

    # Insert at the specified line
    lines.insert(insert_line, modal_code)

    # Write back to file
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)

    print("SUCCESS: Society Selector Modal added successfully!")
    print(f"   Inserted at line {insert_line}")
    print("   Features:")
    print("   - Netflix-style card grid layout")
    print("   - Society logos, names, descriptions, event counts")
    print("   - Click to enter society dashboard")
    print("   - Integrated with DevMode role switcher")
    print("   - Stores selected society in AppState + localStorage")

if __name__ == '__main__':
    add_society_selector_modal()

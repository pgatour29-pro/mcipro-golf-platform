
const SocietySelector = {
    societies: [],
    selectedSocietyId: null,

    async init() {
        const selectedOrganizerId = localStorage.getItem('selectedSocietyOrganizerId');
        const currentUserId = AppState.currentUser?.lineUserId;

        if (!currentUserId) return;

        try {
            // Wait for Supabase to be ready
            if (!window.SupabaseDB?.client) {
                await window.SupabaseDB?.waitForReady?.();
            }

            // Check if user is admin
            let isAdmin = false;

            // Hardcoded admin check for Pete while RLS policies are being configured
            if (currentUserId === 'pgatour29') {
                isAdmin = true;
                console.log('[SocietySelector] Recognized admin user (hardcoded)');
            } else {
                try {
                    const { data: userProfile, error: profileError } = await window.SupabaseDB.client
                        .from('user_profiles')
                        .select('role')
                        .eq('line_user_id', currentUserId)
                        .single();

                    if (!profileError && userProfile) {
                        isAdmin = userProfile.role === 'admin' || userProfile.role === 'super_admin';
                        console.log('[SocietySelector] User role:', userProfile.role, 'isAdmin:', isAdmin);
                    } else {
                        console.warn('[SocietySelector] Could not fetch user role, defaulting to non-admin');
                    }
                } catch (roleError) {
                    console.warn('[SocietySelector] Error fetching role:', roleError);
                    // Continue anyway - will show societies based on organizer_id
                }
            }

            // Query society_profiles table (not 'societies')
            let query = window.SupabaseDB.client
                .from('society_profiles')
                .select('*')
                .order('society_name');

            // If not admin, filter by their organizer_id
            if (!isAdmin) {
                query = query.eq('organizer_id', currentUserId);
            }
            // If admin, show ALL societies

            const { data, error } = await query;

            if (error) throw error;

            this.societies = data || [];
            console.log('[SocietySelector] Loaded', this.societies.length, 'societies:', this.societies.map(s => s.society_name).join(', '));

            // If there's a previously selected society, use it
            if (selectedOrganizerId && this.societies.find(s => s.organizer_id === selectedOrganizerId)) {
                const selected = this.societies.find(s => s.organizer_id === selectedOrganizerId);
                this.selectedSocietyId = selected.id;
                this.selectedSociety = selected;
                this.storeSelection();
            } else if (this.societies.length > 1) {
                // Show modal to choose
                this.renderModal();
                this.show();
            } else if (this.societies.length === 1) {
                // Auto-select single society
                this.selectedSocietyId = this.societies[0].id;
                this.selectedSociety = this.societies[0];
                this.storeSelection();
            }
        } catch (error) {
            console.error('Error fetching societies:', error);
        }
    },

    renderModal() {
        const societyList = document.getElementById('societyList');
        if (!societyList) return;

        societyList.innerHTML = this.societies.map(society => `
            <div class="flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer" onclick="document.getElementById('society-${society.id}').click()">
                ${society.society_logo ? `<img src="${society.society_logo}" class="w-12 h-12 rounded-lg object-cover mr-3" alt="${society.society_name}">` : ''}
                <div class="flex-1">
                    <div class="flex items-center">
                        <input type="radio" name="society" value="${society.id}" data-organizer-id="${society.organizer_id}" data-name="${society.society_name}" id="society-${society.id}" class="h-4 w-4 text-sky-600 border-gray-300 focus:ring-sky-500">
                        <label for="society-${society.id}" class="ml-3 block text-sm font-semibold text-gray-900">${society.society_name}</label>
                    </div>
                    ${society.description ? `<p class="ml-7 text-xs text-gray-500">${society.description}</p>` : ''}
                </div>
            </div>
        `).join('');

        // Select the first society by default (or previously selected)
        const storedOrganizerId = localStorage.getItem('selectedSocietyOrganizerId');
        let defaultSociety = this.societies[0];

        if (storedOrganizerId) {
            const stored = this.societies.find(s => s.organizer_id === storedOrganizerId);
            if (stored) defaultSociety = stored;
        }

        if (defaultSociety) {
            document.getElementById(`society-${defaultSociety.id}`)?.setAttribute('checked', 'checked');
        }
    },

    show() {
        document.getElementById('societySelectorModal').style.display = 'flex';
    },

    hide() {
        document.getElementById('societySelectorModal').style.display = 'none';
    },

    selectSociety() {
        const selected = document.querySelector('input[name="society"]:checked');
        if (selected) {
            this.selectedSocietyId = selected.value;
            const society = this.societies.find(s => s.id === this.selectedSocietyId);
            if(society){
                this.selectedSociety = society;
                // Store organizer_id and name for easy access
                AppState.selectedSociety = {
                    id: society.id,
                    organizerId: society.organizer_id,
                    name: society.society_name,
                    logo: society.society_logo
                };
            }
            this.storeSelection();
            this.hide();
            // Refresh the dashboard
            if (window.SocietyOrganizerSystem) {
                SocietyOrganizerSystem.init();
            }
        }
    },

    storeSelection() {
        if (this.selectedSocietyId && this.selectedSociety) {
            localStorage.setItem('selectedSocietyId', this.selectedSocietyId);
            localStorage.setItem('selectedSocietyName', this.selectedSociety.society_name);
            localStorage.setItem('selectedSocietyOrganizerId', this.selectedSociety.organizer_id);
            console.log('[SocietySelector] Selected:', this.selectedSociety.society_name, '(' + this.selectedSociety.organizer_id + ')');
        }
    }
};

// Initialize on load if user is society organizer
document.addEventListener('DOMContentLoaded', () => {
    if (AppState.currentUser?.role === 'society_organizer' || AppState.currentUser?.role === 'admin') {
        SocietySelector.init();
    }
});

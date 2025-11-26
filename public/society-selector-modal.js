
const SocietySelector = {
    societies: [],
    selectedSocietyId: null,

    async init() {
        const organizerId = AppState.currentUser?.lineUserId;
        if (!organizerId) return;

        try {
            // Get the user profile to get the user's UUID
            const { data: userProfile, error: profileError } = await supabase
                .from('user_profiles')
                .select('id')
                .eq('line_user_id', organizerId)
                .single();

            if (profileError) throw profileError;

            const userId = userProfile.id;

            const { data, error } = await supabase
                .from('societies')
                .select('*')
                .eq('organizer_id', userId);

            if (error) throw error;

            this.societies = data;
            if (this.societies.length > 1) {
                this.renderModal();
                this.show();
            } else if (this.societies.length === 1) {
                this.selectedSocietyId = this.societies[0].id;
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
            <div class="flex items-center">
                <input type="radio" name="society" value="${society.id}" id="society-${society.id}" class="h-4 w-4 text-sky-600 border-gray-300 focus:ring-sky-500">
                <label for="society-${society.id}" class="ml-3 block text-sm font-medium text-gray-700">${society.name}</label>
            </div>
        `).join('');

        // Select the first society by default
        if (this.societies.length > 0) {
            document.getElementById(`society-${this.societies[0].id}`).checked = true;
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
            }
            this.storeSelection();
            this.hide();
            // Optionally, refresh the dashboard or trigger an event
            if (window.SocietyOrganizerSystem) {
                SocietyOrganizerSystem.init();
            }
        }
    },

    storeSelection() {
        if (this.selectedSocietyId) {
            localStorage.setItem('selectedSocietyId', this.selectedSocietyId);
            if(this.selectedSociety){
                localStorage.setItem('selectedSocietyName', this.selectedSociety.name);
                localStorage.setItem('selectedSocietyOrganizerId', this.selectedSociety.organizer_id);
            }
        }
    }
};

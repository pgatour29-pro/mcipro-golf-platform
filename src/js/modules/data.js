import { UI } from './ui.js';

async function loadCourses() {
    try {
        const { data, error } = await SupabaseManager.client
            .from('courses')
            .select('*')
            .order('name');
        if (error) throw error;
        state.courses = data;
        console.log(`[Data] Loaded ${data.length} courses.`);
    } catch (error) {
        UI.showError(`Could not load courses: ${error.message}`);
    }
}

async function loadSocieties() {
    try {
        const { data, error } = await SupabaseManager.client
            .from('societies')
            .select('*')
            .order('name');
        if (error) throw error;
        state.societies = data;
         console.log(`[Data] Loaded ${data.length} societies.`);
    } catch (error)
    {
        UI.showError(`Could not load societies: ${error.message}`);
    }
}

async function loadBookings() {
    try {
        const { data, error } = await SupabaseManager.client
            .from('bookings')
            .select(`*, course:courses(name), caddie:caddies(display_name)`)
            .eq('user_id', state.currentUser.id)
            .order('booking_time', { ascending: false });
        if (error) throw error;
        state.bookings = data;
        console.log(`[Data] Loaded ${data.length} bookings for user.`);
    } catch (error) {
        UI.showError(`Could not load bookings: ${error.message}`);
    }
}

export { loadCourses, loadSocieties, loadBookings };

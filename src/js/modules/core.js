import { state } from '../main.js';
import { UI } from './ui.js';
import { loadBookings } from './data.js';

async function startNewRound() {
    const courseId = UI.query('#startRoundCourseSelect').value;
    const nineName = UI.query('#startRoundNineSelect').value;
    
    if (!courseId) {
        UI.showError("Please select a course.");
        return;
    }

    const course = state.courses.find(c => c.id === courseId);
    if (!course) {
        UI.showError("Selected course not found.");
        return;
    }

    UI.showLoading();
    try {
        // Logic to create a new round in the database
        const { data, error } = await SupabaseManager.client
            .from('rounds')
            .insert({
                user_id: state.currentUser.id,
                course_id: course.id,
                course_name: course.name,
                status: 'in_progress',
                type: 'live',
                started_at: new Date().toISOString(),
                // other fields...
            })
            .select()
            .single();

        if (error) throw error;

        state.currentRound = { ...data, holes: [], players: [ { id: state.currentUser.id, name: state.currentUser.displayName, scores: {} } ] };
        console.log('[Scoring] New round started:', state.currentRound);
        
        renderLiveScoreTab(); // Re-render the tab to show the scorecard

    } catch (error) {
        UI.showError(`Failed to start round: ${error.message}`);
    } finally {
        UI.hideLoading();
    }
}

function renderScorecard() {
    const container = UI.query('#tab-liveScore');
    if (!container || !state.currentRound) return;

    // More sophisticated rendering would be needed here, this is a placeholder
    container.innerHTML = `
        <div class="bg-white p-6 rounded-xl shadow-lg">
            <h2 class="text-2xl font-bold mb-4">Live Scorecard</h2>
            <p>Course: ${state.currentRound.course_name}</p>
            <p>Status: ${state.currentRound.status}</p>
            <div id="scorecard-grid" class="mt-4">
                <!-- Scorecard grid will be rendered here -->
            </div>
             <div class="mt-6 flex justify-between">
                <button id="addPlayerBtn" class="btn-secondary">Add Player</button>
                <button id="finishRoundBtn" class="btn-primary">Finish Round</button>
            </div>
        </div>
    `;
    
    // Logic to render the actual scorecard grid based on holes and players
    
    UI.query('#finishRoundBtn').onclick = async () => {
         UI.showLoading();
         try {
            // Finalize round in DB
            const { error } = await SupabaseManager.client
                .from('rounds')
                .update({ status: 'completed', completed_at: new Date().toISOString() })
                .eq('id', state.currentRound.id);
            if (error) throw error;
            
            UI.showSuccess("Round finished and saved!");
            state.currentRound = null;
            await loadBookings(); // Refresh data
            renderLiveScoreTab(); // Go back to start round screen
            showTab('history'); // Switch to history tab to show the new round
         } catch(error) {
             UI.showError(`Failed to finish round: ${error.message}`);
         } finally {
             UI.hideLoading();
         }
    };
}

export { startNewRound, renderScorecard };

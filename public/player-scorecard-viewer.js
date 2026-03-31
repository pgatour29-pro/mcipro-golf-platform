// ============================================================================
// PLAYER SCORECARD VIEWER
// ============================================================================
// Created: 2026-03-31
// Purpose: View any player's profile and hole-by-hole scorecard from the
//          society page player directory. Integrates with SocietyOrganizerSystem.
// ============================================================================

window.PlayerScorecardViewer = (function() {
    'use strict';

    // =========================================================================
    // SCORE COLOR HELPERS
    // =========================================================================

    function getScoreLabel(gross, par) {
        const diff = gross - par;
        if (diff <= -2) return { label: 'Eagle', cls: 'bg-yellow-400 text-yellow-900', ring: 'ring-2 ring-yellow-400' };
        if (diff === -1) return { label: 'Birdie', cls: 'bg-red-500 text-white', ring: 'ring-2 ring-red-400' };
        if (diff === 0)  return { label: 'Par', cls: 'bg-green-500 text-white', ring: '' };
        if (diff === 1)  return { label: 'Bogey', cls: 'bg-blue-500 text-white', ring: '' };
        if (diff === 2)  return { label: 'Double', cls: 'bg-blue-700 text-white', ring: '' };
        return { label: `+${diff}`, cls: 'bg-gray-700 text-white', ring: '' };
    }

    function getScoreCellClass(gross, par) {
        const diff = gross - par;
        if (diff <= -2) return 'bg-yellow-100 text-yellow-800 font-bold'; // Eagle+
        if (diff === -1) return 'bg-red-100 text-red-700 font-bold';     // Birdie
        if (diff === 0)  return 'text-green-700 font-semibold';           // Par
        if (diff === 1)  return 'text-blue-600';                          // Bogey
        if (diff === 2)  return 'text-blue-800 font-semibold';            // Double
        return 'text-gray-800 font-bold';                                  // Triple+
    }

    function getScoreDot(gross, par) {
        const diff = gross - par;
        if (diff <= -2) return '<span class="inline-block w-6 h-6 rounded-full bg-yellow-400 text-yellow-900 text-xs font-bold flex items-center justify-center leading-none">' + gross + '</span>';
        if (diff === -1) return '<span class="inline-block w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center leading-none">' + gross + '</span>';
        if (diff === 0)  return '<span class="inline-block w-6 h-6 rounded-full bg-green-100 text-green-800 text-xs font-bold flex items-center justify-center leading-none border border-green-300">' + gross + '</span>';
        if (diff === 1)  return '<span class="inline-block w-6 h-6 rounded-sm bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center leading-none border border-blue-300">' + gross + '</span>';
        if (diff === 2)  return '<span class="inline-block w-6 h-6 rounded-sm bg-blue-200 text-blue-900 text-xs font-bold flex items-center justify-center leading-none border-2 border-blue-400">' + gross + '</span>';
        return '<span class="inline-block w-6 h-6 rounded-sm bg-gray-300 text-gray-900 text-xs font-bold flex items-center justify-center leading-none border-2 border-gray-500">' + gross + '</span>';
    }

    // =========================================================================
    // OPEN PLAYER PROFILE (from directory row click)
    // =========================================================================

    async function openPlayerProfile(playerId, playerName) {
        const supabase = window.SupabaseDB?.client;
        if (!supabase) {
            console.error('[ScorecardViewer] No Supabase client');
            return;
        }

        // Show loading
        showModal(`
            <div class="text-center py-12">
                <div class="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mb-4"></div>
                <p class="text-gray-500">Loading ${playerName || 'player'}'s profile...</p>
            </div>
        `);

        try {
            const { data, error } = await supabase.rpc('get_player_profile', {
                target_player_id: playerId
            });

            if (error || !data) {
                showModal(`
                    <div class="text-center py-12 text-red-500">
                        <span class="material-symbols-outlined text-4xl mb-2">error</span>
                        <p>Failed to load profile</p>
                        <p class="text-sm text-gray-400 mt-1">${error?.message || 'No data found'}</p>
                    </div>
                `);
                return;
            }

            renderProfileModal(data);
        } catch (err) {
            console.error('[ScorecardViewer] Error:', err);
        }
    }

    // =========================================================================
    // RENDER PROFILE MODAL
    // =========================================================================

    function renderProfileModal(profile) {
        const stats = profile.statistics || {};
        const societies = profile.societies || {};
        const rounds = profile.recent_rounds || [];
        const hcp = profile.handicap != null ? (profile.handicap < 0 ? '+' + Math.abs(profile.handicap).toFixed(1) : parseFloat(profile.handicap).toFixed(1)) : '-';

        // Score distribution from rounds
        const roundCount = stats.total_rounds || 0;

        let html = `
            <!-- Header -->
            <div class="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-6 text-white">
                <div class="flex items-center gap-4">
                    <div class="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold flex-shrink-0">
                        ${(profile.player_name || 'U')[0].toUpperCase()}
                    </div>
                    <div class="min-w-0">
                        <h2 class="text-xl font-bold truncate">${profile.player_name || 'Unknown'}</h2>
                        <p class="text-emerald-100 text-sm">${societies.primary || 'No society'}</p>
                        ${profile.home_course?.name ? `<p class="text-emerald-200 text-xs mt-0.5">⛳ ${profile.home_course.name}</p>` : ''}
                    </div>
                </div>
            </div>

            <!-- Stats Grid -->
            <div class="grid grid-cols-4 gap-1 p-3 bg-gray-50">
                <div class="text-center py-2">
                    <div class="text-lg font-bold text-emerald-600">${hcp}</div>
                    <div class="text-[10px] text-gray-500 uppercase tracking-wide">HCP</div>
                </div>
                <div class="text-center py-2">
                    <div class="text-lg font-bold text-blue-600">${roundCount}</div>
                    <div class="text-[10px] text-gray-500 uppercase tracking-wide">Rounds</div>
                </div>
                <div class="text-center py-2">
                    <div class="text-lg font-bold text-teal-600">${stats.avg_gross || '-'}</div>
                    <div class="text-[10px] text-gray-500 uppercase tracking-wide">Avg Gross</div>
                </div>
                <div class="text-center py-2">
                    <div class="text-lg font-bold text-orange-600">${stats.best_gross || '-'}</div>
                    <div class="text-[10px] text-gray-500 uppercase tracking-wide">Best</div>
                </div>
            </div>

            <!-- Stableford stats -->
            ${stats.avg_stableford ? `
                <div class="flex justify-center gap-6 px-4 py-2 border-b border-gray-100 bg-amber-50/50">
                    <span class="text-sm text-gray-600">⭐ Avg Stableford: <span class="font-bold text-amber-600">${stats.avg_stableford} pts</span></span>
                    <span class="text-sm text-gray-600">🏆 Best: <span class="font-bold text-amber-600">${stats.best_stableford || '-'} pts</span></span>
                </div>
            ` : ''}

            <!-- Societies -->
            ${societies.all && societies.all.length > 1 ? `
                <div class="px-4 py-2 border-b border-gray-100">
                    <span class="text-xs text-gray-500">Societies:</span>
                    <span class="text-sm font-medium ml-1">${societies.all.join(', ')}</span>
                </div>
            ` : ''}

            <!-- Round History -->
            <div class="px-4 pt-3 pb-2">
                <h3 class="font-semibold text-gray-800 text-sm flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-emerald-600 text-base">history</span>
                    Round History (${rounds.length})
                </h3>
            </div>

            ${rounds.length > 0 ? `
                <div class="px-3 pb-3 max-h-72 overflow-y-auto">
                    <div class="space-y-1.5">
                        ${rounds.map(round => {
                            const date = round.played_at ? new Date(round.played_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '-';
                            const course = round.course_name || 'Unknown';
                            const shortCourse = course.length > 28 ? course.substring(0, 25) + '...' : course;
                            const typeIcon = round.type === 'society' ? '🏆' : '👤';
                            const hasHoles = round.hole_count > 0;
                            const stab = round.total_stableford > 0 ? round.total_stableford : '-';

                            return `
                                <div class="flex items-center gap-2 py-2.5 px-3 rounded-lg ${hasHoles ? 'hover:bg-emerald-50 cursor-pointer active:bg-emerald-100' : 'bg-gray-50'} border border-gray-100 transition-colors"
                                     ${hasHoles ? `onclick="PlayerScorecardViewer.openScorecard('${round.scorecard_id}', '${profile.player_name?.replace(/'/g, "\\'") || 'Unknown'}')"` : ''}>
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center gap-1.5">
                                            <span class="text-xs">${typeIcon}</span>
                                            <span class="text-sm font-medium text-gray-800 truncate">${shortCourse}</span>
                                        </div>
                                        <div class="text-xs text-gray-400 mt-0.5">${date}${round.tee_marker ? ' • ' + round.tee_marker + ' tees' : ''}</div>
                                    </div>
                                    <div class="flex items-center gap-3 flex-shrink-0">
                                        <div class="text-right">
                                            <div class="text-sm font-bold text-emerald-700">${round.total_gross || '-'}</div>
                                            <div class="text-[10px] text-gray-400">gross</div>
                                        </div>
                                        <div class="text-right">
                                            <div class="text-sm font-bold text-blue-600">${round.total_net || '-'}</div>
                                            <div class="text-[10px] text-gray-400">net</div>
                                        </div>
                                        <div class="text-right">
                                            <div class="text-sm font-bold text-amber-600">${stab}</div>
                                            <div class="text-[10px] text-gray-400">pts</div>
                                        </div>
                                        ${hasHoles ? '<span class="material-symbols-outlined text-gray-300 text-base">chevron_right</span>' : '<span class="text-xs text-gray-300">—</span>'}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            ` : `
                <div class="text-center py-8 text-gray-400 px-4">
                    <span class="material-symbols-outlined text-3xl mb-2">sports_golf</span>
                    <p class="text-sm">No rounds recorded yet</p>
                </div>
            `}

            <!-- Legend -->
            <div class="px-4 py-2 bg-gray-50 border-t border-gray-100 text-[10px] text-gray-400 text-center">
                Tap a round with ▸ to view hole-by-hole scorecard
            </div>
        `;

        showModal(html);
    }

    // =========================================================================
    // OPEN SCORECARD (hole-by-hole view)
    // =========================================================================

    async function openScorecard(scorecardId, playerName) {
        const supabase = window.SupabaseDB?.client;
        if (!supabase) return;

        // Show loading in current modal
        showModal(`
            <div class="text-center py-12">
                <div class="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mb-4"></div>
                <p class="text-gray-500">Loading scorecard...</p>
            </div>
        `);

        try {
            const { data, error } = await supabase.rpc('get_scorecard_detail', {
                p_scorecard_id: scorecardId
            });

            if (error || !data) {
                showModal(`
                    <div class="text-center py-12 text-red-500">
                        <span class="material-symbols-outlined text-4xl mb-2">error</span>
                        <p>Failed to load scorecard</p>
                    </div>
                `);
                return;
            }

            renderScorecardModal(data, playerName);
        } catch (err) {
            console.error('[ScorecardViewer] Scorecard error:', err);
        }
    }

    // =========================================================================
    // RENDER SCORECARD MODAL
    // =========================================================================

    function renderScorecardModal(data, playerName) {
        const sc = data.scorecard || {};
        const holes = data.holes || [];

        if (holes.length === 0) {
            showModal(`
                <div class="text-center py-12 text-gray-400">
                    <span class="material-symbols-outlined text-4xl mb-2">sports_golf</span>
                    <p>No hole data available for this round</p>
                </div>
            `);
            return;
        }

        const date = sc.played_at ? new Date(sc.played_at).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) : '';
        const hcp = sc.handicap != null ? parseFloat(sc.handicap).toFixed(1) : '-';
        const playHcp = sc.playing_handicap ?? '-';

        // Split into front/back 9
        const front9 = holes.filter(h => h.hole_number <= 9);
        const back9 = holes.filter(h => h.hole_number > 9);

        // Totals
        const frontPar = front9.reduce((s, h) => s + (h.par || 0), 0);
        const backPar = back9.reduce((s, h) => s + (h.par || 0), 0);
        const frontGross = front9.reduce((s, h) => s + (h.gross_score || 0), 0);
        const backGross = back9.reduce((s, h) => s + (h.gross_score || 0), 0);
        const frontNet = front9.reduce((s, h) => s + (h.net_score || 0), 0);
        const backNet = back9.reduce((s, h) => s + (h.net_score || 0), 0);
        const frontPts = front9.reduce((s, h) => s + (h.stableford_points || 0), 0);
        const backPts = back9.reduce((s, h) => s + (h.stableford_points || 0), 0);

        // Score distribution
        let eagles = 0, birdies = 0, pars = 0, bogeys = 0, doubles = 0, others = 0;
        holes.forEach(h => {
            const diff = h.gross_score - h.par;
            if (diff <= -2) eagles++;
            else if (diff === -1) birdies++;
            else if (diff === 0) pars++;
            else if (diff === 1) bogeys++;
            else if (diff === 2) doubles++;
            else others++;
        });

        function buildNineTable(nineHoles, ninePar, nineGross, nineNet, ninePts, label) {
            return `
                <div class="mb-3">
                    <div class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 px-1">${label}</div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-xs border-collapse">
                            <thead>
                                <tr class="bg-gray-100">
                                    <th class="px-1.5 py-1.5 text-left text-gray-500 font-medium w-12">Hole</th>
                                    ${nineHoles.map(h => `<th class="px-1 py-1.5 text-center text-gray-600 font-bold w-8">${h.hole_number}</th>`).join('')}
                                    <th class="px-1.5 py-1.5 text-center text-gray-700 font-bold bg-gray-200 w-10">Tot</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr class="border-b border-gray-100">
                                    <td class="px-1.5 py-1 text-gray-500 font-medium">Par</td>
                                    ${nineHoles.map(h => `<td class="px-1 py-1 text-center text-gray-500">${h.par}</td>`).join('')}
                                    <td class="px-1.5 py-1 text-center font-bold text-gray-600 bg-gray-50">${ninePar}</td>
                                </tr>
                                <tr class="border-b border-gray-100">
                                    <td class="px-1.5 py-1 text-gray-500 font-medium">SI</td>
                                    ${nineHoles.map(h => `<td class="px-1 py-1 text-center text-gray-400 text-[10px]">${h.stroke_index}</td>`).join('')}
                                    <td class="px-1.5 py-1 text-center bg-gray-50"></td>
                                </tr>
                                <tr class="border-b border-gray-200 bg-white">
                                    <td class="px-1.5 py-1.5 text-gray-700 font-semibold">Gross</td>
                                    ${nineHoles.map(h => `<td class="px-1 py-1.5 text-center ${getScoreCellClass(h.gross_score, h.par)}">${h.gross_score}</td>`).join('')}
                                    <td class="px-1.5 py-1.5 text-center font-bold text-emerald-700 bg-emerald-50">${nineGross}</td>
                                </tr>
                                <tr class="border-b border-gray-100">
                                    <td class="px-1.5 py-1 text-gray-500 font-medium">Net</td>
                                    ${nineHoles.map(h => `<td class="px-1 py-1 text-center text-gray-600">${h.net_score ?? '-'}</td>`).join('')}
                                    <td class="px-1.5 py-1 text-center font-bold text-blue-600 bg-blue-50">${nineNet}</td>
                                </tr>
                                <tr>
                                    <td class="px-1.5 py-1 text-gray-500 font-medium">Pts</td>
                                    ${nineHoles.map(h => `<td class="px-1 py-1 text-center ${h.stableford_points >= 3 ? 'text-amber-600 font-bold' : h.stableford_points === 0 ? 'text-gray-300' : 'text-gray-600'}">${h.stableford_points ?? '-'}</td>`).join('')}
                                    <td class="px-1.5 py-1 text-center font-bold text-amber-600 bg-amber-50">${ninePts}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        const html = `
            <!-- Back button + Header -->
            <div class="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-4 text-white">
                <button onclick="PlayerScorecardViewer.openPlayerProfile('${sc.player_id}', '${(sc.player_name || '').replace(/'/g, "\\'")}')"
                        class="flex items-center gap-1 text-emerald-100 hover:text-white text-sm mb-2 transition-colors">
                    <span class="material-symbols-outlined text-sm">arrow_back</span>
                    Back to profile
                </button>
                <h2 class="text-lg font-bold">${sc.course_name || 'Unknown Course'}</h2>
                <p class="text-emerald-100 text-sm">${sc.player_name || playerName || 'Unknown'} • ${date}</p>
                <div class="flex gap-3 mt-2 text-xs text-emerald-200">
                    <span>HCP: ${hcp}</span>
                    <span>Playing: ${playHcp}</span>
                    ${sc.tee_marker ? `<span>${sc.tee_marker} tees</span>` : ''}
                </div>
            </div>

            <!-- Totals bar -->
            <div class="grid grid-cols-4 gap-1 p-2 bg-gray-50">
                <div class="text-center py-1.5">
                    <div class="text-lg font-bold text-emerald-700">${sc.total_gross || (frontGross + backGross)}</div>
                    <div class="text-[10px] text-gray-500">GROSS</div>
                </div>
                <div class="text-center py-1.5">
                    <div class="text-lg font-bold text-blue-600">${sc.total_net || (frontNet + backNet)}</div>
                    <div class="text-[10px] text-gray-500">NET</div>
                </div>
                <div class="text-center py-1.5">
                    <div class="text-lg font-bold text-amber-600">${frontPts + backPts}</div>
                    <div class="text-[10px] text-gray-500">POINTS</div>
                </div>
                <div class="text-center py-1.5">
                    <div class="text-lg font-bold ${(sc.total_gross || (frontGross + backGross)) - (frontPar + backPar) > 0 ? 'text-blue-600' : 'text-red-600'}">
                        ${((sc.total_gross || (frontGross + backGross)) - (frontPar + backPar)) > 0 ? '+' : ''}${(sc.total_gross || (frontGross + backGross)) - (frontPar + backPar)}
                    </div>
                    <div class="text-[10px] text-gray-500">vs PAR</div>
                </div>
            </div>

            <!-- Score Distribution -->
            <div class="flex justify-center gap-2 px-3 py-2 border-b border-gray-100">
                ${eagles > 0 ? `<span class="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 text-[10px] font-bold">🦅 ${eagles}</span>` : ''}
                ${birdies > 0 ? `<span class="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">🔴 ${birdies}</span>` : ''}
                <span class="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">🟢 ${pars}</span>
                <span class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">🔵 ${bogeys}</span>
                ${doubles > 0 ? `<span class="px-2 py-0.5 rounded-full bg-blue-200 text-blue-900 text-[10px] font-bold">⚪ ${doubles}</span>` : ''}
                ${others > 0 ? `<span class="px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 text-[10px] font-bold">⬛ ${others}</span>` : ''}
            </div>

            <!-- Front 9 -->
            <div class="p-3 overflow-x-auto">
                ${front9.length > 0 ? buildNineTable(front9, frontPar, frontGross, frontNet, frontPts, 'Front 9') : ''}
                ${back9.length > 0 ? buildNineTable(back9, backPar, backGross, backNet, backPts, 'Back 9') : ''}
            </div>

            <!-- Legend -->
            <div class="px-4 py-2 bg-gray-50 border-t border-gray-100">
                <div class="flex flex-wrap justify-center gap-3 text-[10px] text-gray-500">
                    <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-yellow-400 inline-block"></span> Eagle+</span>
                    <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-red-100 border border-red-300 inline-block"></span> Birdie</span>
                    <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-green-100 border border-green-300 inline-block"></span> Par</span>
                    <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm bg-blue-100 border border-blue-300 inline-block"></span> Bogey</span>
                    <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm bg-blue-200 border-2 border-blue-400 inline-block"></span> Double+</span>
                </div>
            </div>
        `;

        showModal(html);
    }

    // =========================================================================
    // MODAL MANAGEMENT
    // =========================================================================

    function showModal(contentHtml) {
        let modal = document.getElementById('player-scorecard-modal');

        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'player-scorecard-modal';
            modal.className = 'fixed inset-0 z-50 flex items-end sm:items-center justify-center';
            modal.innerHTML = `
                <div class="absolute inset-0 bg-black/50 transition-opacity" onclick="PlayerScorecardViewer.closeModal()"></div>
                <div id="player-scorecard-modal-content"
                     class="relative bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-2xl transform transition-transform">
                </div>
            `;
            document.body.appendChild(modal);
        }

        const content = modal.querySelector('#player-scorecard-modal-content');

        // Add close button to content
        content.innerHTML = `
            <button onclick="PlayerScorecardViewer.closeModal()"
                    class="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white transition-colors">
                <span class="material-symbols-outlined text-lg">close</span>
            </button>
            ${contentHtml}
        `;

        modal.style.display = 'flex';
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        const modal = document.getElementById('player-scorecard-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    // =========================================================================
    // PUBLIC API
    // =========================================================================

    return {
        openPlayerProfile,
        openScorecard,
        closeModal
    };

})();

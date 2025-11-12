/**
 * ============================================================================
 * SEASON POINTS MANAGER - FedEx Cup Style Leaderboard System
 * ============================================================================
 * Manages year-to-date points tracking across multiple events
 * Similar to PGA Tour FedEx Cup standings
 *
 * Features:
 * - Multi-event cumulative points tracking
 * - Division-based leaderboards (A, B, C, D)
 * - Configurable point systems (FedEx Cup, F1, Linear, etc.)
 * - Automatic standings updates after each event
 * - Season history and player stats
 *
 * Created: 2025-11-12
 * ============================================================================
 */

class SeasonPointsManager {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.currentSeason = new Date().getFullYear();
    this.currentConfig = null;
    this.standings = [];
    this.eventResults = [];
  }

  // ==========================================================================
  // CONFIGURATION MANAGEMENT
  // ==========================================================================

  /**
   * Get or create points configuration for current organizer/season
   */
  async getPointsConfig(organizerId, seasonYear = this.currentSeason) {
    try {
      const { data, error } = await this.supabase
        .from('points_config')
        .select('*')
        .eq('organizer_id', organizerId)
        .eq('season_year', seasonYear)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      // If no config exists, create default
      if (!data) {
        return await this.createDefaultConfig(organizerId, seasonYear);
      }

      this.currentConfig = data;
      return data;
    } catch (error) {
      console.error('Error getting points config:', error);
      throw error;
    }
  }

  /**
   * Create default FedEx Cup style configuration
   */
  async createDefaultConfig(organizerId, seasonYear = this.currentSeason) {
    const defaultConfig = {
      organizer_id: organizerId,
      season_year: seasonYear,
      config_name: 'FedEx Cup Style',
      point_system: {
        "1": 100, "2": 50, "3": 35, "4": 25, "5": 20,
        "6": 15, "7": 12, "8": 10, "9": 8, "10": 6,
        "11": 5, "12": 4, "13": 3, "14": 2, "15": 1
      },
      divisions_enabled: true,
      division_definitions: {
        "A": "0-9",
        "B": "10-18",
        "C": "19-28",
        "D": "29+"
      },
      min_events_required: 1,
      max_events_counted: null,
      is_active: true
    };

    const { data, error } = await this.supabase
      .from('points_config')
      .insert(defaultConfig)
      .select()
      .single();

    if (error) throw error;

    this.currentConfig = data;
    return data;
  }

  /**
   * Update points configuration
   */
  async updatePointsConfig(configId, updates) {
    const { data, error } = await this.supabase
      .from('points_config')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', configId)
      .select()
      .single();

    if (error) throw error;

    this.currentConfig = data;
    return data;
  }

  /**
   * Get preset point systems
   */
  getPresetPointSystems() {
    return {
      'FedEx Cup': {
        "1": 100, "2": 50, "3": 35, "4": 25, "5": 20,
        "6": 15, "7": 12, "8": 10, "9": 8, "10": 6,
        "11": 5, "12": 4, "13": 3, "14": 2, "15": 1
      },
      'F1 Style': {
        "1": 25, "2": 18, "3": 15, "4": 12, "5": 10,
        "6": 8, "7": 6, "8": 4, "9": 2, "10": 1
      },
      'Linear 20-1': {
        "1": 20, "2": 19, "3": 18, "4": 17, "5": 16,
        "6": 15, "7": 14, "8": 13, "9": 12, "10": 11,
        "11": 10, "12": 9, "13": 8, "14": 7, "15": 6,
        "16": 5, "17": 4, "18": 3, "19": 2, "20": 1
      },
      'Winner Heavy': {
        "1": 100, "2": 50, "3": 25, "4": 15, "5": 10,
        "6": 8, "7": 6, "8": 5, "9": 4, "10": 3,
        "11": 2, "12": 1
      },
      'Top 3 Only': {
        "1": 10, "2": 5, "3": 3
      }
    };
  }

  // ==========================================================================
  // DIVISION MANAGEMENT
  // ==========================================================================

  /**
   * Calculate player's division based on handicap
   */
  calculateDivision(handicap, divisionDefs = this.currentConfig?.division_definitions) {
    if (!divisionDefs) return 'Open';

    for (const [division, range] of Object.entries(divisionDefs)) {
      if (range.includes('+')) {
        // Open-ended range like "29+"
        const min = parseInt(range);
        if (handicap >= min) return division;
      } else if (range.includes('-')) {
        // Closed range like "0-9"
        const [min, max] = range.split('-').map(x => parseInt(x));
        if (handicap >= min && handicap <= max) return division;
      }
    }

    return 'Open';
  }

  /**
   * Get all divisions for current configuration
   */
  getDivisions() {
    if (!this.currentConfig?.divisions_enabled) return ['Open'];
    return Object.keys(this.currentConfig.division_definitions || {});
  }

  // ==========================================================================
  // POINTS CALCULATION
  // ==========================================================================

  /**
   * Get points for a specific position
   */
  getPointsForPosition(position, pointSystem = this.currentConfig?.point_system) {
    if (!pointSystem) return 0;
    return pointSystem[position.toString()] || 0;
  }

  /**
   * Calculate points for all players in an event
   */
  async calculateEventPoints(eventId, eventScores) {
    try {
      // Get event details
      const { data: event, error: eventError } = await this.supabase
        .from('society_events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;

      // Get points config
      const organizerId = event.organizer_id;
      const seasonYear = new Date(event.date).getFullYear();
      const config = await this.getPointsConfig(organizerId, seasonYear);

      // Group scores by division
      const divisionScores = {};

      for (const score of eventScores) {
        // Calculate division
        let division = 'Open';
        if (config.divisions_enabled && event.division_mode !== 'none') {
          if (event.division_mode === 'auto') {
            division = this.calculateDivision(score.handicap, config.division_definitions);
          } else if (event.division_mode === 'manual' && score.division) {
            division = score.division;
          }
        }

        if (!divisionScores[division]) {
          divisionScores[division] = [];
        }

        divisionScores[division].push({
          ...score,
          division
        });
      }

      // Sort each division and assign positions/points
      const allResults = [];

      for (const [division, scores] of Object.entries(divisionScores)) {
        // Sort by score (highest Stableford points = best)
        scores.sort((a, b) => b.total_stableford - a.total_stableford);

        // Assign positions and points
        scores.forEach((score, index) => {
          const position = index + 1;
          const basePoints = this.getPointsForPosition(position, config.point_system);
          const multiplier = event.point_multiplier || 1.0;
          const pointsEarned = Math.round(basePoints * multiplier);

          allResults.push({
            event_id: eventId,
            player_id: score.player_id,
            player_name: score.player_name,
            division: division,
            position: position,
            score: score.total_stableford,
            score_type: 'stableford',
            points_earned: pointsEarned,
            status: 'completed',
            is_counted: event.counts_for_season !== false,
            event_date: event.date
          });
        });
      }

      return allResults;
    } catch (error) {
      console.error('Error calculating event points:', error);
      throw error;
    }
  }

  /**
   * Save event results and update season standings
   */
  async publishEventResults(eventId, eventScores) {
    try {
      // Calculate points
      const results = await this.calculateEventPoints(eventId, eventScores);

      // Insert event results
      const { error: insertError } = await this.supabase
        .from('event_results')
        .upsert(results, {
          onConflict: 'event_id,player_id,division'
        });

      if (insertError) throw insertError;

      // Update season standings using database function
      const { error: updateError } = await this.supabase
        .rpc('update_season_standings', { p_event_id: eventId });

      if (updateError) throw updateError;

      // Mark event results as published
      const { error: eventError } = await this.supabase
        .from('society_events')
        .update({
          results_published: true,
          results_published_at: new Date().toISOString()
        })
        .eq('id', eventId);

      if (eventError) throw eventError;

      return results;
    } catch (error) {
      console.error('Error publishing event results:', error);
      throw error;
    }
  }

  // ==========================================================================
  // STANDINGS & LEADERBOARDS
  // ==========================================================================

  /**
   * Get season standings for a specific division
   */
  async getSeasonStandings(organizerId, seasonYear = this.currentSeason, division = null) {
    try {
      let query = this.supabase
        .from('season_points')
        .select('*')
        .eq('organizer_id', organizerId)
        .eq('season_year', seasonYear)
        .order('total_points', { ascending: false })
        .order('wins', { ascending: false })
        .order('best_finish', { ascending: true });

      if (division) {
        query = query.eq('division', division);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Add rank
      this.standings = data.map((player, index) => ({
        ...player,
        rank: index + 1
      }));

      return this.standings;
    } catch (error) {
      console.error('Error getting season standings:', error);
      throw error;
    }
  }

  /**
   * Get player's season summary
   */
  async getPlayerSeasonSummary(playerId, organizerId, seasonYear = this.currentSeason) {
    try {
      // Get season points
      const { data: seasonData, error: seasonError } = await this.supabase
        .from('season_points')
        .select('*')
        .eq('player_id', playerId)
        .eq('organizer_id', organizerId)
        .eq('season_year', seasonYear)
        .maybeSingle();

      if (seasonError) throw seasonError;

      // Get all event results
      const { data: eventData, error: eventError } = await this.supabase
        .from('event_results')
        .select(`
          *,
          society_events!inner(name, date, course_name)
        `)
        .eq('player_id', playerId)
        .gte('event_date', `${seasonYear}-01-01`)
        .lte('event_date', `${seasonYear}-12-31`)
        .order('event_date', { ascending: false });

      if (eventError) throw eventError;

      return {
        season: seasonData,
        events: eventData
      };
    } catch (error) {
      console.error('Error getting player season summary:', error);
      throw error;
    }
  }

  /**
   * Get event results for a specific event
   */
  async getEventResults(eventId, division = null) {
    try {
      let query = this.supabase
        .from('event_results')
        .select('*')
        .eq('event_id', eventId)
        .order('position', { ascending: true });

      if (division) {
        query = query.eq('division', division);
      }

      const { data, error } = await query;

      if (error) throw error;

      this.eventResults = data;
      return data;
    } catch (error) {
      console.error('Error getting event results:', error);
      throw error;
    }
  }

  // ==========================================================================
  // UI HELPERS
  // ==========================================================================

  /**
   * Format standings for display
   */
  formatStandingsTable(standings) {
    return standings.map(player => {
      // Calculate average points per event
      const avgPoints = player.events_played > 0
        ? (player.total_points / player.events_played).toFixed(1)
        : '0.0';

      return {
        rank: player.rank,
        name: player.player_name,
        division: player.division || 'Open',
        points: player.total_points,
        events: player.events_played,
        wins: player.wins,
        top3: player.top_3_finishes,
        top5: player.top_5_finishes,
        avgPoints: avgPoints,
        bestFinish: player.best_finish || '-'
      };
    });
  }

  /**
   * Get rank change indicator
   */
  getRankChange(currentRank, previousRank) {
    if (!previousRank) return { change: 0, icon: '●', color: 'gray' };

    const diff = previousRank - currentRank;

    if (diff > 0) return { change: diff, icon: '▲', color: 'green' };
    if (diff < 0) return { change: Math.abs(diff), icon: '▼', color: 'red' };
    return { change: 0, icon: '●', color: 'gray' };
  }

  /**
   * Get position badge color
   */
  getPositionBadgeColor(position) {
    if (position === 1) return 'gold';
    if (position === 2) return 'silver';
    if (position === 3) return 'bronze';
    if (position <= 5) return 'blue';
    if (position <= 10) return 'green';
    return 'gray';
  }

  // ==========================================================================
  // STATS & ANALYTICS
  // ==========================================================================

  /**
   * Get season statistics
   */
  async getSeasonStats(organizerId, seasonYear = this.currentSeason) {
    try {
      const { data, error } = await this.supabase
        .from('season_points')
        .select('*')
        .eq('organizer_id', organizerId)
        .eq('season_year', seasonYear);

      if (error) throw error;

      const totalPlayers = data.length;
      const totalEvents = Math.max(...data.map(p => p.events_played), 0);
      const avgEventsPerPlayer = totalPlayers > 0
        ? (data.reduce((sum, p) => sum + p.events_played, 0) / totalPlayers).toFixed(1)
        : 0;
      const totalPointsAwarded = data.reduce((sum, p) => sum + p.total_points, 0);

      return {
        totalPlayers,
        totalEvents,
        avgEventsPerPlayer,
        totalPointsAwarded,
        activePlayers: data.filter(p => p.events_played >= 3).length
      };
    } catch (error) {
      console.error('Error getting season stats:', error);
      throw error;
    }
  }

  /**
   * Get projected champion (current leader)
   */
  getProjectedChampion(standings) {
    if (!standings || standings.length === 0) return null;
    return standings[0];
  }

  /**
   * Calculate points needed to reach position
   */
  calculatePointsNeeded(currentPoints, targetRank, standings) {
    if (!standings || targetRank >= standings.length) return null;

    const targetPlayer = standings[targetRank - 1];
    const pointsNeeded = targetPlayer.total_points - currentPoints + 1;

    return pointsNeeded > 0 ? pointsNeeded : 0;
  }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SeasonPointsManager;
}

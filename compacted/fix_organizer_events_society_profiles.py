#!/usr/bin/env python3
"""Fix getOrganizerEventsWithStats to fetch society profiles like getAllPublicEvents does"""

# Read the file
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the current parallel queries section (lines 31777-31806)
old_parallel_queries = '''        // Parallel queries for all events' data with error handling
        const [regsResult, waitlistResult] = await Promise.all([
            window.SupabaseDB.client
                .from('event_registrations')
                .select('event_id, want_transport, want_competition')
                .in('event_id', eventIds)
                .then(result => {
                    if (result.error) {
                        console.error('[SocietyGolfDB] ❌ Error loading registrations:');
                        console.error('  Error code:', result.error.code);
                        console.error('  Error message:', result.error.message);
                        console.error('  Error details:', result.error.details);
                        console.error('  Error hint:', result.error.hint);
                        console.error('  Full error:', result.error);
                        return { data: [], error: result.error };
                    }
                    return result;
                }),
            window.SupabaseDB.client
                .from('event_waitlist')
                .select('event_id')
                .in('event_id', eventIds)
                .then(result => {
                    if (result.error) {
                        console.error('[SocietyGolfDB] Error loading waitlist:', result.error);
                        return { data: [], error: result.error };
                    }
                    return result;
                })
        ]);'''

new_parallel_queries = '''        // Get organizer IDs to fetch society profiles
        const organizerIds = [...new Set(events.map(e => e.organizer_id).filter(id => id))];

        // Parallel queries for all events' data with error handling
        const [regsResult, waitlistResult, societyProfilesResult] = await Promise.all([
            window.SupabaseDB.client
                .from('event_registrations')
                .select('event_id, want_transport, want_competition')
                .in('event_id', eventIds)
                .then(result => {
                    if (result.error) {
                        console.error('[SocietyGolfDB] ❌ Error loading registrations:');
                        console.error('  Error code:', result.error.code);
                        console.error('  Error message:', result.error.message);
                        console.error('  Error details:', result.error.details);
                        console.error('  Error hint:', result.error.hint);
                        console.error('  Full error:', result.error);
                        return { data: [], error: result.error };
                    }
                    return result;
                }),
            window.SupabaseDB.client
                .from('event_waitlist')
                .select('event_id')
                .in('event_id', eventIds)
                .then(result => {
                    if (result.error) {
                        console.error('[SocietyGolfDB] Error loading waitlist:', result.error);
                        return { data: [], error: result.error };
                    }
                    return result;
                }),
            // Fetch society profiles (same as getAllPublicEvents)
            window.SupabaseDB.client
                .from('society_profiles')
                .select('organizer_id, society_name, society_logo')
                .in('organizer_id', organizerIds)
                .then(result => {
                    if (result.error) {
                        console.error('[SocietyGolfDB] Error loading society profiles:', result.error);
                        return { data: [], error: result.error };
                    }
                    return result;
                })
        ]);'''

# Replace parallel queries
if old_parallel_queries in content:
    content = content.replace(old_parallel_queries, new_parallel_queries)
    print("Updated parallel queries to fetch society profiles")
else:
    print("WARNING: Could not find parallel queries section")

# Now add society mapping before calculating stats
old_stats_section = '''        console.log('[SocietyGolfDB] Registrations loaded:', regsResult.data?.length || 0);
        console.log('[SocietyGolfDB] Waitlist loaded:', waitlistResult.data?.length || 0);

        // Calculate stats per event
        const eventsWithStats = events.map(event => {'''

new_stats_section = '''        console.log('[SocietyGolfDB] Registrations loaded:', regsResult.data?.length || 0);
        console.log('[SocietyGolfDB] Waitlist loaded:', waitlistResult.data?.length || 0);

        // Create map of organizer_id to society profile (same as getAllPublicEvents)
        const societyMap = {};
        if (societyProfilesResult.data) {
            societyProfilesResult.data.forEach(s => {
                societyMap[s.organizer_id] = s;
            });
        }

        // Calculate stats per event
        const eventsWithStats = events.map(event => {
            const society = societyMap[event.organizer_id];'''

# Replace stats section
if old_stats_section in content:
    content = content.replace(old_stats_section, new_stats_section)
    print("Added society profile mapping")
else:
    print("WARNING: Could not find stats section")

# Now add societyName and societyLogo to the camelEvent object
old_camel_event = '''            // Convert snake_case to camelCase
            const camelEvent = {
                id: event.id,
                name: event.name,
                date: event.date,
                startTime: event.start_time,
                cutoff: event.cutoff,
                maxPlayers: event.max_players,
                courseName: event.course_name,
                eventFormat: event.event_format,
                baseFee: event.base_fee || 0,
                cartFee: event.cart_fee || 0,
                caddyFee: event.caddy_fee || 0,
                transportFee: event.transport_fee || 0,
                competitionFee: event.competition_fee || 0,
                autoWaitlist: event.auto_waitlist,
                notes: event.notes,
                organizerId: event.organizer_id,
                organizerName: event.organizer_name,'''

new_camel_event = '''            // Convert snake_case to camelCase
            const camelEvent = {
                id: event.id,
                name: event.name,
                date: event.date,
                startTime: event.start_time,
                cutoff: event.cutoff,
                maxPlayers: event.max_players,
                courseName: event.course_name,
                eventFormat: event.event_format,
                baseFee: event.base_fee || 0,
                cartFee: event.cart_fee || 0,
                caddyFee: event.caddy_fee || 0,
                transportFee: event.transport_fee || 0,
                competitionFee: event.competition_fee || 0,
                autoWaitlist: event.auto_waitlist,
                notes: event.notes,
                organizerId: event.organizer_id,
                organizerName: event.organizer_name,
                societyName: society?.society_name || event.organizer_name,
                societyLogo: society?.society_logo || '','''

# Replace camelEvent object
if old_camel_event in content:
    content = content.replace(old_camel_event, new_camel_event)
    print("Added societyName and societyLogo to event objects")
else:
    print("WARNING: Could not find camelEvent object")

# Write back
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("\nFixed getOrganizerEventsWithStats to match getAllPublicEvents pattern")
print("Now organizer dashboard will automatically show society logos from database")

// Multi-purpose admin data fix function
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type, Authorization" } });
  }

  try {
    const body = await req.json();
    const action = body.action;

    if (action === "update_trgg_handicaps") {
      const handicaps: Record<string, number | string> = body.handicaps;

      // Get all user profiles
      const { data: profiles, error: pErr } = await supabase
        .from('user_profiles')
        .select('line_user_id, name, trgg_handicap, profile_data');
      if (pErr) return json(500, { error: pErr.message });

      const { data: trggMap } = await supabase
        .from('trgg_user_map')
        .select('line_user_id, trgg_name, trgg_handicap');

      let updated = 0, notFound = 0;
      const notFoundNames: string[] = [];
      const matchedSample: any[] = [];

      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Common name variants: Pete/Peter, Bill/William, Bob/Robert, etc.
      const nameVariants: Record<string, string[]> = {
        'pete': ['peter','petey'], 'peter': ['pete','petey'],
        'bill': ['william','billy','will'], 'william': ['bill','billy','will'],
        'bob': ['robert','rob','bobby'], 'robert': ['bob','rob','bobby'],
        'jim': ['james','jimmy'], 'james': ['jim','jimmy'],
        'mike': ['michael','mick'], 'michael': ['mike','mick'], 'mick': ['mike','michael'],
        'dave': ['david'], 'david': ['dave'],
        'tom': ['thomas','tommy'], 'thomas': ['tom','tommy'],
        'dick': ['richard','rick'], 'richard': ['dick','rick'], 'rick': ['richard','dick'],
        'steve': ['steven','stephen'], 'steven': ['steve','stephen'], 'stephen': ['steve','steven'],
        'ed': ['edward','eddie','ted'], 'edward': ['ed','eddie','ted'],
        'joe': ['joseph','joey'], 'joseph': ['joe','joey'],
        'dan': ['daniel','danny'], 'daniel': ['dan','danny'],
        'al': ['alan','allen','albert'], 'alan': ['al','allen'], 'allen': ['al','alan'],
        'chris': ['christopher'], 'christopher': ['chris'],
        'matt': ['matthew'], 'matthew': ['matt'],
        'nick': ['nicholas'], 'nicholas': ['nick'],
        'tony': ['anthony'], 'anthony': ['tony'],
        'don': ['donald'], 'donald': ['don'],
        'ron': ['ronald'], 'ronald': ['ron'],
        'ken': ['kenneth'], 'kenneth': ['ken'],
        'ben': ['benjamin'], 'benjamin': ['ben'],
        'jeff': ['jeffrey','geoffrey','geoff'], 'geoff': ['geoffrey','jeff'], 'geoffrey': ['geoff','jeff'],
        'greg': ['gregory'], 'gregory': ['greg'],
        'doug': ['douglas'], 'douglas': ['doug'],
        'fred': ['frederick'], 'frederick': ['fred'],
        'brad': ['bradley'], 'bradley': ['brad'],
        'pat': ['patrick'], 'patrick': ['pat'],
        'alex': ['alexander'], 'alexander': ['alex'],
        'andy': ['andrew'], 'andrew': ['andy'],
        'len': ['leonard'], 'leonard': ['len'],
        'larry': ['lawrence'], 'lawrence': ['larry'],
        'gary': ['gareth'], 'gareth': ['gary'],
        'jerry': ['gerald','gerard'], 'gerald': ['jerry','gerard'],
        'willy': ['william','will'], 'will': ['william','willy','bill'],
      };

      // Build profile lookup with variant names
      const profilesByNorm: Record<string, any> = {};
      for (const p of (profiles || [])) {
        if (!p.name) continue;
        profilesByNorm[normalize(p.name)] = p;
        const parts = p.name.split(/[\s,]+/).filter(Boolean);
        if (parts.length >= 2) {
          const last = parts.slice(-1)[0].toLowerCase();
          const first = parts[0].toLowerCase();
          profilesByNorm[normalize(parts.slice(-1)[0] + parts[0])] = p;
          profilesByNorm[normalize(parts[0] + parts.slice(-1)[0])] = p;
          // Add variant name combos
          const firstVariants = nameVariants[first] || [];
          for (const v of firstVariants) {
            profilesByNorm[normalize(v + last)] = p;
            profilesByNorm[normalize(last + v)] = p;
          }
        }
      }

      // TRGG map lookup
      const trggMapByName: Record<string, string> = {};
      for (const t of (trggMap || [])) {
        if (t.trgg_name && t.line_user_id) trggMapByName[normalize(t.trgg_name)] = t.line_user_id;
      }

      for (const [name, rawHcp] of Object.entries(handicaps)) {
        const hcpStr = String(rawHcp);
        const hcpValue = hcpStr.startsWith('+') ? -Math.abs(parseFloat(hcpStr)) : parseFloat(hcpStr);
        if (isNaN(hcpValue)) continue;

        const normName = normalize(name);

        // Match profile - try exact, then variants
        let profile = profilesByNorm[normName];

        // Try name variants for the input name
        if (!profile) {
          const inputParts = name.split(/[\s,]+/).filter(Boolean);
          if (inputParts.length >= 2) {
            const inputFirst = inputParts[inputParts.length > 2 ? 1 : 0].toLowerCase();
            const inputLast = inputParts[0].toLowerCase();
            const variants = nameVariants[inputFirst] || [];
            for (const v of variants) {
              profile = profilesByNorm[normalize(v + inputLast)] || profilesByNorm[normalize(inputLast + v)];
              if (profile) break;
            }
          }
        }

        // Try last name only match (if unique last name in system)
        if (!profile) {
          const inputParts = name.split(/[\s,]+/).filter(Boolean);
          const lastName = inputParts[0].toLowerCase(); // "Last, First" format
          if (lastName.length >= 3) {
            const lastNameMatches = (profiles || []).filter(p => {
              if (!p.name) return false;
              const pParts = p.name.split(/[\s,]+/).filter(Boolean);
              return pParts.some(part => part.toLowerCase() === lastName);
            });
            if (lastNameMatches.length === 1) {
              profile = lastNameMatches[0];
            }
          }
        }

        // Try TRGG map
        if (!profile && trggMapByName[normName]) {
          profile = (profiles || []).find(p => p.line_user_id === trggMapByName[normName]);
        }

        if (profile) {
          // Update trgg_handicap AND handicap_index + profile_data on user_profiles
          const displayHcp = hcpValue < 0 ? `+${Math.abs(hcpValue).toFixed(1)}` : hcpValue.toFixed(1);
          const profileData = profile.profile_data || {};
          profileData.handicap = displayHcp;
          if (profileData.golfInfo) profileData.golfInfo.handicap = displayHcp;

          await supabase.from('user_profiles')
            .update({ trgg_handicap: hcpValue, handicap_index: hcpValue, profile_data: profileData })
            .eq('line_user_id', profile.line_user_id);

          // Also update trgg_user_map
          await supabase.from('trgg_user_map')
            .update({ trgg_handicap: hcpValue })
            .eq('line_user_id', profile.line_user_id);

          updated++;
          if (matchedSample.length < 30) matchedSample.push({ trgg: name, matched: profile.name, hcp: hcpValue });
        } else {
          // Store unmatched names in trgg_pending for future matching
          await supabase.from('trgg_pending')
            .upsert({ trgg_name: name, trgg_handicap: hcpValue }, { onConflict: 'trgg_name' });
          notFound++;
          notFoundNames.push(`${name} (${hcpStr})`);
        }
      }

      return json(200, { total: Object.keys(handicaps).length, updated, notFound, notFoundNames, matchedSample });
    }

    if (action === "update_society_handicaps") {
      // Bulk update society_handicaps table to match trgg_handicap values
      const { society_id } = body;
      // Get all profiles with trgg_handicap set
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('line_user_id, name, trgg_handicap')
        .not('trgg_handicap', 'is', null);

      let updated = 0;
      for (const p of (profiles || [])) {
        const { error } = await supabase
          .from('society_handicaps')
          .update({ handicap_index: p.trgg_handicap })
          .eq('golfer_id', p.line_user_id)
          .eq('society_id', society_id);
        if (!error) updated++;
      }
      return json(200, { updated, total: (profiles || []).length });
    }

    if (action === "sync_universal_handicaps") {
      // Recalculate universal handicap for all players from their rounds
      // and update user_profiles.handicap_index + profile_data.handicap
      const { data: players } = await supabase.from('society_handicaps')
        .select('golfer_id, handicap_index').is('society_id', null);

      let updated = 0;
      for (const p of (players || [])) {
        const hcp = p.handicap_index;
        if (hcp === null || hcp === undefined) continue;
        const displayHcp = hcp < 0 ? `+${Math.abs(hcp).toFixed(1)}` : hcp.toFixed(1);

        // Update user_profiles
        const { data: profile } = await supabase.from('user_profiles')
          .select('profile_data').eq('line_user_id', p.golfer_id).maybeSingle();

        if (profile) {
          const pd = profile.profile_data || {};
          pd.handicap = displayHcp;
          if (pd.golfInfo) pd.golfInfo.handicap = displayHcp;

          await supabase.from('user_profiles').update({
            handicap_index: hcp,
            profile_data: pd
          }).eq('line_user_id', p.golfer_id);
          updated++;
        }
      }
      return json(200, { updated, total: (players || []).length });
    }

    if (action === "update_user_handicap") {
      const { user_id, handicap_index, display_handicap } = body;
      const { data: profile } = await supabase.from('user_profiles')
        .select('profile_data').eq('line_user_id', user_id).maybeSingle();
      if (profile) {
        const pd = profile.profile_data || {};
        pd.handicap = display_handicap;
        if (pd.golfInfo) pd.golfInfo.handicap = display_handicap;
        const { error } = await supabase.from('user_profiles').update({
          handicap_index: handicap_index,
          profile_data: pd
        }).eq('line_user_id', user_id);
        return json(200, { error: error?.message || 'ok' });
      }
      return json(400, { error: 'Profile not found' });
    }

    if (action === "update_round") {
      const { round_id, updates } = body;
      const { error } = await supabase.from('rounds').update(updates).eq('id', round_id);
      return json(200, { error: error?.message || 'ok' });
    }

    if (action === "update_round_holes_stableford") {
      const { round_id, team_hcp } = body;
      // Fetch holes, recalculate stableford with team handicap
      const { data: holes } = await supabase.from('round_holes')
        .select('id, hole_number, gross_score, par, stroke_index')
        .eq('round_id', round_id).order('hole_number');
      if (!holes) return json(400, { error: 'No holes found' });

      let totalStb = 0;
      for (const h of holes) {
        let strokes = 0;
        if (team_hcp > 0) {
          const full = Math.floor(team_hcp / 18);
          const remainder = team_hcp % 18;
          strokes = full + (h.stroke_index <= remainder ? 1 : 0);
        } else if (team_hcp < 0) {
          const abs_hcp = Math.abs(team_hcp);
          const full = Math.floor(abs_hcp / 18);
          const remainder = abs_hcp % 18;
          strokes = -(full + (h.stroke_index <= remainder ? 1 : 0));
        }
        const net = h.gross_score - strokes;
        const diff = net - h.par;
        const pts = diff <= -2 ? 4 : diff === -1 ? 3 : diff === 0 ? 2 : diff === 1 ? 1 : 0;
        totalStb += pts;
        await supabase.from('round_holes').update({ stableford_points: pts, net_score: net, handicap_strokes: strokes }).eq('id', h.id);
      }
      // Update round total
      await supabase.from('rounds').update({ total_stableford: totalStb, handicap_used: team_hcp }).eq('id', round_id);
      return json(200, { round_id, team_hcp, total_stableford: totalStb, holes_updated: holes.length });
    }

    if (action === "update_course_holes") {
      const { course_id, tee_marker, holes } = body;
      const results = [];
      for (const h of holes) {
        const { error } = await supabase.from('course_holes')
          .update({ par: h.par, stroke_index: h.si, yardage: h.yardage })
          .eq('course_id', course_id)
          .eq('hole_number', h.hole)
          .eq('tee_marker', tee_marker);
        results.push({ hole: h.hole, error: error?.message || 'ok' });
      }
      return json(200, results);
    }

    return json(400, { error: "Unknown action" });
  } catch (err: any) {
    return json(500, { error: err.message });
  }
});

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

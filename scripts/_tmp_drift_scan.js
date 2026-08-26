const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pyeeplwsnupmhgbguwqs.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.yz1WTV7h_qpaJu3kQ0pEKHMF3rw-_fSLmdne_3Rb6Yc');

async function main() {
  const { data: all } = await supabase.from('society_handicaps')
    .select('golfer_id, society_id, handicap_index, calculation_method, updated_at')
    .limit(5000);
  const uni = {}, locked = {};
  for (const r of (all || [])) {
    if (r.society_id === null && String(r.calculation_method).toUpperCase() === 'ANCHORED') uni[r.golfer_id] = r;
    if (r.society_id !== null) {
      const m = String(r.calculation_method || '').toUpperCase();
      if (m === 'MANUAL' || m.startsWith('TRGG') || m.includes('MASTERSCORE')) locked[r.golfer_id] = r;
    }
  }
  const drifted = [];
  for (const gid of Object.keys(uni)) {
    if (locked[gid] && locked[gid].handicap_index !== null && uni[gid].handicap_index !== null) {
      const d = Math.abs(uni[gid].handicap_index - locked[gid].handicap_index);
      if (d >= 1.5) drifted.push({ gid, universal: uni[gid].handicap_index, locked: locked[gid].handicap_index, diff: +d.toFixed(1) });
    }
  }
  drifted.sort((a, b) => b.diff - a.diff);
  console.log('drifted (|universal ANCHORED - locked society| >= 1.5):', drifted.length);
  for (const d of drifted.slice(0, 20)) {
    const { data: p } = await supabase.from('user_profiles').select('name, display_name').eq('line_user_id', d.gid).single();
    console.log((p?.name || p?.display_name || '?'), '|', d.gid, '| universal:', d.universal, '| locked:', d.locked, '| diff:', d.diff);
  }
}
main().catch(e => console.log('FATAL', e));

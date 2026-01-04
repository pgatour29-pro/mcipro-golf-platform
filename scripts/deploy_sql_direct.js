const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://pyeeplwsnupmhgbguwqs.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.yz1WTV7h_qpaJu3kQ0pEKHMF3rw-_fSLmdne_3Rb6Yc';

async function deploySql() {
  console.log('=== DEPLOYING WHS SQL FUNCTION ===\n');

  // Read the SQL file
  const sqlPath = path.join(__dirname, '..', 'sql', 'whs_8of20_handicap_function.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Use the Supabase REST API to execute SQL via the pg_query endpoint
  // This requires using the Management API or direct database connection

  // For now, let's break down the SQL into individual function definitions
  // and execute them one at a time

  const statements = [
    // 1. Drop existing function
    `DROP FUNCTION IF EXISTS calculate_whs_handicap_index(TEXT);`,

    // 2. Create main WHS calculation function
    `CREATE OR REPLACE FUNCTION calculate_whs_handicap_index(
      p_golfer_id TEXT,
      OUT new_handicap_index DECIMAL,
      OUT rounds_used INTEGER,
      OUT all_differentials JSONB,
      OUT best_differentials JSONB
    ) AS $FUNC$
    DECLARE
      v_round RECORD;
      v_differentials DECIMAL[] := ARRAY[]::DECIMAL[];
      v_course_rating DECIMAL;
      v_slope_rating DECIMAL;
      v_differential DECIMAL;
      v_num_rounds INTEGER;
      v_num_to_use INTEGER;
      v_adjustment DECIMAL := 0;
      v_avg DECIMAL;
      v_best_diffs DECIMAL[];
    BEGIN
      FOR v_round IN
        SELECT r.id, r.total_gross, r.course_id, r.tee_marker, r.completed_at
        FROM public.rounds r
        WHERE r.golfer_id = p_golfer_id
          AND r.status = 'completed'
          AND r.total_gross IS NOT NULL
          AND r.tee_marker IS NOT NULL
        ORDER BY r.completed_at DESC
        LIMIT 20
      LOOP
        SELECT
          COALESCE(
            (SELECT (t->>'rating')::DECIMAL
             FROM courses c, jsonb_array_elements(c.tees) AS t
             WHERE c.id = v_round.course_id
               AND LOWER(t->>'name') = LOWER(v_round.tee_marker)
             LIMIT 1),
            72.0
          ),
          COALESCE(
            (SELECT (t->>'slope')::DECIMAL
             FROM courses c, jsonb_array_elements(c.tees) AS t
             WHERE c.id = v_round.course_id
               AND LOWER(t->>'name') = LOWER(v_round.tee_marker)
             LIMIT 1),
            113.0
          )
        INTO v_course_rating, v_slope_rating;

        v_differential := (v_round.total_gross - v_course_rating) * 113.0 / v_slope_rating;
        v_differentials := array_append(v_differentials, v_differential);
      END LOOP;

      v_num_rounds := array_length(v_differentials, 1);

      IF v_num_rounds IS NULL OR v_num_rounds = 0 THEN
        new_handicap_index := NULL;
        rounds_used := 0;
        all_differentials := '[]'::JSONB;
        best_differentials := '[]'::JSONB;
        RETURN;
      END IF;

      all_differentials := to_jsonb(v_differentials);
      rounds_used := v_num_rounds;

      CASE
        WHEN v_num_rounds >= 20 THEN v_num_to_use := 8; v_adjustment := 0;
        WHEN v_num_rounds = 19 THEN v_num_to_use := 7; v_adjustment := 0;
        WHEN v_num_rounds = 18 THEN v_num_to_use := 7; v_adjustment := 0;
        WHEN v_num_rounds = 17 THEN v_num_to_use := 6; v_adjustment := 0;
        WHEN v_num_rounds = 16 THEN v_num_to_use := 6; v_adjustment := 0;
        WHEN v_num_rounds = 15 THEN v_num_to_use := 5; v_adjustment := 0;
        WHEN v_num_rounds = 14 THEN v_num_to_use := 5; v_adjustment := 0;
        WHEN v_num_rounds = 13 THEN v_num_to_use := 5; v_adjustment := 0;
        WHEN v_num_rounds = 12 THEN v_num_to_use := 4; v_adjustment := 0;
        WHEN v_num_rounds = 11 THEN v_num_to_use := 4; v_adjustment := 0;
        WHEN v_num_rounds = 10 THEN v_num_to_use := 4; v_adjustment := 0;
        WHEN v_num_rounds = 9 THEN v_num_to_use := 3; v_adjustment := 0;
        WHEN v_num_rounds = 8 THEN v_num_to_use := 3; v_adjustment := 0;
        WHEN v_num_rounds = 7 THEN v_num_to_use := 2; v_adjustment := 0;
        WHEN v_num_rounds = 6 THEN v_num_to_use := 2; v_adjustment := -1.0;
        WHEN v_num_rounds = 5 THEN v_num_to_use := 1; v_adjustment := 0;
        WHEN v_num_rounds = 4 THEN v_num_to_use := 1; v_adjustment := -1.0;
        WHEN v_num_rounds = 3 THEN v_num_to_use := 1; v_adjustment := -2.0;
        ELSE v_num_to_use := 1; v_adjustment := -2.0;
      END CASE;

      SELECT ARRAY(
        SELECT unnest(v_differentials) AS diff ORDER BY diff ASC LIMIT v_num_to_use
      ) INTO v_best_diffs;

      best_differentials := to_jsonb(v_best_diffs);

      SELECT AVG(d) INTO v_avg FROM unnest(v_best_diffs) AS d;

      new_handicap_index := ROUND((v_avg * 0.96) + v_adjustment, 1);

      IF new_handicap_index < -10.0 THEN new_handicap_index := -10.0;
      ELSIF new_handicap_index > 54.0 THEN new_handicap_index := 54.0;
      END IF;
    END;
    $FUNC$ LANGUAGE plpgsql STABLE;`,

    // 3. Grant permissions
    `GRANT EXECUTE ON FUNCTION calculate_whs_handicap_index(TEXT) TO authenticated;`,
    `GRANT EXECUTE ON FUNCTION calculate_whs_handicap_index(TEXT) TO service_role;`
  ];

  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // Test the function by calling it
  console.log('Testing if function already exists...');
  const { data: testData, error: testError } = await supabase.rpc('calculate_whs_handicap_index', {
    p_golfer_id: 'U2b6d976f19bca4b2f4374ae0e10ed873'
  });

  if (testError && testError.message.includes('Could not find the function')) {
    console.log('Function does not exist. Need to deploy via Supabase Dashboard.\n');
    console.log('=== MANUAL DEPLOYMENT REQUIRED ===');
    console.log('1. Go to: https://supabase.com/dashboard/project/pyeeplwsnupmhgbguwqs/sql/new');
    console.log('2. Copy and paste the SQL below:');
    console.log('---');
    console.log(sql);
    console.log('---');
    console.log('3. Click "Run"');
  } else if (testError) {
    console.log('Error testing function:', testError.message);
  } else {
    console.log('Function exists! Result:', testData);
  }
}

deploySql().catch(console.error);

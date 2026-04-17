#!/usr/bin/env node
// TRGG Handicap Sync - GitHub Actions script
// Uses Puppeteer to bypass Cloudflare, scrapes handicap table,
// fuzzy-matches against MyCaddiPro user_profiles, updates handicaps.

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TRGG_PASSWORD = process.env.TRGG_PASSWORD || 'golfer';
const TRGG_CWID = process.env.TRGG_CWID || '103464';

const ENTRY_URL = `https://www.masterscoreboard.co.uk/SocietyIndex.php?CWID=${TRGG_CWID}`;
const HCP_URL = `https://www.masterscoreboard.co.uk/results/HandicapList.php?CWID=${TRGG_CWID}`;

const AUTO_THRESHOLD = 0.92;
const SUGGEST_THRESHOLD = 0.75;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function normalizeName(input) {
  let s = input;
  if (s.includes(',')) {
    const [last, ...rest] = s.split(',');
    s = rest.join(',').trim() + ' ' + last.trim();
  }
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

async function scrapeHandicaps() {
  console.log('[TRGG] Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

    // Step 1: Go to entry page (may have Cloudflare challenge)
    console.log('[TRGG] Navigating to entry page...');
    await page.goto(ENTRY_URL, { waitUntil: 'networkidle2', timeout: 90000 });

    // Wait for Cloudflare challenge to resolve (up to 60s with retries)
    console.log('[TRGG] Waiting for Cloudflare challenge to resolve...');
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await page.waitForFunction(() => {
          return !document.title.includes('Just a moment') &&
                 !document.title.includes('Checking') &&
                 !document.title.includes('Attention');
        }, { timeout: 20000 });
        console.log('[TRGG] Cloudflare challenge resolved');
        break;
      } catch {
        if (attempt < 2) {
          console.log(`[TRGG] Challenge still active, waiting (attempt ${attempt + 2}/3)...`);
          await new Promise(r => setTimeout(r, 10000));
          // Reload to retry
          await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
        } else {
          console.log('[TRGG] WARNING: Cloudflare challenge did not resolve after 3 attempts');
          const title = await page.title();
          const html = await page.content();
          console.log('[TRGG] Page title:', title);
          console.log('[TRGG] Page snippet:', html.slice(0, 500));
          throw new Error('Cloudflare challenge could not be resolved. Page title: ' + title);
        }
      }
    }

    // Step 2: Check for password form and submit
    const hasPasswordForm = await page.$('input[type="password"]');
    if (hasPasswordForm) {
      console.log('[TRGG] Password form found, logging in...');
      await page.type('input[type="password"]', TRGG_PASSWORD);

      // Find and click the submit button
      const submitBtn = await page.$('input[type="submit"], button[type="submit"]');
      if (submitBtn) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
          submitBtn.click()
        ]);
      } else {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
          page.keyboard.press('Enter')
        ]);
      }
      console.log('[TRGG] Logged in successfully');
    } else {
      console.log('[TRGG] No password form found');
    }

    // Step 3: Navigate to handicap list
    console.log('[TRGG] Navigating to handicap list...');
    await page.goto(HCP_URL, { waitUntil: 'networkidle2', timeout: 30000 });

    // Step 4: Parse the table
    console.log('[TRGG] Parsing handicap table...');
    const rows = await page.evaluate(() => {
      const results = [];
      const tables = document.querySelectorAll('table');
      for (const table of tables) {
        const headers = Array.from(table.querySelectorAll('th, tr:first-child td'))
          .map(c => c.textContent.trim().toLowerCase());
        const headerText = headers.join('|');
        if (!headerText.includes('handicap') && !headerText.includes('hcp') && !headerText.includes('hi')) continue;

        const nameIdx = headers.findIndex(h => h.includes('player') || h.includes('name') || h.includes('member'));
        const hcpIdx = headers.findIndex(h => h === 'handicap' || h.includes('handicap') || h.includes('hcp') || h === 'hi');
        if (nameIdx === -1 || hcpIdx === -1) continue;

        const trs = Array.from(table.querySelectorAll('tr')).slice(1);
        for (const tr of trs) {
          const cells = Array.from(tr.querySelectorAll('td'));
          if (cells.length <= Math.max(nameIdx, hcpIdx)) continue;
          const name = (cells[nameIdx]?.textContent || '').trim();
          const hcpText = (cells[hcpIdx]?.textContent || '').trim();
          const hcp = parseFloat(hcpText.replace(/[^0-9.\-]/g, ''));
          if (name && !isNaN(hcp)) results.push({ name, handicap: hcp });
        }
        if (results.length > 0) break;
      }
      return results;
    });

    console.log(`[TRGG] Parsed ${rows.length} rows`);
    return rows;
  } finally {
    await browser.close();
  }
}

async function processRows(rows, runId) {
  let matched = 0, suggested = 0, review = 0, updated = 0;

  // Get existing mappings
  const { data: maps } = await supabase.from('trgg_user_map').select('trgg_name_norm, profile_id');
  const mapLookup = new Map((maps || []).map(m => [m.trgg_name_norm, m.profile_id]));

  for (const row of rows) {
    const norm = normalizeName(row.name);

    // Check existing mapping
    const profileId = mapLookup.get(norm);
    if (profileId) {
      const { error } = await supabase.from('user_profiles').update({
        trgg_handicap: row.handicap, universal_handicap: row.handicap
      }).eq('line_user_id', profileId);
      if (!error) {
        updated++;
        matched++;
        await supabase.from('trgg_user_map').update({
          last_handicap: row.handicap, last_synced_at: new Date().toISOString()
        }).eq('profile_id', profileId);
      }
      continue;
    }

    // Fuzzy match
    const { data: match } = await supabase.rpc('trgg_find_best_match', { search_name: norm });
    const best = match?.[0];

    if (best && best.similarity >= AUTO_THRESHOLD) {
      await supabase.from('trgg_user_map').insert({
        trgg_name: row.name, trgg_name_norm: norm, profile_id: best.id,
        last_handicap: row.handicap, last_synced_at: new Date().toISOString()
      });
      await supabase.from('user_profiles').update({
        trgg_handicap: row.handicap, universal_handicap: row.handicap
      }).eq('line_user_id', best.id);
      matched++;
      updated++;
      continue;
    }

    // Queue for review
    const { error: pendErr } = await supabase.from('trgg_pending_matches').upsert({
      sync_run_id: runId, trgg_name: row.name, trgg_name_norm: norm,
      trgg_handicap: row.handicap,
      suggested_profile_id: best?.similarity >= SUGGEST_THRESHOLD ? best.id : null,
      suggested_name: best?.similarity >= SUGGEST_THRESHOLD ? best.full_name : null,
      similarity: best?.similarity ?? null, status: 'pending'
    }, { onConflict: 'trgg_name_norm', ignoreDuplicates: false });

    if (!pendErr) {
      if (best?.similarity >= SUGGEST_THRESHOLD) suggested++;
      else review++;
    }
  }

  return { matched, suggested, review, updated };
}

async function main() {
  console.log('[TRGG] Starting handicap sync...');

  // Create sync run
  const { data: run, error: runErr } = await supabase
    .from('trgg_sync_runs')
    .insert({ status: 'running', source: 'scrape' })
    .select().single();

  if (runErr || !run) {
    console.error('[TRGG] Failed to create sync run:', runErr);
    process.exit(1);
  }

  try {
    const rows = await scrapeHandicaps();

    if (rows.length === 0) {
      throw new Error('Parsed 0 rows from handicap table');
    }

    const result = await processRows(rows, run.id);

    await supabase.from('trgg_sync_runs').update({
      status: result.review > 0 ? 'partial' : 'success',
      finished_at: new Date().toISOString(),
      rows_fetched: rows.length,
      rows_matched: result.matched,
      rows_suggested: result.suggested,
      rows_review: result.review,
      rows_updated: result.updated,
      raw_snapshot: { rows }
    }).eq('id', run.id);

    console.log(`[TRGG] Sync complete: ${rows.length} fetched, ${result.matched} matched, ${result.updated} updated, ${result.suggested + result.review} need review`);
  } catch (err) {
    console.error('[TRGG] Sync failed:', err.message);
    await supabase.from('trgg_sync_runs').update({
      status: 'failed',
      finished_at: new Date().toISOString(),
      error_message: err.message
    }).eq('id', run.id);
    process.exit(1);
  }
}

main();

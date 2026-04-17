// Supabase Edge Function: sync-trgg-handicaps
// Runs weekly via pg_cron. Logs in to masterscoreboard.co.uk with a shared
// society password, fetches the TRGG handicap list, and either updates
// handicaps (for confirmed mappings) or queues unmatched rows for review.
//
// Adapted for MyCaddiPro schema:
//   - Table: user_profiles (not profiles)
//   - PK: line_user_id (text, not uuid)
//   - Name column: name (not full_name)
//   - Writes ONLY trgg_handicap + universal_handicap
//
// Required env vars (set via `supabase secrets set`):
//   TRGG_PASSWORD        — the society password
//   TRGG_CWID            — club/society ID (from URL: CWID=103464)
//
// Deploy: supabase functions deploy sync-trgg-handicaps --no-verify-jwt

// deno-lint-ignore-file no-explicit-any
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { DOMParser, Element } from "https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts";

// ----- Config ---------------------------------------------------------------

const BASE = "https://www.masterscoreboard.co.uk";
const TRGG_CWID = Deno.env.get("TRGG_CWID") ?? "103464";
const TRGG_PASSWORD = Deno.env.get("TRGG_PASSWORD") ?? "";
const TRGG_ENTRY_URL = `${BASE}/SocietyIndex.php?CWID=${TRGG_CWID}`;

const PROFILES_TABLE    = "user_profiles";
const PROFILE_PK        = "line_user_id";
const TRGG_HCP_COL      = "trgg_handicap";
const UNIVERSAL_HCP_COL = "universal_handicap";

const AUTO_APPLY_THRESHOLD = 0.92;
const SUGGEST_THRESHOLD    = 0.75;

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept":
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif," +
    "image/webp,*/*;q=0.8",
  "Accept-Language": "en-GB,en;q=0.9",
};

// ----- Types ----------------------------------------------------------------

interface TrggRow {
  name: string;
  handicap: number;
}

interface SyncResult {
  run_id: string;
  rows_fetched: number;
  rows_matched: number;
  rows_suggested: number;
  rows_review: number;
  rows_updated: number;
  status: "success" | "partial" | "failed";
}

interface FetchDebug {
  step: string;
  status?: number;
  url?: string;
  snippet?: string;
  form_action?: string;
  form_fields?: string[];
  password_field?: string;
}

// ----- Entry point ----------------------------------------------------------

Deno.serve(async (_req) => {
  if (!TRGG_PASSWORD) {
    return json(500, { error: "TRGG_PASSWORD secret not set" });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: run, error: runErr } = await supabase
    .from("trgg_sync_runs")
    .insert({ status: "running", source: "scrape" })
    .select()
    .single();

  if (runErr || !run) {
    return json(500, { error: "Could not create sync run", detail: runErr });
  }

  try {
    const { rows, debug } = await fetchAndParseTrgg();

    if (rows.length === 0) {
      await supabase
        .from("trgg_sync_runs")
        .update({ raw_snapshot: { debug } })
        .eq("id", run.id);
      throw new Error(
        "Parsed 0 rows — check trgg_sync_runs.raw_snapshot for the HTML dump. " +
        "Likely login flow or table markup needs adjustment.",
      );
    }

    const result = await processRows(supabase, run.id, rows);

    await supabase
      .from("trgg_sync_runs")
      .update({
        status: result.rows_review > 0 ? "partial" : "success",
        finished_at: new Date().toISOString(),
        rows_fetched: result.rows_fetched,
        rows_matched: result.rows_matched,
        rows_suggested: result.rows_suggested,
        rows_review: result.rows_review,
        rows_updated: result.rows_updated,
        raw_snapshot: { rows, debug },
      })
      .eq("id", run.id);

    return json(200, { run_id: run.id, ...result });
  } catch (err: any) {
    await supabase
      .from("trgg_sync_runs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        error_message: String(err?.message ?? err),
      })
      .eq("id", run.id);
    return json(500, { run_id: run.id, error: String(err?.message ?? err) });
  }
});

// ----- Fetch + login + parse ------------------------------------------------

async function fetchAndParseTrgg(): Promise<{ rows: TrggRow[]; debug: FetchDebug[] }> {
  const jar = new CookieJar();
  const debug: FetchDebug[] = [];

  const r1 = await fetchWithJar(TRGG_ENTRY_URL, jar);
  const html1 = await r1.text();
  debug.push({
    step: "entry",
    status: r1.status,
    url: r1.url,
    snippet: html1.slice(0, 800),
  });
  if (!r1.ok) throw new Error(`Entry fetch failed: HTTP ${r1.status}`);

  let currentHtml = html1;
  let currentUrl = r1.url;
  const form = detectPasswordForm(currentHtml);

  if (form) {
    debug.push({
      step: "found_login_form",
      form_action: form.action,
      form_fields: Object.keys(form.fields),
      password_field: form.passwordField,
    });

    const body = new URLSearchParams();
    for (const [k, v] of Object.entries(form.fields)) body.set(k, v);
    body.set(form.passwordField, TRGG_PASSWORD);

    const postUrl = form.action
      ? (form.action.startsWith("http")
          ? form.action
          : new URL(form.action, currentUrl).toString())
      : currentUrl;

    const r2 = await fetchWithJar(postUrl, jar, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Referer": currentUrl,
      },
      body: body.toString(),
    });
    currentHtml = await r2.text();
    currentUrl = r2.url;
    debug.push({
      step: "after_login_post",
      status: r2.status,
      url: r2.url,
      snippet: currentHtml.slice(0, 800),
    });

    if (detectPasswordForm(currentHtml)) {
      throw new Error(
        "Login failed — password form still present after POST. " +
        "Check raw_snapshot for form field names.",
      );
    }
  } else {
    debug.push({ step: "no_login_form_required" });
  }

  let rows = parseHandicapTable(currentHtml);
  if (rows.length === 0) {
    const hcpLink = findHandicapLink(currentHtml, currentUrl);
    if (hcpLink) {
      const r3 = await fetchWithJar(hcpLink, jar, {
        headers: { "Referer": currentUrl },
      });
      const html3 = await r3.text();
      debug.push({
        step: "followed_hcp_link",
        url: hcpLink,
        status: r3.status,
        snippet: html3.slice(0, 800),
      });
      rows = parseHandicapTable(html3);
    } else {
      debug.push({ step: "no_hcp_link_found" });
    }
  }

  return { rows, debug };
}

// ----- Login form detection -------------------------------------------------

interface LoginForm {
  action: string;
  fields: Record<string, string>;
  passwordField: string;
}

function detectPasswordForm(html: string): LoginForm | null {
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc) return null;

  const forms = Array.from(doc.querySelectorAll("form")) as Element[];
  for (const form of forms) {
    const inputs = Array.from(form.querySelectorAll("input")) as Element[];
    let pwField: string | null = null;

    for (const inp of inputs) {
      if ((inp.getAttribute("type") ?? "").toLowerCase() === "password") {
        pwField = inp.getAttribute("name");
        break;
      }
    }
    if (!pwField) {
      for (const inp of inputs) {
        const name = (inp.getAttribute("name") ?? "").toLowerCase();
        if (["password", "passwd", "pwd", "pass"].includes(name) ||
            name.endsWith("password") || name.endsWith("pwd")) {
          pwField = inp.getAttribute("name");
          break;
        }
      }
    }
    if (!pwField) continue;

    const fields: Record<string, string> = {};
    for (const inp of inputs) {
      const name = inp.getAttribute("name");
      if (!name || name === pwField) continue;
      fields[name] = inp.getAttribute("value") ?? "";
    }

    return {
      action: form.getAttribute("action") || "",
      fields,
      passwordField: pwField,
    };
  }
  return null;
}

function findHandicapLink(html: string, baseUrl: string): string | null {
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc) return null;

  const links = Array.from(doc.querySelectorAll("a")) as Element[];
  for (const a of links) {
    const text = (a.textContent ?? "").trim().toLowerCase();
    const href = a.getAttribute("href") ?? "";
    if (!href) continue;
    const lowerHref = href.toLowerCase();

    if (
      text.includes("handicap") ||
      (text.includes("member") && text.includes("list")) ||
      lowerHref.includes("hcp") ||
      lowerHref.includes("handicap")
    ) {
      return href.startsWith("http") ? href : new URL(href, baseUrl).toString();
    }
  }
  return null;
}

// ----- Minimal cookie jar ---------------------------------------------------

class CookieJar {
  private store = new Map<string, string>();

  ingest(setCookies: string[] | null) {
    if (!setCookies) return;
    for (const raw of setCookies) {
      const firstPart = raw.split(";")[0];
      const eq = firstPart.indexOf("=");
      if (eq < 0) continue;
      const name = firstPart.slice(0, eq).trim();
      const value = firstPart.slice(eq + 1).trim();
      if (name) this.store.set(name, value);
    }
  }

  header(): string | undefined {
    if (this.store.size === 0) return undefined;
    return Array.from(this.store.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }
}

async function fetchWithJar(
  url: string,
  jar: CookieJar,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(BROWSER_HEADERS);
  for (const [k, v] of Object.entries(init.headers ?? {})) {
    headers.set(k, v as string);
  }
  const cookie = jar.header();
  if (cookie) headers.set("Cookie", cookie);

  const res = await fetch(url, { ...init, headers, redirect: "follow" });

  const setCookies = typeof (res.headers as any).getSetCookie === "function"
    ? (res.headers as any).getSetCookie()
    : res.headers.get("set-cookie")?.split(/,(?=[^ ]+=)/g) ?? null;
  jar.ingest(setCookies);

  return res;
}

// ----- Table parsing --------------------------------------------------------

function parseHandicapTable(html: string): TrggRow[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc) return [];

  const tables = Array.from(doc.querySelectorAll("table")) as Element[];
  for (const table of tables) {
    const headerCells = Array.from(
      table.querySelectorAll("th, tr:first-child td"),
    ).map((c) => (c.textContent ?? "").trim().toLowerCase());
    const headerText = headerCells.join("|");
    if (!headerText.includes("handicap") &&
        !headerText.includes("hcp") &&
        !headerText.includes("hi")) continue;

    const nameIdx = headerCells.findIndex((h) =>
      h.includes("name") || h.includes("player") || h.includes("member"));
    const hcpIdx = headerCells.findIndex((h) =>
      h === "handicap" || h.includes("handicap") || h.includes("hcp") || h === "hi");
    if (nameIdx === -1 || hcpIdx === -1) continue;

    const rows: TrggRow[] = [];
    const bodyRows = Array.from(table.querySelectorAll("tr")).slice(1) as Element[];
    for (const tr of bodyRows) {
      const cells = Array.from(tr.querySelectorAll("td"));
      if (cells.length <= Math.max(nameIdx, hcpIdx)) continue;

      const name = (cells[nameIdx]?.textContent ?? "").trim();
      const hcpText = (cells[hcpIdx]?.textContent ?? "").trim();
      const hcp = parseFloat(hcpText.replace(/[^0-9.\-]/g, ""));

      if (!name || Number.isNaN(hcp)) continue;
      rows.push({ name, handicap: hcp });
    }
    if (rows.length > 0) return rows;
  }
  return [];
}

// ----- Process rows ---------------------------------------------------------

async function processRows(
  supabase: SupabaseClient,
  runId: string,
  rows: TrggRow[],
): Promise<SyncResult> {
  let matched = 0, suggested = 0, review = 0, updated = 0;

  const { data: maps } = await supabase
    .from("trgg_user_map")
    .select("trgg_name_norm, profile_id");
  const mapLookup = new Map(
    (maps ?? []).map((m: any) => [m.trgg_name_norm, m.profile_id]),
  );

  for (const row of rows) {
    const norm = normalizeName(row.name);

    const profileId = mapLookup.get(norm);
    if (profileId) {
      if (await updateHandicap(supabase, profileId, row.handicap)) {
        updated++;
        matched++;
        await supabase
          .from("trgg_user_map")
          .update({
            last_handicap: row.handicap,
            last_synced_at: new Date().toISOString(),
          })
          .eq("profile_id", profileId);
      }
      continue;
    }

    const { data: match } = await supabase.rpc("trgg_find_best_match", {
      search_name: norm,
    });
    const best = match?.[0];

    if (best && best.similarity >= AUTO_APPLY_THRESHOLD) {
      await supabase.from("trgg_user_map").insert({
        trgg_name: row.name,
        trgg_name_norm: norm,
        profile_id: best.id,
        last_handicap: row.handicap,
        last_synced_at: new Date().toISOString(),
      });
      await updateHandicap(supabase, best.id, row.handicap);
      updated++;
      matched++;
      continue;
    }

    const { error: pendErr } = await supabase
      .from("trgg_pending_matches")
      .upsert(
        {
          sync_run_id: runId,
          trgg_name: row.name,
          trgg_name_norm: norm,
          trgg_handicap: row.handicap,
          suggested_profile_id: best?.similarity >= SUGGEST_THRESHOLD ? best.id : null,
          suggested_name: best?.similarity >= SUGGEST_THRESHOLD ? best.full_name : null,
          similarity: best?.similarity ?? null,
          status: "pending",
        },
        { onConflict: "trgg_name_norm", ignoreDuplicates: false },
      );
    if (!pendErr) {
      if (best?.similarity >= SUGGEST_THRESHOLD) suggested++;
      else review++;
    }
  }

  return {
    run_id: runId,
    rows_fetched: rows.length,
    rows_matched: matched,
    rows_suggested: suggested,
    rows_review: review,
    rows_updated: updated,
    status: review > 0 ? "partial" : "success",
  };
}

async function updateHandicap(
  supabase: SupabaseClient,
  profileId: string,
  handicap: number,
): Promise<boolean> {
  // Only write trgg_handicap. Do NOT override universal_handicap
  // unless the user has no existing handicap.
  const { data: profile } = await supabase
    .from(PROFILES_TABLE)
    .select("handicap_index")
    .eq(PROFILE_PK, profileId)
    .single();

  const updateFields: Record<string, unknown> = { [TRGG_HCP_COL]: handicap };
  if (!profile?.handicap_index && profile?.handicap_index !== 0) {
    updateFields[UNIVERSAL_HCP_COL] = handicap;
  }

  const { error } = await supabase
    .from(PROFILES_TABLE)
    .update(updateFields)
    .eq(PROFILE_PK, profileId);
  return !error;
}

// ----- Utils ----------------------------------------------------------------

function normalizeName(input: string): string {
  let s = input;
  if (s.includes(",")) {
    const [last, first] = s.split(",");
    s = `${first.trim()} ${last.trim()}`;
  }
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

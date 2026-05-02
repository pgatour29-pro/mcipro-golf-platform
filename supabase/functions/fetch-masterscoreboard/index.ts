// Fetch TRGG Handicap List from Masterscoreboard using browser cookies
// Bypasses Cloudflare by passing valid session cookies from a real browser session

const HANDICAP_URL = "https://www.masterscoreboard.co.uk/results/HandicapList.php?CWID=103464";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const body = await req.json();
    const { cookies, action } = body;

    if (action === "test") {
      // Just test if cookies work
      const resp = await fetch(HANDICAP_URL, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Cookie": cookies,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Referer": "https://www.masterscoreboard.co.uk/",
        },
      });

      return json(200, {
        status: resp.status,
        ok: resp.ok,
        contentType: resp.headers.get("content-type"),
        contentLength: resp.headers.get("content-length"),
        cfMitigated: resp.headers.get("cf-mitigated"),
      });
    }

    if (!cookies) {
      return json(400, { error: "No cookies provided. Export cookies from EditThisCookie and paste them." });
    }

    // Fetch the handicap page with cookies
    console.log("[Masterscoreboard] Fetching handicap list with cookies...");
    const resp = await fetch(HANDICAP_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Cookie": cookies,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Referer": "https://www.masterscoreboard.co.uk/",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
      },
    });

    if (!resp.ok) {
      const cfMitigated = resp.headers.get("cf-mitigated");
      if (cfMitigated === "challenge" || resp.status === 403) {
        return json(403, {
          error: "Cloudflare challenge - cookies expired or invalid. Please refresh cookies from EditThisCookie.",
          status: resp.status,
        });
      }
      return json(resp.status, { error: `Masterscoreboard returned ${resp.status}` });
    }

    const html = await resp.text();
    console.log("[Masterscoreboard] Got HTML, length:", html.length);

    // Check if we got actual content or a Cloudflare challenge page
    if (html.includes("challenge-platform") || html.includes("cf-turnstile")) {
      return json(403, {
        error: "Got Cloudflare challenge page instead of handicap data. Cookies may be expired.",
      });
    }

    // Parse the handicap table
    const handicaps = parseHandicapTable(html);

    if (handicaps.length === 0) {
      return json(200, {
        success: false,
        message: "No handicap data found in the page. The page format may have changed.",
        htmlPreview: html.substring(0, 500),
      });
    }

    return json(200, {
      success: true,
      count: handicaps.length,
      handicaps: handicaps,
      sample: handicaps.slice(0, 10),
    });

  } catch (err: any) {
    console.error("[Masterscoreboard] Error:", err);
    return json(500, { error: err.message });
  }
});

function parseHandicapTable(html: string): Array<{ name: string; handicap: string }> {
  const results: Array<{ name: string; handicap: string }> = [];

  // Masterscoreboard uses HTML tables with player data
  // Look for table rows with player names and handicaps
  const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];

  for (const row of rows) {
    // Extract cell contents
    const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
    if (!cells || cells.length < 2) continue;

    const clean = (s: string) => s.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();

    // Try to find name and handicap cells
    // Typical format: Name | Handicap | other columns
    const cellTexts = cells.map(clean).filter(t => t.length > 0);

    if (cellTexts.length >= 2) {
      // Look for a cell that looks like a handicap (number, possibly with +)
      for (let i = 1; i < cellTexts.length; i++) {
        const val = cellTexts[i].trim();
        if (/^[+\-]?\d+\.?\d*$/.test(val) && parseFloat(val) >= -10 && parseFloat(val) <= 54) {
          const name = cellTexts[i - 1] || cellTexts[0];
          // Validate it's actually a name (has letters, not just numbers)
          if (name && /[a-zA-Z]{2,}/.test(name)) {
            results.push({ name: name.trim(), handicap: val });
            break;
          }
        }
      }
    }
  }

  // Also try parsing from simple text patterns (Name    HCP)
  if (results.length === 0) {
    const lines = html.replace(/<[^>]*>/g, '\n').split('\n');
    for (const line of lines) {
      const match = line.trim().match(/^([A-Za-z][A-Za-z\s,.\-'()]+?)\s{2,}([+\-]?\d+\.?\d*)$/);
      if (match) {
        results.push({ name: match[1].trim(), handicap: match[2].trim() });
      }
    }
  }

  return results;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

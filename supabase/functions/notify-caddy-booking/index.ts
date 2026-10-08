// Caddy Booking Notification Edge Function — LINE pushes for caddy jobs
//
// v1454 (2026-10-04, Pete: "if the golfer books a caddy, it automatically is a job" → "Fix" the alerts).
// Before: every caller sent a flat body while this read payload.booking → TypeError → 500, and the caddy's
// LINE id was read from columns that do not exist (caddy_profiles.line_user_id / messaging_user_id,
// user_profiles.caddy_id) — no caddy alert was EVER sent.
// Now the database is the caller: trigger caddy_job_alert on caddy_bookings posts {action, booking_id}
// (sql/caddy_job_alerts_v1454.sql) for every path that creates, moves, reassigns or cancels a job.
// The function trusts ONLY the database: it loads the booking row, finds the recipient through
// caddy_profiles.user_id → user_profiles (messaging_user_id || line_user_id), and records each alert in
// caddy_job_alerts (unique per booking + recipient + kind + time) BEFORE sending, so a retry or a second
// caller never pushes twice. A body without a real caddy_bookings id is ignored (nothing to verify).
//
// Actions
//   new_job      → the caddy: "You're booked" (golfer, date, time, course, event)
//   job_moved    → the caddy: old / new time            (body.old_time)
//   job_cancelled→ the caddy: cancelled                 (body.caddy_id = the caddy who lost it, on a reassign)
//   approved     → the golfer: the pro shop confirmed   (Course Admin "Confirm")
//   denied       → the golfer: cancelled                (Course Admin "Cancel")
// Legacy client actions (new_booking / cancelled / time_changed / waitlist_*) are acknowledged and skipped:
// the database trigger already covers the caddy side for every booking.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LINE_MESSAGING_API = "https://api.line.me/v2/bot/message/push";
const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface LineMessage {
  type: "text" | "flex";
  text?: string;
  altText?: string;
  contents?: object;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey, x-mcp-actor, x-mcp-actor-name, x-mcp-role",
};

// ============================================================================
// LOCALIZATION — per-recipient language (en | th | ko | ja), fallback en
// ============================================================================
const L10N: Record<string, Record<string, string>> = {
  en: {
    nb_alt: "New caddy job",
    nb_badge: "🎒 NEW JOB",
    nb_title: "You're booked",
    label_golfer: "Golfer: {name}",
    label_caddy: "Caddy: {name}",
    label_event: "Event: {name}",
    label_oldtime: "Old time: {time}",
    label_newtime: "New time: {time}",
    label_position: "Position: #{pos}",
    unknown: "Unknown",
    btn_view_app: "View in App",
    btn_confirm: "Confirm Booking",
    ap_title: "✅ Caddy Booking Confirmed!",
    ap_footer: "Your caddy is confirmed. See you on the course!",
    dn_title: "❌ Caddy Booking Declined",
    dn_body: "We're sorry, but {caddy} is not available for:",
    dn_the_caddy: "the caddy",
    dn_footer: "Please try booking a different caddy or time.",
    cn_caddy_title: "🚫 Booking Cancelled",
    cn_caddy_footer: "This booking has been cancelled.",
    cn_golfer_title: "🚫 Caddy Booking Cancelled",
    cn_golfer_body: "Your caddy booking has been cancelled:",
    tc_caddy_title: "⏰ Tee Time Changed",
    tc_golfer_title: "⏰ Your Tee Time Changed",
    wa_title: "📋 Added to Waitlist",
    wa_body: "You're on the waitlist for:",
    wa_footer: "We'll notify you if a spot opens up!",
    wp_alt: "Caddy Spot Available!",
    wp_badge: "🎉 SPOT AVAILABLE!",
    wp_body: "Great news! A spot opened up.",
  },
  th: {
    nb_alt: "งานแคดดี้ใหม่",
    nb_badge: "🎒 งานใหม่",
    nb_title: "คุณถูกจองแล้ว",
    label_golfer: "นักกอล์ฟ: {name}",
    label_caddy: "แคดดี้: {name}",
    label_event: "กิจกรรม: {name}",
    label_oldtime: "เวลาเดิม: {time}",
    label_newtime: "เวลาใหม่: {time}",
    label_position: "ลำดับที่: #{pos}",
    unknown: "ไม่ทราบ",
    btn_view_app: "ดูในแอป",
    btn_confirm: "ยืนยันการจอง",
    ap_title: "✅ ยืนยันการจองแคดดี้แล้ว!",
    ap_footer: "ยืนยันแคดดี้ของคุณเรียบร้อยแล้ว พบกันที่สนามกอล์ฟ!",
    dn_title: "❌ การจองแคดดี้ถูกปฏิเสธ",
    dn_body: "ขออภัย {caddy} ไม่ว่างสำหรับ:",
    dn_the_caddy: "แคดดี้",
    dn_footer: "กรุณาลองจองแคดดี้หรือเวลาอื่น",
    cn_caddy_title: "🚫 การจองถูกยกเลิก",
    cn_caddy_footer: "การจองนี้ถูกยกเลิกแล้ว",
    cn_golfer_title: "🚫 การจองแคดดี้ถูกยกเลิก",
    cn_golfer_body: "การจองแคดดี้ของคุณถูกยกเลิกแล้ว:",
    tc_caddy_title: "⏰ เวลาออกรอบเปลี่ยนแปลง",
    tc_golfer_title: "⏰ เวลาออกรอบของคุณเปลี่ยนแปลง",
    wa_title: "📋 เพิ่มเข้าลิสต์รอแล้ว",
    wa_body: "คุณอยู่ในลิสต์รอสำหรับ:",
    wa_footer: "เราจะแจ้งให้คุณทราบหากมีที่ว่าง!",
    wp_alt: "มีที่ว่างสำหรับแคดดี้แล้ว!",
    wp_badge: "🎉 มีที่ว่างแล้ว!",
    wp_body: "ข่าวดี! มีที่ว่างเปิดขึ้นแล้ว",
  },
  ko: {
    nb_alt: "새 캐디 배정",
    nb_badge: "🎒 새 배정",
    nb_title: "예약되었습니다",
    label_golfer: "골퍼: {name}",
    label_caddy: "캐디: {name}",
    label_event: "이벤트: {name}",
    label_oldtime: "이전 시간: {time}",
    label_newtime: "새 시간: {time}",
    label_position: "순번: #{pos}",
    unknown: "알 수 없음",
    btn_view_app: "앱에서 보기",
    btn_confirm: "예약 확정",
    ap_title: "✅ 캐디 예약이 확정되었습니다!",
    ap_footer: "캐디가 확정되었습니다. 코스에서 만나요!",
    dn_title: "❌ 캐디 예약이 거절되었습니다",
    dn_body: "죄송하지만 {caddy}님은 다음 시간에 예약할 수 없습니다:",
    dn_the_caddy: "해당 캐디",
    dn_footer: "다른 캐디나 시간으로 예약해 주세요.",
    cn_caddy_title: "🚫 예약이 취소되었습니다",
    cn_caddy_footer: "이 예약이 취소되었습니다.",
    cn_golfer_title: "🚫 캐디 예약이 취소되었습니다",
    cn_golfer_body: "캐디 예약이 취소되었습니다:",
    tc_caddy_title: "⏰ 티타임이 변경되었습니다",
    tc_golfer_title: "⏰ 티타임이 변경되었습니다",
    wa_title: "📋 대기자 명단에 추가됨",
    wa_body: "다음 예약의 대기자 명단에 등록되었습니다:",
    wa_footer: "자리가 나면 알려드리겠습니다!",
    wp_alt: "캐디 자리가 생겼습니다!",
    wp_badge: "🎉 자리가 생겼습니다!",
    wp_body: "좋은 소식입니다! 자리가 났습니다.",
  },
  ja: {
    nb_alt: "新しいキャディのお仕事",
    nb_badge: "🎒 新しいお仕事",
    nb_title: "予約が入りました",
    label_golfer: "ゴルファー: {name}",
    label_caddy: "キャディ: {name}",
    label_event: "イベント: {name}",
    label_oldtime: "変更前の時間: {time}",
    label_newtime: "変更後の時間: {time}",
    label_position: "順番: #{pos}",
    unknown: "不明",
    btn_view_app: "アプリで見る",
    btn_confirm: "予約を確定する",
    ap_title: "✅ キャディ予約が確定しました！",
    ap_footer: "キャディが確定しました。コースでお会いしましょう！",
    dn_title: "❌ キャディ予約が拒否されました",
    dn_body: "申し訳ございませんが、{caddy}は以下の日時に対応できません:",
    dn_the_caddy: "キャディ",
    dn_footer: "別のキャディまたは時間でご予約ください。",
    cn_caddy_title: "🚫 予約がキャンセルされました",
    cn_caddy_footer: "この予約はキャンセルされました。",
    cn_golfer_title: "🚫 キャディ予約がキャンセルされました",
    cn_golfer_body: "キャディ予約がキャンセルされました:",
    tc_caddy_title: "⏰ ティータイムが変更されました",
    tc_golfer_title: "⏰ ティータイムが変更されました",
    wa_title: "📋 キャンセル待ちに追加されました",
    wa_body: "以下の予約のキャンセル待ちに登録されました:",
    wa_footer: "空きが出たらお知らせします！",
    wp_alt: "キャディの空きが出ました！",
    wp_badge: "🎉 空きが出ました！",
    wp_body: "朗報です！空きが出ました。",
  },
};

const LOCALE_MAP: Record<string, string> = { en: "en-GB", th: "th-TH", ko: "ko-KR", ja: "ja-JP" };
function localeFor(lang: string): string {
  return LOCALE_MAP[lang] || "en-GB";
}

function tr(lang: string, key: string, params?: Record<string, any>): string {
  const table = L10N[lang] || L10N.en;
  let s = (table && table[key]) ?? L10N.en[key] ?? key;
  if (params) {
    for (const k of Object.keys(params)) {
      s = s.replace(new RegExp("\\{" + k + "\\}", "g"), String(params[k]));
    }
  }
  return s;
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body: any = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    const bookingId = String(body.booking_id || body.bookingId || (body.booking && body.booking.id) || "");
    console.log("[Caddy Notify]", action, bookingId || "(no booking id)");

    const handled = ["new_job", "job_moved", "job_cancelled", "approved", "denied"];
    if (!handled.includes(action)) return json({ success: true, skipped: "covered_by_db_trigger", action });
    if (!UUID_RE.test(bookingId)) return json({ success: true, skipped: "no_booking_id", action });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: bk, error } = await supabase
      .from("caddy_bookings")
      .select("id, caddy_id, caddie_name, golfer_id, user_id, golfer_name, booking_date, tee_time, start_time, course_name, status, special_requests, holes")
      .eq("id", bookingId)
      .maybeSingle();
    if (error) throw error;
    if (!bk) return json({ success: true, skipped: "booking_not_found" });
    if (bk.booking_date < bangkokToday()) return json({ success: true, skipped: "past" });

    let result;
    if (action === "new_job") result = await caddyNewJob(supabase, bk);
    else if (action === "job_moved") result = await caddyMoved(supabase, bk, String(body.old_time || ""));
    else if (action === "job_cancelled") result = await caddyCancelled(supabase, bk, String(body.caddy_id || bk.caddy_id || ""));
    else if (action === "approved") result = await golferConfirmed(supabase, bk);
    else result = await golferCancelled(supabase, bk);
    return json(result);
  } catch (error) {
    console.error("[Caddy Notify] Error:", error);
    return json({ error: (error as Error).message }, 500);
  }
});

// ============================================================================
// CADDY: new job / moved / cancelled
// ============================================================================
async function caddyNewJob(supabase: any, bk: any) {
  if (bk.status === "cancelled" || bk.status === "completed") return { success: true, skipped: "not_open" };
  const to = await caddyRecipient(supabase, bk.caddy_id);
  if (!to.id) return { success: true, notified: 0, reason: "caddy_has_no_line" };
  const time = hm(bk.tee_time || bk.start_time);
  if (!(await claim(supabase, bk.id, to.id, "new_job", time))) return { success: true, skipped: "already_sent" };
  const lang = to.lang;
  const lines: object[] = [
    { type: "text", text: tr(lang, "label_golfer", { name: bk.golfer_name || tr(lang, "unknown") }), size: "md", weight: "bold", wrap: true },
    { type: "text", text: "📅 " + formatDate(bk.booking_date, lang), size: "sm", color: "#666666", margin: "md" },
    { type: "text", text: "⏰ " + (time || "—"), size: "sm", color: "#666666" },
    { type: "text", text: "📍 " + (bk.course_name || ""), size: "sm", color: "#666666", wrap: true },
  ];
  const ev = eventOf(bk);
  if (ev) lines.push({ type: "text", text: tr(lang, "label_event", { name: ev }), size: "sm", color: "#666666", wrap: true });
  const message: LineMessage = {
    type: "flex",
    altText: tr(lang, "nb_alt") + " · " + formatDate(bk.booking_date, lang) + " " + time,
    contents: {
      type: "bubble",
      hero: {
        type: "box", layout: "vertical", backgroundColor: "#10B981", paddingAll: "16px",
        contents: [
          { type: "text", text: tr(lang, "nb_badge"), color: "#FFFFFF", size: "sm", weight: "bold" },
          { type: "text", text: tr(lang, "nb_title"), color: "#FFFFFF", size: "xl", weight: "bold", margin: "sm" },
        ],
      },
      body: { type: "box", layout: "vertical", contents: lines },
      footer: {
        type: "box", layout: "vertical",
        contents: [{ type: "button", action: { type: "uri", label: tr(lang, "btn_view_app"), uri: "https://mycaddipro.com" }, style: "primary", color: "#10B981" }],
      },
    },
  };
  return await deliver(supabase, bk.id, to.id, "new_job", time, [message]);
}

async function caddyMoved(supabase: any, bk: any, oldTime: string) {
  if (bk.status === "cancelled" || bk.status === "completed") return { success: true, skipped: "not_open" };
  const to = await caddyRecipient(supabase, bk.caddy_id);
  if (!to.id) return { success: true, notified: 0, reason: "caddy_has_no_line" };
  const time = hm(bk.tee_time || bk.start_time);
  if (!(await claim(supabase, bk.id, to.id, "job_moved", bk.booking_date + " " + time))) return { success: true, skipped: "already_sent" };
  const lang = to.lang;
  const message: LineMessage = {
    type: "text",
    text: tr(lang, "tc_caddy_title") + "\n\n" +
      tr(lang, "label_golfer", { name: bk.golfer_name || tr(lang, "unknown") }) + "\n" +
      "📅 " + formatDate(bk.booking_date, lang) + "\n" +
      (oldTime ? tr(lang, "label_oldtime", { time: hm(oldTime) }) + "\n" : "") +
      tr(lang, "label_newtime", { time }) + "\n" +
      "📍 " + (bk.course_name || ""),
  };
  return await deliver(supabase, bk.id, to.id, "job_moved", bk.booking_date + " " + time, [message]);
}

async function caddyCancelled(supabase: any, bk: any, caddyId: string) {
  // a reassign keeps the row open for the new caddy — only the caddy who LOST it hears "cancelled"
  if (bk.status !== "cancelled" && caddyId === bk.caddy_id) return { success: true, skipped: "still_hers" };
  const to = await caddyRecipient(supabase, caddyId);
  if (!to.id) return { success: true, notified: 0, reason: "caddy_has_no_line" };
  const time = hm(bk.tee_time || bk.start_time);
  if (!(await claim(supabase, bk.id, to.id, "job_cancelled", time))) return { success: true, skipped: "already_sent" };
  const lang = to.lang;
  const message: LineMessage = {
    type: "text",
    text: tr(lang, "cn_caddy_title") + "\n\n" +
      tr(lang, "label_golfer", { name: bk.golfer_name || tr(lang, "unknown") }) + "\n" +
      "📅 " + formatDate(bk.booking_date, lang) + "\n" +
      "⏰ " + time + "\n" +
      "📍 " + (bk.course_name || "") + "\n\n" +
      tr(lang, "cn_caddy_footer"),
  };
  return await deliver(supabase, bk.id, to.id, "job_cancelled", time, [message]);
}

// ============================================================================
// GOLFER: the pro shop confirmed / cancelled (Course Admin)
// ============================================================================
async function golferConfirmed(supabase: any, bk: any) {
  if (bk.status !== "confirmed") return { success: true, skipped: "not_confirmed" };
  const to = await userRecipient(supabase, bk.golfer_id || bk.user_id);
  if (!to.id) return { success: true, notified: 0, reason: "golfer_has_no_line" };
  const time = hm(bk.tee_time || bk.start_time);
  if (!(await claim(supabase, bk.id, to.id, "golfer_confirmed", time))) return { success: true, skipped: "already_sent" };
  const lang = to.lang;
  const message: LineMessage = {
    type: "text",
    text: tr(lang, "ap_title") + "\n\n" +
      tr(lang, "label_caddy", { name: caddyLabel(bk) }) + "\n" +
      "📅 " + formatDate(bk.booking_date, lang) + "\n" +
      "⏰ " + time + "\n" +
      "📍 " + (bk.course_name || "") + "\n\n" +
      tr(lang, "ap_footer"),
  };
  return await deliver(supabase, bk.id, to.id, "golfer_confirmed", time, [message]);
}

async function golferCancelled(supabase: any, bk: any) {
  if (bk.status !== "cancelled") return { success: true, skipped: "not_cancelled" };
  const to = await userRecipient(supabase, bk.golfer_id || bk.user_id);
  if (!to.id) return { success: true, notified: 0, reason: "golfer_has_no_line" };
  const time = hm(bk.tee_time || bk.start_time);
  if (!(await claim(supabase, bk.id, to.id, "golfer_cancelled", time))) return { success: true, skipped: "already_sent" };
  const lang = to.lang;
  const message: LineMessage = {
    type: "text",
    text: tr(lang, "cn_golfer_title") + "\n\n" +
      tr(lang, "cn_golfer_body") + "\n" +
      tr(lang, "label_caddy", { name: caddyLabel(bk) }) + "\n" +
      "📅 " + formatDate(bk.booking_date, lang) + "\n" +
      "⏰ " + time,
  };
  return await deliver(supabase, bk.id, to.id, "golfer_cancelled", time, [message]);
}

// ============================================================================
// HELPERS
// ============================================================================

// the caddy's account: caddy_profiles.user_id (her LINE login id) → user_profiles
async function caddyRecipient(supabase: any, caddyId: string): Promise<{ id: string | null; lang: string }> {
  if (!caddyId || !UUID_RE.test(caddyId)) return { id: null, lang: "en" };
  const { data: cp } = await supabase.from("caddy_profiles").select("user_id").eq("id", caddyId).maybeSingle();
  return await userRecipient(supabase, cp?.user_id || "");
}

// LINE push target = messaging_user_id (the Messaging API channel's id) else the login id
async function userRecipient(supabase: any, lineUserId: string): Promise<{ id: string | null; lang: string }> {
  if (!lineUserId || !String(lineUserId).startsWith("U")) return { id: null, lang: "en" };
  const { data: p } = await supabase
    .from("user_profiles")
    .select("line_user_id, messaging_user_id, language, preferred_language")
    .eq("line_user_id", lineUserId)
    .maybeSingle();
  if (!p) return { id: null, lang: "en" };
  const target = (p.messaging_user_id && String(p.messaging_user_id).startsWith("U")) ? p.messaging_user_id : p.line_user_id;
  const lang = String(p.language || p.preferred_language || "en").slice(0, 2).toLowerCase();
  return { id: target, lang: L10N[lang] ? lang : "en" };
}

// one alert per booking + recipient + kind + time: the row is written BEFORE the push (unique key)
async function claim(supabase: any, bookingId: string, to: string, kind: string, at: string): Promise<boolean> {
  const { error } = await supabase.from("caddy_job_alerts").insert({ booking_id: bookingId, recipient: to, kind, at: at || "" });
  if (!error) return true;
  if (error.code === "23505") return false;
  console.warn("[Caddy Notify] claim failed:", error.message);
  return false;
}

async function deliver(supabase: any, bookingId: string, to: string, kind: string, at: string, messages: LineMessage[]) {
  const sent = await sendPushMessage(to, messages);
  await supabase.from("caddy_job_alerts").update({ sent, sent_at: new Date().toISOString() })
    .eq("booking_id", bookingId).eq("recipient", to).eq("kind", kind).eq("at", at || "");
  return { success: sent, notified: sent ? 1 : 0, kind };
}

function hm(t: string): string {
  const m = String(t || "").match(/^(\d{1,2}):(\d{2})/);
  return m ? m[1].padStart(2, "0") + ":" + m[2] : "";
}

function bangkokToday(): string {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

function eventOf(bk: any): string {
  const s = String(bk.special_requests || "").trim();
  return s && s.length <= 80 && !/^CLAUDE-TEST/i.test(s) ? s : "";
}

function caddyLabel(bk: any): string {
  const n = (String(bk.caddie_name || "").match(/#\s*(\d+)/) || [])[1];
  return n ? "#" + n : (bk.caddie_name || "");
}

function formatDate(dateStr: string, lang: string = "en"): string {
  try {
    const date = new Date(dateStr + "T00:00:00Z");
    return date.toLocaleDateString(localeFor(lang), { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
  } catch {
    return dateStr;
  }
}

async function sendPushMessage(userId: string, messages: LineMessage[]): Promise<boolean> {
  if (!userId?.startsWith("U")) return false;
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    console.error("[Caddy Notify] LINE_CHANNEL_ACCESS_TOKEN not set");
    return false;
  }
  try {
    const response = await fetch(LINE_MESSAGING_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + LINE_CHANNEL_ACCESS_TOKEN },
      body: JSON.stringify({ to: userId, messages }),
    });
    if (!response.ok) {
      console.error("[Caddy Notify] LINE API error:", response.status, await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error("[Caddy Notify] Send error:", error);
    return false;
  }
}

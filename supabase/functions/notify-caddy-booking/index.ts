// Caddy Booking Notification Edge Function
// Sends LINE push notifications for caddy booking events
// Actions: new_booking, approved, denied, cancelled, time_changed, waitlist_added, waitlist_promoted

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LINE_MESSAGING_API = "https://api.line.me/v2/bot/message/push";
const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface BookingNotification {
  action: "new_booking" | "approved" | "denied" | "cancelled" | "time_changed" | "waitlist_added" | "waitlist_promoted";
  booking: {
    id: string;
    caddyId?: string;
    caddyName?: string;
    caddyLocalName?: string;
    golferId?: string;
    golferName?: string;
    date: string;
    time: string;
    course: string;
    courseDisplay?: string;
    oldTime?: string; // For time_changed action
    position?: number; // For waitlist_added
  };
}

interface LineMessage {
  type: "text" | "flex";
  text?: string;
  altText?: string;
  contents?: object;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

// ============================================================================
// LOCALIZATION — per-recipient language (en | th | ko | ja), fallback en
// Native-quality golf-domain strings. Emoji/placeholders/structure preserved.
// ============================================================================
const L10N: Record<string, Record<string, string>> = {
  en: {
    nb_alt: "New Caddy Booking Request",
    nb_badge: "🎒 NEW BOOKING",
    nb_title: "Caddy Request",
    label_golfer: "Golfer: {name}",
    label_caddy: "Caddy: {name}",
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
    nb_alt: "คำขอจองแคดดี้ใหม่",
    nb_badge: "🎒 การจองใหม่",
    nb_title: "คำขอจองแคดดี้",
    label_golfer: "นักกอล์ฟ: {name}",
    label_caddy: "แคดดี้: {name}",
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
    nb_alt: "새 캐디 예약 요청",
    nb_badge: "🎒 새 예약",
    nb_title: "캐디 요청",
    label_golfer: "골퍼: {name}",
    label_caddy: "캐디: {name}",
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
    nb_alt: "新しいキャディ予約リクエスト",
    nb_badge: "🎒 新規予約",
    nb_title: "キャディ予約リクエスト",
    label_golfer: "ゴルファー: {name}",
    label_caddy: "キャディ: {name}",
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

serve(async (req) => {
  try {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const payload: BookingNotification = await req.json();
    console.log("[Caddy Notify] Received:", payload.action, "booking:", payload.booking?.id);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    let result;

    switch (payload.action) {
      case "new_booking":
        result = await handleNewBooking(supabase, payload.booking);
        break;
      case "approved":
        result = await handleApproved(supabase, payload.booking);
        break;
      case "denied":
        result = await handleDenied(supabase, payload.booking);
        break;
      case "cancelled":
        result = await handleCancelled(supabase, payload.booking);
        break;
      case "time_changed":
        result = await handleTimeChanged(supabase, payload.booking);
        break;
      case "waitlist_added":
        result = await handleWaitlistAdded(supabase, payload.booking);
        break;
      case "waitlist_promoted":
        result = await handleWaitlistPromoted(supabase, payload.booking);
        break;
      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Caddy Notify] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ============================================================================
// NEW BOOKING - Notify caddy of new booking request
// ============================================================================
async function handleNewBooking(supabase: any, booking: any) {
  console.log("[Caddy Notify] New booking for caddy:", booking.caddyName);

  // Get caddy's LINE ID + language from caddy record
  const { id: caddyLineId, lang } = await getCaddyLineId(supabase, booking.caddyId);
  if (!caddyLineId) {
    console.log("[Caddy Notify] Caddy has no LINE ID");
    return { success: true, notified: 0, reason: "no_line_id" };
  }

  const formattedDate = formatDate(booking.date, lang);
  const courseName = booking.courseDisplay || booking.course;

  const message: LineMessage = {
    type: "flex",
    altText: tr(lang, "nb_alt"),
    contents: {
      type: "bubble",
      hero: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#10B981",
        paddingAll: "16px",
        contents: [
          { type: "text", text: tr(lang, "nb_badge"), color: "#FFFFFF", size: "sm", weight: "bold" },
          { type: "text", text: tr(lang, "nb_title"), color: "#FFFFFF", size: "xl", weight: "bold", margin: "sm" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: tr(lang, "label_golfer", { name: booking.golferName || tr(lang, "unknown") }), size: "md", weight: "bold" },
          { type: "text", text: "📅 " + formattedDate, size: "sm", color: "#666666", margin: "md" },
          { type: "text", text: "⏰ " + booking.time, size: "sm", color: "#666666" },
          { type: "text", text: "📍 " + courseName, size: "sm", color: "#666666", wrap: true },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            action: { type: "uri", label: tr(lang, "btn_view_app"), uri: "https://mycaddipro.com" },
            style: "primary",
            color: "#10B981",
          },
        ],
      },
    },
  };

  const sent = await sendPushMessage(caddyLineId, [message]);
  return { success: sent, notified: sent ? 1 : 0 };
}

// ============================================================================
// APPROVED - Notify golfer that booking is confirmed
// ============================================================================
async function handleApproved(supabase: any, booking: any) {
  console.log("[Caddy Notify] Booking approved for golfer:", booking.golferName);

  const golferLineId = booking.golferId;
  if (!golferLineId?.startsWith("U")) {
    console.log("[Caddy Notify] Golfer has no LINE ID");
    return { success: true, notified: 0, reason: "no_line_id" };
  }

  const { id: messagingId, lang } = await getMessagingUserId(supabase, golferLineId);
  const formattedDate = formatDate(booking.date, lang);

  const message: LineMessage = {
    type: "text",
    text: tr(lang, "ap_title") + "\n\n" +
      tr(lang, "label_caddy", { name: booking.caddyLocalName || booking.caddyName }) + "\n" +
      "📅 " + formattedDate + "\n" +
      "⏰ " + booking.time + "\n" +
      "📍 " + (booking.courseDisplay || booking.course) + "\n\n" +
      tr(lang, "ap_footer"),
  };

  const sent = await sendPushMessage(messagingId, [message]);
  return { success: sent, notified: sent ? 1 : 0 };
}

// ============================================================================
// DENIED - Notify golfer that booking was declined
// ============================================================================
async function handleDenied(supabase: any, booking: any) {
  console.log("[Caddy Notify] Booking denied for golfer:", booking.golferName);

  const golferLineId = booking.golferId;
  if (!golferLineId?.startsWith("U")) {
    return { success: true, notified: 0, reason: "no_line_id" };
  }

  const { id: messagingId, lang } = await getMessagingUserId(supabase, golferLineId);
  const formattedDate = formatDate(booking.date, lang);

  const message: LineMessage = {
    type: "text",
    text: tr(lang, "dn_title") + "\n\n" +
      tr(lang, "dn_body", { caddy: booking.caddyName || tr(lang, "dn_the_caddy") }) + "\n" +
      "📅 " + formattedDate + "\n" +
      "⏰ " + booking.time + "\n\n" +
      tr(lang, "dn_footer"),
  };

  const sent = await sendPushMessage(messagingId, [message]);
  return { success: sent, notified: sent ? 1 : 0 };
}

// ============================================================================
// CANCELLED - Notify both caddy and golfer
// ============================================================================
async function handleCancelled(supabase: any, booking: any) {
  console.log("[Caddy Notify] Booking cancelled:", booking.id);

  let notified = 0;

  // Notify caddy (in the caddy's language)
  const { id: caddyLineId, lang: caddyLang } = await getCaddyLineId(supabase, booking.caddyId);
  if (caddyLineId) {
    const caddyDate = formatDate(booking.date, caddyLang);
    const caddyMessage: LineMessage = {
      type: "text",
      text: tr(caddyLang, "cn_caddy_title") + "\n\n" +
        tr(caddyLang, "label_golfer", { name: booking.golferName || tr(caddyLang, "unknown") }) + "\n" +
        "📅 " + caddyDate + "\n" +
        "⏰ " + booking.time + "\n" +
        "📍 " + (booking.courseDisplay || booking.course) + "\n\n" +
        tr(caddyLang, "cn_caddy_footer"),
    };
    const caddySent = await sendPushMessage(caddyLineId, [caddyMessage]);
    if (caddySent) notified++;
  }

  // Notify golfer (in the golfer's language)
  if (booking.golferId?.startsWith("U")) {
    const { id: golferMessagingId, lang: golferLang } = await getMessagingUserId(supabase, booking.golferId);
    const golferDate = formatDate(booking.date, golferLang);
    const golferMessage: LineMessage = {
      type: "text",
      text: tr(golferLang, "cn_golfer_title") + "\n\n" +
        tr(golferLang, "cn_golfer_body") + "\n" +
        tr(golferLang, "label_caddy", { name: booking.caddyLocalName || booking.caddyName }) + "\n" +
        "📅 " + golferDate + "\n" +
        "⏰ " + booking.time,
    };
    const golferSent = await sendPushMessage(golferMessagingId, [golferMessage]);
    if (golferSent) notified++;
  }

  return { success: true, notified };
}

// ============================================================================
// TIME CHANGED - Notify both parties of new time
// ============================================================================
async function handleTimeChanged(supabase: any, booking: any) {
  console.log("[Caddy Notify] Time changed:", booking.oldTime, "->", booking.time);

  let notified = 0;

  // Notify caddy (in the caddy's language)
  const { id: caddyLineId, lang: caddyLang } = await getCaddyLineId(supabase, booking.caddyId);
  if (caddyLineId) {
    const caddyDate = formatDate(booking.date, caddyLang);
    const caddyMessage: LineMessage = {
      type: "text",
      text: tr(caddyLang, "tc_caddy_title") + "\n\n" +
        tr(caddyLang, "label_golfer", { name: booking.golferName || tr(caddyLang, "unknown") }) + "\n" +
        "📅 " + caddyDate + "\n" +
        tr(caddyLang, "label_oldtime", { time: booking.oldTime }) + "\n" +
        tr(caddyLang, "label_newtime", { time: booking.time }) + "\n" +
        "📍 " + (booking.courseDisplay || booking.course),
    };
    const caddySent = await sendPushMessage(caddyLineId, [caddyMessage]);
    if (caddySent) notified++;
  }

  // Notify golfer (in the golfer's language)
  if (booking.golferId?.startsWith("U")) {
    const { id: golferMessagingId, lang: golferLang } = await getMessagingUserId(supabase, booking.golferId);
    const golferDate = formatDate(booking.date, golferLang);
    const golferMessage: LineMessage = {
      type: "text",
      text: tr(golferLang, "tc_golfer_title") + "\n\n" +
        tr(golferLang, "label_caddy", { name: booking.caddyLocalName || booking.caddyName }) + "\n" +
        "📅 " + golferDate + "\n" +
        tr(golferLang, "label_oldtime", { time: booking.oldTime }) + "\n" +
        tr(golferLang, "label_newtime", { time: booking.time }),
    };
    const golferSent = await sendPushMessage(golferMessagingId, [golferMessage]);
    if (golferSent) notified++;
  }

  return { success: true, notified };
}

// ============================================================================
// WAITLIST ADDED - Notify golfer they're on waitlist
// ============================================================================
async function handleWaitlistAdded(supabase: any, booking: any) {
  console.log("[Caddy Notify] Waitlist added, position:", booking.position);

  const golferLineId = booking.golferId;
  if (!golferLineId?.startsWith("U")) {
    return { success: true, notified: 0, reason: "no_line_id" };
  }

  const { id: messagingId, lang } = await getMessagingUserId(supabase, golferLineId);
  const formattedDate = formatDate(booking.date, lang);

  const message: LineMessage = {
    type: "text",
    text: tr(lang, "wa_title") + "\n\n" +
      tr(lang, "wa_body") + "\n" +
      tr(lang, "label_caddy", { name: booking.caddyLocalName || booking.caddyName }) + "\n" +
      "📅 " + formattedDate + "\n" +
      "⏰ " + booking.time + "\n\n" +
      tr(lang, "label_position", { pos: booking.position || 1 }) + "\n\n" +
      tr(lang, "wa_footer"),
  };

  const sent = await sendPushMessage(messagingId, [message]);
  return { success: sent, notified: sent ? 1 : 0 };
}

// ============================================================================
// WAITLIST PROMOTED - Notify golfer a spot is available
// ============================================================================
async function handleWaitlistPromoted(supabase: any, booking: any) {
  console.log("[Caddy Notify] Waitlist promoted for:", booking.golferName);

  const golferLineId = booking.golferId;
  if (!golferLineId?.startsWith("U")) {
    return { success: true, notified: 0, reason: "no_line_id" };
  }

  const { id: messagingId, lang } = await getMessagingUserId(supabase, golferLineId);
  const formattedDate = formatDate(booking.date, lang);

  const message: LineMessage = {
    type: "flex",
    altText: tr(lang, "wp_alt"),
    contents: {
      type: "bubble",
      hero: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#10B981",
        paddingAll: "16px",
        contents: [
          { type: "text", text: tr(lang, "wp_badge"), color: "#FFFFFF", size: "lg", weight: "bold" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: tr(lang, "wp_body"), size: "sm", wrap: true },
          { type: "text", text: tr(lang, "label_caddy", { name: booking.caddyLocalName || booking.caddyName }), size: "md", weight: "bold", margin: "md" },
          { type: "text", text: "📅 " + formattedDate, size: "sm", color: "#666666" },
          { type: "text", text: "⏰ " + booking.time, size: "sm", color: "#666666" },
          { type: "text", text: "📍 " + (booking.courseDisplay || booking.course), size: "sm", color: "#666666", wrap: true },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            action: { type: "uri", label: tr(lang, "btn_confirm"), uri: "https://mycaddipro.com" },
            style: "primary",
            color: "#10B981",
          },
        ],
      },
    },
  };

  const sent = await sendPushMessage(messagingId, [message]);
  return { success: sent, notified: sent ? 1 : 0 };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getCaddyLineId(supabase: any, caddyId: string): Promise<{ id: string | null; lang: string }> {
  if (!caddyId) return { id: null, lang: "en" };

  // First check caddy_profiles table for the messaging target
  const { data: caddy } = await supabase
    .from("caddy_profiles")
    .select("line_user_id, messaging_user_id")
    .eq("id", caddyId)
    .single();

  // Language comes from a linked user_profiles row (caddy_profiles may not carry
  // a language column, so only user_profiles is queried for it). Default 'en'.
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("line_user_id, messaging_user_id, language")
    .eq("caddy_id", caddyId)
    .single();

  const lang = profile?.language || "en";

  if (caddy?.messaging_user_id?.startsWith("U")) {
    return { id: caddy.messaging_user_id, lang };
  }
  if (caddy?.line_user_id?.startsWith("U")) {
    return { id: caddy.line_user_id, lang };
  }
  if (profile?.messaging_user_id?.startsWith("U")) {
    return { id: profile.messaging_user_id, lang };
  }
  if (profile?.line_user_id?.startsWith("U")) {
    return { id: profile.line_user_id, lang };
  }

  return { id: null, lang };
}

async function getMessagingUserId(supabase: any, lineUserId: string): Promise<{ id: string; lang: string }> {
  if (!lineUserId?.startsWith("U")) return { id: lineUserId, lang: "en" };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("messaging_user_id, language")
    .eq("line_user_id", lineUserId)
    .single();

  return { id: profile?.messaging_user_id || lineUserId, lang: profile?.language || "en" };
}

function formatDate(dateStr: string, lang: string = "en"): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString(localeFor(lang), {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

async function sendPushMessage(userId: string, messages: LineMessage[]): Promise<boolean> {
  if (!userId?.startsWith("U")) {
    console.log("[Caddy Notify] Invalid user ID:", userId);
    return false;
  }

  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    console.error("[Caddy Notify] LINE_CHANNEL_ACCESS_TOKEN not set");
    return false;
  }

  try {
    const response = await fetch(LINE_MESSAGING_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + LINE_CHANNEL_ACCESS_TOKEN,
      },
      body: JSON.stringify({
        to: userId,
        messages: messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Caddy Notify] LINE API error:", response.status, errorText);
      return false;
    }

    console.log("[Caddy Notify] ✅ Sent to", userId);
    return true;
  } catch (error) {
    console.error("[Caddy Notify] Send error:", error);
    return false;
  }
}

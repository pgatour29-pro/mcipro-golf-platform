/**
 * Alert Webhook Edge Function
 * Receives alerts from Sentry, Supabase, or internal monitoring
 * and forwards them to configured notification channels
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

interface AlertPayload {
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  source?: string;
  metadata?: Record<string, unknown>;
}

// Severity emoji mapping
const severityEmoji = {
  info: '\u2139\ufe0f',
  warning: '\u26a0\ufe0f',
  critical: '\ud83d\udea8',
};

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const payload: AlertPayload = await req.json();

    // Validate required fields
    if (!payload.type || !payload.message || !payload.severity) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: type, message, severity' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[Alert] Received:', payload.severity, payload.type, payload.message);

    // Send to configured channels based on severity
    const results: Record<string, boolean> = {};

    // Slack notification
    const slackWebhook = Deno.env.get('SLACK_WEBHOOK_URL');
    if (slackWebhook) {
      try {
        const slackMessage = formatSlackMessage(payload);
        const slackResponse = await fetch(slackWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(slackMessage),
        });
        results.slack = slackResponse.ok;
        console.log('[Alert] Slack notification:', slackResponse.ok ? 'sent' : 'failed');
      } catch (e) {
        console.error('[Alert] Slack error:', e);
        results.slack = false;
      }
    }

    // Discord notification
    const discordWebhook = Deno.env.get('DISCORD_WEBHOOK_URL');
    if (discordWebhook) {
      try {
        const discordMessage = formatDiscordMessage(payload);
        const discordResponse = await fetch(discordWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(discordMessage),
        });
        results.discord = discordResponse.ok;
        console.log('[Alert] Discord notification:', discordResponse.ok ? 'sent' : 'failed');
      } catch (e) {
        console.error('[Alert] Discord error:', e);
        results.discord = false;
      }
    }

    // LINE Notify (for critical alerts)
    const lineToken = Deno.env.get('LINE_NOTIFY_TOKEN');
    if (lineToken && payload.severity === 'critical') {
      try {
        const lineMessage = formatLineMessage(payload);
        const lineResponse = await fetch('https://notify-api.line.me/api/notify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Bearer ${lineToken}`,
          },
          body: `message=${encodeURIComponent(lineMessage)}`,
        });
        results.line = lineResponse.ok;
        console.log('[Alert] LINE notification:', lineResponse.ok ? 'sent' : 'failed');
      } catch (e) {
        console.error('[Alert] LINE error:', e);
        results.line = false;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notifications: results,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('[Alert] Error processing alert:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

// Format message for Slack
function formatSlackMessage(payload: AlertPayload) {
  const emoji = severityEmoji[payload.severity];
  const color = payload.severity === 'critical' ? '#dc2626' : payload.severity === 'warning' ? '#f59e0b' : '#3b82f6';

  return {
    attachments: [
      {
        color: color,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `${emoji} *MyCaddiPro Alert*`,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Type:*\n${payload.type}`,
              },
              {
                type: 'mrkdwn',
                text: `*Severity:*\n${payload.severity.toUpperCase()}`,
              },
            ],
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Message:*\n${payload.message}`,
            },
          },
          ...(payload.source
            ? [
                {
                  type: 'context',
                  elements: [
                    {
                      type: 'mrkdwn',
                      text: `Source: ${payload.source}`,
                    },
                  ],
                },
              ]
            : []),
        ],
      },
    ],
  };
}

// Format message for Discord
function formatDiscordMessage(payload: AlertPayload) {
  const emoji = severityEmoji[payload.severity];
  const color = payload.severity === 'critical' ? 0xdc2626 : payload.severity === 'warning' ? 0xf59e0b : 0x3b82f6;

  return {
    embeds: [
      {
        title: `${emoji} MyCaddiPro Alert`,
        color: color,
        fields: [
          {
            name: 'Type',
            value: payload.type,
            inline: true,
          },
          {
            name: 'Severity',
            value: payload.severity.toUpperCase(),
            inline: true,
          },
          {
            name: 'Message',
            value: payload.message,
          },
          ...(payload.source
            ? [
                {
                  name: 'Source',
                  value: payload.source,
                },
              ]
            : []),
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

// Format message for LINE Notify
function formatLineMessage(payload: AlertPayload) {
  const emoji = severityEmoji[payload.severity];
  return `\n${emoji} MyCaddiPro Alert\n\nType: ${payload.type}\nSeverity: ${payload.severity.toUpperCase()}\n\n${payload.message}`;
}

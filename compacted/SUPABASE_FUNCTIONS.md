# Supabase Edge Functions Catalog
## Last Updated: 2025-12-27

## Overview
Edge functions are deployed to Supabase and run on Deno.
Base URL: `https://pyeeplwsnupmhgbguwqs.supabase.co/functions/v1/`

## Functions

### analyze-scorecard
**Purpose:** AI-powered scorecard photo analysis using Claude Vision
**Endpoint:** POST `/analyze-scorecard`
**Input:**
```json
{
  "imageBase64": "base64-encoded-image"
}
```
**Output:**
```json
{
  "course_name": "string",
  "date": "YYYY-MM-DD",
  "player_name": "string",
  "holes": [{"hole": 1, "par": 4, "score": 5}, ...],
  "front_9": number,
  "back_9": number,
  "total": number,
  "confidence": "high|medium|low"
}
```

### chat-media
**Purpose:** Handle chat media uploads (images, files)
**Endpoint:** POST `/chat-media`

### chat-notify
**Purpose:** Send chat notifications via LINE
**Endpoint:** POST `/chat-notify`

### event-register
**Purpose:** Register users for golf events
**Endpoint:** POST `/event-register`
**Input:**
```json
{
  "event_id": "uuid",
  "user_id": "line_user_id",
  "handicap": number
}
```

### google-oauth-exchange
**Purpose:** Exchange Google OAuth code for tokens
**Endpoint:** POST `/google-oauth-exchange`
**Input:**
```json
{
  "code": "oauth-code",
  "redirect_uri": "callback-url"
}
```

### kakao-oauth-exchange
**Purpose:** Exchange Kakao OAuth code for tokens
**Endpoint:** POST `/kakao-oauth-exchange`
**Input:**
```json
{
  "code": "oauth-code"
}
```

### line-oauth-exchange
**Purpose:** Exchange LINE OAuth code for tokens
**Endpoint:** POST `/line-oauth-exchange`
**Input:**
```json
{
  "code": "oauth-code",
  "redirect_uri": "callback-url"
}
```

### line-push-notification
**Purpose:** Send push notifications via LINE Messaging API
**Endpoint:** POST `/line-push-notification`
**Input:**
```json
{
  "to": "line_user_id",
  "messages": [{"type": "text", "text": "message"}]
}
```

### line-webhook
**Purpose:** Handle LINE webhook events (messages, follows, etc.)
**Endpoint:** POST `/line-webhook`
**Headers:** `X-Line-Signature` for verification

### notify-caddy-booking
**Purpose:** Send notifications for caddie bookings
**Endpoint:** POST `/notify-caddy-booking`

### push-on-message
**Purpose:** Send push notification when new chat message received
**Endpoint:** POST `/push-on-message`

### send-line-scorecard
**Purpose:** Send completed scorecard via LINE message
**Endpoint:** POST `/send-line-scorecard`
**Input:**
```json
{
  "scorecard_id": "uuid",
  "recipient_id": "line_user_id"
}
```

## Environment Variables Required

| Variable | Description |
|----------|-------------|
| SUPABASE_URL | Supabase project URL |
| SUPABASE_SERVICE_ROLE_KEY | Service role API key |
| LINE_CHANNEL_ACCESS_TOKEN | LINE Messaging API token |
| LINE_CHANNEL_SECRET | LINE channel secret |
| GOOGLE_CLIENT_ID | Google OAuth client ID |
| GOOGLE_CLIENT_SECRET | Google OAuth secret |
| KAKAO_CLIENT_ID | Kakao OAuth client ID |
| KAKAO_CLIENT_SECRET | Kakao OAuth secret |
| ANTHROPIC_API_KEY | Claude API key |

## Deployment

```bash
# Deploy single function
supabase functions deploy analyze-scorecard

# Deploy all functions
supabase functions deploy

# Set secrets
supabase secrets set ANTHROPIC_API_KEY=sk-xxx
```

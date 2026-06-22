-- Kakao push tokens — stores each Kakao user's OAuth tokens so edge functions can
-- send "send to me" (memo) KakaoTalk notifications on their behalf.
-- SECURITY: RLS enabled with NO anon/authenticated policies => the publishable/anon
-- browser key cannot read these secrets; only service_role (edge functions) can.

create table if not exists public.kakao_push_tokens (
    kakao_id      text primary key,            -- 'KAKAO-<numeric id>' (matches user_profiles.line_user_id)
    access_token  text not null,
    refresh_token text,
    expires_at    timestamptz,                 -- when access_token expires
    scope         text,                        -- granted scopes (must include talk_message to push)
    updated_at    timestamptz default now()
);

alter table public.kakao_push_tokens enable row level security;
-- intentionally no policies: only service_role bypasses RLS and may read/write.

revoke all on public.kakao_push_tokens from anon, authenticated;

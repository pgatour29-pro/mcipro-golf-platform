create table if not exists conversations ( id uuid primary key, created_at timestamptz default now() );
create table if not exists channel_meta ( id uuid primary key, name text );
create table if not exists messages (
  conversation_id uuid not null,
  message_id uuid not null,
  sender_id uuid not null,
  body text not null,
  attachments jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  primary key (conversation_id, message_id)
);
create table if not exists receipts ( message_id uuid primary key, delivered_at timestamptz, read_at timestamptz );
create table if not exists typing ( conversation_id uuid not null, user_id uuid not null, started_at timestamptz default now(), primary key (conversation_id, user_id) );

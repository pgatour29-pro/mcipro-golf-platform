-- Tech Support screenshots (v1439, Pete 2026-10-02 "do it"): a user can add up to 3 screenshots to a
-- ticket or to a reply. Extends sql/tech_support_helpdesk_20261002.sql.
--
-- The files live in a PRIVATE bucket and are shown through short-lived signed URLs — a screenshot of
-- someone's booking or scorecard should not sit behind a permanent public link. (Today the anon key
-- can still sign them, exactly as it can read the ticket text; Auth Phase 2 tightens both together
-- by changing these policies, not the app code.)
-- `attachments` holds storage PATHS inside that bucket, never URLs.

alter table public.support_reports
  add column if not exists attachments jsonb not null default '[]'::jsonb;
alter table public.support_report_messages
  add column if not exists attachments jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'support_reports_attachments_ck') then
    alter table public.support_reports add constraint support_reports_attachments_ck
      check (jsonb_typeof(attachments) = 'array' and jsonb_array_length(attachments) <= 3);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'support_report_messages_attachments_ck') then
    alter table public.support_report_messages add constraint support_report_messages_attachments_ck
      check (jsonb_typeof(attachments) = 'array' and jsonb_array_length(attachments) <= 3);
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('support-attachments', 'support-attachments', false, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- same shape as the other upload policies (golf feed, chat media): bucket + size + image type.
-- No UPDATE / DELETE policy: an uploaded screenshot cannot be replaced or removed from the browser.
drop policy if exists "support attachment upload" on storage.objects;
create policy "support attachment upload" on storage.objects for insert with check (
  bucket_id = 'support-attachments'
  and coalesce((metadata ->> 'size')::integer, 0) <= 3145728
  and coalesce(metadata ->> 'mimetype', '') = any (array['image/jpeg','image/png','image/webp'])
);
drop policy if exists "support attachment read" on storage.objects;
create policy "support attachment read" on storage.objects for select using (bucket_id = 'support-attachments');

comment on column public.support_reports.attachments         is 'Up to 3 storage paths in the private support-attachments bucket (screenshots sent with the ticket).';
comment on column public.support_report_messages.attachments is 'Up to 3 storage paths in the private support-attachments bucket (screenshots sent with this reply).';

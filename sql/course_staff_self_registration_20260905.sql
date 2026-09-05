-- Staff self-registration (v1113)
-- course_staff becomes the staff equivalent of caddy_profiles: a roster row that a
-- real employee CLAIMS at registration (employee id = the caddy number of staff),
-- plus a pending queue for people the course has not listed yet, approved from the
-- Manager dashboard's Staff tab.
alter table public.course_staff
  add column if not exists user_id       text,
  add column if not exists requested_role text,
  add column if not exists approved_at   timestamptz,
  add column if not exists approved_by   text;

create index if not exists course_staff_user_id_idx      on public.course_staff (user_id);
create index if not exists course_staff_course_status_idx on public.course_staff (course_id, status);

comment on column public.course_staff.user_id is
  'line_user_id of the account that claimed this roster row (null = unclaimed).';
comment on column public.course_staff.requested_role is
  'App role the person asked for at registration: manager | proshop | caddymaster | maintenance.';

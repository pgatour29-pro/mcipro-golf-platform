-- 2026-10-07: the TRGG website is PRIMARY (Pete, 2026-08-29) but sync-trgg-schedule only ran when
-- someone pressed the admin button — last run 09-28, so the Oct 26/27 venue swap (Bangpakong /
-- SIAM OLD COURSE) never reached society_events or any pro shop tee sheet. Hourly from now on.
-- The function is verify_jwt=false and takes the publishable key (same as the admin button) —
-- nothing secret is stored here. Idempotent: an unchanged website = 0 writes, no LINE pushes.
select cron.unschedule('trgg-schedule-sync-hourly') where exists (select 1 from cron.job where jobname = 'trgg-schedule-sync-hourly');
select cron.schedule(
  'trgg-schedule-sync-hourly',
  '7 * * * *',
  $$select net.http_post(
      url := 'https://pyeeplwsnupmhgbguwqs.supabase.co/functions/v1/sync-trgg-schedule',
      headers := jsonb_build_object('Authorization', 'Bearer sb_publishable_JUC1GzlfviBUyy8LeEpSkA_Xc8tgRC9', 'apikey', 'sb_publishable_JUC1GzlfviBUyy8LeEpSkA_Xc8tgRC9', 'Content-Type', 'application/json'),
      body := jsonb_build_object('trigger', 'cron'))$$
);

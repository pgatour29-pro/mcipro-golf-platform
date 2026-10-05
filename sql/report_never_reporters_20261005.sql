-- Reports: five real people (six ids — one has an old guest id too) must NEVER be the reporter on a made-up report (Pete 2026-10-05).
-- Ids only, on purpose — their names stay out of the report scripts. The same ids are the
-- NEVER_REPORTERS set in sql/seed_support_reports_gen.py.
-- 1) removes every made-up report they were put on (all seed waves + the drip) and takes them
--    out of the drip's reporter pool;
-- 2) DB-enforced from here on: neither the drip pool nor a non-'app' report can carry these ids.
--    A real report they file themselves in the app (source='app') is untouched.
-- Removed rows are kept in backups/support_reports_removed_reporters_20261005.json.
delete from public.support_reports
 where source <> 'app'
   and reporter_id in ('U8f371b8f895c9d722596e52bf8dec357', 'U2d73fb4e83969dd5caaadd413ede87cb', 'Ud2a1832c01d2ca470854e0385ac7fbff',
                       'U8e1e7241961a2747032dece7929adbde', 'Ue2e8d0624f400d568cc6fe2e6342780b', 'TRGG-GUEST-0009');

delete from public.report_drip_reporters
 where reporter_id in ('U8f371b8f895c9d722596e52bf8dec357', 'U2d73fb4e83969dd5caaadd413ede87cb', 'Ud2a1832c01d2ca470854e0385ac7fbff',
                       'U8e1e7241961a2747032dece7929adbde', 'Ue2e8d0624f400d568cc6fe2e6342780b', 'TRGG-GUEST-0009');

alter table public.support_reports drop constraint if exists support_reports_never_reporters_ck;
alter table public.support_reports add constraint support_reports_never_reporters_ck
  check (source = 'app' or reporter_id not in ('U8f371b8f895c9d722596e52bf8dec357', 'U2d73fb4e83969dd5caaadd413ede87cb', 'Ud2a1832c01d2ca470854e0385ac7fbff',
                                               'U8e1e7241961a2747032dece7929adbde', 'Ue2e8d0624f400d568cc6fe2e6342780b', 'TRGG-GUEST-0009'));

alter table public.report_drip_reporters drop constraint if exists report_drip_reporters_never_ck;
alter table public.report_drip_reporters add constraint report_drip_reporters_never_ck
  check (reporter_id not in ('U8f371b8f895c9d722596e52bf8dec357', 'U2d73fb4e83969dd5caaadd413ede87cb', 'Ud2a1832c01d2ca470854e0385ac7fbff',
                             'U8e1e7241961a2747032dece7929adbde', 'Ue2e8d0624f400d568cc6fe2e6342780b', 'TRGG-GUEST-0009'));

-- 2026-08-25 (v999): system sender identity for caddy-master pushes.
-- secure-dm validates the SENDER exists in user_profiles; PIN caddy-master sessions have no
-- real LINE id, so day-off decision pushes send AS this profile (same pattern as the
-- society sender profiles in sql/society_sender_profiles.sql). Recipients see
-- "New message from Caddy Master".
INSERT INTO user_profiles (line_user_id, name, role)
VALUES ('CADDY-MASTER-SYSTEM', 'Caddy Master', 'caddymaster')
ON CONFLICT (line_user_id) DO NOTHING;

-- Handicap Sync Trigger
-- Automatically syncs society_handicaps.handicap_index to user_profiles.profile_data.golfInfo.handicap

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS sync_handicap_trigger ON society_handicaps;
DROP FUNCTION IF EXISTS sync_handicap_to_profile();

-- Create the sync function
CREATE OR REPLACE FUNCTION sync_handicap_to_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Only sync UNIVERSAL handicap (society_id IS NULL) to profile
    IF NEW.society_id IS NULL THEN
        UPDATE user_profiles
        SET profile_data = jsonb_set(
            COALESCE(profile_data, '{}'::jsonb),
            '{golfInfo,handicap}',
            to_jsonb(NEW.handicap_index::text)
        ),
        updated_at = NOW()
        WHERE line_user_id = NEW.golfer_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER sync_handicap_trigger
AFTER INSERT OR UPDATE ON society_handicaps
FOR EACH ROW
EXECUTE FUNCTION sync_handicap_to_profile();

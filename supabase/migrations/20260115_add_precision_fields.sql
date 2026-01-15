-- Add high-precision pin location fields
-- Migration to support quadrant system and micro-positioning

ALTER TABLE pin_locations
ADD COLUMN IF NOT EXISTS primary_grid INTEGER CHECK (primary_grid BETWEEN 1 AND 9),
ADD COLUMN IF NOT EXISTS micro_placement TEXT,
ADD COLUMN IF NOT EXISTS line_hugging BOOLEAN DEFAULT false;

-- Add comments
COMMENT ON COLUMN pin_locations.primary_grid IS 'Grid quadrant number (1-9): 1=Front-Left, 5=Center, 9=Back-Right';
COMMENT ON COLUMN pin_locations.micro_placement IS 'Position within quadrant: High/Low/Left/Right/Center or combinations';
COMMENT ON COLUMN pin_locations.line_hugging IS 'True if pin is on or very close to grid line boundary';

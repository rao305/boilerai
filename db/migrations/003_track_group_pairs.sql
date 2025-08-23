-- Migration 003: Add pair_rules column to track_groups for supporting course pairs
-- This enables features like:
-- - CS31100+CS41100 counting as one elective
-- - EPCS41100+EPCS41200 satisfying capstone requirements

ALTER TABLE track_groups
  ADD COLUMN IF NOT EXISTS pair_rules JSONB DEFAULT '[]'::jsonb;

-- Add comment explaining the column
COMMENT ON COLUMN track_groups.pair_rules IS 'JSON array of course pairs that count together. Example: [["CS31100","CS41100"]] means both courses together count as 1 pick';
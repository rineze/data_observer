-- ============================================================================
-- Cleanup: Remove unused columns from observations
-- Run this in Supabase SQL Editor
-- ============================================================================

ALTER TABLE observations DROP COLUMN IF EXISTS system_a_name;
ALTER TABLE observations DROP COLUMN IF EXISTS system_a_value;
ALTER TABLE observations DROP COLUMN IF EXISTS system_b_name;
ALTER TABLE observations DROP COLUMN IF EXISTS system_b_value;
ALTER TABLE observations DROP COLUMN IF EXISTS payer_name;

-- Update NPI column from VARCHAR(10) to VARCHAR(9)
ALTER TABLE observations ALTER COLUMN provider_npi TYPE VARCHAR(9);

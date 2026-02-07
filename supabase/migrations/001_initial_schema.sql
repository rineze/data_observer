-- ============================================================================
-- Provider Data Observer — Initial Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================================

-- 1. Field Types (reference/lookup)
CREATE TABLE field_types (
    id SERIAL PRIMARY KEY,
    field_key VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL
);

INSERT INTO field_types (field_key, display_name) VALUES
    ('term_date', 'Termination Date'),
    ('effective_date', 'Effective Date'),
    ('enrollment_status', 'Enrollment Status'),
    ('tin', 'Tax ID Number (TIN)'),
    ('payer_id', 'Payer ID'),
    ('group_npi', 'Group NPI'),
    ('billing_npi', 'Billing NPI'),
    ('credentialing_status', 'Credentialing Status'),
    ('other', 'Other');

-- 2. Observations
CREATE TABLE observations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider_npi VARCHAR(10) NOT NULL,
    provider_name VARCHAR(255) NOT NULL,
    payer_name VARCHAR(255),
    field_observed VARCHAR(100) NOT NULL,
    system_a_name VARCHAR(100),
    system_a_value VARCHAR(255),
    system_b_name VARCHAR(100),
    system_b_value VARCHAR(255),
    corrected_value VARCHAR(255) NOT NULL,
    evidence_type VARCHAR(50) NOT NULL,
    evidence_notes TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    submitted_by UUID REFERENCES auth.users(id),
    submitted_by_email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Observation Reviews
CREATE TABLE observation_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    observation_id UUID REFERENCES observations(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES auth.users(id),
    reviewer_email VARCHAR(255),
    decision VARCHAR(20) NOT NULL,
    comments TEXT,
    reviewed_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable Row Level Security
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE observation_reviews ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for observations
CREATE POLICY "Authenticated users can view all observations"
    ON observations FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert observations"
    ON observations FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update observations"
    ON observations FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 6. RLS Policies for observation_reviews
CREATE POLICY "Authenticated users can view all reviews"
    ON observation_reviews FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert reviews"
    ON observation_reviews FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 7. Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER observations_updated_at
    BEFORE UPDATE ON observations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

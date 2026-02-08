-- ============================================================================
-- Bulk CSV Tagging Feature
-- Run this in Supabase SQL Editor
-- ============================================================================

-- 1. Tag Categories (reference/lookup)
CREATE TABLE tag_categories (
    id SERIAL PRIMARY KEY,
    category_key VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    allowed_values TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO tag_categories (category_key, display_name, allowed_values) VALUES
    ('denial_reason_override', 'Denial Reason Override', ARRAY['credentialing_gap', 'tin_mismatch', 'timely_filing', 'auth_required', 'duplicate_claim', 'other']),
    ('resubmission_flag', 'Resubmission Flag', ARRAY['resubmit_new_tin', 'resubmit_corrected_npi', 'resubmit_with_auth', 'resubmit_other']),
    ('enrollment_status_correction', 'Enrollment Status Correction', ARRAY['active', 'terminated', 'pending', 'in_process']),
    ('credentialing_note', 'Credentialing Note', ARRAY['missing_documentation', 'pending_primary_source', 'board_review_needed', 'completed']),
    ('audit_category', 'Audit Category', ARRAY['payer_error', 'internal_error', 'system_sync_issue', 'data_entry_error']);

-- 2. Bulk Batches
CREATE TABLE bulk_batches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    batch_name VARCHAR(255),
    tag_category_id INTEGER REFERENCES tag_categories(id),
    tag_value VARCHAR(255) NOT NULL,
    id_column_name VARCHAR(100) NOT NULL,
    record_count INTEGER NOT NULL,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    submitted_by UUID REFERENCES auth.users(id),
    submitted_by_email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Bulk Records
CREATE TABLE bulk_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    batch_id UUID REFERENCES bulk_batches(id) ON DELETE CASCADE,
    record_identifier VARCHAR(255) NOT NULL,
    original_row JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE tag_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_records ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies — tag_categories
CREATE POLICY "Authenticated users can view tag categories"
    ON tag_categories FOR SELECT
    TO authenticated
    USING (true);

-- 6. RLS Policies — bulk_batches
CREATE POLICY "Authenticated users can view all batches"
    ON bulk_batches FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert batches"
    ON bulk_batches FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update batch status"
    ON bulk_batches FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 7. RLS Policies — bulk_records
CREATE POLICY "Authenticated users can view all bulk records"
    ON bulk_records FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert bulk records"
    ON bulk_records FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 8. Updated_at trigger for bulk_batches
CREATE TRIGGER bulk_batches_updated_at
    BEFORE UPDATE ON bulk_batches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

# Provider Data Observer — Architecture

## What This System Does

This is a **human-in-the-loop annotation layer** for provider enrollment and claims data. It does not modify source systems. It captures verified corrections and tags as reference tables that get joined onto production data at query time.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│                   React + Tailwind CSS                      │
│                   Hosted on Vercel                          │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Submit      │  │   Bulk Tag   │  │    Dashboard     │  │
│  │  Observation  │  │  CSV Upload  │  │   + Review +     │  │
│  │   Form       │  │   Wizard     │  │   Batch Summary  │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                    │             │
└─────────┼─────────────────┼────────────────────┼─────────────┘
          │                 │                    │
          │  Supabase JS Client (REST + JWT)     │
          │                 │                    │
┌─────────┼─────────────────┼────────────────────┼─────────────┐
│         ▼                 ▼                    ▼             │
│                      SUPABASE                               │
│              (Auth + Postgres + REST API)                    │
│                                                             │
│  ┌─────────────┐                                            │
│  │  auth.users  │ ◄─── email/password login                 │
│  │             │       JWT session token                    │
│  └──────┬──────┘                                            │
│         │ referenced by submitted_by / reviewer_id          │
│         │                                                   │
│  ┌──────┼──────────────────────────────────────────────┐    │
│  │      ▼          REFERENCE TABLES                    │    │
│  │                 (the annotation layer)               │    │
│  │                                                     │    │
│  │  ┌──────────────────┐    ┌──────────────────────┐   │    │
│  │  │   observations   │    │    bulk_batches       │   │    │
│  │  │                  │    │                       │   │    │
│  │  │  provider_npi    │    │  batch_name           │   │    │
│  │  │  provider_name   │    │  tag_category_id ──┐  │   │    │
│  │  │  field_observed  │    │  tag_value          │  │   │    │
│  │  │  corrected_value │    │  id_column_name     │  │   │    │
│  │  │  evidence_type   │    │  record_count       │  │   │    │
│  │  │  evidence_notes  │    │  status             │  │   │    │
│  │  │  status          │    │  submitted_by       │  │   │    │
│  │  │  submitted_by    │    └───────────┬─────────┘  │   │    │
│  │  └────────┬─────────┘               │            │   │    │
│  │           │                         │            │   │    │
│  │           ▼                         ▼            │   │    │
│  │  ┌──────────────────┐    ┌──────────────────┐    │   │    │
│  │  │ observation_     │    │  bulk_records     │    │   │    │
│  │  │ reviews          │    │                   │    │   │    │
│  │  │                  │    │  batch_id          │    │   │    │
│  │  │  decision        │    │  record_identifier │    │   │    │
│  │  │  comments        │    │  original_row     │    │   │    │
│  │  │  reviewer_email  │    │  (JSONB)          │    │   │    │
│  │  └──────────────────┘    └──────────────────┘    │   │    │
│  │                                                  │   │    │
│  │  ┌──────────────────┐    ┌──────────────────┐    │   │    │
│  │  │  field_types     │    │  tag_categories ◄─┘   │   │    │
│  │  │  (lookup)        │    │  (lookup)             │   │    │
│  │  │                  │    │                       │   │    │
│  │  │  term_date       │    │  denial_reason_       │   │    │
│  │  │  effective_date  │    │    override           │   │    │
│  │  │  credentialing_  │    │  resubmission_flag    │   │    │
│  │  │    status        │    │  enrollment_status_   │   │    │
│  │  │  enrollment_     │    │    correction         │   │    │
│  │  │    status        │    │  credentialing_note   │   │    │
│  │  └──────────────────┘    │  audit_category       │   │    │
│  │                          └──────────────────┘    │   │    │
│  └──────────────────────────────────────────────────┘   │    │
│                                                         │    │
│  Row Level Security (RLS):                              │    │
│    - Authenticated users can SELECT, INSERT all tables  │    │
│    - Authenticated users can UPDATE status fields       │    │
│    - Unauthenticated requests get nothing               │    │
│                                                         │    │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Observation Workflow

```
Team member finds a discrepancy
        │
        ▼
┌─────────────────────────┐
│  Submit Observation      │
│                          │
│  NPI: 123456789          │
│  Name: Dr. Smith         │
│  Field: term_date        │
│  Corrected: 2026-03-15   │
│  Evidence: payer_portal   │
│  Notes: "Confirmed via..." │
└───────────┬──────────────┘
            │
            ▼
   observations table
   status = 'pending'
            │
            ▼
┌───────────────────────────┐
│  Reviewer opens record    │
│                           │
│  ┌─────────┐ ┌─────────┐ │
│  │ Approve │ │ Reject  │ │
│  └────┬────┘ └────┬────┘ │
│       │           │       │
│       ▼           ▼       │
│  status =    status =     │
│  'approved'  'rejected'   │
│       │      + required   │
│       │        comment    │
└───────┼───────────────────┘
        │
        ▼
  observation_reviews table
  (audit trail)
        │
        ▼
┌───────────────────────────┐
│  Correction applied to    │
│  source system manually   │
│                           │
│  ┌─────────────────────┐  │
│  │  Mark as Applied    │  │
│  └──────────┬──────────┘  │
│             │              │
│             ▼              │
│     status = 'applied'     │
└────────────────────────────┘
```

---

## Data Flow: Bulk Tag Workflow

```
Team member has a CSV of claim IDs (or NPIs, etc.)
        │
        ▼
┌──────────────────────────────────────┐
│  Step 1: Upload CSV                  │
│  Parse with PapaParse (client-side)  │
│  Preview first 10 rows              │
└───────────────┬──────────────────────┘
                │
                ▼
┌──────────────────────────────────────┐
│  Step 2: Configure                   │
│                                      │
│  ID Column:     claim_id             │
│  Tag Category:  Denial Reason Override│
│  Tag Value:     credentialing_gap    │
│  Batch Name:    "Jan 2026 denials"   │
└───────────────┬──────────────────────┘
                │
                ▼
┌──────────────────────────────────────┐
│  Step 3: Confirm & Submit            │
│                                      │
│  "Tagging 8,432 records from        │
│   column 'claim_id' with            │
│   Denial Reason Override =           │
│   'credentialing_gap'"               │
│                                      │
│  Insert to bulk_batches (1 row)      │
│  Insert to bulk_records (chunks      │
│    of 500, with progress bar)        │
└───────────────┬──────────────────────┘
                │
                ▼
        Same review flow:
        pending → approved → applied
```

---

## The Annotation Layer: How Reference Tables Join to Production Data

**This is the core concept.** We never modify source tables. We create reference tables and join them at query time using CASE WHEN logic.

```
┌─────────────────────────────────────────────────────────────┐
│                   PRODUCTION DATA                           │
│                   (never modified)                          │
│                                                             │
│  charge_inventory                                           │
│  ┌─────────┬────────────┬──────────────────┬─────────┐     │
│  │claim_id │provider_npi│denial_category   │ ...     │     │
│  ├─────────┼────────────┼──────────────────┼─────────┤     │
│  │CLM-001  │123456789   │auth_required     │         │     │
│  │CLM-002  │123456789   │timely_filing     │         │     │
│  │CLM-003  │987654321   │other             │         │     │
│  └─────────┴────────────┴──────────────────┴─────────┘     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    LEFT JOIN
                           │
┌──────────────────────────┼──────────────────────────────────┐
│              ANNOTATION LAYER                               │
│              (our reference tables)                          │
│                                                             │
│  observations (individual corrections)                      │
│  ┌────────────┬───────────────┬────────────────┬──────────┐│
│  │provider_npi│field_observed │corrected_value │status    ││
│  ├────────────┼───────────────┼────────────────┼──────────┤│
│  │987654321   │denial_category│payer_error     │approved  ││
│  └────────────┴───────────────┴────────────────┴──────────┘│
│                                                             │
│  bulk_records + bulk_batches (bulk tags)                    │
│  ┌──────────────────┬──────────────┬───────────────────┐   │
│  │record_identifier │tag_value     │status             │   │
│  ├──────────────────┼──────────────┼───────────────────┤   │
│  │CLM-001           │cred_gap      │approved           │   │
│  │CLM-002           │cred_gap      │approved           │   │
│  └──────────────────┴──────────────┴───────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │
                    CASE WHEN
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    QUERY OUTPUT                              │
│                                                             │
│  ┌─────────┬──────────────┬──────────────┬────────────────┐│
│  │claim_id │system_denial │final_denial  │category_source ││
│  ├─────────┼──────────────┼──────────────┼────────────────┤│
│  │CLM-001  │auth_required │cred_gap      │bulk_tag        ││
│  │CLM-002  │timely_filing │cred_gap      │bulk_tag        ││
│  │CLM-003  │other         │payer_error   │manual_obs      ││
│  └─────────┴──────────────┴──────────────┴────────────────┘│
│                                                             │
│  category_source tells you WHERE the answer came from:      │
│    • 'system'            = original source data             │
│    • 'manual_observation' = individual verified correction  │
│    • 'bulk_tag'          = bulk CSV tagging action          │
└─────────────────────────────────────────────────────────────┘
```

### The SQL

```sql
SELECT
    ci.claim_id,
    ci.denial_category    AS system_denial_category,

    CASE
        WHEN o.corrected_value IS NOT NULL THEN o.corrected_value
        WHEN bt.tag_value      IS NOT NULL THEN bt.tag_value
        ELSE ci.denial_category
    END AS final_denial_category,

    CASE
        WHEN o.corrected_value IS NOT NULL THEN 'manual_observation'
        WHEN bt.tag_value      IS NOT NULL THEN 'bulk_tag'
        ELSE 'system'
    END AS category_source

FROM charge_inventory ci

LEFT JOIN observations o
    ON ci.provider_npi = o.provider_npi
    AND o.field_observed = 'denial_category'
    AND o.status IN ('approved', 'applied')

LEFT JOIN bulk_records br
    ON ci.claim_id = br.record_identifier
LEFT JOIN bulk_batches bt
    ON br.batch_id = bt.id
    AND bt.status IN ('approved', 'applied')
```

---

## Status Lifecycle

```
                 ┌──────────┐
                 │ PENDING  │  ◄── submitted by team member
                 └────┬─────┘
                      │
              reviewer decision
                      │
           ┌──────────┼──────────┐
           ▼                     ▼
    ┌────────────┐        ┌────────────┐
    │  APPROVED  │        │  REJECTED  │
    └─────┬──────┘        └────────────┘
          │                (with required
          │                 comment)
    correction applied
    to source system
          │
          ▼
    ┌────────────┐
    │  APPLIED   │
    └────────────┘
```

- **Pending** (amber): Submitted, awaiting review
- **Approved** (green): Reviewer confirmed the correction is valid
- **Rejected** (red): Reviewer rejected with a reason
- **Applied** (blue): The correction has been consumed / applied downstream

---

## Security Model

```
┌────────────────────────────────────────────┐
│            Supabase Auth                    │
│                                             │
│  Browser ──► supabase.auth.signIn()         │
│         ◄── JWT session token               │
│                                             │
│  Every API request includes JWT             │
│                                             │
│  ┌────────────────────────────────────┐     │
│  │   Row Level Security (RLS)         │     │
│  │                                    │     │
│  │   No JWT  ──► blocked (no access)  │     │
│  │   Valid JWT ──► SELECT, INSERT,    │     │
│  │                 UPDATE allowed     │     │
│  └────────────────────────────────────┘     │
│                                             │
│  Anon key is public (safe to expose).       │
│  It's useless without a valid session.      │
│  RLS policies are the real access control.  │
└─────────────────────────────────────────────┘
```

---

## Production Path: Pilot → Databricks

```
         PILOT (now)                    PRODUCTION (future)
┌─────────────────────────┐     ┌─────────────────────────────┐
│                         │     │                             │
│  React on Vercel        │ ──► │  Databricks App (Streamlit) │
│                         │     │                             │
│  Supabase Postgres      │ ──► │  Delta tables in Unity      │
│                         │     │  Catalog                    │
│                         │     │                             │
│  Supabase Auth          │ ──► │  Workspace SSO              │
│  (test user)            │     │  (Azure AD / Okta)          │
│                         │     │                             │
│  Manual "Mark as        │ ──► │  Scheduled workflow reads   │
│  Applied" button        │     │  approved records, joins    │
│                         │     │  into production views      │
│                         │     │                             │
│  Same table schemas ─────────── Same table schemas          │
│  Same workflow logic ────────── Same workflow logic         │
│  Same CASE WHEN pattern ─────── Same CASE WHEN pattern     │
│                         │     │                             │
└─────────────────────────┘     └─────────────────────────────┘
```

---

## File Structure

```
provider-data-observer/
├── public/
├── src/
│   ├── components/
│   │   ├── Layout.jsx           # Page wrapper with navbar
│   │   ├── Navbar.jsx           # Top navigation
│   │   ├── ObservationForm.jsx  # Submit observation form
│   │   ├── ObservationTable.jsx # Dashboard observations list
│   │   ├── ObservationDetail.jsx# Review detail view
│   │   ├── ReviewPanel.jsx      # Approve/reject/apply controls
│   │   ├── StatusBadge.jsx      # Color-coded status pills
│   │   ├── Filters.jsx          # Dashboard filter controls
│   │   └── BatchTable.jsx       # Dashboard bulk batches list
│   ├── pages/
│   │   ├── Login.jsx            # Test user one-click login
│   │   ├── Submit.jsx           # Submit observation page
│   │   ├── Dashboard.jsx        # Main dashboard (tabs)
│   │   ├── Review.jsx           # Individual observation review
│   │   ├── BulkTag.jsx          # 3-step CSV upload wizard
│   │   ├── BatchReview.jsx      # Batch review + CSV export
│   │   └── BatchSummary.jsx     # Aggregate batch analytics
│   ├── lib/
│   │   └── supabase.js          # Supabase client config
│   ├── App.jsx                  # Routes + auth guard
│   ├── main.jsx                 # Entry point
│   └── index.css                # Tailwind imports
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql    # Core tables + RLS
│       ├── 002_bulk_tagging.sql      # Bulk tag tables + RLS
│       └── 003_cleanup_columns.sql   # Drop unused columns
├── vercel.json                  # SPA routing rewrites
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── vite.config.js
```

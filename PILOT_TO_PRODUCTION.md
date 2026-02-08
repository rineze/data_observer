# Provider Data Observer — Pilot to Production

## The Problem

Provider enrollment and claims data lives across multiple systems — credentialing platforms, payer portals, billing systems, internal databases — and they frequently disagree. Today, team members resolve these discrepancies through email, phone calls, and tribal knowledge. There is no systematic way to:

- **Capture** the verified correct value when a discrepancy is found
- **Attach evidence** for how it was verified
- **Review** corrections before they're consumed downstream
- **Track** what's been resolved vs. what's still outstanding
- **Audit** who corrected what, when, and why

Every unresolved discrepancy creates downstream risk in billing, enrollment, and credentialing.

---

## What We Built (Pilot)

A lightweight web application called **Provider Data Observer** with two core workflows:

### 1. Observation Workflow
A team member identifies a data conflict between two systems. They submit an observation documenting:
- The provider (NPI, name, payer)
- What field is wrong (term date, TIN, enrollment status, etc.)
- What System A says vs. what System B says
- **The verified correct value** with evidence (email, phone call, payer portal, letter)

A reviewer approves or rejects the observation. Once it's consumed in reporting, it's marked as **applied**.

### 2. Bulk Tagging Workflow
A team member uploads a CSV of records (e.g., claim IDs, provider NPIs) and tags them with a category and value — for example, tagging 8,000 denied claims as "credentialing gap" or flagging 500 providers for "TIN mismatch resubmission." Same review and apply workflow.

### Pilot Tech Stack
| Component | Technology | Cost |
|-----------|-----------|------|
| Frontend | React (hosted on Vercel) | Free |
| Database | Supabase (managed Postgres) | Free tier |
| Auth | Supabase Auth (test user) | Free |

**Total cost: $0. Build time: < 1 day.**

---

## What This Proves

1. **The workflow works.** Team members can document discrepancies with evidence, reviewers can approve or reject, and resolution status is tracked end-to-end.

2. **Adoption is simple.** One-click login, clean form, immediate visibility in the dashboard. No training required.

3. **The data model is sound.** Observations, reviews, bulk batches, and tagged records are structured for auditability and downstream consumption.

---

## The Key Insight: Reference Tables, Not Production Overrides

**We are not overwriting source systems.** The observations and bulk tags produce reference tables — an annotation layer that sits alongside production data and gets joined in at query time.

Source data is never touched. The reference tables are the **human-verified opinion layer** — approved, auditable, and joinable.

### How It Works in Practice

Take the charge inventory table. It has a `denial_category` field populated by the system. But the team knows thousands of those are miscategorized. Instead of changing the source, we join our annotations on top:

```sql
SELECT
    ci.claim_id,
    ci.charge_id,
    ci.denial_category AS system_denial_category,

    CASE
        WHEN o.corrected_value IS NOT NULL
            THEN o.corrected_value
        WHEN bt.tag_value IS NOT NULL
            THEN bt.tag_value
        ELSE ci.denial_category
    END AS final_denial_category,

    CASE
        WHEN o.corrected_value IS NOT NULL THEN 'manual_observation'
        WHEN bt.tag_value IS NOT NULL THEN 'bulk_tag'
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

The `category_source` column tells you **where the answer came from** — system, manual observation, or bulk tag. In dashboards, leadership can see: "40% of denial categories came from the system, 35% were bulk-tagged by the team, 25% were individually verified observations."

This pattern applies to any field on any table: enrollment status, termination dates, TINs, credentialing flags. The annotation layer is universal.

---

## Production Path: Databricks

The pilot proves the workflow. Moving to production means swapping infrastructure — not rebuilding logic.

### Option A: Repoint This App to Databricks
The React app already works. Swap the Supabase backend for Databricks SQL Statement API. Same forms, same UX, reference tables live as Delta tables in Unity Catalog. Minimal code changes.

### Option B: Databricks App (Streamlit)
Rebuild the forms as a Streamlit app hosted natively inside the Databricks workspace. Auth is automatic (workspace SSO), writes go directly to Delta tables via `spark.sql()`. Less polished UI, but zero external dependencies — everything lives in Databricks.

### Option C: Hybrid (Recommended)
Keep the React app as the **pilot and demo**. When buy-in is secured, rebuild in Streamlit as a Databricks App for production. Use the pilot's schema and workflow as the spec. The Streamlit rebuild is fast since the data model and UX are already validated.

### What Changes

| Pilot | Production |
|-------|-----------|
| Supabase Postgres | Delta tables in Unity Catalog |
| Supabase Auth | Databricks workspace SSO (Azure AD / Okta) |
| React app on Vercel | Databricks App (Streamlit) |
| Supabase row-level security | Unity Catalog permissions |
| CSV upload in browser | Upload to Volumes or ingest from cloud storage |

### What Stays the Same
- Table schemas (same columns, same relationships)
- Workflow logic (pending → approved → applied)
- Review and audit trail
- Bulk tagging model
- **The reference table / join pattern — this is the core value**

### Production Architecture

```
Team member submits observation or CSV
                |
                v
      Databricks App (Streamlit)
                |
                v
      Databricks SQL Warehouse
                |
                v
      Delta reference tables (Unity Catalog):
        - observations
        - observation_reviews
        - bulk_batches
        - bulk_records
        - tag_categories
                |
                v
      Downstream queries JOIN reference tables
      onto production data (charge_inventory, etc.)
      using CASE WHEN logic for final field values
                |
                v
      Dashboards show category_source breakdown:
        system vs. manual_observation vs. bulk_tag
                |
                v
      Unity Catalog governance + audit logging
```

### What Databricks Adds
- **SSO**: Team members sign in with existing corporate credentials — no separate accounts
- **Governance**: Unity Catalog enforces who can see, modify, and query reference tables
- **Native integration**: Reference tables live in the same catalog as charge inventory, claims, and enrollment data — no cross-system joins
- **Scale**: Delta Lake handles millions of annotation records without performance concerns
- **Audit**: Built-in lineage tracking shows exactly how reference tables are consumed in downstream queries
- **No new infrastructure**: Databricks Apps, SQL Warehouse, and Delta tables are all capabilities we already have

### What Databricks Does NOT Have Natively
There is no built-in "manual annotation tool" in Databricks. This is a gap. The workflow we're proposing — structured data entry with evidence, peer review, and status tracking — requires a custom app. Databricks Apps (Streamlit hosting) is the platform's answer to that gap.

---

## ROI

- **Risk reduction**: Every unresolved data discrepancy is a potential billing error, enrollment gap, or credentialing failure. This tool makes resolution systematic instead of ad-hoc.
- **Time savings**: Replaces email chains and spreadsheet tracking with a structured workflow that takes seconds to submit and review.
- **Auditability**: Every correction has an evidence trail — who found it, how they verified it, who approved it, when it was consumed.
- **Scalability**: The bulk tagging workflow handles thousands of records in one action, replacing manual one-by-one fixes.
- **Data quality visibility**: The `category_source` pattern quantifies exactly how much of our reporting relies on system data vs. human corrections — a metric we've never had.

---

## Timeline

| Phase | Scope | Effort |
|-------|-------|--------|
| **Done** | Pilot app with full workflow, live demo | < 1 day |
| **Phase 1** | Create Delta reference tables, rebuild forms in Streamlit Databricks App | 1-2 sprints |
| **Phase 2** | Integrate reference tables into charge inventory queries, build CASE WHEN views | 1 sprint |
| **Phase 3** | Dashboard reporting on category_source breakdown, team onboarding | 1 sprint |

---

## Demo Access

- **Live app**: [Your Vercel URL]
- **Source code**: https://github.com/rineze/data_observer
- **Login**: Click "Sign In as Test User" (no credentials needed)

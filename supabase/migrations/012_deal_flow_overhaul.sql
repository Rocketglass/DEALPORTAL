-- Rocket Realty Deal Flow Overhaul
-- Migration 012: Full top-to-bottom deal pipeline
--
-- Phase 1: General applications (not property-specific)
-- Phase 2: Multi-party portal access (tenant, landlord, agent roles)
-- Phase 3: AI-drafted LOIs with applicant DocuSign
-- Phase 4: Financial document sharing with landlord
-- Phase 5: Lease negotiation inside portal
-- Phase 6: Deal checklist
-- Phase 7: Financial document removal with approval

-- ============================================================
-- PHASE 1: GENERAL APPLICATIONS
-- ============================================================

-- Make property_id optional — general applications have no property
ALTER TABLE applications ALTER COLUMN property_id DROP NOT NULL;

-- Track whether this is a general or property-specific application
ALTER TABLE applications ADD COLUMN IF NOT EXISTS application_type VARCHAR(20) NOT NULL DEFAULT 'property';
-- Backfill existing rows
UPDATE applications SET application_type = 'property' WHERE application_type = 'property';

-- Add annual_revenue if missing (some apply forms collect it)
-- Already exists per schema, skip

-- Make QR codes work for general applications (no property)
ALTER TABLE qr_codes ALTER COLUMN property_id DROP NOT NULL;
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS qr_type VARCHAR(20) NOT NULL DEFAULT 'property';

-- ============================================================
-- PHASE 3: AI-DRAFTED LOIs + APPLICANT DOCUSIGN
-- ============================================================

-- Track AI drafting
ALTER TABLE lois ADD COLUMN IF NOT EXISTS ai_drafted BOOLEAN DEFAULT false;
ALTER TABLE lois ADD COLUMN IF NOT EXISTS ai_draft_prompt TEXT;

-- Applicant signs LOI before it goes to landlord
ALTER TABLE lois ADD COLUMN IF NOT EXISTS applicant_docusign_envelope_id VARCHAR(100);
ALTER TABLE lois ADD COLUMN IF NOT EXISTS applicant_docusign_status VARCHAR(30);
ALTER TABLE lois ADD COLUMN IF NOT EXISTS applicant_signed_at TIMESTAMPTZ;

-- ============================================================
-- PHASE 4: FINANCIAL DOCUMENT SHARING
-- ============================================================

-- Broker controls which docs are shared with landlord/agent
ALTER TABLE application_documents ADD COLUMN IF NOT EXISTS shared_with_landlord BOOLEAN DEFAULT false;
ALTER TABLE application_documents ADD COLUMN IF NOT EXISTS shared_at TIMESTAMPTZ;
ALTER TABLE application_documents ADD COLUMN IF NOT EXISTS shared_by UUID REFERENCES contacts(id);

-- ============================================================
-- PHASE 5: LEASE NEGOTIATION (mirrors LOI negotiation)
-- ============================================================

-- Lease sections for back-and-forth negotiation
CREATE TABLE IF NOT EXISTS lease_sections (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lease_id            UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
    section_key         VARCHAR(50) NOT NULL,
    section_label       VARCHAR(100) NOT NULL,
    display_order       INTEGER NOT NULL DEFAULT 0,
    proposed_value      TEXT NOT NULL,
    counterparty_response TEXT,
    agreed_value        TEXT,
    status              VARCHAR(20) NOT NULL DEFAULT 'proposed',
    negotiation_notes   TEXT,
    last_updated_by     UUID REFERENCES contacts(id),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(lease_id, section_key)
);

CREATE INDEX IF NOT EXISTS idx_lease_sections_lease ON lease_sections(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_sections_status ON lease_sections(status);

-- Lease negotiation audit trail
CREATE TABLE IF NOT EXISTS lease_negotiations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lease_section_id    UUID NOT NULL REFERENCES lease_sections(id) ON DELETE CASCADE,
    action              VARCHAR(20) NOT NULL, -- propose, accept, counter, reject
    value               TEXT,
    note                TEXT,
    created_by          UUID NOT NULL REFERENCES contacts(id),
    party_role          VARCHAR(20) NOT NULL, -- broker, tenant, landlord, tenant_agent, landlord_agent
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lease_negotiations_section ON lease_negotiations(lease_section_id);
CREATE INDEX IF NOT EXISTS idx_lease_negotiations_created ON lease_negotiations(created_at);

-- Add lease negotiation status
ALTER TABLE leases ADD COLUMN IF NOT EXISTS negotiation_status VARCHAR(30) DEFAULT 'none';
-- Values: none, in_negotiation, agreed

-- ============================================================
-- PHASE 6: DEAL CHECKLIST
-- ============================================================

CREATE TABLE IF NOT EXISTS deal_checklists (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lease_id            UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
    title               VARCHAR(255) NOT NULL DEFAULT 'Deal Checklist',
    status              VARCHAR(20) NOT NULL DEFAULT 'active', -- active, completed, archived
    created_by          UUID NOT NULL REFERENCES contacts(id),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deal_checklists_lease ON deal_checklists(lease_id);

CREATE TABLE IF NOT EXISTS deal_checklist_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_id        UUID NOT NULL REFERENCES deal_checklists(id) ON DELETE CASCADE,
    title               VARCHAR(255) NOT NULL,
    description         TEXT,
    assigned_to         VARCHAR(20) NOT NULL, -- tenant, landlord, both, broker
    display_order       INTEGER NOT NULL DEFAULT 0,
    is_completed        BOOLEAN DEFAULT false,
    completed_at        TIMESTAMPTZ,
    completed_by        UUID REFERENCES contacts(id),
    due_date            DATE,
    file_url            VARCHAR(500), -- optional attachment
    file_name           VARCHAR(255),
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist ON deal_checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_assigned ON deal_checklist_items(assigned_to);

-- ============================================================
-- PHASE 7: FINANCIAL DOCUMENT REMOVAL
-- ============================================================

ALTER TABLE application_documents ADD COLUMN IF NOT EXISTS removal_requested_at TIMESTAMPTZ;
ALTER TABLE application_documents ADD COLUMN IF NOT EXISTS removal_requested_by VARCHAR(255); -- email of requester
ALTER TABLE application_documents ADD COLUMN IF NOT EXISTS removal_approved_at TIMESTAMPTZ;
ALTER TABLE application_documents ADD COLUMN IF NOT EXISTS removal_approved_by UUID REFERENCES contacts(id);
ALTER TABLE application_documents ADD COLUMN IF NOT EXISTS removal_status VARCHAR(20); -- requested, approved, denied

-- ============================================================
-- UPDATED_AT TRIGGERS for new tables
-- ============================================================

CREATE TRIGGER trg_deal_checklists_updated_at BEFORE UPDATE ON deal_checklists FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_deal_checklist_items_updated_at BEFORE UPDATE ON deal_checklist_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS POLICIES: Multi-party portal access
-- ============================================================

-- Enable RLS on new tables
ALTER TABLE lease_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_negotiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_checklist_items ENABLE ROW LEVEL SECURITY;

-- Broker/admin can do everything on new tables
CREATE POLICY lease_sections_broker_all ON lease_sections
    FOR ALL USING (is_broker_or_admin());

CREATE POLICY lease_negotiations_broker_all ON lease_negotiations
    FOR ALL USING (is_broker_or_admin());

CREATE POLICY deal_checklists_broker_all ON deal_checklists
    FOR ALL USING (is_broker_or_admin());

CREATE POLICY deal_checklist_items_broker_all ON deal_checklist_items
    FOR ALL USING (is_broker_or_admin());

-- Tenants can view lease sections/negotiations for their own leases
CREATE POLICY lease_sections_tenant_view ON lease_sections
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM leases l
            JOIN contacts c ON c.id = l.tenant_contact_id
            WHERE l.id = lease_sections.lease_id
            AND c.email = get_user_email()
        )
    );

CREATE POLICY lease_negotiations_tenant_view ON lease_negotiations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM lease_sections ls
            JOIN leases l ON l.id = ls.lease_id
            JOIN contacts c ON c.id = l.tenant_contact_id
            WHERE ls.id = lease_negotiations.lease_section_id
            AND c.email = get_user_email()
        )
    );

-- Landlords can view lease sections/negotiations for their own leases
CREATE POLICY lease_sections_landlord_view ON lease_sections
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM leases l
            JOIN contacts c ON c.id = l.landlord_contact_id
            WHERE l.id = lease_sections.lease_id
            AND c.email = get_user_email()
        )
    );

CREATE POLICY lease_negotiations_landlord_view ON lease_negotiations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM lease_sections ls
            JOIN leases l ON l.id = ls.lease_id
            JOIN contacts c ON c.id = l.landlord_contact_id
            WHERE ls.id = lease_negotiations.lease_section_id
            AND c.email = get_user_email()
        )
    );

-- Tenants and landlords can view their deal checklists
CREATE POLICY deal_checklists_party_view ON deal_checklists
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM leases l
            JOIN contacts c ON (c.id = l.tenant_contact_id OR c.id = l.landlord_contact_id)
            WHERE l.id = deal_checklists.lease_id
            AND c.email = get_user_email()
        )
    );

CREATE POLICY deal_checklist_items_party_view ON deal_checklist_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM deal_checklists dc
            JOIN leases l ON l.id = dc.lease_id
            JOIN contacts c ON (c.id = l.tenant_contact_id OR c.id = l.landlord_contact_id)
            WHERE dc.id = deal_checklist_items.checklist_id
            AND c.email = get_user_email()
        )
    );

-- Allow tenants/landlords to update checklist items assigned to them
CREATE POLICY deal_checklist_items_party_update ON deal_checklist_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM deal_checklists dc
            JOIN leases l ON l.id = dc.lease_id
            JOIN contacts c ON (c.id = l.tenant_contact_id OR c.id = l.landlord_contact_id)
            WHERE dc.id = deal_checklist_items.checklist_id
            AND c.email = get_user_email()
        )
    );

-- Landlords can view shared financial documents
CREATE POLICY app_docs_landlord_shared ON application_documents
    FOR SELECT USING (
        shared_with_landlord = true
        AND EXISTS (
            SELECT 1 FROM applications a
            JOIN lois lo ON lo.application_id = a.id
            JOIN contacts c ON c.id = lo.landlord_contact_id
            WHERE a.id = application_documents.application_id
            AND c.email = get_user_email()
        )
    );

-- Tenants can view their own applications (update existing policy if needed)
-- Note: existing RLS may already cover this via contact email match

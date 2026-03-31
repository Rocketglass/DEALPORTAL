-- Rocket Realty Deal Flow Portal — Initial Database Schema
-- Migration 001: Core tables for properties, contacts, applications, LOIs, leases, invoices

-- ============================================================
-- PROPERTIES
-- ============================================================
CREATE TABLE properties (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    VARCHAR(255) NOT NULL,
    address                 VARCHAR(255) NOT NULL,
    city                    VARCHAR(100) NOT NULL,
    state                   VARCHAR(2) NOT NULL DEFAULT 'CA',
    zip                     VARCHAR(10) NOT NULL,
    county                  VARCHAR(100),
    property_type           VARCHAR(50) NOT NULL,
    total_sf                INTEGER,
    land_area_sf            INTEGER,
    year_built              INTEGER,
    zoning                  VARCHAR(50),
    parcel_number           VARCHAR(50),
    parking_spaces          INTEGER,
    parking_ratio           DECIMAL(5,2),
    power                   VARCHAR(100),
    clear_height_ft         DECIMAL(5,1),
    dock_high_doors         INTEGER DEFAULT 0,
    grade_level_doors       INTEGER DEFAULT 0,
    levelers                INTEGER DEFAULT 0,
    crane_capacity_tons     DECIMAL(5,1),
    building_far            DECIMAL(5,3),
    primary_leasing_company VARCHAR(255),
    description             TEXT,
    features                JSONB DEFAULT '{}',
    photos                  JSONB DEFAULT '[]',
    floorplan_url           VARCHAR(500),
    is_active               BOOLEAN DEFAULT true,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_properties_city ON properties(city);
CREATE INDEX idx_properties_type ON properties(property_type);
CREATE INDEX idx_properties_active ON properties(is_active);

-- ============================================================
-- UNITS (suites within a property)
-- ============================================================
CREATE TABLE units (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id         UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    suite_number        VARCHAR(20) NOT NULL,
    sf                  INTEGER NOT NULL,
    unit_type           VARCHAR(50),
    status              VARCHAR(20) NOT NULL DEFAULT 'vacant',
    monthly_rent        DECIMAL(10,2),
    rent_per_sqft       DECIMAL(8,4),
    cam_percent         DECIMAL(5,2),
    cam_monthly         DECIMAL(10,2),
    base_year           INTEGER,
    current_lease_id    UUID,
    marketing_rate      DECIMAL(8,4),
    marketing_notes     TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(property_id, suite_number)
);

CREATE INDEX idx_units_property ON units(property_id);
CREATE INDEX idx_units_status ON units(status);

-- ============================================================
-- CONTACTS (tenants, landlords, brokers, prospects, guarantors)
-- ============================================================
CREATE TABLE contacts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type                VARCHAR(20) NOT NULL,
    company_name        VARCHAR(255),
    dba_name            VARCHAR(255),
    entity_type         VARCHAR(100),
    first_name          VARCHAR(100),
    last_name           VARCHAR(100),
    email               VARCHAR(255),
    phone               VARCHAR(20),
    address             VARCHAR(255),
    city                VARCHAR(100),
    state               VARCHAR(2),
    zip                 VARCHAR(10),
    industry            VARCHAR(100),
    website             VARCHAR(255),
    notes               TEXT,
    tags                JSONB DEFAULT '[]',
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contacts_type ON contacts(type);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_company ON contacts(company_name);

-- ============================================================
-- USERS (auth, linked to contacts)
-- ============================================================
CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id          UUID REFERENCES contacts(id),
    email               VARCHAR(255) NOT NULL UNIQUE,
    role                VARCHAR(20) NOT NULL,
    auth_provider_id    VARCHAR(255),
    is_active           BOOLEAN DEFAULT true,
    last_login          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_auth ON users(auth_provider_id);

-- ============================================================
-- APPLICATIONS
-- ============================================================
CREATE TABLE applications (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id             UUID NOT NULL REFERENCES properties(id),
    unit_id                 UUID REFERENCES units(id),
    contact_id              UUID NOT NULL REFERENCES contacts(id),
    status                  VARCHAR(30) NOT NULL DEFAULT 'draft',

    -- Business information
    business_name           VARCHAR(255) NOT NULL,
    business_type           VARCHAR(100),
    business_entity_state   VARCHAR(2),
    agreed_use              VARCHAR(255),
    years_in_business       INTEGER,
    number_of_employees     INTEGER,
    annual_revenue          DECIMAL(15,2),
    requested_sf            INTEGER,
    desired_term_months     INTEGER,
    desired_move_in         DATE,
    desired_rent_budget     DECIMAL(10,2),

    -- Guarantor
    guarantor_name          VARCHAR(255),
    guarantor_phone         VARCHAR(20),
    guarantor_email         VARCHAR(255),

    -- Credit check
    credit_check_status     VARCHAR(20) DEFAULT 'not_run',
    credit_check_date       DATE,
    credit_score            INTEGER,
    credit_report_url       VARCHAR(500),

    -- Review
    submitted_at            TIMESTAMPTZ,
    reviewed_at             TIMESTAMPTZ,
    reviewed_by             UUID REFERENCES contacts(id),
    review_notes            TEXT,

    -- Portal
    portal_source           VARCHAR(20),
    qr_code_id              UUID,

    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_applications_property ON applications(property_id);
CREATE INDEX idx_applications_contact ON applications(contact_id);
CREATE INDEX idx_applications_status ON applications(status);

-- ============================================================
-- APPLICATION DOCUMENTS
-- ============================================================
CREATE TABLE application_documents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id      UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    document_type       VARCHAR(30) NOT NULL,
    file_url            VARCHAR(500) NOT NULL,
    file_name           VARCHAR(255) NOT NULL,
    file_size_bytes     INTEGER,
    mime_type           VARCHAR(50),
    tax_year            INTEGER,
    period_start        DATE,
    period_end          DATE,
    uploaded_at         TIMESTAMPTZ DEFAULT NOW(),
    reviewed            BOOLEAN DEFAULT false,
    reviewed_at         TIMESTAMPTZ,
    reviewed_by         UUID REFERENCES contacts(id),
    reviewer_notes      TEXT
);

CREATE INDEX idx_app_docs_application ON application_documents(application_id);
CREATE INDEX idx_app_docs_type ON application_documents(document_type);

-- ============================================================
-- LOIS (Letters of Intent)
-- ============================================================
CREATE TABLE lois (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id          UUID REFERENCES applications(id),
    property_id             UUID NOT NULL REFERENCES properties(id),
    unit_id                 UUID NOT NULL REFERENCES units(id),
    tenant_contact_id       UUID NOT NULL REFERENCES contacts(id),
    landlord_contact_id     UUID NOT NULL REFERENCES contacts(id),
    broker_contact_id       UUID NOT NULL REFERENCES contacts(id),
    status                  VARCHAR(30) NOT NULL DEFAULT 'draft',
    version                 INTEGER NOT NULL DEFAULT 1,
    parent_loi_id           UUID REFERENCES lois(id),
    created_by              UUID NOT NULL REFERENCES contacts(id),
    sent_at                 TIMESTAMPTZ,
    expires_at              TIMESTAMPTZ,
    agreed_at               TIMESTAMPTZ,
    notes                   TEXT,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lois_property ON lois(property_id);
CREATE INDEX idx_lois_status ON lois(status);
CREATE INDEX idx_lois_tenant ON lois(tenant_contact_id);

-- ============================================================
-- LOI SECTIONS (modular negotiation sections)
-- ============================================================
CREATE TABLE loi_sections (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loi_id              UUID NOT NULL REFERENCES lois(id) ON DELETE CASCADE,
    section_key         VARCHAR(50) NOT NULL,
    section_label       VARCHAR(100) NOT NULL,
    display_order       INTEGER NOT NULL DEFAULT 0,
    proposed_value      TEXT NOT NULL,
    landlord_response   TEXT,
    agreed_value        TEXT,
    status              VARCHAR(20) NOT NULL DEFAULT 'proposed',
    negotiation_notes   TEXT,
    last_updated_by     UUID REFERENCES contacts(id),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(loi_id, section_key)
);

CREATE INDEX idx_loi_sections_loi ON loi_sections(loi_id);
CREATE INDEX idx_loi_sections_status ON loi_sections(status);

-- ============================================================
-- LOI NEGOTIATIONS (audit trail)
-- ============================================================
CREATE TABLE loi_negotiations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loi_section_id      UUID NOT NULL REFERENCES loi_sections(id) ON DELETE CASCADE,
    action              VARCHAR(20) NOT NULL,
    value               TEXT,
    note                TEXT,
    created_by          UUID NOT NULL REFERENCES contacts(id),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_loi_negotiations_section ON loi_negotiations(loi_section_id);
CREATE INDEX idx_loi_negotiations_created ON loi_negotiations(created_at);

-- ============================================================
-- LEASES (maps to AIR form sections 1.1–1.12)
-- ============================================================
CREATE TABLE leases (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loi_id                      UUID REFERENCES lois(id),
    property_id                 UUID NOT NULL REFERENCES properties(id),
    unit_id                     UUID NOT NULL REFERENCES units(id),
    tenant_contact_id           UUID NOT NULL REFERENCES contacts(id),
    landlord_contact_id         UUID NOT NULL REFERENCES contacts(id),
    broker_contact_id           UUID NOT NULL REFERENCES contacts(id),
    guarantor_contact_id        UUID REFERENCES contacts(id),
    status                      VARCHAR(30) NOT NULL DEFAULT 'draft',

    -- AIR Form Metadata
    form_type                   VARCHAR(30) DEFAULT 'AIR_MTN_NET',
    form_version                VARCHAR(20),

    -- Section 1.1: Parties
    reference_date              DATE,
    lessor_name                 VARCHAR(255) NOT NULL,
    lessor_entity_type          VARCHAR(255),
    lessee_name                 VARCHAR(255) NOT NULL,
    lessee_entity_type          VARCHAR(255),

    -- Section 1.2(a): Premises
    premises_address            VARCHAR(255) NOT NULL,
    premises_city               VARCHAR(100) NOT NULL,
    premises_county             VARCHAR(100),
    premises_state              VARCHAR(2) DEFAULT 'CA',
    premises_zip                VARCHAR(10),
    premises_sf                 INTEGER NOT NULL,
    premises_description        TEXT,

    -- Section 1.2(b): Parking
    parking_spaces              INTEGER,
    parking_type                VARCHAR(50) DEFAULT 'unreserved',

    -- Section 1.3: Term
    term_years                  INTEGER,
    term_months                 INTEGER,
    commencement_date           DATE NOT NULL,
    expiration_date             DATE NOT NULL,

    -- Section 1.4: Early Possession
    early_possession_terms      TEXT,

    -- Section 1.5: Base Rent
    base_rent_monthly           DECIMAL(10,2) NOT NULL,
    base_rent_payable_day       VARCHAR(20) DEFAULT 'first',
    base_rent_commencement      DATE,

    -- Section 1.6: CAM
    cam_percent                 DECIMAL(5,2),
    cam_description             VARCHAR(100) DEFAULT 'Lessee''s Share',

    -- Section 1.7: Monies Upon Execution
    exec_base_rent_amount       DECIMAL(10,2),
    exec_base_rent_period       VARCHAR(100),
    exec_cam_amount             DECIMAL(10,2),
    exec_cam_period             VARCHAR(100),
    exec_security_deposit       DECIMAL(10,2),
    exec_other_amount           DECIMAL(10,2),
    exec_other_description      VARCHAR(255),
    total_due_upon_execution    DECIMAL(10,2),

    -- Section 1.8: Agreed Use
    agreed_use                  VARCHAR(255),

    -- Section 1.9: Insuring Party
    insuring_party              VARCHAR(20) DEFAULT 'Lessor',

    -- Section 1.10: Brokers
    broker_representation_type  VARCHAR(20),
    lessors_broker_name         VARCHAR(255),
    lessors_broker_company      VARCHAR(255),
    lessees_broker_name         VARCHAR(255),
    lessees_broker_company      VARCHAR(255),
    broker_payment_terms        TEXT,

    -- Section 1.11: Guarantor
    guarantor_names             TEXT,

    -- Section 1.12: Attachments
    addendum_paragraph_start    INTEGER,
    addendum_paragraph_end      INTEGER,
    has_site_plan_premises      BOOLEAN DEFAULT false,
    has_site_plan_project       BOOLEAN DEFAULT false,
    has_rules_and_regulations   BOOLEAN DEFAULT false,
    other_attachments           TEXT,

    -- Security Deposit
    security_deposit            DECIMAL(10,2),

    -- DocuSign
    docusign_envelope_id        VARCHAR(100),
    docusign_status             VARCHAR(30),
    sent_for_signature_at       TIMESTAMPTZ,
    signed_date                 DATE,

    -- Generated documents
    lease_pdf_url               VARCHAR(500),
    executed_pdf_url            VARCHAR(500),

    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leases_property ON leases(property_id);
CREATE INDEX idx_leases_unit ON leases(unit_id);
CREATE INDEX idx_leases_tenant ON leases(tenant_contact_id);
CREATE INDEX idx_leases_status ON leases(status);
CREATE INDEX idx_leases_expiration ON leases(expiration_date);

-- Add FK from units back to leases
ALTER TABLE units ADD CONSTRAINT fk_units_current_lease
    FOREIGN KEY (current_lease_id) REFERENCES leases(id);

-- ============================================================
-- RENT ESCALATIONS
-- ============================================================
CREATE TABLE rent_escalations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lease_id            UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
    year_number         INTEGER NOT NULL,
    effective_date      DATE NOT NULL,
    rent_per_sqft       DECIMAL(8,4) NOT NULL,
    monthly_amount      DECIMAL(10,2) NOT NULL,
    notes               VARCHAR(255),
    UNIQUE(lease_id, year_number)
);

CREATE INDEX idx_rent_escalations_lease ON rent_escalations(lease_id);
CREATE INDEX idx_rent_escalations_date ON rent_escalations(effective_date);

-- ============================================================
-- COMMISSION INVOICES
-- ============================================================
CREATE TABLE commission_invoices (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lease_id                UUID NOT NULL REFERENCES leases(id),
    invoice_number          VARCHAR(20) NOT NULL UNIQUE,
    broker_contact_id       UUID NOT NULL REFERENCES contacts(id),
    payee_contact_id        UUID NOT NULL REFERENCES contacts(id),

    lease_term_months       INTEGER NOT NULL,
    monthly_rent            DECIMAL(10,2) NOT NULL,
    total_consideration     DECIMAL(12,2) NOT NULL,
    commission_rate_percent DECIMAL(5,2) NOT NULL,
    commission_amount       DECIMAL(12,2) NOT NULL,

    payee_name              VARCHAR(255),
    payee_address           VARCHAR(255),
    payee_city_state_zip    VARCHAR(255),
    payment_instructions    TEXT,

    status                  VARCHAR(20) NOT NULL DEFAULT 'draft',
    sent_date               DATE,
    due_date                DATE,
    paid_date               DATE,
    paid_amount             DECIMAL(12,2),
    payment_method          VARCHAR(50),
    payment_reference       VARCHAR(100),

    pdf_url                 VARCHAR(500),
    notes                   TEXT,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_lease ON commission_invoices(lease_id);
CREATE INDEX idx_invoices_status ON commission_invoices(status);

-- ============================================================
-- QR CODES
-- ============================================================
CREATE TABLE qr_codes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id         UUID NOT NULL REFERENCES properties(id),
    unit_id             UUID REFERENCES units(id),
    short_code          VARCHAR(20) NOT NULL UNIQUE,
    portal_url          VARCHAR(500) NOT NULL,
    qr_image_url        TEXT,
    is_active           BOOLEAN DEFAULT true,
    scan_count          INTEGER DEFAULT 0,
    last_scanned_at     TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_qr_codes_property ON qr_codes(property_id);
CREATE INDEX idx_qr_codes_short ON qr_codes(short_code);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id),
    type                VARCHAR(50) NOT NULL,
    title               VARCHAR(255) NOT NULL,
    message             TEXT NOT NULL,
    link_url            VARCHAR(500),
    read                BOOLEAN DEFAULT false,
    read_at             TIMESTAMPTZ,
    email_sent          BOOLEAN DEFAULT false,
    email_sent_at       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read) WHERE read = false;

-- ============================================================
-- AUDIT LOG
-- ============================================================
CREATE TABLE audit_log (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES users(id),
    action              VARCHAR(50) NOT NULL,
    entity_type         VARCHAR(30) NOT NULL,
    entity_id           UUID NOT NULL,
    old_value           JSONB,
    new_value           JSONB,
    ip_address          INET,
    user_agent          TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_created ON audit_log(created_at);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_properties_updated_at BEFORE UPDATE ON properties FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_units_updated_at BEFORE UPDATE ON units FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_applications_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_lois_updated_at BEFORE UPDATE ON lois FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_leases_updated_at BEFORE UPDATE ON leases FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_commission_invoices_updated_at BEFORE UPDATE ON commission_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();

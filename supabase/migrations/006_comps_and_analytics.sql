-- Rocket Realty Deal Flow Portal — Comps & Analytics
-- Migration 006: Comparable transactions table and property view tracking

-- ============================================================
-- COMPARABLE TRANSACTIONS (Comps)
-- ============================================================
CREATE TABLE comparable_transactions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id         UUID REFERENCES properties(id),
    address             VARCHAR(255) NOT NULL,
    city                VARCHAR(100) NOT NULL,
    state               VARCHAR(2) DEFAULT 'CA',
    property_type       VARCHAR(50),
    transaction_type    VARCHAR(20) NOT NULL,  -- 'lease', 'sale'
    transaction_date    DATE NOT NULL,
    tenant_name         VARCHAR(255),
    sf                  INTEGER,
    rent_per_sqft       DECIMAL(8,4),
    monthly_rent        DECIMAL(10,2),
    lease_term_months   INTEGER,
    sale_price          DECIMAL(15,2),
    price_per_sqft      DECIMAL(8,2),
    cap_rate            DECIMAL(5,2),
    notes               TEXT,
    source              VARCHAR(100),  -- 'internal', 'costar', 'manual'
    created_by          UUID REFERENCES contacts(id),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comps_city ON comparable_transactions(city);
CREATE INDEX idx_comps_type ON comparable_transactions(transaction_type);
CREATE INDEX idx_comps_date ON comparable_transactions(transaction_date);

ALTER TABLE comparable_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY comps_select ON comparable_transactions FOR SELECT USING (public.is_broker_or_admin());
CREATE POLICY comps_insert ON comparable_transactions FOR INSERT WITH CHECK (public.is_broker_or_admin());
CREATE POLICY comps_update ON comparable_transactions FOR UPDATE USING (public.is_broker_or_admin());
CREATE POLICY comps_delete ON comparable_transactions FOR DELETE USING (public.is_broker_or_admin());

-- ============================================================
-- PROPERTY VIEW TRACKING (Analytics)
-- ============================================================
CREATE TABLE property_views (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    source          VARCHAR(20),  -- 'qr_scan', 'browse', 'direct'
    viewer_ip       VARCHAR(45),
    user_agent      TEXT,
    viewed_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_views_property ON property_views(property_id);
CREATE INDEX idx_views_date ON property_views(viewed_at);

ALTER TABLE property_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY views_select ON property_views FOR SELECT USING (public.is_broker_or_admin());
CREATE POLICY views_insert ON property_views FOR INSERT WITH CHECK (true);  -- public can create views

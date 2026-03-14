CREATE TABLE inspection_slots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    unit_id         UUID REFERENCES units(id),
    broker_id       UUID NOT NULL REFERENCES contacts(id),
    start_time      TIMESTAMPTZ NOT NULL,
    end_time        TIMESTAMPTZ NOT NULL,
    is_available    BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE inspection_bookings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_id         UUID NOT NULL REFERENCES inspection_slots(id) ON DELETE CASCADE,
    property_id     UUID NOT NULL REFERENCES properties(id),
    contact_name    VARCHAR(255) NOT NULL,
    contact_email   VARCHAR(255) NOT NULL,
    contact_phone   VARCHAR(20),
    company_name    VARCHAR(255),
    message         TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'confirmed',  -- confirmed, cancelled, completed, no_show
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_slots_property ON inspection_slots(property_id);
CREATE INDEX idx_slots_time ON inspection_slots(start_time);
CREATE INDEX idx_bookings_slot ON inspection_bookings(slot_id);
CREATE INDEX idx_bookings_email ON inspection_bookings(contact_email);

-- RLS
ALTER TABLE inspection_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_bookings ENABLE ROW LEVEL SECURITY;

-- Broker/admin can manage slots
CREATE POLICY slots_select ON inspection_slots FOR SELECT USING (
    public.is_broker_or_admin() OR is_available = true
);
CREATE POLICY slots_insert ON inspection_slots FOR INSERT WITH CHECK (public.is_broker_or_admin());
CREATE POLICY slots_update ON inspection_slots FOR UPDATE USING (public.is_broker_or_admin());
CREATE POLICY slots_delete ON inspection_slots FOR DELETE USING (public.is_broker_or_admin());

-- Public can book (insert), broker can manage all
CREATE POLICY bookings_select ON inspection_bookings FOR SELECT USING (public.is_broker_or_admin());
CREATE POLICY bookings_insert ON inspection_bookings FOR INSERT WITH CHECK (true);
CREATE POLICY bookings_update ON inspection_bookings FOR UPDATE USING (public.is_broker_or_admin());

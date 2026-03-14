-- Seed data: RSD Commercentre property and units
-- Source: Rocket Realty rent roll

-- Property: RSD Commercentre
INSERT INTO properties (
    id, name, address, city, state, zip, county,
    property_type, total_sf, year_built, zoning,
    parking_spaces, power, clear_height_ft,
    dock_high_doors, grade_level_doors,
    primary_leasing_company, description, is_active
) VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'RSD Commercentre',
    '2820 Via Orange Way',
    'Spring Valley',
    'CA',
    '91978',
    'San Diego',
    'industrial',
    NULL, -- total_sf to be calculated from units
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    0,
    0,
    'Rocket Realty',
    'Multi-tenant industrial/commercial complex in Spring Valley, San Diego East County.',
    true
);

-- Units (suites) — from rent roll
-- Status: occupied for leased units, vacant for available
INSERT INTO units (property_id, suite_number, sf, unit_type, status, monthly_rent, rent_per_sqft) VALUES
('a0000000-0000-0000-0000-000000000001', 'A', 2721, 'industrial', 'vacant', NULL, NULL),
('a0000000-0000-0000-0000-000000000001', 'B', 2721, 'industrial', 'occupied', NULL, NULL),
('a0000000-0000-0000-0000-000000000001', 'C', 2721, 'industrial', 'occupied', NULL, NULL),
('a0000000-0000-0000-0000-000000000001', 'D', 2721, 'industrial', 'occupied', NULL, NULL),
('a0000000-0000-0000-0000-000000000001', 'E', 2721, 'industrial', 'occupied', NULL, NULL),
('a0000000-0000-0000-0000-000000000001', 'F', 2721, 'industrial', 'occupied', NULL, NULL),
('a0000000-0000-0000-0000-000000000001', 'G', 2721, 'industrial', 'occupied', NULL, NULL),
('a0000000-0000-0000-0000-000000000001', 'H', 2721, 'industrial', 'occupied', NULL, NULL);

-- Landlord contact for RSD Commercentre
INSERT INTO contacts (
    id, type, company_name, first_name, last_name, notes
) VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'landlord',
    NULL,
    NULL,
    NULL,
    'RSD Commercentre property owner. Details to be filled during onboarding.'
);

-- Broker contact: Rocket Glass
INSERT INTO contacts (
    id, type, company_name, first_name, last_name, email, notes
) VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'broker',
    'Rocket Realty',
    'Rocket',
    'Glass',
    NULL,
    'CCIM. Primary broker for RSD Commercentre and all Rocket Realty deals.'
);

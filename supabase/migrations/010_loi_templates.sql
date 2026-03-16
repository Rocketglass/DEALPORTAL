-- Rocket Realty Deal Flow Portal — LOI Templates
-- Migration 010: Pre-defined LOI section templates by property type

CREATE TABLE IF NOT EXISTS loi_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,                    -- e.g. "Industrial Lease", "Retail Lease"
  property_type TEXT NOT NULL,           -- industrial, retail, office, flex
  description TEXT,                      -- short description of when to use
  sections JSONB NOT NULL DEFAULT '[]',  -- array of { section_key, section_label, display_order, default_value }
  is_default BOOLEAN DEFAULT false,      -- one default per property_type
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed initial templates
INSERT INTO loi_templates (name, property_type, description, is_default, sections) VALUES
('Standard Industrial Lease', 'industrial', 'Standard terms for industrial/warehouse space', true, '[
  {"section_key": "base_rent", "section_label": "Base Rent", "display_order": 1, "default_value": "$X.XX per SF per month, NNN"},
  {"section_key": "term", "section_label": "Lease Term", "display_order": 2, "default_value": "36 months"},
  {"section_key": "tenant_improvements", "section_label": "Tenant Improvements", "display_order": 3, "default_value": "Landlord to provide $X.XX per SF TI allowance"},
  {"section_key": "cam", "section_label": "CAM / Operating Expenses", "display_order": 4, "default_value": "Tenant responsible for pro-rata share of CAM, insurance, and property taxes (NNN)"},
  {"section_key": "security_deposit", "section_label": "Security Deposit", "display_order": 5, "default_value": "First and last month rent"},
  {"section_key": "agreed_use", "section_label": "Permitted Use", "display_order": 6, "default_value": "General industrial, warehousing, and distribution"},
  {"section_key": "parking", "section_label": "Parking", "display_order": 7, "default_value": "X spaces per 1,000 SF, unreserved"},
  {"section_key": "options", "section_label": "Renewal Options", "display_order": 8, "default_value": "One (1) option to renew for 36 months at fair market value"},
  {"section_key": "escalations", "section_label": "Rent Escalations", "display_order": 9, "default_value": "3% annual increase"},
  {"section_key": "free_rent", "section_label": "Free Rent", "display_order": 10, "default_value": "None"}
]'::jsonb),
('Standard Retail Lease', 'retail', 'Standard terms for retail/storefront space', true, '[
  {"section_key": "base_rent", "section_label": "Base Rent", "display_order": 1, "default_value": "$X.XX per SF per month, NNN"},
  {"section_key": "term", "section_label": "Lease Term", "display_order": 2, "default_value": "60 months"},
  {"section_key": "tenant_improvements", "section_label": "Tenant Improvements", "display_order": 3, "default_value": "Landlord to provide vanilla shell; Tenant to build out at own expense"},
  {"section_key": "cam", "section_label": "CAM / Operating Expenses", "display_order": 4, "default_value": "Tenant responsible for pro-rata share of CAM, insurance, and property taxes (NNN)"},
  {"section_key": "security_deposit", "section_label": "Security Deposit", "display_order": 5, "default_value": "First and last month rent plus $X,XXX"},
  {"section_key": "agreed_use", "section_label": "Permitted Use", "display_order": 6, "default_value": "Retail sales of [specific use]"},
  {"section_key": "parking", "section_label": "Parking", "display_order": 7, "default_value": "X spaces per 1,000 SF, shared common area"},
  {"section_key": "options", "section_label": "Renewal Options", "display_order": 8, "default_value": "Two (2) options to renew for 60 months each at fair market value"},
  {"section_key": "escalations", "section_label": "Rent Escalations", "display_order": 9, "default_value": "3% annual increase or CPI, whichever is greater"},
  {"section_key": "free_rent", "section_label": "Free Rent", "display_order": 10, "default_value": "First month free upon lease execution"}
]'::jsonb),
('Standard Office Lease', 'office', 'Standard terms for office space', true, '[
  {"section_key": "base_rent", "section_label": "Base Rent", "display_order": 1, "default_value": "$X.XX per SF per month, Full Service Gross"},
  {"section_key": "term", "section_label": "Lease Term", "display_order": 2, "default_value": "36 months"},
  {"section_key": "tenant_improvements", "section_label": "Tenant Improvements", "display_order": 3, "default_value": "Landlord to provide $X.XX per SF TI allowance"},
  {"section_key": "cam", "section_label": "CAM / Operating Expenses", "display_order": 4, "default_value": "Full service gross — Landlord responsible for all operating expenses"},
  {"section_key": "security_deposit", "section_label": "Security Deposit", "display_order": 5, "default_value": "One month rent"},
  {"section_key": "agreed_use", "section_label": "Permitted Use", "display_order": 6, "default_value": "General office use"},
  {"section_key": "parking", "section_label": "Parking", "display_order": 7, "default_value": "X spaces per 1,000 SF in shared garage"},
  {"section_key": "options", "section_label": "Renewal Options", "display_order": 8, "default_value": "One (1) option to renew for 36 months at 95% of fair market value"},
  {"section_key": "escalations", "section_label": "Rent Escalations", "display_order": 9, "default_value": "3% annual increase"},
  {"section_key": "free_rent", "section_label": "Free Rent", "display_order": 10, "default_value": "None"}
]'::jsonb),
('Short Term / Flex Lease', 'flex', 'Short-term or flex space agreements', true, '[
  {"section_key": "base_rent", "section_label": "Base Rent", "display_order": 1, "default_value": "$X.XX per SF per month, NNN"},
  {"section_key": "term", "section_label": "Lease Term", "display_order": 2, "default_value": "12 months"},
  {"section_key": "tenant_improvements", "section_label": "Tenant Improvements", "display_order": 3, "default_value": "As-is condition; no TI allowance"},
  {"section_key": "cam", "section_label": "CAM / Operating Expenses", "display_order": 4, "default_value": "Tenant responsible for pro-rata share of CAM (NNN)"},
  {"section_key": "security_deposit", "section_label": "Security Deposit", "display_order": 5, "default_value": "First and last month rent"},
  {"section_key": "agreed_use", "section_label": "Permitted Use", "display_order": 6, "default_value": "Light industrial, warehousing, or flex use"},
  {"section_key": "parking", "section_label": "Parking", "display_order": 7, "default_value": "As available"},
  {"section_key": "options", "section_label": "Renewal Options", "display_order": 8, "default_value": "Month-to-month option after initial term"},
  {"section_key": "escalations", "section_label": "Rent Escalations", "display_order": 9, "default_value": "None during initial term"},
  {"section_key": "free_rent", "section_label": "Free Rent", "display_order": 10, "default_value": "None"}
]'::jsonb);

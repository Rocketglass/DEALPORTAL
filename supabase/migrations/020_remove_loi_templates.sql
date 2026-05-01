-- Rocket Realty Portal — Remove the seeded LOI property-type templates.
--
-- Per Rocket's 2026-05-01 feedback: he doesn't use the Industrial / Retail /
-- Office / Flex templates and finds them clutter on the LOI builder. He
-- wants only the "Blank LOI" option. With zero rows in this table, the LOI
-- builder's template picker UI auto-hides (it has a `templates.length > 0`
-- guard) and every new LOI starts blank — which still applies the rule-based
-- defaults from the unit/application data.
--
-- The `loi_templates` table itself is left in place so user-created custom
-- templates can be added later if Rocket changes his mind.

DELETE FROM loi_templates
WHERE name IN (
  'Standard Industrial Lease',
  'Standard Retail Lease',
  'Standard Office Lease',
  'Short Term / Flex Lease'
);

import { describe, it, expect } from 'vitest';
import {
  getDefaultLoiSections,
  getMarketDefaults,
  type PropertyType,
} from '../defaults';

// ============================================================
// getDefaultLoiSections
// ============================================================

describe('getDefaultLoiSections', () => {
  const propertyTypes: PropertyType[] = ['industrial', 'retail', 'office', 'flex'];

  it.each(propertyTypes)('returns 10 sections for %s property type', (type) => {
    const sections = getDefaultLoiSections(type);
    expect(sections).toHaveLength(10);
  });

  it.each(propertyTypes)('every section has required fields for %s', (type) => {
    const sections = getDefaultLoiSections(type);
    for (const section of sections) {
      expect(section.sectionKey).toBeTruthy();
      expect(section.label).toBeTruthy();
      expect(section.defaultValue).toBeTruthy();
      expect(section.marketNote).toBeTruthy();
    }
  });

  it('includes all expected section keys', () => {
    const sections = getDefaultLoiSections('industrial');
    const keys = sections.map((s) => s.sectionKey);
    expect(keys).toContain('base_rent');
    expect(keys).toContain('term');
    expect(keys).toContain('tenant_improvements');
    expect(keys).toContain('cam');
    expect(keys).toContain('security_deposit');
    expect(keys).toContain('agreed_use');
    expect(keys).toContain('parking');
    expect(keys).toContain('options');
    expect(keys).toContain('escalations');
    expect(keys).toContain('free_rent');
  });

  it('applies sqft override', () => {
    const sections = getDefaultLoiSections('industrial', { sqft: 5000 });
    const parkingSection = sections.find((s) => s.sectionKey === 'parking');
    // Industrial parking ratio is 1.0 per 1000 SF, so 5000 SF = 5 spaces
    expect(parkingSection?.defaultValue).toContain('5');
  });

  it('applies monthlyRent override', () => {
    const sections = getDefaultLoiSections('office', { monthlyRent: 10000 });
    const rentSection = sections.find((s) => s.sectionKey === 'base_rent');
    expect(rentSection?.defaultValue).toContain('10,000');
  });

  it('applies termMonths override', () => {
    const sections = getDefaultLoiSections('retail', { termMonths: 36 });
    const termSection = sections.find((s) => s.sectionKey === 'term');
    expect(termSection?.defaultValue).toContain('years: 3');
  });
});

// ============================================================
// getMarketDefaults
// ============================================================

describe('getMarketDefaults', () => {
  it('returns valid structure for industrial', () => {
    const defaults = getMarketDefaults('industrial');
    expect(defaults.propertyType).toBe('industrial');
    expect(defaults.rentRange.low).toBeGreaterThan(0);
    expect(defaults.rentRange.high).toBeGreaterThan(defaults.rentRange.low);
    expect(defaults.camEstimate).toBeGreaterThan(0);
    expect(defaults.taxEstimate).toBeGreaterThan(0);
    expect(defaults.insuranceEstimate).toBeGreaterThan(0);
    expect(defaults.tiAllowance.low).toBeGreaterThan(0);
    expect(defaults.securityDepositMonths).toBeGreaterThan(0);
    expect(defaults.parkingRatio).toBeGreaterThan(0);
    expect(defaults.escalationRate).toBeGreaterThan(0);
    expect(defaults.standardTermMonths).toBeGreaterThan(0);
  });

  it('returns higher rent for retail than industrial', () => {
    const industrial = getMarketDefaults('industrial');
    const retail = getMarketDefaults('retail');
    expect(retail.rentRange.low).toBeGreaterThan(industrial.rentRange.low);
  });

  it('returns higher parking ratio for retail than industrial', () => {
    const industrial = getMarketDefaults('industrial');
    const retail = getMarketDefaults('retail');
    expect(retail.parkingRatio).toBeGreaterThan(industrial.parkingRatio);
  });

  it('returns data for all property types', () => {
    for (const type of ['industrial', 'retail', 'office', 'flex'] as PropertyType[]) {
      const defaults = getMarketDefaults(type);
      expect(defaults.propertyType).toBe(type);
    }
  });
});

import { z } from 'zod';

// ---------------------------------------------------------------------------
// LOI Section Keys (matches LoiSectionKey enum in database.ts)
// ---------------------------------------------------------------------------

export const loiSectionKeyEnum = z.enum([
  'base_rent',
  'term',
  'tenant_improvements',
  'cam',
  'security_deposit',
  'agreed_use',
  'parking',
  'options',
  'escalations',
  'free_rent',
  'other',
]);

export type LoiSectionKeyInput = z.infer<typeof loiSectionKeyEnum>;

// ---------------------------------------------------------------------------
// LOI Header
// ---------------------------------------------------------------------------

export const loiHeaderSchema = z.object({
  property_name: z.string().min(1, 'Property name is required'),
  suite: z.string().min(1, 'Suite is required'),
  tenant_name: z.string().min(1, 'Tenant name is required'),
  landlord_name: z.string().min(1, 'Landlord name is required'),
  broker_name: z.string().min(1, 'Broker name is required'),
});

export type LoiHeaderInput = z.infer<typeof loiHeaderSchema>;

// ---------------------------------------------------------------------------
// LOI Section
// ---------------------------------------------------------------------------

export const loiSectionSchema = z.object({
  section_key: loiSectionKeyEnum,
  proposed_value: z.string().min(1, 'Proposed value is required'),
});

export type LoiSectionInput = z.infer<typeof loiSectionSchema>;

// ---------------------------------------------------------------------------
// Full LOI Schema
// ---------------------------------------------------------------------------

export const loiSchema = z.object({
  header: loiHeaderSchema,
  sections: z
    .array(loiSectionSchema)
    .min(1, 'At least one section is required')
    .refine(
      (sections) => sections.some((s) => s.section_key === 'base_rent'),
      'A base rent section is required',
    )
    .refine(
      (sections) => sections.some((s) => s.section_key === 'term'),
      'A term section is required',
    ),
});

export type LoiInput = z.infer<typeof loiSchema>;

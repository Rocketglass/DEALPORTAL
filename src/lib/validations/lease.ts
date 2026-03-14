import { z } from 'zod';

// ---------------------------------------------------------------------------
// Lease Party
// ---------------------------------------------------------------------------

export const leasePartySchema = z.object({
  lessor_name: z.string().min(1, 'Lessor name is required'),
  lessee_name: z.string().min(1, 'Lessee name is required'),
  lessor_entity_type: z.string().optional(),
  lessee_entity_type: z.string().optional(),
});

export type LeasePartyInput = z.infer<typeof leasePartySchema>;

// ---------------------------------------------------------------------------
// Lease Premises
// ---------------------------------------------------------------------------

export const leasePremisesSchema = z.object({
  premises_address: z.string().min(1, 'Address is required'),
  premises_city: z.string().min(1, 'City is required'),
  premises_state: z
    .string()
    .min(1, 'State is required')
    .max(2, 'State must be a 2-character abbreviation'),
  premises_zip: z
    .string()
    .min(1, 'ZIP code is required')
    .regex(/^\d{5}(-\d{4})?$/, 'Must be a valid ZIP code'),
  premises_sf: z
    .number()
    .positive('Square footage must be positive'),
});

export type LeasePremisesInput = z.infer<typeof leasePremisesSchema>;

// ---------------------------------------------------------------------------
// Lease Term
// ---------------------------------------------------------------------------

export const leaseTermSchema = z
  .object({
    commencement_date: z
      .string()
      .min(1, 'Commencement date is required')
      .refine(
        (val) => !isNaN(Date.parse(val)),
        'Must be a valid date',
      ),
    expiration_date: z
      .string()
      .min(1, 'Expiration date is required')
      .refine(
        (val) => !isNaN(Date.parse(val)),
        'Must be a valid date',
      ),
    base_rent_monthly: z
      .number()
      .positive('Monthly rent must be positive'),
  })
  .refine(
    (data) => new Date(data.expiration_date) > new Date(data.commencement_date),
    {
      message: 'Expiration date must be after commencement date',
      path: ['expiration_date'],
    },
  );

export type LeaseTermInput = z.infer<typeof leaseTermSchema>;

// ---------------------------------------------------------------------------
// Full Lease Schema
// ---------------------------------------------------------------------------

export const leaseSchema = z.object({
  party: leasePartySchema,
  premises: leasePremisesSchema,
  term: leaseTermSchema,
});

export type LeaseInput = z.infer<typeof leaseSchema>;

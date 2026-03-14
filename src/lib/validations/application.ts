import { z } from 'zod';

// ---------------------------------------------------------------------------
// Business Information
// ---------------------------------------------------------------------------

export const businessInfoSchema = z.object({
  business_name: z
    .string()
    .min(2, 'Business name must be at least 2 characters'),
  business_type: z
    .string()
    .min(1, 'Business type is required'),
  business_entity_state: z
    .string()
    .length(2, 'State must be a 2-character abbreviation')
    .optional()
    .or(z.literal('')),
  agreed_use: z.string().optional(),
  years_in_business: z
    .number()
    .positive('Must be a positive number')
    .optional(),
  number_of_employees: z
    .number()
    .positive('Must be a positive number')
    .optional(),
});

export type BusinessInfoInput = z.infer<typeof businessInfoSchema>;

// ---------------------------------------------------------------------------
// Space Requirements
// ---------------------------------------------------------------------------

export const spaceRequirementsSchema = z.object({
  requested_sf: z
    .number()
    .positive('Square footage must be positive'),
  desired_term_months: z
    .number()
    .positive('Term must be positive'),
  desired_move_in: z
    .string()
    .min(1, 'Desired move-in date is required')
    .refine(
      (val) => !isNaN(Date.parse(val)),
      'Must be a valid date',
    ),
  desired_rent_budget: z
    .number()
    .positive('Rent budget must be positive'),
});

export type SpaceRequirementsInput = z.infer<typeof spaceRequirementsSchema>;

// ---------------------------------------------------------------------------
// Contact Information
// ---------------------------------------------------------------------------

export const contactInfoSchema = z
  .object({
    first_name: z.string().min(1, 'First name is required'),
    last_name: z.string().min(1, 'Last name is required'),
    email: z.string().email('Must be a valid email address'),
    phone: z
      .string()
      .regex(
        /^\+?[\d\s\-().]{7,20}$/,
        'Must be a valid phone number',
      ),
    guarantor_name: z.string().optional(),
    guarantor_phone: z.string().optional(),
    guarantor_email: z
      .string()
      .email('Must be a valid email address')
      .optional()
      .or(z.literal('')),
  });

export type ContactInfoInput = z.infer<typeof contactInfoSchema>;

// ---------------------------------------------------------------------------
// Full Application Schema
// ---------------------------------------------------------------------------

export const applicationSchema = businessInfoSchema
  .merge(spaceRequirementsSchema)
  .merge(contactInfoSchema);

export type ApplicationInput = z.infer<typeof applicationSchema>;

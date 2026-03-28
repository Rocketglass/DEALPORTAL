# Phase 4: General Application Flow - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Transform the tenant application from a property-specific form to a general application. QR codes lead to a general application page (not tied to one property). Tenants can select multiple properties of interest. Applications save progress so tenants can return later. Tenants submit from within the portal (authenticated).

</domain>

<decisions>
## Implementation Decisions

### Application Model
- The existing `/apply/[propertyId]` form becomes the foundation — refactor into a general application at `/apply` (no propertyId required)
- Add a "properties of interest" multi-select step that shows available properties/units
- Application can reference multiple properties via a junction table (application_properties)
- QR codes redirect to `/apply` instead of `/browse/{propertyId}` — property context is passed as a query param suggestion, not a lock
- Keep backward compatibility: if propertyId is in the URL, pre-select that property in the multi-select

### Save Progress
- The existing localStorage draft save already works — extend to also save server-side for authenticated tenants
- Unauthenticated tenants: localStorage only (current behavior)
- Authenticated tenants: save draft to database via API endpoint, sync on login

### Portal Submission
- Tenant must be logged in to submit (not just to browse/fill)
- If not logged in, prompt to create account or log in at the review step before final submit
- After submission, application appears in tenant's portal dashboard

### Claude's Discretion
- UI layout and styling decisions for the multi-property selector
- Draft sync strategy (optimistic vs. periodic)
- Whether to keep the property browse page as a separate discovery experience

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/(public)/apply/[propertyId]/page.tsx` — full 5-step application form with validation, file upload, localStorage draft save
- `src/app/(public)/browse/page.tsx` — property listing with cards
- `src/app/api/applications/route.ts` — POST endpoint for application submission
- `src/app/api/public/properties/[id]/route.ts` — public property data endpoint

### Established Patterns
- Multi-step form with progress stepper (5 steps: Business, Space, Contact, Documents, Review)
- localStorage draft persistence keyed by `rr_application_draft_{propertyId}`
- File upload with drag-and-drop zones, type/size validation
- Supabase Storage for document uploads with signed URLs

### Integration Points
- QR code redirect in `src/app/(public)/p/[shortCode]/page.tsx` — change portal_url target
- Application submission API — extend to handle multiple property references
- Tenant dashboard (Phase 5) — show submitted applications
- Database: `applications` table has `property_id` (currently required) — make nullable, add junction table

</code_context>

<specifics>
## Specific Ideas

- QR code should lead directly to the application form, not to a property browse page
- Application can be for multiple properties — tenant indicates interest, not commitment to one space
- Save progress must work: tenant can leave and come back

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

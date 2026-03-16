# Rocket Realty Deal Flow Portal — Client Handoff

**Client:** Rocket Glass, CCIM — Commercial Real Estate Broker, San Diego East County
**Prepared by:** SersweAI (neil@sersweai.com)
**Date:** March 15, 2026

---

## Portal Overview

The Rocket Realty Deal Flow Portal is a full-cycle commercial real estate deal management system. It handles every stage from property marketing through lease execution and commission collection. The portal serves three user types:

- **Broker (you):** Desktop-first dashboard for managing the entire deal pipeline — applications, LOIs, leases, DocuSign signatures, and commission invoices.
- **Prospective Tenants:** Mobile-first experience. Tenants scan a QR code at a property, browse available spaces, and submit applications with financial documents.
- **Landlords:** Occasional access to review and negotiate LOI terms section-by-section.

---

## Access

| Item | Details |
|------|---------|
| **Live URL** | https://rocket-realty-portal.vercel.app |
| **Admin Login** | neil@sersweai.com / RocketRealty2024! |
| **GitHub** | https://github.com/nb110240/rocket-realty-portal |
| **Supabase Dashboard** | Log in at https://supabase.com/dashboard (credentials provided separately) |
| **Vercel Dashboard** | Log in at https://vercel.com/dashboard (credentials provided separately) |

---

## Quick Start Guide

### 1. Dashboard Overview

After logging in, the dashboard shows:
- **Deal pipeline** with counts at each stage (application, LOI, lease, executed)
- **Vacancy intelligence** and property performance analytics
- **Recent activity** feed

### 2. Adding a Property

Navigate to **Properties** in the sidebar. Click **Add Property** and fill in the address, property type (Industrial, Retail, Office, Flex), and unit details. Once saved, the system automatically generates a **QR code** for each property that tenants can scan to view the listing and apply.

### 3. Reviewing Applications

When a tenant submits an application (via QR code scan or direct link), it appears under **Applications**. From the review screen you can:
- View uploaded financial documents (tax returns, bank statements, P&L, business license)
- Approve, reject, or request more information
- Use **bulk actions** to update multiple application statuses at once

### 4. Creating an LOI (Letter of Intent)

Navigate to **LOIs > New LOI**. The builder includes:
- **Templates** that auto-populate based on property type (Industrial, Retail, Office, Flex)
- Section-by-section editing for landlord negotiation
- Once sent, the landlord can review, counter, or agree to each section
- Print/PDF export available from the LOI detail page

### 5. Generating a Lease

From an agreed LOI, navigate to **Leases** and create a new lease. The lease generator pulls in terms from the LOI and allows final edits before sending for signatures.

### 6. Sending for DocuSign Signatures

From the lease detail page, click **Send for Signature**. The system:
1. Uploads the lease PDF to DocuSign
2. Routes it to the tenant (first), landlord (second), and broker (third) for signing
3. Tracks signing progress in real-time via webhooks (partially signed, fully executed)
4. Downloads and stores the executed PDF automatically once all parties sign

### 7. Commission Invoices

When a lease is fully executed (all DocuSign signatures complete), the system **automatically generates a commission invoice**. You can also create invoices manually. From the invoice detail page you can:
- Send the invoice to the payee via email
- Record payments (check, wire, ACH) with reference numbers
- Use **bulk actions** to update multiple invoice statuses
- Print/export to PDF

---

## Setup Items Requiring Client Action

### 1. Email Delivery (Resend)

**Current status:** The Resend API key is configured and emails are sending. However, without DNS verification on your domain, emails may land in spam.

**Action required:** Add the following DNS records to the `rocketrealty.com` domain (or whichever domain you want emails to come from):

| Record Type | Purpose |
|------------|---------|
| **TXT (SPF)** | Authorizes Resend to send email on behalf of your domain |
| **CNAME (DKIM)** | Cryptographic signature proving emails are authentic |
| **TXT (DMARC)** | Policy for handling unauthenticated email |

**Steps:**
1. Log into the Resend dashboard at https://resend.com/domains
2. Click **Add Domain** and enter your domain (e.g., `rocketrealty.com`)
3. Resend will display the exact DNS records to add
4. Log into your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.) and add those records
5. Return to Resend and click **Verify** — it may take up to 48 hours to propagate

**Current from address:** `notifications@rocketrealty.com` (configured via the `RESEND_FROM_EMAIL` environment variable)

### 2. DocuSign Integration

**Current status:** OAuth credentials (integration key, secret key, RSA private key, account ID) are configured. HMAC webhook verification is enabled in production.

**Action required:** If you haven't already, grant OAuth consent for the DocuSign integration:

1. Log into your DocuSign admin account at https://admin.docusign.com
2. Navigate to **Settings > Integrations > API and Keys**
3. Find the integration key for "Rocket Realty Portal"
4. Click **Review Consent** and authorize the application
5. Confirm the webhook (Connect) configuration:
   - **URL:** `https://rocket-realty-portal.vercel.app/api/webhooks/docusign`
   - **Events to subscribe:** `envelope-completed`, `recipient-completed`
   - **Security:** HMAC-SHA256 signature verification enabled

**Note:** The portal is currently pointed at the DocuSign **demo** environment (`demo.docusign.net`). When ready to go live, update the `DOCUSIGN_BASE_URL` environment variable in Vercel to `https://na4.docusign.net/restapi` (or your production region).

### 3. Broker Information (Placeholders to Replace)

The following placeholder values need to be replaced with your real information:

#### DRE License Number

- **Current placeholder:** `DRE #01234567`
- **File:** `src/app/(portal)/invoices/[id]/types.ts` — line 48
- **Action:** Replace `'DRE #01234567'` with your actual California DRE license number

#### Bank Account / Wire Instructions

- **Current placeholder:** Routing and account numbers show as `XXXXXXXXX`
- **File:** `src/lib/lease/commission.ts` — line 81
- **Action:** Replace the payment instructions block with your real details:
  - Business mailing address (currently "1234 Commercial Blvd, Suite 200, San Diego, CA 92101")
  - Bank name (currently "First Republic Bank")
  - Routing number
  - Account number

### 4. Custom Domain (Optional)

The portal currently runs at `rocket-realty-portal.vercel.app`. To use a custom domain (e.g., `portal.rocketrealty.com`):

1. In the **Vercel dashboard**, go to your project **Settings > Domains**
2. Add your custom domain (e.g., `portal.rocketrealty.com`)
3. At your domain registrar, add one of the following:
   - **CNAME record:** `portal` pointing to `cname.vercel-dns.com`
   - Or **A record** pointing to `76.76.21.21` (for apex domains)
4. In Vercel, update the following environment variables:
   - `NEXT_PUBLIC_APP_URL` = `https://portal.rocketrealty.com`
   - `NEXT_PUBLIC_PORTAL_URL` = `https://portal.rocketrealty.com`
5. **Important:** Also update the DocuSign Connect webhook URL to use the new domain
6. Redeploy the application after changing environment variables

### 5. Creating Additional User Accounts

To add new broker or admin accounts:

**Option A — Via Supabase Dashboard:**
1. Go to https://supabase.com/dashboard
2. Navigate to your project > **Authentication > Users**
3. Click **Add User** and fill in the email and password
4. The user can then log in at the portal URL

**Option B — Via the Registration Page:**
The portal includes a registration flow. Share the signup link with authorized users. New accounts may require admin approval depending on the role configuration.

---

## Feature Summary

| Feature | Description |
|---------|-------------|
| **Dashboard** | Analytics overview with deal pipeline, vacancy intelligence, and property performance metrics |
| **Property Management** | Add/edit properties and units with automatic QR code generation for each listing |
| **QR Code Marketing** | Each property gets a unique short-link and QR code; tenants scan to view and apply |
| **Application Intake** | Public-facing tenant application form with document uploads (tax returns, bank statements, P&L, business license) |
| **Application Review** | Broker review screen with document viewer, status management, and bulk actions |
| **LOI Builder** | Create Letters of Intent with property-type templates (Industrial, Retail, Office, Flex) and section-by-section negotiation |
| **Lease Generation** | Generate lease documents from agreed LOI terms with PDF output |
| **DocuSign Integration** | Send leases for e-signature with automatic routing (tenant, landlord, broker) and real-time status tracking |
| **Commission Invoices** | Auto-generated when leases execute; supports manual creation, payment tracking, and bulk status updates |
| **Email Notifications** | 11 notification types: application received, status update, LOI sent/countered/agreed, lease ready/executed, invoice sent, inspection booked, application reminders (standard + urgent) |
| **Automatic Follow-ups** | Daily cron job (9:00 AM) sends reminders for incomplete applications |
| **Shareable Deal Summaries** | Public deal summary pages for sharing lease details with stakeholders |
| **Comp Tracking** | Track comparable lease transactions for market analysis |
| **Print/PDF Export** | LOIs, invoices, and property sheets available as print-ready pages |
| **Audit Logging** | All significant actions (lease execution, status changes, etc.) are logged for compliance |

---

## Environment Variables

All environment variables are configured in the **Vercel dashboard** under your project's **Settings > Environment Variables**.

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (database, auth, storage) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key for client-side access |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key for server-side operations (webhooks, cron jobs) |
| `DOCUSIGN_INTEGRATION_KEY` | DocuSign OAuth integration key |
| `DOCUSIGN_SECRET_KEY` | DocuSign OAuth secret key |
| `DOCUSIGN_ACCOUNT_ID` | DocuSign account ID |
| `DOCUSIGN_BASE_URL` | DocuSign API base URL (`demo.docusign.net` for testing, production URL for live) |
| `DOCUSIGN_CONNECT_HMAC_SECRET` | HMAC secret for verifying DocuSign webhook signatures |
| `DOCUSIGN_RSA_PRIVATE_KEY` | RSA private key for DocuSign JWT authentication |
| `DOCUSIGN_USER_ID` | DocuSign user ID for JWT impersonation |
| `RESEND_API_KEY` | Resend API key for transactional email |
| `RESEND_FROM_EMAIL` | Sender email address (default: `notifications@rocketrealty.com`) |
| `NEXT_PUBLIC_APP_URL` | Public-facing application URL (used in email links, QR codes, etc.) |
| `NEXT_PUBLIC_PORTAL_URL` | Portal URL (typically same as APP_URL) |

**Security note:** Never share these values in plain text. They are stored securely in Vercel's encrypted environment variable storage.

---

## Architecture

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 16.1 (App Router) | Full-stack React framework with server components and API routes |
| **Database** | Supabase (PostgreSQL) | Relational database, row-level security, real-time subscriptions |
| **Auth** | Supabase Auth | User authentication and session management |
| **File Storage** | Supabase Storage | Document uploads (applications, executed leases) |
| **Email** | Resend | Transactional email delivery with logging |
| **E-Signatures** | DocuSign | Lease signing with webhook-based status tracking |
| **PDF Generation** | pdf-lib | Server-side PDF generation for leases and invoices |
| **QR Codes** | qrcode (npm) | Property listing QR code generation |
| **Charts** | Recharts | Dashboard analytics and data visualization |
| **Hosting** | Vercel (SFO region) | Deployment, serverless functions, cron jobs |
| **Validation** | Zod | Runtime type validation for API inputs |
| **Testing** | Vitest + Testing Library | Unit and component testing |

**Security headers** are configured via `vercel.json` and include HSTS, X-Frame-Options (DENY), Content-Type-Options (nosniff), and a restrictive Permissions-Policy.

**Cron jobs:** One scheduled task runs daily at 9:00 AM UTC — sends follow-up reminders for incomplete tenant applications.

---

## Support

For technical support, feature requests, or bug reports:

**SersweAI**
Neil Bajaj
neil@sersweai.com

This portal was built and delivered by SersweAI as part of the Rocket Realty automation engagement.

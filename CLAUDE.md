## Design Context

### Users
Three distinct user types with different contexts:
- **Broker (Rocket Glass, CCIM):** Power user. Desktop-first. Manages the full deal pipeline daily — reviews applications, drafts LOIs, sends leases, tracks commissions. Needs density and efficiency. Commercial real estate professional in San Diego East County.
- **Prospective Tenants:** Mobile-first. Arrive by scanning a QR code at a property on their phone. Need to browse the space, create an account, and submit a full application with financial documents. May not be tech-savvy. This is a business transaction — they need to feel confident their sensitive financial data is secure.
- **Landlords:** Occasional use. Log in to review and negotiate LOIs section-by-section. Need clarity on what requires their attention and what's already agreed.

### Brand Personality
**Professional, Trustworthy, Clean**

The portal handles sensitive business transactions — lease agreements, financial documents, commission invoices. The interface must inspire confidence. No playfulness, no trendy gradients, no unnecessary decoration. Every element earns its place.

Voice: Direct, clear, business-appropriate. No jargon-heavy language, but no oversimplification either. The user is a professional making financial decisions.

### Aesthetic Direction
- **Visual reference:** Stripe Dashboard — professional, clean tables and cards, excellent use of white space and subtle color, polished data presentation
- **Theme:** Light mode only. White backgrounds, subtle gray (`#f1f5f9`) for sections and cards on muted backgrounds
- **Typography:** Inter. Use weight and size for hierarchy, not color variety. Restrained use of the primary blue — headings, CTAs, active states, links. Body text in slate (`#0f172a`)
- **Shapes:** Rounded corners (`rounded-xl` for cards, `rounded-lg` for inputs and buttons). Subtle shadows (`shadow-sm`) for elevation. No hard borders unless separating content zones
- **Color:** Blue primary (`#1e40af`) used sparingly for actions and emphasis. Semantic colors for status (green/success, amber/warning, red/destructive). Avoid color overload — most of the interface should be white, light gray, and dark slate text
- **Icons:** Lucide React. 16-20px in UI elements, paired with text labels. Never icon-only for critical actions
- **Spacing:** Generous. Let content breathe. Match Stripe's comfort level — not cramped, not wasteful
- **Anti-references:** Avoid generic SaaS templates, overly colorful dashboards, dark themes, playful/startup aesthetics, excessive gradients or glassmorphism

### Design Principles
1. **Clarity over cleverness.** Every screen should be immediately understandable. A landlord logging in for the first time should know exactly what to do. No hidden navigation, no ambiguous icons, no mystery meat.
2. **Data density where it matters, breathing room everywhere else.** Tables and dashboards (broker view) can be information-dense. Tenant-facing forms and public pages should be spacious and guided.
3. **Trust through restraint.** This handles lease agreements and financial documents. A clean, understated interface signals professionalism. Flashy design signals the opposite.
4. **Mobile-native for tenants, desktop-optimized for brokers.** Tenant flows (QR scan → property → apply) must work flawlessly on a phone. Broker flows (dashboard, tables, LOI builder) are designed for desktop with responsive fallbacks.
5. **Progressive disclosure.** Don't overwhelm. Show what's needed now, reveal more on interaction. Multi-step forms over single-page walls. Expandable sections over everything-visible-at-once.

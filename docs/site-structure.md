# VisionLift IQ Site Structure

## Product name

**VisionLift IQ** is the recommended public name for the marketing site.

The name keeps the product clearly tied to optical growth while positioning it as a modern intelligence layer for the patient visit. It is easier to market than the internal working name, communicates commercial lift, and supports future expansion beyond a single intake form.

## Home page information architecture

The home page is structured as a single-page SaaS landing experience with anchored navigation:

1. **Hero**
   - Primary promise: turn intake answers into smarter optical sales.
   - Calls to action: schedule a demo and start a 30-day full-feature trial.
   - Trust strip: trial, $15 USD/month introductory price, optical retail focus.

2. **Outcomes**
   - Explains the business value for optical stores.
   - Focuses on earlier intent discovery, staff coaching, and manager/optometrist visibility.

3. **Workflow**
   - Shows the operational flow from guided intake to staff dashboard cues.
   - Frames the app as a practical visit-support system, not just a patient form.

4. **Pricing**
   - One-price SaaS offer.
   - Introductory price: **$15 USD per month** after a **30-day full-feature trial**.

5. **Compliance**
   - Plain-language privacy, terms, and responsible data posture summaries.
   - Marketing form warns against submitting patient health information.
   - Notes that production customers should finalize region-appropriate subscription, privacy, retention, and data-processing terms.

6. **Contact / Demo**
   - Demo request form for name, email, and practice details.
   - Requires explicit contact consent before submission.

## Regional compliance posture

The preview page includes practical compliance affordances suitable for a public SaaS marketing preview:

- Minimal demo-request data collection.
- Explicit consent before marketing contact submission.
- No patient health information requested or accepted through the marketing form.
- Visible privacy and terms summaries on the page.
- Frontend validation for contact fields, email format, and explicit contact consent.
- Backend contact submission remains on the existing stable `name`, `email`, and `message` contract during the backend freeze.

Before production launch, legal counsel should review final terms, privacy policy, regional retention requirements, data-processing addenda, and any health-data obligations for each supported operating region.

## Visual direction

The front page uses a light, polished optical SaaS theme inspired by the public Classic Visions brand direction without mirroring it:

- Clean white and soft sky backgrounds.
- Deep optical navy for credibility.
- Teal accents for clarity, care, and modern health technology.
- Coral conversion accents for calls to action.
- Rounded cards, glass-style panels, and dashboard-like preview elements for a premium SaaS feel.

## Deployment notes

The current implementation is a Vite single-page application suitable for a Vercel preview build. The home page does not require new client dependencies. The operable backend is intentionally left unchanged during the current freeze; see `docs/frontend-backend-split.md` for the recommended split strategy.

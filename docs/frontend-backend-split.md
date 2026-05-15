# Frontend / Backend Split Recommendation

## Current backend state

Development on the operable backend is intentionally frozen for now.

The current backend remains responsible for:

- Tenant-aware optical intake links and public intake submissions.
- Staff login, token refresh, logout, and authenticated app routing.
- CSR and admin dashboards for tracking patient sessions and outcomes.
- Existing contact submissions using the current `name`, `email`, and `message` fields.
- Existing Postgres migration flow through `server/db.js`.

No backend API contract, database schema, authentication flow, or intake workflow should be changed while this freeze is in place unless the change is required for security, data integrity, or production incident response.

## Recommended architecture

The best path is to keep the backend application stable and split the public marketing frontend into a separate deployable instance when the brand site starts changing quickly.

Recommended domain model:

- `visionliftiq.com` or similar `.com`: public marketing website, pricing, demo request, terms, privacy, and sales content.
- `app.visionliftiq.com` or similar `.app`: authenticated staff app, intake dashboard, admin tools, and operational workflows.
- `form.visionliftiq.com` or `intake.visionliftiq.com`: optional patient-facing intake entry point if the patient form needs a separate, locked-down surface later.

This gives the public website room to evolve without risking the operational backend. It also makes analytics, SEO, design iteration, and legal pages cleaner because the marketing site can be deployed independently.

## When to keep everything together

Keep the frontend and backend in this repository for the immediate preview if speed is the priority and the only current change is the public home page. This avoids CORS, cross-domain cookies, shared environment variables, deployment routing, and split-release coordination.

## When to split into a new repo

Split the marketing frontend into a new repo when at least one of these is true:

- The public site needs frequent design/content changes independent of backend releases.
- The `.com` marketing domain needs SEO pages, blog/content pages, legal pages, or analytics that should not ship with the app backend.
- A designer or Lovable-style workflow needs to iterate on the public website without touching server code.
- The operational app needs stricter release controls than the marketing site.

## Integration plan for a split

1. Keep the backend repository as the source of truth for the app and API.
2. Create a new marketing repository using Vite or Next.js.
3. Point the marketing domain to the marketing deployment.
4. Point the app domain or subdomain to this backend deployment.
5. Keep public contact/demo submission integration intentionally narrow:
   - Phase 1: marketing form emails or stores leads in a CRM without touching the backend.
   - Phase 2: if needed, expose a small `/api/contact` endpoint with rate limiting, validation, consent capture, and spam protection.
6. Keep patient intake links on the app/form domain so patient workflows are isolated from marketing-site experiments.

## Terms and privacy policy direction

The marketing site should eventually include full legal pages rather than only short inline summaries:

- `/terms`: subscription terms, trial terms, acceptable use, payment, cancellation, support, limitations, and governing terms.
- `/privacy`: contact data, account data, patient/intake data handling, retention, processors, regional rights, security, and contact method.
- `/data-processing` or a customer DPA: required if customers use the product in workflows involving regulated patient or health-related data.

Legal content should be reviewed before production launch. Until then, the preview should avoid promising full legal compliance beyond clear, practical privacy-aware behavior.

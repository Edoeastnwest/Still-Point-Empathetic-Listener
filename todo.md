# Project TODO

- [x] Build polished demo-only client enrollment landing and onboarding flow
- [x] Route signed-in enrolled clients directly to their profile dashboard
- [x] Add client profile dashboard with enrollment status and upcoming reservations
- [x] Add clear demo-only enrollment terms and nonrefundable $9.99 one-time fee language
- [x] Add demo enrollment confirmation/payment interaction without real payment processing
- [x] Add 30-minute session reservation flow with 1–4 units per reservation
- [x] Enforce one reservation of up to four 30-minute units within each rolling 12-hour period
- [x] Show booking availability and helpful empty/error states
- [x] Add automated/unit tests for enrollment and booking constraints
- [x] Visually verify desktop and mobile layouts
- [x] Require authentication before enrollment and persist enrollment state per authenticated user
- [x] Implement a true post-enrollment dashboard transition tied to authenticated state
- [x] Store booking creation time and enforce the rolling 12-hour rule against booking attempts
- [x] Implement explicit availability states and conflict-aware validation
- [x] Add enrollment-flow and future-reservation edge-case tests
- [x] Capture and review a mobile viewport screenshot
- [x] Sync enrollment state when authenticated user identity resolves or changes
- [x] Add an explicit slot availability model with taken-time conflict validation
- [x] Add automated coverage for sign-in-gated enrollment and returning-user dashboard state
- [x] Add automated coverage for unauthenticated enrollment gating and returning-user dashboard eligibility
- [x] Add a pure authenticated-dashboard eligibility check and tests for unauthenticated access prevention
- [x] Add a custom in-website notification center for client status updates
- [x] Add unread count, dismiss, and mark-all-read interactions
- [x] Connect notifications to enrollment, payment, and booking actions
- [x] Add tests for notification creation and read-state behavior
- [x] Verify notification layout on desktop and mobile
- [x] Add a notification event for payment or enrollment payment confirmation
- [x] Verify the notification center in an authenticated client state on desktop and mobile
- [x] Capture final desktop and mobile verification of the authenticated notification bell state

## Active implementation plan (2026-10-13)
- [x] Restore the demo booking price of $0.31/minute ($9.30 per 30-minute unit) plus the $1 per-unit fee, with a payment-confirmation gate before reservation submission.
- [x] Restore an authenticated `/admin` portal with role-gated booking inbox and actions to confirm requests or send booking updates/reminders.
- [x] Add database tables and tRPC procedures for enrollment, reservations, notification preferences, and client notifications; remove demo business-state dependence on localStorage.
- [x] Implement global overlap-aware slot availability and atomic booking conflict / rolling 12-hour validation on the server.
- [x] Add client-side notification preference controls and persist read/dismiss state through the database.
- [x] Generate and apply the additive database migration, then run typecheck, automated tests, build, and browser smoke checks.

Prototype notes: booking and enrollment payments are simulated only; no live processor is connected. Email delivery is not configured, so its controls are disabled rather than presenting a working email channel. Admin-issued reminders are sent on demand from `/admin` rather than scheduled automatically.

## Precision revision (2026-11-09)
- [x] Rebuild the shared responsive client/admin shell with mobile navigation, accessible controls, loading/retry states, skip navigation, and reliable sign-out feedback.
- [x] Expand the client dashboard with next-session overview, active/completed counts, session history filters, safe cancellation, and clear timezone-aware booking/payment summaries.
- [x] Expand `/admin` with operational summary cards, client search, status filters, pagination, booking detail, safe lifecycle actions, cancellation confirmation, and an accessible update/reminder composer.
- [x] Add a durable server-authoritative demo-payment ledger with per-user idempotency, stable pricing, booking references, and explicit no-live-payment copy.
- [x] Enforce legal booking state transitions and lock all availability-affecting writes; keep the rolling 12-hour rule strict after cancellation.
- [x] Persist and validate IANA booking time zones, including daylight-saving gaps and local half-hour alignment.
- [x] Enforce app-bound authenticated sessions and add regression coverage for cross-app tokens and empty display names.
- [x] Enforce notification reservation/actor references, explicitly report delivery suppression, and disable email controls because no email delivery is connected.
- [x] Add route-level lazy loading with branded accessible fallbacks. Production main entry is 416.74 kB raw / 128.78 kB gzip; client and admin screen chunks load independently.
- [x] Apply the reviewed additive `0002` migration with short MySQL foreign-key names and confirm schema generation/migration is up to date.
- [x] Pass `pnpm check`, all 17 tests across 6 files (including real-MySQL router/concurrency/isolation checks), `pnpm build`, and `git diff --check`.
- [x] Pass authenticated browser smoke tests for enrollment, multi-unit payment confirmation/submission, notification preferences, non-admin guarding, admin details/confirmation/update feedback, client cancellation/history, sign-out, and 404 recovery.
- [x] Verify 390px mobile client/admin pages and 1440px desktop admin have no horizontal overflow; check browser runtime errors (none) and stable-state axe WCAG A/AA scans (no violations in landing, enabled-payment, client-dashboard, and admin-inbox states).
- [x] Remove disposable QA user, enrollment, reservation, payment, preference, and notification fixtures after automated checks.

Current scope remains a functional prototype: enrollment and booking payments are simulated, email delivery is disabled, and reminders are admin-triggered rather than automatically scheduled. Real payment collection, staffed listener working hours, and automatic delivery infrastructure require a separate production integration phase; no claim of a fully production-certified service is made.

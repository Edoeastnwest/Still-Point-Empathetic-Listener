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

Prototype notes: booking and enrollment payments are simulated only; no live processor is connected. Email notification preferences are persisted but email delivery is not configured. Admin-issued reminders are sent on demand from `/admin` rather than scheduled automatically.

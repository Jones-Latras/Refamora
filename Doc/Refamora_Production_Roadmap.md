 # Refamora Production Roadmap

## Purpose

This roadmap converts the current Refamora prototype into a production plan with three release stages:

- **Beta**: stable internal or advisor testing build
- **Pilot**: controlled real-world rollout with a small user group
- **V1**: public production release

This version is based on a repo audit completed on **April 23, 2026**. It reflects what is already implemented in the app and Supabase project files, not just the original thesis plan.

## AI Agent Update Rule

Any AI agent updating this file should:

- change `[ ]` to `[x]` only when a checklist item is fully complete
- keep incomplete items unchecked even if they are partially done
- update the `Status:` line for each phase and workstream as progress changes
- keep the current-state notes aligned with the actual repo

## Release Status

- [ ] Beta phase completed
  Status: In Progress
- [ ] Pilot phase completed
  Status: Not Started
- [ ] V1 phase completed
  Status: Not Started

## Repo-Audited Current State

### Already Implemented

- Farmer and buyer role flows
- Email confirmation during sign-up
- Login, logout, session restore, password change in profile
- Listing creation, edit, delete, search, map discovery, and seller dashboard
- Inquiry messaging between buyer and seller
- Listing reports submission flow
- AI-assisted listing help, waste advice, search assist, inquiry assist, photo check, and listing moderation
- `listing_review_queue` and `listing_reports` tables as a base for moderation operations
- Basic offline detection, offline banners, and some cached image behavior
- AI event logging and analytics-oriented tables

### Partially Implemented

- Listing lifecycle exists, but only as `active`, `sold`, and `unavailable`
- Seller verification now has a first real workflow: seller submission, admin review states, document storage, and verified badge display, but production hardening and push delivery are still incomplete
- In-app notifications now exist for inquiry messages, seller replies, and verification decisions, but there is still no push provider, device token registration, or fallback delivery channel
- Moderation data exists in Supabase and a first admin moderation dashboard now exists, but the admin toolset is still limited to reports and AI review queue handling
- Product analytics now include a first marketplace admin summary for users, listings, views, inquiries, and top listing breakdowns, but analytics are still not yet deep enough for full pilot operations
- Zero-dependency unit tests and Beta config checks now exist, but there is still no integration suite or user-flow smoke coverage
- EAS build profiles, app and function environment templates, release and rollback runbooks, a dedicated production build plan, and Expo config checks now exist, but real staging or production validation and secret rollout are not finished
- Crash reporting now has a first in-app foundation through a global JS handler, render-error boundary reporting, and a Supabase-backed crash log, but there is still no third-party alerting or operational triage flow
- Buyer feed, map pins, buyer or seller request inboxes, listing detail, and conversation threads now reuse last-known snapshots offline, and inquiry or reply actions now queue locally for retry, but broader write actions still require live connectivity

### Confirmed Production Gaps

- No push notifications or fallback email or SMS notifications
- No complete admin suite for verification workflows, broader operations, or audit history
- No end-to-end reservation, handoff, or completion workflow
- No integration test suite or real user-flow smoke coverage yet
- No third-party crash alerting or production monitoring integration yet

## Immediate Production Risks Found In Repo

These are higher priority than cosmetic feature work and should be treated as roadmap blockers:

1. Admin moderation now has a basic in-app surface, but it still depends on the new admin role and RLS policies being applied in the real Supabase project.
2. Release profiles exist now, but staging and production secrets, migrations, and rollout steps are not fully documented.
3. JWT verification and safer Android network defaults were tightened in repo config, but they still need deployment validation in real environments.

## Delivery Principles

1. Finish operational trust and release safety before adding more marketplace surface area.
2. Build admin tools before expecting real pilot operations to scale.
3. Treat notifications, observability, and auth recovery as production foundations, not optional polish.
4. Do not label a phase complete unless its exit criteria are met in app behavior, backend behavior, and deployment workflow.

## Master Checklist

### Beta Master Checklist

- [ ] Marketplace stability hardening
  Status: Partial
- [ ] Authentication and account safety
  Status: Partial
- [ ] Admin moderation foundation
  Status: Partial
- [ ] Seller verification phase 1
  Status: Partial
- [ ] Notifications
  Status: Partial
- [ ] Testing and quality gates
  Status: Partial
- [ ] Release and environment setup
  Status: Partial
- [ ] Crash reporting
  Status: Partial
- [ ] Basic product analytics
  Status: Partial
- [ ] App version policy
  Status: Partial
- [ ] Better offline UX
  Status: Partial
- [ ] Admin audit log
  Status: Partial

### Pilot Master Checklist

- [ ] Transaction completion workflow
  Status: Not Started
- [ ] Fulfillment coordination
  Status: Partial
- [ ] Trust and reputation
  Status: Not Started
- [ ] Pilot operations dashboard
  Status: Not Started
- [ ] Saved searches with alerts
  Status: Partial
- [ ] Buyer wanted-material posts
  Status: Not Started
- [ ] SMS or email fallback notifications
  Status: Not Started
- [ ] Exportable pilot reports
  Status: Not Started
- [ ] Multi-image listings
  Status: Not Started

### V1 Master Checklist

- [ ] Payments or payment-adjacent workflow
  Status: Not Started
- [ ] Logistics and fulfillment expansion
  Status: Partial
- [ ] Production observability
  Status: Not Started
- [ ] Security and compliance hardening
  Status: Not Started
- [ ] Scale readiness
  Status: Not Started
- [ ] Regional expansion
  Status: Not Started
- [ ] Business buyer features
  Status: Not Started
- [ ] Price trend insights
  Status: Not Started
- [ ] Localization
  Status: Not Started
- [ ] Public help center and onboarding guides
  Status: Not Started

## Phase 1: Beta

### Goal

Ship a stable build for internal testing that can be installed repeatedly, used safely, and supported without manual database intervention for common issues.

### Workstream 1: Marketplace Stability

Status: Partial

Already present:

- core listing create and edit flows
- inquiry messaging
- listing reports
- offline-aware UI in several screens
- inquiry creation now reuses an existing buyer conversation for the same listing instead of inserting a duplicate request
- offline queued inquiries and replies now dedupe repeated pending actions instead of stacking identical retries
- listing image uploads now retry transient storage and timeout failures before surfacing an error to the seller

Still required:

- standardize timeout, empty, and retry UX across feed, map, listing detail, and inbox
- verify status changes for seller listings do not create stale buyer-side states
- review pagination and map loading behavior for larger data sets

Definition of done:

- publish, edit, report, contact-seller, and reply flows are stable under slow network conditions
- known duplicate-submit paths are blocked
- core screens have consistent loading, empty, and retry behavior

### Workstream 2: Authentication and Account Safety

Status: Partial

Already present:

- sign-up
- email confirmation step
- sign-in
- forgot-password request flow
- reset-password flow from email link
- password change from authenticated profile
- invalid-session cleanup and recovery

Still required:

- stronger password policy than current minimum-length behavior
- session-expired UX review across protected screens
- final verification that role-selection and callback flows behave correctly after email confirmation

Definition of done:

- a user can create, verify, recover, and secure an account without admin help
- expired or invalid sessions always return the user to a safe auth state

### Workstream 3: Admin Moderation Foundation

Status: Partial

Already present:

- `listing_reports` table and report submission flow
- `listing_review_queue` table from AI moderation
- AI moderation queue insertion for flagged or blocked listings
- admin role support in app routing and type model
- basic admin moderation dashboard for reports and AI review queue
- admin actions to review, dismiss, suspend, restore, and save admin notes
- migration for admin RLS access and moderation review metadata

Still required:

- apply and validate the new admin migration in the real Supabase project
- expand the admin surface beyond moderation into verification and broader operations
- add stronger role separation and access review for production hardening
- add admin audit history for sensitive actions

Definition of done:

- admins can manage flagged content through the product UI
- no moderation action requires manual database edits during Beta

### Workstream 4: Seller Verification Phase 1

Status: Partial

Current repo note:

- `seller_verification_requests` migration and storage bucket design now exist
- sellers can submit a verification request with a document upload
- admins can review requests in a dedicated verification screen with `pending`, `approved`, and `rejected` states
- approved sellers now display a verified badge in profile and buyer-facing listing UI

Required scope:

- apply and validate the new verification migration and storage policies in the real Supabase project
- add stronger document review guidance, audit visibility, and operational safeguards for admin actions
- notify sellers when verification status changes
- harden document requirements, rejection handling, and resubmission policy for production use

Definition of done:

- a seller can submit for review
- an admin can approve or reject
- approved sellers display a real trust indicator in buyer-facing UI

### Workstream 5: Notifications

Status: Partial

Current repo note:

- `user_notifications` migration and RLS-backed inbox now exist
- automatic in-app notifications are created for new buyer inquiries, seller replies, and seller verification approval or rejection
- unread notification badges now surface in app navigation and profile
- a dedicated notifications screen now lets users review and mark alerts as read

Required scope:

- push notification provider setup
- device token registration and storage
- add notification coverage for moderation actions and other production events
- in-app notification preference rules if needed

Definition of done:

- users reliably receive inquiry, reply, moderation, and verification updates without needing to open the app manually

### Workstream 6: Testing and Quality Gates

Status: Partial

Current repo note:

- `npm run test:unit` now runs automated unit checks for schema validation and Supabase dev URL normalization
- `npm run check:beta-config` now verifies key Beta production-hardening settings like `verify_jwt`, EAS profiles, and required migrations
- `npm run quality:beta` now bundles the current automated Beta quality gate

Required scope:

- expand unit tests for more service-layer logic
- integration tests for auth, listings, contact requests, and reports
- smoke tests for sign-up, sign-in, create listing, send inquiry, and reply
- lint included in release checklist and resolved enough to be enforceable

Definition of done:

- core flows are covered by automated checks and a repeatable pre-release checklist

### Workstream 7: Release and Environment Setup

Status: Partial

Current repo note:

- `eas.json` now exists with `development`, `staging`, and `production` build profiles
- `app.config.ts` now uses `APP_ENV` to set display name, bundle identifiers, and cleartext behavior
- cleartext traffic is now limited to development-only `http` Supabase usage
- Supabase function JWT verification is now enabled in `supabase/config.toml`
- environment templates now exist for development, staging, and production app builds
- function secret templates now exist for local, staging, and production Supabase Edge Function environments
- a release runbook now documents migration order, seed policy, and internal, staging, and production checklists
- a production build plan now defines build profiles, preflight checks, exact build commands, release gates, and release-record expectations
- a rollback runbook now documents app, function, and schema recovery steps for failed releases
- `npm run check:expo-config` now validates Expo config output for development, staging, and production scenarios
- `npm run check:production-build-plan` now verifies that the dedicated build-plan document still includes required release commands and gates
- `npm run check:release-readiness` now verifies the runbook, build plan, app and function env templates, and current migration references

Required scope:

- validate real staging and production app env plus function secret rollout against separate Supabase projects
- validate deployed AI functions with JWT enforcement enabled
- validate a real development build against local Supabase when `http` is used

Definition of done:

- staging and production builds are repeatable
- environment-specific secrets are documented and separated
- release settings are no longer production-unsafe by default

### Workstream 8: Observability, Analytics, Versioning, Offline, and Audit

Status: Partial

Already present:

- AI event logging
- basic offline detection and banners
- admin audit log migration, automatic database-backed audit entries, and a first admin audit log screen
- app runtime policy migration, environment-scoped minimum supported version reads, and a blocking version gate component now exist in the app shell
- client-side crash reporting foundation now exists through a global JS error handler, render crash capture, and a Supabase crash log table
- marketplace analytics now have a first admin screen covering users, listing inventory, views, inquiries, response rate, and top active listing breakdowns
- buyer feed, buyer map, buyer or seller request lists, listing detail, and conversation threads now reuse cached last-known snapshots offline instead of failing closed immediately
- offline inquiry and reply actions now queue locally and sync automatically when connectivity returns

Still required:

- external crash alerting or triage workflow
- deeper funnel and operations analytics for pilot-scale reporting
- operational seeding and validation of minimum supported versions per environment
- broader offline behavior review for profile edits and remaining write-heavy flows
- offline write-queue handling for non-messaging actions that still require connectivity

Definition of done:

- the team can detect crashes, track core usage, control outdated app versions, and review admin actions

### Beta Exit Criteria

- internal testers can complete sign-up, confirm email, create listing, send inquiry, reply, and report content without blocking defects
- admins can review reports and moderation items through UI
- seller verification requests are functional
- release builds can be created through a defined staging workflow
- the app has automated coverage for core flows
- obvious production-unsafe defaults have been removed

## Phase 2: Pilot

### Goal

Run Refamora with a small controlled user group and close the gap between inquiry-only coordination and real transaction completion.

### Pilot Workstreams

#### 1. Transaction Completion Workflow

Status: Not Started

- extend listing lifecycle to include `reserved`, `cancelled`, and completed handoff states
- convert inquiry threads into structured offer or reservation flows
- prevent overselling through quantity tracking
- add explicit completion confirmation

#### 2. Fulfillment Coordination

Status: Partial

Already present:

- listing-level `pickup`, `delivery`, and `both` options

Still required:

- pickup scheduling
- delivery scheduling
- meeting notes and handoff instructions
- completion confirmation from both sides

#### 3. Trust and Reputation

Status: Not Started

- post-transaction ratings or review summaries
- response-rate and completion-rate metrics
- visible trust indicators for buyers

#### 4. Pilot Operations Dashboard

Status: Not Started

- active users
- active listings
- inquiry-to-reservation conversion
- flagged-content queue size
- failed AI request visibility
- support issue intake

#### 5. Pilot Growth Features

Status: Mixed

- saved searches with alerts: Partial
- buyer wanted-material posts: Not Started
- SMS or email fallback notifications: Not Started
- exportable reports for partner evaluation: Not Started
- multi-image listings: Not Started

### Pilot Exit Criteria

- a pilot user group can move from listing to handoff completion inside the system
- admins can operate moderation, verification, and pilot support without database-only work
- pilot metrics are visible centrally
- trust signals reduce buyer uncertainty during real usage

## Phase 3: V1

### Goal

Launch a production-ready public release with repeatable operations, stronger trust controls, and enough infrastructure discipline to support public growth.

### V1 Workstreams

#### 1. Payments or Payment-Adjacent Workflow

Status: Not Started

Choose one before public launch:

- full in-app payment integration
- payment-assisted workflow with proof-of-payment and dispute logging
- documented no-payment policy with clear transaction logging and dispute handling

#### 2. Logistics and Fulfillment Expansion

Status: Partial

Already present:

- delivery support exists only as a listing preference

Still required:

- area coverage rules
- courier or partner workflow if applicable
- delivery status tracking where supported

#### 3. Production Observability

Status: Not Started

- monitoring dashboard
- error alerting
- function health checks
- backup and restore procedure
- incident response checklist

#### 4. Security and Compliance Hardening

Status: Not Started

- admin role separation and least privilege
- secure handling of verification documents
- abuse rate limiting across high-risk flows
- spam and fraud response procedures
- privacy and retention policy

#### 5. Scale Readiness

Status: Not Started

- feed, map, and messaging performance review
- query and index optimization
- background job strategy for notifications and cleanups
- AI and storage cost planning

#### 6. Expansion Features

Status: Not Started

- regional expansion
- business buyer workflows
- price trend insights
- localization for English and Filipino
- public onboarding and help content

### V1 Exit Criteria

- normal production operations do not depend on manual engineering intervention
- transaction, moderation, verification, and support workflows are fully usable
- monitoring, backup, and security processes are documented and tested
- public deployment is repeatable and supportable

## Recommended Build Order

### Sequence

1. Release and environment setup
2. Authentication recovery and account safety
3. Admin moderation foundation
4. Seller verification phase 1
5. Notifications
6. Testing and quality gates
7. Transaction completion workflow
8. Fulfillment coordination
9. Trust and reputation
10. Payments or payment-adjacent workflow

### Why This Order

- The repo already has moderation data, so admin tooling can be built quickly and removes operational risk fast.
- Production-unsafe config should be fixed before broader testing.
- Notifications and auth recovery directly improve usability of the existing messaging workflow.
- Transaction and fulfillment work should come before expansion features because they define whether Refamora is a real marketplace or only a discovery tool.

## Features To Defer Until Core Readiness

These should not block Beta:

- advanced AI recommendation features
- promotions or referral systems
- social marketplace features
- deep personalization
- complex price intelligence

## Success Metrics By Phase

### Beta

- listing publish success rate
- inquiry send success rate
- reply success rate
- crash-free sessions
- moderation resolution time
- recovery success rate for auth issues

### Pilot

- inquiry-to-reservation rate
- reservation-to-completion rate
- seller response time
- verified seller share
- support issue resolution time

### V1

- monthly active users
- completed transactions
- dispute rate
- trust and fulfillment score trends
- infrastructure uptime

## Final Recommendation

Refamora is no longer only a concept-stage prototype. The app already has meaningful marketplace and AI functionality, but the production gap is now mostly operational.

The highest-value path is:

- secure the release setup
- finish admin and trust tooling
- add notifications and account recovery
- then complete the transaction lifecycle

That path gives Refamora the best chance of moving from a strong thesis build to a system that can survive real users.

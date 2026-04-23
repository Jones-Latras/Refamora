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
  Status: Not Started
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
- Seller trust signals exist in UI copy, but real seller verification is still a placeholder
- Moderation data exists in Supabase, but there is no real admin dashboard yet
- Product analytics exist mainly for AI usage, not full marketplace analytics
- EAS build profiles and environment-aware app config now exist, but release automation and full secret separation are not finished

### Confirmed Production Gaps

- No forgot-password or reset-by-email flow yet
- No push notifications or fallback email or SMS notifications
- No admin UI for reports, moderation queue, or audit history
- No actual seller verification submission and approval workflow
- No end-to-end reservation, handoff, or completion workflow
- No automated unit, integration, or smoke test suite yet
- No crash reporting or production monitoring integration yet

## Immediate Production Risks Found In Repo

These are higher priority than cosmetic feature work and should be treated as roadmap blockers:

1. There is no admin-only operational surface even though moderation data is already being created.
2. There is no recovery path for users who forget their password.
3. Release profiles exist now, but staging and production secrets, migrations, and rollout steps are not fully documented.
4. JWT verification and safer Android network defaults were tightened in repo config, but they still need deployment validation in real environments.

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
  Status: Not Started
- [ ] Notifications
  Status: Not Started
- [ ] Testing and quality gates
  Status: Not Started
- [ ] Release and environment setup
  Status: Partial
- [ ] Crash reporting
  Status: Not Started
- [ ] Basic product analytics
  Status: Partial
- [ ] App version policy
  Status: Not Started
- [ ] Better offline UX
  Status: Partial
- [ ] Admin audit log
  Status: Not Started

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

Still required:

- harden image upload failure states and retry behavior
- standardize timeout, empty, and retry UX across feed, map, listing detail, and inbox
- prevent duplicate inquiry submission in all entry points
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
- password change from authenticated profile
- invalid-session cleanup and recovery

Still required:

- forgot-password request flow
- reset-password-from-email-link flow
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

Still required:

- admin-only dashboard for reports and moderation queue
- queue filtering by `pending`, `reviewed`, and resolution status
- admin actions to approve, reject, suspend, restore, and resolve reports
- admin notes field for review decisions
- role and policy review for admin-only access

Definition of done:

- admins can manage flagged content through the product UI
- no moderation action requires manual database edits during Beta

### Workstream 4: Seller Verification Phase 1

Status: Not Started

Current repo note:

- seller verification is explicitly a placeholder in profile and listing trust UI

Required scope:

- verification request table and storage design
- seller submission form for identity or proof documents
- admin review states: `pending`, `approved`, `rejected`
- verified badge display on profile and listing cards
- seller-facing status visibility

Definition of done:

- a seller can submit for review
- an admin can approve or reject
- approved sellers display a real trust indicator in buyer-facing UI

### Workstream 5: Notifications

Status: Not Started

Required scope:

- push notification provider setup
- device token registration and storage
- notifications for new inquiry, seller reply, moderation action, and verification result
- in-app notification preference rules if needed

Definition of done:

- new message and moderation events reliably notify the affected user

### Workstream 6: Testing and Quality Gates

Status: Not Started

Required scope:

- unit tests for service-layer logic
- integration tests for auth, listings, contact requests, and reports
- smoke tests for sign-up, sign-in, create listing, send inquiry, and reply
- lint included in release checklist

Definition of done:

- core flows are covered by automated checks and a repeatable pre-release checklist

### Workstream 7: Release and Environment Setup

Status: Partial

Current repo note:

- `eas.json` now exists with `development`, `staging`, and `production` build profiles
- `app.config.ts` now uses `APP_ENV` to set display name, bundle identifiers, and cleartext behavior
- cleartext traffic is now limited to development-only `http` Supabase usage
- Supabase function JWT verification is now enabled in `supabase/config.toml`
- env templates now include `APP_ENV`

Required scope:

- finish env separation for staging and production secrets
- validate deployed AI functions with JWT enforcement enabled
- verify development builds still work against local Supabase when `http` is used
- document migration and seed process for staging and production
- document release checklist for internal, staging, and production builds

Definition of done:

- staging and production builds are repeatable
- environment-specific secrets are documented and separated
- release settings are no longer production-unsafe by default

### Workstream 8: Observability, Analytics, Versioning, Offline, and Audit

Status: Partial

Already present:

- AI event logging
- basic offline detection and banners

Still required:

- crash reporting integration
- marketplace analytics beyond AI usage
- minimum supported app version policy
- admin audit log for sensitive actions
- broader offline behavior review for last-known feed and request states

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

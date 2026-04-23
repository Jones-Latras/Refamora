# Refamora Production Roadmap

## Purpose

This roadmap turns the current Refamora prototype into a staged delivery plan for:

- **Beta**: stable private testing build
- **Pilot**: limited real-world rollout in a controlled area or partner group
- **V1**: production-ready public release

The roadmap is based on the current app state:

- role-based farmer and buyer flows already exist
- listings, search, map discovery, inquiries, dashboards, and AI support are already implemented
- major production gaps still remain in transactions, trust, admin operations, notifications, testing, and deployment readiness

## AI Agent Progress Update Rule

Any AI agent updating this file should mark completed phases and completed checklist items by changing:

- `[ ]` to `[x]` for finished work
- phase status from `Not Started` to `In Progress` or `Completed`

If a phase is fully done, the AI agent should explicitly mark that phase as completed in the master checklist below.

## Master Checklist

### Phase Status

- [ ] Beta phase completed
  Status: Not Started
- [ ] Pilot phase completed
  Status: Not Started
- [ ] V1 phase completed
  Status: Not Started

### Beta Master Checklist

- [ ] Marketplace stability hardening
- [ ] Authentication and account safety
- [ ] Admin moderation foundation
- [ ] Seller verification phase 1
- [ ] Notifications
- [ ] Testing and quality gates
- [ ] Release and environment setup
- [ ] Crash reporting
- [ ] Basic product analytics
- [ ] App version policy
- [ ] Better offline UX
- [ ] Admin audit log

### Pilot Master Checklist

- [ ] Transaction completion workflow
- [ ] Fulfillment coordination
- [ ] Trust and reputation
- [ ] Pilot operations dashboard
- [ ] Saved searches with alerts
- [ ] Buyer "wanted materials" posts
- [ ] SMS or email fallback notifications
- [ ] Exportable pilot reports
- [ ] Multi-image listings

### V1 Master Checklist

- [ ] Payments or payment-adjacent workflow
- [ ] Logistics and fulfillment expansion
- [ ] Production observability
- [ ] Security and compliance hardening
- [ ] Scale readiness
- [ ] Regional expansion
- [ ] Business buyer features
- [ ] Price trend insights
- [ ] Localization
- [ ] Public help center and onboarding guides

## Roadmap Principles

1. Finish the core marketplace workflow before adding more AI-facing features.
2. Reduce trust and fraud risk before expanding to more users.
3. Build operational tooling before public scale.
4. Gate each phase with clear exit criteria.

## Current State Summary

### Already Strong

- Farmer listing creation and management
- Buyer feed, filters, location sorting, and map view
- Inquiry messaging between buyers and sellers
- Seller and buyer dashboards
- AI assistance for listing help, waste advice, search interpretation, photo checks, and moderation

### Main Gaps

- no end-to-end transaction workflow beyond inquiry and messaging
- no real admin dashboard yet
- seller verification is still a placeholder
- no push notification system
- no release pipeline or build configuration for production deployment
- no formal automated test suite
- no crash reporting or production observability stack

## Phase 1: Beta

### Goal

Ship a stable private build that is safe for internal testing and advisor or class demos, with fewer failure points and better operational control.

### Priority 0: Must Ship In Beta

#### 1. Marketplace Stability

- Harden listing creation, editing, image upload, and delete flows
- Add stronger empty, retry, and timeout handling across core screens
- Prevent duplicated inquiries and accidental double-submits
- Add basic optimistic UI only where rollback is safe

#### 2. Authentication and Account Safety

- Add email verification
- Add forgot-password and reset-password flow
- Add session-expired recovery UX everywhere auth can fail
- Enforce stronger password guidance and validation

#### 3. Admin Moderation Foundation

- Build a basic admin dashboard for:
  - flagged listings
  - blocked listings
  - AI moderation review queue
  - report status management
- Add admin actions:
  - approve
  - reject
  - suspend listing
  - restore listing

#### 4. Seller Verification Phase 1

- Replace the current placeholder with a real verification request flow
- Let sellers submit verification details and proof documents
- Add admin review states:
  - pending
  - approved
  - rejected
- Show a simple verified badge on approved seller profiles and listings

#### 5. Notifications

- Add push notifications for:
  - new inquiry
  - new message reply
  - listing flagged
  - verification approved or rejected

#### 6. Testing and Quality Gates

- Add unit tests for service-layer logic
- Add integration tests for key Supabase-backed flows
- Add smoke tests for:
  - sign up
  - sign in
  - create listing
  - send inquiry
  - reply to message
- Make lint pass part of the release checklist

#### 7. Release and Environment Setup

- Add `eas.json`
- Create separate `development`, `staging`, and `production` environment configs
- Remove production-unsafe settings such as unrestricted cleartext traffic
- Define migration and seed workflow for staging and production

### Priority 1: Should Ship In Beta

- Crash reporting
- Basic product analytics
- App version check and minimum supported version policy
- Better offline UX with cached last-known feed and retry states
- Audit log for admin actions

### Beta Exit Criteria

- Core buyer and farmer flows work without major blocking bugs
- Admin can review and resolve flagged content
- Seller verification requests are functional
- Notifications work for message and moderation events
- Staging build can be installed and tested repeatedly
- Core flows have automated coverage

## Phase 2: Pilot

### Goal

Run Refamora with a limited real user group and close the operational gaps in trust, fulfillment, and support.

### Priority 0: Must Ship In Pilot

#### 1. Transaction Completion Workflow

- Add structured listing lifecycle states:
  - active
  - reserved
  - sold
  - unavailable
  - cancelled
- Add inquiry conversion flow:
  - buyer makes offer or confirms intent
  - seller accepts
  - listing is reserved
  - handoff is confirmed
  - listing is completed
- Add quantity tracking to prevent overselling

#### 2. Fulfillment Coordination

- Add pickup scheduling
- Add delivery scheduling when listing supports delivery
- Add handoff instructions and meeting notes
- Add completion confirmation from both parties

#### 3. Trust and Reputation

- Add post-transaction ratings or review summaries
- Add seller response-rate and fulfillment-rate metrics
- Add trust indicators on listings:
  - verified seller
  - response time
  - completion history

#### 4. Pilot Operations

- Add pilot-only admin dashboard metrics:
  - active users
  - active listings
  - inquiry-to-sale conversion
  - flagged content count
  - failed AI requests
- Add support inbox or issue intake for pilot users

### Priority 1: Should Ship In Pilot

- Saved searches with alerts
- Buyer "wanted materials" posts
- SMS or email fallback for critical notifications
- Exportable reports for pilot evaluation
- Multi-image listings

### Pilot Exit Criteria

- Small real-world group can complete end-to-end listing-to-handoff flow
- Verification and moderation can be managed by admins without manual database work
- Pilot metrics can be tracked centrally
- Trust indicators reduce uncertainty for buyers
- Support issues can be triaged operationally

## Phase 3: V1

### Goal

Launch a production-ready public version with stronger scale, reliability, and commercial readiness.

### Priority 0: Must Ship In V1

#### 1. Payments or Payment-Adjacent Workflow

Choose one of these before broad launch:

- full in-app payment integration, or
- payment-assisted workflow with external settlement and in-app proof of payment, or
- explicit no-payment policy with strong transaction logging and dispute handling

#### 2. Logistics and Fulfillment Expansion

- Delivery partner or courier coordination
- Better route and area coverage handling
- Delivery status tracking where supported

#### 3. Production Observability

- Real monitoring dashboard
- Error alerting
- Edge function health monitoring
- Database backup and restore process
- SLA and incident response checklist

#### 4. Security and Compliance Hardening

- Admin role separation and least-privilege policies
- Sensitive document handling for verification uploads
- Rate limits across abuse-prone flows
- Abuse detection for spam, fraud, and repeated bad actors
- Privacy and retention policy for user and verification data

#### 5. Scale Readiness

- Performance profiling for feeds, maps, and messaging
- Query optimization and index review
- Background job strategy for notifications, cleanups, and reports
- Capacity planning for AI and storage costs

### Priority 1: Should Ship In V1

- Regional expansion to more waste categories and cities
- Business buyer features such as recurring sourcing needs
- Price trend insights
- Localization for English and Filipino
- Public help center and onboarding guides

### V1 Exit Criteria

- Refamora can support public users without manual engineering intervention for normal operations
- Admin, moderation, verification, and support workflows are fully usable
- Transaction and fulfillment paths are complete and understandable
- Observability, security, and backup processes are documented and tested
- Production deployment is repeatable

## Recommended Build Order

### Immediate Build Order

1. Admin dashboard
2. Seller verification flow
3. Notifications
4. Auth hardening
5. Testing and release pipeline
6. Transaction lifecycle
7. Fulfillment scheduling
8. Ratings and trust metrics
9. Payments and logistics expansion

### Why This Order

- Admin and verification reduce trust risk early
- Notifications make the current messaging workflow usable in real life
- Testing and release setup reduce regression risk before wider rollout
- Transaction lifecycle matters more than adding new discovery or AI features
- Payments should come after the operational flow is already clear

## Features To Defer Until After Core Readiness

These are useful, but should not block Beta:

- advanced AI recommendations
- marketplace promotions
- referral systems
- social features
- deep personalization
- complex pricing intelligence

## Success Metrics By Phase

### Beta

- listing publish success rate
- inquiry send success rate
- reply notification delivery rate
- crash-free sessions
- moderation resolution time

### Pilot

- inquiry-to-reservation rate
- reservation-to-completion rate
- seller response time
- verified seller share
- repeat buyer usage

### V1

- monthly active users
- completed transactions
- dispute rate
- trust and fulfillment scores
- infrastructure uptime

## Final Recommendation

Refamora should treat **Beta** as a stability and trust milestone, **Pilot** as an operational marketplace milestone, and **V1** as a scale and commercial-readiness milestone.

The most important shift from the current prototype is this:

- stop prioritizing new surface-level features first
- complete the transaction, admin, trust, notification, and release foundation first

That sequence gives Refamora the best path from an impressive thesis prototype to a usable real-world platform.

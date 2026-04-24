# Refamora Proposal-Ready Roadmap

## Purpose

This file is now a trimmed roadmap for one immediate goal:

- make Refamora credible, stable, and demo-ready for the project proposal presentation

It is not the full production roadmap anymore. Anything that does not materially improve the proposal demo, proposal defense, or installable presentation build is out of scope for now.

This version reflects the repo state as of **April 24, 2026**.

## AI Agent Update Rule

Any AI agent updating this file should:

- change `[ ]` to `[x]` only when a checklist item is fully complete
- keep incomplete items unchecked even if they are partially done
- update each `Status:` line when progress changes
- prefer presentation-critical stability over adding new surface area

## Proposal Readiness Status

- [ ] Proposal presentation build ready
  Status: In Progress

## What Must Be True Before Proposal

Refamora does not need full production scope before the proposal presentation.

It does need:

- a stable buyer demo flow
- a stable seller demo flow
- a visible trust and moderation story
- one installable build that works on the presentation device
- seeded demo data and test accounts that make the walkthrough predictable

It does not need yet:

- payments
- logistics scheduling
- SMS or email fallback
- full pilot analytics
- third-party observability stack
- public-launch security and scale work

## Current Strengths Already In Repo

- Farmer and buyer role flows exist
- Login, sign-up, email confirmation, session restore, forgot-password, reset-password, and password change flows exist
- Farmers can create, edit, and manage listings
- Buyers can browse listings through feed, map, and listing detail screens
- Buyers and sellers can message through inquiry threads
- Listing reports and AI moderation review queue flows exist
- Admin moderation dashboard exists
- Admin operations hub now includes direct moderation and seller verification review plus crash-visibility links
- Seller verification request and approval or rejection flow exists
- Verified seller badge is already visible in buyer-facing UI
- In-app notifications exist for inquiries, replies, and verification updates
- Better offline and retry behavior now exists across feed, map, listing detail, inboxes, and conversation flows
- EAS profiles, release runbooks, rollback notes, and proposal-relevant build docs already exist

## Proposal Blockers To Focus On

1. Demo flow confidence
   The buyer, seller, and admin walkthroughs still need final verification end to end.
2. Presentation build confidence
   The app still needs one known-good presentation build plus device-level smoke validation.
3. Demo data confidence
   The presentation will be weaker if listings, messages, verification states, and moderation examples are not pre-seeded and predictable.
4. Stability over extra features
   Remaining work should reduce demo risk, not expand scope.

## Master Checklist

### Must-Have Before Proposal

- [ ] Core buyer demo flow
  Status: Partial
- [ ] Core seller demo flow
  Status: Partial
- [ ] Trust and admin credibility flow
  Status: Partial
- [ ] Presentation build and device readiness
  Status: Partial
- [ ] Demo data and script preparation
  Status: Not Started
- [ ] Proposal support artifacts
  Status: Partial

## Workstream 1: Core Buyer Demo Flow

Status: Partial

Already present:

- buyer sign-up and sign-in
- feed browsing
- map browsing
- listing detail
- contact seller flow
- conversation thread
- notifications inbox

Still required before proposal:

- verify that a buyer can complete browse -> open listing -> send inquiry -> see reply without blocker defects
- verify seller listing status changes do not leave stale buyer-side states in feed, map, or listing detail
- verify seeded buyer demo account has clean, realistic data for presentation
- prepare one fallback buyer path if the live message loop fails during demo

Definition of done:

- a buyer can complete the main marketplace story in front of the panel without manual fixes

## Workstream 2: Core Seller Demo Flow

Status: Partial

Already present:

- seller sign-up and sign-in
- listing creation
- listing edit
- listing status changes
- seller inbox
- reply flow
- seller verification submission screen

Still required before proposal:

- verify create listing -> publish -> receive inquiry -> reply works with demo data and presentation accounts
- verify listing edit and status changes reflect correctly in buyer-facing screens
- prepare one seller account with a polished profile and at least one verified-looking listing
- verify the seller dashboard and inbox are clean enough for live walkthrough use

Definition of done:

- a seller can demonstrate listing management and buyer communication without visible instability

## Workstream 3: Trust and Admin Credibility Flow

Status: Partial

Already present:

- listing reports
- AI moderation review queue
- admin moderation dashboard
- admin crash reports screen
- seller verification review screen
- verified seller badge
- admin audit log screen

Still required before proposal:

- verify admin role, admin routing, and required RLS-backed flows work in the real demo environment
- prepare at least one realistic moderation example and one seller verification example
- verify an admin can review, dismiss, suspend, restore, approve, and reject without manual SQL intervention during demo
- make sure the trust story is easy to explain in the proposal narrative

Definition of done:

- the panel can clearly see that Refamora is not just listing CRUD and includes governance and trust controls

## Workstream 4: Presentation Build and Device Readiness

Status: Partial

Already present:

- EAS profiles
- app env templates
- function env templates
- release runbook
- rollback runbook
- production build plan
- Expo config checks
- Beta quality gate scripts

Still required before proposal:

- produce one known-good presentation build
- validate that build on the actual presentation device or a matching backup device
- confirm login, feed, listing detail, messaging, admin, and verification screens open in the build
- confirm Supabase project, migrations, storage buckets, and admin role setup match the demo script
- freeze nonessential feature work once the presentation build is stable

Definition of done:

- the app can be installed and demonstrated reliably on presentation day

## Workstream 5: Demo Data and Script Preparation

Status: Not Started

Required scope:

- create one buyer demo account
- create one seller demo account
- create one admin demo account
- seed realistic listings with clean titles, images, prices, quantities, and locations
- prepare at least one open inquiry thread and one replied thread
- prepare at least one reported listing and one verification request for admin walkthrough
- write the exact demo order so the presenter is not improvising screen flow live

Definition of done:

- the presentation can follow a controlled walkthrough with predictable records and outcomes

## Workstream 6: Proposal Support Artifacts

Status: Partial

Already present:

- DBMS proposal draft
- build and release docs
- roadmap notes aligned to repo state

Still required before proposal:

- produce a strict presentation checklist
- align the proposal narrative to the actual demo flow
- prepare screenshots or fallback visuals for buyer, seller, and admin views
- prepare a short explanation of what is implemented now versus what is intentionally deferred

Definition of done:

- the proposal document, live demo, and spoken explanation all tell the same story

## Proposal Exit Criteria

- buyer demo flow works end to end
- seller demo flow works end to end
- admin moderation and verification can be shown credibly
- one stable build is ready for the presentation device
- demo accounts and seeded records are prepared
- the presenter has a fixed walkthrough and fallback plan

## Defer Until After Proposal

These are real future needs, but they should not block the proposal presentation:

- payments or payment-adjacent workflow
- fulfillment coordination and scheduling
- trust and reputation scores
- SMS or email fallback notifications
- pilot operations dashboard
- multi-image listings
- third-party crash alerting
- public-launch observability stack
- scale and compliance hardening

## Immediate Recommended Order

1. Verify buyer and seller end-to-end demo flows
2. Verify admin moderation and seller verification in the real demo environment
3. Prepare demo accounts and seeded records
4. Produce the presentation build and validate it on the device
5. Freeze scope and rehearse the proposal walkthrough

## Final Recommendation

For proposal presentation, Refamora should be treated as a polished, credible demo build, not a full production launch candidate.

The correct priority is:

- make the main user journeys stable
- make trust and admin features visible
- make the build reliable
- make the demo predictable

If those are solid, the proposal will read as focused and defensible even if broader production work remains unfinished.

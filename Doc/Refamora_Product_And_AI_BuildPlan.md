# Refamora Product Improvement And AI Build Plan

> Extension roadmap for the current Refamora mobile app.
> This complements the master checklist in `Doc/AgriWaste_BuildPlan (1).md`.

## Purpose

This document captures the next layer of work after the current marketplace MVP:

- product gaps that still need polish or stronger integration
- a practical build plan for those improvements
- a realistic AI strategy for Refamora
- the safest order to implement AI without breaking the core app

The goal is simple: keep Refamora useful as a real marketplace first, then use AI to improve quality, discovery, trust, and efficiency.

## Master Checklist

Status legend: `[x]` done, `[~]` in progress / partial, `[ ]` not started
Latest note: 2026-04-17 listing shares now preserve the intended listing route through login and role selection, so shared item links can return users to the exact listing after authentication.

### AI Phase 0 - Foundations

- [x] Add provider-agnostic AI entrypoints such as `supabase/functions/ai-listing-assist`
- [x] Add shared `aiService` interface in the backend
- [x] Add `localGemmaProvider` implementation
- [x] Add `geminiProvider` implementation
- [x] Add provider resolution logic with Local Gemma as primary
- [x] Add Gemini fallback toggle
- [x] Add provider health check and timeout handling
- [x] Add request auth checks by role
- [x] Add rate limiting and request logging
- [x] Add schemas for AI outputs using Zod
- [x] Add feature flagging so AI can be turned off safely
- [x] Add analytics for AI request volume, latency, and acceptance rate
- [x] Log which provider served each AI response

### AI Phase 1 - Listing Copilot

- [x] Add `Improve with AI` action in create listing flow
- [x] Accept title, description, waste type, quantity, and optional photo
- [x] Return structured suggestions
- [x] Keep all AI output editable before save
- [x] Add feedback buttons such as `use suggestion` and `not helpful`

### AI Phase 2 - Waste-To-Value Advisor

- [x] Add AI-generated value suggestions beside waste type selection
- [x] Show practical downstream uses and cautions
- [x] Keep suggestions short and educational
- [x] Add source strategy if later tied to curated domain content

### AI Phase 3 - Buyer Search Assistant

- [x] Add `Search with AI` entry point in buyer feed
- [x] Convert natural language to a structured filter object
- [x] Validate parsed filters before running actual queries
- [x] Show the interpreted filters back to the user before applying
- [x] Fall back to normal search if AI parsing fails

### AI Phase 4 - Photo Analysis And Moderation

- [x] Add `Check photo` before upload confirmation
- [x] Return image quality score and retake suggestions
- [x] Return likely waste category if confidence is high enough
- [x] Add moderation checks for text and image content
- [x] Add admin review queue for flagged listings

### AI Phase 5 - Messaging Support

- [x] Summarize inquiry threads for sellers
- [x] Draft editable reply suggestions
- [x] Highlight unanswered buyer questions

## Current Snapshot

### What already exists

- authentication with role-based routing
- farmer listing creation, editing, and management
- buyer feed, search, filters, map, and listing details
- contact request flow between buyer and seller
- shared profile editing
- image upload flow for avatars and listings
- dashboard-level UI polish on the main farmer and buyer surfaces

### What still needs improvement

- navigation still feels screen-by-screen instead of system-level
- some flows are functional but not yet hardened for edge cases
- discovery, trust, and post-contact workflow are still light
- there is no admin or operations layer yet
- AI can add real value, but only if it is implemented as an assistant layer rather than a replacement for business logic

## Product Priorities

### Priority 1: Reliability And Flow Completion

These are the highest-value non-AI improvements because they protect the core marketplace loop.

- [ ] Add full error boundary coverage with retry states
- [ ] Audit all submit flows for missing-field focus and scroll-to-error behavior
- [ ] Add offline banner and graceful offline handling for feed, map, and profile surfaces
- [ ] Add loading skeleton consistency across dashboards, profile, listing details, and requests
- [ ] Add empty-state copy that reflects real state, not generic fallback text
- [ ] Add stronger success feedback after create listing, update listing, send inquiry, and save profile
- [ ] Add image-upload failure handling with clearer size, type, and network messages
- [ ] Add soft session-expiry handling so users are not dropped into confusing auth states

### Priority 2: Navigation And Information Architecture

The app now has the right screens, but the movement between them still needs to feel more deliberate.

- [~] Standardize buyer navigation around `Home`, `Map`, `Requests`, and `Profile`
- [~] Standardize farmer navigation around `Home`, `Create`, `Listings`, `Requests`, and `Profile`
- [~] Replace one-off action buttons with clearer persistent navigation where possible
- [x] Add deep linking for listings so shared links open directly to the item
- [x] Add a share action on listing details
- [ ] Add a recently viewed pathway for buyers that is easy to revisit
- [ ] Reduce repeated headers and duplicated page titles across remaining screens

### Priority 3: Marketplace Trust And Profile Quality

Refamora will feel more credible when seller identity and listing quality are stronger.

- [ ] Add profile completion logic for both buyers and sellers with clear completion criteria
- [ ] Add public-facing seller trust indicators such as location, avatar, listing count, and response activity
- [ ] Add listing quality checks before publish
- [ ] Add stronger validation for phone, city, quantity, and price formats
- [ ] Add clear listing status chips: `active`, `sold`, `unavailable`, `draft`
- [ ] Add optional seller verification flow placeholder for future admin review
- [ ] Add reporting flow for suspicious or inaccurate listings

### Priority 4: Buyer Discovery And Conversion

The buyer side works, but it can become much more useful.

- [ ] Improve search relevance and filter persistence
- [ ] Add distance-aware browsing from buyer location
- [ ] Add a clearer `List / Map` browsing toggle
- [ ] Add saved filters or favorites
- [x] Add contact request status states such as `sent`, `seen`, `responded`
- [ ] Add richer listing details: distance, posted age, seller activity, clearer map preview
- [ ] Add related listings section on listing details

### Priority 5: Farmer Operations

The seller flow should help farmers act faster with less friction.

- [ ] Add draft listings so incomplete forms do not block progress
- [ ] Add duplicate listing action for recurring waste types
- [ ] Add listing performance summary such as views and inquiries
- [ ] Add inquiry inbox grouping by listing
- [ ] Add activity timeline per listing
- [ ] Add bulk status actions for older listings
- [ ] Add lightweight reminders for stale listings or incomplete profiles

### Priority 6: Admin, Analytics, And Governance

These are not user-facing first, but they matter before scale.

- [ ] Add admin dashboard requirements document
- [ ] Add basic analytics events for sign-in, listing create, inquiry send, and profile completion
- [ ] Add content moderation workflow for listing text and listing photos
- [ ] Add audit logging for critical record changes
- [ ] Add rate limiting plan for auth, uploads, and AI endpoints
- [ ] Add abuse-report review flow

## Suggested Build Order

This is the safest non-AI sequence.

### Phase A: Harden Core UX

- [ ] Error boundaries
- [ ] Better toasts and retries
- [ ] Offline states
- [ ] Submit validation and scroll-to-error
- [ ] Consistent loading and empty states

### Phase B: Fix Navigation

- [ ] Standardize tabs and route hierarchy
- [ ] Add deep linking and share
- [ ] Remove remaining redundant screen actions

### Phase C: Strengthen Trust

- [ ] Profile completion
- [ ] Better seller identity block
- [ ] Listing status quality checks
- [ ] Report listing flow

### Phase D: Improve Discovery

- [ ] Distance-aware browsing
- [ ] Better map/list switching
- [ ] Saved filters and favorites
- [ ] Related listings

### Phase E: Add Operations Layer

- [ ] Inquiry inbox improvements
- [ ] Listing analytics
- [ ] Admin and moderation basics

## AI Strategy For Refamora

## Principle

AI in Refamora should assist users, not replace marketplace rules.

The best AI jobs in this app are:

- turning messy farmer input into better listings
- helping buyers find the right listing faster
- improving trust by checking photo and text quality
- generating useful waste-to-value suggestions
- helping moderate unsafe, misleading, or low-quality content

The worst AI jobs in this app would be:

- automatically publishing listings without user confirmation
- changing prices without explanation or approval
- deciding business-critical actions without hard rules
- bypassing Supabase authorization or app-side validation

## Best AI Jobs In Refamora

### 1. Listing Copilot For Farmers

This should be the first AI feature.

What it does:

- rewrites rough titles into cleaner marketplace titles
- improves listing descriptions from short or broken input
- suggests category, unit, and fulfillment wording
- checks if key fields are missing before publish

Why it fits:

- high value
- low product risk
- easy to keep human-in-the-loop

### 2. Waste-To-Value Advisor

This is a strong brand-fit feature for Refamora.

Current status: the first version is live in the listing editor as an on-demand advisor beside waste type selection. It returns short uses, cautions, and a market tip through the shared provider layer.

What it does:

- explains possible uses of a waste type
- suggests what buyers might use it for
- helps farmers understand why a waste stream has value
- can generate short educational tips beside the listing flow

Why it fits:

- directly supports the Refamora brand promise
- useful even before full marketplace maturity

### 3. Buyer Search Assistant

This should come after the listing copilot.

What it does:

- converts natural language into search filters
- supports prompts like `show me rice husk near Malaybalay under 500 pesos`
- maps loose user intent into waste type, price range, location, and fulfillment filters

Why it fits:

- improves discovery without changing marketplace rules
- works well with structured outputs and function calling

### 4. Listing Photo Quality Checker

This is a practical multimodal AI feature.

What it does:

- checks if the image is blurry, dark, too far, or unclear
- flags if the waste material is hard to identify
- suggests retaking the image before upload
- can optionally suggest a likely waste type from the photo

Why it fits:

- improves trust and buyer confidence
- uses image understanding in a practical way

### 5. Content Safety And Moderation

This is more of a platform safeguard than a flashy user feature.

What it does:

- checks listing text for unsafe or abusive content
- checks uploaded photos for inappropriate imagery
- flags suspicious descriptions or off-topic uploads

Why it fits:

- protects the app as it grows
- helps avoid manual moderation overload later

### 6. Inquiry Summaries And Suggested Replies

This is optional after the main AI layers are stable.

What it does:

- summarizes multiple inquiries for a farmer
- drafts a professional reply the seller can edit
- highlights urgent or repeated buyer questions

Why it fits:

- useful, but not as foundational as listing quality and search

## AI Features To Avoid Early

- fully autonomous chat agents that can take actions on behalf of users
- price prediction presented as fact without enough local data
- custom fine-tuned models before baseline prompting and evaluation are stable
- complex voice assistant flows before the text flows are proven

## Recommended AI Architecture

### Core Rule

Do not call any AI provider directly from the Expo client.

Use a server-side layer such as a Supabase Edge Function or equivalent backend endpoint.

### Recommended Flow

1. Expo app sends a request to a protected backend endpoint such as `/ai/listing-assist`
2. Backend validates auth, role, and request size
3. Backend fetches any needed app data from Supabase
4. Backend resolves the active provider through one shared AI service layer
5. Shared AI service calls Local Gemma first, or Gemini if fallback is enabled
6. Backend returns structured JSON to the app
7. App shows suggestions for user review and confirmation

### Why This Structure

- protects the API key
- allows auth and rate limiting
- allows logging and evaluation
- prevents AI from bypassing business rules
- keeps all writes controlled by your own backend
- allows us to swap providers without rewriting the app UI
- gives hackathon-safe local inference even if hosted AI is unavailable

### Provider Strategy

Refamora should use:

- `Local Gemma` as the primary provider for demos and offline-safe development
- `Gemini` as the optional fallback provider when hosted AI is available
- one provider-agnostic interface so features call `aiService`, not a specific vendor SDK

### Suggested Service Shape

```ts
type AIProvider = 'local_gemma' | 'gemini'

type AIService = {
  assistListing(input: ListingAssistInput): Promise<ListingAssistOutput>
  suggestWasteValue(input: WasteValueInput): Promise<WasteValueOutput>
  parseBuyerSearch(input: BuyerSearchInput): Promise<BuyerSearchParseOutput>
  reviewListingPhoto?(input: PhotoReviewInput): Promise<PhotoReviewOutput>
}
```

### Suggested Resolution Order

1. try `local_gemma` if enabled and healthy
2. fall back to `gemini` if enabled
3. return a safe degraded response if both are unavailable

## Recommended Provider Implementation Approach

As of April 17, 2026, the best low-cost path for Refamora is:

- use `Local Gemma` as the primary path for listing assistance, waste-value suggestions, and search parsing
- use `Gemini 2.5 Flash` as the hosted fallback for richer reasoning and multimodal checks
- use `Gemini 2.5 Flash-Lite` later for cheaper parse-and-structure tasks when quality needs are lower
- keep output contracts identical across providers
- use schema-validated JSON outputs regardless of provider
- keep the first version simple: stateless request/response, no long-running agent loop
- design around free-tier rate limits on Gemini, since quotas are tied to project tier and can change over time
- treat local AI as the demo-safe default, not just a backup

## What The Docs Mean For Refamora

### Local Gemma Primary

If Local Gemma is already available on the demo machine, it should be the primary provider for the first AI rollout.

Refamora impact:

- protects the demo from quota, billing, or network issues
- allows effectively unlimited local testing during development
- works best for listing copilot, search parsing, and short suggestion flows
- should remain suggestion-only, not action-taking

### Gemini Optional Fallback

Gemini Flash models are a practical fit for this app because they support multimodal inputs, structured output, and function calling without requiring a heavy custom backend stack.

Refamora impact:

- use `Gemini 2.5 Flash` as the hosted fallback for listing copilot
- use `Gemini 2.5 Flash` as fallback for buyer search assistant when prompts are more open-ended
- use `Gemini 2.5 Flash` for photo-based listing analysis when local Gemma image capability is not the chosen path
- use `Gemini 2.5 Flash-Lite` later for lower-cost filter parsing or lightweight moderation if quality is still acceptable

### Provider-Agnostic Output Contracts

The UI should never care whether the response came from Local Gemma or Gemini.

Refamora impact:

- both providers must map into the same output schema
- provider switching should happen only in the backend service layer
- AI errors should surface as normal app fallback states, not provider-specific crashes
- logs should include provider name for debugging and evaluation

### Structured Output

Gemini supports structured output by setting the response MIME type to JSON and providing a JSON schema. Local Gemma may not enforce schemas as strictly, so the backend should validate and normalize outputs before returning them to the app.

Refamora impact:

- AI listing suggestions should return a fixed schema
- buyer search assistant should return a fixed filter object
- image quality analysis should return fixed fields like `is_clear`, `needs_retake`, and `suggested_category`
- Local Gemma outputs may need stricter post-validation and repair in the backend

### Function Calling

Gemini supports multiple function-calling modes. Local Gemma may not be the right place for tool orchestration at first, so Refamora should keep function calling optional and backend-controlled.

Refamora impact:

- expose only narrow backend tools such as `search_listings`, `lookup_waste_types`, `get_recent_market_examples`, or `normalize_unit`
- never expose direct write tools that let the model publish listings on its own
- prefer `VALIDATED` or tightly scoped `ANY` mode for deterministic flows
- keep manual approval between AI output and any database write
- for Local Gemma, start with plain suggestion generation before adding tool-calling behavior

### Image Input

Gemini accepts images either inline for smaller requests or through the File API for larger or reusable files. Local Gemma may or may not be the model you want for image tasks depending on the exact model variant installed locally.

Refamora impact:

- use inline images for quick one-off listing checks when request size is small
- use file upload flow if we later add heavier image analysis or reuse of the same image
- keep upload compression in the app before sending to the AI layer
- if local image quality is not strong enough, keep photo review routed to Gemini only

### Free Tier And Billing

Gemini's official billing docs say new accounts start on the Free tier and only certain models are available there, with usage capped by free-tier rate limits. The official pricing docs also show Gemini 2.5 Flash and Gemini 2.5 Flash-Lite as free-tier models, but the free tier is explicitly marked as usage that can be used to improve Google products, unlike paid tier usage.

Refamora impact:

- free tier is good for prototyping and classroom or hackathon use
- free tier should not be treated as a guaranteed production plan
- if you ship to real users, assume we may need to move to paid tier later
- do not send unnecessary personal data through free-tier requests
- keep AI optional and degradable so the app still works when quota is hit

### Rate Limits

Gemini rate limits are enforced per project, not per API key, and Google notes that preview models are more restricted. Actual limits are surfaced in AI Studio and can change as tier changes.

Refamora impact:

- protect every AI route with rate limiting and timeout handling
- add user-facing fallback copy like `AI assist is unavailable right now`
- avoid using AI in places that block the whole app
- queue or debounce buyer search assistance so free-tier quota is not burned too quickly

### Fine-Tuning

Fine-tuning is not the right first step for Refamora while we are on a free-tier Flash plan and still validating the core workflows.

Refamora impact:

- do not fine-tune first
- start with prompts, schemas, and app data retrieval
- collect accepted and rejected suggestions for later evaluation
- only revisit fine-tuning after real usage shows repeated quality gaps that prompting cannot solve

## Concrete AI Features By Phase

### AI Phase 0: Foundations

- [x] Add provider-agnostic AI entrypoints such as `supabase/functions/ai-listing-assist`
- [x] Add shared `aiService` interface in the backend
- [x] Add `localGemmaProvider` implementation
- [x] Add `geminiProvider` implementation
- [x] Add provider resolution logic with Local Gemma as primary
- [x] Add Gemini fallback toggle
- [x] Add provider health check and timeout handling
- [x] Add request auth checks by role
- [x] Add rate limiting and request logging
- [x] Add schemas for AI outputs using Zod
- [x] Add feature flagging so AI can be turned off safely
- [x] Add analytics for AI request volume, latency, and acceptance rate
- [x] Log which provider served each AI response

### AI Phase 1: Listing Copilot

- [x] Add `Improve with AI` action in create listing flow
- [x] Accept title, description, waste type, quantity, and optional photo
- [x] Return structured suggestions:
  - [x] improved title
  - [x] improved description
  - [x] detected missing fields
  - [x] suggested category
  - [x] suggested units
  - [x] short publish-readiness notes
- [x] Keep all AI output editable before save
- [x] Add feedback buttons such as `use suggestion` and `not helpful`

Implementation note:

- Local Gemma should serve this first
- Gemini should be used only if Local Gemma is unavailable or explicitly bypassed

### AI Phase 2: Waste-To-Value Advisor

- [x] Add AI-generated value suggestions beside waste type selection
- [x] Show practical downstream uses and cautions
- [x] Keep suggestions short and educational
- [x] Add source strategy if later tied to curated domain content

### AI Phase 3: Buyer Search Assistant

- [x] Add `Search with AI` entry point in buyer feed
- [x] Convert natural language to a structured filter object
- [x] Validate parsed filters before running actual queries
- [x] Show the interpreted filters back to the user before applying
- [x] Fall back to normal search if AI parsing fails

Implementation note:

- start with Local Gemma for parsing
- use Gemini fallback only if parsing quality or availability requires it

### AI Phase 4: Photo Analysis And Moderation

- [x] Add `Check photo` before upload confirmation
- [x] Return image quality score and retake suggestions
- [x] Return likely waste category if confidence is high enough
- [x] Add moderation checks for text and image content
- [x] Add admin review queue for flagged listings

Implementation note:

- this phase now runs through the same provider-agnostic service layer, with Local Gemma as primary and Gemini as the optional fallback when enabled

### AI Phase 5: Messaging Support

- [x] Summarize inquiry threads for sellers
- [x] Draft editable reply suggestions
- [x] Highlight unanswered buyer questions

## Suggested AI Schemas

### Listing Assist Output

```ts
type ListingAssistOutput = {
  improvedTitle: string
  improvedDescription: string
  suggestedWasteType: string | null
  suggestedUnit: string | null
  missingFields: string[]
  publishReadiness: 'ready' | 'needs_review'
  notes: string[]
}
```

### Buyer Search Parse Output

```ts
type BuyerSearchParseOutput = {
  querySummary: string
  wasteTypes: string[]
  city: string | null
  maxPrice: number | null
  fulfillment: 'pickup' | 'delivery' | null
  sortBy: 'latest' | 'price_low' | 'distance' | null
}
```

### Photo Review Output

```ts
type PhotoReviewOutput = {
  isClearEnough: boolean
  needsRetake: boolean
  retakeReasons: string[]
  likelyWasteType: string | null
  confidence: number | null
}
```

## Guardrails

- [ ] AI never writes directly to the database without user confirmation
- [ ] AI suggestions must stay editable
- [ ] AI results must pass schema validation before UI use
- [ ] All AI features need explicit loading, error, and fallback states
- [ ] Sensitive prompts should send only minimum necessary data
- [ ] Prompt and output logs should be sampled for QA, not stored blindly forever
- [ ] Add moderation for both input and output where needed

## What Success Looks Like

### Product

- listing creation becomes faster and less error-prone
- buyer search becomes more natural and useful
- listing quality improves without adding more user effort
- trust and clarity improve across seller and listing surfaces

### AI

- farmers accept AI suggestions often enough to prove utility
- buyers use AI search without getting worse results than manual filters
- flagged bad photos and low-quality descriptions decrease over time
- AI remains clearly assistive, predictable, and safe

## Recommendation

If we want the highest-impact next move, the order should be:

1. harden the core product flows
2. implement AI Phase 0 foundations
3. ship Listing Copilot first on `Local Gemma`
4. ship Buyer Search Assistant second on `Local Gemma`
5. keep `Gemini 2.5 Flash` as the hosted fallback
6. add photo analysis and moderation after the provider layer is stable

That path gives Refamora visible AI value without turning the app into an unstable or overcomplicated system.

## References

- Gemini billing: https://ai.google.dev/gemini-api/docs/billing/
- Gemini pricing: https://ai.google.dev/gemini-api/docs/pricing
- Gemini rate limits: https://ai.google.dev/gemini-api/docs/rate-limits
- Gemini structured output: https://ai.google.dev/gemini-api/docs/structured-output
- Gemini function calling: https://ai.google.dev/gemini-api/docs/function-calling
- Gemini image understanding: https://ai.google.dev/gemini-api/docs/image-understanding

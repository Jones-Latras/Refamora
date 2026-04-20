# Refamora Pitch Deck Draft

This draft follows the required 7-slide structure and stays aligned with the current prototype in this repository.

## Slide 1: Problem Statement

**Refamora**
Where farm waste becomes more valuable.

- Farmers often treat agricultural by-products as waste because there is no simple way to list, price, and connect them to buyers.
- Buyers who could reuse these materials for composting, feed, fiber, biomass, or processing struggle to find reliable suppliers in one place.
- Listings are often incomplete or inconsistent: missing photos, unclear waste type, no exact location, and slow seller response.
- The result is lost income for farmers, inefficient resource use, and more waste ending up burned, dumped, or left unmanaged.

**Pitch line:**
Agricultural waste has value, but the market for it is fragmented and hard to access.

## Slide 2: Proposed Solution

**Refamora is a mobile marketplace for agricultural waste exchange.**

- Farmers can create listings with waste type, quantity, price, photo, and pickup location.
- Buyers can browse listings, compare options, view nearby suppliers, and message sellers directly.
- Sellers get a dashboard to manage listings, track inquiries, and respond faster.
- The platform turns farm waste from a disposal problem into a tradable resource.

**Core value proposition:**
Refamora makes agri-waste visible, searchable, and easier to sell before it loses value.

## Slide 3: AI Integration and Technology Used

**AI integration in the current prototype**

- AI Listing Copilot helps improve listing titles and descriptions before publishing.
- AI Waste-to-Value Advisor suggests practical uses, cautions, and market context for each waste type.
- AI Photo Check reviews image quality and can suggest the likely waste category from the uploaded photo.
- AI Moderation checks listings for unsafe, suspicious, or irrelevant content before they go live.
- AI Messaging Support summarizes seller inbox activity and drafts replies to buyer inquiries.

**Technology stack**

- Frontend: Expo + React Native + Expo Router
- Backend: Supabase Auth, Postgres, Storage, and Edge Functions
- AI providers: Local Gemma for text tasks, Groq Vision for image analysis, optional Gemini fallback
- Validation and safety: Zod schemas, rate limiting, AI event logging, and feedback capture
- Detailed system architecture is documented separately in `Doc/Refamora_System_Architecture.md`.

**Why this matters**

- AI reduces friction for non-technical users.
- Better listing quality increases buyer trust and marketplace efficiency.
- Local-first AI options help keep operating costs lower for scaling.

## Slide 4: Target Users and Beneficiaries

**Primary users**

- Farmers and smallholder producers who want to earn from agricultural by-products
- Cooperatives or aggregators who manage larger volumes of farm residues
- Buyers looking for reusable farm waste such as compost makers, livestock feed processors, fiber users, biomass users, and circular-economy enterprises

**Beneficiaries**

- Rural communities that gain additional income opportunities
- Local circular-economy businesses that need a more reliable supply of raw materials
- The broader environment through reduced unmanaged agricultural waste

**Simple framing:**
We serve both sides of the exchange: those who have waste and those who can turn it into value.

## Slide 5: Prototype Demonstration

**Suggested live demo flow**

1. Log in as a farmer and open the listing creation screen.
2. Upload a photo of agricultural waste and run AI Photo Check.
3. Show the detected waste type and photo-quality feedback.
4. Use AI Listing Copilot to improve the listing draft.
5. Open the Waste-to-Value Advisor to show reuse ideas and market tips.
6. Publish the listing and explain the AI moderation check before posting.
7. Switch to the buyer side to browse listings and contact the seller.
8. Return to the seller inbox and show AI summary or AI draft reply.

**Demo message**

- The prototype does not just list products.
- It actively helps users create better listings, prevent low-quality posts, and respond faster to marketplace demand.

## Slide 6: Impact on DRRM or Circular Economy

**Circular economy impact**

- Converts agricultural residues into usable inputs instead of treating them as disposal-only waste
- Encourages reuse pathways such as composting, feed processing, fiber extraction, and biomass use
- Extends the economic life of farm by-products and creates additional rural income streams
- Reduces the likelihood of waste being openly burned or left unmanaged

**Potential DRRM relevance**

- After harvest peaks or climate-related disruptions, farmers can more quickly surface available materials and connect with buyers
- Location-based listings can support faster local coordination of available agricultural residues
- Additional income channels can improve livelihood resilience for farming communities

**Important note for the pitch**

- The current prototype demonstrates the workflow and value chain.
- Impact numbers should be presented as expected outcomes unless you already have pilot data.

## Slide 7: Scalability and Sustainability

**Scalability**

- The platform can expand across provinces because the listing, messaging, and AI workflows are reusable.
- New waste categories can be added through the existing waste-type and AI knowledge structure.
- The modular AI provider layer supports local or cloud-based deployment depending on budget and connectivity.
- Supabase Edge Functions and structured validation make it easier to add more automation without rebuilding the app.

**Sustainability**

- Local Gemma support can reduce recurring AI costs for text-based features.
- AI logging and feedback tracking support continuous improvement over time.
- A sustainable model could combine transaction fees, premium buyer tools, cooperative partnerships, or LGU and enterprise collaborations.

**Closing line**

Refamora is designed to scale from a campus prototype into a practical agri-waste exchange platform that supports both circular economy goals and community resilience.

## Optional Presenter Notes

If you need to shorten delivery time, keep one main message per slide:

- Slide 1: Agri-waste has value, but the market is fragmented.
- Slide 2: Refamora connects farmers and buyers in one mobile platform.
- Slide 3: AI improves listing quality, safety, and response speed.
- Slide 4: Farmers and reuse businesses both benefit.
- Slide 5: The prototype already shows the workflow end to end.
- Slide 6: The strongest impact is circular economy, with DRRM relevance as added value.
- Slide 7: The architecture is built to scale and can be sustained with low-cost AI and partnerships.

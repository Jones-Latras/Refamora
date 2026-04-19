# Refamora — Complete Application Overview

**Tagline:** *"Turning Agricultural Waste into Local Wealth."*

Refamora is an AI-powered, mobile-first circular resource marketplace built for Philippine agriculture. It connects farmers who have leftover agricultural waste (sellers) with businesses, recyclers, and manufacturers who need sustainable raw materials (buyers). The platform uses Generative AI and Natural Language Processing throughout the user journey to lower digital barriers for rural farmers and facilitate faster, smarter transactions.

---

## Table of Contents

1. [Application Architecture](#application-architecture)
2. [Technology Stack](#technology-stack)
3. [User Roles](#user-roles)
4. [Authentication Flow](#authentication-flow)
5. [Farmer Experience](#farmer-experience)
6. [Buyer Experience](#buyer-experience)
7. [Shared Screens](#shared-screens)
8. [AI Features](#ai-features)
9. [Supported Waste Types](#supported-waste-types)
10. [Data Layer](#data-layer)
11. [Design System](#design-system)
12. [Project Structure](#project-structure)

---

## Application Architecture

Refamora is a **React Native** mobile application using **Expo Router** for file-based navigation. The backend is entirely powered by **Supabase** (PostgreSQL database, authentication, file storage, and Edge Functions for AI). AI inference is handled through a dual-provider system: a **local Ollama instance** (for offline/local development) and **Google Gemini** (cloud fallback).

```
┌──────────────────────────────────────────────┐
│             React Native (Expo)              │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌───────┐ │
│  │ Farmer │ │ Buyer  │ │ Shared │ │ Auth  │ │
│  │ Screens│ │ Screens│ │Screens │ │Screens│ │
│  └───┬────┘ └───┬────┘ └───┬────┘ └───┬───┘ │
│      └──────────┴──────────┴──────────┘     │
│                Services Layer                │
│  (aiService, listingService, contactService, │
│   storageService, profileService, etc.)      │
└──────────────────┬───────────────────────────┘
                   │
         ┌─────────▼─────────┐
         │     Supabase      │
         │  ┌─────────────┐  │
         │  │  PostgreSQL  │  │
         │  │  (Database)  │  │
         │  ├─────────────┤  │
         │  │    Auth      │  │
         │  ├─────────────┤  │
         │  │   Storage    │  │
         │  ├─────────────┤  │
         │  │Edge Functions│──┼──► Local Ollama (Gemma)
         │  │  (AI Layer)  │──┼──► Google Gemini API
         │  └─────────────┘  │
         └───────────────────┘
```

---

## Technology Stack

| Layer           | Technology                                       |
|-----------------|--------------------------------------------------|
| **Frontend**    | React Native, Expo, Expo Router (file-based)     |
| **Language**    | TypeScript (strict)                              |
| **State**       | React hooks, Zustand (saved listings, drafts)    |
| **Forms**       | react-hook-form + Zod validation                 |
| **Backend**     | Supabase (PostgreSQL, Auth, Storage)             |
| **AI Runtime**  | Supabase Edge Functions (Deno)                   |
| **AI Provider** | Ollama (local Gemma model) + Google Gemini (cloud fallback) |
| **Icons**       | @expo/vector-icons (Feather icon set)            |
| **Maps**        | react-native-maps                                |
| **Styling**     | React Native StyleSheet (custom design system)   |

---

## User Roles

Refamora supports two distinct user roles, selected during onboarding:

### Farmer (Seller)
Farmers list their agricultural waste for sale. They manage listings, view performance analytics, receive buyer inquiries, and use AI tools to draft professional listings and replies.

### Buyer
Buyers browse, search, and filter available waste listings. They can view listings on a live map, save favorites, contact sellers, and use an AI-powered natural language search assistant.

---

## Authentication Flow

Located in `app/(auth)/`.

| Screen        | File            | Description                                           |
|---------------|-----------------|-------------------------------------------------------|
| **Login**     | `login.tsx`     | Email/password login with session redirect support     |
| **Sign Up**   | `signup.tsx`    | Account creation with email, password, and full name   |
| **Role Select** | `role-select.tsx` | Post-signup role picker (Farmer or Buyer)          |

The root layout (`app/_layout.tsx`) contains a `SplashGate` component that handles:
- Displaying a branded loading screen while checking auth state
- Auto-redirecting logged-in users to their role-specific dashboard
- Redirecting unauthenticated users to the login page
- Preserving deep links across the auth flow via a `redirect` parameter
- Showing session-expired notifications via toast messages

---

## Farmer Experience

Located in `app/(farmer)/`. Uses a bottom tab navigator.

### Dashboard (`dashboard.tsx`)
The farmer's home screen. Displays:
- **Personalized greeting** (time-of-day aware: "Good morning, Juan")
- **Profile completion tracker** — shows missing fields and nudges to complete
- **Recent listings** — cards showing latest listings with status badges and performance stats
- **Pending inquiries** — unread buyer messages with quick-reply access
- **Draft recovery** — if a draft listing is saved locally, prompts to resume editing
- **Performance summary** — views, inquiries, and pending counts per listing

### My Listings (`my-listings.tsx`)
Full listing management dashboard. Features:
- **Search bar** with Feather search icon — filter by title, waste type, or city
- **Status filter chips** — All, Active, Sold, Expired, Paused
- **Listing cards** — compact cards showing image/placeholder, title, status badge, location, quantity, price, fulfillment type, and creation date
- **Expandable management panel** per listing:
  - Performance stats with icons (Views, Inquiries, Pending)
  - Recent activity highlights
  - Edit button (navigates to edit form)
  - More actions (status changes via ActionSheet)
  - Delete button with confirmation dialog
- **Draft card** — if a local draft exists, shows a card to resume editing
- **Bulk update card** — detects listings active for 30+ days and offers bulk status cleanup
- **"Add listing" button** with plus icon

### Create Listing (`create-listing.tsx`)
Opens the `ListingEditor` component in creation mode. The ListingEditor is a massive shared component (~84KB) that handles:
- Multi-section collapsible form (Basics, AI Tools, Pricing, Publish Checks)
- Photo upload with AI Photo Analyzer
- AI-powered listing title and description generation
- Waste-to-value advice panel
- AI content moderation before publishing
- Zod schema validation
- Draft auto-save to local Zustand store
- Publish and Save Draft actions

### Edit Listing (`edit-listing/[id].tsx`)
Opens the same `ListingEditor` in edit mode, pre-populated with existing listing data.

### Messages / Requests (`requests.tsx`)
The farmer's inbox for buyer conversations. Features:
- **Pending count badge** — shows number of unread inquiries inline with title
- **Search bar** with icon — search by product, buyer, or keyword
- **Filter chips** — All, Unread, Responded
- **AI "Summarize visible"** button with zap icon — generates an AI summary of all visible inquiries
- **"Mark all seen"** button with check-circle icon — bulk-marks inquiries as read
- **AI summary modal** — displays the generated summary in a modal
- **Contact request cards** — tappable rows showing listing title, buyer name/city, last message preview, timestamp, and unread badge

---

## Buyer Experience

Located in `app/(buyer)/`. Uses a bottom tab navigator.

### Dashboard (`dashboard.tsx`)
The buyer's home screen. Displays:
- **Profile completion tracker**
- **Saved listings** — previews of bookmarked listings
- **Recently viewed** — listings the buyer has opened
- **Recent messages** — latest seller conversations

### Feed (`feed.tsx`)
The main marketplace discovery screen. Features:
- **AI-powered NLP search** — buyers type natural language queries (e.g., "coconut husks near Butuan under 500 pesos") and the AI parses them into structured filters
- **Advanced filter sheet** (`FeedFilterSheet`) — waste type, price range, location radius, fulfillment type, sort order
- **Distance-aware sorting** — listings sorted by proximity to buyer's GPS location
- **Listing cards** — image, title, waste type, quantity, price, city, distance, fulfillment label
- **Pull-to-refresh** and infinite scroll pagination

### Map (`map.tsx`)
Interactive map view showing listing locations as pins. Features:
- GPS-centered map with listing pin markers
- **Pin popup** component — tap a pin to see listing preview with quick-view action
- Error/empty state handling for map data loading

### Saved Listings (`saved-listings.tsx`)
Persistent bookmarks powered by Zustand local storage. Buyers can save listings from the feed or detail page and manage them here.

### Messages / Requests (`requests.tsx`)
The buyer's conversation inbox. Features:
- **Search bar** with icon
- **Filter chips** — All, Replies, You sent
- **Contact request cards** with message preview and timestamps

---

## Shared Screens

Located in `app/(shared)/`. Accessible by both roles.

### Listing Detail (`listing/[id].tsx`)
Full-screen listing detail page. Features:
- Listing image with fallback placeholder
- Title, description, waste type, quantity, unit, price, city
- Fulfillment label (pickup, delivery, both)
- Seller information (name, avatar, city)
- **"Contact Seller" modal** — sends an initial inquiry message
- **Share button** — native share sheet with Refamora deep link
- **Save/unsave** toggle
- **Report listing** modal — flag inappropriate content with a reason
- Distance from buyer's location (when available)

### Conversation (`conversation/[id].tsx`)
Full-featured real-time messaging interface. Features:
- **Header card** — listing image/avatar, title, counterpart name, role, city, last activity
- **"Open listing" link** with external-link icon
- **Phone card** with phone icon — displays counterpart's phone number if shared
- **Message thread** — scrollable chronological messages with:
  - Own messages: green bubbles with drop shadow, aligned right
  - Other messages: white bordered bubbles, aligned left
  - Timestamps below each message
- **Empty state** with message-circle icon
- **Composer area**:
  - **AI Draft button** (inside the input shell) — generates a professional reply draft using AI
  - **Multiline text input** for message composition
  - **Send button** with Feather send icon (shows ActivityIndicator while sending)
- **Thin separator line** above the composer for visual clarity

### Profile (`profile.tsx`)
Comprehensive user profile management. Features:
- Avatar upload with photo picker
- Full name, phone, city editing
- Role display
- Profile completion percentage
- Account actions (sign out)

---

## AI Features

Refamora integrates AI across 7 distinct features, all routed through Supabase Edge Functions:

| Feature | Edge Function | Description |
|---------|---------------|-------------|
| **Listing Copilot** | `ai-listing-assist` | Rewrites and polishes listing title and description based on farmer's raw input. Improves grammar, clarity, and marketplace appeal. |
| **Farm Waste Photo Analyzer** | `ai-photo-check` | Analyzes uploaded listing photos using Computer Vision. Assesses image quality (0-100 score), identifies the waste type from the image, and flags poor-quality or unrelated photos. Uses a detailed visual identification guide for 7 Philippine waste types. |
| **Waste-to-Value Advisor** | `ai-waste-advice` | Provides educational advice on downstream uses, cautions, and market context for each waste type. Combines AI generation with a curated knowledge base. |
| **Content Moderation** | `ai-listing-moderation` | Reviews listing text and images for unsafe, abusive, or off-topic content before publishing. Returns allow/review/block decisions. |
| **NLP Search Assistant** | `ai-search-assist` | Parses natural language buyer queries into structured marketplace filters (waste type, price range, location). |
| **Inquiry Summarizer** | `ai-inquiry-assist` (summary) | Generates a concise summary of visible seller inquiries, prioritizing urgent/unanswered messages. |
| **Reply Draft Generator** | `ai-inquiry-assist` (reply) | Drafts a professional, friendly seller reply based on the buyer's message and listing context. |

### AI Provider Architecture

The AI layer uses a **dual-provider fallback system**:

1. **Primary: Local Ollama (Gemma model)** — runs locally via Ollama at `http://127.0.0.1:11434`. Supports text generation and image analysis. Used for offline-capable and low-latency inference.
2. **Fallback: Google Gemini API** — cloud-based inference via `generativelanguage.googleapis.com`. Used when local Gemma is unavailable or fails.

Both providers:
- Use structured JSON output schemas for deterministic responses
- Share identical prompt templates
- Are monitored via an `ai_events` table that logs every request (status, latency, provider used, feedback)

### AI Rate Limiting
Configurable per-feature rate limits to prevent abuse. Tracked in the `ai_events` table.

### AI Feedback Loop
Users can submit "helpful" or "not helpful" feedback on AI outputs via `ai-feedback`, logged for quality tracking.

---

## Supported Waste Types

| Value | Label | Example Uses |
|-------|-------|-------------|
| `coconut_husk` | Coconut Husk | Coco coir fiber, erosion control matting, compost, handicraft material |
| `rice_straw` | Rice Straw | Mushroom substrate, animal feed, mulch for vegetable beds |
| `corn_stalks` | Corn Stalks | Biomass fuel, silage for livestock |
| `banana_trunk` | Banana Trunk | Fiber extraction, paper pulp |
| `sugarcane_bagasse` | Sugarcane Bagasse | Bioethanol production, particleboard filler |
| `pineapple_leaves` | Pineapple Leaves | Piña textile fiber, compost accelerator |
| `cassava_peel` | Cassava Peel | Animal feed blend, compost additive |
| `other` | Other | Assessed for compost, feed, fiber, or biomass reuse |

Each waste type has a curated knowledge entry in `wasteKnowledge.ts` with known uses, cautions, market context, and source basis used by the Waste-to-Value Advisor.

---

## Data Layer

### Supabase Services (`services/`)

| Service | File | Responsibility |
|---------|------|----------------|
| **Auth** | `authService.ts` | Sign up, sign in, sign out |
| **Listings** | `listingService.ts` | CRUD operations, search/filter, farmer listings, performance stats, listing previews |
| **Contact** | `contactService.ts` | Contact requests, conversations, messages, mark-as-seen, seller/buyer inquiry management |
| **AI** | `aiService.ts` | All AI feature invocations (7 features), AI analytics, AI feedback |
| **Storage** | `storageService.ts` | Image upload (listing photos, profile avatars) to Supabase Storage |
| **Profile** | `profileService.ts` | User profile read/update |
| **Location** | `locationService.ts` | Geocoding and GPS utilities |
| **Map** | `mapService.ts` | Map pin data fetching |
| **Reports** | `listingReportService.ts` | Listing moderation reports |
| **Supabase Client** | `supabase.ts` | Singleton Supabase client initialization |

### Custom Hooks (`hooks/`)

| Hook | Purpose |
|------|---------|
| `useAuth` | Auth context provider — user, role, loading state, session management |
| `useProfile` | Profile data fetching and caching |
| `useListings` | Listing data fetching with pagination |
| `useListingDrafts` | Zustand store for draft auto-save (persisted to AsyncStorage) |
| `useSavedListings` | Zustand store for buyer saved listings |
| `useRecentlyViewed` | Zustand store tracking recently viewed listing IDs |
| `useBuyerFeedState` | Feed filter/sort state management |
| `useBuyerLocation` | GPS location permission and tracking |
| `useConnectivity` | Network connectivity monitoring with OfflineBanner |
| `useDebounce` | Debounced value hook for search inputs |
| `useAsync` | Generic async operation wrapper with loading/error states |

### Validation (`utils/schemas.ts`)
All API inputs and outputs are validated with Zod schemas. This ensures type-safe communication between the app and Supabase Edge Functions.

---

## Design System

Defined in `utils/theme.ts`.

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `cream` | `#ffffff` | Primary background, button text |
| `parchment` | `#f4f5f6` | Secondary background |
| `sage` | `#3a6648` | Primary brand green, own message bubbles |
| `sageDark` | `#2b4d35` | Dark green for emphasis text, active states |
| `harvest` | `#b07e28` | Accent gold, warning indicators |
| `soil` | `#1c100a` | Primary text, headings |
| `clay` | `#5c3820` | Secondary text, action labels |
| `ink` | `#1f140d` | Body text |
| `muted` | `#6f6a63` | Tertiary text, timestamps, metadata |
| `border` | `rgba(28, 16, 10, 0.08)` | Subtle borders |
| `surface` | `#ffffff` | Card backgrounds |
| `error` | `#a04532` | Error states, delete actions |

### Border Radii
- `sm`: 10px — small chips, dots
- `md`: 18px — cards, panels
- `lg`: 26px — large containers

### Shadow
Consistent soft shadow: `#1c100a` at 5% opacity, 12px radius, 8px Y offset.

---

## Project Structure

```
agriwaste/
├── app/
│   ├── _layout.tsx              # Root layout, SplashGate, auth routing
│   ├── index.tsx                # Entry redirect
│   ├── (auth)/                  # Login, Signup, Role Select
│   ├── (farmer)/                # Farmer tab navigator
│   │   ├── dashboard.tsx        # Seller home screen
│   │   ├── my-listings.tsx      # Listing management
│   │   ├── create-listing.tsx   # New listing (ListingEditor)
│   │   ├── edit-listing/[id].tsx # Edit listing (ListingEditor)
│   │   └── requests.tsx         # Farmer inbox
│   ├── (buyer)/                 # Buyer tab navigator
│   │   ├── dashboard.tsx        # Buyer home screen
│   │   ├── feed.tsx             # Marketplace feed with AI search
│   │   ├── map.tsx              # Map view with listing pins
│   │   ├── saved-listings.tsx   # Bookmarked listings
│   │   └── requests.tsx         # Buyer inbox
│   └── (shared)/                # Shared stack navigator
│       ├── profile.tsx          # Profile management
│       ├── listing/[id].tsx     # Listing detail page
│       └── conversation/[id].tsx # Chat interface
├── components/                  # 21 reusable UI components
├── hooks/                       # 11 custom React hooks
├── services/                    # 10 service modules (API layer)
├── types/
│   ├── app.ts                   # Application types
│   └── database.ts              # Supabase database types (auto-generated)
├── utils/
│   ├── theme.ts                 # Design tokens (palette, radii, shadow)
│   ├── schemas.ts               # Zod validation schemas
│   ├── wasteTypes.ts            # Waste type definitions + suggestion map
│   ├── formatters.ts            # Date, price, quantity formatters
│   ├── imageUtils.ts            # Image compression and manipulation
│   ├── location.ts              # Location/distance utilities
│   └── profileCompletion.ts     # Profile completeness scoring
└── supabase/
    ├── functions/
    │   ├── _shared/             # Shared AI infrastructure
    │   │   ├── aiService.ts     # Dual-provider routing logic
    │   │   ├── aiTypes.ts       # AI type definitions
    │   │   ├── aiSchemas.ts     # JSON output schemas for AI
    │   │   ├── aiEventLogger.ts # AI usage tracking + rate limiting
    │   │   ├── wasteKnowledge.ts # Curated waste knowledge base
    │   │   ├── auth.ts          # Edge function auth helpers
    │   │   ├── moderationQueue.ts # Content moderation queue
    │   │   └── providers/
    │   │       ├── geminiProvider.ts     # Google Gemini integration
    │   │       └── localGemmaProvider.ts # Local Ollama/Gemma integration
    │   ├── ai-listing-assist/   # Listing Copilot
    │   ├── ai-photo-check/      # Farm Waste Photo Analyzer
    │   ├── ai-waste-advice/     # Waste-to-Value Advisor
    │   ├── ai-listing-moderation/ # Content Moderation
    │   ├── ai-search-assist/    # NLP Search Assistant
    │   ├── ai-inquiry-assist/   # Inquiry Summarizer + Reply Drafter
    │   ├── ai-feedback/         # AI Feedback Collection
    │   └── ai-health/           # AI System Health Check
    └── migrations/              # Database migration files
```

---

*This documentation was generated from the live codebase as of April 19, 2026.*

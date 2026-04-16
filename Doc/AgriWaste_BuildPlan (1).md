# AgriWaste E-Market â€” Build Plan

> Hackathon Build Plan Â· React Native + Expo + Supabase

A complete, phase-by-phase construction guide. Each task is checkable. Weaknesses in the original PRD are addressed before the first line of code is written.

**71 tasks across 11 phases** Â· Designed for Northern Mindanao

---

## Before We Build â€” Weaknesses in the PRD

| Weakness | Fix |
|---|---|
| No error handling strategy | All service functions return `{data, error}`. UI layer reads `error` first and triggers a toast. Never let a raw Supabase error surface to the user. |
| No loading state patterns | Every async screen has a skeleton placeholder. Use a `useAsync` hook that returns `{data, isLoading, error}` so UI is never blank and never broken. |
| Map performance with many pins | Use `react-native-map-clustering`. Fetch only `id, latitude, longitude, title` for the map view â€” not full listings. Full data loads on popup tap. |
| No image optimization | Compress images client-side with `expo-image-manipulator` before upload. Max 800Ã—800px, quality 0.75. Prevents slow uploads on mobile networks. |
| No pagination for listings | Use Supabase `.range(from, to)` with a cursor-based approach. Feed loads 12 at a time. Infinite scroll triggers next page at 80% scroll depth. |
| No input validation defined | Use `zod` schemas for all forms. Define schemas in `utils/schemas.ts`. Pair with `react-hook-form` for clean, DRY form state. |
| RLS policies not detailed | Each table's RLS policies are written explicitly in Phase 1. Buyers can only read listings. Farmers can only edit their own. Contact requests are scoped by buyer_id and seller_id. |
| No deep linking / share support | Use Expo Linking in Phase 10 to generate shareable listing URLs. Sellers can share a listing link that opens directly to the details screen inside the app. |
| No offline graceful degradation | Detect connectivity with `@react-native-community/netinfo`. Show a banner when offline. Cache the last-loaded feed in component state across tab navigations. |
| No folder structure or naming convention | A strict folder structure is defined in Phase 0. Services, hooks, utils, types, and components are separate. Names are explicit and self-documenting. |

---

## Master Checklist â€” All 71 Tasks

Status legend: `[x]` done, `[~]` in progress / partial, `[ ]` not started
Latest note: 2026-04-17 UI polish pass applied across auth, dashboards, listings, and shared surfaces. The shared profile page now uses a more compact identity-first layout, profile completion cues, lighter form cards, quieter account actions, and smarter save/password states. Farmer dashboard was reworked around greeting-first hierarchy, tighter stat cards, one primary CTA, and cleaner profile entry.
### Phase 0 â€” Project Setup (8 tasks)
- [x] Initialize Expo project with TypeScript template
- [x] Configure folder structure (components, services, hooks, utils, types, screens)
- [x] Set up ESLint + Prettier with consistent rules
- [x] Configure environment variables (.env + app.config.ts)
- [x] Install all core dependencies
- [~] Initialize Supabase project and copy keys to .env
- [x] Configure Supabase client singleton (services/supabase.ts)
- [x] Set up navigation with Expo Router (tab + stack layout)

### Phase 1 â€” Database & Types (7 tasks)
- [~] Create users table with correct columns and indexes
- [~] Create listings table with spatial columns (latitude, longitude)
- [~] Create contact_requests table
- [~] Create waste_suggestions table and seed with 8+ waste types
- [~] Create Supabase Storage bucket for listing images and avatars
- [~] Write and test Row Level Security policies for all tables
- [~] Generate TypeScript types from Supabase schema (types/database.ts)

### Phase 2 â€” Authentication (8 tasks)
- [x] Build AuthService: signUp, signIn, signOut, getSession
- [x] Build useAuth hook with session state
- [x] Splash Screen
- [x] Login Screen
- [x] Sign Up Screen
- [x] Role Selection Screen (Farmer / Buyer)
- [x] Auth state listener â€” persist session across app restarts
- [x] Protected route wrapper â€” redirect unauthenticated users

### Phase 3 â€” User Profile (5 tasks)
- [x] Build ProfileService: getUserProfile, updateUserProfile
- [x] Build useProfile hook
- [x] Image picker + compression utility (utils/imageUtils.ts)
- [x] Profile Screen UI (view mode)
- [x] Edit Profile form with Zod validation

### Phase 4 â€” Listing Creation (Farmer) (8 tasks)
- [x] Build ListingService (farmer): createListing, updateListing, deleteListing, getFarmerListings
- [x] Waste type constants + suggestions data (utils/wasteTypes.ts)
- [x] Storage service for listing image upload with compression
- [x] Map location picker component (tap to pin)
- [x] Create Listing form â€” Part 1: title, waste type, description, quantity, price
- [x] Create Listing form â€” Part 2: photo upload, location pin, fulfillment type
- [x] Waste-to-Value suggestions panel (shown after waste type selected)
- [x] Zod schema for listing form (utils/schemas.ts)

### Phase 5 â€” Listing Feed (Buyer) (6 tasks)
- [x] Build ListingService (buyer): getListings (paginated), getListingById
- [x] Listing card component
- [x] Listing feed screen with infinite scroll (FlatList + onEndReached)
- [x] Search bar with debounce (hooks/useDebounce.ts)
- [x] Filter bottom sheet (waste type, fulfillment, price range)
- [x] Connect search + filters to paginated listing query

### Phase 6 â€” Map Screen (6 tasks)
- [x] Full-screen map setup with react-native-maps (MapView)
- [x] MapService: fetchListingPins (id, title, latitude, longitude only)
- [x] Custom marker component (leaf icon, color-coded by waste type)
- [x] Marker clustering with react-native-map-clustering
- [x] Pin popup preview card (fetches full listing on tap)
- [x] View Details navigation from popup to full listing screen

### Phase 7 â€” Listing Details (4 tasks)
- [x] Listing details screen (full data display)
- [x] Seller info section with avatar + name + location
- [x] Pickup / delivery label component
- [x] Contact Seller action button (leads to Phase 8)

### Phase 8 â€” Contact System (5 tasks)
- [x] Build ContactService: sendContactRequest, getBuyerRequests, getSellerRequests
- [x] Contact form modal (optional message + send button)
- [x] Contact info reveal (shows seller phone after request is sent)
- [x] Inquiry badge on farmer dashboard (unread count)
- [x] Buyer: sent contact request history screen

### Phase 9 â€” Dashboards & Management (6 tasks)
- [x] Farmer dashboard: active listings count, sold count, inquiry count
- [x] Buyer dashboard: recently viewed listings, sent contact requests
- [x] My Listings screen (farmer) with status indicators
- [x] Edit Listing screen (pre-populated form + update call)
- [x] Mark listing as sold / unavailable (status toggle)
- [x] Recently viewed listings stored in local state across tab sessions

### Phase 10 â€” Polish & QA (8 tasks)
- [~] Skeleton loading screens for feed and map
- [ ] Error boundary components with retry action
- [x] Empty state screens (no listings, no results, no requests)
- [x] Toast notification system (success + error + info)
- [ ] Deep linking for listing share via Expo Linking
- [x] App icon + splash screen assets (agricultural theme)
- [ ] Performance test on mid-range Android (Pixel 4a or equivalent)
- [ ] Final QA â€” walk through every user story in the PRD

---

## Phase 0 â€” Project Setup & Foundation

Everything built later depends on what you establish here. Get the structure right first â€” it costs nothing to rename a folder now and everything to refactor it later.

### p0t1 â€” Initialize Expo project with TypeScript template

Run `npx create-expo-app AgriWasteMarket --template expo-template-blank-typescript`. TypeScript catches type errors before runtime â€” non-negotiable on a hackathon timeline.

### p0t2 â€” Configure folder structure

Create all top-level folders now, even if they start empty. Consistency from day one prevents "where does this go?" decisions mid-build.

```
AgriWasteMarket/
  app/                          â† Expo Router screens (file-based routing)
    (auth)/
      login.tsx  signup.tsx  role-select.tsx
    (farmer)/
      dashboard.tsx  my-listings.tsx  create-listing.tsx
    (buyer)/
      feed.tsx  map.tsx  dashboard.tsx
    (shared)/
      listing/[id].tsx  profile.tsx
  components/
    ListingCard.tsx  MapMarker.tsx  PinPopup.tsx
    SkeletonCard.tsx  EmptyState.tsx  Toast.tsx
    LocationPicker.tsx  WasteSuggestions.tsx
  services/
    supabase.ts           â† singleton client
    authService.ts        â† signUp, signIn, signOut
    listingService.ts     â† create, read, update listings
    profileService.ts     â† getUserProfile, updateUserProfile
    contactService.ts     â† sendContactRequest, getRequests
    storageService.ts     â† uploadImage, deleteImage
    mapService.ts         â† fetchListingPins
  hooks/
    useAuth.ts  useProfile.ts  useListings.ts
    useDebounce.ts  useAsync.ts
  utils/
    schemas.ts        â† all Zod schemas
    imageUtils.ts     â† compress, pick
    wasteTypes.ts     â† constants + suggestions
    formatters.ts     â† formatPrice, formatDate
  types/
    database.ts       â† generated from Supabase
    app.ts            â† app-level types
```

### p0t3 â€” Set up ESLint + Prettier

Single quotes, no semicolons, 2-space indent, trailing commas. Agree on the style once and never argue about it again. Run `npx expo lint` to bootstrap.

### p0t4 â€” Configure environment variables

Never hardcode Supabase keys. Use `app.config.ts` to expose them safely via `process.env`. Add `.env` to `.gitignore` immediately.

```ts
// app.config.ts
import Constants from 'expo-constants'

export default {
  expo: {
    extra: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    },
  },
}

// Access anywhere:
// Constants.expoConfig?.extra?.supabaseUrl
```

### p0t5 â€” Install all core dependencies

Install once, early. Resolving peer dependency conflicts mid-build wastes hours.

```bash
npx expo install \
  @supabase/supabase-js \
  react-native-maps \
  react-native-map-clustering \
  expo-location \
  expo-image-picker \
  expo-image-manipulator \
  react-hook-form \
  zod \
  @hookform/resolvers \
  zustand \
  @react-native-community/netinfo \
  react-native-bottom-sheet \
  @gorhom/bottom-sheet
```

### p0t6 â€” Initialize Supabase project

Create a new project at supabase.com. Copy the project URL and anon key into `.env`. Enable email auth. Set token expiry to 7 days for hackathon convenience.

### p0t7 â€” Configure Supabase client singleton

One client. Exported once. Imported everywhere. Never instantiate the client inside a component or hook â€” that creates a new connection on every render.

```ts
// services/supabase.ts
import { createClient } from '@supabase/supabase-js'
import Constants from 'expo-constants'

const { supabaseUrl, supabaseAnonKey } =
  Constants.expoConfig?.extra ?? {}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### p0t8 â€” Set up navigation with Expo Router

Use Expo Router's file-based routing. Farmer and buyer flows live in separate route groups. The root layout checks auth state and redirects accordingly.

---

## Phase 1 â€” Database & Security

Get the schema right before writing any service code. Fixing a missing column after services are written means updating types, services, and UI simultaneously.

> Write all SQL in the Supabase dashboard SQL Editor. Run each block separately and verify the table appears before moving to the next one.

### p1t1 â€” Create users table

```sql
create table public.users (
  id          uuid references auth.users(id) on delete cascade primary key,
  full_name   text not null,
  phone       text,
  role        text not null check (role in ('farmer', 'buyer')),
  city        text,
  avatar_url  text,
  created_at  timestamptz default now()
);

alter table public.users enable row level security;
```

### p1t2 â€” Create listings table

```sql
create table public.listings (
  id               uuid default gen_random_uuid() primary key,
  seller_id        uuid references public.users(id) on delete cascade not null,
  title            text not null,
  waste_type       text not null,
  description      text,
  quantity         numeric not null,
  unit             text not null,
  price            numeric not null,
  accept_offers    boolean default false,
  image_url        text,
  address          text,
  latitude         double precision not null,
  longitude        double precision not null,
  fulfillment_type text not null check (fulfillment_type in ('pickup', 'delivery', 'both')),
  status           text not null default 'active' check (status in ('active', 'sold', 'unavailable')),
  created_at       timestamptz default now()
);

create index listings_seller_id_idx on public.listings(seller_id);
create index listings_status_idx on public.listings(status);
alter table public.listings enable row level security;
```

### p1t3 â€” Create contact_requests table

```sql
create table public.contact_requests (
  id         uuid default gen_random_uuid() primary key,
  listing_id uuid references public.listings(id) on delete cascade not null,
  buyer_id   uuid references public.users(id) on delete cascade not null,
  seller_id  uuid references public.users(id) on delete cascade not null,
  message    text,
  status     text not null default 'pending' check (status in ('pending', 'seen')),
  created_at timestamptz default now()
);

alter table public.contact_requests enable row level security;
```

### p1t4 â€” Create waste_suggestions table and seed data

Seed at least 8 waste types. These drive the Waste-to-Value suggestions panel in the create listing form.

```sql
create table public.waste_suggestions (
  id            uuid default gen_random_uuid() primary key,
  waste_type    text not null,
  suggested_use text not null
);

insert into public.waste_suggestions (waste_type, suggested_use) values
  ('coconut_husk',    'Coco coir fiber'),
  ('coconut_husk',    'Erosion control matting'),
  ('coconut_husk',    'Compost input'),
  ('coconut_husk',    'Handicraft material'),
  ('rice_straw',      'Mushroom growing substrate'),
  ('rice_straw',      'Animal feed (dry season)'),
  ('rice_straw',      'Mulch for vegetable beds'),
  ('corn_stalks',     'Biomass fuel'),
  ('corn_stalks',     'Silage for livestock'),
  ('banana_trunk',    'Fiber extraction'),
  ('banana_trunk',    'Paper pulp'),
  ('sugarcane_bagasse', 'Bioethanol production'),
  ('sugarcane_bagasse', 'Particleboard filler'),
  ('pineapple_leaves', 'PiÃ±a textile fiber'),
  ('pineapple_leaves', 'Compost accelerator');
```

### p1t5 â€” Set up Supabase Storage buckets

Create two buckets: `listing-images` (public read) and `avatars` (public read). Set max file size to 5MB. Only authenticated users can upload.

### p1t6 â€” Write and test Row Level Security policies

| Table | Operation | Who | Condition |
|---|---|---|---|
| users | SELECT | All authenticated | id = auth.uid() OR viewing public profile |
| users | INSERT / UPDATE | Owner only | id = auth.uid() |
| listings | SELECT | All authenticated | status = 'active' |
| listings | INSERT | Farmers only | seller_id = auth.uid() |
| listings | UPDATE / DELETE | Owner only | seller_id = auth.uid() |
| contact_requests | INSERT | Buyers only | buyer_id = auth.uid() |
| contact_requests | SELECT | Buyer or Seller | buyer_id = auth.uid() OR seller_id = auth.uid() |

```sql
-- Example RLS policy (listings SELECT)
create policy "Anyone authenticated can view active listings"
  on public.listings for select
  to authenticated
  using (status = 'active');

create policy "Farmers can manage their own listings"
  on public.listings for all
  to authenticated
  using (seller_id = auth.uid())
  with check (seller_id = auth.uid());
```

### p1t7 â€” Generate TypeScript types from Supabase schema

Run the Supabase CLI command to generate `types/database.ts`. Keeps TypeScript aware of every column and its type. Repeat whenever the schema changes.

```bash
npx supabase gen types typescript \
  --project-id your-project-ref \
  > types/database.ts
```

---

## Phase 2 â€” Authentication

Build auth before anything else. Every screen that comes after needs to know who the user is and what role they hold.

### p2t1 â€” Build AuthService

Four focused functions. One job each. Return `{data, error}` consistently so callers never need to try/catch.

```ts
// services/authService.ts
import { supabase } from './supabase'
import type { AuthError, User } from '@supabase/supabase-js'

type AuthResult = { user: User | null; error: AuthError | null }

export async function signUp(
  email: string,
  password: string
): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({ email, password })
  return { user: data.user, error }
}

export async function signIn(
  email: string,
  password: string
): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { user: data.user, error }
}

export async function signOut() {
  return supabase.auth.signOut()
}

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}
```

### p2t2 â€” Build useAuth hook

Listens to Supabase auth state changes and exposes the current user and role to any component that needs it. Components should never call `supabase.auth` directly.

```ts
// hooks/useAuth.ts
import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import type { User } from '@supabase/supabase-js'
import type { UserRole } from '../types/app'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        setUser(session?.user ?? null)
        if (session?.user) await loadUserRole(session.user.id)
        setIsLoading(false)
      }
    )
    return () => listener.subscription.unsubscribe()
  }, [])

  async function loadUserRole(userId: string) {
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()
    if (data) setRole(data.role as UserRole)
  }

  return { user, role, isLoading }
}
```

### p2t3 â€” Splash Screen

Show logo and app name while `useAuth` resolves the session. Navigate to login if no session, or directly to the user's dashboard.

### p2t4 â€” Login Screen

Email + password fields. `react-hook-form` + Zod schema. Show inline error on failed login. Disable button while loading to prevent double-submit.

### p2t5 â€” Sign Up Screen

Email, password, confirm password, full name, phone. Validate locally before calling `authService.signUp`. On success, route to Role Selection.

### p2t6 â€” Role Selection Screen

Two large touch targets: Farmer and Buyer. On selection, insert row into `public.users` with the chosen role. Redirect to the appropriate dashboard.

### p2t7 â€” Auth state listener + session persistence

Supabase persists sessions in `AsyncStorage` automatically with the Expo adapter. Confirm the session survives an app restart before moving on.

### p2t8 â€” Protected route wrapper

In `app/_layout.tsx`, check `useAuth().isLoading` first (show splash), then check `user`. If null, redirect to `/login`. All routes below this layout are automatically protected.

---

## Phase 3 â€” User Profile

Buyers see seller names on listings. Farmers need a face behind the product. Build this early so all later screens can pull profile data cleanly.

### p3t1 â€” Build ProfileService

```ts
// services/profileService.ts
import { supabase } from './supabase'
import type { Tables } from '../types/database'

type UserProfile = Tables<'users'>

export async function getUserProfile(userId: string) {
  return supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
) {
  return supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
}
```

### p3t2 â€” Build useProfile hook

Wraps `getUserProfile`. Returns `{profile, isLoading, error, refetch}`. Components display data, not fetch logic.

### p3t3 â€” Image picker + compression utility

```ts
// utils/imageUtils.ts
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'

export async function pickAndCompressImage() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 1,
  })

  if (result.canceled || !result.assets[0]) return null

  const compressed = await ImageManipulator.manipulateAsync(
    result.assets[0].uri,
    [{ resize: { width: 800 } }],
    { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
  )

  return compressed.uri
}
```

### p3t4 â€” Profile Screen UI

Display avatar, name, role badge, city, phone. Edit button navigates to edit form. Keep it clean â€” avoid card-on-card nesting.

### p3t5 â€” Edit Profile form with validation

Pre-populate fields from `useProfile`. Validate with Zod. Call `updateUserProfile` on submit. Show success toast, not an alert.

---

## Phase 4 â€” Listing Creation â€” Farmer Flow

This is the core value creation action of the app. Make it fast, clear, and forgiving. Validate locally first. Upload images last.

### p4t1 â€” Build ListingService â€” farmer methods

```ts
// services/listingService.ts (farmer methods)
import { supabase } from './supabase'
import type { TablesInsert, TablesUpdate } from '../types/database'

export async function createListing(listing: TablesInsert<'listings'>) {
  return supabase
    .from('listings')
    .insert(listing)
    .select()
    .single()
}

export async function updateListing(
  id: string,
  updates: TablesUpdate<'listings'>
) {
  return supabase
    .from('listings')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
}

export async function getFarmerListings(sellerId: string) {
  return supabase
    .from('listings')
    .select('*')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
}

export async function setListingStatus(
  id: string,
  status: 'active' | 'sold' | 'unavailable'
) {
  return supabase
    .from('listings')
    .update({ status })
    .eq('id', id)
}
```

### p4t2 â€” Waste type constants + suggestions data

```ts
// utils/wasteTypes.ts
export const WASTE_TYPES = [
  { value: 'coconut_husk',      label: 'Coconut Husk' },
  { value: 'rice_straw',        label: 'Rice Straw' },
  { value: 'corn_stalks',       label: 'Corn Stalks' },
  { value: 'banana_trunk',      label: 'Banana Trunk' },
  { value: 'sugarcane_bagasse', label: 'Sugarcane Bagasse' },
  { value: 'pineapple_leaves',  label: 'Pineapple Leaves' },
  { value: 'cassava_peel',      label: 'Cassava Peel' },
  { value: 'other',             label: 'Other' },
] as const

export type WasteTypeValue = typeof WASTE_TYPES[number]['value']
```

### p4t3 â€” Storage service for image upload

Upload the compressed image URI. Return the public URL. Never return the raw storage path â€” callers need the full URL to display images.

```ts
// services/storageService.ts
import { supabase } from './supabase'

export async function uploadListingImage(
  uri: string,
  userId: string
): Promise<{ url: string | null; error: Error | null }> {
  const fileName = `${userId}/${Date.now()}.jpg`
  const response = await fetch(uri)
  const blob = await response.blob()

  const { error } = await supabase.storage
    .from('listing-images')
    .upload(fileName, blob, { contentType: 'image/jpeg', upsert: false })

  if (error) return { url: null, error }

  const { data } = supabase.storage
    .from('listing-images')
    .getPublicUrl(fileName)

  return { url: data.publicUrl, error: null }
}
```

### p4t4 â€” Map location picker component

A `MapView` with a centered pin. User drags the map, pin stays centered. On confirm, record the center coordinate as latitude/longitude. Show a live address preview using reverse geocoding via `expo-location`.

### p4t5 â€” Create Listing form â€” Part 1: basic details

Title, waste type selector (dropdown from `WASTE_TYPES`), description, quantity, unit, price, accept offers toggle. Validate before proceeding to Part 2.

### p4t6 â€” Create Listing form â€” Part 2: location + photo

Photo picker (calls `pickAndCompressImage`), location picker component, fulfillment type (pickup / delivery / both), address text field. On submit: upload image, then insert listing.

### p4t7 â€” Waste-to-Value suggestions panel

Query `waste_suggestions` filtered by the selected `waste_type`. Display as a horizontal chip strip below the waste type selector. Informs farmers of market opportunities for their waste.

### p4t8 â€” Zod schema for listing form

```ts
// utils/schemas.ts (listing schema)
import { z } from 'zod'
import { WASTE_TYPES } from './wasteTypes'

const wasteValues = WASTE_TYPES.map(w => w.value) as [string, ...string[]]

export const listingSchema = z.object({
  title:            z.string().min(3, 'Title is too short').max(80),
  waste_type:       z.enum(wasteValues),
  description:      z.string().max(500).optional(),
  quantity:         z.number().positive('Quantity must be positive'),
  unit:             z.string().min(1),
  price:            z.number().nonnegative('Price cannot be negative'),
  accept_offers:    z.boolean().default(false),
  fulfillment_type: z.enum(['pickup', 'delivery', 'both']),
  latitude:         z.number().min(-90).max(90),
  longitude:        z.number().min(-180).max(180),
  address:          z.string().optional(),
})
```

---

## Phase 5 â€” Listing Feed â€” Buyer Flow

Buyers see this first. It needs to load fast, scroll smoothly, and filter without a full page reload. Keep query logic in the service, not the component.

### p5t1 â€” Build ListingService â€” buyer methods with pagination

```ts
// services/listingService.ts (buyer methods)
type ListingFilters = {
  wasteType?: string
  fulfillmentType?: string
  minPrice?: number
  maxPrice?: number
  search?: string
}

const PAGE_SIZE = 12

export async function getListings(
  page: number,
  filters: ListingFilters = {}
) {
  let query = supabase
    .from('listings')
    .select('*, seller:users(full_name, city, avatar_url)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

  if (filters.wasteType)       query = query.eq('waste_type', filters.wasteType)
  if (filters.fulfillmentType) query = query.eq('fulfillment_type', filters.fulfillmentType)
  if (filters.minPrice)        query = query.gte('price', filters.minPrice)
  if (filters.maxPrice)        query = query.lte('price', filters.maxPrice)
  if (filters.search)          query = query.ilike('title', `%${filters.search}%`)

  return query
}

export async function getListingById(id: string) {
  return supabase
    .from('listings')
    .select('*, seller:users(*)')
    .eq('id', id)
    .single()
}
```

### p5t2 â€” Listing card component

Displays: image (fixed aspect ratio, object-cover), title, waste type, quantity + unit, price, city, fulfillment type. Tap navigates to details screen. Keep it one component â€” no sub-card nesting.

### p5t3 â€” Listing feed screen with infinite scroll

Use React Native `FlatList`. Set `onEndReachedThreshold={0.8}`. On `onEndReached`, increment page and append results. Show a small spinner at the bottom while the next page loads.

### p5t4 â€” Search bar with debounce

```ts
// hooks/useDebounce.ts
import { useState, useEffect } from 'react'

export function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
```

### p5t5 â€” Filter bottom sheet

Use `@gorhom/bottom-sheet`. Contains: waste type multi-select, pickup/delivery toggle, price range slider. Apply button resets pagination to page 0 and refetches with new filters.

### p5t6 â€” Connect search + filters to paginated query

Combine `useDebounce` on the search string with active filter state. Whenever either changes, reset to page 0 and refetch. The service layer handles the rest.

---

## Phase 6 â€” Dedicated Map Screen

The map is the PRD's core differentiator. Performance matters here. Fetch only coordinates for the initial load. Load full listing data only when a pin is tapped.

### p6t1 â€” Full-screen map setup with react-native-maps

Set `MapView` to `style={{ flex: 1 }}`. Initial region centers on Northern Mindanao (Cagayan de Oro: 8.4542Â° N, 124.6319Â° E) with delta 0.5. Follow the `react-native-maps` Expo install guide carefully for Android config.

### p6t2 â€” MapService â€” fetchListingPins

Fetch only the fields needed for pins. Full data is fetched separately when a pin is tapped.

```ts
// services/mapService.ts
import { supabase } from './supabase'

export async function fetchListingPins() {
  return supabase
    .from('listings')
    .select('id, title, waste_type, latitude, longitude')
    .eq('status', 'active')
}

// Called when a pin is tapped â€” loads the rest of the data
export async function fetchPinDetails(id: string) {
  return supabase
    .from('listings')
    .select('*, seller:users(full_name, city)')
    .eq('id', id)
    .single()
}
```

### p6t3 â€” Custom marker component

Use `Marker` with a custom `calloutAnchor`. Color the dot by waste type category (green for crop residue, brown for husk/trunk, amber for fiber). Keep the marker small â€” 14px dot with a white border.

### p6t4 â€” Marker clustering

Wrap `MapView` with `ClusteredMapView` from `react-native-map-clustering`. Set `radius={40}` and `minPoints={3}`. Cluster bubble shows count. Tap a cluster to zoom in.

### p6t5 â€” Pin popup preview card

On marker tap, call `fetchPinDetails` and display an absolutely-positioned card at the bottom of the map. Show: image, title, waste type, quantity, price, city. Include a View Details button and a dismiss button.

### p6t6 â€” Navigate to full listing details from popup

View Details button calls `router.push('/listing/' + id)`. This reuses the same listing details screen used by the feed â€” do not build a separate screen.

---

## Phase 7 â€” Listing Details Screen

This is a shared screen â€” reached from both the feed and the map. It receives a listing ID via route params and fetches the full data. Never pass full objects through navigation.

### p7t1 â€” Listing details screen

Read `id` from `useLocalSearchParams()`. Call `getListingById(id)`. Display: full-width image, title, description, quantity, price, accept_offers indicator. Strong type hierarchy â€” title leads, metadata follows at smaller scale.

### p7t2 â€” Seller info section

Avatar (initials fallback), full name, city. A divider line separates it from listing content. Do not nest this in a card â€” use whitespace and typography to create the boundary.

### p7t3 â€” Pickup / delivery label component

A simple reusable component: `<FulfillmentLabel type="pickup" />`. Renders a small icon + text. Used here and on the listing card. Define it once in `components/`.

### p7t4 â€” Contact Seller button

Sticky at the bottom of the screen (absolute position above the safe area). Visible only when the current user is a buyer. Tapping opens the contact modal from Phase 8.

---

## Phase 8 â€” Contact System

The MVP contact flow is intentionally simple: send a request, reveal the seller's phone number. No chat. No threading. Fast to build, sufficient to close a deal.

### p8t1 â€” Build ContactService

```ts
// services/contactService.ts
import { supabase } from './supabase'

export async function sendContactRequest(
  listingId: string,
  buyerId: string,
  sellerId: string,
  message?: string
) {
  return supabase
    .from('contact_requests')
    .insert({ listing_id: listingId, buyer_id: buyerId, seller_id: sellerId, message })
    .select()
    .single()
}

export async function getBuyerContactRequests(buyerId: string) {
  return supabase
    .from('contact_requests')
    .select('*, listing:listings(title), seller:users!seller_id(full_name, phone)')
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: false })
}

export async function getSellerInquiries(sellerId: string) {
  return supabase
    .from('contact_requests')
    .select('*, listing:listings(title), buyer:users!buyer_id(full_name, phone)')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
}
```

### p8t2 â€” Contact form modal

A bottom sheet with an optional message field and a Send Request button. On submit, call `sendContactRequest`. On success: dismiss the modal, show success toast, and immediately reveal the seller's phone number.

### p8t3 â€” Contact info reveal

After a contact request is sent, replace the Contact button with the seller's phone number displayed inline. Use `Linking.openURL('tel:' + phone)` so the user can call directly.

### p8t4 â€” Inquiry badge on farmer dashboard

Query `contact_requests` where `seller_id = userId AND status = 'pending'`. Show a count badge on the dashboard inquiry stat. Tapping it marks all as 'seen'.

### p8t5 â€” Buyer contact request history screen

Shows each request with the listing title, date sent, and seller phone (already revealed since they sent the request). Simple list, no pagination needed for MVP.

---

## Phase 9 â€” Dashboards & Management

Dashboards are functional, not decorative. Metrics boxes are appropriate here â€” this is exactly the case where a box earns its place. Keep the grid to three metrics maximum.

### p9t1 â€” Farmer dashboard

Three metric boxes followed by a short list of the farmer's most recent listings and a quick-create button.

| Active Listings | Sold | New Inquiries |
|---|---|---|
| â€” | â€” | â€” |

Counts come from three separate Supabase queries filtered by `seller_id`. Run them in parallel with `Promise.all`.

### p9t2 â€” Buyer dashboard

Two sections: Recently Viewed (stored in Zustand or local state, max 5 entries) and Sent Contact Requests (fetched from Supabase). No metrics box â€” buyers have no numbers to track yet.

### p9t3 â€” My Listings screen (farmer)

Call `getFarmerListings`. Display each listing with its status indicator (active = green dot, sold = grey, unavailable = amber). Tap to edit. Long-press (or swipe) to access status change.

### p9t4 â€” Edit Listing screen

Reuse the Create Listing form. Pre-populate all fields from the existing listing data. On submit, call `updateListing` instead of `createListing`. Distinguish the two paths with a clear screen title.

### p9t5 â€” Mark listing as sold / unavailable

An action sheet with three options: Keep Active, Mark as Sold, Mark as Unavailable. Calls `setListingStatus`. Confirm with a toast. The listing immediately disappears from the buyer feed thanks to RLS.

### p9t6 â€” Recently viewed listings

Store a list of listing IDs in a Zustand store. Max length: 5. Push a new ID whenever a buyer opens a listing. The buyer dashboard reads this store and displays the listings in order.

---

## Phase 10 â€” Polish & QA

The difference between a demo that looks finished and one that looks half-done is usually loading states and empty states â€” not features. Do this phase properly.

### p10t1 â€” Skeleton loading screens for feed and map

For the feed: render 4 skeleton cards (pulsing grey rectangles matching the card layout) while data loads. For the map: show a plain map tile with a centered loading indicator until pins arrive.

### p10t2 â€” Error boundary components with retry

Wrap major screens in an error boundary. On error, display a simple message and a Retry button that calls the original fetch again. Never let a raw JS error crash the app silently.

### p10t3 â€” Empty state screens

Three empty states needed: (1) Feed â€” no listings match filters. (2) My Listings â€” farmer hasn't posted yet. (3) Contact requests â€” no requests sent/received. Each shows a short message and a relevant action button.

### p10t4 â€” Toast notification system

Build or install a simple toast component. Three variants: success (green), error (red), info (amber). Show for 3 seconds, auto-dismiss. Appears above the navigation bar. Used everywhere a form submits or an action completes.

### p10t5 â€” Deep linking for listing share

Register a URL scheme in `app.json`: `agriwaste://listing/[id]`. Use `Linking.createURL` to generate the share link. Tapping it from outside the app opens the listing details screen directly.

### p10t6 â€” App icon + splash screen assets

Design or source an icon: a stylized leaf or grain stalk. Export at 1024Ã—1024px for the app icon. Export splash at 1242Ã—2688px. Reference in `app.json`. Run `npx expo prebuild` to apply.

### p10t7 â€” Performance test on mid-range Android

Test on a real device (Snapdragon 662-class or equivalent). Verify: feed scrolls at 60fps, map loads within 3 seconds, image upload completes within 5 seconds on a 4G connection. Fix any jank before demo day.

### p10t8 â€” Final QA â€” walk every user story

| User Story | Pass? |
|---|---|
| A farmer can sign up, pick role, log in | â˜ |
| A farmer can create a listing with photo and pinned location | â˜ |
| A farmer can edit and mark a listing as sold | â˜ |
| A buyer can browse the listing feed | â˜ |
| A buyer can search and filter listings | â˜ |
| A buyer can open the map, see all pins, zoom and pan | â˜ |
| A buyer can tap a pin and see the popup preview | â˜ |
| A buyer can open full listing details from the popup | â˜ |
| A buyer can send a contact request and see the seller's phone | â˜ |
| All data persists correctly after app restart | â˜ |

---

## Clean Code Principles for This Project

| Principle | Rule |
|---|---|
| Name functions for what they return or do | Use `getUserProfile()`, not `fetchData()`. Use `formatPrice()`, not `helper()`. A reader should understand the function without opening it. |
| One function, one job | If a function fetches, formats, and updates UI â€” split it. Services fetch. Hooks manage state. Components render. Never mix the three. |
| Use early returns to avoid deep nesting | Return early on error or missing data. Code that runs to the bottom is the happy path. Deep nesting means you haven't returned early enough. |
| Be consistent everywhere | Pick single quotes or double â€” not both. Pick semicolons or not. Pick one naming convention. Apply it to every file. Consistency reads as quality. |
| Do not repeat logic | If you copy-paste something twice, it becomes a utility function on the third time. Build it, name it well, import it everywhere. |
| Separate concerns strictly | `components/` display. `services/` fetch and save. `utils/` transform. `hooks/` combine both and expose state. Never let a component touch Supabase directly. |
| Let the code explain itself | Good names eliminate most comments. Only comment the non-obvious: a business rule, a workaround, a magic number. Never comment what the code already says. |
| Refactor while building, not after | If you notice duplication while writing a third instance of something â€” stop and refactor it immediately. Waiting until later means it never happens. |

### The `useAsync` hook â€” standard async pattern

Use this in any hook that wraps an async call. It gives every screen a consistent `isLoading` and `error` to read from.

```ts
// hooks/useAsync.ts
import { useState, useEffect, useCallback } from 'react'

export function useAsync<T>(asyncFn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const run = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      setData(await asyncFn())
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }, deps)

  useEffect(() => { run() }, [run])

  return { data, isLoading, error, refetch: run }
}
```

### Folder naming convention

| Convention | Usage |
|---|---|
| PascalCase | Component files: `ListingCard.tsx`, `MapMarker.tsx`, `PinPopup.tsx` |
| camelCase | Everything else: `listingService.ts`, `useAuth.ts`, `imageUtils.ts` |
| SCREAMING_SNAKE | Constants only: `WASTE_TYPES`, `PAGE_SIZE`, `MAX_IMAGE_WIDTH` |
| kebab-case | Expo Router screen files: `create-listing.tsx`, `my-listings.tsx`, `role-select.tsx` |

---

*AgriWaste E-Market Â· MVP Build Plan Â· React Native + Expo + Supabase*

export type UserRole = 'farmer' | 'buyer'

export type ListingStatus = 'active' | 'sold' | 'unavailable'

export type FulfillmentType = 'pickup' | 'delivery' | 'both'

export type ServiceResult<T, E = Error> = {
  data: T | null
  error: E | null
}

export type ListingFilters = {
  wasteType?: string
  fulfillmentType?: FulfillmentType
  minPrice?: number
  maxPrice?: number
  search?: string
}

export type ListingPreview = {
  id: string
  title: string
  wasteType: string
  price: number
  unit: string
  quantity: number
  city: string
  imageUrl: string | null
  status: ListingStatus
  sellerName: string | null
  fulfillmentType: FulfillmentType
  createdAt: string
}

export type SellerProfile = {
  id: string
  fullName: string
  city: string | null
  avatarUrl: string | null
  phone: string | null
}

export type ListingDetail = {
  id: string
  sellerId: string
  title: string
  wasteType: string
  description: string | null
  quantity: number
  unit: string
  price: number
  acceptOffers: boolean
  imageUrl: string | null
  address: string | null
  city: string
  latitude: number | null
  longitude: number | null
  fulfillmentType: FulfillmentType
  status: ListingStatus
  createdAt: string
  seller: SellerProfile | null
}

export type ListingPin = {
  id: string
  title: string
  latitude: number
  longitude: number
  wasteType: string
}

export type ContactRequestSummary = {
  id: string
  listingId: string
  listingTitle: string
  buyerId: string
  sellerId: string
  counterpartName: string
  counterpartPhone: string | null
  counterpartCity: string | null
  message: string | null
  status: 'pending' | 'seen'
  createdAt: string
}

export type AIProvider = 'local_gemma' | 'gemini'
export type AIFeature = 'listing_copilot'

export type ListingAssistInput = {
  title: string
  description: string
  wasteType: string | null
  quantity: number | null
  unit: string | null
  city: string | null
  fulfillmentType: FulfillmentType | null
  price: number | null
  imageBase64?: string | null
  imageMimeType?: string | null
}

export type ListingAssistOutput = {
  improvedTitle: string
  improvedDescription: string
  suggestedWasteType: string | null
  suggestedUnit: string | null
  missingFields: string[]
  publishReadiness: 'ready' | 'needs_review'
  notes: string[]
}

export type ListingAssistResult = {
  eventId: string | null
  latencyMs: number | null
  provider: AIProvider
  fallbackUsed: boolean
  result: ListingAssistOutput
}

export type AIFeedbackInput = {
  eventId: string
  feature: AIFeature
  helpful: boolean
}

export type AIFeedbackResult = {
  eventId: string
  feature: AIFeature
  helpful: boolean
}

export type AIProviderHealth = {
  provider: AIProvider
  enabled: boolean
  available: boolean
  message: string | null
}

export type AIHealthResult = {
  available: boolean
  primaryProvider: AIProvider | null
  providers: AIProviderHealth[]
}

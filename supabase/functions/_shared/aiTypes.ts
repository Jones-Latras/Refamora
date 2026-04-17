export type AIProvider = 'local_gemma' | 'gemini'
export type AIFeature =
  | 'listing_copilot'
  | 'waste_value_advisor'
  | 'buyer_search_assistant'

export type ListingAssistInput = {
  title: string
  description: string
  wasteType: string | null
  quantity: number | null
  unit: string | null
  city: string | null
  fulfillmentType: 'pickup' | 'delivery' | 'both' | null
  price: number | null
  imageBase64?: string | null
  imageMimeType?: string | null
}

export type WasteValueAdviceInput = {
  wasteType: string
  city: string | null
}

export type BuyerSearchAssistInput = {
  query: string
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

export type WasteValueAdviceOutput = {
  uses: string[]
  cautions: string[]
  marketTip: string | null
}

export type BuyerSearchAssistOutput = {
  wasteType: string | null
  fulfillmentType: 'pickup' | 'delivery' | 'both' | null
  minPrice: number | null
  maxPrice: number | null
  search: string | null
  notes: string[]
}

export type ListingAssistResult = {
  eventId: string | null
  latencyMs: number | null
  provider: AIProvider
  fallbackUsed: boolean
  result: ListingAssistOutput
}

export type WasteValueAdviceResult = {
  eventId: string | null
  latencyMs: number | null
  provider: AIProvider
  fallbackUsed: boolean
  result: WasteValueAdviceOutput
}

export type BuyerSearchAssistResult = {
  eventId: string | null
  latencyMs: number | null
  provider: AIProvider
  fallbackUsed: boolean
  result: BuyerSearchAssistOutput
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

export type AIService = {
  assistListing(input: ListingAssistInput): Promise<ListingAssistOutput>
  adviseWasteValue(input: WasteValueAdviceInput): Promise<WasteValueAdviceOutput>
  parseBuyerSearch(
    input: BuyerSearchAssistInput,
  ): Promise<BuyerSearchAssistOutput>
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

export type AIProvider = 'local_gemma' | 'gemini'

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
  provider: AIProvider
  fallbackUsed: boolean
  result: ListingAssistOutput
}

export type AIService = {
  assistListing(input: ListingAssistInput): Promise<ListingAssistOutput>
}

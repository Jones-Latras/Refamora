import type {
  BuyerSearchAssistOutput,
  ListingAssistOutput,
  WasteValueAdviceOutput,
} from './aiTypes.ts'

export const listingAssistOutputJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    improvedTitle: {
      type: 'string',
      description: 'A cleaner marketplace-ready listing title.',
    },
    improvedDescription: {
      type: 'string',
      description: 'A concise but clear listing description.',
    },
    suggestedWasteType: {
      type: ['string', 'null'],
      description: 'Suggested waste type if it can be inferred.',
    },
    suggestedUnit: {
      type: ['string', 'null'],
      description: 'Suggested selling unit such as sack, kg, or bundle.',
    },
    missingFields: {
      type: 'array',
      items: { type: 'string' },
      description: 'Important missing pieces the farmer should still review.',
    },
    publishReadiness: {
      type: 'string',
      enum: ['ready', 'needs_review'],
      description: 'Whether the listing looks ready to publish.',
    },
    notes: {
      type: 'array',
      items: { type: 'string' },
      description: 'Short helpful notes for the farmer.',
    },
  },
  required: [
    'improvedTitle',
    'improvedDescription',
    'suggestedWasteType',
    'suggestedUnit',
    'missingFields',
    'publishReadiness',
    'notes',
  ],
} as const

export const wasteValueAdviceOutputJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    uses: {
      type: 'array',
      items: { type: 'string' },
      description: 'Short practical downstream uses for this waste type.',
    },
    cautions: {
      type: 'array',
      items: { type: 'string' },
      description: 'Short cautions or handling reminders.',
    },
    marketTip: {
      type: ['string', 'null'],
      description: 'A short note about what makes this waste valuable.',
    },
  },
  required: ['uses', 'cautions', 'marketTip'],
} as const

export const buyerSearchAssistOutputJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    wasteType: {
      type: ['string', 'null'],
      description: 'Best matching Refamora waste type value if identifiable.',
    },
    fulfillmentType: {
      type: ['string', 'null'],
      enum: ['pickup', 'delivery', 'both', null],
      description: 'Requested fulfillment type if clearly stated.',
    },
    minPrice: {
      type: ['number', 'null'],
      description: 'Lower bound if the request includes a price range.',
    },
    maxPrice: {
      type: ['number', 'null'],
      description: 'Upper bound if the request includes a price cap or range.',
    },
    search: {
      type: ['string', 'null'],
      description: 'Remaining keyword or location text to pass to standard search.',
    },
    notes: {
      type: 'array',
      items: { type: 'string' },
      description: 'Short notes describing assumptions or limits in the interpretation.',
    },
  },
  required: ['wasteType', 'fulfillmentType', 'minPrice', 'maxPrice', 'search', 'notes'],
} as const

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback
}

function asNullableString(value: unknown): string | null {
  const text = asString(value)
  return text.length > 0 ? text : null
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function normalizeListingAssistOutput(
  value: unknown,
): ListingAssistOutput {
  const raw = typeof value === 'object' && value ? value : {}

  return {
    improvedTitle: asString(
      Reflect.get(raw, 'improvedTitle'),
      'Polished listing title unavailable.',
    ),
    improvedDescription: asString(
      Reflect.get(raw, 'improvedDescription'),
      'Please review and complete the listing details manually.',
    ),
    suggestedWasteType: asNullableString(Reflect.get(raw, 'suggestedWasteType')),
    suggestedUnit: asNullableString(Reflect.get(raw, 'suggestedUnit')),
    missingFields: asStringArray(Reflect.get(raw, 'missingFields')),
    publishReadiness:
      Reflect.get(raw, 'publishReadiness') === 'ready' ? 'ready' : 'needs_review',
    notes: asStringArray(Reflect.get(raw, 'notes')),
  }
}

export function normalizeWasteValueAdviceOutput(
  value: unknown,
): WasteValueAdviceOutput {
  const raw = typeof value === 'object' && value ? value : {}

  return {
    uses: asStringArray(Reflect.get(raw, 'uses')).slice(0, 3),
    cautions: asStringArray(Reflect.get(raw, 'cautions')).slice(0, 2),
    marketTip: asNullableString(Reflect.get(raw, 'marketTip')),
  }
}

export function normalizeBuyerSearchAssistOutput(
  value: unknown,
): BuyerSearchAssistOutput {
  const raw = typeof value === 'object' && value ? value : {}
  const fulfillmentType = Reflect.get(raw, 'fulfillmentType')
  const minPrice = Reflect.get(raw, 'minPrice')
  const maxPrice = Reflect.get(raw, 'maxPrice')

  return {
    wasteType: asNullableString(Reflect.get(raw, 'wasteType')),
    fulfillmentType:
      fulfillmentType === 'pickup' ||
      fulfillmentType === 'delivery' ||
      fulfillmentType === 'both'
        ? fulfillmentType
        : null,
    minPrice: typeof minPrice === 'number' ? minPrice : null,
    maxPrice: typeof maxPrice === 'number' ? maxPrice : null,
    search: asNullableString(Reflect.get(raw, 'search')),
    notes: asStringArray(Reflect.get(raw, 'notes')).slice(0, 3),
  }
}

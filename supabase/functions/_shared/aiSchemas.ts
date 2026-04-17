import type {
  BuyerSearchAssistOutput,
  InquirySummaryOutput,
  ReplyDraftOutput,
  ListingModerationOutput,
  ListingAssistOutput,
  PhotoCheckOutput,
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
    sourceBasis: {
      type: 'array',
      items: { type: 'string' },
      description: 'Curated basis used to ground the advice.',
    },
  },
  required: ['uses', 'cautions', 'marketTip', 'sourceBasis'],
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

export const photoCheckOutputJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    qualityScore: {
      type: 'number',
      description: '0 to 100 estimate of how usable the listing photo is.',
    },
    readiness: {
      type: 'string',
      enum: ['good', 'needs_review', 'retake'],
      description: 'Whether the photo looks good, needs review, or should be retaken.',
    },
    retakeSuggestions: {
      type: 'array',
      items: { type: 'string' },
      description: 'Short practical suggestions for retaking the photo.',
    },
    likelyWasteType: {
      type: ['string', 'null'],
      description: 'Likely waste category if the material is recognizable.',
    },
    likelyWasteTypeConfidence: {
      type: 'string',
      enum: ['high', 'medium', 'low', 'unknown'],
      description: 'Confidence in the likely waste category.',
    },
    moderationStatus: {
      type: 'string',
      enum: ['clear', 'review'],
      description: 'Whether the image appears safe for normal marketplace use.',
    },
    notes: {
      type: 'array',
      items: { type: 'string' },
      description: 'Short quality or moderation notes.',
    },
  },
  required: [
    'qualityScore',
    'readiness',
    'retakeSuggestions',
    'likelyWasteType',
    'likelyWasteTypeConfidence',
    'moderationStatus',
    'notes',
  ],
} as const

export const listingModerationOutputJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    decision: {
      type: 'string',
      enum: ['allow', 'review', 'block'],
      description: 'Whether the listing should be allowed, reviewed, or blocked.',
    },
    safeToPublish: {
      type: 'boolean',
      description: 'True only when the listing looks safe to publish right now.',
    },
    reasons: {
      type: 'array',
      items: { type: 'string' },
      description: 'Short top-level reasons for the decision.',
    },
    fieldWarnings: {
      type: 'array',
      items: { type: 'string' },
      description: 'Warnings about listing title, description, price, or other text fields.',
    },
    imageWarnings: {
      type: 'array',
      items: { type: 'string' },
      description: 'Warnings about the listing image if one was provided.',
    },
  },
  required: [
    'decision',
    'safeToPublish',
    'reasons',
    'fieldWarnings',
    'imageWarnings',
  ],
} as const

export const inquirySummaryOutputJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: {
      type: 'string',
      description: 'Short overview of the seller inquiry inbox.',
    },
    priorityInquiryIds: {
      type: 'array',
      items: { type: 'string' },
      description: 'Inquiry ids that should be prioritized first.',
    },
    unansweredQuestions: {
      type: 'array',
      items: { type: 'string' },
      description: 'Buyer questions or concerns that still need a reply.',
    },
    followUpTips: {
      type: 'array',
      items: { type: 'string' },
      description: 'Short practical follow-up tips for the seller.',
    },
  },
  required: ['summary', 'priorityInquiryIds', 'unansweredQuestions', 'followUpTips'],
} as const

export const replyDraftOutputJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    draftReply: {
      type: 'string',
      description: 'Editable seller reply draft.',
    },
    tone: {
      type: 'string',
      enum: ['warm', 'direct', 'follow_up'],
      description: 'Primary tone used in the reply.',
    },
    unansweredQuestions: {
      type: 'array',
      items: { type: 'string' },
      description: 'Buyer questions that the draft should answer.',
    },
    keyPoints: {
      type: 'array',
      items: { type: 'string' },
      description: 'Key points included in the reply draft.',
    },
  },
  required: ['draftReply', 'tone', 'unansweredQuestions', 'keyPoints'],
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
    sourceBasis: asStringArray(Reflect.get(raw, 'sourceBasis')).slice(0, 3),
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

export function normalizePhotoCheckOutput(value: unknown): PhotoCheckOutput {
  const raw = typeof value === 'object' && value ? value : {}
  const qualityScore = Reflect.get(raw, 'qualityScore')
  const readiness = Reflect.get(raw, 'readiness')
  const likelyWasteTypeConfidence = Reflect.get(
    raw,
    'likelyWasteTypeConfidence',
  )
  const moderationStatus = Reflect.get(raw, 'moderationStatus')

  return {
    qualityScore:
      typeof qualityScore === 'number'
        ? Math.max(0, Math.min(100, Math.round(qualityScore)))
        : 50,
    readiness:
      readiness === 'good' || readiness === 'retake'
        ? readiness
        : 'needs_review',
    retakeSuggestions: asStringArray(Reflect.get(raw, 'retakeSuggestions')).slice(
      0,
      3,
    ),
    likelyWasteType: asNullableString(Reflect.get(raw, 'likelyWasteType')),
    likelyWasteTypeConfidence:
      likelyWasteTypeConfidence === 'high' ||
      likelyWasteTypeConfidence === 'medium' ||
      likelyWasteTypeConfidence === 'low'
        ? likelyWasteTypeConfidence
        : 'unknown',
    moderationStatus:
      moderationStatus === 'review' ? 'review' : 'clear',
    notes: asStringArray(Reflect.get(raw, 'notes')).slice(0, 3),
  }
}

export function normalizeListingModerationOutput(
  value: unknown,
): ListingModerationOutput {
  const raw = typeof value === 'object' && value ? value : {}
  const decision = Reflect.get(raw, 'decision')

  const normalizedDecision =
    decision === 'block' || decision === 'review' ? decision : 'allow'

  return {
    decision: normalizedDecision,
    safeToPublish:
      normalizedDecision === 'allow'
        ? true
        : Reflect.get(raw, 'safeToPublish') === true
          ? true
          : false,
    reasons: asStringArray(Reflect.get(raw, 'reasons')).slice(0, 3),
    fieldWarnings: asStringArray(Reflect.get(raw, 'fieldWarnings')).slice(0, 4),
    imageWarnings: asStringArray(Reflect.get(raw, 'imageWarnings')).slice(0, 4),
  }
}

export function normalizeInquirySummaryOutput(
  value: unknown,
): InquirySummaryOutput {
  const raw = typeof value === 'object' && value ? value : {}

  return {
    summary: asString(
      Reflect.get(raw, 'summary'),
      'No AI summary is available for these inquiries right now.',
    ),
    priorityInquiryIds: asStringArray(Reflect.get(raw, 'priorityInquiryIds')).slice(
      0,
      5,
    ),
    unansweredQuestions: asStringArray(
      Reflect.get(raw, 'unansweredQuestions'),
    ).slice(0, 4),
    followUpTips: asStringArray(Reflect.get(raw, 'followUpTips')).slice(0, 4),
  }
}

export function normalizeReplyDraftOutput(value: unknown): ReplyDraftOutput {
  const raw = typeof value === 'object' && value ? value : {}
  const tone = Reflect.get(raw, 'tone')

  return {
    draftReply: asString(
      Reflect.get(raw, 'draftReply'),
      'Hello, thank you for your inquiry. This is still available. Let me know your preferred pickup or delivery timing.',
    ),
    tone:
      tone === 'direct' || tone === 'follow_up'
        ? tone
        : 'warm',
    unansweredQuestions: asStringArray(
      Reflect.get(raw, 'unansweredQuestions'),
    ).slice(0, 4),
    keyPoints: asStringArray(Reflect.get(raw, 'keyPoints')).slice(0, 4),
  }
}

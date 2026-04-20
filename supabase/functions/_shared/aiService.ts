import type {
  AIProvider,
  BuyerSearchAssistInput,
  BuyerSearchAssistOutput,
  BuyerSearchAssistResult,
  AIHealthResult,
  InquirySummaryInput,
  InquirySummaryResult,
  ListingAssistInput,
  ListingAssistOutput,
  ListingAssistResult,
  ListingModerationInput,
  ListingModerationResult,
  PhotoCheckInput,
  PhotoCheckResult,
  ReplyDraftInput,
  ReplyDraftResult,
  WasteValueAdviceInput,
  WasteValueAdviceResult,
} from './aiTypes.ts'

import {
  checkGeminiHealth,
  geminiProvider,
} from './providers/geminiProvider.ts'
import {
  checkLocalGemmaHealth,
  localGemmaProvider,
} from './providers/localGemmaProvider.ts'

function isEnabled(value: string | undefined, fallback: boolean) {
  if (value == null) {
    return fallback
  }

  return value.trim().toLowerCase() === 'true'
}

function getProviderOrder(): AIProvider[] {
  const localEnabled = isEnabled(Deno.env.get('LOCAL_GEMMA_ENABLED'), true)
  const geminiEnabled = isEnabled(Deno.env.get('GEMINI_ENABLED'), false)

  const providers: AIProvider[] = []

  if (localEnabled) {
    providers.push('local_gemma')
  }

  if (geminiEnabled) {
    providers.push('gemini')
  }

  return providers
}

function getPhotoProviderOrder(): AIProvider[] {
  return isProviderEnabled('gemini') ? ['gemini'] : []
}

function getListingModerationProviderOrder(
  input: ListingModerationInput,
): AIProvider[] {
  if (input.imageBase64) {
    return isProviderEnabled('gemini') ? ['gemini'] : []
  }

  return getProviderOrder()
}

export function isProviderEnabled(provider: AIProvider) {
  if (provider === 'local_gemma') {
    return isEnabled(Deno.env.get('LOCAL_GEMMA_ENABLED'), true)
  }

  return isEnabled(Deno.env.get('GEMINI_ENABLED'), false)
}

function hasText(value: string | null | undefined) {
  return typeof value === 'string' && value.trim().length > 0
}

function normalizeSellingUnit(unit: string | null | undefined) {
  if (!hasText(unit)) {
    return null
  }

  return unit.trim().replace(/^\/+/, '')
}

function attachUnitToPriceMentions(
  text: string,
  unit: string | null | undefined,
) {
  const normalizedUnit = normalizeSellingUnit(unit)

  if (!normalizedUnit) {
    return text
  }

  return text.replace(
    /(?:PHP\s*\d[\d,]*(?:\.\d+)?|₱\s*\d[\d,]*(?:\.\d+)?|\d[\d,]*(?:\.\d+)?\s*(?:Philippine pesos?|pesos?))/gi,
    (match, offset, source) => {
      const trailingText = source.slice(offset + match.length, offset + match.length + 32)

      if (/^\s*(?:\/|per\b|for\s+\d+(?:\.\d+)?\s+\S+|each\b)/i.test(trailingText)) {
        return match
      }

      return `${match} per ${normalizedUnit}`
    },
  )
}

function buildBuyerSearchFallback(
  input: BuyerSearchAssistInput,
): BuyerSearchAssistOutput {
  const query = input.query.trim()
  const normalizedQuery = query.toLowerCase()

  const wasteTypeMatchers: Array<{
    wasteType: BuyerSearchAssistOutput['wasteType']
    patterns: RegExp[]
  }> = [
    {
      wasteType: 'coconut_husk',
      patterns: [
        /coconut husk/,
        /coco husk/,
        /bunot/,
        /coconut coir/,
        /coco coir/,
        /coconut fib(?:er|re)/,
        /coco fib(?:er|re)/,
        /coir/,
      ],
    },
    {
      wasteType: 'rice_straw',
      patterns: [
        /rice straw/,
        /\bstraw\b/,
        /dayami/,
        /rice hay/,
        /rice stalks?/,
        /palay straw/,
        /palay residue/,
      ],
    },
    {
      wasteType: 'corn_stalks',
      patterns: [
        /corn stalks?/,
        /maize stalks?/,
        /corn stover/,
        /corn residue/,
        /maize residue/,
        /mais stalk/,
        /tangkay ng mais/,
      ],
    },
    {
      wasteType: 'banana_trunk',
      patterns: [
        /banana trunk/,
        /banana stem/,
        /banana stalk/,
        /banana core/,
        /pseudostem/,
        /saging trunk/,
        /saging stem/,
      ],
    },
    {
      wasteType: 'sugarcane_bagasse',
      patterns: [
        /bagasse/,
        /sugarcane bagasse/,
        /sugar cane bagasse/,
        /sugarcane fib(?:er|re)/,
        /tubo/,
        /tubo residue/,
      ],
    },
    {
      wasteType: 'pineapple_leaves',
      patterns: [
        /pineapple leaves?/,
        /pina leaves?/,
        /pina fib(?:er|re)/,
        /pineapple fib(?:er|re)/,
        /dahon ng pinya/,
      ],
    },
    {
      wasteType: 'cassava_peel',
      patterns: [
        /cassava peels?/,
        /kamoteng kahoy peels?/,
        /tapioca peels?/,
        /balat ng cassava/,
        /cassava skin/,
      ],
    },
  ]

  const wasteType =
    wasteTypeMatchers.find((item) =>
      item.patterns.some((pattern) => pattern.test(normalizedQuery)),
    )?.wasteType ?? null

  const fulfillmentType = normalizedQuery.includes('delivery')
    ? normalizedQuery.includes('pickup')
      ? 'both'
      : 'delivery'
    : normalizedQuery.includes('pickup') || normalizedQuery.includes('pick up')
      ? 'pickup'
      : null

  const underMatch = normalizedQuery.match(
    /(?:under|below|less than|max(?:imum)?|up to)\s*(?:php|p)?\s*([\d,]+(?:\.\d+)?)/,
  )
  const aboveMatch = normalizedQuery.match(
    /(?:above|over|more than|min(?:imum)?|at least)\s*(?:php|p)?\s*([\d,]+(?:\.\d+)?)/,
  )
  const rangeMatch = normalizedQuery.match(
    /(?:php|p)?\s*([\d,]+(?:\.\d+)?)\s*(?:-|to)\s*(?:php|p)?\s*([\d,]+(?:\.\d+)?)/,
  )

  const parseAmount = (value: string | undefined) =>
    value ? Number(value.replaceAll(',', '')) : null

  const minPrice = rangeMatch
    ? parseAmount(rangeMatch[1])
    : parseAmount(aboveMatch?.[1])
  const maxPrice = rangeMatch
    ? parseAmount(rangeMatch[2])
    : parseAmount(underMatch?.[1])

  const fillerPatterns = [
    /delivery/g,
    /pick\s*up/g,
    /pickup/g,
    /(?:under|below|less than|max(?:imum)?|up to)\s*(?:php|p)?\s*[\d,]+(?:\.\d+)?/g,
    /(?:above|over|more than|min(?:imum)?|at least)\s*(?:php|p)?\s*[\d,]+(?:\.\d+)?/g,
    /(?:php|p)?\s*[\d,]+(?:\.\d+)?\s*(?:-|to)\s*(?:php|p)?\s*[\d,]+(?:\.\d+)?/g,
  ]

  let search = query

  for (const pattern of fillerPatterns) {
    search = search.replace(pattern, ' ')
  }

  const cleanedSearch = search.replace(/\s+/g, ' ').trim()

  return {
    wasteType,
    fulfillmentType,
    minPrice:
      typeof minPrice === 'number' && Number.isFinite(minPrice) ? minPrice : null,
    maxPrice:
      typeof maxPrice === 'number' && Number.isFinite(maxPrice) ? maxPrice : null,
    search: cleanedSearch.length > 0 ? cleanedSearch : query,
    notes: [
      'AI search fallback was used because the model was unavailable.',
      'Please review the interpreted filters before applying them.',
    ],
  }
}

function deriveListingAssistOutput(
  input: ListingAssistInput,
  output: ListingAssistOutput,
): ListingAssistOutput {
  const missingFields: string[] = []

  if (!hasText(input.title)) {
    missingFields.push('Add a listing title')
  }

  if (!hasText(input.description)) {
    missingFields.push('Add a clear listing description')
  }

  if (!hasText(input.wasteType)) {
    missingFields.push('Choose the correct waste type')
  }

  if (input.quantity == null || Number.isNaN(input.quantity) || input.quantity <= 0) {
    missingFields.push('Enter the available quantity')
  }

  if (!hasText(input.unit)) {
    missingFields.push('Choose a selling unit')
  }

  if (input.price == null || Number.isNaN(input.price) || input.price < 0) {
    missingFields.push('Set a listing price')
  }

  if (!hasText(input.city)) {
    missingFields.push('Add the listing city')
  }

  if (!hasText(input.fulfillmentType)) {
    missingFields.push('Select pickup, delivery, or both')
  }

  const normalizedMissingFields = Array.from(
    new Set([...missingFields, ...output.missingFields.filter(Boolean)]),
  )
  const effectiveUnit = input.unit ?? output.suggestedUnit

  return {
    ...output,
    improvedDescription: attachUnitToPriceMentions(
      output.improvedDescription,
      effectiveUnit,
    ),
    missingFields: normalizedMissingFields,
    publishReadiness: normalizedMissingFields.length === 0 ? 'ready' : 'needs_review',
    notes: Array.from(new Set(output.notes.filter(Boolean))).slice(0, 4),
  }
}

export async function assistListing(
  input: ListingAssistInput,
): Promise<ListingAssistResult> {
  const order = getProviderOrder()

  if (order.length === 0) {
    throw new Error('No AI providers are enabled.')
  }

  const errors: string[] = []

  for (let index = 0; index < order.length; index += 1) {
    const provider = order[index]

    try {
      const result =
        provider === 'local_gemma'
          ? await localGemmaProvider.assistListing(input)
          : await geminiProvider.assistListing(input)

      return {
        provider,
        fallbackUsed: index > 0,
        result: deriveListingAssistOutput(input, result),
      }
    } catch (error) {
      errors.push(
        `${provider}: ${error instanceof Error ? error.message : 'Unknown provider error.'}`,
      )
    }
  }

  throw new Error(errors.join(' | '))
}

export async function adviseWasteValue(
  input: WasteValueAdviceInput,
): Promise<WasteValueAdviceResult> {
  const order = getProviderOrder()

  if (order.length === 0) {
    throw new Error('No AI providers are enabled.')
  }

  const errors: string[] = []

  for (let index = 0; index < order.length; index += 1) {
    const provider = order[index]

    try {
      const result =
        provider === 'local_gemma'
          ? await localGemmaProvider.adviseWasteValue(input)
          : await geminiProvider.adviseWasteValue(input)

      return {
        eventId: null,
        latencyMs: null,
        provider,
        fallbackUsed: index > 0,
        queuedForReview: false,
        reviewQueueId: null,
        result,
      }
    } catch (error) {
      errors.push(
        `${provider}: ${error instanceof Error ? error.message : 'Unknown provider error.'}`,
      )
    }
  }

  throw new Error(errors.join(' | '))
}

export async function parseBuyerSearch(
  input: BuyerSearchAssistInput,
): Promise<BuyerSearchAssistResult> {
  const order = getProviderOrder()

  if (order.length === 0) {
    return {
      eventId: null,
      latencyMs: null,
      provider: 'local_gemma',
      fallbackUsed: true,
      result: buildBuyerSearchFallback(input),
    }
  }

  const errors: string[] = []

  for (let index = 0; index < order.length; index += 1) {
    const provider = order[index]

    try {
      const result =
        provider === 'local_gemma'
          ? await localGemmaProvider.parseBuyerSearch(input)
          : await geminiProvider.parseBuyerSearch(input)

      return {
        eventId: null,
        latencyMs: null,
        provider,
        fallbackUsed: index > 0,
        result,
      }
    } catch (error) {
      errors.push(
        `${provider}: ${error instanceof Error ? error.message : 'Unknown provider error.'}`,
      )
    }
  }

  const fallbackResult = buildBuyerSearchFallback(input)

  return {
    eventId: null,
    latencyMs: null,
    provider: order[0],
    fallbackUsed: true,
    result: {
      ...fallbackResult,
      notes: [
        ...fallbackResult.notes,
        errors[0] ?? 'AI search parsing failed.',
      ].slice(0, 3),
    },
  }
}

export async function moderateListing(
  input: ListingModerationInput,
): Promise<ListingModerationResult> {
  const order = getListingModerationProviderOrder(input)

  if (order.length === 0) {
    throw new Error(
      input.imageBase64
        ? 'Gemini is required for photo moderation and is not enabled.'
        : 'No AI providers are enabled.',
    )
  }

  const errors: string[] = []

  for (let index = 0; index < order.length; index += 1) {
    const provider = order[index]

    try {
      const result =
        provider === 'local_gemma'
          ? await localGemmaProvider.moderateListing(input)
          : await geminiProvider.moderateListing(input)

      return {
        eventId: null,
        latencyMs: null,
        provider,
        fallbackUsed: index > 0,
        result,
      }
    } catch (error) {
      errors.push(
        `${provider}: ${error instanceof Error ? error.message : 'Unknown provider error.'}`,
      )
    }
  }

  throw new Error(errors.join(' | '))
}

export async function checkListingPhoto(
  input: PhotoCheckInput,
): Promise<PhotoCheckResult> {
  const order = getPhotoProviderOrder()

  if (order.length === 0) {
    throw new Error('Gemini is required for photo analysis and is not enabled.')
  }

  const errors: string[] = []

  for (let index = 0; index < order.length; index += 1) {
    const provider = order[index]

    try {
      const result =
        provider === 'local_gemma'
          ? await localGemmaProvider.checkListingPhoto(input)
          : await geminiProvider.checkListingPhoto(input)

      return {
        eventId: null,
        latencyMs: null,
        provider,
        fallbackUsed: index > 0,
        result,
      }
    } catch (error) {
      errors.push(
        `${provider}: ${error instanceof Error ? error.message : 'Unknown provider error.'}`,
      )
    }
  }

  throw new Error(errors.join(' | '))
}

export async function summarizeInquiries(
  input: InquirySummaryInput,
): Promise<InquirySummaryResult> {
  const order = getProviderOrder()

  if (order.length === 0) {
    throw new Error('No AI providers are enabled.')
  }

  const errors: string[] = []

  for (let index = 0; index < order.length; index += 1) {
    const provider = order[index]

    try {
      const result =
        provider === 'local_gemma'
          ? await localGemmaProvider.summarizeInquiries(input)
          : await geminiProvider.summarizeInquiries(input)

      return {
        eventId: null,
        latencyMs: null,
        provider,
        fallbackUsed: index > 0,
        result,
      }
    } catch (error) {
      errors.push(
        `${provider}: ${error instanceof Error ? error.message : 'Unknown provider error.'}`,
      )
    }
  }

  throw new Error(errors.join(' | '))
}

export async function draftInquiryReply(
  input: ReplyDraftInput,
): Promise<ReplyDraftResult> {
  const order = getProviderOrder()

  if (order.length === 0) {
    throw new Error('No AI providers are enabled.')
  }

  const errors: string[] = []

  for (let index = 0; index < order.length; index += 1) {
    const provider = order[index]

    try {
      const result =
        provider === 'local_gemma'
          ? await localGemmaProvider.draftInquiryReply(input)
          : await geminiProvider.draftInquiryReply(input)

      return {
        eventId: null,
        latencyMs: null,
        provider,
        fallbackUsed: index > 0,
        result,
      }
    } catch (error) {
      errors.push(
        `${provider}: ${error instanceof Error ? error.message : 'Unknown provider error.'}`,
      )
    }
  }

  throw new Error(errors.join(' | '))
}

export async function getAIHealth(): Promise<AIHealthResult> {
  const localEnabled = isProviderEnabled('local_gemma')
  const geminiEnabled = isProviderEnabled('gemini')

  const providers = await Promise.all([
    localEnabled
      ? checkLocalGemmaHealth()
      : Promise.resolve({
          provider: 'local_gemma' as const,
          enabled: false,
          available: false,
          message: 'Local Gemma is disabled.',
        }),
    geminiEnabled
      ? checkGeminiHealth()
      : Promise.resolve({
          provider: 'gemini' as const,
          enabled: false,
          available: false,
          message: 'Gemini fallback is disabled.',
        }),
  ])

  const ordered = getProviderOrder()
  const primaryProvider =
    ordered.find((provider) =>
      providers.some(
        (item) => item.provider === provider && item.enabled && item.available,
      ),
    ) ?? null

  return {
    available: providers.some((provider) => provider.enabled && provider.available),
    primaryProvider,
    providers,
  }
}


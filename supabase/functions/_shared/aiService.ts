import type {
  AIProvider,
  BuyerSearchAssistInput,
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

export function isProviderEnabled(provider: AIProvider) {
  if (provider === 'local_gemma') {
    return isEnabled(Deno.env.get('LOCAL_GEMMA_ENABLED'), true)
  }

  return isEnabled(Deno.env.get('GEMINI_ENABLED'), false)
}

function hasText(value: string | null | undefined) {
  return typeof value === 'string' && value.trim().length > 0
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

  return {
    ...output,
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
    throw new Error('No AI providers are enabled.')
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

  throw new Error(errors.join(' | '))
}

export async function moderateListing(
  input: ListingModerationInput,
): Promise<ListingModerationResult> {
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

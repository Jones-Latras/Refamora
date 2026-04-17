import type {
  AIService,
  BuyerSearchAssistInput,
  ListingAssistInput,
  ListingModerationInput,
  PhotoCheckInput,
  WasteValueAdviceInput,
} from '../aiTypes.ts'

import {
  buyerSearchAssistOutputJsonSchema,
  listingModerationOutputJsonSchema,
  listingAssistOutputJsonSchema,
  normalizeBuyerSearchAssistOutput,
  normalizeListingModerationOutput,
  normalizeListingAssistOutput,
  normalizePhotoCheckOutput,
  normalizeWasteValueAdviceOutput,
  photoCheckOutputJsonSchema,
  wasteValueAdviceOutputJsonSchema,
} from '../aiSchemas.ts'
import { getWasteKnowledge } from '../wasteKnowledge.ts'

function getLocalGemmaConfig() {
  return {
    baseUrl:
      Deno.env.get('LOCAL_GEMMA_BASE_URL')?.trim() || 'http://127.0.0.1:11434',
    model: Deno.env.get('LOCAL_GEMMA_MODEL')?.trim() || 'gemma',
    timeoutMs: Number(Deno.env.get('LOCAL_GEMMA_TIMEOUT_MS') ?? '20000'),
  }
}

function buildListingAssistPrompt(input: ListingAssistInput) {
  return [
    'You are Refamora listing assistant.',
    'Improve the farmer listing while staying factual.',
    'Do not invent unavailable details.',
    'Return only JSON that matches the provided schema.',
    '',
    `Title: ${input.title}`,
    `Description: ${input.description}`,
    `Waste type: ${input.wasteType ?? 'unknown'}`,
    `Quantity: ${input.quantity ?? 'unknown'}`,
    `Unit: ${input.unit ?? 'unknown'}`,
    `City: ${input.city ?? 'unknown'}`,
    `Fulfillment type: ${input.fulfillmentType ?? 'unknown'}`,
    `Price: ${input.price ?? 'unknown'}`,
  ].join('\n')
}

function buildWasteValueAdvicePrompt(input: WasteValueAdviceInput) {
  const knowledge = getWasteKnowledge(input.wasteType)

  return [
    'You are Refamora waste-to-value advisor.',
    'Suggest short, practical, realistic ways a farmer can understand the value of this agricultural waste.',
    'Do not overclaim prices, demand, or scientific certainty.',
    'Keep the response educational and concise.',
    'Return only JSON that matches the provided schema.',
    '',
    `Waste type: ${input.wasteType}`,
    `City: ${input.city ?? 'unknown'}`,
    knowledge
      ? `Curated known uses: ${knowledge.curatedUses.join(', ')}`
      : 'Curated known uses: unavailable',
    knowledge
      ? `Curated cautions: ${knowledge.curatedCautions.join(', ')}`
      : 'Curated cautions: unavailable',
    knowledge
      ? `Curated market context: ${knowledge.marketContext}`
      : 'Curated market context: unavailable',
    knowledge
      ? `Curated source basis: ${knowledge.sourceBasis.join(', ')}`
      : 'Curated source basis: Refamora AI-only interpretation',
  ].join('\n')
}

function buildBuyerSearchPrompt(input: BuyerSearchAssistInput) {
  return [
    'You are Refamora buyer search assistant.',
    'Convert the buyer query into structured marketplace filters.',
    'Only use these waste type values when appropriate: coconut_husk, rice_straw, corn_stalks, banana_trunk, sugarcane_bagasse, pineapple_leaves, cassava_peel, other.',
    'Use the search field for leftover location or keyword text.',
    'Do not invent unavailable constraints.',
    'Return only JSON that matches the provided schema.',
    '',
    `Buyer query: ${input.query}`,
  ].join('\n')
}

function buildPhotoCheckPrompt(input: PhotoCheckInput) {
  return [
    'You are Refamora photo quality checker.',
    'Review the uploaded marketplace image for clarity, framing, lighting, and whether the agricultural waste is recognizable.',
    'Return a quality score from 0 to 100.',
    'Use readiness=retake when the image is too unclear, too dark, too far, or otherwise weak for a listing.',
    'Set moderationStatus=review only if the image appears unsafe, unrelated, or suspicious for a marketplace photo.',
    'Only suggest a likelyWasteType if the image is recognizable enough.',
    'Return only JSON that matches the provided schema.',
    '',
    `Expected waste type: ${input.wasteType ?? 'unknown'}`,
  ].join('\n')
}

function buildListingModerationPrompt(input: ListingModerationInput) {
  return [
    'You are Refamora listing moderation assistant.',
    'Review this agriwaste marketplace listing for unsafe, abusive, illegal, clearly off-topic, misleading, or suspicious content.',
    'Use decision=allow for normal marketplace listings, even if the writing is imperfect.',
    'Use decision=review when something looks suspicious, inconsistent, or possibly unrelated and the user should fix it before publishing.',
    'Use decision=block only for clearly unsafe, abusive, sexual, violent, illegal, scammy, or completely unrelated content.',
    'safeToPublish must be true only when decision=allow.',
    'Return only JSON that matches the provided schema.',
    '',
    `Title: ${input.title}`,
    `Description: ${input.description}`,
    `Waste type: ${input.wasteType ?? 'unknown'}`,
    `City: ${input.city ?? 'unknown'}`,
    `Price: ${input.price ?? 'unknown'}`,
    `Unit: ${input.unit ?? 'unknown'}`,
    input.imageBase64
      ? 'Image attached: yes'
      : 'Image attached: no, review text fields only',
  ].join('\n')
}

export const localGemmaProvider: AIService = {
  async assistListing(input) {
    const config = getLocalGemmaConfig()
    const response = await fetch(`${config.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(config.timeoutMs),
      body: JSON.stringify({
        model: config.model,
        prompt: buildListingAssistPrompt(input),
        format: listingAssistOutputJsonSchema,
        stream: false,
        images: input.imageBase64 ? [input.imageBase64] : undefined,
      }),
    })

    if (!response.ok) {
      throw new Error(`Local Gemma request failed with ${response.status}.`)
    }

    const payload = await response.json()
    const text =
      typeof payload?.response === 'string' ? payload.response.trim() : ''

    if (!text) {
      throw new Error('Local Gemma returned an empty response.')
    }

    return normalizeListingAssistOutput(JSON.parse(text))
  },
  async adviseWasteValue(input) {
    const knowledge = getWasteKnowledge(input.wasteType)
    const config = getLocalGemmaConfig()
    const response = await fetch(`${config.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(config.timeoutMs),
      body: JSON.stringify({
        model: config.model,
        prompt: buildWasteValueAdvicePrompt(input),
        format: wasteValueAdviceOutputJsonSchema,
        stream: false,
      }),
    })

    if (!response.ok) {
      throw new Error(`Local Gemma request failed with ${response.status}.`)
    }

    const payload = await response.json()
    const text =
      typeof payload?.response === 'string' ? payload.response.trim() : ''

    if (!text) {
      throw new Error('Local Gemma returned an empty response.')
    }

    const normalized = normalizeWasteValueAdviceOutput(JSON.parse(text))

    return {
      ...normalized,
      uses:
        normalized.uses.length > 0
          ? normalized.uses
          : knowledge?.curatedUses.slice(0, 3) ?? [],
      cautions:
        normalized.cautions.length > 0
          ? normalized.cautions
          : knowledge?.curatedCautions.slice(0, 2) ?? [],
      marketTip: normalized.marketTip ?? knowledge?.marketContext ?? null,
      sourceBasis:
        knowledge?.sourceBasis ??
        (normalized.sourceBasis.length > 0
          ? normalized.sourceBasis
          : ['Refamora AI-only interpretation']),
    }
  },
  async parseBuyerSearch(input) {
    const config = getLocalGemmaConfig()
    const response = await fetch(`${config.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(config.timeoutMs),
      body: JSON.stringify({
        model: config.model,
        prompt: buildBuyerSearchPrompt(input),
        format: buyerSearchAssistOutputJsonSchema,
        stream: false,
      }),
    })

    if (!response.ok) {
      throw new Error(`Local Gemma request failed with ${response.status}.`)
    }

    const payload = await response.json()
    const text =
      typeof payload?.response === 'string' ? payload.response.trim() : ''

    if (!text) {
      throw new Error('Local Gemma returned an empty response.')
    }

    return normalizeBuyerSearchAssistOutput(JSON.parse(text))
  },
  async checkListingPhoto(input) {
    const config = getLocalGemmaConfig()
    const response = await fetch(`${config.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(config.timeoutMs),
      body: JSON.stringify({
        model: config.model,
        prompt: buildPhotoCheckPrompt(input),
        format: photoCheckOutputJsonSchema,
        stream: false,
        images: [input.imageBase64],
      }),
    })

    if (!response.ok) {
      throw new Error(`Local Gemma request failed with ${response.status}.`)
    }

    const payload = await response.json()
    const text =
      typeof payload?.response === 'string' ? payload.response.trim() : ''

    if (!text) {
      throw new Error('Local Gemma returned an empty response.')
    }

    return normalizePhotoCheckOutput(JSON.parse(text))
  },
  async moderateListing(input) {
    const config = getLocalGemmaConfig()
    const response = await fetch(`${config.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(config.timeoutMs),
      body: JSON.stringify({
        model: config.model,
        prompt: buildListingModerationPrompt(input),
        format: listingModerationOutputJsonSchema,
        stream: false,
        images: input.imageBase64 ? [input.imageBase64] : undefined,
      }),
    })

    if (!response.ok) {
      throw new Error(`Local Gemma request failed with ${response.status}.`)
    }

    const payload = await response.json()
    const text =
      typeof payload?.response === 'string' ? payload.response.trim() : ''

    if (!text) {
      throw new Error('Local Gemma returned an empty response.')
    }

    return normalizeListingModerationOutput(JSON.parse(text))
  },
}

export async function checkLocalGemmaHealth() {
  const config = getLocalGemmaConfig()

  try {
    const response = await fetch(`${config.baseUrl}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(Math.min(config.timeoutMs, 4000)),
    })

    if (!response.ok) {
      return {
        provider: 'local_gemma' as const,
        enabled: true,
        available: false,
        message: `Local Gemma returned ${response.status}.`,
      }
    }

    return {
      provider: 'local_gemma' as const,
      enabled: true,
      available: true,
      message: `Local Gemma is reachable at ${config.baseUrl}.`,
    }
  } catch {
    return {
      provider: 'local_gemma' as const,
      enabled: true,
      available: false,
      message: 'Local Gemma is not reachable right now.',
    }
  }
}

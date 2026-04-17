import type {
  AIService,
  BuyerSearchAssistInput,
  ListingAssistInput,
  WasteValueAdviceInput,
} from '../aiTypes.ts'

import {
  buyerSearchAssistOutputJsonSchema,
  listingAssistOutputJsonSchema,
  normalizeBuyerSearchAssistOutput,
  normalizeListingAssistOutput,
  normalizeWasteValueAdviceOutput,
  wasteValueAdviceOutputJsonSchema,
} from '../aiSchemas.ts'

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
  return [
    'You are Refamora waste-to-value advisor.',
    'Suggest short, practical, realistic ways a farmer can understand the value of this agricultural waste.',
    'Do not overclaim prices, demand, or scientific certainty.',
    'Keep the response educational and concise.',
    'Return only JSON that matches the provided schema.',
    '',
    `Waste type: ${input.wasteType}`,
    `City: ${input.city ?? 'unknown'}`,
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

    return normalizeWasteValueAdviceOutput(JSON.parse(text))
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

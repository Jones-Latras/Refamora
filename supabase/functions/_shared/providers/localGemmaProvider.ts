import type { AIService, ListingAssistInput } from '../aiTypes.ts'

import {
  listingAssistOutputJsonSchema,
  normalizeListingAssistOutput,
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
}

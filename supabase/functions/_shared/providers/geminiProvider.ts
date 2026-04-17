import type { AIService, ListingAssistInput } from '../aiTypes.ts'

import {
  listingAssistOutputJsonSchema,
  normalizeListingAssistOutput,
} from '../aiSchemas.ts'

function getGeminiConfig() {
  return {
    apiKey: Deno.env.get('GEMINI_API_KEY')?.trim() || '',
    model: Deno.env.get('GEMINI_MODEL')?.trim() || 'gemini-2.5-flash',
    timeoutMs: Number(Deno.env.get('GEMINI_TIMEOUT_MS') ?? '20000'),
  }
}

function buildListingAssistPrompt(input: ListingAssistInput) {
  return [
    'You are Refamora listing assistant.',
    'Improve the farmer listing while staying factual.',
    'Do not invent unavailable details.',
    'Return only JSON that matches the schema.',
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

export const geminiProvider: AIService = {
  async assistListing(input) {
    const config = getGeminiConfig()

    if (!config.apiKey) {
      throw new Error('Missing GEMINI_API_KEY.')
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(config.timeoutMs),
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: buildListingAssistPrompt(input) }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseJsonSchema: listingAssistOutputJsonSchema,
          },
        }),
      },
    )

    if (!response.ok) {
      throw new Error(`Gemini request failed with ${response.status}.`)
    }

    const payload = await response.json()
    const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text

    if (typeof text !== 'string' || !text.trim()) {
      throw new Error('Gemini returned an empty response.')
    }

    return normalizeListingAssistOutput(JSON.parse(text))
  },
}

export async function checkGeminiHealth() {
  const config = getGeminiConfig()

  if (!config.apiKey) {
    return {
      provider: 'gemini' as const,
      enabled: false,
      available: false,
      message: 'Gemini is not configured.',
    }
  }

  return {
    provider: 'gemini' as const,
    enabled: true,
    available: true,
    message: `Gemini fallback is configured with model ${config.model}.`,
  }
}

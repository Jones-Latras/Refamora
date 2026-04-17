import type {
  AIService,
  BuyerSearchAssistInput,
  ListingAssistInput,
  PhotoCheckInput,
  WasteValueAdviceInput,
} from '../aiTypes.ts'

import {
  buyerSearchAssistOutputJsonSchema,
  listingAssistOutputJsonSchema,
  normalizeBuyerSearchAssistOutput,
  normalizeListingAssistOutput,
  normalizePhotoCheckOutput,
  normalizeWasteValueAdviceOutput,
  photoCheckOutputJsonSchema,
  wasteValueAdviceOutputJsonSchema,
} from '../aiSchemas.ts'
import { getWasteKnowledge } from '../wasteKnowledge.ts'

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

function buildWasteValueAdvicePrompt(input: WasteValueAdviceInput) {
  const knowledge = getWasteKnowledge(input.wasteType)

  return [
    'You are Refamora waste-to-value advisor.',
    'Suggest short, practical, realistic downstream uses and cautions for agricultural waste.',
    'Do not invent demand or guarantee profit.',
    'Keep the response educational and concise.',
    'Return only JSON that matches the schema.',
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
    'Return only JSON that matches the schema.',
    '',
    `Buyer query: ${input.query}`,
  ].join('\n')
}

function buildPhotoCheckPrompt(input: PhotoCheckInput) {
  return [
    'You are Refamora photo quality checker.',
    'Review the uploaded listing image for clarity, framing, lighting, and whether the agricultural waste is recognizable.',
    'Return a qualityScore from 0 to 100.',
    'Use readiness=retake when the image is too blurry, dark, far away, cropped poorly, or otherwise weak for a listing.',
    'Only suggest likelyWasteType if the material is visually recognizable.',
    'Use moderationStatus=review only if the image appears unrelated, unsafe, or suspicious for a marketplace listing.',
    'Return only JSON that matches the schema.',
    '',
    `Expected waste type: ${input.wasteType ?? 'unknown'}`,
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
  async adviseWasteValue(input) {
    const knowledge = getWasteKnowledge(input.wasteType)
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
              parts: [{ text: buildWasteValueAdvicePrompt(input) }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseJsonSchema: wasteValueAdviceOutputJsonSchema,
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
              parts: [{ text: buildBuyerSearchPrompt(input) }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseJsonSchema: buyerSearchAssistOutputJsonSchema,
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

    return normalizeBuyerSearchAssistOutput(JSON.parse(text))
  },
  async checkListingPhoto(input) {
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
              parts: [
                { text: buildPhotoCheckPrompt(input) },
                {
                  inlineData: {
                    mimeType: input.imageMimeType ?? 'image/jpeg',
                    data: input.imageBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseJsonSchema: photoCheckOutputJsonSchema,
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

    return normalizePhotoCheckOutput(JSON.parse(text))
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

import type {
  AIService,
  BuyerSearchAssistInput,
  InquirySummaryInput,
  ListingAssistInput,
  ListingModerationInput,
  PhotoCheckInput,
  ReplyDraftInput,
  WasteValueAdviceInput,
} from '../aiTypes.ts'

import {
  buyerSearchAssistOutputJsonSchema,
  inquirySummaryOutputJsonSchema,
  listingModerationOutputJsonSchema,
  listingAssistOutputJsonSchema,
  normalizeBuyerSearchAssistOutput,
  normalizeInquirySummaryOutput,
  normalizeListingModerationOutput,
  normalizeListingAssistOutput,
  normalizePhotoCheckOutput,
  normalizeReplyDraftOutput,
  normalizeWasteValueAdviceOutput,
  photoCheckOutputJsonSchema,
  replyDraftOutputJsonSchema,
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
    'Refamora operates in the Philippines, so use Philippine peso language when currency is mentioned.',
    'Rewrite only the facts already present in the input.',
    'Improve grammar, clarity, and marketplace wording.',
    'Make the title short, specific, and easier to scan.',
    'Make the description cleaner and more buyer-friendly.',
    'Never invent missing details.',
    'If a detail is missing, leave it missing.',
    'Do not use dollars or USD. Use PHP or peso wording instead.',
    'Keep output short and marketplace-ready.',
    'The title should usually be 4 to 8 words.',
    'The description should usually be 1 to 3 short sentences.',
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
    '',
    'Do polish the wording.',
    'Do not add new facts.',
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
    'Assume prices refer to Philippine pesos unless the user clearly says otherwise.',
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

function buildListingModerationPrompt(input: ListingModerationInput) {
  return [
    'You are Refamora listing moderation assistant.',
    'Review this agriwaste marketplace listing for unsafe, abusive, illegal, clearly off-topic, misleading, or suspicious content.',
    'Use decision=allow for normal marketplace listings, even if the writing is imperfect.',
    'Use decision=review when something looks suspicious, inconsistent, or possibly unrelated and the user should fix it before publishing.',
    'Use decision=block only for clearly unsafe, abusive, sexual, violent, illegal, scammy, or completely unrelated content.',
    'safeToPublish must be true only when decision=allow.',
    'Return only JSON that matches the schema.',
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

function buildInquirySummaryPrompt(input: InquirySummaryInput) {
  const inquiryLines = input.inquiries.map((inquiry, index) =>
    [
      `Inquiry ${index + 1} id: ${inquiry.id}`,
      `Listing: ${inquiry.listingTitle}`,
      `Buyer: ${inquiry.counterpartName}`,
      `City: ${inquiry.counterpartCity ?? 'unknown'}`,
      `Status: ${inquiry.status}`,
      `Message: ${inquiry.message ?? 'no message provided'}`,
      `Created: ${inquiry.createdAt}`,
    ].join('\n'),
  )

  return [
    'You are Refamora seller inquiry assistant.',
    'Summarize the current seller inquiries in a short, practical way.',
    'Prioritize the inquiries that look most urgent, recent, or still unanswered.',
    'List buyer questions or concerns that still need a reply.',
    'Return only JSON that matches the schema.',
    '',
    ...inquiryLines,
  ].join('\n\n')
}

function buildReplyDraftPrompt(input: ReplyDraftInput) {
  const inquiry = input.inquiry

  return [
    'You are Refamora seller reply assistant.',
    'Write a short, professional, friendly reply draft to the buyer.',
    'Do not invent prices, dates, delivery promises, or facts not present in the inquiry.',
    'If the buyer asks a question, acknowledge it and request the missing detail when needed.',
    'Return only JSON that matches the schema.',
    '',
    `Listing: ${inquiry.listingTitle}`,
    `Buyer: ${inquiry.counterpartName}`,
    `City: ${inquiry.counterpartCity ?? 'unknown'}`,
    `Status: ${inquiry.status}`,
    `Message: ${inquiry.message ?? 'no message provided'}`,
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
  async moderateListing(input) {
    const config = getGeminiConfig()

    if (!config.apiKey) {
      throw new Error('Missing GEMINI_API_KEY.')
    }

    const parts: Array<
      | { text: string }
      | { inlineData: { mimeType: string; data: string } }
    > = [{ text: buildListingModerationPrompt(input) }]

    if (input.imageBase64) {
      parts.push({
        inlineData: {
          mimeType: input.imageMimeType ?? 'image/jpeg',
          data: input.imageBase64,
        },
      })
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
              parts,
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseJsonSchema: listingModerationOutputJsonSchema,
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

    return normalizeListingModerationOutput(JSON.parse(text))
  },
  async summarizeInquiries(input) {
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
              parts: [{ text: buildInquirySummaryPrompt(input) }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseJsonSchema: inquirySummaryOutputJsonSchema,
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

    return normalizeInquirySummaryOutput(JSON.parse(text))
  },
  async draftInquiryReply(input) {
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
              parts: [{ text: buildReplyDraftPrompt(input) }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseJsonSchema: replyDraftOutputJsonSchema,
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

    return normalizeReplyDraftOutput(JSON.parse(text))
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

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
    'Refamora operates in the Philippines, so use Philippine peso language when currency is mentioned.',
    'Rewrite only the facts already present in the input.',
    'Improve grammar, clarity, and marketplace wording.',
    'Make the title short, specific, and easier to scan.',
    'Make the description cleaner and more buyer-friendly.',
    'Never invent missing details.',
    'If a detail is missing, leave it missing.',
    'Do not use dollars or USD. Use PHP or peso wording instead.',
    'If you mention price in the description, include the selling unit such as "PHP 10 per kg".',
    'Do not mention a bare price without its unit.',
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
    'Assume prices refer to Philippine pesos unless the user clearly says otherwise.',
    'Only use these waste type values when appropriate: coconut_husk, rice_straw, corn_stalks, banana_trunk, sugarcane_bagasse, pineapple_leaves, cassava_peel, other.',
    'Use the search field for leftover location or keyword text.',
    'Do not invent unavailable constraints.',
    'Return only JSON that matches the provided schema.',
    '',
    `Buyer query: ${input.query}`,
  ].join('\n')
}

function buildPhotoCheckPrompt(input: PhotoCheckInput) {
  const wasteVisualGuide = [
    '',
    'VISUAL IDENTIFICATION GUIDE FOR PHILIPPINE AGRICULTURAL WASTE:',
    '',
    'coconut_husk: Brown, fibrous outer shell of coconut. Rough hairy texture with thick fibers (coir). Often seen in piles, sometimes partially green if fresh. Oval/round shape. Very common in the Philippines.',
    'rice_straw: Dry, golden-yellow to pale beige hollow stems and leaves left after rice harvest. Often bundled in sheaves or scattered across harvested paddies. Thin, straw-like stalks.',
    'corn_stalks: Tall, thick, woody stalks with visible nodes/joints. Light green when fresh, drying to pale tan/brown. May still have dried leaves attached. Thicker than rice straw.',
    'banana_trunk: Large, layered, fibrous pseudo-stem. Light green to yellowish fleshy layers that peel apart. Often cut in sections showing concentric ring layers. Wet and fleshy when fresh.',
    'sugarcane_bagasse: Dry, fibrous, pulpy residue after juice extraction. Pale white to light tan color. Shredded, fibrous, fluffy texture. Often compressed or in loose piles.',
    'pineapple_leaves: Long, narrow, spiky green leaves with serrated edges. Tough and fibrous. Dark green color, sometimes with reddish-brown tips. Rosette arrangement.',
    'cassava_peel: Thin brown outer skin peeled from white/cream cassava root. Curled brownish peels, often muddy. Small pieces showing white flesh underneath the brown skin.',
    'other: Any agricultural waste not matching the above. Could include vegetable trimmings, fruit peels, wood chips, sawdust, animal manure, or mixed farm waste.',
    '',
    'IDENTIFICATION TIPS:',
    '- Look at color, texture, fiber structure, and shape to match the waste type.',
    '- Consider the setting: farm fields, drying areas, processing facilities, storage piles.',
    '- If the material is clearly agricultural waste but you cannot confidently match it to a specific type above, use "other".',
    '- If the photo shows a farm product (like fresh coconuts, bananas, corn, rice grain) rather than the waste/byproduct, still try to identify the waste type from the crop shown.',
  ].join('\n')

  return [
    'You are Refamora photo quality checker for a Philippine agricultural waste marketplace.',
    'Your job is to: (1) assess photo quality for a marketplace listing, and (2) identify the type of agricultural waste shown in the image.',
    '',
    'QUALITY ASSESSMENT:',
    'Return a quality score from 0 to 100 based on clarity, lighting, framing, and how easy it is to see the waste material.',
    'Use readiness=good when the photo is clear enough to use as a marketplace listing image.',
    'Use readiness=retake when the image is too blurry, too dark, too distant, poorly cropped, or the waste material is not visible enough.',
    '',
    'WASTE TYPE IDENTIFICATION:',
    'Carefully examine the image and try to identify the agricultural waste type using the visual guide below.',
    'Set likelyWasteType to the best match from: coconut_husk, rice_straw, corn_stalks, banana_trunk, sugarcane_bagasse, pineapple_leaves, cassava_peel, other.',
    'Set likelyWasteTypeConfidence to: high (you are very confident), medium (reasonable guess), or low (weak match).',
    'IMPORTANT: Always attempt identification. Even if quality is low, provide your best guess with an appropriate confidence level.',
    wasteVisualGuide,
    'MODERATION:',
    'Set moderationStatus=review only if the image appears unsafe, unrelated, or suspicious for a marketplace photo.',
    'Return only JSON that matches the provided schema.',
    '',
    `Expected waste type from seller: ${input.wasteType ?? 'unknown (identify from image)'}`,
  ].join('\n')
}

function buildListingModerationPrompt(input: ListingModerationInput) {
  return [
    'You are Refamora listing moderation assistant.',
    'Review this agriwaste marketplace listing for unsafe, abusive, illegal, clearly off-topic, misleading, or suspicious content.',
    'Use decision=allow for normal marketplace listings, even if the writing is brief, awkward, informal, or missing some detail.',
    'Do not use decision=review just because the description is short, the wording is casual, the title is simple, or the seller did not explain every use case.',
    'Use decision=review only when something looks genuinely suspicious, clearly inconsistent, likely misrepresented, or possibly unrelated to agricultural waste.',
    'Use decision=block only for clearly unsafe, abusive, sexual, violent, illegal, scammy, or completely unrelated content.',
    'Do not add imageWarnings just because an image is attached. Only warn about the image if it looks unrelated, suspicious, unsafe, or clearly inconsistent with the listing.',
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
    'Return only JSON that matches the provided schema.',
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
    'Return only JSON that matches the provided schema.',
    '',
    `Listing: ${inquiry.listingTitle}`,
    `Buyer: ${inquiry.counterpartName}`,
    `City: ${inquiry.counterpartCity ?? 'unknown'}`,
    `Status: ${inquiry.status}`,
    `Message: ${inquiry.message ?? 'no message provided'}`,
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
  async summarizeInquiries(input) {
    const config = getLocalGemmaConfig()
    const response = await fetch(`${config.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(config.timeoutMs),
      body: JSON.stringify({
        model: config.model,
        prompt: buildInquirySummaryPrompt(input),
        format: inquirySummaryOutputJsonSchema,
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

    return normalizeInquirySummaryOutput(JSON.parse(text))
  },
  async draftInquiryReply(input) {
    const config = getLocalGemmaConfig()
    const response = await fetch(`${config.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(config.timeoutMs),
      body: JSON.stringify({
        model: config.model,
        prompt: buildReplyDraftPrompt(input),
        format: replyDraftOutputJsonSchema,
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

    return normalizeReplyDraftOutput(JSON.parse(text))
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

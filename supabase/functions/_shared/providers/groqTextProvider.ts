import type {
  AIService,
  InquirySummaryInput,
  ListingAssistInput,
  ReplyDraftInput,
  WasteValueAdviceInput,
} from '../aiTypes.ts'

import {
  buyerSearchAssistOutputJsonSchema,
  inquirySummaryOutputJsonSchema,
  listingAssistOutputJsonSchema,
  listingModerationOutputJsonSchema,
  normalizeBuyerSearchAssistOutput,
  normalizeInquirySummaryOutput,
  normalizeListingAssistOutput,
  normalizeListingModerationOutput,
  normalizeReplyDraftOutput,
  normalizeWasteValueAdviceOutput,
  replyDraftOutputJsonSchema,
  wasteValueAdviceOutputJsonSchema,
} from '../aiSchemas.ts'
import { getWasteKnowledge } from '../wasteKnowledge.ts'
import {
  buildBuyerSearchPrompt,
  buildInquirySummaryPrompt,
  buildListingAssistPrompt,
  buildListingModerationPrompt,
  buildReplyDraftPrompt,
  buildWasteValueAdvicePrompt,
} from './prompts.ts'

function getGroqTextConfig() {
  return {
    apiKey: Deno.env.get('GROQ_API_KEY')?.trim() || '',
    model: Deno.env.get('GROQ_TEXT_MODEL')?.trim() || 'qwen/qwen3-32b',
    timeoutMs: Number(Deno.env.get('GROQ_TEXT_TIMEOUT_MS') ?? '20000'),
  }
}

const retryableGroqStatuses = new Set([429, 500, 502, 503, 504])
const groqRetryDelaysMs = [0, 900, 2000]

function isRetryableGroqError(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  const message = error.message.trim().toLowerCase()

  return (
    message.includes('request failed with 429') ||
    message.includes('request failed with 500') ||
    message.includes('request failed with 502') ||
    message.includes('request failed with 503') ||
    message.includes('request failed with 504') ||
    message.includes('temporarily busy') ||
    message.includes('temporarily overloaded') ||
    message.includes('timed out') ||
    message.includes('timeout') ||
    message.includes('generated json does not match')
  )
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function getGroqFailureMessage(response: Response) {
  let details = ''

  try {
    const payload = await response.clone().json()
    const candidateMessage =
      typeof payload?.error?.message === 'string'
        ? payload.error.message.trim()
        : ''

    if (candidateMessage) {
      details = candidateMessage
    }
  } catch {
    try {
      const text = await response.clone().text()

      if (text.trim()) {
        details = text.trim()
      }
    } catch {
      // ignore response parsing failures
    }
  }

  if (response.status === 429) {
    return details
      ? `Groq Text is rate-limited right now. ${details}`
      : 'Groq Text is rate-limited right now. Please try again in a moment.'
  }

  if (response.status === 503) {
    return details
      ? `Groq Text is temporarily busy. ${details}`
      : 'Groq Text is temporarily busy. Please try again in a few seconds.'
  }

  return details
    ? `Groq Text request failed with ${response.status}. ${details}`
    : `Groq Text request failed with ${response.status}.`
}

function extractGroqText(payload: unknown) {
  if (typeof payload !== 'object' || payload == null) {
    return ''
  }

  const choices = Reflect.get(payload, 'choices')
  const firstChoice = Array.isArray(choices) ? choices[0] : null

  if (typeof firstChoice !== 'object' || firstChoice == null) {
    return ''
  }

  const message = Reflect.get(firstChoice, 'message')

  if (typeof message !== 'object' || message == null) {
    return ''
  }

  const content = Reflect.get(message, 'content')

  if (typeof content === 'string') {
    return content.trim()
  }

  if (!Array.isArray(content)) {
    return ''
  }

  return content
    .map((item) =>
      typeof item === 'object' &&
      item &&
      Reflect.get(item, 'type') === 'text' &&
      typeof Reflect.get(item, 'text') === 'string'
        ? String(Reflect.get(item, 'text')).trim()
        : '',
    )
    .filter(Boolean)
    .join('\n')
    .trim()
}

function buildJsonModeMessages(prompt: string, responseJsonSchema: unknown) {
  return [
    {
      role: 'system',
      content: [
        'You are Refamora text AI.',
        'Return exactly one valid JSON object.',
        'Do not include markdown fences, explanations, or any text before or after the JSON.',
        'Use this target schema as the contract for keys and value types:',
        JSON.stringify(responseJsonSchema),
      ].join('\n'),
    },
    {
      role: 'user',
      content: `${prompt}\n\nReturn only one JSON object.`,
    },
  ]
}

async function generateGroqTextJson(
  config: ReturnType<typeof getGroqTextConfig>,
  prompt: string,
  responseJsonSchema: unknown,
) {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < groqRetryDelaysMs.length; attempt += 1) {
    const delayMs = groqRetryDelaysMs[attempt]

    if (delayMs > 0) {
      await sleep(delayMs)
    }

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(config.timeoutMs),
        body: JSON.stringify({
          model: config.model,
          temperature: 0.2,
          max_completion_tokens: 1200,
          reasoning_format: 'hidden',
          stream: false,
          messages: buildJsonModeMessages(prompt, responseJsonSchema),
          response_format: {
            type: 'json_object',
          },
        }),
      })

      if (!response.ok) {
        const error = new Error(await getGroqFailureMessage(response))

        if (
          attempt < groqRetryDelaysMs.length - 1 &&
          retryableGroqStatuses.has(response.status)
        ) {
          lastError = error
          continue
        }

        throw error
      }

      const payload = await response.json()
      const text = extractGroqText(payload)

      if (!text) {
        throw new Error('Groq Text returned an empty response.')
      }

      return JSON.parse(text)
    } catch (error) {
      const normalizedError =
        error instanceof Error ? error : new Error('Groq Text request failed.')

      if (
        attempt < groqRetryDelaysMs.length - 1 &&
        isRetryableGroqError(normalizedError)
      ) {
        lastError = normalizedError
        continue
      }

      throw normalizedError
    }
  }

  throw lastError ?? new Error('Groq Text request failed.')
}

async function generateListingAssist(input: ListingAssistInput) {
  const config = getGroqTextConfig()

  if (!config.apiKey) {
    throw new Error('Groq Text is not configured. Missing GROQ_API_KEY.')
  }

  const payload = await generateGroqTextJson(
    config,
    buildListingAssistPrompt(input),
    listingAssistOutputJsonSchema,
  )

  return normalizeListingAssistOutput(payload)
}

async function generateWasteValueAdvice(input: WasteValueAdviceInput) {
  const knowledge = getWasteKnowledge(input.wasteType)
  const config = getGroqTextConfig()

  if (!config.apiKey) {
    throw new Error('Groq Text is not configured. Missing GROQ_API_KEY.')
  }

  const payload = await generateGroqTextJson(
    config,
    buildWasteValueAdvicePrompt(input),
    wasteValueAdviceOutputJsonSchema,
  )

  const normalized = normalizeWasteValueAdviceOutput(payload)

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
}

async function generateInquirySummary(input: InquirySummaryInput) {
  const config = getGroqTextConfig()

  if (!config.apiKey) {
    throw new Error('Groq Text is not configured. Missing GROQ_API_KEY.')
  }

  const payload = await generateGroqTextJson(
    config,
    buildInquirySummaryPrompt(input),
    inquirySummaryOutputJsonSchema,
  )

  return normalizeInquirySummaryOutput(payload)
}

async function generateReplyDraft(input: ReplyDraftInput) {
  const config = getGroqTextConfig()

  if (!config.apiKey) {
    throw new Error('Groq Text is not configured. Missing GROQ_API_KEY.')
  }

  const payload = await generateGroqTextJson(
    config,
    buildReplyDraftPrompt(input),
    replyDraftOutputJsonSchema,
  )

  return normalizeReplyDraftOutput(payload)
}

export const groqTextProvider: Pick<
  AIService,
  | 'assistListing'
  | 'adviseWasteValue'
  | 'parseBuyerSearch'
  | 'moderateListing'
  | 'summarizeInquiries'
  | 'draftInquiryReply'
> = {
  assistListing: generateListingAssist,
  adviseWasteValue: generateWasteValueAdvice,
  async parseBuyerSearch(input) {
    const config = getGroqTextConfig()

    if (!config.apiKey) {
      throw new Error('Groq Text is not configured. Missing GROQ_API_KEY.')
    }

    const payload = await generateGroqTextJson(
      config,
      buildBuyerSearchPrompt(input),
      buyerSearchAssistOutputJsonSchema,
    )

    return normalizeBuyerSearchAssistOutput(payload)
  },
  async moderateListing(input) {
    const config = getGroqTextConfig()

    if (!config.apiKey) {
      throw new Error('Groq Text is not configured. Missing GROQ_API_KEY.')
    }

    const payload = await generateGroqTextJson(
      config,
      buildListingModerationPrompt(input),
      listingModerationOutputJsonSchema,
    )

    return normalizeListingModerationOutput(payload)
  },
  summarizeInquiries: generateInquirySummary,
  draftInquiryReply: generateReplyDraft,
}

export async function checkGroqTextHealth() {
  const config = getGroqTextConfig()

  if (!config.apiKey) {
    return {
      provider: 'groq_text' as const,
      enabled: false,
      available: false,
      message: 'Groq Text is not configured.',
    }
  }

  return {
    provider: 'groq_text' as const,
    enabled: true,
    available: true,
    message: `Groq Text is configured with model ${config.model}.`,
  }
}

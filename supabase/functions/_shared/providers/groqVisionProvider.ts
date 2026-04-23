import type {
  AIService,
  ListingModerationInput,
  PhotoCheckInput,
} from '../aiTypes.ts'

import {
  listingModerationOutputJsonSchema,
  normalizeListingModerationOutput,
  normalizePhotoCheckOutput,
  photoCheckOutputJsonSchema,
} from '../aiSchemas.ts'
import {
  buildListingModerationPrompt,
  buildPhotoCheckPrompt,
} from './prompts.ts'

function getGroqVisionConfig() {
  return {
    apiKey: Deno.env.get('GROQ_API_KEY')?.trim() || '',
    model:
      Deno.env.get('GROQ_VISION_MODEL')?.trim() ||
      'meta-llama/llama-4-scout-17b-16e-instruct',
    timeoutMs: Number(Deno.env.get('GROQ_VISION_TIMEOUT_MS') ?? '20000'),
  }
}

const retryableGroqStatuses = new Set([429, 500, 502, 503, 504])
const groqRetryDelaysMs = [0, 900, 2000]
const maxGroqBase64Bytes = 4 * 1024 * 1024

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
    message.includes('timeout')
  )
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

function estimateBase64Bytes(value: string) {
  const normalized = value.trim()
  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0

  return Math.floor((normalized.length * 3) / 4) - padding
}

function ensureGroqImageSize(base64: string) {
  if (estimateBase64Bytes(base64) > maxGroqBase64Bytes) {
    throw new Error(
      'The image is too large for Groq Vision. Use a smaller or more compressed photo.',
    )
  }
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

  if (response.status === 413) {
    return details
      ? `Groq Vision image request is too large. ${details}`
      : 'Groq Vision image request is too large. Base64 image inputs must stay under 4MB.'
  }

  if (response.status === 429) {
    return details
      ? `Groq Vision is rate-limited right now. ${details}`
      : 'Groq Vision is rate-limited right now. Please try again in a moment.'
  }

  if (response.status === 503) {
    return details
      ? `Groq Vision is temporarily busy. ${details}`
      : 'Groq Vision is temporarily busy. Please try again in a few seconds.'
  }

  return details
    ? `Groq Vision request failed with ${response.status}. ${details}`
    : `Groq Vision request failed with ${response.status}.`
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

async function generateGroqVisionJson(
  config: ReturnType<typeof getGroqVisionConfig>,
  prompt: string,
  imageBase64: string,
  imageMimeType: string | null | undefined,
  responseJsonSchema: unknown,
  schemaName: string,
) {
  ensureGroqImageSize(imageBase64)

  const mimeType = imageMimeType?.trim() || 'image/jpeg'
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
          max_completion_tokens: 900,
          stream: false,
          messages: [
            {
              role: 'system',
              content:
                'You are Refamora vision AI. Return only valid JSON that matches the requested schema. Do not include markdown fences or extra prose.',
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${imageBase64}`,
                  },
                },
              ],
            },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: schemaName,
              strict: false,
              schema: responseJsonSchema,
            },
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
        throw new Error('Groq Vision returned an empty response.')
      }

      return JSON.parse(text)
    } catch (error) {
      const normalizedError =
        error instanceof Error ? error : new Error('Groq Vision request failed.')

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

  throw lastError ?? new Error('Groq Vision request failed.')
}

export const groqVisionProvider: Pick<
  AIService,
  'checkListingPhoto' | 'moderateListing'
> = {
  async checkListingPhoto(input: PhotoCheckInput) {
    const config = getGroqVisionConfig()

    if (!config.apiKey) {
      throw new Error('Groq Vision is not configured. Missing GROQ_API_KEY.')
    }

    const payload = await generateGroqVisionJson(
      config,
      buildPhotoCheckPrompt(input),
      input.imageBase64,
      input.imageMimeType,
      photoCheckOutputJsonSchema,
      'refamora_photo_check',
    )

    return normalizePhotoCheckOutput(payload)
  },
  async moderateListing(input: ListingModerationInput) {
    const config = getGroqVisionConfig()

    if (!config.apiKey) {
      throw new Error('Groq Vision is not configured. Missing GROQ_API_KEY.')
    }

    if (!input.imageBase64) {
      throw new Error('Groq Vision moderation requires a listing image.')
    }

    const payload = await generateGroqVisionJson(
      config,
      buildListingModerationPrompt(input),
      input.imageBase64,
      input.imageMimeType,
      listingModerationOutputJsonSchema,
      'refamora_listing_moderation',
    )

    return normalizeListingModerationOutput(payload)
  },
}

export async function checkGroqVisionHealth() {
  const config = getGroqVisionConfig()

  if (!config.apiKey) {
    return {
      provider: 'groq_vision' as const,
      enabled: false,
      available: false,
      message: 'Groq Vision is not configured.',
    }
  }

  return {
    provider: 'groq_vision' as const,
    enabled: true,
    available: true,
    message: `Groq Vision is configured with model ${config.model}.`,
  }
}

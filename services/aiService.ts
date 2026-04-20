import type {
  AIAnalyticsSummary,
  AIFeedbackInput,
  AIFeedbackResult,
  BuyerSearchAssistInput,
  BuyerSearchAssistResult,
  AIHealthResult,
  InquirySummaryInput,
  InquirySummaryResult,
  ListingAssistInput,
  ListingAssistResult,
  ListingModerationInput,
  ListingModerationResult,
  PhotoCheckInput,
  PhotoCheckResult,
  ReplyDraftInput,
  ReplyDraftResult,
  ServiceResult,
  WasteValueAdviceInput,
  WasteValueAdviceResult,
} from '../types/app'
import type { Tables } from '../types/database'

import {
  aiFeedbackInputSchema,
  aiFeedbackResultSchema,
  aiHealthResultSchema,
  buyerSearchAssistInputSchema,
  buyerSearchAssistResultSchema,
  inquirySummaryInputSchema,
  inquirySummaryResultSchema,
  listingAssistInputSchema,
  listingAssistResultSchema,
  listingModerationInputSchema,
  listingModerationResultSchema,
  photoCheckInputSchema,
  photoCheckResultSchema,
  replyDraftInputSchema,
  replyDraftResultSchema,
  wasteValueAdviceInputSchema,
  wasteValueAdviceResultSchema,
} from '../utils/schemas'

import { getSession } from './authService'
import { getSupabaseClient, hasSupabaseEnv } from './supabase'

type AIEventRow = Tables<'ai_events'>

function normalizeAIErrorMessage(message: string) {
  const normalized = message.trim().toLowerCase()

  if (
    normalized === 'unauthorized request.' ||
    normalized.includes('invalid jwt') ||
    normalized.includes('jwt expired') ||
    normalized.includes('refresh token') ||
    normalized.includes('auth session missing')
  ) {
    return 'Your session expired. Please sign in again to use AI features.'
  }

  if (
    normalized.includes('request failed with 503') ||
    normalized.includes('temporarily overloaded') ||
    normalized.includes('temporarily busy')
  ) {
    return 'The AI provider is temporarily busy right now. Try again in a few seconds.'
  }

  if (
    normalized.includes('request failed with 429') ||
    normalized.includes('rate-limited')
  ) {
    return 'The AI provider is rate-limited right now. Try again in a moment.'
  }

  if (
    normalized.includes('request is too large') ||
    normalized.includes('too large') ||
    normalized.includes('413')
  ) {
    return 'The image is too large for vision analysis. Use a smaller or more compressed photo.'
  }

  if (normalized.includes('timed out') || normalized.includes('timeout')) {
    return 'The AI provider took too long to respond. Try again in a moment.'
  }

  return message
}

async function normalizeFunctionError(error: unknown, data: unknown) {
  if (data && typeof data === 'object' && 'error' in data) {
    const message = (data as { error?: unknown }).error

    if (typeof message === 'string' && message.trim()) {
      return new Error(normalizeAIErrorMessage(message))
    }
  }

  if (
    error &&
    typeof error === 'object' &&
    'context' in error &&
    (error as { context?: unknown }).context instanceof Response
  ) {
    const response = (error as { context: Response }).context

    try {
      const payload = await response.clone().json()

      if (
        payload &&
        typeof payload === 'object' &&
        'error' in payload &&
        typeof (payload as { error?: unknown }).error === 'string'
      ) {
        return new Error(
          normalizeAIErrorMessage((payload as { error: string }).error),
        )
      }
    } catch {
      try {
        const text = await response.clone().text()

        if (text.trim()) {
          return new Error(normalizeAIErrorMessage(text.trim()))
        }
      } catch {
        // ignore secondary parsing failures
      }
    }
  }

  if (error instanceof Error) {
    return new Error(normalizeAIErrorMessage(error.message))
  }

  return new Error('AI request failed.')
}

async function invokeAIFunction(functionName: string, body: unknown) {
  if (!hasSupabaseEnv) {
    return {
      data: null,
      error: new Error('Supabase is not configured yet.'),
    }
  }

  let accessToken: string | null = null

  try {
    const session = await getSession()
    accessToken = session?.access_token ?? null
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error
          ? error
          : new Error('Unable to verify your session.'),
    }
  }

  if (!accessToken) {
    return {
      data: null,
      error: new Error('Your session expired. Please sign in again to use AI features.'),
    }
  }

  const { data, error } = await getSupabaseClient().functions.invoke(functionName, {
    body,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (error) {
    return {
      data: null,
      error: await normalizeFunctionError(error, data),
    }
  }

  return { data, error: null as Error | null }
}

export async function assistListing(
  input: ListingAssistInput,
): Promise<ServiceResult<ListingAssistResult>> {
  const parsedInput = listingAssistInputSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      data: null,
      error: new Error(parsedInput.error.issues[0]?.message ?? 'Invalid AI input.'),
    }
  }

  const { data, error } = await invokeAIFunction('ai-listing-assist', parsedInput.data)

  if (error) {
    return { data: null, error }
  }

  const parsedResult = listingAssistResultSchema.safeParse(data)

  if (!parsedResult.success) {
    return {
      data: null,
      error: new Error('AI response did not match the expected format.'),
    }
  }

  return { data: parsedResult.data, error: null }
}

export async function getAIHealth(): Promise<ServiceResult<AIHealthResult>> {
  const { data, error } = await invokeAIFunction('ai-health', {})

  if (error) {
    return { data: null, error }
  }

  const parsedResult = aiHealthResultSchema.safeParse(data)

  if (!parsedResult.success) {
    return {
      data: null,
      error: new Error('AI health response did not match the expected format.'),
    }
  }

  return { data: parsedResult.data, error: null }
}

export async function getWasteValueAdvice(
  input: WasteValueAdviceInput,
): Promise<ServiceResult<WasteValueAdviceResult>> {
  const parsedInput = wasteValueAdviceInputSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      data: null,
      error: new Error(
        parsedInput.error.issues[0]?.message ?? 'Invalid waste advice input.',
      ),
    }
  }

  const { data, error } = await invokeAIFunction('ai-waste-advice', parsedInput.data)

  if (error) {
    return { data: null, error }
  }

  const parsedResult = wasteValueAdviceResultSchema.safeParse(data)

  if (!parsedResult.success) {
    return {
      data: null,
      error: new Error('Waste advice response did not match the expected format.'),
    }
  }

  return { data: parsedResult.data, error: null }
}

export async function getBuyerSearchAssist(
  input: BuyerSearchAssistInput,
): Promise<ServiceResult<BuyerSearchAssistResult>> {
  const parsedInput = buyerSearchAssistInputSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      data: null,
      error: new Error(
        parsedInput.error.issues[0]?.message ??
          'Invalid buyer search assistant input.',
      ),
    }
  }

  const { data, error } = await invokeAIFunction('ai-search-assist', parsedInput.data)

  if (error) {
    return { data: null, error }
  }

  const parsedResult = buyerSearchAssistResultSchema.safeParse(data)

  if (!parsedResult.success) {
    return {
      data: null,
      error: new Error('Buyer search AI response did not match the expected format.'),
    }
  }

  return { data: parsedResult.data, error: null }
}

export async function getPhotoCheck(
  input: PhotoCheckInput,
): Promise<ServiceResult<PhotoCheckResult>> {
  const parsedInput = photoCheckInputSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      data: null,
      error: new Error(
        parsedInput.error.issues[0]?.message ?? 'Invalid photo check input.',
      ),
    }
  }

  const { data, error } = await invokeAIFunction('ai-photo-check', parsedInput.data)

  if (error) {
    return { data: null, error }
  }

  const parsedResult = photoCheckResultSchema.safeParse(data)

  if (!parsedResult.success) {
    return {
      data: null,
      error: new Error('Photo check response did not match the expected format.'),
    }
  }

  return { data: parsedResult.data, error: null }
}

export async function moderateListing(
  input: ListingModerationInput,
): Promise<ServiceResult<ListingModerationResult>> {
  const parsedInput = listingModerationInputSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      data: null,
      error: new Error(
        parsedInput.error.issues[0]?.message ??
          'Invalid listing moderation input.',
      ),
    }
  }

  const { data, error } = await invokeAIFunction(
    'ai-listing-moderation',
    parsedInput.data,
  )

  if (error) {
    return { data: null, error }
  }

  const parsedResult = listingModerationResultSchema.safeParse(data)

  if (!parsedResult.success) {
    return {
      data: null,
      error: new Error(
        'Listing moderation response did not match the expected format.',
      ),
    }
  }

  return { data: parsedResult.data, error: null }
}

export async function getInquirySummary(
  input: InquirySummaryInput,
): Promise<ServiceResult<InquirySummaryResult>> {
  const parsedInput = inquirySummaryInputSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      data: null,
      error: new Error(
        parsedInput.error.issues[0]?.message ?? 'Invalid inquiry summary input.',
      ),
    }
  }

  const { data, error } = await invokeAIFunction('ai-inquiry-assist', {
    action: 'summary',
    ...parsedInput.data,
  })

  if (error) {
    return { data: null, error }
  }

  const parsedResult = inquirySummaryResultSchema.safeParse(data)

  if (!parsedResult.success) {
    return {
      data: null,
      error: new Error('Inquiry summary response did not match the expected format.'),
    }
  }

  return { data: parsedResult.data, error: null }
}

export async function getReplyDraft(
  input: ReplyDraftInput,
): Promise<ServiceResult<ReplyDraftResult>> {
  const parsedInput = replyDraftInputSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      data: null,
      error: new Error(
        parsedInput.error.issues[0]?.message ?? 'Invalid reply draft input.',
      ),
    }
  }

  const { data, error } = await invokeAIFunction('ai-inquiry-assist', {
    action: 'reply',
    ...parsedInput.data,
  })

  if (error) {
    return { data: null, error }
  }

  const parsedResult = replyDraftResultSchema.safeParse(data)

  if (!parsedResult.success) {
    return {
      data: null,
      error: new Error('Reply draft response did not match the expected format.'),
    }
  }

  return { data: parsedResult.data, error: null }
}

export async function submitAIFeedback(
  input: AIFeedbackInput,
): Promise<ServiceResult<AIFeedbackResult>> {
  const parsedInput = aiFeedbackInputSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      data: null,
      error: new Error(
        parsedInput.error.issues[0]?.message ?? 'Invalid AI feedback input.',
      ),
    }
  }

  const { data, error } = await invokeAIFunction('ai-feedback', parsedInput.data)

  if (error) {
    return { data: null, error }
  }

  const parsedResult = aiFeedbackResultSchema.safeParse(data)

  if (!parsedResult.success) {
    return {
      data: null,
      error: new Error('AI feedback response did not match the expected format.'),
    }
  }

  return { data: parsedResult.data, error: null }
}

export async function getListingCopilotAnalytics(
  userId: string,
  periodDays = 7,
): Promise<ServiceResult<AIAnalyticsSummary>> {
  if (!hasSupabaseEnv) {
    return {
      data: {
        feature: 'listing_copilot',
        periodDays,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageLatencyMs: null,
        helpfulRate: null,
        feedbackCount: 0,
        localGemmaRequests: 0,
        geminiRequests: 0,
        lastUsedAt: null,
      },
      error: null,
    }
  }

  const windowStart = new Date(
    Date.now() - periodDays * 24 * 60 * 60 * 1000,
  ).toISOString()

  const { data, error } = await getSupabaseClient()
    .from('ai_events')
    .select(
      'request_status, latency_ms, helpful, provider, created_at, feature, user_id',
    )
    .eq('user_id', userId)
    .eq('feature', 'listing_copilot')
    .gte('created_at', windowStart)
    .order('created_at', { ascending: false })

  if (error) {
    return { data: null, error }
  }

  const rows = (data ?? []) as AIEventRow[]
  const successfulRows = rows.filter((row) => row.request_status === 'success')
  const failedRows = rows.filter((row) => row.request_status === 'error')
  const latencyRows = successfulRows.filter(
    (row) => typeof row.latency_ms === 'number',
  )
  const feedbackRows = rows.filter((row) => typeof row.helpful === 'boolean')
  const helpfulRows = feedbackRows.filter((row) => row.helpful === true)

  const averageLatencyMs =
    latencyRows.length > 0
      ? Math.round(
          latencyRows.reduce((sum, row) => sum + (row.latency_ms ?? 0), 0) /
            latencyRows.length,
        )
      : null

  const helpfulRate =
    feedbackRows.length > 0
      ? Math.round((helpfulRows.length / feedbackRows.length) * 100)
      : null

  return {
    data: {
      feature: 'listing_copilot',
      periodDays,
      totalRequests: rows.length,
      successfulRequests: successfulRows.length,
      failedRequests: failedRows.length,
      averageLatencyMs,
      helpfulRate,
      feedbackCount: feedbackRows.length,
      localGemmaRequests: successfulRows.filter(
        (row) => row.provider === 'local_gemma',
      ).length,
      geminiRequests: successfulRows.filter((row) => row.provider === 'gemini')
        .length,
      lastUsedAt: rows[0]?.created_at ?? null,
    },
    error: null,
  }
}

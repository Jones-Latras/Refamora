import type {
  AIAnalyticsSummary,
  AIFeedbackInput,
  AIFeedbackResult,
  AIHealthResult,
  ListingAssistInput,
  ListingAssistResult,
  ServiceResult,
} from '../types/app'
import type { Tables } from '../types/database'

import {
  aiFeedbackInputSchema,
  aiFeedbackResultSchema,
  aiHealthResultSchema,
  listingAssistInputSchema,
  listingAssistResultSchema,
} from '../utils/schemas'

import { getSupabaseClient, hasSupabaseEnv } from './supabase'

type AIEventRow = Tables<'ai_events'>

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

  if (!hasSupabaseEnv) {
    return {
      data: null,
      error: new Error('Supabase is not configured yet.'),
    }
  }

  const { data, error } = await getSupabaseClient().functions.invoke(
    'ai-listing-assist',
    {
      body: parsedInput.data,
    },
  )

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
  if (!hasSupabaseEnv) {
    return {
      data: null,
      error: new Error('Supabase is not configured yet.'),
    }
  }

  const { data, error } = await getSupabaseClient().functions.invoke('ai-health', {
    body: {},
  })

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

  if (!hasSupabaseEnv) {
    return {
      data: null,
      error: new Error('Supabase is not configured yet.'),
    }
  }

  const { data, error } = await getSupabaseClient().functions.invoke(
    'ai-feedback',
    {
      body: parsedInput.data,
    },
  )

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

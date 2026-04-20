import { getRequestClient } from './auth.ts'
import type {
  AIFeature,
  AIFeedbackResult,
  AIProvider,
} from './aiTypes.ts'

type AIRateLimitStatus = {
  allowed: boolean
  limit: number
  windowMinutes: number
  retryAfterSeconds: number
  recentRequestCount: number
}

type LogAIEventInput = {
  req: Request
  userId: string
  feature: AIFeature
  provider?: AIProvider | null
  fallbackUsed?: boolean
  requestStatus: 'success' | 'error'
  latencyMs?: number | null
  metadata?: Record<string, unknown>
}

export async function logAIEvent({
  req,
  userId,
  feature,
  provider = null,
  fallbackUsed = false,
  requestStatus,
  latencyMs = null,
  metadata = {},
}: LogAIEventInput): Promise<string | null> {
  const { client: supabase } = getRequestClient(req)

  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from('ai_events')
    .insert({
      user_id: userId,
      feature,
      provider,
      fallback_used: fallbackUsed,
      request_status: requestStatus,
      latency_ms: latencyMs,
      metadata,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to log AI event', error.message)
    return null
  }

  return typeof data?.id === 'string' ? data.id : null
}

function isEnabled(value: string | undefined, fallback: boolean) {
  if (value == null) {
    return fallback
  }

  return value.trim().toLowerCase() === 'true'
}

function getRateLimitConfig() {
  return {
    enabled: isEnabled(Deno.env.get('AI_RATE_LIMIT_ENABLED'), true),
    windowMinutes: Math.max(
      1,
      Number.parseInt(Deno.env.get('AI_RATE_LIMIT_WINDOW_MINUTES') ?? '10', 10),
    ),
    maxRequests: Math.max(
      1,
      Number.parseInt(Deno.env.get('AI_RATE_LIMIT_MAX_REQUESTS') ?? '8', 10),
    ),
  }
}

export async function getAIRateLimitStatus({
  req,
  userId,
  feature,
}: {
  req: Request
  userId: string
  feature: AIFeature
}): Promise<AIRateLimitStatus> {
  const config = getRateLimitConfig()

  if (!config.enabled) {
    return {
      allowed: true,
      limit: config.maxRequests,
      windowMinutes: config.windowMinutes,
      retryAfterSeconds: 0,
      recentRequestCount: 0,
    }
  }

  const { client: supabase } = getRequestClient(req)

  if (!supabase) {
    return {
      allowed: false,
      limit: config.maxRequests,
      windowMinutes: config.windowMinutes,
      retryAfterSeconds: config.windowMinutes * 60,
      recentRequestCount: 0,
    }
  }

  const windowStart = new Date(
    Date.now() - config.windowMinutes * 60 * 1000,
  ).toISOString()

  const { count, error } = await supabase
    .from('ai_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('feature', feature)
    .gte('created_at', windowStart)

  if (error) {
    console.error('Failed to read AI rate limit status', error.message)

    return {
      allowed: false,
      limit: config.maxRequests,
      windowMinutes: config.windowMinutes,
      retryAfterSeconds: config.windowMinutes * 60,
      recentRequestCount: 0,
    }
  }

  const recentRequestCount = count ?? 0
  const allowed = recentRequestCount < config.maxRequests

  return {
    allowed,
    limit: config.maxRequests,
    windowMinutes: config.windowMinutes,
    retryAfterSeconds: allowed ? 0 : config.windowMinutes * 60,
    recentRequestCount,
  }
}

type SubmitAIEventFeedbackInput = {
  req: Request
  userId: string
  eventId: string
  feature: AIFeature
  helpful: boolean
}

export async function submitAIEventFeedback({
  req,
  userId,
  eventId,
  feature,
  helpful,
}: SubmitAIEventFeedbackInput): Promise<AIFeedbackResult | null> {
  const { client: supabase } = getRequestClient(req)

  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from('ai_events')
    .update({
      helpful,
    })
    .eq('id', eventId)
    .eq('user_id', userId)
    .eq('feature', feature)
    .select('id, feature, helpful')
    .single()

  if (error || !data || typeof data.helpful !== 'boolean') {
    console.error('Failed to submit AI feedback', error?.message ?? 'Unknown error')
    return null
  }

  return {
    eventId: data.id,
    feature,
    helpful: data.helpful,
  }
}
